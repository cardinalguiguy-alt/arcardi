/* =============================================================================
   lib-planche.mjs — LA PLANCHE DE RÉFÉRENCE, RAMENÉE À LA RÉSOLUTION DU JEU.
   -----------------------------------------------------------------------------
   ⚠️⚠️ LE FAIT QUI COMMANDE TOUT LE RESTE : LA PLANCHE EST DÉJÀ À L'ÉCHELLE DU
   JEU. Mesuré, pas supposé — les neuf buissons de haie de la seconde planche se
   répètent avec un pas de 52,00 px image (autocorrélation du profil vert sur
   leur bande), et 52 = 16 × 3,25. Le pas natif est donc la CASE du jeu, et le
   facteur d'agrandissement 3,25 exactement. Vérifié sur trois autres objets :
   le personnage fait 51×93 px image, soit 15,7×28,6 natifs ; le saule 145×173,
   soit 44,6×53,2 — le gabarit d'arbre du 438 fait 48×64 avec un dessin de 44×52.
   L'origine de la grille est (2 ; 1,5), obtenue en minimisant la variance
   INTRA-bloc : elle est la même sur les deux planches.

   ⚠️ ET L'ÉCHELLE 4 A ÉTÉ ESSAYÉE PUIS ÉCARTÉE SUR PIÈCE. 52 = 13 × 4 marche
   aussi en arithmétique ; rééchantillonné à 4, le banc perd ses lattes et ses
   pieds deviennent flous, rééchantillonné à 3,25 il ressort au pixel franc.
   Deux hypothèses, une image chacune, on garde celle qui est nette — c'est la
   méthode du §8 (« on ne juge pas au ressenti »), appliquée à un choix de
   rééchantillonnage.

   ⚠️⚠️ ON ÉCHANTILLONNE AU CENTRE, PAR MÉDIANE 3×3, ET JAMAIS EN MOYENNE.
   La planche est une image GÉNÉRÉE : 115 000 teintes distinctes, un fond gris
   qui oscille entre 119 et 122, du bruit sur chaque aplat. Une moyenne de bloc
   fabrique des teintes intermédiaires qui n'existent nulle part dans le dessin
   — c'est-à-dire qu'elle RAJOUTE de l'anticrénelage à l'endroit même où on veut
   en retirer. La médiane, elle, rend toujours une couleur PRÉSENTE dans
   l'image.

   ⚠️ LE FOND SE DÉTOURE PAR REMPLISSAGE DEPUIS LE BORD, jamais par un test
   « ce pixel est-il gris ? ». La moitié des objets de la planche SONT gris (le
   muret, les bancs de pierre, le dallage, les galets) : un test de couleur les
   effacerait par le milieu. Ce qui distingue le fond n'est pas sa teinte, c'est
   qu'il est CONNEXE AU BORD.
   ========================================================================== */

import { readPNG } from "./lib-png.mjs";

export const STEP = 3.25, OX = 2, OY = 1.5;

/* ⚠️⚠️ ZIP 447 — LE PAS EST DEVENU UN PARAMÈTRE, ET LA PLANCHE 2 EST LA RAISON.
   Les valeurs ci-dessus restent les DÉFAUTS, donc `import-planche.mjs` ne voit
   strictement aucun changement ; mais la seconde planche de Guillaume n'a pas
   le même pas, et surtout elle n'a pas de pas MESURABLE : ses plages internes
   font 1 et 2 px, c'est un dessin fin avec anticrénelage, pas un pixel art
   agrandi d'un facteur propre. Les deux mesures tentées (peigne de gradient,
   histogramme de plages) rendaient du HASARD — et le contrôle le prouve :
   lancées sur la planche 1, dont on sait que le pas vaut 3,25, elles répondent
   3,0 avec une erreur de 0,27 pour un maximum de 0,5.

   ⚠️ SON ÉCHELLE SE DÉRIVE DONC DU GABARIT, JAMAIS DE L'IMAGE — c'est la règle
   du §9 (`Models.fit`) appliquée à un import. Cinq objets de la planche 2 ont
   un homologue dont la taille est déjà fixée par le jeu, et les cinq tombent
   d'accord à moins de 3 % : le banc (138 px pour les 36 natifs de `benchWood`),
   le petit arbre (174×209 pour le gabarit 44×52 du 438), le lampadaire (195 px
   pour un canevas de 48), la haie (62 px pour UNE case de 16) et la maison
   (~349 px pour les 96 d'une maison de ville). Moyenne : 3,875 px image par
   pixel natif, soit **une case = 62 px image**. Une mesure sur cinq objets
   indépendants, pas un réglage. */

