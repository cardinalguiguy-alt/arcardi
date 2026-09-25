/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-25 (phase 2 de la feuille de route graphique) — LA POLICE PIXEL
   ║ DES NOMS : ceux des personnages (au-dessus des têtes) et ceux des cartes.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️ POURQUOI UNE POLICE DESSINÉE EN CODE, ET PAS UN FICHIER DE POLICE
   (décision de Guillaume, 2026-09-25) : les noms étaient écrits en
   `bold 7px monospace`, lissés par le navigateur au milieu d'un monde en gros
   pixels — l'audit l'a relevé comme « texte de nom lissé, non pixel ». Un
   .woff2 libre aurait réglé l'aspect, mais `fillText` n'est PAS rastérisable
   hors navigateur (§4 CLAUDE.md) : aucun banc n'aurait jamais vu un nom. Ici,
   chaque glyphe est une liste de pixels — les bancs le peignent comme le jeu.
   ⚠️ ET LE TEXTE RESTE VIVANT, donc bilingue : rien n'est cuit dans un sprite.

   LA GRILLE. Majuscules et chiffres : 6 rangées (0 à 5), la ligne de base est
   SOUS la rangée 5. Minuscules : hauteur d'x de 4 (rangées 2 à 5), jambages
   descendants en 6-7, accents des minuscules posés en 0 (une rangée d'air en
   1 ; un circonflexe monte en −1), accents des majuscules posés en −2 (air en
   −1 ; un circonflexe monte en −3). Chasse variable, une colonne entre deux
   glyphes.

   LE DESSIN. Une OMBRE PORTÉE d'un pixel d'art, sous la lettre et en bas à
   droite — la même idée que l'ancienne écriture (ombre à (+1,+1)), au pas de
   la grille. ⚠️ PREMIER JET : un liseré sombre sur les HUIT voisins. Vu en
   jeu le 2026-09-25, il bouchait l'unique colonne entre deux lettres et les
   jours des « a », « e », « o » : le nom devenait un bandeau noir percé de
   lettres blanches, un autocollant plus lourd que le personnage. L'ombre de
   TOUS les glyphes passe d'abord, les lettres ensuite : une ombre ne mord
   jamais la lettre voisine.

   LE COÛT. Une feuille (atlas) par couleur — celle de l'ombre et une par
   couleur de lettre (six au plus dans le jeu), fabriquées au premier usage — jamais un canevas
   par étiquette : WebKit sur iPad plafonne le NOMBRE de canevas (§10). Une
   étiquette coûte ensuite deux `drawImage` par lettre.
   ═══════════════════════════════════════════════════════════════════════════ */

