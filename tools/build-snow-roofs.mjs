// Pipeline C (§9 CLAUDE.md) — LA NEIGE DES TOITS PEINTS (phase 12a, 2026-09-28).
//
// Décision de Guillaume : « toits en calque hors ligne » (comme la façade
// éclairée, `build-monument-flood.mjs`). Pour chaque maison et chaque commerce
// peints, et pour chaque cran de zoom, DEUX calques posés par-dessus l'image de
// jour, que le jeu mêle selon l'épaisseur sur les toits (`neige.js`, `rh`) :
//   · `-snowl-z<N>.png` — une neige LÉGÈRE : elle tient sur le haut de chaque
//     rang de tuiles ou d'ardoises (la partie éclairée de la peinture), les
//     creux restent sombres ; des plaques, pas un drap ;
//   · `-snowh-z<N>.png` — une neige ÉPAISSE : tout le pan est blanc, un
//     bourrelet déborde du bord de l'égout (dessous bleu) avec ses stalactites,
//     un coussin bombe au faîte, les souches de cheminée ont leur chapeau.
//
// LE TOIT EST LU DANS LA PEINTURE, pas dessiné : au-dessus de l'égout du
// modèle (`EAVE`, fraction de la hauteur, relevée rangée par rangée sur la
// peinture — l'ardoise, la tuile rouge ou brune, le chaume ne se confondent pas
// avec la façade qui est dessous), les pixels de la MATIÈRE du toit, fermés
// (les joints, la mousse) et débarrassés des îlots. ⚠️ La neige garde le
// MODELÉ de la peinture : sa valeur suit la valeur du toit (le pan à l'ombre
// est bleu, le pan au soleil blanc, les rangs se devinent sous la neige
// légère) — un aplat blanc découpé serait un autocollant.
//
// Écrit À PARTIR DES IMAGES DE JOUR VERSIONNÉES (une retouche à la main du jour
// serait perdue si l'on repartait de la référence — même règle que la façade).
//
// Usage : node tools/build-snow-roofs.mjs   (planche : tools/out/toits-neige.png)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { fermeConstants: C, neige: NG } = await loadFerme(ROOT, ["fermeConstants", "neige"]);
const RAMP = NG.RAMP_SUN;

/* La matière du toit et la hauteur de son égout (fraction de l'image), par
   modèle — relevées sur la peinture (part de la matière, rangée par rangée). */
/* `out` : des polygones (fractions) où la peinture n'est PAS un toit malgré sa
   couleur (le pignon à colombages bleu nuit de S4, la vitrine de la boutique) ;
   `add` : des rectangles hors de la zone du toit qui en sont un (l'auvent de la
   porte de S4). `vmat` : la matière d'une version qui diffère de son modèle (la
   riche de N2 a des ardoises mauves). */
