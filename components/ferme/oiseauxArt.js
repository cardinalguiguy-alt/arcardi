/* =============================================================================
   oiseauxArt.js — LE DESSIN DES GRUES CENDRÉES EN VOL (2026-11-21). Le modèle (pur) est `oiseaux.js`.
   -----------------------------------------------------------------------------
   Vue d'en haut, au pixel d'art, dans la manière du goéland en vol (`drawGullFlight`, fauneArt.js) : des cellules posées une à une,
   un cerne d'un pixel, puis les couleurs. Ce qui fait lire une GRUE et pas un goéland ou une oie :
     · les ailes LONGUES ET LARGES, droites (une grue plane bras tendus), gris cendré, dont tout le BORD DE FUITE et le bout sont NOIRS
       (les rémiges : la signature de la grue vue d'en haut), le bout effrangé en « doigts » ;
     · le COU TENDU loin devant, noir, avec la joue blanche, la calotte rouge d'un pixel ;
     · les PATTES qui dépassent derrière la queue (une oie les replie, un héron replie son cou).
   Petites pour leur taille vraie (2 m d'envergure ↦ 17 px) : elles volent haut, et c'est leur ombre, minuscule et pâle, qui le dit.
   L'ombre ne naît que s'il y a du soleil direct, et pas sous un nuage (l'appelant passe sa force). */

const PAL = { wing: "#9aa1a8", wingLo: "#848b93", black: "#1d1e22", body: "#a7adb3", neck: "#202024", cheek: "#eceae4", crown: "#c23a2e", leg: "#2b2b2e", rim: "#5a6069" };   // ⚠️ un cerne plus clair que le noir des rémiges : vu en jeu (cran 4), un cerne sombre les alourdissait en croix noires
const S = 8;   // demi-envergure, px d'art

/* Une grue en (x, y) (px d'art, le point du ciel où elle vole), cap (hx, hy) unitaire ; `flap` la phase du battement, `gliding` vrai
   quand elle plane (ailes tendues, immobiles). */
export function drawCrane(ctx, x, y, hx, hy, flap, gliding) {
  const nx = -hy, ny = hx;
  // l'envergure apparente : bras tendus en planant ; en battant, l'aile remonte (plus courte vue d'en haut) puis s'abaisse
  const f = gliding ? 1 : 0.74 + 0.26 * Math.cos(flap);
  const bend = gliding ? 0 : Math.sin(flap) * 0.7;      // le bout de l'aile en retard ou en avance sur l'épaule
  const cells = [];
  const put = (qx, qy, col) => cells.push([Math.round(qx), Math.round(qy), col]);
  for (const side of [1, -1]) {
    for (let u = 1; u <= S; u++) {
      const reach = u * f, sweep = (u / S) * 0.9 + bend * (u / S);
      const cx = x + nx * side * reach - hx * sweep, cy = y + ny * side * reach - hy * sweep;
      const tip = u >= S - 1;
      const chord = tip ? 2 : u <= 2 ? 3 : 3;                       // une aile LARGE jusqu'au bout
      for (let j = 0; j < chord; j++) {
        const qx = cx + hx * (1 - j), qy = cy + hy * (1 - j);
        // le bord de fuite (j = chord − 1) noir sur toute la longueur ; le bout entier noir ; le bord d'attaque un ton plus clair
        const col = tip || j === chord - 1 ? PAL.black : j === 0 ? PAL.wing : PAL.wingLo;
        put(qx, qy, col);
      }
      // les « doigts » : au bout, une rémige écartée sur deux pixels
      if (u === S && !gliding && Math.cos(flap) > 0.3) put(cx + nx * side - hx, cy + ny * side - hy, PAL.black);
      else if (u === S && gliding) put(cx + nx * side * 0.6 - hx * 1.4, cy + ny * side * 0.6 - hy * 1.4, PAL.black);
    }
  }
  // le corps (de la queue −3 à la poitrine +1), le cou noir (+2 à +5), la tête (+6) ; les pattes derrière (−4, −5)
  for (let s = -3; s <= 1; s++) put(x + hx * s, y + hy * s, PAL.body);
  for (let s = 2; s <= 5; s++) put(x + hx * s, y + hy * s, PAL.neck);
  put(x + hx * 4 + nx * 0.7, y + hy * 4 + ny * 0.7, PAL.cheek);         // la joue blanche, d'un côté du cou
  put(x + hx * 6, y + hy * 6, PAL.crown);                                // la calotte rouge
  put(x + hx * 7, y + hy * 7, PAL.black);                                // le bec
  for (let s = -4; s >= -6; s--) put(x + hx * s, y + hy * s, PAL.leg);   // les pattes tendues derrière
  ctx.fillStyle = PAL.rim;
  const seen = new Set(cells.map((c) => c[0] + "," + c[1]));
  for (const [cx, cy] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = (cx + dx) + "," + (cy + dy);
    if (!seen.has(k)) { seen.add(k); ctx.fillRect(cx + dx, cy + dy, 1, 1); }
  }
  for (const [cx, cy, col] of cells) { ctx.fillStyle = col; ctx.fillRect(cx, cy, 1, 1); }
}
/* L'ombre d'une grue au sol : la silhouette des ailes en trait d'un pixel, pâle (elle vole haut : la pénombre la mange). `a` : sa
   force (déjà réglée sur le soleil et le nuage par l'appelant). */
export function drawCraneShadow(ctx, x, y, hx, hy, flap, gliding, a) {
  if (!(a > 0.01)) return;
  const nx = -hy, ny = hx, f = gliding ? 1 : 0.74 + 0.26 * Math.cos(flap);
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * a;
  ctx.fillStyle = "#151a24";
  /* ⚠️ Premier jet : un trait d'un pixel à 12 % — vu en jeu (cran 2, automne, 14 h 30), invisible. L'aile a deux pixels de corde jusqu'aux
     trois quarts (l'ombre d'une aile large), le corps deux de large. Chaque pixel une seule fois (`seen`) : pas de recouvrement plus sombre. */
  const seen = new Set(), dot = (qx, qy) => { const X = Math.round(qx), Y = Math.round(qy), k = X + "," + Y; if (!seen.has(k)) { seen.add(k); ctx.fillRect(X, Y, 1, 1); } };
  for (const side of [1, -1]) for (let u = 0; u <= S; u++) {
    const r = u * f, cx = x + nx * side * r - hx * (u / S) * 0.9, cy = y + ny * side * r - hy * (u / S) * 0.9;
    dot(cx, cy);
    if (u < S * 0.75) dot(cx - hx, cy - hy);
  }
  for (let s = -3; s <= 5; s++) { dot(x + hx * s, y + hy * s); if (s <= 1) dot(x + hx * s + nx, y + hy * s + ny); }
  ctx.globalAlpha = a0;
}