/* [rangée du haut, "lignes|séparées|par|des|barres"] — '#' = pixel peint. */
const BASE = {
  A: [0, ".##.|#..#|#..#|####|#..#|#..#"], B: [0, "###.|#..#|###.|#..#|#..#|###."],
  C: [0, ".###|#...|#...|#...|#...|.###"], D: [0, "###.|#..#|#..#|#..#|#..#|###."],
  E: [0, "####|#...|###.|#...|#...|####"], F: [0, "####|#...|###.|#...|#...|#..."],
  G: [0, ".###|#...|#...|#.##|#..#|.###"], H: [0, "#..#|#..#|####|#..#|#..#|#..#"],
  I: [0, "###|.#.|.#.|.#.|.#.|###"], J: [0, "..##|...#|...#|...#|#..#|.##."],
  K: [0, "#..#|#.#.|##..|#.#.|#..#|#..#"], L: [0, "#...|#...|#...|#...|#...|####"],
  M: [0, "#...#|##.##|#.#.#|#...#|#...#|#...#"], N: [0, "#..#|##.#|#.##|#..#|#..#|#..#"],
  O: [0, ".##.|#..#|#..#|#..#|#..#|.##."], P: [0, "###.|#..#|#..#|###.|#...|#..."],
  Q: [0, ".##.|#..#|#..#|#..#|#.#.|.#.#"], R: [0, "###.|#..#|#..#|###.|#.#.|#..#"],
  S: [0, ".###|#...|.##.|...#|...#|###."], T: [0, "#####|..#..|..#..|..#..|..#..|..#.."],
  U: [0, "#..#|#..#|#..#|#..#|#..#|.##."], V: [0, "#...#|#...#|#...#|.#.#.|.#.#.|..#.."],
  W: [0, "#...#|#...#|#...#|#.#.#|##.##|#...#"], X: [0, "#...#|.#.#.|..#..|..#..|.#.#.|#...#"],
  Y: [0, "#...#|#...#|.#.#.|..#..|..#..|..#.."], Z: [0, "####|...#|..#.|.#..|#...|####"],
  "Œ": [0, ".####|#.#..|#.##.|#.#..|#.#..|.####"], "Æ": [0, ".####|#.#..|####.|#.#..|#.#..|#.###"],
  a: [2, ".###|#..#|#..#|.###"], b: [0, "#...|#...|###.|#..#|#..#|###."],
  c: [2, ".###|#...|#...|.###"], d: [0, "...#|...#|.###|#..#|#..#|.###"],
  e: [2, ".##.|####|#...|.###"], f: [0, ".##|#..|###|#..|#..|#.."],
  g: [2, ".###|#..#|#..#|.###|...#|.##."], h: [0, "#...|#...|###.|#..#|#..#|#..#"],
  i: [0, "#|.|#|#|#|#"], j: [0, ".#|..|.#|.#|.#|.#|.#|#."],
  k: [0, "#..|#..|#.#|##.|#.#|#.#"], l: [0, "#|#|#|#|#|#"],
  m: [2, "####.|#.#.#|#.#.#|#.#.#"], n: [2, "###.|#..#|#..#|#..#"],
  o: [2, ".##.|#..#|#..#|.##."], p: [2, "###.|#..#|#..#|###.|#...|#..."],
  q: [2, ".###|#..#|#..#|.###|...#|...#"], r: [2, "#.##|##..|#...|#..."],
  s: [2, ".###|##..|..##|###."], t: [1, ".#.|###|.#.|.#.|.##"],
  u: [2, "#..#|#..#|#..#|.###"], v: [2, "#...#|#...#|.#.#.|..#.."],
  w: [2, "#...#|#.#.#|#.#.#|.#.#."], x: [2, "#..#|.##.|.##.|#..#"],
  y: [2, "#..#|#..#|#..#|.###|...#|.##."], z: [2, "####|..#.|.#..|####"],
  "œ": [2, ".#.#.|#.###|#.#..|.#.##"], "æ": [2, ".###.|..###|####.|.####"],
  0: [0, ".##.|#..#|#.##|##.#|#..#|.##."], 1: [0, ".#.|##.|.#.|.#.|.#.|###"],
  2: [0, ".##.|#..#|..#.|.#..|#...|####"], 3: [0, "###.|...#|.##.|...#|...#|###."],
  4: [0, "#..#|#..#|####|...#|...#|...#"], 5: [0, "####|#...|###.|...#|...#|###."],
  6: [0, ".##.|#...|###.|#..#|#..#|.##."], 7: [0, "####|...#|..#.|.#..|.#..|.#.."],
  8: [0, ".##.|#..#|.##.|#..#|#..#|.##."], 9: [0, ".##.|#..#|#..#|.###|...#|.##."],
  "-": [3, "###"], "–": [3, "####"], "—": [3, "#####"], "_": [5, "####"], ".": [5, "#"], ",": [5, "#|#"], "'": [0, "#|#"],
  "’": [0, "#|#"], "!": [0, "#|#|#|#|.|#"], "?": [0, ".##.|#..#|..#.|.#..|....|.#.."],
  ":": [2, "#|.|.|#"], ";": [2, "#|.|.|#|#"], "(": [0, ".#|#.|#.|#.|#.|.#"], ")": [0, "#.|.#|.#|.#|.#|#."],
  "/": [0, "..#|..#|.#.|.#.|#..|#.."], "+": [2, ".#.|###|.#."], "*": [1, "#.#|.#.|#.#"],
  "=": [2, "###|...|###"], "~": [2, ".#.#|#.#."], "#": [1, ".#.#.|#####|.#.#.|#####|.#.#."],
};
/* Les accents : une MARQUE posée au-dessus (ou en dessous) d'une lettre de
   base. Sur une minuscule, en rangées 0-1 ; sur une majuscule, en −2/−1. */