/* La planche ramenée au pixel natif, en RGBA opaque.
   ⚠️ `opt` par défaut = la planche 1 au pixel près : aucun appelant existant ne
   change de comportement. */
export function nativeSheet(file, opt = {}) {
  const step = opt.step ?? STEP, ox = opt.ox ?? OX, oy = opt.oy ?? OY;
  const img = readPNG(file);
  const gw = Math.floor((img.W - ox) / step), gh = Math.floor((img.H - oy) / step);
  const px = new Uint8ClampedArray(gw * gh * 4);
  const med = (a) => { a.sort((u, v) => u - v); return a[a.length >> 1]; };
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const cx = ox + (i + 0.5) * step, cy = oy + (j + 0.5) * step;
    const R = [], G = [], B = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
      if (x < 0 || y < 0 || x >= img.W || y >= img.H) continue;
      const o = (y * img.W + x) * 4;
      R.push(img.px[o]); G.push(img.px[o + 1]); B.push(img.px[o + 2]);
    }
    const o = (j * gw + i) * 4;
    px[o] = med(R); px[o + 1] = med(G); px[o + 2] = med(B); px[o + 3] = 255;
  }
  return { w: gw, h: gh, px };
}

/* Le masque du FOND : remplissage à quatre voisins depuis les quatre bords, sur
   les pixels « neutres et clairs » (r≈g≈b, valeur proche de 120).
   ⚠️ LA TOLÉRANCE EST SERRÉE (12) ET C'EST VOULU : les ombres portées sous les
   arbres, elles aussi grises, valent ~104 et doivent RESTER. Ce sont elles qui
   « posent » l'objet au sol — les retirer reviendrait à jeter ce que le 439 a
   passé une passe entière à remettre sur les arbres du jeu. */
/* ⚠️⚠️ ZIP 447 — `opt.ref` ET `opt.enclosed`, POUR LA PLANCHE 2, ET IL FAUT DIRE
   POURQUOI ON DÉROGE À LA RÈGLE DE L'EN-TÊTE. « Le fond n'est pas une teinte,
   c'est ce qui est CONNEXE AU BORD » a été écrit contre la planche 1, dont le
   fond est GRIS et dont la moitié des objets sont gris eux aussi (le muret, les
   bancs de pierre, les galets) : là-bas, un test de couleur mange les objets
   par le milieu, et seule la connexité s'en sort.
   La planche 2 est l'exacte situation inverse, et deux mesures le montrent :
   son fond est un blanc PUR (253-255, écart RVB ≤ 2) quand le pixel le plus
   clair de tout son dessin plafonne à 178 — il n'y a aucune ambiguïté à lever ;
   et ses jours ENTRE LES BALUSTRES sont des trous fermés, que le remplissage
   depuis le bord n'atteint jamais. Y appliquer la connexité seule ne serait pas
   prudent, ce serait FAUX : on livrerait une balustrade pleine, c'est-à-dire un
   muret. *La bonne règle dépend de ce qui est ambigu dans l'image qu'on a, pas
   de ce qui l'était dans l'image d'avant.* */
