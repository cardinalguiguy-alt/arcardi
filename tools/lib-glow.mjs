/* =============================================================================
   lib-glow.mjs — LES RECETTES DE LUMIÈRE D'UNE VITRE PEINTE (2026-09-26, 6a)
   -----------------------------------------------------------------------------
   Sorties telles quelles de `build-monument-glow.mjs` le jour où les MAISONS
   peintes (`build-maison-sprites.mjs`) ont eu besoin des mêmes : une vitre
   sombre qui s'allume en gardant ses croisillons, une baie à rideaux, le verre
   d'une lanterne, la profondeur d'une pièce allumée. ⚠️ Écrites UNE fois : deux
   copies d'une recette de lumière seraient deux lumières au premier réglage
   (CLAUDE.md §8). Aucune retouche en chemin — le calque des monuments sort au
   bit près celui d'avant (vérifié en relançant le script : aucun PNG modifié).
   ========================================================================== */
export const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

// Une vitre sombre (verre gris-bleu, croisillons clairs) : la vitre s'allume
// d'une lumière de lampe, plus chaude en bas. ⚠️ LES CROISILLONS RESTENT
// SOMBRES : de jour ils sont plus CLAIRS que le verre, de nuit ils se lisent
// en silhouette sur la pièce allumée — c'est ce qui fait une fenêtre et pas
// un panneau jaune (deux premiers jets). Le partage se fait contre la
// luminance MÉDIANE de la vitre dans sa baie (`med`, calculée par cran) :
// un pixel plus clair que la médiane de plus de `PANE_MUNTIN_DL` est un
// croisillon. Un seuil absolu ne tenait pas : les baies du portique, dans
// l'ombre des colonnes, sont peintes plus sombres que celles des ailes.
export const PANE_MUNTIN_DL = 14;
export function darkPane(r, g, b, fy, maxL, med) {
  const L = lum(r, g, b);
  if (L > maxL + 4) return null;
  const cut = med == null ? maxL : Math.min(maxL, med + PANE_MUNTIN_DL);
  const a = 1 - smooth(cut - 6, cut + 4, L);
  if (a < 0.02) return null;
  const t = clamp(L / Math.max(1, cut), 0, 1);
  const k = 0.84 + 0.16 * t;
  return [248 * k, (205 - 22 * fy) * k, (140 - 38 * fy) * k, a];
}

// Une baie à rideaux (mairie) : le verre bleu devient lumière de lampe, les
// rideaux et le bois de l'intérieur s'éclairent par derrière en gardant leur
// teinte ; les meneaux de fer restent sombres. (Premier jet : les rideaux
// poussés à 240 sortaient roses et plats.)
export function curtainWindow(r, g, b, fy) {
  const L = lum(r, g, b);
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
  if (L > 172 && sat < 0.32) return null;           // la pierre, l'enseigne
  if (L < 30) return [r, g, b, 0.12];               // le fer des meneaux
  if (b >= r - 8) return darkPane(r, g, b, fy, 150, null); // le verre (ses meneaux sont de fer, sombres)
  const k = Math.min(1.7, 215 / Math.max(1, Math.max(r, g, b)));
  return [r * k, g * k * 1.05, b * k * 0.9, 0.9];
}

// Le verre d'une lanterne peinte : ses pixels clairs et chauds deviennent
// une flamme.
export function lanternGlass(r, g, b) {
  const L = lum(r, g, b);
  if (L < 95 || r - b < 18) return null;
  return [255, 232, 168, smooth(95, 140, L)];
}

export const hashi = (a, b) => { let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be5ab, 0x85ebca77)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 13; return h >>> 0; };

export const LAMPS = [[255, 206, 128], [255, 226, 176], [255, 188, 104], [250, 214, 150]];

// Les silhouettes, en coordonnées de la baie (u de 0 à 1 de gauche à droite,
// v de 0 à 1 de haut en bas). Rend vrai si le pixel est DERRIÈRE l'objet.
export const SILS = [
  (u, v) => v > 0.66 && u > 0.18 && u < 0.62 && (v > 0.8 || u < 0.26 || u > 0.54),        // dos de fauteuil
  (u, v) => (v > 0.84 && u > 0.56 && u < 0.84) || (Math.hypot((u - 0.7) / 0.2, (v - 0.72) / 0.16) < 1), // plante en pot
  (u, v) => u < 0.2 && v > 0.3,                                                              // le montant d'une étagère
];

// Profondeur et teinte d'une vitre allumée (recettes `pane` et le verre de `curtain`).
export function shadePane(g, st, u, v, isRoom) {
  const lampMix = 0.55;
  let c = [0, 1, 2].map((q) => g[q] * (1 - lampMix) + st.lamp[q] * lampMix);
  let k = st.k * (0.8 + 0.2 * v);                         // plus fort en bas
  if (isRoom) k *= 0.78 + 0.22 * Math.min(1, Math.min(u, 1 - u) / 0.22); // rideaux sur les côtés
  c = c.map((x, q) => x * k * (q === 2 ? 1 - 0.1 * v : 1));
  let a = g[3];
  if (isRoom && st.sil && st.sil(u, v)) { c = c.map((x) => x * 0.42); a *= 0.9; }
  return [c[0], c[1], c[2], a];
}