const MARKS = {
  acute: (w) => [[Math.min(w - 1, (w >> 1)), 0]],
  grave: (w) => [[Math.max(0, ((w - 1) >> 1)), 0]],
  circ: (w) => w >= 4 ? [[1, 0], [2, 0], [0, 1], [3, 1]] : [[1, 0], [0, 1], [2, 1]],
  uml: (w) => [[0, 0], [w - 1, 0]],
  tilde: (w) => w >= 4 ? [[1, 0], [3, 0], [0, 1], [2, 1]] : [[1, 0], [0, 1], [2, 1]],
};
const ACCENTED = {
  "à": ["a", "grave"], "â": ["a", "circ"], "ä": ["a", "uml"], "á": ["a", "acute"], "ã": ["a", "tilde"],
  "é": ["e", "acute"], "è": ["e", "grave"], "ê": ["e", "circ"], "ë": ["e", "uml"],
  "ô": ["o", "circ"], "ö": ["o", "uml"], "ó": ["o", "acute"], "ò": ["o", "grave"], "õ": ["o", "tilde"],
  "ù": ["u", "grave"], "û": ["u", "circ"], "ü": ["u", "uml"], "ú": ["u", "acute"],
  "ÿ": ["y", "uml"], "ý": ["y", "acute"], "ñ": ["n", "tilde"],
  "À": ["A", "grave"], "Â": ["A", "circ"], "Ä": ["A", "uml"], "Á": ["A", "acute"],
  "É": ["E", "acute"], "È": ["E", "grave"], "Ê": ["E", "circ"], "Ë": ["E", "uml"],
  "Î": ["I", "circ"], "Ï": ["I", "uml"], "Í": ["I", "acute"],
  "Ô": ["O", "circ"], "Ö": ["O", "uml"], "Ó": ["O", "acute"],
  "Ù": ["U", "grave"], "Û": ["U", "circ"], "Ü": ["U", "uml"], "Ú": ["U", "acute"],
  "Ÿ": ["Y", "uml"], "Ñ": ["N", "tilde"],
};

/* La table finale : caractère → { w, px: [[x, rangée], …] }. */
const GLYPHS = {};
function parse(top, rows) {
  const lines = rows.split("|"), w = lines[0].length, px = [];
  lines.forEach((ln, r) => { for (let x = 0; x < ln.length; x++) if (ln[x] === "#") px.push([x, top + r]); });
  return { w, px };
}
for (const ch of Object.keys(BASE)) GLYPHS[ch] = parse(BASE[ch][0], BASE[ch][1]);
GLYPHS[" "] = { w: 2, px: [] };
for (const ch of Object.keys(ACCENTED)) {
  const [base, mark] = ACCENTED[ch], g = GLYPHS[base];
  const upper = base === base.toUpperCase();
  const pts = MARKS[mark](g.w);
  // Le BAS de la marque se pose toujours sur la rangée qui laisse UNE rangée
  // d'air au-dessus de la lettre : 0 sur une minuscule (le corps commence en
  // 2), −2 sur une majuscule. Une marque de deux rangées monte d'autant.
  // ⚠️ Premier jet : le circonflexe d'une minuscule en 0-1, qui touchait le
  // haut du « o » en diagonale — « Jérôme » se lisait « Jér8me » (planche du
  // 2026-09-25).
  const dy = (upper ? -2 : 0) - Math.max(...pts.map(([, r]) => r));
  GLYPHS[ch] = { w: g.w, px: g.px.concat(pts.map(([x, r]) => [x, r + dy])) };
}
// La cédille : sous la lettre, en 6-7.
GLYPHS["ç"] = { w: 4, px: GLYPHS.c.px.concat([[2, 6], [1, 7]]) };
GLYPHS["Ç"] = { w: 4, px: GLYPHS.C.px.concat([[2, 6], [1, 7]]) };
// Le i accentué perd son point et s'élargit à 3 colonnes pour porter la marque.
const stem = (x) => [[x, 2], [x, 3], [x, 4], [x, 5]];
GLYPHS["î"] = { w: 3, px: stem(1).concat([[1, -1], [0, 0], [2, 0]]) };
GLYPHS["ï"] = { w: 3, px: stem(1).concat([[0, 0], [2, 0]]) };
GLYPHS["í"] = { w: 2, px: stem(0).concat([[1, 0]]) };
GLYPHS["ì"] = { w: 2, px: stem(1).concat([[0, 0]]) };

