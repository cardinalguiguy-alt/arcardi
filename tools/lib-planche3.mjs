/* =============================================================================
   lib-planche3.mjs — LA SEGMENTATION DES PLANCHES DE LA PHASE 7b (2026-10-02).
   -----------------------------------------------------------------------------
   Sortie de `import-planche3.mjs` pour que `build-lampadaires.mjs` détoure ET
   cadre les lampadaires exactement comme l'import (une règle de détourage
   recopiée serait deux règles au premier réglage, CLAUDE.md §8). Le détail des
   trois classes (fond magenta, ombre violet foncé, objet) est dans l'en-tête de
   `import-planche3.mjs`. ⚠️ `cutObject` rend en plus `x0`/`y0` : l'origine, en
   cellules de la feuille échantillonnée, du sprite recadré — c'est elle qui dit
   quel rectangle de la planche a donné quel sprite natif.
   ========================================================================== */

export const STEP3 = 5.4;                       // px image par pixel natif (voir l'en-tête de `import-planche3.mjs`)

/* LES DEUX LAMPADAIRES PAR RANG : leur boîte dans la planche B (px image) et
   leur pas. ⚠️ UNE SEULE DÉCLARATION — `import-planche3.mjs` en tire le sprite
   natif, `build-lampadaires.mjs` les images « grille écran » : deux copies de la
   boîte, et le jour où l'une bouge, l'image posée au pixel d'écran ne
   recouvrirait plus le sprite dont on lit la lumière. */
export const LAMPS = {
  lampRich: { box: [1120, 24, 186, 422], step: 7.5 },
  lampPoor: { box: [814, 338, 79, 186], step: STEP3 },
};

export const MT = 60;          // « magenta » : min(r,b) − g ≥ MT
export const FRINGE = 35;      // contaminé de rose : entre FRINGE et MT, au contact du fond
export const SH_LUM = 104;     // plus sombre que ça, en magenta : c'est de l'OMBRE
const mag = (r, g, b) => Math.min(r, b) - g;
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;

/* 0 = objet, 1 = fond, 2 = ombre. */
export function classify(sh) {
  const { w, h, px } = sh;
  const kind = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    if (mag(r, g, b) >= MT) kind[i] = lum(r, g, b) < SH_LUM ? 2 : 1;
  }
  // Le liseré rose : un pixel d'objet un peu rosé qui touche le fond ou l'ombre.
  const drop = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (kind[i]) continue;
    if (mag(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) < FRINGE) continue;
    let touchBg = false, touchSh = false;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j < 0) continue;
      if (kind[j] === 1) touchBg = true; else if (kind[j] === 2) touchSh = true;
    }
    if (touchBg || touchSh) drop.push(i, touchSh && !touchBg ? 2 : 1);
  }
  for (let k = 0; k < drop.length; k += 2) kind[drop[k]] = drop[k + 1];
  return kind;
}

/* Découpe un objet : ses pixels + l'ombre qui lui est CONNEXE (remplissage
   depuis les pixels d'objet à travers l'ombre, borné à la boîte agrandie). Rend
   un sprite recadré sur l'union objet + ombre. */
export function cutObject(sh, kind, x, y, w, h, step) {
  const bx0 = Math.floor(x / step), by0 = Math.floor(y / step);
  const bx1 = Math.ceil((x + w) / step), by1 = Math.ceil((y + h) / step);
  const M = 9;                                            // ~50 px image de marge d'ombre
  const ex0 = Math.max(0, bx0 - M), ex1 = Math.min(sh.w, bx1 + M);
  const ey0 = Math.max(0, by0 - 1), ey1 = Math.min(sh.h, by1 + M);
  const own = new Uint8Array(sh.w * sh.h);                // 1 = objet, 2 = ombre
  const st = [];
  for (let j = by0; j < by1; j++) for (let i = bx0; i < bx1; i++) {
    if (i < 0 || j < 0 || i >= sh.w || j >= sh.h) continue;
    if (kind[j * sh.w + i] === 0) own[j * sh.w + i] = 1;
  }
  // l'ombre : germes = ombre voisine d'un pixel d'objet
  for (let j = ey0; j < ey1; j++) for (let i = ex0; i < ex1; i++) {
    const k = j * sh.w + i;
    if (kind[k] !== 2 || own[k]) continue;
    for (const n of [i > 0 ? k - 1 : -1, i < sh.w - 1 ? k + 1 : -1, j > 0 ? k - sh.w : -1, j < sh.h - 1 ? k + sh.w : -1]) {
      if (n >= 0 && own[n] === 1) { own[k] = 2; st.push(k); break; }
    }
  }
  while (st.length) {
    const k = st.pop(), i = k % sh.w, j = (k / sh.w) | 0;
    for (const n of [i > ex0 ? k - 1 : -1, i < ex1 - 1 ? k + 1 : -1, j > ey0 ? k - sh.w : -1, j < ey1 - 1 ? k + sh.w : -1]) {
      if (n >= 0 && kind[n] === 2 && !own[n]) { own[n] = 2; st.push(n); }
    }
  }
  let mnx = 1e9, mny = 1e9, mxx = -1, mxy = -1, foot = -1;
  for (let j = ey0; j < ey1; j++) for (let i = ex0; i < ex1; i++) {
    if (!own[j * sh.w + i]) continue;
    if (i < mnx) mnx = i; if (i > mxx) mxx = i; if (j < mny) mny = j; if (j > mxy) mxy = j;
    if (own[j * sh.w + i] === 1 && j > foot) foot = j;
  }
  if (mxx < 0) return null;
  const cw = mxx - mnx + 1, ch = mxy - mny + 1;
  const px = new Uint8ClampedArray(cw * ch * 4), shadow = new Uint8Array(cw * ch);
  for (let j = mny; j <= mxy; j++) for (let i = mnx; i <= mxx; i++) {
    const o = own[j * sh.w + i];
    if (!o) continue;
    const d = (j - mny) * cw + (i - mnx);
    if (o === 2) { shadow[d] = 1; continue; }
    const q = (j * sh.w + i) * 4;
    px[d * 4] = sh.px[q]; px[d * 4 + 1] = sh.px[q + 1]; px[d * 4 + 2] = sh.px[q + 2]; px[d * 4 + 3] = 255;
  }
  return { w: cw, h: ch, px, shadow, foot: foot - mny, x0: mnx, y0: mny };
}