const ROOF = {
  // N1 : le pignon à colombages (sa fenêtre, à petit cran, a la valeur de l'ardoise) — ses rampants gardent leur neige.
  n1: { mat: "slate", eave: 0.352, out: [[[0.27, 0.06], [0.07, 0.345], [0.47, 0.345]]] }, n2: { mat: "brown", eave: 0.378, vmat: { riche: "slate" } }, s1: { mat: "slate", eave: 0.378 },
  s2: { mat: "thatch", eave: 0.515 }, s3: { mat: "red", eave: 0.338 },
  s4: { mat: "slate", eave: 0.378, out: [[[0.735, -0.02], [0.49, 0.372], [0.61, 0.372], [0.61, 0.3], [0.86, 0.3], [0.86, 0.372], [0.985, 0.372]]],
        add: [[0.235, 0.605, 0.475, 0.695], [0.605, 0.3, 0.865, 0.385]] },
  garfield: { mat: "slate", eave: 0.385, out: [[[0.15, 0.135], [0.85, 0.135], [0.85, 1], [0.15, 1]]] },
  salon: { mat: "slate", eave: 0.295 },
  /* LES MONUMENTS (froids : leur neige tient plus longtemps — `rc`). Pas de
     grand pan d'ardoise sur l'église ni sur le tribunal : c'est la pierre qui
     retient la neige, sur chaque CORNICHE (`ledges`), chaque pinacle, chaque
     rampant ; `caps` : les dômes, dont toute la moitié haute blanchit. */
  // L'église : ses assises de pierre ont des joints profonds — seules les longues corniches franches comptent.
  church: { mat: "none", eave: 0, ledges: true, ledgeRun: 10, ledgeDrop: 34 },
  townhall: { mat: "slate", eave: 0.47, ledges: true, caps: [[0.43, 0.02, 0.57, 0.165]] },
  courthouse: { mat: "none", eave: 0, ledges: true, caps: [[0.40, 0.075, 0.60, 0.165], [0.47, 0.0, 0.53, 0.075]] },
};
function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d + 6) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; }
  return [h, mx ? d / mx : 0, mx / 255];
}
const MATCH = {
  /* L'ardoise : bleu gris (pas le bleu nuit saturé d'un colombage), gris neutre
     ou gris mauve. */
  slate: (h, s, v) => v >= 0.16 && v <= 0.74 && ((h >= 180 && h <= 262 && s >= 0.06 && s <= 0.44) || s < 0.09 || (h >= 262 && h <= 345 && s < 0.34)),
  red: (h, s, v) => (h <= 22 || h >= 340) && s >= 0.35 && v >= 0.25 && v <= 0.9,
  brown: (h, s, v) => h >= 8 && h <= 38 && s >= 0.25 && s <= 0.75 && v >= 0.2 && v <= 0.75,
  thatch: (h, s, v) => h >= 22 && h <= 55 && s >= 0.25 && s <= 0.8 && v >= 0.25 && v <= 0.85,
  none: () => false,
};
const hash = (x, y, s) => { let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x165667b1, 0x85ebca77) ^ Math.imul(s | 0, 0xc2b2ae3d); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };
const lumOf = (d, o) => d[o] * 0.299 + d[o + 1] * 0.587 + d[o + 2] * 0.114;

function inPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
}
function roofMask(day, spec, mat, z) {
  const W = day.width, H = day.height, d = day.data, N = W * H;
  const op = (i) => d[i * 4 + 3] > 128;
  const s = z / 3, r = Math.max(1, Math.round(1.2 * s));
  const zoneOf = (x, y) => {
    const fx = (x + 0.5) / W, fy = (y + 0.5) / H;
    if ((spec.add || []).some(([a, b, c, e]) => fx >= a && fx <= c && fy >= b && fy <= e)) return true;
    if (fy >= spec.eave) return false;
    return !(spec.out || []).some((P) => inPoly(P, fx, fy));
  };
  const zone = new Uint8Array(N);
  let eaveY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (zoneOf(x, y)) { zone[y * W + x] = 1; if (y + 1 > eaveY) eaveY = y + 1; }
  /* Ce que la fermeture ne doit JAMAIS combler : le crème et le blanc (un
     colombage, un encadrement), le bois jaune d'une lucarne. */
  const keepOut = new Uint8Array(N), moss = new Uint8Array(N);
  let m = new Uint8Array(N);
  for (let y = 0; y < eaveY; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!zone[i] || !op(i)) continue;
    const [h, sa, v] = hsv(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
    if (MATCH[mat](h, sa, v)) m[i] = 1;
    else if ((h >= 58 && h <= 160 && sa > 0.18 && v > 0.12 && v < 0.75) || (mat === "slate" && (h <= 32 || h >= 345) && sa > 0.3 && v < 0.7)) moss[i] = 1;   // mousse, rouille
    else if ((sa < 0.3 && v > 0.62) || (h >= 38 && h <= 70 && sa > 0.3 && v > 0.45)) keepOut[i] = 1;
  }
  // Fermeture (dilatation puis érosion, rayon r) : les joints, la mousse, les rangs sombres.
  const morph = (src, dil) => {
    const out = new Uint8Array(N);
    for (let y = 0; y < eaveY; y++) for (let x = 0; x < W; x++) {
      let v = dil ? 0 : 1;
      for (let dy = -r; dy <= r && (dil ? !v : v); dy++) for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy;
        const inside = xx >= 0 && yy >= 0 && xx < W && yy < eaveY ? src[yy * W + xx] : 0;
        if (dil && inside) { v = 1; break; }
        if (!dil && !inside && yy < eaveY && yy >= 0 && xx >= 0 && xx < W && op(yy * W + xx)) { v = 0; break; }
      }
      out[y * W + x] = v && op(y * W + x) && zone[y * W + x] && (src[y * W + x] || !keepOut[y * W + x]) ? 1 : 0;
    }
    return out;
  };
  /* ⚠️ LES ÎLOTS PARTENT AVANT LA FERMETURE AUSSI : le verre d'une lucarne (un
     gris bleu d'ardoise) est isolé du toit par son cadre de bois ; fermé
     d'abord, il se soudait au pan et la lucarne blanchissait toute. */
  const dropSmall = (mm) => {
    const seen = new Uint8Array(N), minA = Math.max(12, Math.round(N * 0.004));
    for (let i = 0; i < N; i++) {
      if (!mm[i] || seen[i]) continue;
      const comp = [i]; seen[i] = 1;
      for (let k = 0; k < comp.length; k++) {
        const j = comp[k], x = j % W, y = (j / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const q = yy * W + xx;
          if (mm[q] && !seen[q]) { seen[q] = 1; comp.push(q); }
        }
      }
      if (comp.length < minA) for (const j of comp) mm[j] = 0;
    }
  };
  dropSmall(m);
  m = morph(morph(m, true), false);
  /* LES TROUS : une tache de mousse ou de rouille (moins de ~5 px au cran 3)
     cernée de toit des quatre côtés se couvre aussi ; une lucarne, plus
     grande, non. */
  /* La MOUSSE (verte) se comble de plus loin : une plaque de lichen sur
     l'ardoise est sous la neige comme le reste — pas le vert d'une lucarne,
     qui n'est pas cerné d'ardoise des quatre côtés à cette distance. */
  const fill = new Uint8Array(m);
  for (let y = 0; y < eaveY; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (m[i] || !op(i) || !zone[i] || keepOut[i]) continue;
    const R = Math.max(2, Math.round((moss[i] ? 12 : 5) * s));
    const hit = (dx, dy) => { for (let k = 1; k <= R; k++) { const xx = x + dx * k, yy = y + dy * k; if (xx < 0 || yy < 0 || xx >= W || yy >= H) return false; if (m[yy * W + xx]) return true; } return false; };
    if (hit(1, 0) && hit(-1, 0) && hit(0, 1) && hit(0, -1)) fill[i] = 1;
  }
  m = fill;
  // Les îlots (un reflet de la façade qui ressemble à de l'ardoise) partent.
  const seen = new Uint8Array(N), minA = Math.max(12, Math.round(N * 0.004));
  for (let i = 0; i < N; i++) {
    if (!m[i] || seen[i]) continue;
    const comp = [i]; seen[i] = 1;
    for (let k = 0; k < comp.length; k++) {
      const j = comp[k], x = j % W, y = (j / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const q = yy * W + xx;
        if (m[q] && !seen[q]) { seen[q] = 1; comp.push(q); }
      }
    }
    if (comp.length < minA) for (const j of comp) m[j] = 0;
  }
  return { m, eaveY, s };
}