export const PIXEL_FONT_ROW_MIN = -3, PIXEL_FONT_ROW_MAX = 7, PIXEL_FONT_BASELINE = 6;

/* Toutes les lettres du texte ont-elles un glyphe ? Sinon l'appelant garde
   l'ancienne écriture pour CE nom : un pseudo en cyrillique ou avec un emoji
   reste lisible, il n'est simplement pas pixelisé. */
export function pixelTextSupported(str) {
  for (const ch of String(str)) if (!GLYPHS[ch]) return false;
  return true;
}
/* Largeur en px d'art (liseré exclu). */
export function pixelTextWidth(str) {
  let w = 0, n = 0;
  for (const ch of String(str)) { const g = GLYPHS[ch]; if (!g) continue; w += g.w; n++; }
  return n ? w + (n - 1) : 0;
}
/* Les rangées réellement occupées (pour une boîte au plus juste : « Rosalie »
   n'a ni accent de majuscule ni jambage, sa boîte ne les réserve pas). */
function rowSpan(str) {
  let lo = 99, hi = -99;
  for (const ch of String(str)) { const g = GLYPHS[ch]; if (!g) continue; for (const [, r] of g.px) { if (r < lo) lo = r; if (r > hi) hi = r; } }
  return lo > hi ? [0, 5] : [lo, hi];
}
/* La boîte à l'écran d'un texte centré sur `cx`, ligne de base en `by`, à
   l'échelle entière `s` — ombre comprise, plus un pixel d'air à gauche et en
   haut. C'est elle que compare le masquage. */
export function pixelTextBox(str, cx, by, s) {
  const w = pixelTextWidth(str), [lo, hi] = rowSpan(str);
  const left = Math.round(cx - (w * s) / 2), base = Math.round(by);
  return { x: left - s, y: base + (lo - PIXEL_FONT_BASELINE) * s - s, w: (w + 2) * s, h: (hi - lo + 1 + 2) * s };
}

/* ─── Les feuilles ─────────────────────────────────────────────────────── */
const CELL_H = PIXEL_FONT_ROW_MAX - PIXEL_FONT_ROW_MIN + 1 + 2; // une rangée d'air en haut et en bas
let LAYOUT = null;
function layout() {
  if (LAYOUT) return LAYOUT;
  const cells = {}; let x = 0;
  for (const ch of Object.keys(GLYPHS)) { cells[ch] = x; x += GLYPHS[ch].w + 2; }
  LAYOUT = { cells, W: Math.max(1, x), H: CELL_H };
  return LAYOUT;
}
const SHEETS = new Map();
function sheet(mk, color) {
  let c = SHEETS.get(color);
  if (c) return c;
  const L = layout();
  c = mk(L.W, L.H);
  const g = c.getContext("2d");
  g.fillStyle = color;
  for (const ch of Object.keys(GLYPHS)) {
    const x0 = L.cells[ch] + 1, G = GLYPHS[ch];
    for (const [x, r] of G.px) g.fillRect(x0 + x, r - PIXEL_FONT_ROW_MIN + 1, 1, 1);
  }
  SHEETS.set(color, c);
  return c;
}

