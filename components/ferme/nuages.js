/* =============================================================================
   nuages.js — LES OMBRES DES NUAGES (2026-11-21, nuit), PUR.
   -----------------------------------------------------------------------------
   Guillaume (2026-11-21) : « rendre les maisons moins gemini like, et plus intégrées au reste du paysage, sans forcément y
   toucher ». MESURÉ avant d'écrire : un étalonnage des images (ombres pourpres ramenées au vert-gris du décor, noirs relevés)
   et un passage à la grille de l'art ne changent presque rien à l'œil, au cran 2 comme au cran 3 (planches comparées dans le
   journal du README de la ferme, 2026-11-21). Ce qui colle une image sur un fond, c'est qu'elle ne reçoit pas la MÊME LUMIÈRE
   que lui. D'où ceci : l'ombre des nuages passe sur l'herbe, la rue, les maisons, les arbres et les gens, à la même force et
   au même instant — une maison que traverse le même nuage que la pelouse est DANS le paysage.

   LE MODÈLE (un ciel de jeu, pas de météorologue) :
   · DEUX SOURCES DE NUAGES, la plus forte l'emporte (une union : 1 − (1 − a)(1 − b)) :
     – les CUMULUS DE BEAU TEMPS (`cumulusCover`) : certains jours clairs (tirés de la graine du jour, plus souvent au printemps
       et l'été), ils naissent en fin de matinée, culminent l'après-midi et fondent avant le soir — le cycle vrai du cumulus de
       chaleur ; sans eux, une journée de grand soleil n'aurait jamais d'ombre de nuage ;
     – le CIEL QUI SE CHARGE (`weatherCover`) : quand le temps fonce (`dark` de meteo.js, à la montée et à la descente d'une
       averse, d'un ciel couvert, d'un coup de vent), les nuages se fragmentent et défilent avant que tout ne se voile.
   · LEUR OMBRE A LA FORCE DE L'OMBRE D'UNE MAISON : ce qui manque sous un nuage, c'est le soleil direct, exactement comme
     derrière un mur. L'appelant lui donne donc l'opacité du soleil de l'instant (`ombres.js` : nulle la nuit, pâle sous un
     ciel voilé, nulle sous la pluie et la neige qui tombe) — rien ici ne la recalcule (§4 : une grandeur, un seul endroit).
   · ELLES DÉRIVENT VERS L'EST, comme la fumée des cheminées (`fumee.js`), plus vite quand le vent forcit (`driftSpeed`).
   · LE CHAMP (`cloudField`) : un bruit fractal PÉRIODIQUE (128 cases de côté : jamais deux fois le même nuage sur un écran),
     déformé par un second bruit (les bords bouillonnent comme un cumulus vu d'en haut, au lieu d'être des taches rondes),
     tiré une fois. La couverture se règle par un SEUIL lu sur son histogramme (`coverThreshold`) : `cover` = la part du sol
     à l'ombre, quelle que soit la forme du bruit.
   · LE BORD EST DOUX (`alphaLut`) : la pénombre d'un nuage à mille mètres fait une dizaine de mètres au sol. En paliers, elle
     dessinait des courbes de niveau qui glissaient sur l'herbe (essayé sur le papier : quatre bandes de 40 px d'art) ; douce,
     elle ne se lit que comme une lumière qui baisse.
   ⚠️ AUCUNE HORLOGE LUE, AUCUN ÉTAT : l'heure, le jour, la saison et le temps sont passés. Rien ne circule (§3) : deux joueurs
   ont le même ciel ; seule la position du champ (sa dérive) est intégrée par chaque écran, à la même vitesse.
   `tools/verify-nuages.mjs` le tient (couverture, périodicité, nuit, pluie, cycle du cumulus, vitesse).
   Désactivable d'un clic : menu dev, « Ajouts de la nuit du 21 novembre » (`AJOUTS.clouds`, FermeGame.js).
   ========================================================================== */