export function backgroundMask(sh, tol = 12, opt = {}) {
  const { w, h, px } = sh;
  const ref = opt.ref ?? 120, enclosed = !!opt.enclosed;
  const bg = new Uint8Array(w * h);
  const isNeutral = (i) => {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    return Math.abs(r - g) <= 6 && Math.abs(g - b) <= 6 && Math.abs(r - b) <= 6
        && Math.abs(r - ref) <= tol;
  };
  if (enclosed) { for (let i = 0; i < w * h; i++) if (isNeutral(i)) bg[i] = 1; return bg; }
  const st = [];
  for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
  while (st.length) {
    const i = st.pop();
    if (bg[i] || !isNeutral(i)) continue;
    bg[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) st.push(i - 1);
    if (x < w - 1) st.push(i + 1);
    if (y > 0) st.push(i - w);
    if (y < h - 1) st.push(i + w);
  }
  return bg;
}

/* Découpe une région et rend un sprite RGBA à fond transparent, RECADRÉ sur son
   contenu. ⚠️ LE RECADRAGE EST FAIT ICI ET PAS À LA MAIN : une boîte relevée à
   l'œil laisse une colonne vide d'un côté, et le décor se retrouve décalé d'un
   pixel une fois ancré par son centre — c'est la famille de défauts du 432
   (« une position réglée à la main est une position qui penchera »). */
export function cut(sh, bg, x0, y0, w, h, pad = 1) {
  let mnx = 1e9, mny = 1e9, mxx = -1, mxy = -1;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (x < 0 || y < 0 || x >= sh.w || y >= sh.h) continue;
    if (bg[y * sh.w + x]) continue;
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
  }
  if (mxx < 0) return null;
  const cw = mxx - mnx + 1 + pad * 2, ch = mxy - mny + 1 + pad * 2;
  const px = new Uint8ClampedArray(cw * ch * 4);
  for (let y = mny; y <= mxy; y++) for (let x = mnx; x <= mxx; x++) {
    if (bg[y * sh.w + x]) continue;
    const s = (y * sh.w + x) * 4, d = ((y - mny + pad) * cw + (x - mnx + pad)) * 4;
    px[d] = sh.px[s]; px[d + 1] = sh.px[s + 1]; px[d + 2] = sh.px[s + 2]; px[d + 3] = 255;
  }
  return { w: cw, h: ch, px, src: { x: mnx, y: mny, w: mxx - mnx + 1, h: mxy - mny + 1 } };
}

/* Une tranche EXACTE, sans recadrage. ⚠️ ELLE EXISTE POUR LES TUILES, ET LA
   DIFFÉRENCE AVEC `cut` EST TOUT LE SUJET : un décor se recadre sur son contenu
   (sinon il penche, cf. `cut`), une TUILE ne se recadre jamais — sa largeur EST
   la case, et deux tuiles voisines doivent se raccorder au pixel. Recadrée, une
   tuile de haie perdrait ses colonnes vides de bord et la haie se retrouverait
   avec un liseré de fond entre chaque case. */
export function slice(sh, bg, x0, y0, w, h) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x0 + x, sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= sh.w || sy >= sh.h) continue;
    if (bg[sy * sh.w + sx]) continue;
    const s2 = (sy * sh.w + sx) * 4, d = (y * w + x) * 4;
    px[d] = sh.px[s2]; px[d + 1] = sh.px[s2 + 1]; px[d + 2] = sh.px[s2 + 2]; px[d + 3] = 255;
  }
  return { w, h, px };
}

/* La quantification. ⚠️ ELLE N'EST PAS COSMÉTIQUE : sortie du rééchantillonnage,
   une corolle de magnolia compte encore quarante roses différents, dont trente
   ne servent qu'une fois. Les garder gonflerait la table de données ET rendrait
   le dessin flou à l'œil — un aplat de pixel art tient sa netteté du petit
   nombre de ses valeurs (§8 : « trois valeurs au minimum par masse », et pas
   trente).
   ⚠️ K-MOYENNES EN LUMINANCE PONDÉRÉE, PAS EN RGB BRUT : l'œil range les
   couleurs par valeur avant de les ranger par teinte, et deux verts de même
   luminance doivent fusionner avant qu'un vert clair et un vert sombre le
   fassent. Sans cette pondération, les k-moyennes coupent le feuillage en
   bandes de teinte et gardent deux fois la même valeur.
   ⚠️ ET LES CENTRES SONT SEMÉS SUR LES COULEURS LES PLUS FRÉQUENTES, jamais au
   hasard : le résultat doit être identique à chaque exécution, sinon la table
   de données change à chaque import et on ne peut plus relire un diff. */
