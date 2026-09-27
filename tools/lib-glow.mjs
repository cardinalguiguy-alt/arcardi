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


/* ── 2026-09-27 — UNE VITRINE D'EXPOSITION ALLUMÉE (la Maison Garfield) ──────
   Guillaume : « bien travailler l'éclairage des vitrines, c'est important ».
   Une vitrine n'est pas une fenêtre de maison : une fenêtre s'allume d'un bloc
   (on ne voit pas dedans), une vitrine est ÉCLAIRÉE POUR QU'ON VOIE CE QU'ELLE
   MONTRE. ⚠️ Premier jet, la recette des maisons (`housePane`) : tout pixel
   chaud éclairci jusqu'à 215 — l'étage d'exposition sortait en aplat beige
   délavé, les chapeaux et les cravates effacés.
   · les articles GARDENT leurs couleurs : la lumière les MULTIPLIE (halogène,
     3 000 K), elle ne les remplace pas — le calque de nuit est, à l'écran, la
     couleur même qu'on voit (le ciel le multiplie, puis il est rajouté : voir
     `makeLightRenderer`) ; ses ombres sont donc de vraies ombres ;
   · chaque SPOT du plafond (`spots` : l'abscisse de sa lentille, px de la
     référence) pose un cône qui s'élargit en descendant, et dessine sur le
     fond l'arc en COQUILLE d'un plafonnier — le motif qui fait lire une vitrine
     de boutique la nuit ; sa lentille brille ;
   · une RÉGLETTE (`bar` : ses deux bouts) éclaire tout du long, plus fort près
     d'elle, et brille elle-même ;
   · les MONTANTS (`mullions` en x, `rails` en y) restent en silhouette sur le
     fond allumé — ce qui fait une vitrine et pas un panneau lumineux ;
   · les bords et les coins reçoivent moins (vignettage), les points les plus
     chauffés tirent vers le blanc chaud, sans aplat.
   `x, y` : le pixel (px de la référence) ; `w` : la vitre ({ x, y, w, h }). */
export const SHOW_TINT = [1.0, 0.88, 0.70];
const SHOW_HOT = [255, 246, 226];
export function showWindow(r, g, b, x, y, w) {
  const S = w.show, L = lum(r, g, b);
  const inRun = (v, runs) => (runs || []).some(([a, c]) => v >= a && v <= c);
  if (inRun(x, S.mullions) || inRun(y, S.rails)) return null;         // en silhouette
  const u = (x - w.x) / w.w, v = (y - w.y) / w.h;
  // Les sources elles-mêmes : la lentille d'un spot, la réglette.
  for (const sx of S.spots || []) {
    const d = Math.hypot((x - sx) / 7, (y - S.lensY) / 4);
    if (d < 1) return [...SHOW_HOT, 1 - 0.5 * smooth(0.5, 1, d)];
  }
  if (S.bar && y >= S.bar.y - 2 && y <= S.bar.y + 2 && x >= S.bar.x0 && x <= S.bar.x1) return [...SHOW_HOT, 1];
  // La lumière reçue.
  let I = S.ambient == null ? 0.36 : S.ambient;
  for (const sx of S.spots || []) {
    const dy = (y - S.lensY) / w.h;
    if (dy <= 0) continue;
    const du = (x - sx) / w.w;
    /* ⚠️ Des cônes ÉTROITS : six spots sur 524 px, et des cônes qui
       s'élargissaient vite (0,30 par hauteur) se recouvraient tous — un fond
       blanc partout, pas une coquille lisible (premier réglage, vu sur la
       simulation de nuit du jeu). */
    const sig = 0.03 + 0.17 * dy;                                      // le cône s'élargit en descendant
    const top = 0.04 + 2.8 * du * du;                                  // le bord haut de la coquille : un arc
    I += 0.8 * Math.exp(-(du / sig) * (du / sig)) * smooth(top - 0.02, top + 0.04, dy);
  }
  if (S.bar) {
    const dy = (y - S.bar.y) / w.h;
    if (dy > 0) {
      const along = Math.min(smooth(S.bar.x0 - 40, S.bar.x0 + 10, x), 1 - smooth(S.bar.x1 - 10, S.bar.x1 + 40, x));
      I += 0.85 * along * Math.exp(-dy * 1.5);                         // une réglette porte loin : les chapeaux du bas aussi
    }
  }
  I *= 0.8 + 0.2 * smooth(0, 0.16, Math.min(u, 1 - u, v, 1 - v));    // vignettage
  I = Math.min(1.8, I);
  const k = 1.2 * I;
  let c = [r * SHOW_TINT[0] * k, g * SHOW_TINT[1] * k, b * SHOW_TINT[2] * k];
  const hot = smooth(1.15, 1.8, I) * smooth(120, 235, L);
  c = c.map((q, i) => q + (SHOW_HOT[i] - q) * 0.3 * hot);
  return [clamp(c[0], 0, 255), clamp(c[1], 0, 255), clamp(c[2], 0, 255), 0.97];
}

/* L'intérieur d'une boutique vu à travers sa porte vitrée : une lumière chaude
   qui garde la texture peinte du verre (reflets, profondeur) ; la poignée et
   le bois clair, en contre-jour, restent en silhouette. */
export function shopInterior(r, g, b, fy) {
  const L = lum(r, g, b);
  if (r > b + 35 && L > 90) return null;                              // laiton, bois : en silhouette
  if (L < 28) return null;
  /* ⚠️ Pas un panneau : premier jet, une lumière presque uniforme — la porte
     sortait en aplat crème. La salle s'assombrit vers le sol, loin du
     plafonnier, et garde la texture peinte du verre. */
  const t = clamp(L / 160, 0, 1);
  const k = (0.48 + 0.42 * t) * (1.08 - 0.42 * fy);
  return [244 * k, 192 * k, 128 * k, 0.95];
}

/* 2026-09-27 — UNE VITRE PASSÉE AU BLANC D'ESPAGNE, éclairée par-derrière (la
   Maison Garfield en travaux, le soir) : le badigeon diffuse une lampe de
   chantier. Seul le blanc s'allume — le cadre, les meneaux et le mastic restent
   en silhouette — et il garde ses coups de brosse : la lumière suit la
   luminance du badigeon, plus chaude là où il est mince. Plus bas dans la
   baie, un peu moins (la lampe est posée haut). */
export function washPane(r, g, b, fy) {
  const L = lum(r, g, b);
  if (L < 150 || Math.abs(r - b) > 45) return null;
  const t = clamp((L - 150) / 90, 0, 1);
  const k = (0.62 + 0.38 * t) * (1.04 - 0.3 * fy);
  return [255 * k, 214 * k, 150 * k, 0.55 + 0.35 * t];
}

/* Les lettres DORÉES d'une enseigne accrochent la lumière de la rue : seul
   l'or s'allume (le fond peint reste la nuit), sans devenir un néon. */
export function signGold(r, g, b) {
  const L = lum(r, g, b);
  if (r - b < 30 || L < 90) return null;
  const k = clamp(L / 190, 0.55, 1.1);
  return [255 * k, 214 * k, 138 * k, 0.6 * smooth(90, 150, L)];
}
