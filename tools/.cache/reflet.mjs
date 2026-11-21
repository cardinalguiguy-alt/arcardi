/* =============================================================================
   reflet.js — LES PERSONNAGES SE REFLÈTENT DANS LES FLAQUES (2026-11-21).
   -----------------------------------------------------------------------------
   Un ajout de l'après-midi libre du 2026-11-21 (« be free, sois inventif »). Après la pluie (et pendant), les flaques de la ville
   (`pluie.js` : les ornières, le pied des trottoirs, les creux des dalles, le sable du boulodrome) renvoyaient le ciel, jamais ceux
   qui marchent dedans. Ici, quand un personnage se tient au-dessus d'une flaque, son image s'y retourne sous ses pieds — plus sombre,
   bleutée, qui s'efface en s'éloignant des pieds, découpée AU PIXEL par le bord de la flaque (on ne voit le reflet que dans l'eau), et
   qui ondule quand il pleut. Son parapluie s'y reflète aussi.
   · LA SOURCE : la feuille fine du personnage (32 × 48 la case, `getCharHD`), l'image en cours (le pas, la vue, le miroir du profil
     ouest), et le dôme du parapluie posé au-dessus (`parapluie.js`, la même place qu'à l'écran) : une « figure » de 48 × 60 pixels fins.
   · LE REFLET : la figure retournée autour de la ligne des pieds (la rangée du bas touche les pieds : un reflet commence là où l'on
     se tient), 24 × 30 px d'art sous les pieds. Un pixel n'est posé que si le pixel d'art du sol est en flaque (`mask`).
   · LA COULEUR : l'eau boit la lumière et rend le ciel — chaque canal × `DARK`, plus `TINT` (un bleu de ciel sombre) ; l'opacité
     baisse avec la distance aux pieds (`FADE`) : la flaque est un miroir terne, pas une vitre.
   · L'ONDULATION : sous la pluie, chaque rangée glisse d'un pixel fin au plus, à sa phase (`sin(t × 4,2 + rangée × 0,7)`).
   ⚠️ PUR : ni canevas, ni horloge (l'appelant passe `t`), ni réseau. Désactivable : menu dev, « Ajouts de la nuit du 21 novembre »
   (`AJOUTS.puddleRefl`, FermeGame.js). Banc : `tools/verify-reflet.mjs`.
   ========================================================================== */
import { PARAPLUIE, domeGrid, umbrellaPlace } from "./parapluie.mjs";

export const REFLET = {
  W: 48, H: 60,            // la figure et le reflet, en pixels fins (24 × 30 px d'art)
  SX: 8, SY: 12,           // où se pose la case du sprite (32 × 48) dans la figure : la marge du dôme, au-dessus et sur les côtés
  DARK: 0.66, TINT: [14, 22, 38],
  ALPHA: 0.74, FADE: 0.7,     // vu en jeu sous l'orage : 0,62 / 0,58 se perdait dans la flaque sombre
  RIPPLE: 1,               // pixels fins, au plus fort de la pluie
};
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/* La figure : `fig` (W × H × 4, réutilisable) — la case `(cx0, cy0)` de la feuille `src` (largeur `sw`), en miroir si `flip`, et le
   parapluie `um` ({ col, dark, side }, ou null) tenu par quelqu'un qui regarde `face`. */
export function buildFigure(fig, src, sw, cx0, cy0, flip, um, face) {
  const { W, H, SX, SY } = REFLET;
  fig.fill(0);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
    const s = ((cy0 + y) * sw + cx0 + (flip ? 31 - x : x)) * 4;
    if (src[s + 3] < 128) continue;
    const d = ((SY + y) * W + SX + x) * 4;
    fig[d] = src[s]; fig[d + 1] = src[s + 1]; fig[d + 2] = src[s + 2]; fig[d + 3] = 255;
  }
  if (um) {
    // la même place qu'à l'écran (`umbrellaPlace`, en px d'art depuis le haut du sprite) ; le profil ouest est un miroir
    const pl = umbrellaPlace(0, 0, face, um.side, 1), g = domeGrid(), DW = PARAPLUIE.W;
    const cols = [null, hexRgb(um.col), hexRgb(um.dark), hexRgb(PARAPLUIE.STICK)];
    const put = (fx, fy, c) => { if (fx < 0 || fy < 0 || fx >= W || fy >= H) return; const d = (fy * W + fx) * 4; fig[d] = c[0]; fig[d + 1] = c[1]; fig[d + 2] = c[2]; fig[d + 3] = 255; };
    if (pl.stickVisible) for (let y = Math.round(pl.sy0 * 2); y < Math.round(pl.sy1 * 2); y++) put(SX + Math.round(pl.sx * 2), SY + y, cols[3]);
    for (let y = 0; y < PARAPLUIE.H; y++) for (let x = 0; x < DW; x++) { const v = g[y * DW + x]; if (v) put(SX + Math.round(pl.dx * 2) + x, SY + Math.round(pl.dy * 2) + y, cols[v]); }
  }
  return fig;
}

/* LE REFLET : `out` (W × H × 4) reçoit la figure retournée sous les pieds, là où `mask(wx, wy)` (px d'art du monde) dit « flaque ».
   `ox` : le bord gauche du sprite (px d'art) ; `feetY` : la ligne des pieds ; `rain` (0..1) l'ondulation ; `t` (s). Rend le nombre de
   pixels posés (0 : rien à dessiner). */
export function reflectInto(out, fig, mask, ox, feetY, rain, t) {
  const { W, H, SX, DARK, TINT, ALPHA, FADE, RIPPLE } = REFLET;
  out.fill(0);
  let n = 0;
  const wx0 = ox - SX / 2;
  for (let ry = 0; ry < H; ry++) {
    const wy = Math.floor(feetY + ry / 2);
    const fy = H - 1 - ry;                                   // la rangée des pieds (H − 1) se reflète la première
    const sh = rain > 0.02 ? Math.round(Math.sin(t * 4.2 + ry * 0.7) * RIPPLE * Math.min(1, rain * 2)) : 0;
    const a = ALPHA * (1 - FADE * ry / H);
    for (let rx = 0; rx < W; rx++) {
      const fx = rx - sh;
      if (fx < 0 || fx >= W) continue;
      const s = (fy * W + fx) * 4;
      if (!fig[s + 3]) continue;
      if (!mask(Math.floor(wx0 + rx / 2), wy)) continue;
      const d = (ry * W + rx) * 4;
      out[d] = Math.round(fig[s] * DARK + TINT[0]); out[d + 1] = Math.round(fig[s + 1] * DARK + TINT[1]); out[d + 2] = Math.round(fig[s + 2] * DARK + TINT[2]);
      out[d + 3] = Math.round(255 * a);
      n++;
    }
  }
  return n;
}

/* Le personnage a-t-il une flaque sous ses pieds ou devant eux ? Un tamis grossier (tous les 2 px d'art) sur le rectangle du reflet,
   pour ne rien calculer de plus quand il n'y en a pas. */
export function anyPuddle(mask, ox, feetY) {
  for (let y = 0; y < 30; y += 2) for (let x = -4; x < 20; x += 2) if (mask(Math.floor(ox + x), Math.floor(feetY + y))) return true;
  return false;
}
