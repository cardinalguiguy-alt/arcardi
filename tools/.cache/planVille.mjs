/* =============================================================================
   planVille.js — LE PLAN ILLUSTRÉ DE VALLEY TOWN (2026-10-03).
   -----------------------------------------------------------------------------
   Demande de Guillaume : « une map plus belle et détaillée de VT ». Décisions
   (posées en séance, 2026-10-03) : la carte OUVERTE seulement (pas de minimap),
   un plan ILLUSTRÉ PROCÉDURAL (pas une peinture), et « bâtiments individuels ».

   ⚠️ IL REMPLACE `buildTownMinimapBase` (FermeGame.js), qui peignait UN pixel par
   case — une teinte par revêtement, UNE seule couleur brique pour tout ce qui
   bloque. Ici chaque case fait PLAN_S pixels et on dessine ce qu'elle contient :
   un grain par revêtement (pavés, briques, dalles, goudron avec sa ligne
   médiane), les berges de l'eau, le relief ombré, des couronnes d'arbres avec
   leur ombre, des haies et des clôtures en traits, et SURTOUT chaque bâtiment
   avec son toit — deux pentes, un faîtage, une cheminée, son ombre portée, sa
   porte — au lieu d'une tache rouge.

   ⚠️ TOUT SE DÉRIVE DU MONDE GÉNÉRÉ ET DES CONSTANTES, RIEN N'EST UNE
   COORDONNÉE. Les maisons viennent de `C.townAllHouses()` et de leur emprise
   (`C.townHouseFoot`), les bâtiments civiques de leurs rectangles
   (`C.TOWN_COURT`…) : la ville a déjà bougé deux fois (425, 426, phase 7) et un
   plan qui garde les anciennes maisons au bon endroit est pire qu'un plan sans.
   ⚠️ LE PLAN NE SE CONSTRUIT QU'UNE FOIS (la ville est à graine fixe, rien n'y
   est constructible) : on peut donc se permettre ~2,4 M de pixels calculés un à
   un. `drawTownMap` le redessine à l'écran sans le recalculer.
   ⚠️ SOUS LE FAUX CANVAS DU BANC (`tools/lib-canvas.mjs`) il n'y a ni texte, ni
   `translate`, ni `clip` : ce fichier n'en utilise aucun, hors un `try` pour les
   deux lettres de la rose des vents. Les repères et les noms restent à
   `drawTownMap`, qui les peint en direct.
   ⚠️ LES TOITS SONT DESSINÉS D'APRÈS L'EMPRISE BLOQUANTE (`townHouseFoot`), pas
   d'après l'image de la façade (qui déborde vers le nord). Une maison de
   plan = ce qu'on ne traverse pas. Le modèle exact choisi par un joueur avec R
   ne se déduit pas du monde (il n'est pas dans la ville générée) : la teinte du
   toit vient donc du quartier (`townHouseDistrict`) et d'un hachage de la
   parcelle — stable, jamais aléatoire d'un chargement à l'autre.
   ========================================================================== */

import * as C from "./fermeConstants.mjs";

export const PLAN_S = 8;   // pixels de plan par case de la ville (224 × 168 cases → 1792 × 1344 px)

