/* =============================================================================
   nuagesArt.js — LE DESSIN DES OMBRES DES NUAGES (2026-11-21, nuit). Le modèle (pur) est `nuages.js`.
   -----------------------------------------------------------------------------
   Trois gestes, appelés par la boucle de rendu (FermeGame.js), à la ferme comme en ville :
   · `cloudsFrame(...)`, une fois par image, AVANT la passe des ombres du soleil : avance la dérive, tire le champ (par tranches,
     jamais une image arrêtée), règle la couverture, et dit s'il y a des nuages à poser (`frame`, ou null) ;
   · `eraseSunShadow(g, ...)`, DANS le tampon des ombres du soleil, avant qu'il ne soit posé : SOUS UN NUAGE IL N'Y A PLUS DE
     SOLEIL DIRECT, donc plus d'ombre portée — la maison qui portait une dalle sombre sur la rue la perd quand le nuage passe,
     et le sol à l'ombre de la maison n'est pas deux fois plus noir que celui d'à côté (une ombre, pas une somme : la règle de
     `sunShadowPass`) ;
   · `paintClouds(ctx, ...)`, APRÈS le monde trié et AVANT la lumière de nuit : l'ombre posée sur TOUT ce qui est dehors — sol,
     maisons peintes, arbres, gens. C'est ce geste qui met les maisons dans le paysage (voir l'en-tête de `nuages.js`).
   LE CHAMP EST UNE TEXTURE PÉRIODIQUE de (N + 2)² px (une cellule de bord recopiée de l'autre côté : le lissage bilinéaire lit
   au-delà du rectangle source quand l'image en a, donc deux copies voisines se raccordent sans couture), coloriée à la teinte
   des ombres du soleil (`OMBRE.RGB`) et posée agrandie, LISSÉE — la seule pose lissée du décor, exprès : une pénombre de dix
   cases en paliers dessinait des courbes de niveau qui glissaient sur l'herbe.
   État de MODULE (`CL`), pas un ref : aucun crochet React de plus (l'ordre des crochets est ce par quoi le harnais retrouve les
   siens) ; la dérive est intégrée par chaque écran à la même vitesse, depuis une origine tirée de l'horloge — deux joueurs
   voient le même ciel à quelques pixels près, et rien ne circule (§3).
   ========================================================================== */
import * as NU from "./nuages";

const N = NU.NUAGES.N, CELL = NU.NUAGES.CELL, P = N * CELL;   // la période, en px d'art (monde)
const CL = { field: null, rows: 0, seed: null, cum: null, cv: null, img: null, cover: -1, rgb: "", ox: null, oy: 0, last: 0, ready: 0, frame: null };
const ROWS_PER_FRAME = 16;   // ~4 ms par image sur un Mac (le champ entier : ~70 ms, mesuré sous Node)

function buildTexture(cover, rgb) {
  if (typeof document === "undefined") return;
  if (!CL.cv) { CL.cv = document.createElement("canvas"); CL.cv.width = N + 2; CL.cv.height = N + 2; CL.img = CL.cv.getContext("2d").createImageData(N + 2, N + 2); }
  const lut = NU.alphaLut(CL.cum, cover), d = CL.img.data, f = CL.field, W = N + 2;
  for (let y = 0; y < W; y++) {
    const fy = ((y - 1) % N + N) % N;
    for (let x = 0; x < W; x++) {
      const fx = ((x - 1) % N + N) % N, o = (y * W + x) * 4;
      d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = lut[f[fy * N + fx]];
    }
  }
  CL.cv.getContext("2d").putImageData(CL.img, 0, 0);
  CL.cover = cover; CL.rgb = rgb.join(",");
}

/* Une image : `seed` (la graine du monde : le même ciel chez tous), `day`, `season`, `hour` (heures de jeu), `W` (le temps de
   meteo.js), `sunA` (l'opacité de l'ombre du soleil À CET INSTANT, `sunShadow(...).a`, 0 la nuit), `rgb` (la teinte des ombres,
   `OMBRE.RGB`), `on` (l'interrupteur du menu dev). Rend `CL.frame` : { a, ox, oy } ou null. */
