/* =============================================================================
   lib-png.mjs — LIRE UN PNG, ET RETROUVER SA GRILLE NATIVE. (439)
   -----------------------------------------------------------------------------
   ⚠️ IL EXISTE PARCE QUE LA DEMANDE A CHANGÉ DE NATURE. Jusqu'au 438, tous les
   sprites du jeu étaient des canevas procéduraux (`fermeArt.js`), et les
   références de Guillaume ne faisaient autorité que sur l'INTENTION — c'est
   écrit tel quel dans `CLAUDE.md` §12. Au 439 il demande l'inverse, en toutes
   lettres : « je veux simplement que tu copies et colles les sprites ». Un
   dessin transcrit à la main en `fillRect` n'est pas une copie, c'est une
   imitation — et c'est ce qu'il a refusé deux fois.

   ⚠️⚠️ MAIS LA PLANCHE N'EST PAS UNE FEUILLE DE SPRITES, ET C'EST TOUT LE
   PROBLÈME À RÉSOUDRE. C'est une image GÉNÉRÉE de 1207×880 :
     * ses « pixels » font environ 4,7 pixels d'écran, et ce nombre n'est PAS
       entier — la grille dérive donc d'un bout à l'autre de l'image ;
     * les bords sont anticrénelés, donc chaque bloc a un liseré de teintes
       intermédiaires qui n'appartiennent à aucune palette ;
     * le fond est un gris opaque, pas de la transparence ;
     * elle contient plus de deux cents teintes là où un sprite du jeu en compte
       cinq.
   « Copier-coller » veut donc dire : RETROUVER la grille, échantillonner au
   centre de chaque bloc (jamais moyenner — une moyenne sur un bord produit une
   couleur qui n'existe nulle part dans le dessin), puis quantifier.

   ⚠️ LE PAS DE LA GRILLE SE MESURE, IL NE SE DEVINE PAS. On prend la longueur
   des plages horizontales de couleur constante sur toute l'image : sur un pixel
   art agrandi, elles sont toutes des MULTIPLES du pas. Le pgcd approché de leur
   distribution est le pas cherché. C'est la même famille de raisonnement que
   `render-eau.mjs` (« mesurer une grandeur plutôt que juger à l'œil »), et ça
   évite le piège classique — poser 4, ou 5, parce que 1207/256 « fait à peu
   près ça ».
   ========================================================================== */

import zlib from "zlib";
import fs from "fs";

/* Décodeur PNG minimal : 8 bits par canal, non entrelacé, couleur 2 (RGB) ou
   6 (RGBA). ⚠️ IL JETTE SUR TOUT LE RESTE, exprès — même contrat que le faux
   canevas de `lib-canvas.mjs` : un format non géré doit s'arrêter, pas rendre
   une image plausible et fausse (le stub menteur du §10). */
export function readPNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("pas un PNG : " + file);
  let p = 8, W = 0, H = 0, bits = 0, ctype = 0;
  const idat = [];
  let plte = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8);
    const body = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      W = body.readUInt32BE(0); H = body.readUInt32BE(4);
      bits = body[8]; ctype = body[9];
      if (bits !== 8) throw new Error("PNG non 8 bits (" + bits + ")");
      if (body[12] !== 0) throw new Error("PNG entrelacé");
    } else if (type === "PLTE") plte = Buffer.from(body);
    else if (type === "tRNS") trns = Buffer.from(body);
    else if (type === "IDAT") idat.push(Buffer.from(body));
    else if (type === "IEND") break;
    p += 12 + len;
  }
  const CH = ctype === 2 ? 3 : ctype === 6 ? 4 : ctype === 3 ? 1 : ctype === 0 ? 1 : -1;
  if (CH < 0) throw new Error("type de couleur PNG non géré : " + ctype);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = W * CH;
  const out = new Uint8Array(W * H * CH);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= CH ? cur[i - CH] : 0, b = prev[i], c = i >= CH ? prev[i - CH] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 255;
    }
    out.set(cur, y * stride);
    prev = cur;
  }
  // On rend toujours du RGBA, quel que soit le format d'entrée.
  const px = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    if (ctype === 2) { px[i * 4] = out[i * 3]; px[i * 4 + 1] = out[i * 3 + 1]; px[i * 4 + 2] = out[i * 3 + 2]; px[i * 4 + 3] = 255; }
    else if (ctype === 6) { for (let k = 0; k < 4; k++) px[i * 4 + k] = out[i * 4 + k]; }
    else if (ctype === 0) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = out[i]; px[i * 4 + 3] = 255; }
    else { const c = out[i]; px[i * 4] = plte[c * 3]; px[i * 4 + 1] = plte[c * 3 + 1]; px[i * 4 + 2] = plte[c * 3 + 2]; px[i * 4 + 3] = trns && c < trns.length ? trns[c] : 255; }
  }
  return { W, H, px };
}