/* ─── petits outils ─────────────────────────────────────────────────────── */
const hash = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const smooth = (t) => t * t * (3 - 2 * t);
/* Bruit de valeur : une grille de hachages interpolée. `cell` en pixels. */
function vnoise(px, py, cell, seed) {
  const u = px / cell, v = py / cell, x0 = Math.floor(u), y0 = Math.floor(v);
  const fx = smooth(u - x0), fy = smooth(v - y0);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const rgba = (c, k = 1, a = 1) => `rgba(${clamp8(c[0] * k)},${clamp8(c[1] * k)},${clamp8(c[2] * k)},${a})`;
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* ─── classes de sol ────────────────────────────────────────────────────── */
const K = { GRASS: 0, LAWN: 1, WATER: 2, ASPHALT: 3, COBBLE: 4, BRICK: 5, DIRT: 6, SLAB: 7, STAIR: 8, WOOD: 9, SAND: 10, GRAVEL: 11, STONEBR: 12 };
const ROAD_CLS = new Set([K.ASPHALT, K.COBBLE, K.BRICK]);
const HARD_CLS = new Set([K.ASPHALT, K.COBBLE, K.BRICK, K.DIRT, K.SLAB, K.STAIR, K.GRAVEL, K.WOOD, K.STONEBR]);

function classOf(tw, i) {
  const gr = tw.ground[i];
  if (gr === C.G_WATER) return K.WATER;
  if (gr === C.G_TOWN_LAWN) return K.LAWN;
  if (gr === C.G_PATH) {
    const rd = tw.road ? tw.road[i] : C.TR_NONE;
    return rd === C.TR_ASPHALT ? K.ASPHALT : rd === C.TR_COBBLE ? K.COBBLE : rd === C.TR_BRICK ? K.BRICK : rd === C.TR_GRAVEL ? K.GRAVEL : K.DIRT;
  }
  if (gr === C.G_PATH_STONE || gr === C.G_RUN_KERB) return K.SLAB;
  if (gr === C.G_TOWN_STAIR) return K.STAIR;
  if (gr === C.G_BRIDGE || gr === C.G_BRIDGE_CLOSED || gr === C.G_BRIDGE_SITE) return K.WOOD;
  if (gr === C.G_BRIDGE_STONE || gr === C.G_BRIDGE_STONE_CLOSED) return K.STONEBR;
  if (gr === C.G_SAND || gr === C.G_LAKE_SHORE) return K.SAND;
  return K.GRASS;
}

/* Palette de base (RVB) des revêtements. */
const BASE = {
  [K.GRASS]: [112, 166, 84], [K.LAWN]: [98, 156, 78], [K.ASPHALT]: [72, 74, 82], [K.COBBLE]: [150, 148, 152],
  [K.BRICK]: [172, 94, 72], [K.DIRT]: [178, 146, 104], [K.SLAB]: [200, 194, 180], [K.STAIR]: [210, 204, 192],
  [K.WOOD]: [152, 110, 68], [K.SAND]: [224, 208, 152], [K.GRAVEL]: [178, 172, 160], [K.STONEBR]: [172, 168, 160],
};
const WATER_SHALLOW = [112, 190, 214], WATER_DEEP = [44, 102, 178];

/* ═══════════════════════════════════════════════════════════════════════════
   LE PLAN
   ═════════════════════════════════════════════════════════════════════════ */
export function buildTownPlan(tw, makeCanvasEl) {
  const S = PLAN_S, W = tw.w, H = tw.h, PW = W * S, PH = H * S;
  const canvas = makeCanvasEl ? makeCanvasEl(PW, PH) : (() => { const c = document.createElement("canvas"); c.width = PW; c.height = PH; return c; })();
  const g = canvas.getContext("2d");
  const id = (x, y) => y * W + x;
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  /* 1 — classe de chaque case, et distance (en cases) de l'eau à la terre. */
  const cls = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) cls[i] = classOf(tw, i);
  const dl = new Float32Array(W * H).fill(99);
  { const q = []; for (let i = 0; i < W * H; i++) if (cls[i] !== K.WATER) { dl[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inMap(nx, ny)) continue;
        const j = id(nx, ny); if (dl[j] > dl[i] + 1) { dl[j] = dl[i] + 1; q.push(j); } } } }
  const clsAt = (x, y) => (inMap(x, y) ? cls[id(x, y)] : K.GRASS);

  /* Champ bilinéaire en repère de cases (u, v), échantillonné aux CENTRES de cases. */
  const bil = (arr, u, v) => {
    const fx = u - 0.5, fy = v - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (x, y) => arr[id(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)))];
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };

  /* ───────────────────── 2 — LE SOL, PIXEL PAR PIXEL ───────────────────── */
  const im = g.createImageData(PW, PH), d = im.data;
  for (let py = 0; py < PH; py++) {
    const ty = (py / S) | 0, ly = py - ty * S, v = py / S;
    for (let px = 0; px < PW; px++) {
      const tx = (px / S) | 0, lx = px - tx * S, u = px / S, c = cls[ty * W + tx];
      const base = BASE[c] || BASE[K.GRASS];
      let r, gg, b;
      if (c === K.WATER) {
        const dist = bil(dl, u, v);
        const t = Math.min(1, Math.max(0, (dist - 0.5) / 3.2));
        const col = mixc(WATER_SHALLOW, WATER_DEEP, smooth(t));
        // des rides : deux bruits étirés en x, claires et sombres
        const rip = vnoise(px * 0.55, py * 1.6, 9, 11) * 0.6 + vnoise(px * 0.9 + 40, py * 2.2, 5, 12) * 0.4;
        const k = 0.94 + (rip - 0.5) * 0.26;
        r = col[0] * k; gg = col[1] * k; b = col[2] * k;
        if (rip > 0.78) { r += 26; gg += 26; b += 20; }   // un éclat
      } else {
        let k = 1, n = vnoise(px, py, 14, 3) * 0.55 + vnoise(px, py, 5, 4) * 0.45;
        if (c === K.GRASS || c === K.LAWN) {
          k = 0.93 + (n - 0.5) * 0.30;
          if (c === K.LAWN && (ty & 1)) k *= 1.025;                    // la tonte, une rangée sur deux
          else if (c === K.GRASS) k *= 0.98 + 0.04 * vnoise(px, py, 38, 5);   // des plaques plus sèches/plus vertes
          r = base[0] * k; gg = base[1] * k; b = base[2] * k;
          if (c === K.GRASS) { const m = vnoise(px, py, 42, 6); r += (m - 0.5) * 16; b -= (m - 0.5) * 8; }
        } else {
          let col = base;
          switch (c) {
            case K.ASPHALT: k = 0.96 + hash(px, py, 7) * 0.08 + (n - 0.5) * 0.06; break;
            case K.COBBLE: {                                            // pavés de 4 px, rangs décalés
              const row = py >> 2, off = (row & 1) * 2, cx = (px + off) >> 2;
              const edge = ((px + off) & 3) === 0 || (py & 3) === 0;
              k = edge ? 0.78 : 0.96 + hash(cx, row, 8) * 0.14;
              break; }
            case K.BRICK: {                                             // appareil à joints décalés, 6 × 3
              const row = (py / 3) | 0, off = (row & 1) * 3, cx = ((px + off) / 6) | 0;
              const joint = (px + off) % 6 === 0 || py % 3 === 0;
              if (joint) { col = [206, 184, 160]; k = 0.95; } else k = 0.92 + hash(cx, row, 9) * 0.16;
              break; }
            case K.SLAB: {                                              // dalles de 8 × 4, rangs décalés
              const row = py >> 2, off = (row & 1) * 4, cx = (px + off) >> 3;
              const joint = ((px + off) & 7) === 0 || (py & 3) === 0;
              k = joint ? 0.86 : 0.96 + hash(cx, row, 10) * 0.08;
              break; }
            case K.STAIR: k = (py & 1) ? 0.9 : 1.04; break;            // des marches
            case K.DIRT: k = 0.92 + hash(px, py, 12) * 0.12 + (n - 0.5) * 0.12; break;
            case K.GRAVEL: k = hash(px, py, 13) > 0.8 ? 0.82 : 0.96 + hash(px, py, 14) * 0.1; break;
            case K.SAND: k = 0.95 + (n - 0.5) * 0.1; break;
            case K.WOOD: case K.STONEBR: {                              // un tablier : lames en travers de l'ouvrage
              const wv = clsAt(tx, ty - 1) === K.WATER || clsAt(tx, ty + 1) === K.WATER;
              const lane = wv ? px % 3 : py % 3;
              k = lane === 0 ? 0.74 : 0.94 + hash(wv ? px / 3 | 0 : px, wv ? py : py / 3 | 0, 15) * 0.14;
              break; }
            default: break;
          }
          r = col[0] * k; gg = col[1] * k; b = col[2] * k;
        }
        // Le relief : l'éclairage vient du nord-ouest ; une pente qui monte vers le sud-est reçoit la lumière.
        const e = bil(tw.elev, u, v);
        if (e > 0.001 || tw.elev[ty * W + tx] > 0) {
          const gx = bil(tw.elev, u + 0.5, v) - bil(tw.elev, u - 0.5, v), gy = bil(tw.elev, u, v + 0.5) - bil(tw.elev, u, v - 0.5);
          const lit = Math.max(-0.42, Math.min(0.30, (gx + gy) * 0.30));
          const hk = 1 + lit + Math.min(0.12, e * 0.05);
          r *= hk; gg *= hk; b *= hk;
        }
      }
      const o = (py * PW + px) * 4;
      d[o] = clamp8(r); d[o + 1] = clamp8(gg); d[o + 2] = clamp8(b); d[o + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  /* ───────────── 3 — RIVES, BORDURES ET LIGNES MÉDIANES ───────────── */
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const c = cls[id(tx, ty)];
    for (let side = 0; side < 2; side++) {               // la frontière à droite, puis en dessous
      const nx = tx + (side === 0 ? 1 : 0), ny = ty + (side === 1 ? 1 : 0);
      if (!inMap(nx, ny)) continue;
      const n = cls[id(nx, ny)];
      if (n === c) continue;
      const bx = side === 0 ? nx * S : tx * S, by = side === 1 ? ny * S : ty * S;   // coin de la frontière
      const hz = side === 1;                                                       // frontière horizontale ?
      const put = (off, th, col) => { if (hz) g.fillRect(bx, by + off, S, th); else g.fillRect(bx + off, by, th, S); };
      const grassy = (k) => k === K.GRASS || k === K.LAWN || k === K.SAND;
      if (c === K.WATER || n === K.WATER) {
        // La berge : un trait de terre sombre côté terre, un liseré d'écume côté eau.
        const wFirst = c === K.WATER;                  // l'eau est-elle du côté « avant » (gauche/haut) ?
        const landK = wFirst ? n : c;
        if (landK === K.WOOD || landK === K.STONEBR) continue;
        g.fillStyle = "rgba(70,56,40,0.55)"; put(wFirst ? 0 : -1.6, 1.6);
        g.fillStyle = "rgba(255,255,255,0.40)"; put(wFirst ? -1.8 : 1.6, 1.8);
      } else if (ROAD_CLS.has(c) !== ROAD_CLS.has(n) || (ROAD_CLS.has(c) && ROAD_CLS.has(n))) {
        const rc = ROAD_CLS.has(c) ? c : n;
        if (grassy(c) || grassy(n)) {
          // chaussée contre herbe : une bordure sombre, doublée d'un filet clair côté chaussée
          const roadFirst = ROAD_CLS.has(c);
          g.fillStyle = "rgba(34,32,36,0.42)"; put(-0.7, 1.4);
          g.fillStyle = "rgba(240,236,224,0.22)"; put(roadFirst ? -2.0 : 0.7, 1.3);
        } else {
          g.fillStyle = rc === K.ASPHALT ? "rgba(30,30,36,0.35)" : "rgba(60,48,40,0.30)"; put(-0.6, 1.2);
        }
      } else if (HARD_CLS.has(c) !== HARD_CLS.has(n)) {
        g.fillStyle = "rgba(60,50,40,0.30)"; put(-0.5, 1.0);   // trottoir / allée contre herbe
      } else if (HARD_CLS.has(c) && HARD_CLS.has(n)) {
        g.fillStyle = "rgba(60,50,40,0.20)"; put(-0.4, 0.8);
      }
    }
  }
  // La ligne médiane du goudron, en pointillé. Un tronçon est « horizontal » s'il est nettement plus long en x
  // qu'épais en y (et inversement) ; la ligne passe au milieu de l'épaisseur. Les carrefours n'en ont pas.
  const runLen = (x, y, dx, dy) => { let a = 0; while (clsAt(x - dx * (a + 1), y - dy * (a + 1)) === K.ASPHALT && inMap(x - dx * (a + 1), y - dy * (a + 1))) a++;
    let b = 0; while (clsAt(x + dx * (b + 1), y + dy * (b + 1)) === K.ASPHALT && inMap(x + dx * (b + 1), y + dy * (b + 1))) b++; return [a, b]; };
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (cls[id(tx, ty)] !== K.ASPHALT) continue;
    const [la, lb] = runLen(tx, ty, 1, 0), [ua, ub] = runLen(tx, ty, 0, 1);
    const Wh = la + lb + 1, Wv = ua + ub + 1;
    g.fillStyle = "rgba(244,222,128,0.85)";
    if (Wh > Wv + 2 && Wv >= 3) {                                       // route horizontale
      if (ty === Math.floor(ty - ua + Wv / 2 - 0.0001) && (tx & 1) === 0) g.fillRect(tx * S + 1, (ty - ua + Wv / 2) * S - 0.7, S - 2, 1.4);
    } else if (Wv > Wh + 2 && Wh >= 3) {                                // route verticale
      if (tx === Math.floor(tx - la + Wh / 2 - 0.0001) && (ty & 1) === 0) g.fillRect((tx - la + Wh / 2) * S - 0.7, ty * S + 1, 1.4, S - 2);
    }
  }
  // Les rambardes des ponts de bois, côté eau, avec leurs poteaux.
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const c = cls[id(tx, ty)];
    if (c !== K.WOOD && c !== K.STONEBR) continue;
    const rail = c === K.WOOD ? [88, 62, 40] : [128, 122, 112];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (clsAt(tx + dx, ty + dy) !== K.WATER) continue;
      const x0 = tx * S, y0 = ty * S;
      g.fillStyle = rgba(rail, 1, 0.95);
      if (dy) g.fillRect(x0, dy < 0 ? y0 : y0 + S - 1.8, S, 1.8); else g.fillRect(dx < 0 ? x0 : x0 + S - 1.8, y0, 1.8, S);
      g.fillStyle = rgba(rail, 0.7, 1);
      if (dy) g.fillRect(x0, dy < 0 ? y0 - 0.4 : y0 + S - 0.4, 1.8, 2); else g.fillRect(dx < 0 ? x0 - 0.4 : x0 + S - 0.4, y0, 2, 1.8);
    }
  }

  /* ───────────── 4 — CLÔTURES, HAIES, MURETS : des traits ───────────── */
  const HEDGE = { 1: { w: 5.2, c: [46, 106, 44], hi: [76, 140, 62] }, 2: { w: 1.6, c: [52, 54, 62] }, 3: { w: 2.2, c: [240, 236, 224] }, 4: { w: 2.2, c: [124, 98, 68] }, 5: { w: 3.2, c: [150, 146, 134] } };
  if (tw.hedge) {
    g.lineCap = "round";
    const link = (tx, ty, ox, oy, fn) => {                 // chaque tronçon relie une case à sa voisine de même matière
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const nx = tx + dx, ny = ty + dy;
        if (inMap(nx, ny) && tw.hedge[id(nx, ny)] === tw.hedge[id(tx, ty)]) fn((tx + 0.5) * S + ox, (ty + 0.5) * S + oy, (nx + 0.5) * S + ox, (ny + 0.5) * S + oy);
      }
    };
    const seg = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    for (const pass of [0, 1, 2]) for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const hv = tw.hedge[id(tx, ty)]; if (!hv || !HEDGE[hv]) continue;
      const hd = HEDGE[hv], cx = (tx + 0.5) * S, cy = (ty + 0.5) * S;
      if (pass === 0) {                                    // l'ombre portée, sous le trait
        g.strokeStyle = "rgba(0,0,0,0.20)"; g.lineWidth = hd.w + 1; link(tx, ty, 0.9, 1.1, seg);
        g.fillStyle = "rgba(0,0,0,0.20)"; g.beginPath(); g.arc(cx + 0.9, cy + 1.1, hd.w / 2 + 0.5, 0, 7); g.fill();
      } else if (pass === 1) {                             // le corps
        g.strokeStyle = rgba(hd.c); g.lineWidth = hd.w; link(tx, ty, 0, 0, seg);
        g.fillStyle = rgba(hd.c); g.beginPath(); g.arc(cx, cy, hd.w / 2, 0, 7); g.fill();
      } else if (hd.hi) {                                  // le dessus éclairé d'une haie
        g.strokeStyle = rgba(hd.hi, 1, 0.7); g.lineWidth = hd.w * 0.4; link(tx, ty, -0.4, -0.7, seg);
        g.fillStyle = rgba(hd.hi, 1, 0.6); g.beginPath(); g.arc(cx - 0.4, cy - 0.6, hd.w * 0.22, 0, 7); g.fill();
      }
    }
    g.lineCap = "butt";
  }

  /* ───────────── 5 — LE PETIT DÉCOR AU SOL (sous les ombres) ───────────── */
  const dot = (x, y, r, col, a = 1) => { g.fillStyle = typeof col === "string" ? col : rgba(col, 1, a); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const tc = (p) => [(p.x + 0.5) * S, (p.y + 0.5) * S];
  for (const p of tw.props) {
    if (!inMap(p.x, p.y)) continue;
    const [cx, cy] = tc(p), h1 = hash(p.x, p.y, 20), h2 = hash(p.x, p.y, 21);
    switch (p.kind) {
      case "tallGrass": case "grassTuft": case "reedTuft": {
        const dark = p.kind === "reedTuft" ? [70, 110, 60] : [78, 134, 62];
        g.fillStyle = rgba(dark, 1, 0.55);
        for (let k = 0; k < 3; k++) { const ox = (hash(p.x, p.y, 30 + k) - 0.5) * S * 0.8, oy = (hash(p.x, p.y, 40 + k) - 0.5) * S * 0.7; g.fillRect(cx + ox, cy + oy - 1.5, 0.9, 3); g.fillRect(cx + ox + 1.1, cy + oy - 1, 0.9, 2.4); }
        break; }
      case "lavender": for (let k = 0; k < 4; k++) dot(cx + (hash(p.x, p.y, 50 + k) - 0.5) * S * 0.7, cy + (hash(p.x, p.y, 60 + k) - 0.5) * S * 0.7, 1.4, [164, 122, 206]); break;
      case "lily": dot(cx, cy, 2.2, [70, 150, 80]); if (h1 > 0.6) dot(cx + 0.5, cy - 0.5, 0.9, [250, 190, 214]); break;
      case "reedsWater": g.fillStyle = "rgba(60,96,50,0.9)"; for (let k = 0; k < 4; k++) g.fillRect(cx - 3 + k * 1.8, cy - 3, 0.9, 5); break;
      case "grave": g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(cx - 1.5 + 0.8, cy - 2 + 0.9, 3, 4.4); g.fillStyle = "rgb(166,166,168)"; g.fillRect(cx - 1.5, cy - 2, 3, 4.4); g.fillStyle = "rgb(122,122,126)"; g.fillRect(cx - 0.4, cy - 1.4, 0.8, 2.6); break;
      case "stoneBlock": case "boulder": g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(cx - 2.8 + 0.8, cy - 2.4 + 1, 5.6, 4.8); g.fillStyle = "rgb(150,148,144)"; g.fillRect(cx - 2.8, cy - 2.4, 5.6, 4.8); g.fillStyle = "rgb(184,182,176)"; g.fillRect(cx - 2.8, cy - 2.4, 5.6, 1.4); break;
      case "flatStone": case "stepStones": dot(cx, cy, 2.6, [160, 156, 148]); dot(cx - 0.5, cy - 0.5, 1.6, [186, 182, 172]); break;
      case "planter": case "flowerTrough": case "herbPots": case "potPink": {
        const cols = [[232, 104, 120], [248, 208, 88], [240, 240, 244], [170, 120, 220]];
        dot(cx, cy, 2.8, [86, 128, 60]);
        for (let k = 0; k < 4; k++) dot(cx + (hash(p.x, p.y, 70 + k) - 0.5) * 4.4, cy + (hash(p.x, p.y, 80 + k) - 0.5) * 4.4, 1, cols[(h1 * 4 + k) % 4 | 0]);
        break; }
      case "roseBox": dot(cx, cy, 3.2, [74, 120, 58]); for (let k = 0; k < 4; k++) dot(cx + (hash(p.x, p.y, 90 + k) - 0.5) * 5, cy + (hash(p.x, p.y, 100 + k) - 0.5) * 5, 1, [226, 70, 96]); break;
      case "swing": g.fillStyle = "rgb(110,84,58)"; g.fillRect(cx - 5, cy - 4, 1, 8); g.fillRect(cx + 4, cy - 4, 1, 8); g.fillRect(cx - 5, cy - 4, 10, 1); g.fillStyle = "rgb(220,90,70)"; g.fillRect(cx - 2, cy + 1, 4, 1.4); break;
      case "gardenTable": case "table": g.fillStyle = "rgba(0,0,0,0.22)"; g.beginPath(); g.arc(cx + 0.8, cy + 0.9, 3.2, 0, 7); g.fill(); dot(cx, cy, 3.2, [150, 112, 74]); dot(cx - 0.4, cy - 0.5, 2, [176, 138, 94]); break;
      case "clothesline": { g.fillStyle = "rgba(60,50,40,0.7)"; g.fillRect(cx - 9, cy - 1, 18, 0.7);
        const cl = [[236, 96, 96], [250, 250, 244], [96, 150, 224], [250, 214, 96]]; for (let k = 0; k < 4; k++) { g.fillStyle = rgba(cl[k]); g.fillRect(cx - 8 + k * 4.4, cy - 0.6, 3, 3.2); } break; }
      case "woodpileRoofed": case "woodpileAxe": g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(cx - 4.5 + 0.8, cy - 2.5 + 1, 9, 5); g.fillStyle = "rgb(130,92,58)"; g.fillRect(cx - 4.5, cy - 2.5, 9, 5); g.fillStyle = "rgb(166,122,80)"; for (let k = 0; k < 3; k++) g.fillRect(cx - 4.5, cy - 2.5 + k * 1.7, 9, 0.8); break;
      case "wheelbarrow": g.fillStyle = "rgb(94,110,128)"; g.fillRect(cx - 3, cy - 1.6, 6, 3.2); dot(cx + 3.4, cy, 1.1, [50, 50, 54]); break;
      case "hutch": g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(cx - 4 + 0.8, cy - 2.6 + 1, 8, 5.2); g.fillStyle = "rgb(144,106,70)"; g.fillRect(cx - 4, cy - 2.6, 8, 5.2); g.fillStyle = "rgb(108,80,54)"; g.fillRect(cx - 4, cy - 2.6, 8, 1.4); break;
      case "rainBarrel": case "barrel": case "bucket": dot(cx, cy, 2.4, [110, 80, 52]); dot(cx, cy, 1.5, [60, 94, 120]); break;
      case "crate": case "sacks": g.fillStyle = "rgb(168,128,84)"; g.fillRect(cx - 2.6, cy - 2.6, 5.2, 5.2); g.fillStyle = "rgba(60,40,24,0.5)"; g.fillRect(cx - 2.6, cy - 0.3, 5.2, 0.6); break;
      case "mailboxIron": case "mailboxRed": case "mailboxTin": dot(cx, cy, 1.5, p.kind === "mailboxRed" ? [214, 70, 60] : [70, 74, 84]); break;
      case "birdbath": dot(cx, cy, 2.6, [178, 176, 170]); dot(cx, cy, 1.5, [120, 176, 214]); break;
      case "bench": case "stoneBench": g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(cx - 4 + 0.8, cy - 1.5 + 1, 8, 3); g.fillStyle = p.kind === "bench" ? "rgb(128,92,60)" : "rgb(170,168,160)"; g.fillRect(cx - 4, cy - 1.5, 8, 3); g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(cx - 4, cy - 1.5, 8, 0.8); break;
      case "townWell": dot(cx + 0.7, cy + 0.9, 4, "rgba(0,0,0,0.22)"); dot(cx, cy, 4, [160, 156, 148]); dot(cx, cy, 2.6, [64, 110, 160]); dot(cx - 0.6, cy - 0.7, 0.9, [160, 206, 236]); break;
      case "statue": dot(cx + 0.9, cy + 1, 3.6, "rgba(0,0,0,0.25)"); dot(cx, cy, 3.4, [176, 174, 168]); dot(cx, cy, 1.8, [128, 126, 120]); break;
      case "kiosk": case "newsBoard": g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(cx - 3.4 + 0.9, cy - 3 + 1, 6.8, 6); g.fillStyle = "rgb(94,126,98)"; g.fillRect(cx - 3.4, cy - 3, 6.8, 6); g.fillStyle = "rgb(210,84,76)"; g.fillRect(cx - 3.4, cy - 3, 6.8, 2); break;
      case "flowerCart": g.fillStyle = "rgb(144,100,66)"; g.fillRect(cx - 4, cy - 2.6, 8, 5.2); for (let k = 0; k < 5; k++) dot(cx - 3 + k * 1.5, cy - 0.4 + (k & 1) * 0.8, 1, [[232, 96, 120], [248, 208, 88], [250, 250, 246], [170, 120, 220], [240, 140, 70]][k]); break;
      case "stall": {
        const pal = [[[206, 70, 66], [246, 240, 228]], [[64, 112, 186], [246, 240, 228]], [[76, 150, 92], [246, 240, 228]], [[236, 186, 64], [246, 240, 228]]][(h1 * 4) | 0];
        const sw = 10.5, sh = 7.5, x0 = cx - sw / 2, y0 = cy - sh / 2 - 0.5;
        g.fillStyle = "rgba(0,0,0,0.24)"; g.fillRect(x0 + 1.2, y0 + 1.4, sw, sh);
        for (let k = 0; k < 7; k++) { g.fillStyle = rgba(pal[k & 1]); g.fillRect(x0 + k * sw / 7, y0, sw / 7 + 0.2, sh); }
        g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(x0, y0 + sh - 1.4, sw, 1.4); g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(x0, y0, sw, 0.9);
        break; }
      case "marketArch": g.fillStyle = "rgba(90,70,50,0.9)"; g.fillRect(cx - 4, cy - 1, 8, 2); g.fillStyle = "rgba(255,230,160,0.9)"; g.fillRect(cx - 4, cy - 0.4, 8, 0.8); break;
      case "starKiln": dot(cx, cy, 3.4, [150, 110, 90]); dot(cx, cy, 1.8, [240, 140, 60]); break;
      case "archBridge": {
        const b = C.townPropBox("archBridge", p.x, p.y), x0 = b.x0 * S, x1 = b.x1 * S, y0 = b.y0 * S, y1 = b.y1 * S;
        g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(x0 + 1.4, y0 + 1.8, x1 - x0, y1 - y0);
        g.fillStyle = "rgb(186,180,168)"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
        g.fillStyle = "rgb(214,208,196)"; g.fillRect(x0, y0, x1 - x0, 1.8); g.fillRect(x0, y1 - 1.8, x1 - x0, 1.8);
        g.fillStyle = "rgb(126,120,110)"; g.fillRect(x0, y0 + 1.8, x1 - x0, 0.8); g.fillRect(x0, y1 - 2.6, x1 - x0, 0.8);
        g.fillStyle = "rgba(0,0,0,0.12)"; for (let k = 1; k < 8; k++) g.fillRect(x0 + k * (x1 - x0) / 8, y0 + 2.6, 0.7, y1 - y0 - 5.2);
        break; }
      case "pier": g.fillStyle = "rgb(138,100,64)"; g.fillRect(cx - S / 2, cy - S / 2, S, S); g.fillStyle = "rgba(60,40,24,0.45)"; for (let k = 0; k < 3; k++) g.fillRect(cx - S / 2, cy - S / 2 + k * 3, S, 0.7); break;
      default: break;
    }
  }
  { // le ponton du lac : un tablier de lames en travers, avec ses pieux.
    const P = C.TOWN_PIER, x0 = P.x * S, y0 = P.y * S, w = P.w * S, h = P.h * S;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x0 + 1.4, y0 + 1.8, w, h);
    g.fillStyle = "rgb(148,106,66)"; g.fillRect(x0, y0, w, h);
    for (let k = 0; k < h / 3; k++) { g.fillStyle = k & 1 ? "rgba(60,40,24,0.38)" : "rgba(255,230,180,0.12)"; g.fillRect(x0, y0 + k * 3, w, 0.8); }
    g.fillStyle = "rgb(84,58,38)"; g.fillRect(x0, y0, 1.6, h); g.fillRect(x0 + w - 1.6, y0, 1.6, h);
  }

  /* ───────────── 6 — LES OMBRES PORTÉES (bâtiments et arbres) ───────────── */
  // Un seul jeu d'ombres, sous tout ce qui est dressé : lumière du nord-ouest, ombre vers le sud-est.
  const SHX = 0.55 * S, SHY = 0.8 * S;   // décalage de l'ombre d'un toit
  const buildings = collectBuildings(tw, C);
  g.fillStyle = "rgba(20,24,16,0.30)";
  for (const bd of buildings) {
    const x0 = bd.x * S, y0 = bd.y * S, x1 = (bd.x + bd.w) * S, y1 = (bd.y + bd.h) * S;
    g.beginPath(); g.moveTo(x0 + SHX, y0 + SHY); g.lineTo(x1 + SHX, y0 + SHY); g.lineTo(x1 + SHX, y1 + SHY); g.lineTo(x0 + SHX, y1 + SHY); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0 + SHX, y1 + SHY); g.lineTo(x1 + SHX, y1 + SHY); g.lineTo(x1, y1); g.closePath(); g.fill();
  }
  const trees = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const o = tw.objects[id(tx, ty)];
    if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_TREE_DEAD) trees.push({ x: tx, y: ty, o });
  }
  g.fillStyle = "rgba(20,30,16,0.26)";
  for (const t of trees) { const cx = (t.x + 0.5) * S + 0.38 * S, cy = (t.y + 0.5) * S + 0.46 * S; g.beginPath(); g.ellipse(cx, cy, 0.78 * S, 0.7 * S, 0, 0, 7); g.fill(); }

  /* ───────────── 7 — LES BÂTIMENTS, UN PAR UN ───────────── */
  for (const bd of buildings) drawBuilding(g, bd, S);

  /* ───────────── 8 — LES ARBRES ET LES BUISSONS ───────────── */
  trees.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const t of trees) {
    const jx = (hash(t.x, t.y, 200) - 0.5) * 0.28, jy = (hash(t.x, t.y, 201) - 0.5) * 0.24;
    const cx = (t.x + 0.5 + jx) * S, cy = (t.y + 0.5 + jy) * S, r = (0.74 + hash(t.x, t.y, 202) * 0.14) * S;
    const dead = t.o === C.O_TREE_DEAD;
    const dark = dead ? [96, 84, 70] : t.o === C.O_TREE2 ? [48, 112, 58] : [38, 98, 44];
    const mid = dead ? [124, 108, 90] : t.o === C.O_TREE2 ? [74, 146, 72] : [62, 132, 58];
    const lite = dead ? [150, 132, 110] : t.o === C.O_TREE2 ? [124, 184, 90] : [108, 172, 76];
    dot(cx, cy, r, dark);
    dot(cx - r * 0.12, cy - r * 0.14, r * 0.8, mid);
    dot(cx - r * 0.26, cy - r * 0.3, r * 0.46, lite);
    // quelques paquets de feuilles
    for (let k = 0; k < 4; k++) { const a = hash(t.x, t.y, 210 + k) * 6.28, rr = r * (0.3 + hash(t.x, t.y, 220 + k) * 0.35); dot(cx + Math.cos(a) * rr - r * 0.1, cy + Math.sin(a) * rr - r * 0.12, r * 0.22, lite, 0.5); }
  }
  // buissons et massifs (les « props » arbustifs), après les arbres : ils sont bas, mais on les lit mieux dessus
  for (const p of tw.props) {
    if (!inMap(p.x, p.y)) continue;
    const [cx, cy] = tc(p);
    switch (p.kind) {
      case "shrub": case "clump": { dot(cx + 0.5, cy + 0.7, 2.7, "rgba(20,30,16,0.25)"); dot(cx, cy, 2.7, [52, 118, 52]); dot(cx - 0.6, cy - 0.7, 1.5, [96, 162, 70]); break; }
      case "goldBush": { dot(cx + 0.5, cy + 0.7, 2.6, "rgba(20,30,16,0.25)"); dot(cx, cy, 2.6, [170, 150, 52]); dot(cx - 0.6, cy - 0.7, 1.4, [226, 204, 96]); break; }
      case "topiary": { dot(cx + 0.7, cy + 0.9, 3.1, "rgba(20,30,16,0.28)"); dot(cx, cy, 3.1, [38, 98, 52]); dot(cx - 0.8, cy - 0.9, 1.7, [92, 156, 84]); break; }
      case "bonsai": dot(cx, cy, 2.4, [44, 108, 56]); dot(cx - 0.5, cy - 0.6, 1.2, [100, 168, 86]); break;
      case "brambleSmall": case "bramble": case "wildGrass": dot(cx, cy, 2.8, [78, 78, 50]); dot(cx - 0.5, cy - 0.5, 1.4, [120, 110, 64]); break;
      case "lamp": case "oilLamp": case "hangLamp": dot(cx + 0.5, cy + 0.6, 1.3, "rgba(0,0,0,0.3)"); dot(cx, cy, 1.4, [58, 56, 62]); dot(cx - 0.3, cy - 0.3, 0.8, [255, 232, 160]); break;
      case "streetSign": case "stairPost": dot(cx, cy, 1, [70, 72, 80]); break;
      default: break;
    }
  }

  /* ───────────── 9 — LA FONTAINE ───────────── */
  { const F = C.TOWN_FOUNTAIN, cx = (F.x + 1) * S, cy = (F.y + 1) * S, r = 2.1 * S;
    dot(cx + 1.2, cy + 1.5, r + 1, "rgba(0,0,0,0.25)");
    dot(cx, cy, r, [196, 192, 182]); dot(cx, cy, r - 2.2, [150, 146, 138]); dot(cx, cy, r - 3.2, [96, 168, 214]);
    dot(cx - 1, cy - 1.4, r - 5, [132, 200, 232]);
    dot(cx, cy, 3.4, [196, 192, 182]); dot(cx, cy, 2, [226, 240, 248]);
    g.fillStyle = "rgba(255,255,255,0.7)"; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.arc(cx + Math.cos(a) * (r - 4.6), cy + Math.sin(a) * (r - 4.6), 0.7, 0, 7); g.fill(); } }

  /* ───────────── 10 — LE CADRE : liseré, rose des vents ───────────── */
  drawFrame(g, PW, PH, S);
  return canvas;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LES BÂTIMENTS
   ═════════════════════════════════════════════════════════════════════════ */