function snowLayers(day, spec, mat, z) {
  const W = day.width, H = day.height, d = day.data, N = W * H;
  const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 128;
  const { m, eaveY, s } = roofMask(day, spec, mat, z);
  const L = new PNG({ width: W, height: H }), Hv = new PNG({ width: W, height: H });
  const put = (P, x, y, idx, a = 255) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4, c = RAMP[Math.max(0, Math.min(10, Math.round(idx)))];
    P.data[o] = c[0]; P.data[o + 1] = c[1]; P.data[o + 2] = c[2]; P.data[o + 3] = a;
  };
  // La valeur du toit : ses bornes (5 % / 95 %), pour que la neige suive son modelé.
  const ls = [];
  for (let i = 0; i < N; i++) if (m[i]) ls.push(lumOf(d, i * 4));
  ls.sort((a, b) => a - b);
  const lo = ls.length ? ls[Math.floor(ls.length * 0.05)] : 0, hi = ls.length ? ls[Math.floor(ls.length * 0.95)] : 255;
  const rel = (i) => Math.max(0, Math.min(1, (lumOf(d, i * 4) - lo) / Math.max(1, hi - lo)));
  const lip = Math.max(1, Math.round(1.4 * s)), cap = Math.max(1, Math.round(1.8 * s));
  const inM = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!m[i]) continue;
    const t = rel(i), top = !inM(x, y - 1), b = hash(x, y, 7);
    // ÉPAISSE : tout le pan ; la valeur suit le toit (6 → 9), le haut du pan plus clair.
    put(Hv, x, y, 5.6 + t * 3.2 + (top ? 1 : 0) + (b - 0.5) * 0.7);
    // LÉGÈRE : le haut éclairé de chaque rang, par plaques.
    const patch = hash(x >> 2, y >> 2, 9);
    if (t > 0.42 - patch * 0.25 || top) put(L, x, y, 6.5 + t * 2.2 + (b - 0.5) * 0.7, t > 0.55 || top ? 255 : 200);
    // Le coussin qui bombe au faîte et sur le haut des pans (épaisse).
    if (top) for (let k = 1; k <= cap; k++) if (!op(x, y - k)) put(Hv, x, y - k, k === cap ? 9.4 : 8.6);
  }
  /* L'ÉGOUT : sous le dernier pixel de toit de chaque colonne, le bourrelet
     déborde (face éclairée, puis son dessous bleu), et de loin en loin une
     stalactite. */
  for (let x = 0; x < W; x++) {
    let yb = -1;
    for (let y = eaveY - 1; y >= 0; y--) if (m[y * W + x]) { yb = y; break; }
    if (yb < 0) continue;
    for (let k = 1; k <= lip; k++) if (op(x, yb + k)) put(Hv, x, yb + k, k === lip ? 4.6 : 7.4);
    const hh = hash(x, 3, 11);
    if (hh < 0.12) {
      const len = Math.max(1, Math.round((1 + hash(x, 5, 12) * 3) * s));
      for (let k = 1; k <= len; k++) put(Hv, x, yb + lip + k, k === len ? 6 : 8.2, k === len ? 170 : 235);
    }
    if (op(x, yb + 1) && hash(x, 4, 13) < 0.5) put(L, x, yb + 1, 6.2, 200);
  }
  /* LES CHAPEAUX : ce qui dépasse du toit et regarde le ciel (la souche d'une
     cheminée, un épi, le haut d'une lucarne) — tout pixel au-dessus de l'égout
     dont le voisin du dessus est vide. */
  for (let y = 1; y < eaveY; y++) for (let x = 0; x < W; x++) {
    if (m[y * W + x] || !op(x, y) || op(x, y - 1)) continue;
    for (let k = 0; k < cap; k++) put(Hv, x, y - k, k === 0 ? 7.6 : 9.2);
    put(L, x, y, 8.4);
  }
  /* LES DÔMES (`caps`) : la moitié haute de la coupole blanchit toute, à la
     valeur de la peinture (le côté à l'ombre reste bleu). */
  for (const [a, b2, c, e] of spec.caps || []) {
    const x0 = Math.floor(a * W), x1 = Math.ceil(c * W), y0 = Math.floor(b2 * H), y1 = Math.ceil(e * H);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!op(x, y)) continue;
      const t = Math.max(0, Math.min(1, (lumOf(d, (y * W + x) * 4) - 60) / 150));
      put(Hv, x, y, 5.4 + t * 3.8 + (hash(x, y, 17) - 0.5) * 0.6);
      if (hash(x >> 1, y >> 1, 19) < 0.5 + t * 0.4) put(L, x, y, 6.6 + t * 2.2);
    }
  }
  /* LES CORNICHES (`ledges`) : un dessus de pierre éclairé posé sur une ombre
     d'au moins deux pixels (le larmier, le creux sous la moulure), sur une
     longueur — un joint de maçonnerie, d'un pixel, n'en est pas une. La neige
     s'y pose en boudin, un pixel au-dessus du dessus. */
  if (spec.ledges) {
    /* ⚠️ Premier jet (ombre de 2 px, écart de 22) : les joints de la brique de la
       mairie et des assises de l'église passaient pour des corniches — des
       tirets blancs sur tout le mur. Une vraie corniche jette une ombre d'au
       moins trois pixels au cran 3, un joint n'en a jamais autant. */
    const dark = Math.max(2, Math.round(2.5 * s)), run = Math.max(5, Math.round((spec.ledgeRun || 5) * s)), drop = spec.ledgeDrop || 26;
    const lu = (x, y) => (op(x, y) ? lumOf(d, (y * W + x) * 4) : 255);
    const ok = new Uint8Array(N);
    for (let y = 1; y < H - dark - 1; y++) for (let x = 0; x < W; x++) {
      if (!op(x, y)) continue;
      const l0 = lu(x, y);
      let yes = l0 >= lu(x, y - 1) - 12;
      for (let k = 1; k <= dark && yes; k++) if (!op(x, y + k) || lu(x, y + k) > l0 - drop) yes = false;
      if (yes) ok[y * W + x] = 1;
    }
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        if (!ok[y * W + x]) { x++; continue; }
        let x2 = x;
        while (x2 < W && ok[y * W + x2]) x2++;
        if (x2 - x >= run) for (let k = x; k < x2; k++) {
          put(Hv, k, y, 8.6 + (hash(k, y, 23) - 0.5) * 0.8);
          if (op(k, y - 1)) put(Hv, k, y - 1, 9.3);
          put(Hv, k, y + 1, 5.2);
          if (hash(k >> 1, y, 29) < 0.65) put(L, k, y, 8.4);
        }
        x = x2;
      }
    }
  }
  /* LES PLANTES PEINTES, sous l'égout (buissons au pied du mur, jardinières,
     lierre, pots du perron) : une FLEUR (couleur franche au milieu du vert)
     fane — les deux calques la repeignent en tige sèche, puisqu'ils ne sont
     posés que quand il y a de la neige ; le FEUILLAGE reçoit un chapeau là où
     rien de vert n'est au-dessus de lui (le haut d'un buisson, d'une touffe). */
  const isGreen = (x, y) => {
    if (!op(x, y)) return false;
    const o = (y * W + x) * 4, [h, sa] = hsv(d[o], d[o + 1], d[o + 2]);
    return sa > 0.2 && h >= 62 && h <= 175;
  };
  const DRY = [[88, 74, 64], [112, 96, 84], [138, 122, 108]];
  const capH = Math.max(1, Math.round(1.6 * s));
  for (let y = Math.max(1, eaveY); y < H; y++) for (let x = 0; x < W; x++) {
    if (!op(x, y)) continue;
    const o = (y * W + x) * 4, [h, sa, v] = hsv(d[o], d[o + 1], d[o + 2]);
    const green = sa > 0.2 && h >= 62 && h <= 175, brown = h >= 14 && h < 48 && v < 0.62;
    if (!green && !brown && v > 0.3 && (sa > 0.34 || (sa > 0.18 && (h > 275 || h < 12)))) {
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (isGreen(x + dx, y + dy)) { near = true; break; }
      if (!near) continue;
      const c = DRY[Math.min(2, Math.floor(v * 3))];
      for (const P of [L, Hv]) { P.data[o] = c[0]; P.data[o + 1] = c[1]; P.data[o + 2] = c[2]; P.data[o + 3] = 255; }
      continue;
    }
    if (!green || isGreen(x, y - 1) || isGreen(x, y - 2)) continue;
    for (let k = 0; k < capH; k++) put(Hv, x, y - k, k === 0 ? 7.8 : 9.2);
    if (hash(x, y, 41) < 0.55) put(L, x, y, 8.6);
  }
  return { L, Hv, roofPx: ls.length };
}