/* Écrit `str` centré sur `cx`, ligne de base en `by` (px du contexte, qu'on
   attend à l'échelle 1 : l'appelant se place en coordonnées ÉCRAN), à
   l'échelle entière `s`. `mk(w, h)` fabrique un canevas — le jeu passe
   `document.createElement`, les bancs leur faux canevas. */
export function drawPixelText(ctx, mk, str, cx, by, s, fill, shadow) {
  const L = layout();
  const text = String(str), w = pixelTextWidth(text);
  const left = Math.round(cx - (w * s) / 2), base = Math.round(by);
  const oy = base + (PIXEL_FONT_ROW_MIN - PIXEL_FONT_BASELINE - 1) * s;
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  // L'ombre en deux passes (dessous, puis dessous-droite), puis les lettres.
  const passes = shadow ? [[shadow, 0, s], [shadow, s, s], [fill, 0, 0]] : [[fill, 0, 0]];
  for (const [col, dx, dy] of passes) {
    const sh = sheet(mk, col);
    let x = left;
    for (const ch of text) {
      const G = GLYPHS[ch]; if (!G) continue;
      ctx.drawImage(sh, L.cells[ch], 0, G.w + 2, L.H, x - s + dx, oy + dy, (G.w + 2) * s, L.H * s);
      x += (G.w + 1) * s;
    }
  }
  ctx.imageSmoothingEnabled = smooth;
}

/* ─── Le masquage ─────────────────────────────────────────────────────────
   Décision de Guillaume (2026-09-25) : quand deux noms se chevauchent, le plus
   important gagne et l'autre s'efface EN FONDU. `items` : [{ key, box, rank }]
   où `rank` est un tableau comparé dans l'ordre (plus petit = plus
   prioritaire). `fade` : une Map key → opacité, gardée d'une image à l'autre
   par l'appelant. Rend l'opacité de chaque étiquette.
   ⚠️ UN NOM DÉJÀ AFFICHÉ GARDE SA PLACE face à un nom de même rang : sans
   cette inertie, deux résidents qui se croisent échangeraient leurs
   étiquettes à chaque pas (la distance au joueur bascule d'un pixel). L'appelant
   le dit en mettant « était visible » dans le rang, avant la distance.
   ⚠️ Un nom qui APPARAÎT (un personnage qui entre dans le champ) ne fait pas
   de fondu d'entrée : il est là, tout de suite, s'il a la place. */
export function pixelLabelMask(items, fade, dt, speed) {
  const order = items.map((it, i) => i).sort((a, b) => {
    const ra = items[a].rank, rb = items[b].rank;
    for (let k = 0; k < Math.max(ra.length, rb.length); k++) { const d = (ra[k] || 0) - (rb[k] || 0); if (d) return d; }
    return a - b;
  });
  const placed = [], out = new Array(items.length), seen = new Set();
  const k = Math.min(1, Math.max(0, dt) * (speed || 7));
  for (const i of order) {
    const it = items[i], b = it.box;
    const free = !placed.some((p) => b.x < p.x + p.w && p.x < b.x + b.w && b.y < p.y + p.h && p.y < b.y + b.h);
    if (free) placed.push(b);
    const want = free ? 1 : 0;
    const prev = fade.has(it.key) ? fade.get(it.key) : want;
    let a = prev + (want - prev) * k;
    if (Math.abs(want - a) < 0.02) a = want;
    fade.set(it.key, a); seen.add(it.key);
    out[i] = a;
  }
  for (const key of [...fade.keys()]) if (!seen.has(key)) fade.delete(key);
  return out;
}