const ROOF_PALETTES = {
  riche: [[84, 96, 120], [92, 104, 112], [120, 74, 66], [78, 88, 100]],        // ardoise, ardoise bleutée, tuile sombre
  enrichie: [[176, 92, 64], [160, 84, 62], [128, 96, 82], [184, 110, 72]],      // terre cuite
  simple: [[170, 120, 72], [150, 104, 66], [186, 144, 88], [130, 96, 70]],      // chaume, bardeaux
};
export function townPlanBuildings(tw) { return collectBuildings(tw, C); }   // le catalogue des toits dessinés, lu par `tools/render-plan.mjs`
function collectBuildings(tw, C) {
  const out = [];
  const seen = new Set();
  const add = (b) => { out.push(b); };
  // Les parcelles et les maisons de ville.
  for (const hsn of C.townAllHouses()) {
    const f = C.townHouseFoot(hsn);
    const dist = C.townHouseDistrict(hsn), pal = ROOF_PALETTES[dist];
    const hv = hash(hsn.x, hsn.y, 300);
    let chimney = null;
    try { const look = C.townHouseLook(hsn, 0), m = C.TOWN_HOUSE_MODELS[look.model];
      if (m && m.chimney && m.chimney.length) { const k = C.townDoorScale(m) / 16; chimney = (C.TOWN_HOUSE_W / 2 + (m.chimney[0][0] - m.door) * k) - (f.x - hsn.x); } } catch (e) { chimney = null; }
    add({ kind: "house", x: f.x, y: f.y, w: f.w, h: f.h, roof: pal[(hv * pal.length) | 0], wall: dist === "riche" ? [238, 230, 214] : [232, 220, 196], door: hsn.x + C.TOWN_HOUSE_W / 2, chimney: chimney == null ? null : f.x + chimney, hv, dist });
    for (let yy = f.y; yy < f.y + f.h; yy++) for (let xx = f.x; xx < f.x + f.w; xx++) seen.add(yy * tw.w + xx);
  }
  { const R = C.TOWN_RUIN, f = C.townHouseFoot(R);
    add({ kind: "ruin", x: f.x, y: f.y, w: f.w, h: f.h, roof: [92, 84, 78], wall: [190, 182, 170], door: R.x + C.TOWN_HOUSE_W / 2, hv: hash(R.x, R.y, 301) });
    for (let yy = f.y; yy < f.y + f.h; yy++) for (let xx = f.x; xx < f.x + f.w; xx++) seen.add(yy * tw.w + xx); }
  const civ = (r, kind, roof, wall, extra) => { add({ kind, x: r.x, y: r.y, w: r.w, h: r.h, roof, wall, door: r.x + r.w / 2, hv: hash(r.x, r.y, 302), ...extra });
    for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) seen.add(yy * tw.w + xx); };
  civ(C.TOWN_COURT, "court", [96, 100, 114], [226, 220, 206]);
  civ(C.TOWN_HALL, "hall", [78, 134, 122], [236, 228, 210]);
  civ(C.TOWN_CHURCH, "church", [92, 96, 110], [226, 220, 206]);
  civ(C.TOWN_BOUTIQUE, "shop", [168, 76, 92], [238, 228, 208]);
  civ(C.TOWN_SALON, "shop", [74, 128, 150], [238, 228, 208]);
  civ(C.TOWN_STATION, "station", [150, 70, 62], [226, 214, 190]);
  // Tout ce qui bloque sans être connu (la scierie, l'atelier de verre, les remises…) : un bâtiment générique par
  // composante connexe de cases pleines, hors eau, arbres, haies et décor de sol.
  const W = tw.w, H = tw.h, lump = new Uint8Array(W * H);
  const knownProp = new Set(["lamp", "bench", "topiary", "goldBush", "clump", "shrub", "tallGrass", "stall", "townWell", "crate", "barrel", "sacks", "kiosk", "flowerCart", "marketArch", "grave", "stoneBench", "stoneBlock", "boulder", "planter", "flowerTrough", "roseBox", "bonsai", "pier", "statue", "mailboxIron", "mailboxRed", "mailboxTin", "birdbath", "herbPots", "gardenTable", "swing", "clothesline", "woodpileRoofed", "woodpileAxe", "wheelbarrow", "hutch", "rainBarrel", "archBridge", "table", "streetSign", "hangLamp", "oilLamp", "lavender", "stairPost", "stairBalus", "stairSide", "stairRail", "stairPot", "starKiln", "starRack", "starShutter", "starNestTree", "newsBoard", "telescope", "urn", "ruinGate", "rod", "bucket", "chest", "potPink", "hedgeRow", "lily", "reedsWater", "reedTuft", "grassTuft", "flatStone", "stepStones", "brambleSmall", "bramble", "wildGrass"]);
  const propAt = new Set(); for (const p of tw.props) if (knownProp.has(p.kind)) propAt.add(p.y * W + p.x);
  for (let i = 0; i < W * H; i++) {
    if (!tw.solid[i] || seen.has(i) || tw.ground[i] === C.G_WATER) continue;
    const o = tw.objects[i];
    if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_TREE_DEAD) continue;
    if (tw.hedge && tw.hedge[i]) continue;
    if (propAt.has(i)) continue;
    lump[i] = 1;
  }
  const done = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!lump[i] || done[i]) continue;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0; const q = [i]; done[i] = 1;
    while (q.length) { const j = q.pop(), x = j % W, y = (j / W) | 0; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (lump[k] && !done[k]) { done[k] = 1; q.push(k); } } }
    if (n < 4) continue;                        // un poteau, un reste de clôture : pas un bâtiment
    out.push({ kind: "shed", x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, roof: [150, 112, 80], wall: [226, 214, 190], door: (x0 + x1 + 1) / 2, hv: hash(x0, y0, 303), n });
  }
  return out;
}