export function quantize(spr, K) {
  const hist = new Map();
  for (let i = 0; i < spr.w * spr.h; i++) {
    if (!spr.px[i * 4 + 3]) continue;
    const k = (spr.px[i * 4] << 16) | (spr.px[i * 4 + 1] << 8) | spr.px[i * 4 + 2];
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  const uniq = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  if (uniq.length <= K) K = uniq.length;
  const WL = [0.30, 0.59, 0.11];
  const dist = (a, b) => {
    let d = 0;
    for (let c = 0; c < 3; c++) { const t = a[c] - b[c]; d += t * t * (0.35 + WL[c] * 2.2); }
    return d;
  };
  const unpack = (k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255];
  // Semis : les K couleurs les plus fréquentes ET les plus éloignées entre elles.
  const cent = [unpack(uniq[0][0])];
  while (cent.length < K) {
    let best = null, bestScore = -1;
    for (const [k, n] of uniq) {
      const c = unpack(k);
      let dmin = 1e18;
      for (const q of cent) dmin = Math.min(dmin, dist(c, q));
      const sc = dmin * Math.log(1 + n);
      if (sc > bestScore) { bestScore = sc; best = c; }
    }
    if (!best) break;
    cent.push(best);
  }
  for (let it = 0; it < 24; it++) {
    const sum = cent.map(() => [0, 0, 0, 0]);
    for (const [k, n] of uniq) {
      const c = unpack(k);
      let bi = 0, bd = 1e18;
      for (let i = 0; i < cent.length; i++) { const d = dist(c, cent[i]); if (d < bd) { bd = d; bi = i; } }
      sum[bi][0] += c[0] * n; sum[bi][1] += c[1] * n; sum[bi][2] += c[2] * n; sum[bi][3] += n;
    }
    let moved = 0;
    for (let i = 0; i < cent.length; i++) {
      if (!sum[i][3]) continue;
      const nc = [Math.round(sum[i][0] / sum[i][3]), Math.round(sum[i][1] / sum[i][3]), Math.round(sum[i][2] / sum[i][3])];
      if (nc[0] !== cent[i][0] || nc[1] !== cent[i][1] || nc[2] !== cent[i][2]) moved++;
      cent[i] = nc;
    }
    if (!moved) break;
  }
  // Palette triée par luminance : un diff lisible, et un ordre stable.
  cent.sort((a, b) => (a[0] * 0.3 + a[1] * 0.59 + a[2] * 0.11) - (b[0] * 0.3 + b[1] * 0.59 + b[2] * 0.11));
  const idx = new Uint8Array(spr.w * spr.h);
  for (let i = 0; i < spr.w * spr.h; i++) {
    if (!spr.px[i * 4 + 3]) { idx[i] = 255; continue; }
    const c = [spr.px[i * 4], spr.px[i * 4 + 1], spr.px[i * 4 + 2]];
    let bi = 0, bd = 1e18;
    for (let q = 0; q < cent.length; q++) { const d = dist(c, cent[q]); if (d < bd) { bd = d; bi = q; } }
    idx[i] = bi;
  }
  const hex = (c) => "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  return { w: spr.w, h: spr.h, pal: cent.map(hex), idx, colors: uniq.length };
}

/* Rend un sprite quantifié en RGBA, pour les planches de contrôle. */
export function toRGBA(q) {
  const px = new Uint8ClampedArray(q.w * q.h * 4);
  const rgb = q.pal.map(s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]);
  for (let i = 0; i < q.w * q.h; i++) {
    if (q.idx[i] === 255) continue;
    const c = rgb[q.idx[i]];
    px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = 255;
  }
  return { w: q.w, h: q.h, px };
}