/* Le pas de la grille, mesuré. On collecte les longueurs de plage horizontale
   (couleur strictement constante) et on cherche le réel `s` qui minimise
   l'écart de toutes ces longueurs à un multiple de `s`.
   ⚠️ ON IGNORE LES PLAGES DE PLUS DE 40 : ce sont des aplats de fond, elles
   n'apportent aucune information sur le pas et écrasent le vote. */
export function gridStep(img, lo = 3.0, hi = 8.0) {
  const runs = [];
  for (let y = 0; y < img.H; y += 2) {
    let x = 0;
    while (x < img.W) {
      const o = (y * img.W + x) * 4;
      let n = 1;
      while (x + n < img.W) {
        const q = (y * img.W + x + n) * 4;
        if (img.px[q] !== img.px[o] || img.px[q + 1] !== img.px[o + 1] || img.px[q + 2] !== img.px[o + 2]) break;
        n++;
      }
      if (n >= 2 && n <= 40) runs.push(n);
      x += n;
    }
  }
  let best = lo, bestErr = 1e18;
  for (let s = lo; s <= hi; s += 0.002) {
    let err = 0;
    for (const n of runs) {
      const k = n / s, d = Math.abs(k - Math.round(k));
      err += Math.min(d, 0.5);
    }
    if (err < bestErr) { bestErr = err; best = s; }
  }
  return { step: best, samples: runs.length, err: +(bestErr / Math.max(1, runs.length)).toFixed(4) };
}

/* L'origine de la grille : le décalage (0..step) qui aligne le mieux les
   FRONTIÈRES de plage sur les multiples du pas. Mesurée séparément en x et en
   y — rien ne dit qu'une image générée soit calée sur son coin. */
export function gridOrigin(img, step) {
  const edges = { x: [], y: [] };
  for (let y = 0; y < img.H; y += 2) for (let x = 1; x < img.W; x++) {
    const a = (y * img.W + x - 1) * 4, b = (y * img.W + x) * 4;
    if (img.px[a] !== img.px[b] || img.px[a + 1] !== img.px[b + 1] || img.px[a + 2] !== img.px[b + 2]) edges.x.push(x);
  }
  for (let x = 0; x < img.W; x += 2) for (let y = 1; y < img.H; y++) {
    const a = ((y - 1) * img.W + x) * 4, b = (y * img.W + x) * 4;
    if (img.px[a] !== img.px[b] || img.px[a + 1] !== img.px[b + 1] || img.px[a + 2] !== img.px[b + 2]) edges.y.push(y);
  }
  const pick = (list) => {
    let best = 0, bestErr = 1e18;
    for (let o = 0; o < step; o += 0.01) {
      let err = 0;
      for (const e of list) { const k = (e - o) / step, d = Math.abs(k - Math.round(k)); err += Math.min(d, 0.5); }
      if (err < bestErr) { bestErr = err; best = o; }
    }
    return +best.toFixed(3);
  };
  return { ox: pick(edges.x), oy: pick(edges.y) };
}

/* L'échantillonnage : une couleur par case de la grille, prise AU CENTRE.
   ⚠️⚠️ AU CENTRE, ET JAMAIS EN MOYENNE. Une moyenne sur une case qui chevauche
   deux blocs rend une teinte intermédiaire qui n'existe nulle part dans le
   dessin d'origine : on fabriquerait de l'anticrénelage au lieu d'en retirer.
   C'est le même piège que la moyenne de luminosité du §8 — la statistique juste
   n'est pas celle qui est facile à calculer.
   ⚠️ ON PREND LA MÉDIANE D'UN CARRÉ DE 3×3 AU CENTRE : le centre exact peut
   tomber sur un pixel de bruit de génération, et une médiane sur neuf voisins
   le rejette sans jamais inventer de couleur (elle rend toujours une valeur
   PRÉSENTE dans l'image). */
export function sampleGrid(img, step, ox, oy, gx0, gy0, gw, gh) {
  const out = new Uint8ClampedArray(gw * gh * 4);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const cx = ox + (gx0 + i + 0.5) * step, cy = oy + (gy0 + j + 0.5) * step;
    const r = [], g = [], b = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
      if (x < 0 || y < 0 || x >= img.W || y >= img.H) continue;
      const o = (y * img.W + x) * 4;
      r.push(img.px[o]); g.push(img.px[o + 1]); b.push(img.px[o + 2]);
    }
    if (!r.length) continue;
    const med = (a) => { a.sort((u, v) => u - v); return a[a.length >> 1]; };
    const o = (j * gw + i) * 4;
    out[o] = med(r); out[o + 1] = med(g); out[o + 2] = med(b); out[o + 3] = 255;
  }
  return out;
}