const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); }

function drawBuilding(g, bd, S) {
  const E = 0.2 * S;                                           // le débord du toit
  const x0 = bd.x * S - E, y0 = bd.y * S - E, x1 = (bd.x + bd.w) * S + E, y1 = (bd.y + bd.h) * S + E;
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const roof = bd.roof;
  // Le mur, visible comme une marge claire autour de la couverture.
  g.fillStyle = rgbaS(bd.wall, 1); g.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
  g.fillStyle = "rgba(0,0,0,0.20)"; g.fillRect(x0 - 1, y1, w + 2, 1); g.fillRect(x1, y0, 1, h + 1);   // le rebord, côté ombre
  const rx0 = x0 + 0.5, ry0 = y0 + 0.5, rx1 = x1 - 0.5, ry1 = y1 - 0.5;
  const N = shade(roof, 1.14), Wt = shade(roof, 1.04), So = shade(roof, 0.80), Ea = shade(roof, 0.88);

  if (bd.kind === "church") {
    // Nef à pignon (faîtage est-ouest), clocher carré au milieu, croix.
    const nh = (ry1 - ry0) * 0.82, ny0 = ry0 + (ry1 - ry0 - nh) / 2;
    gable(g, rx0, ny0, rx1, ny0 + nh, roof, true);
    const tw_ = Math.min(w * 0.26, h * 1.02), tx0 = cx - tw_ / 2, ty0 = cy - tw_ / 2;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(tx0 + 2, ty0 + 2.4, tw_, tw_);
    g.fillStyle = "rgb(226,220,206)"; g.fillRect(tx0 - 1, ty0 - 1, tw_ + 2, tw_ + 2);
    pyramid(g, tx0, ty0, tx0 + tw_, ty0 + tw_, shade(roof, 0.92));
    g.fillStyle = "rgb(236,214,120)"; g.fillRect(cx - 0.5, cy - 2.2, 1, 4.4); g.fillRect(cx - 1.5, cy - 1, 3, 1);
  } else if (bd.kind === "hall") {
    hip(g, rx0, ry0, rx1, ry1, roof);
    const tw_ = Math.min(w * 0.22, h * 0.9), tx0 = cx - tw_ / 2, ty0 = cy - tw_ / 2;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(tx0 + 2, ty0 + 2.4, tw_, tw_);
    g.fillStyle = "rgb(228,220,200)"; g.fillRect(tx0 - 1, ty0 - 1, tw_ + 2, tw_ + 2);
    pyramid(g, tx0, ty0, tx0 + tw_, ty0 + tw_, shade(roof, 0.8));
    g.fillStyle = "rgb(250,240,200)"; g.beginPath(); g.arc(cx, cy, 1.1, 0, 7); g.fill();
  } else if (bd.kind === "court") {
    hip(g, rx0, ry0, rx1, ry1, roof);
    // le fronton : un triangle clair au centre de la façade sud
    const fw = w * 0.34;
    poly(g, [[cx - fw / 2, ry1], [cx + fw / 2, ry1], [cx, ry1 - h * 0.34]], rgbaS(shade(roof, 1.3), 1));
    poly(g, [[cx, ry1 - h * 0.34], [cx + fw / 2, ry1], [cx, ry1]], rgbaS(shade(roof, 1.0), 1));
  } else if (bd.kind === "station") {
    gable(g, rx0, ry0, rx1, ry1, roof, w >= h);
  } else if (bd.kind === "ruin") {
    gable(g, rx0, ry0, rx1, ry1, roof, true);
    // le toit crevé : des trous sombres et des chevrons
    g.fillStyle = "rgb(40,34,30)"; g.fillRect(cx - w * 0.22, cy - h * 0.18, w * 0.2, h * 0.34); g.fillRect(cx + w * 0.12, cy - h * 0.3, w * 0.16, h * 0.28);
    g.fillStyle = "rgb(120,96,70)"; for (let k = 0; k < 5; k++) g.fillRect(rx0 + 2 + k * (w - 6) / 5, ry0 + 1, 0.9, h * 0.4);
  } else if (bd.kind === "shed") {
    if (Math.min(bd.w, bd.h) >= 3) gable(g, rx0, ry0, rx1, ry1, roof, w >= h); else flat(g, rx0, ry0, rx1, ry1, shade(bd.wall, 0.9));
  } else if (bd.kind === "shop") {
    gable(g, rx0, ry0, rx1, ry1, roof, true);
    // l'auvent rayé le long de la façade sud
    for (let k = 0; k < 8; k++) { g.fillStyle = k & 1 ? "rgb(250,246,236)" : rgbaS(shade(roof, 0.7), 1); g.fillRect(rx0 + k * (rx1 - rx0) / 8, ry1, (rx1 - rx0) / 8 + 0.3, 2.2); }
  } else {
    // maison : toit à deux pentes, faîtage dans le sens de la largeur (la façade est large)
    gable(g, rx0, ry0, rx1, ry1, roof, w >= h);
  }
  // La cheminée.
  if (bd.kind === "house" || bd.kind === "shed") {
    const chx = bd.chimney != null ? bd.chimney * S : x0 + w * (0.22 + (bd.hv || 0.5) * 0.56), chy = cy - (w >= h ? 0 : 0);
    const cw = 0.42 * S;
    g.fillStyle = "rgba(0,0,0,0.30)"; g.fillRect(chx - cw / 2 + 1.1, cy - cw / 2 - 0.4 + 1.3, cw, cw);
    g.fillStyle = "rgb(150,110,92)"; g.fillRect(chx - cw / 2, cy - cw / 2 - 0.4, cw, cw);
    g.fillStyle = "rgb(60,44,40)"; g.fillRect(chx - cw / 2 + 0.7, cy - cw / 2 + 0.3, cw - 1.4, cw - 1.4);
  }
  // La porte : un seuil à l'aplomb de la façade sud.
  if (bd.door != null && (bd.kind === "house" || bd.kind === "ruin" || bd.kind === "church" || bd.kind === "hall" || bd.kind === "court" || bd.kind === "shop" || bd.kind === "station")) {
    const dx = bd.door * S, dw = bd.kind === "church" || bd.kind === "court" || bd.kind === "hall" ? 2.8 : 2.2;
    g.fillStyle = "rgb(86,58,40)"; g.fillRect(dx - dw / 2, y1 - 0.2, dw, 2.2);
    g.fillStyle = "rgb(214,170,96)"; g.fillRect(dx - dw / 2 + 0.5, y1 + 0.6, dw - 1, 1);
  }
}
const rgbaS = (c, a) => `rgba(${clamp8(c[0])},${clamp8(c[1])},${clamp8(c[2])},${a})`;
function tileLines(g, x0, y0, x1, y1, horizontal) {          // le calepinage de la couverture
  g.fillStyle = "rgba(0,0,0,0.10)";
  if (horizontal) for (let y = y0 + 1.6; y < y1; y += 1.8) g.fillRect(x0, y, x1 - x0, 0.45);
  else for (let x = x0 + 1.6; x < x1; x += 1.8) g.fillRect(x, y0, 0.45, y1 - y0);
}
/* Deux pentes. `ridgeH` : faîtage horizontal (pente nord claire, pente sud sombre) ; sinon vertical (ouest clair, est sombre). */
function gable(g, x0, y0, x1, y1, roof, ridgeH) {
  if (ridgeH) {
    const my = (y0 + y1) / 2;
    g.fillStyle = rgbaS(shade(roof, 1.14), 1); g.fillRect(x0, y0, x1 - x0, my - y0);
    g.fillStyle = rgbaS(shade(roof, 0.80), 1); g.fillRect(x0, my, x1 - x0, y1 - my);
    tileLines(g, x0, y0, x1, my, true); tileLines(g, x0, my, x1, y1, true);
    g.fillStyle = rgbaS(shade(roof, 1.35), 1); g.fillRect(x0, my - 0.6, x1 - x0, 1.2);
    g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(x0, my + 0.6, x1 - x0, 0.6);
  } else {
    const mx = (x0 + x1) / 2;
    g.fillStyle = rgbaS(shade(roof, 1.10), 1); g.fillRect(x0, y0, mx - x0, y1 - y0);
    g.fillStyle = rgbaS(shade(roof, 0.84), 1); g.fillRect(mx, y0, x1 - mx, y1 - y0);
    tileLines(g, x0, y0, mx, y1, false); tileLines(g, mx, y0, x1, y1, false);
    g.fillStyle = rgbaS(shade(roof, 1.35), 1); g.fillRect(mx - 0.6, y0, 1.2, y1 - y0);
    g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(mx + 0.6, y0, 0.6, y1 - y0);
  }
}
function flat(g, x0, y0, x1, y1, roof) {
  g.fillStyle = rgbaS(shade(roof, 0.96), 1); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.fillStyle = rgbaS(shade(roof, 1.16), 1); g.fillRect(x0, y0, x1 - x0, 1); g.fillRect(x0, y0, 1, y1 - y0);
}
/* Croupe : quatre faces rejoignant un faîtage (ou un point si le toit est carré). */
function hip(g, x0, y0, x1, y1, roof) {
  const w = x1 - x0, h = y1 - y0, inset = Math.min(w, h) / 2;
  const ax = x0 + inset, bx = x1 - inset, my = (y0 + y1) / 2;
  poly(g, [[x0, y0], [x1, y0], [bx, my], [ax, my]], rgbaS(shade(roof, 1.14), 1));
  poly(g, [[x0, y0], [ax, my], [x0, y1]], rgbaS(shade(roof, 1.04), 1));
  poly(g, [[x1, y0], [x1, y1], [bx, my]], rgbaS(shade(roof, 0.88), 1));
  poly(g, [[x0, y1], [ax, my], [bx, my], [x1, y1]], rgbaS(shade(roof, 0.80), 1));
  g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(ax, my - 0.5, Math.max(1, bx - ax), 1);
}
function pyramid(g, x0, y0, x1, y1, roof) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  poly(g, [[x0, y0], [x1, y0], [cx, cy]], rgbaS(shade(roof, 1.16), 1));
  poly(g, [[x0, y0], [cx, cy], [x0, y1]], rgbaS(shade(roof, 1.04), 1));
  poly(g, [[x1, y0], [x1, y1], [cx, cy]], rgbaS(shade(roof, 0.86), 1));
  poly(g, [[x0, y1], [cx, cy], [x1, y1]], rgbaS(shade(roof, 0.76), 1));
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE CADRE
   ═════════════════════════════════════════════════════════════════════════ */