export function cloudsFrame({ seed, day, season, hour, W, sunA, rgb, on }) {
  const t = typeof performance !== "undefined" ? performance.now() : Date.now();
  const dt = CL.last ? Math.min(0.25, Math.max(0, (t - CL.last) / 1000)) : 0;
  CL.last = t;
  // La dérive avance toujours (même nuages invisibles) : à leur retour, ils sont là où le vent les a menés.
  const [vx, vy] = NU.driftSpeed((W && W.wind) || 0);
  if (CL.ox == null) { const s = Date.now() / 1000; CL.ox = (s * vx) % P; CL.oy = (s * vy) % P; }
  CL.ox = (CL.ox + vx * dt) % P; CL.oy = (CL.oy + vy * dt) % P;
  CL.frame = null;
  if (!on) { CL.ready = 0; return null; }
  const a = NU.cloudShadowAlpha(sunA);
  const cover = NU.cloudCover(day, season, hour, W);
  if (a < 0.008 || cover < 0.01) return null;
  if (CL.seed !== seed || !CL.field) { CL.field = new Uint8Array(N * N); CL.rows = 0; CL.seed = seed; CL.cum = null; CL.cover = -1; CL.ready = 0; }
  if (CL.rows < N) {
    NU.cloudFieldRows(CL.field, seed, CL.rows, Math.min(N, CL.rows + ROWS_PER_FRAME));
    CL.rows += ROWS_PER_FRAME;
    if (CL.rows >= N) CL.cum = NU.fieldCdf(CL.field);
    return null;
  }
  // La couverture se règle par crans de 0,005 (une texture refaite toutes les quelques secondes au plus, quand le ciel change).
  const cq = Math.round(cover * 200) / 200;
  if (!CL.cv || Math.abs(cq - CL.cover) > 0.004 || CL.rgb !== rgb.join(",")) buildTexture(cq, rgb);
  if (!CL.cv) return null;
  // Arrivée en fondu (champ tout juste prêt, interrupteur rallumé) : jamais un ciel qui change d'un coup (§4).
  CL.ready = Math.min(1, CL.ready + dt / 2.5);
  CL.frame = { a: a * CL.ready, ox: CL.ox, oy: CL.oy };
  return CL.frame;
}
export const cloudsOn = () => !!CL.frame;
/* 2026-11-21 — L'ÉPAISSEUR DU NUAGE au point monde (wx, wy) (px d'art), 0..1 : 0 sans nuage (ou sans nuages à cette image). Lue par
   les ombres des grues (`oiseauxArt.js`) — sous un nuage, pas de soleil direct, pas d'ombre. La cellule la plus proche, sans lissage. */
export function cloudAt(wx, wy) {
  if (!CL.frame || !CL.cum) return 0;
  const lut = NU.alphaLut(CL.cum, CL.cover);
  const i = ((Math.floor((wx - CL.frame.ox) / CELL) % N) + N) % N, j = ((Math.floor((wy - CL.frame.oy) / CELL) % N) + N) % N;
  return lut[CL.field[j * N + i]] / 255;
}

/* Les copies de la texture qui couvrent le rectangle monde [wx0, wx0 + ww] × [wy0, wy0 + wh], dans le repère COURANT de `g`
   (qui doit déjà mener du monde à ses pixels). */
function tile(g, wx0, wy0, ww, wh) {
  const fr = CL.frame, k0 = Math.floor((wx0 - fr.ox) / P), k1 = Math.floor((wx0 + ww - fr.ox) / P);
  const j0 = Math.floor((wy0 - fr.oy) / P), j1 = Math.floor((wy0 + wh - fr.oy) / P);
  for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) g.drawImage(CL.cv, 1, 1, N, N, fr.ox + k * P, fr.oy + j * P, P, P);
}
/* DANS le tampon des ombres du soleil (`g`, son coin au monde (ox, oy), `bw` × `bh` px d'art) : là où passe un nuage, l'ombre
   portée s'efface, en proportion de l'épaisseur du nuage. */
export function eraseSunShadow(g, ox, oy, bw, bh) {
  if (!CL.frame) return;
  g.save();
  g.setTransform(1, 0, 0, 1, -ox, -oy);
  g.globalCompositeOperation = "destination-out";
  g.globalAlpha = 1;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "low";
  tile(g, ox, oy, bw, bh);
  g.restore();
}
/* L'ombre des nuages sur tout ce qui est dehors : `ctx` porte la transformation de la caméra (le monde) ; le rectangle monde vu. */
export function paintClouds(ctx, wx0, wy0, ww, wh) {
  if (!CL.frame) return;
  ctx.save();
  ctx.globalAlpha = CL.frame.a;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low";
  tile(ctx, wx0, wy0, ww, wh);
  ctx.restore();
}
/* Pour les bancs et la console : l'état du ciel. */
export const cloudsDebug = () => ({ rows: CL.rows, cover: CL.cover, ready: CL.ready, frame: CL.frame, ox: CL.ox, oy: CL.oy });
if (typeof window !== "undefined") window.__arcardiClouds = cloudsDebug;   // la console et le harnais (comme `__arcardiGround`)
