/* =============================================================================
   lib-mip.mjs — FABRIQUER LES IMAGES « GRILLE ÉCRAN » D'UN MONUMENT (2026-09-25)
   -----------------------------------------------------------------------------
   Phase 1 de la feuille de route graphique de Valley Town (tableau en tête de
   `components/ferme/README.md`). Guillaume : « je veux pas de perte de
   qualité ». Un monument peint (Gemini) n'est plus UNE image lissée à
   l'affichage, mais une image PAR CRAN DE ZOOM, à sa taille d'écran exacte
   (`townBitmapMip`, fermeConstants.js), posée par le jeu à 1 px d'image = 1 px
   d'écran, sans lissage (`drawScreenExactBitmap`, FermeGame.js).

   ⚠️ ÉCRIT UNE FOIS POUR LES TROIS MONUMENTS. Les trois scripts de fabrication
   (`build-eglise-sprite`, `build-townhall-sprite`, `build-tribunal-sprite`)
   gardent chacun LEUR détourage (le damier de chaque image Gemini se sépare
   autrement — voir leurs en-têtes), et remettent tous ici des plans pleine
   résolution. Un noyau de rééchantillonnage recopié trois fois serait trois
   noyaux au premier réglage (CLAUDE.md §8).

   LE PROCÉDÉ : Lanczos-3 séparable, sur alpha PRÉMULTIPLIÉ — sans quoi le
   damier retiré (couleur quelconque, alpha 0) bave en liseré autour de la
   silhouette. À la réduction, le noyau s'élargit du facteur (sinon c'est un
   sous-échantillonnage, qui crénèle) ; à l'agrandissement (le cran 5 dépasse
   légèrement la référence), il reste à 3.
   ========================================================================== */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

function lanczos(x) {
  if (x === 0) return 1;
  if (x <= -3 || x >= 3) return 0;
  const px = Math.PI * x;
  return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px);
}
function weights(inN, outN) {
  const scale = outN / inN, support = scale < 1 ? 3 / scale : 3, kscale = scale < 1 ? scale : 1;
  const table = [];
  for (let o = 0; o < outN; o++) {
    const c = (o + 0.5) / scale - 0.5;
    const lo = Math.max(0, Math.ceil(c - support)), hi = Math.min(inN - 1, Math.floor(c + support));
    const idx = [], w = []; let sum = 0;
    for (let k = lo; k <= hi; k++) { const v = lanczos((k - c) * kscale); idx.push(k); w.push(v); sum += v; }
    for (let k = 0; k < w.length; k++) w[k] /= sum;
    table.push({ idx, w });
  }
  return table;
}
/* planes : quatre Float32Array de CW×CH, DÉJÀ prémultipliés (r·a, g·a, b·a, a,
   couleurs en 0..255, alpha en 0..1). Rend quatre plans outW×outH. */
export function resample(planes, CW, CH, outW, outH) {
  const wx = weights(CW, outW), wy = weights(CH, outH);
  const mid = planes.map(() => new Float32Array(outW * CH));
  for (let y = 0; y < CH; y++) for (let o = 0; o < outW; o++) {
    const { idx, w } = wx[o];
    for (let p = 0; p < planes.length; p++) {
      let acc = 0; const P = planes[p], row = y * CW;
      for (let k = 0; k < idx.length; k++) acc += P[row + idx[k]] * w[k];
      mid[p][y * outW + o] = acc;
    }
  }
  const out = planes.map(() => new Float32Array(outW * outH));
  for (let o = 0; o < outH; o++) {
    const { idx, w } = wy[o];
    for (let x = 0; x < outW; x++) for (let p = 0; p < planes.length; p++) {
      let acc = 0; const M = mid[p];
      for (let k = 0; k < idx.length; k++) acc += M[idx[k] * outW + x] * w[k];
      out[p][o * outW + x] = acc;
    }
  }
  return out;
}
/* Plans prémultipliés → PNG. Alpha sous 1/255 : pixel VIDE, couleur nulle — la
   queue négative du noyau ne doit pas laisser de poussière quasi invisible. */
export function planesToPng(pl, W, H) {
  const png = new PNG({ width: W, height: H });
  for (let i = 0; i < W * H; i++) {
    const a = Math.min(1, Math.max(0, pl[3][i])), o = i * 4;
    if (a < 1 / 255) { png.data[o] = png.data[o + 1] = png.data[o + 2] = png.data[o + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) png.data[o + c] = Math.round(Math.min(255, Math.max(0, pl[c][i] / a)));
    png.data[o + 3] = Math.round(a * 255);
  }
  return png;
}
/* Écrit toutes les images d'un bitmap `grid: "screen"`.
   - `SB` : son entrée de `TOWN_BITMAPS` ; `mipOf` : `C.townBitmapMip` ;
   - `dayPlanes` / `glowPlanes` (ou null) : plans prémultipliés CW×CH ;
   - `post(png, mip, kind)` (facultatif) : retouche À LA RÉSOLUTION DU CRAN
     (l'hôtel de ville y repeint son cadran vierge).
   Rend la liste des images écrites, pour le journal du script. */
export function writeMips(ROOT, SB, mipOf, dayPlanes, glowPlanes, CW, CH, post) {
  const done = [];
  for (const z of SB.zooms) {
    const mip = mipOf(SB, z);
    const day = planesToPng(resample(dayPlanes, CW, CH, mip.w, mip.h), mip.w, mip.h);
    if (post) post(day, mip, "day");
    writeFileSync(path.join(ROOT, "public", mip.day), PNG.sync.write(day));
    if (mip.glow && glowPlanes) {
      const glow = planesToPng(resample(glowPlanes, CW, CH, mip.w, mip.h), mip.w, mip.h);
      if (post) post(glow, mip, "glow");
      writeFileSync(path.join(ROOT, "public", mip.glow), PNG.sync.write(glow));
    }
    done.push(`cran ${z} : ${mip.w}x${mip.h} (référence ${CW}x${CH}, facteur ${(mip.w / CW).toFixed(3)})`);
  }
  return done;
}