function drawFrame(g, PW, PH, S) {
  // Un voile sombre sur les bords (vignette), puis le liseré.
  const edge = 5 * S;
  for (let k = 0; k < edge; k++) { const a = 0.22 * Math.pow(1 - k / edge, 2);
    g.fillStyle = `rgba(24,20,16,${a})`; g.fillRect(0, k, PW, 1); g.fillRect(0, PH - 1 - k, PW, 1); g.fillRect(k, 0, 1, PH); g.fillRect(PW - 1 - k, 0, 1, PH); }
  g.fillStyle = "rgb(58,42,30)"; g.fillRect(0, 0, PW, 5); g.fillRect(0, PH - 5, PW, 5); g.fillRect(0, 0, 5, PH); g.fillRect(PW - 5, 0, 5, PH);
  g.fillStyle = "rgb(226,200,142)"; g.fillRect(5, 5, PW - 10, 1.6); g.fillRect(5, PH - 6.6, PW - 10, 1.6); g.fillRect(5, 5, 1.6, PH - 10); g.fillRect(PW - 6.6, 5, 1.6, PH - 10);
  // La rose des vents, en haut à gauche (hors de la ville, dans le pré).
  const cx = 11 * S, cy = 11 * S, R = 7.2 * S;
  g.fillStyle = "rgba(246,238,214,0.88)"; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.strokeStyle = "rgb(58,42,30)"; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  g.lineWidth = 0.8; g.beginPath(); g.arc(cx, cy, R * 0.78, 0, 7); g.stroke();
  const star = (len, w, col) => { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    poly(g, [[cx + ca * len, cy + sa * len], [cx - sa * w + ca * w, cy + ca * w + sa * w], [cx, cy]], k === 0 ? "rgb(184,56,48)" : col);
    poly(g, [[cx + ca * len, cy + sa * len], [cx + sa * w + ca * w, cy - ca * w + sa * w], [cx, cy]], k === 0 ? "rgb(120,32,28)" : shade2(col)); } };
  star(R * 0.72, R * 0.16, "rgb(88,70,52)");
  g.fillStyle = "rgb(246,238,214)"; g.beginPath(); g.arc(cx, cy, 1.4, 0, 7); g.fill();
  try { g.fillStyle = "rgb(58,42,30)"; g.font = "bold 13px serif"; g.textAlign = "center"; g.fillText("N", cx, cy - R - 3); g.textAlign = "left"; } catch (e) { /* faux canvas : pas de texte */ }
}
const shade2 = (s) => { const m = /(\d+),(\d+),(\d+)/.exec(s); return m ? `rgb(${(+m[1] * 0.7) | 0},${(+m[2] * 0.7) | 0},${(+m[3] * 0.7) | 0})` : s; };