/* Les entrées de `TOWN_BITMAPS` des maisons et des commerces. */
const out = [];
for (const [key, b] of Object.entries(C.TOWN_BITMAPS)) {
  const mk = b.house ? b.house.model : key.startsWith("shop_") ? key.split("_")[1] : ROOF[key] ? key : null;
  if (!mk || !ROOF[mk] || !b.snowL) continue;
  for (const z of b.zooms) {
    const mip = C.townBitmapMip(b, z);
    const f = path.join(ROOT, "public", mip.day);
    if (!existsSync(f)) { console.log("absent :", mip.day); continue; }
    const day = PNG.sync.read(readFileSync(f));
    const vk = b.house ? b.house.variant : b.shop ? b.shop.variant : key.split("_")[2];
    const spec = ROOF[mk], mat = (spec.vmat && spec.vmat[vk]) || spec.mat;
    const { L, Hv, roofPx } = snowLayers(day, spec, mat, z);
    writeFileSync(path.join(ROOT, "public", mip.snowL), PNG.sync.write(L));
    writeFileSync(path.join(ROOT, "public", mip.snowH), PNG.sync.write(Hv));
    if (z === 3) out.push({ key, day, L, Hv, roofPx });
  }
  console.log(key, "ok");
}
/* LA PLANCHE (cran 3) : jour, jour + légère, jour + épaisse, sur un fond de neige. */
{
  const cols = 3, pad = 8;
  const rows = out.length, cw = Math.max(...out.map((o) => o.day.width)), chh = Math.max(...out.map((o) => o.day.height));
  const PW = cols * (cw + pad) + pad, PH = rows * (chh + pad) + pad;
  const sheet = new PNG({ width: PW, height: PH });
  for (let i = 0; i < PW * PH; i++) { sheet.data[i * 4] = 232; sheet.data[i * 4 + 1] = 238; sheet.data[i * 4 + 2] = 246; sheet.data[i * 4 + 3] = 255; }
  const blit = (src, ox, oy) => {
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
      const s = (y * src.width + x) * 4, a = src.data[s + 3] / 255;
      if (!a) continue;
      const o = ((oy + y) * PW + ox + x) * 4;
      for (let k = 0; k < 3; k++) sheet.data[o + k] = Math.round(src.data[s + k] * a + sheet.data[o + k] * (1 - a));
    }
  };
  out.forEach((o, r) => {
    for (let c = 0; c < cols; c++) {
      const ox = pad + c * (cw + pad), oy = pad + r * (chh + pad);
      blit(o.day, ox, oy);
      if (c === 1) blit(o.L, ox, oy);
      if (c === 2) blit(o.Hv, ox, oy);
    }
    console.log(o.key.padEnd(24), "toit :", o.roofPx, "px au cran 3");
  });
  writeFileSync(path.join(ROOT, "tools", "out", "toits-neige.png"), PNG.sync.write(sheet));
  console.log("planche : tools/out/toits-neige.png");
}