export const NUAGES = {
  N: 256,                // côté du champ, en cellules
  CELL: 8,               // px d'art par cellule : 256 × 8 = 2 048 px = 128 cases de côté
  OCT: [[32, 1], [16, 0.5], [8, 0.26], [4, 0.12]],   // [maille du réseau en cellules (divise N : périodique), amplitude]
  WARP: 9,               // cellules : l'amplitude de la déformation (les bords qui bouillonnent)
  SOFT: 0.11,            // la pénombre, en unités du bruit normalisé (≈ 6 à 10 cases au sol)
  /* Les cumulus de beau temps : la chance qu'un jour en ait, par saison ; leur couverture au plus fort ; leur journée. */
  CU_ODDS: { spring: 0.55, summer: 0.6, autumn: 0.4, winter: 0.18 },
  CU_COVER: [0.14, 0.3],   // ⚠️ au-delà de ~0,3, le seuil tombe dans le fond du ciel : un voile gris entre les nuages (vu en jeu à 0,34)
  CU_HOURS: [10, 13, 17, 19.5],   // naissance, plein, déclin, disparition (heures de jeu)
  /* Le ciel qui se charge : `dark` de meteo.js → couverture (au-delà, le ciel est voilé : l'ombre du soleil s'éteint d'elle-même). */
  WX_DARK: [0.02, 0.4], WX_COVER: 0.8,
  K: 0.95,               // l'ombre d'un nuage, en part de celle d'un mur au même instant
  /* La dérive, en cases par seconde réelle : un nuage traverse un écran (cran 2) en une demi-minute par temps calme. */
  SPEED: [0.9, 3.2],     // calme, + au plus fort du vent
  DRIFT_SOUTH: 0.18,     // l'est, légèrement vers le bas de l'écran
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function hash32(a, b) {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
const u01 = (h) => (h >>> 8) / 16777216;
const SEASON_I = { spring: 1, summer: 2, autumn: 3, winter: 4 };

/* La couverture des cumulus de beau temps, le jour `day` de la saison `season`, à l'heure `hour` (heures de jeu). 0..1. */
export function cumulusCover(day, season, hour) {
  const odds = NUAGES.CU_ODDS[season] == null ? NUAGES.CU_ODDS.spring : NUAGES.CU_ODDS[season];
  const h = hash32((day | 0) * 7919 + 13, SEASON_I[season] || 0);
  if (u01(h) >= odds) return 0;
  const [c0, c1] = NUAGES.CU_COVER, cmax = c0 + (c1 - c0) * u01(hash32(h, 0x51ed));
  const [a, b, c, d] = NUAGES.CU_HOURS;
  return cmax * smooth(a, b, hour) * (1 - smooth(c, d, hour));
}
/* La couverture que donne le temps qu'il fait (`W` de meteo.js : seul `dark` compte). 0..1. */
export function weatherCover(W) {
  const [d0, d1] = NUAGES.WX_DARK;
  return NUAGES.WX_COVER * smooth(d0, d1, (W && W.dark) || 0);
}
/* La couverture de l'instant : l'union des deux. */
export function cloudCover(day, season, hour, W) {
  const a = cumulusCover(day, season, hour), b = weatherCover(W);
  return 1 - (1 - a) * (1 - b);
}
/* L'opacité de l'ombre d'un nuage, depuis celle du soleil au même instant (`sunA` : `sunShadow(...).a`, ombres.js). */
export const cloudShadowAlpha = (sunA) => NUAGES.K * Math.max(0, sunA || 0);
/* La vitesse de dérive, en px d'ART par seconde réelle, pour un vent `windK` (0..1) : [vx, vy]. */
export function driftSpeed(windK, tile = 16) {
  const v = (NUAGES.SPEED[0] + NUAGES.SPEED[1] * clamp01(windK || 0)) * tile;
  return [v, v * NUAGES.DRIFT_SOUTH];
}

/* Un bruit de valeur PÉRIODIQUE (maille `P` cellules, période N), lissé (quintique), en (x, y) cellules. */
function valueNoise(x, y, P, N, seed) {
  const L = N / P, gx = x / P, gy = y / P;
  const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
  const q = (i, j) => u01(hash32(((i % L) + L) % L + seed * 977, ((j % L) + L) % L * 131 + seed));
  const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10), sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = q(ix, iy), b = q(ix + 1, iy), c = q(ix, iy + 1), d = q(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x, y, N, seed) {
  let s = 0, w = 0;
  for (const [P, amp] of NUAGES.OCT) { s += amp * valueNoise(x, y, P, N, seed + P); w += amp; }
  return s / w;
}
/* LES NUAGES DU CHAMP : un par case d'une grille de `SLOT` cellules (8 × 8 par période), placé au hasard dans sa case, fait de
   quatre à six BULLES (le chou-fleur d'un cumulus vu d'en haut) un peu étirées d'ouest en est (le vent les allonge).
   ⚠️ PREMIER JET : un bruit fractal seuillé — vu sur planche (trois couvertures), il dessinait un RÉSEAU de filaments reliés,
   pas des nuages : un cumulus est une tache isolée aux bords bosselés, que la couverture fait grossir puis souder. */
const SLOT = 32;
function cloudPuffs(seed) {
  const N = NUAGES.N, S = N / SLOT, puffs = [];
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const h = hash32(i * 73 + seed, j * 191 + 7);
    if (u01(hash32(h, 11)) < 0.12) continue;                            // des trous de ciel : pas de damier
    const cx = (i + 0.1 + 0.8 * u01(h)) * SLOT, cy = (j + 0.1 + 0.8 * u01(hash32(h, 3))) * SLOT;
    // beaucoup de petits, quelques gros, et les gros en famille (un fond large les grossit par endroits)
    const fam = valueNoise(cx, cy, 64, NUAGES.N, seed + 29);
    const R = (5 + 11 * Math.pow(u01(hash32(h, 5)), 1.5)) * (0.7 + 0.6 * fam);   // ~2 à 9 cases de rayon
    const n = 4 + (hash32(h, 9) % 3);
    for (let k = 0; k < n; k++) {
      const hk = hash32(h, 100 + k), ang = u01(hk) * 6.2832, d = R * 0.75 * Math.sqrt(u01(hash32(hk, 1)));
      puffs.push({ x: cx + Math.cos(ang) * d * 1.3, y: cy + Math.sin(ang) * d, r: R * (0.5 + 0.35 * u01(hash32(hk, 2))), s: i + j * S });
    }
  }
  return puffs;
}
const PUFF_CACHE = new Map();
/* LE CHAMP : N × N valeurs 0..255 (Uint8Array), périodique sur les deux axes. Pur et déterministe (graine `seed`).
   La valeur d'une cellule : la somme des bulles qui la touchent (distance TORIQUE : la période se referme sans couture), plus
   un bruit fin qui bosselle les bords. L'appelant le tire par tranches de rangées s'il ne veut pas arrêter une image —
   `cloudFieldRows(out, seed, y0, y1)` remplit [y0, y1). */
export function cloudFieldRows(out, seed, y0, y1) {
  const N = NUAGES.N;
  let puffs = PUFF_CACHE.get(seed);
  if (!puffs) { puffs = cloudPuffs(seed); PUFF_CACHE.clear(); PUFF_CACHE.set(seed, puffs); }
  const half = N / 2;
  for (let y = y0; y < y1; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    for (const p of puffs) {
      let dx = x - p.x, dy = y - p.y;
      if (dx > half) dx -= N; else if (dx < -half) dx += N;
      if (dy > half) dy -= N; else if (dy < -half) dy += N;
      dx *= 0.77;                                                     // étirés d'ouest en est
      const q = (dx * dx + dy * dy) / (p.r * p.r);
      if (q < 1) { const k = 1 - q; v += k * k; }
    }
    // les bords bosselés : un bruit fin (2 à 4 cases), fort là où le nuage s'amincit, nul au cœur et en plein ciel
    const edge = 4 * Math.min(v, 1) * (1 - Math.min(v, 1));
    v += edge * 0.9 * (valueNoise(x, y, 8, N, seed + 41) * 0.65 + valueNoise(x, y, 4, N, seed + 43) * 0.35 - 0.5);
    /* ⚠️ LE CIEL ENTRE LES NUAGES N'EST PAS UN ZÉRO PLAT : sans ce fond (un bruit large et faible), 60 % des cellules valaient 0,
       et une couverture de plus de 40 % n'avait plus de seuil où se poser — tout passait à mi-ombre d'un coup (mesuré sur
       l'histogramme). Avec lui, un ciel qui se charge soude les nuages là où le fond est haut, comme un front qui arrive. */
    v += 0.16 * fbm(x, y, N, seed + 3);
    /* ⚠️ RANGÉ PAR UNE RACINE, PAS À PLAT : le ciel entre les nuages tient dans les petites valeurs ; à plat, il ne prenait que
       ~16 crans d'octet, et une couverture de 75 % tombait à 68 % (verify-nuages, la couverture demandée). */
    out[y * N + x] = Math.max(0, Math.min(255, Math.round(Math.sqrt(Math.max(0, v) / 1.6) * 255)));
  }
  return out;
}
export function cloudField(seed) {
  const N = NUAGES.N, out = new Uint8Array(N * N);
  return cloudFieldRows(out, seed, 0, N);
}
/* L'histogramme cumulé du champ (257 entrées : `cum[v]` = part des cellules de valeur < v). */
export function fieldCdf(field) {
  const hist = new Float64Array(256);
  for (let i = 0; i < field.length; i++) hist[field[i]]++;
  const cum = new Float64Array(257);
  for (let v = 0; v < 256; v++) cum[v + 1] = cum[v] + hist[v] / field.length;
  return cum;
}
/* Le seuil (0..1, en unités du champ normalisé) au-dessus duquel une part `cover` des cellules se trouve. */
export function coverThreshold(cum, cover) {
  const want = 1 - clamp01(cover);
  for (let v = 0; v < 256; v++) if (cum[v + 1] >= want) return v / 255;
  return 1;
}
/* La table valeur du champ → opacité du masque (0..255) pour une couverture `cover` : la pénombre est CENTRÉE sur le seuil,
   pour que la part du sol à plus de mi-ombre soit `cover`. */
export function alphaLut(cum, cover) {
  const lut = new Uint8Array(256);
  if (!(cover > 0.004)) return lut;
  const t = coverThreshold(cum, cover), s = NUAGES.SOFT;
  for (let v = 0; v < 256; v++) lut[v] = Math.round(255 * smooth(t - s / 2, t + s / 2, v / 255));
  return lut;
}
