// ===== Bataille navale — atelier de dessin SVG (PUR, testable Node) =====
// Projection isometrique 2:1 parallele (comme la video de reference) :
//   ecran X = (gx + gy) * K * u
//   ecran Y = (gy - gx) * M * u - z * u
// gx = axe des colonnes (haut-droite), gy = axe des lignes (bas-droite),
// z = hauteur en unites de case. Deux vues dessinees par navire (iso
// volumique + 2D de dessus DISTINCTE) + epaves en morceaux, flammes, fumee,
// ecume. Zero image, tout SVG. Sert aussi a construire le plateau complet
// (boardSVG) injecte par React, et la geometrie (boardGeom) pour l'overlay FX.

export const K = 0.70711, M = 0.40558;
export const NGRID = 10;
const f1 = n => (Math.round(n * 10) / 10).toString();

/* ---------- couleurs ---------- */
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const BURNT = { dark: "#1f1611", light: "#31241a", top: "#3d2d20", line: "rgba(0,0,0,.65)" };
const BURNT_FEAT = { dark: "#241d18", light: "#332a22", top: "#413528", line: "rgba(0,0,0,.6)" };

/* ---------- petites briques SVG ---------- */
function poly(pts, fill, stroke, sw, extra) {
  return `<polygon points="${pts.map(p => f1(p[0]) + "," + f1(p[1])).join(" ")}" fill="${fill}"` +
    (stroke ? ` stroke="${stroke}" stroke-width="${sw || 1}" stroke-linejoin="round"` : "") + (extra || "") + "/>";
}
function ell(cx, cy, rx, ry, fill, extra) {
  return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${fill}"${extra || ""}/>`;
}
function line(x1, y1, x2, y2, col, w, extra) {
  return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="${f1(w)}" stroke-linecap="round"${extra || ""}/>`;
}

/* ---------- clipping d'un polygone par une droite x = s (plan) ---------- */
export function clipX(pts, s, keepBelow) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ain = keepBelow ? a[0] <= s : a[0] >= s;
    const bin = keepBelow ? b[0] <= s : b[0] >= s;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (s - a[0]) / (b[0] - a[0]);
      out.push([s, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
export function shrink(pts, k) {
  let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
  return pts.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
}

/* ============================================================
   Atelier lie a une taille de case u. map(x,y) transforme les
   coordonnees PLAN du navire (x le long, y en travers) en
   coordonnees GRILLE (gx, gy) : il gere position et orientation.
   ============================================================ */
export function Art(u) {
  const pr = (gx, gy, z) => [(gx + gy) * K * u, (gy - gx) * M * u - (z || 0) * u];

  function extrude(gpts, z0, z1, col) {
    let cx = 0, cy = 0; gpts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= gpts.length; cy /= gpts.length;
    let s = "";
    for (let i = 0; i < gpts.length; i++) {
      const a = gpts[i], b = gpts[(i + 1) % gpts.length];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]);
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      if (ny - nx <= 0.0001) continue; // face cachee
      const t = Math.max(0, Math.min(1, (ny - nx) / (Math.hypot(nx, ny) * 1.4142)));
      s += poly([pr(a[0], a[1], z0), pr(b[0], b[1], z0), pr(b[0], b[1], z1), pr(a[0], a[1], z1)],
        mix(col.dark, col.light, t), col.line, 0.8);
    }
    s += poly(gpts.map(p => pr(p[0], p[1], z1)), col.top, col.line, 1);
    return s;
  }

  function cyl(gx, gy, r, z0, z1, colSide, colTop, colLine) {
    const [cx, cy0] = pr(gx, gy, z0), cy1 = pr(gx, gy, z1)[1];
    const rx = r * 1.4142 * K * u, ry = r * 1.4142 * M * u;
    const ln = colLine || "rgba(0,0,0,.5)";
    return `<path d="M ${f1(cx - rx)} ${f1(cy1)} L ${f1(cx - rx)} ${f1(cy0)} A ${f1(rx)} ${f1(ry)} 0 0 0 ${f1(cx + rx)} ${f1(cy0)} L ${f1(cx + rx)} ${f1(cy1)} Z" fill="${colSide}" stroke="${ln}" stroke-width="0.8"/>` +
      ell(cx, cy1, rx, ry, colTop, ` stroke="${ln}" stroke-width="0.8"`);
  }

  return { pr, extrude, cyl, u };
}

/* ============================================================
   DEFINITIONS DES 5 NAVIRES (coordonnees PLAN, x: 0..L, y: 0..B)
   Palette arcardi : kakis feu de camp, aciers froids, anthracite.
   ============================================================ */
export const SHIPS = {
  torpedo: {
    id: "torpedo", L: 2, B: 1, nameFr: "Torpilleur",
    hull: {
      h: 0.30,
      outline: [[0.10, 0.30], [0.22, 0.16], [1.35, 0.10], [1.62, 0.14], [1.92, 0.50], [1.62, 0.86], [1.35, 0.90], [0.22, 0.84], [0.10, 0.70]],
      cols: { dark: "#3c4734", light: "#586549", top: "#78875f", line: "rgba(18,24,12,.6)" },
    },
    feats: [
      { t: "box", x0: 0.20, x1: 0.62, y0: 0.24, y1: 0.40, z0: 0.30, z1: 0.42, cols: { dark: "#272d22", light: "#39412f", top: "#49523a", line: "rgba(0,0,0,.5)" } },
      { t: "box", x0: 0.20, x1: 0.62, y0: 0.60, y1: 0.76, z0: 0.30, z1: 0.42, cols: { dark: "#272d22", light: "#39412f", top: "#49523a", line: "rgba(0,0,0,.5)" } },
      { t: "box", x0: 0.74, x1: 1.20, y0: 0.28, y1: 0.72, z0: 0.30, z1: 0.68, cols: { dark: "#31392a", light: "#48533a", top: "#5f6d4a", line: "rgba(0,0,0,.5)" } },
      { t: "hline", x1p: 0.80, y1p: 0.72, x2p: 1.16, y2p: 0.72, z: 0.56, w: 0.05, col: "#a9c8d8" },
      { t: "cyl", x: 1.44, y: 0.50, r: 0.11, z0: 0.30, z1: 0.47, barrels: [{ a: 0, len: 0.36, z: 0.42 }] },
      { t: "mast", x: 0.97, y: 0.50, z0: 0.68, z1: 1.02, bar: 0.13 },
    ],
    foam: [[1.86, 0.50, 0.16], [1.50, 0.14, 0.11], [1.50, 0.86, 0.11], [0.13, 0.50, 0.12]],
    split: [1.0],
  },

  submarine: {
    id: "submarine", L: 3, B: 1, nameFr: "Sous-marin",
    top2d: "#55636d",
    hull: {
      h: 0.24,
      outline: [[0.10, 0.50], [0.30, 0.28], [0.95, 0.15], [2.05, 0.15], [2.60, 0.26], [2.90, 0.50], [2.60, 0.74], [2.05, 0.85], [0.95, 0.85], [0.30, 0.72]],
      cols: { dark: "#21262a", light: "#333b41", top: "#434e56", line: "rgba(4,8,10,.65)" },
    },
    feats: [
      { t: "box", x0: 0.55, x1: 2.55, y0: 0.43, y1: 0.57, z0: 0.24, z1: 0.27, cols: { dark: "#333b41", light: "#3d464d", top: "#525e67", line: "rgba(4,8,10,.4)" } },
      { t: "box", x0: 1.30, x1: 1.80, y0: 0.35, y1: 0.65, z0: 0.24, z1: 0.80, cols: { dark: "#181d20", light: "#272e33", top: "#374046", line: "rgba(0,0,0,.6)" } },
      { t: "box", x0: 1.36, x1: 1.60, y0: 0.18, y1: 0.82, z0: 0.60, z1: 0.67, cols: { dark: "#14181b", light: "#232a2e", top: "#2f383d", line: "rgba(0,0,0,.55)" } },
      { t: "mast", x: 1.55, y: 0.50, z0: 0.80, z1: 1.10, bar: 0 },
      { t: "mast", x: 1.68, y: 0.50, z0: 0.80, z1: 0.98, bar: 0.08 },
      { t: "box", x0: 0.10, x1: 0.26, y0: 0.46, y1: 0.54, z0: 0.24, z1: 0.58, cols: { dark: "#14181b", light: "#232a2e", top: "#2f383d", line: "rgba(0,0,0,.55)" } },
    ],
    foam: [[2.84, 0.50, 0.13], [1.55, 0.13, 0.10], [1.55, 0.87, 0.10]],
    split: [1.55],
  },

  destroyer: {
    id: "destroyer", L: 3, B: 1, nameFr: "Contre-torpilleur",
    hull: {
      h: 0.38,
      outline: [[0.08, 0.50], [0.14, 0.28], [0.55, 0.16], [2.10, 0.10], [2.55, 0.16], [2.92, 0.50], [2.55, 0.84], [2.10, 0.90], [0.55, 0.84], [0.14, 0.72]],
      cols: { dark: "#353f2d", light: "#4d5940", top: "#68775e", line: "rgba(14,20,9,.6)" },
    },
    feats: [
      { t: "cyl", x: 2.32, y: 0.50, r: 0.15, z0: 0.38, z1: 0.58, barrels: [{ a: 0, len: 0.48, z: 0.52 }] },
      { t: "box", x0: 1.15, x1: 1.75, y0: 0.24, y1: 0.76, z0: 0.38, z1: 0.88, cols: { dark: "#3d472f", light: "#57644a", top: "#75845f", line: "rgba(0,0,0,.5)" } },
      { t: "hline", x1p: 1.22, y1p: 0.76, x2p: 1.68, y2p: 0.76, z: 0.76, w: 0.05, col: "#a9c8d8" },
      { t: "cyl", x: 0.92, y: 0.50, r: 0.10, z0: 0.38, z1: 0.98, cols: { side: "#262b1e", top: "#111409" } },
      { t: "cyl", x: 0.42, y: 0.50, r: 0.13, z0: 0.38, z1: 0.54, barrels: [{ a: Math.PI, len: 0.40, z: 0.49 }] },
      { t: "mast", x: 1.62, y: 0.50, z0: 0.88, z1: 1.34, bar: 0.15 },
    ],
    foam: [[2.86, 0.50, 0.15], [2.20, 0.11, 0.11], [2.20, 0.89, 0.11], [0.10, 0.50, 0.12]],
    split: [1.45],
  },

  cruiser: {
    id: "cruiser", L: 4, B: 1, nameFr: "Croiseur",
    hull: {
      h: 0.42,
      outline: [[0.08, 0.50], [0.12, 0.30], [0.60, 0.16], [2.90, 0.10], [3.45, 0.18], [3.90, 0.50], [3.45, 0.82], [2.90, 0.90], [0.60, 0.84], [0.12, 0.70]],
      cols: { dark: "#363d45", light: "#4c545d", top: "#68717a", line: "rgba(7,10,14,.6)" },
    },
    feats: [
      { t: "cyl", x: 3.18, y: 0.50, r: 0.17, z0: 0.42, z1: 0.64, barrels: [{ a: -0.10, len: 0.55, z: 0.57 }, { a: 0.10, len: 0.55, z: 0.57 }] },
      { t: "cyl", x: 2.56, y: 0.50, r: 0.15, z0: 0.42, z1: 0.60, barrels: [{ a: -0.10, len: 0.50, z: 0.54 }, { a: 0.10, len: 0.50, z: 0.54 }] },
      { t: "box", x0: 1.30, x1: 2.15, y0: 0.24, y1: 0.76, z0: 0.42, z1: 1.00, cols: { dark: "#414a53", light: "#59626c", top: "#767f89", line: "rgba(0,0,0,.5)" } },
      { t: "hline", x1p: 1.38, y1p: 0.76, x2p: 2.08, y2p: 0.76, z: 0.87, w: 0.05, col: "#a9c8d8" },
      { t: "box", x0: 1.45, x1: 1.85, y0: 0.32, y1: 0.68, z0: 1.00, z1: 1.22, cols: { dark: "#4a535c", light: "#626b75", top: "#828b95", line: "rgba(0,0,0,.5)" } },
      { t: "mast", x: 1.65, y: 0.50, z0: 1.22, z1: 1.60, bar: 0.16 },
      { t: "cyl", x: 1.02, y: 0.50, r: 0.11, z0: 0.42, z1: 1.10, cols: { side: "#272c31", top: "#101317" } },
      { t: "cyl", x: 0.46, y: 0.50, r: 0.15, z0: 0.42, z1: 0.60, barrels: [{ a: Math.PI, len: 0.48, z: 0.54 }] },
    ],
    foam: [[3.84, 0.50, 0.16], [3.00, 0.10, 0.12], [3.00, 0.90, 0.12], [0.10, 0.50, 0.14]],
    split: [1.35, 2.60],
  },

  carrier: {
    id: "carrier", L: 5, B: 2, nameFr: "Porte-avions",
    hull: {
      h: 0.50,
      outline: [[0.10, 0.20], [0.35, 0.12], [4.15, 0.12], [4.75, 0.35], [4.92, 0.75], [4.92, 1.30], [4.60, 1.72], [4.05, 1.88], [0.35, 1.88], [0.10, 1.60]],
      cols: { dark: "#333a35", light: "#454e47", top: "#4e564f", line: "rgba(7,11,7,.6)" },
    },
    feats: [
      { t: "dash", x1p: 0.45, y1p: 1.00, x2p: 4.55, y2p: 1.00, z: 0.505, w: 0.06, col: "rgba(232,240,225,.8)", dash: "0.28 0.20" },
      { t: "hline", x1p: 0.40, y1p: 0.34, x2p: 4.35, y2p: 0.30, z: 0.505, w: 0.035, col: "rgba(232,240,225,.35)" },
      { t: "hline", x1p: 0.40, y1p: 1.68, x2p: 4.25, y2p: 1.70, z: 0.505, w: 0.035, col: "rgba(232,240,225,.35)" },
      { t: "box", x0: 2.35, x1: 3.25, y0: 1.50, y1: 1.84, z0: 0.50, z1: 1.28, cols: { dark: "#3a424b", light: "#525b64", top: "#6d767f", line: "rgba(0,0,0,.55)" } },
      { t: "hline", x1p: 2.42, y1p: 1.84, x2p: 3.18, y2p: 1.84, z: 1.13, w: 0.05, col: "#a9c8d8" },
      { t: "mast", x: 2.95, y: 1.67, z0: 1.28, z1: 1.76, bar: 0.16 },
      { t: "heli", x: 1.35, y: 0.62, z: 0.50 },
      { t: "heli", x: 2.20, y: 0.55, z: 0.50 },
      { t: "mast", x: 0.50, y: 1.68, z0: 0.50, z1: 0.88, bar: 0.10 },
    ],
    foam: [[4.86, 1.00, 0.20], [3.50, 0.13, 0.13], [3.50, 1.87, 0.13], [0.13, 0.90, 0.16]],
    split: [1.7, 3.4],
  },
};

export const FLEET_ORDER = ["carrier", "cruiser", "destroyer", "submarine", "torpedo"];

/* ============================================================
   RENDU ISO d'un navire (intact). map(x,y) -> [gx,gy].
   ============================================================ */
export function shipIsoG(art, def, map, opts) {
  const o = opts || {};
  const { pr, extrude } = art;
  const u = art.u;
  const mp = (x, y) => map(x, y);
  let s = "";

  const c = mp(def.L / 2, def.B / 2);
  const [scx, scy] = pr(c[0], c[1], 0);
  s += ell(scx, scy + 0.06 * u, (def.L + def.B) * 0.36 * u, (def.L + def.B) * 0.16 * u, "rgba(4,14,22,.38)");

  s += extrude(def.hull.outline.map(p => mp(p[0], p[1])), 0, def.hull.h, def.hull.cols);

  const feats = def.feats.slice().sort((A, B2) => {
    const ca = featCenter(A), cb = featCenter(B2);
    const ga = mp(ca[0], ca[1]), gb = mp(cb[0], cb[1]);
    return (ga[1] - ga[0]) - (gb[1] - gb[0]);
  });
  for (const ft of feats) s += featIso(art, def, ft, mp);

  for (let i = 0; i < def.foam.length; i++) {
    const fo = def.foam[i];
    const g = mp(fo[0], fo[1]);
    const [fx2, fy2] = pr(g[0], g[1], 0.02);
    s += `<g${o.anim ? ` class="nvFoam" style="animation-delay:${(i * 0.6).toFixed(1)}s"` : ""}>` +
      ell(fx2, fy2, fo[2] * 1.5 * K * u, fo[2] * 1.5 * M * u, "rgba(238,248,255,.75)") +
      ell(fx2 + fo[2] * K * u * 0.9, fy2 + fo[2] * M * u * 0.4, fo[2] * 0.7 * K * u, fo[2] * 0.7 * M * u, "rgba(238,248,255,.5)") + "</g>";
  }
  return `<g${o.cls ? ` class="${o.cls}"` : ""}>${s}</g>`;
}

function featCenter(ft) {
  if (ft.t === "box") return [(ft.x0 + ft.x1) / 2, (ft.y0 + ft.y1) / 2];
  if (ft.t === "cyl") return [ft.x, ft.y];
  if (ft.t === "mast" || ft.t === "heli") return [ft.x, ft.y];
  if (ft.t === "hline" || ft.t === "dash") return [(ft.x1p + ft.x2p) / 2, (ft.y1p + ft.y2p) / 2];
  return [0, 0];
}

function featIso(art, def, ft, mp, burnt) {
  const { pr, extrude, cyl } = art;
  const u = art.u;
  let s = "";
  if (ft.t === "box") {
    const pts = [[ft.x0, ft.y0], [ft.x1, ft.y0], [ft.x1, ft.y1], [ft.x0, ft.y1]].map(p => mp(p[0], p[1]));
    const z1 = burnt ? ft.z0 + (ft.z1 - ft.z0) * 0.62 : ft.z1;
    s += extrude(pts, ft.z0, z1, burnt ? BURNT_FEAT : ft.cols);
  } else if (ft.t === "cyl") {
    const g = mp(ft.x, ft.y);
    const cols = ft.cols || {};
    const z1 = burnt ? ft.z0 + (ft.z1 - ft.z0) * 0.75 : ft.z1;
    s += cyl(g[0], g[1], ft.r, ft.z0, z1,
      burnt ? "#2b2320" : (cols.side || mix(def.hull.cols.dark, "#000000", 0.12)),
      burnt ? "#3a2f26" : (cols.top || def.hull.cols.top), "rgba(0,0,0,.5)");
    if (ft.barrels && !burnt) {
      for (const b of ft.barrels) {
        const ex = ft.x + Math.cos(b.a) * b.len, ey = ft.y + Math.sin(b.a) * b.len * 0.6;
        const g2 = mp(ex, ey);
        const p1 = pr(g[0], g[1], b.z), p2 = pr(g2[0], g2[1], b.z + 0.02);
        s += line(p1[0], p1[1], p2[0], p2[1], "#20261d", 0.075 * u);
      }
    } else if (ft.barrels && burnt) {
      for (const b of ft.barrels) {
        const ex = ft.x + Math.cos(b.a) * b.len * 0.8, ey = ft.y + Math.sin(b.a) * b.len * 0.5;
        const g2 = mp(ex, ey);
        const p1 = pr(g[0], g[1], b.z), p2 = pr(g2[0], g2[1], Math.max(0.1, b.z - 0.22));
        s += line(p1[0], p1[1], p2[0], p2[1], "#171310", 0.07 * u);
      }
    }
  } else if (ft.t === "mast") {
    if (burnt) return "";
    const g = mp(ft.x, ft.y);
    const p1 = pr(g[0], g[1], ft.z0), p2 = pr(g[0], g[1], ft.z1);
    s += line(p1[0], p1[1], p2[0], p2[1], "#242a22", 0.05 * u);
    if (ft.bar) {
      const zb = ft.z0 + (ft.z1 - ft.z0) * 0.72;
      const ga = mp(ft.x, ft.y - ft.bar), gb = mp(ft.x, ft.y + ft.bar);
      const pa = pr(ga[0], ga[1], zb), pb = pr(gb[0], gb[1], zb);
      s += line(pa[0], pa[1], pb[0], pb[1], "#242a22", 0.045 * u);
    }
  } else if (ft.t === "hline" || ft.t === "dash") {
    if (burnt) return "";
    const g1 = mp(ft.x1p, ft.y1p), g2 = mp(ft.x2p, ft.y2p);
    const p1 = pr(g1[0], g1[1], ft.z), p2 = pr(g2[0], g2[1], ft.z);
    const dash = ft.t === "dash" ? ` stroke-dasharray="${ft.dash.split(" ").map(d => f1(parseFloat(d) * u)).join(" ")}"` : "";
    s += line(p1[0], p1[1], p2[0], p2[1], ft.col, ft.w * u, dash);
  } else if (ft.t === "heli") {
    if (burnt) return "";
    const g = mp(ft.x, ft.y);
    const [hx, hy] = pr(g[0], g[1], ft.z + 0.06);
    const gt = mp(ft.x - 0.30, ft.y);
    const [tx, ty] = pr(gt[0], gt[1], ft.z + 0.08);
    s += line(hx, hy, tx, ty, "#20262b", 0.05 * u);
    s += ell(hx, hy, 0.15 * u, 0.09 * u, "#2a3138", ` stroke="rgba(0,0,0,.5)" stroke-width="0.8"`);
    s += ell(hx, hy - 0.02 * u, 0.05 * u, 0.03 * u, "#9fb4c4");
    const R = 0.30 * u;
    s += line(hx - R, hy - 0.10 * u, hx + R, hy - 0.02 * u, "rgba(18,22,26,.85)", 0.035 * u);
    s += line(hx - R * 0.8, hy + 0.04 * u, hx + R * 0.8, hy - 0.16 * u, "rgba(18,22,26,.85)", 0.035 * u);
  }
  return s;
}

/* ============================================================
   RENDU ISO d'une epave (2-3 morceaux + debris + fumee/flammes)
   ============================================================ */
export function shipWreckIsoG(art, def, map, opts) {
  const o = opts || {};
  const { pr, extrude } = art;
  const u = art.u;
  const mp = (x, y) => map(x, y);
  let s = "";

  const c = mp(def.L / 2, def.B / 2);
  const [scx, scy] = pr(c[0], c[1], 0);
  s += ell(scx, scy + 0.04 * u, (def.L + def.B) * 0.42 * u, (def.L + def.B) * 0.19 * u, "rgba(3,9,13,.55)");

  const cuts = def.split;
  const pieces = [];
  if (cuts.length === 1) {
    pieces.push(clipX(def.hull.outline, cuts[0] - 0.06, true));
    pieces.push(clipX(def.hull.outline, cuts[0] + 0.06, false));
  } else {
    pieces.push(clipX(def.hull.outline, cuts[0] - 0.06, true));
    pieces.push(clipX(clipX(def.hull.outline, cuts[0] + 0.06, false), cuts[1] - 0.06, true));
    pieces.push(clipX(def.hull.outline, cuts[1] + 0.06, false));
  }

  const tilts = [-3.2, 2.6, -2.2];
  const sinkK = def.hull.h / 0.42;
  const sinks = [0.16 * sinkK, 0.24 * sinkK, 0.13 * sinkK];
  pieces.forEach((ppts, i) => {
    const sh = shrink(ppts, 0.94);
    const gp = sh.map(p => mp(p[0], p[1]));
    let px = 0, py = 0; gp.forEach(g => { const q = pr(g[0], g[1], 0); px += q[0]; py += q[1]; });
    px /= gp.length; py /= gp.length;
    let inner = extrude(gp, -sinks[i], def.hull.h * 0.72 - sinks[i], BURNT);
    let bx = 0, by = 0; sh.forEach(p => { bx += p[0]; by += p[1]; }); bx /= sh.length; by /= sh.length;
    const gg = mp(bx, by);
    const [ex, ey] = pr(gg[0], gg[1], def.hull.h * 0.72 - sinks[i]);
    inner += ell(ex - 0.08 * u, ey, 0.14 * u, 0.07 * u, "rgba(8,5,3,.55)");
    inner += ell(ex + 0.14 * u, ey - 0.05 * u, 0.10 * u, 0.05 * u, "rgba(8,5,3,.45)");
    const x0 = Math.min(...sh.map(p => p[0])), x1 = Math.max(...sh.map(p => p[0]));
    for (const ft of def.feats) {
      const fc = featCenter(ft);
      if (fc[0] >= x0 && fc[0] <= x1 && (ft.t === "box" || ft.t === "cyl")) {
        inner += featIso(art, def, offsetZ(ft, -sinks[i]), mp, true);
      }
    }
    s += `<g class="nvPiece" transform="rotate(${tilts[i]} ${f1(px)} ${f1(py)})">${inner}</g>`;
  });

  const rnd = mulberry(def.id.length * 7 + 3);
  for (let i = 0; i < 5; i++) {
    const dx2 = rnd() * def.L, dy2 = rnd() * 1.6 - 0.3;
    const g = mp(Math.max(0.1, Math.min(def.L - 0.1, dx2)), dy2 < 0 ? -0.25 : (dy2 > def.B ? def.B + 0.25 : dy2));
    const [qx, qy] = pr(g[0], g[1], 0.02);
    const w = (0.10 + rnd() * 0.10) * u;
    s += `<g${o.anim ? ` class="nvBob" style="animation-delay:${(i * 0.4).toFixed(1)}s"` : ""}>` +
      poly([[qx - w, qy], [qx + w * 0.4, qy - w * 0.35], [qx + w, qy + w * 0.1], [qx - w * 0.2, qy + w * 0.4]], "#241a12", "rgba(0,0,0,.5)", 0.7) + "</g>";
  }

  const hot = mp(cuts[0], def.B / 2);
  const [fxp, fyp] = pr(hot[0], hot[1], def.hull.h * 0.7);
  s += flameG(fxp, fyp, 0.5 * u, o.anim);
  s += smokeG(fxp + 0.1 * u, fyp - 0.2 * u, u, o.anim);
  if (cuts.length > 1) {
    const hot2 = mp(cuts[1], def.B / 2);
    const [fx2, fy2] = pr(hot2[0], hot2[1], def.hull.h * 0.6);
    s += flameG(fx2, fy2, 0.36 * u, o.anim);
    s += smokeG(fx2 - 0.05 * u, fy2 - 0.15 * u, u * 0.8, o.anim);
  }
  return `<g${o.cls ? ` class="${o.cls}"` : ""}>${s}</g>`;
}

function offsetZ(ft, dz) {
  const c = Object.assign({}, ft);
  if (c.z0 != null) c.z0 = c.z0 + dz;
  if (c.z1 != null) c.z1 = c.z1 + dz;
  if (c.z != null) c.z = c.z + dz;
  return c;
}

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* --- flamme persistante (case touchee / epave) --- */
export function flameG(cx, cy, s, anim) {
  const d1 = `M0,0 C ${-0.42 * s},${-0.12 * s} ${-0.34 * s},${-0.72 * s} 0,${-1.05 * s} C ${0.34 * s},${-0.72 * s} ${0.42 * s},${-0.12 * s} 0,0 Z`;
  const d2 = `M0,0 C ${-0.2 * s},${-0.08 * s} ${-0.16 * s},${-0.38 * s} 0,${-0.58 * s} C ${0.16 * s},${-0.38 * s} ${0.2 * s},${-0.08 * s} 0,0 Z`;
  return `<g transform="translate(${f1(cx)},${f1(cy)})"><g${anim ? ' class="nvFlameIn"' : ""}>` +
    `<path d="${d1}" fill="#ff7a1a" opacity=".92"/><path d="${d2}" fill="#ffd23f"/></g></g>`;
}
/* --- colonne de fumee (boucle) --- */
export function smokeG(cx, cy, u, anim) {
  let s = `<g transform="translate(${f1(cx)},${f1(cy)})">`;
  for (let i = 0; i < 3; i++) {
    s += `<circle cx="0" cy="0" r="${f1((0.16 + i * 0.05) * u)}" fill="rgba(30,28,26,.55)"` +
      (anim ? ` class="nvSmokeP" style="animation-delay:${(i * 0.7).toFixed(1)}s"` : ` transform="translate(${f1(i * 2)},${f1(-i * 8)})" opacity="${(0.5 - i * 0.15).toFixed(2)}"`) + "/>";
  }
  return s + "</g>";
}

/* ============================================================
   RENDU 2D DE DESSUS (design distinct, pas un aplatissement)
   ============================================================ */
export function ship2dG(def, u2, map2, opts) {
  const o = opts || {};
  const mp = (x, y) => map2(x, y);
  const pt = p => mp(p[0], p[1]);
  let s = "";

  s += poly(def.hull.outline.map(p => { const q = pt(p); return [q[0] + 0.07 * u2, q[1] + 0.09 * u2]; }), "rgba(2,10,16,.45)");

  const gid = "hull2d_" + def.id + (o.uid || "");
  const baseTop = def.top2d || def.hull.cols.top;
  const c1 = mix(baseTop, "#ffffff", 0.20), c2 = mix(baseTop, "#000000", 0.20);
  s += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`;
  s += poly(def.hull.outline.map(pt), `url(#${gid})`, def.hull.cols.line, 1.2);
  s += poly(shrink(def.hull.outline, 0.88).map(pt), "none", "rgba(0,0,0,.30)", 0.9);
  const a0 = pt([0.25, def.B / 2]), a1 = pt([def.L - 0.28, def.B / 2]);
  s += line(a0[0], a0[1], a1[0], a1[1], "rgba(255,255,255,.10)", 0.05 * u2);

  for (const ft of def.feats) s += feat2d(def, ft, u2, mp);

  const bow = pt([def.L - 0.06, def.B / 2]);
  s += ell(bow[0] + 0.10 * u2, bow[1], 0.14 * u2, 0.10 * u2, "rgba(238,248,255,.55)");
  s += ell(bow[0] + 0.16 * u2, bow[1] + 0.12 * u2, 0.08 * u2, 0.06 * u2, "rgba(238,248,255,.4)");
  return `<g${o.cls ? ` class="${o.cls}"` : ""}>${s}</g>`;
}

function feat2d(def, ft, u2, mp) {
  let s = "";
  const pt = (x, y) => mp(x, y);
  if (ft.t === "box") {
    const pts = [[ft.x0, ft.y0], [ft.x1, ft.y0], [ft.x1, ft.y1], [ft.x0, ft.y1]].map(p => pt(p[0], p[1]));
    s += poly(pts.map(q => [q[0] + 0.03 * u2, q[1] + 0.04 * u2]), "rgba(2,10,16,.35)");
    s += poly(pts, ft.cols.top, "rgba(0,0,0,.45)", 0.9);
    s += poly([[ft.x0, ft.y0], [ft.x1, ft.y0], [ft.x1, ft.y0 + (ft.y1 - ft.y0) * 0.35], [ft.x0, ft.y0 + (ft.y1 - ft.y0) * 0.35]].map(p => pt(p[0], p[1])), "rgba(255,255,255,.10)");
  } else if (ft.t === "cyl") {
    const c = pt(ft.x, ft.y);
    const cols = ft.cols || {};
    if (ft.barrels) {
      for (const b of ft.barrels) {
        const e = pt(ft.x + Math.cos(b.a) * b.len, ft.y + Math.sin(b.a) * b.len);
        s += line(c[0], c[1], e[0], e[1], "#1d231a", 0.09 * u2);
      }
    }
    s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(ft.r * 1.15 * u2)}" fill="${cols.top ? cols.top : mix(def.hull.cols.top, "#000000", 0.25)}" stroke="rgba(0,0,0,.5)" stroke-width="0.9"/>`;
    s += `<circle cx="${f1(c[0] - ft.r * 0.3 * u2)}" cy="${f1(c[1] - ft.r * 0.3 * u2)}" r="${f1(ft.r * 0.45 * u2)}" fill="rgba(255,255,255,.14)"/>`;
  } else if (ft.t === "mast") {
    const c = pt(ft.x, ft.y);
    s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(0.045 * u2)}" fill="#20261d"/>`;
    if (ft.bar) {
      const a = pt(ft.x, ft.y - ft.bar), b = pt(ft.x, ft.y + ft.bar);
      s += line(a[0], a[1], b[0], b[1], "#20261d", 0.04 * u2);
    }
  } else if (ft.t === "hline" || ft.t === "dash") {
    const a = pt(ft.x1p, ft.y1p), b = pt(ft.x2p, ft.y2p);
    const dash = ft.t === "dash" ? ` stroke-dasharray="${ft.dash.split(" ").map(d => f1(parseFloat(d) * u2)).join(" ")}"` : "";
    s += line(a[0], a[1], b[0], b[1], ft.t === "dash" ? ft.col : "rgba(255,255,255,.25)", (ft.w || 0.04) * u2 * 0.8, dash);
  } else if (ft.t === "heli") {
    const c = pt(ft.x, ft.y);
    const t = pt(ft.x - 0.30, ft.y);
    s += line(c[0], c[1], t[0], t[1], "#20262b", 0.05 * u2);
    s += ell(c[0], c[1], 0.14 * u2, 0.10 * u2, "#2a3138", ` stroke="rgba(0,0,0,.5)" stroke-width="0.8"`);
    const R = 0.30 * u2;
    s += line(c[0] - R, c[1] - R * 0.5, c[0] + R, c[1] + R * 0.5, "rgba(18,22,26,.8)", 0.04 * u2);
    s += line(c[0] - R * 0.6, c[1] + R * 0.8, c[0] + R * 0.6, c[1] - R * 0.8, "rgba(18,22,26,.8)", 0.04 * u2);
  }
  return s;
}

/* --- epave 2D --- */
export function shipWreck2dG(def, u2, map2, opts) {
  const o = opts || {};
  const pt = p => map2(p[0], p[1]);
  let s = "";
  const c = map2(def.L / 2, def.B / 2);
  s += ell(c[0], c[1], def.L * 0.62 * u2, def.B * 0.75 * u2, "rgba(3,9,13,.5)");
  const cuts = def.split;
  const pieces = [];
  if (cuts.length === 1) {
    pieces.push(clipX(def.hull.outline, cuts[0] - 0.06, true));
    pieces.push(clipX(def.hull.outline, cuts[0] + 0.06, false));
  } else {
    pieces.push(clipX(def.hull.outline, cuts[0] - 0.06, true));
    pieces.push(clipX(clipX(def.hull.outline, cuts[0] + 0.06, false), cuts[1] - 0.06, true));
    pieces.push(clipX(def.hull.outline, cuts[1] + 0.06, false));
  }
  const tilts = [-4, 3, -3];
  const offs = [[-0.05, -0.10], [0.06, 0.10], [-0.03, 0.12]];
  const gid2 = "wr2d_" + def.id + (o.uid || "");
  s += `<defs><linearGradient id="${gid2}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#3d2d20"/><stop offset="1" stop-color="#241a12"/></linearGradient></defs>`;
  pieces.forEach((ppts, i) => {
    const off = offs[i];
    const pt2 = p => { const q = pt([p[0] + off[0], p[1] + off[1]]); return q; };
    const sh = shrink(ppts, 0.95);
    const gp = sh.map(pt2);
    let px = 0, py = 0; gp.forEach(q => { px += q[0]; py += q[1]; }); px /= gp.length; py /= gp.length;
    let inner = poly(gp, `url(#${gid2})`, "rgba(0,0,0,.6)", 1.1);
    inner += poly(shrink(sh, 0.86).map(pt2), "none", "rgba(0,0,0,.35)", 0.8);
    inner += ell(px - 0.06 * u2, py, 0.11 * u2, 0.07 * u2, "rgba(8,5,3,.6)");
    inner += ell(px + 0.10 * u2, py + 0.05 * u2, 0.07 * u2, 0.05 * u2, "rgba(8,5,3,.5)");
    const x0 = Math.min(...sh.map(p => p[0])), x1 = Math.max(...sh.map(p => p[0]));
    for (const ft of def.feats) {
      const fc = featCenter(ft);
      if (fc[0] >= x0 && fc[0] <= x1 && (ft.t === "box" || ft.t === "cyl")) {
        if (ft.t === "box") {
          inner += poly([[ft.x0, ft.y0], [ft.x1, ft.y0], [ft.x1, ft.y1], [ft.x0, ft.y1]].map(p => pt2(p)), "#453324", "rgba(0,0,0,.5)", 0.8);
        } else {
          const cc = pt2([ft.x, ft.y]);
          inner += `<circle cx="${f1(cc[0])}" cy="${f1(cc[1])}" r="${f1(ft.r * 1.05 * u2)}" fill="#453324" stroke="rgba(0,0,0,.5)" stroke-width="0.8"/>`;
        }
      }
    }
    s += `<g transform="rotate(${tilts[i]} ${f1(px)} ${f1(py)})">${inner}</g>`;
  });
  const rnd = mulberry(def.id.length * 5 + 11);
  for (let i = 0; i < 4; i++) {
    const q = map2(rnd() * def.L, (rnd() * (def.B + 0.5)) - 0.25);
    s += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1((0.05 + rnd() * 0.05) * u2)}" fill="#241a12"/>`;
  }
  const h1 = map2(cuts[0], def.B / 2);
  s += flameG(h1[0], h1[1], 0.34 * u2, o.anim);
  if (cuts.length > 1) { const h2 = map2(cuts[1], def.B / 2); s += flameG(h2[0], h2[1], 0.26 * u2, o.anim); }
  return `<g${o.cls ? ` class="${o.cls}"` : ""}>${s}</g>`;
}

/* ============================================================
   SPRITES AUTONOMES (tray / vignettes)
   ============================================================ */
export function isoSpriteSVG(id, u, wreck, anim) {
  const def = SHIPS[id];
  const art = Art(u);
  const map = (x, y) => [x, y];
  const zTop = 2.0;
  const xs = [], ys = [];
  for (const p of def.hull.outline) {
    const q0 = art.pr(p[0], p[1], -0.4), q1 = art.pr(p[0], p[1], zTop);
    xs.push(q0[0], q1[0]); ys.push(q0[1], q1[1]);
  }
  const minX = Math.min(...xs) - u * 0.7, maxX = Math.max(...xs) + u * 0.7;
  const minY = Math.min(...ys) - u * 0.2, maxY = Math.max(...ys) + u * 0.55;
  const body = wreck ? shipWreckIsoG(art, def, map, { anim }) : shipIsoG(art, def, map, { anim });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(minX)} ${f1(minY)} ${f1(maxX - minX)} ${f1(maxY - minY)}" width="${f1(maxX - minX)}" height="${f1(maxY - minY)}">${body}</svg>`;
}

export function topSpriteSVG(id, u2, wreck, anim) {
  const def = SHIPS[id];
  const pad = 0.55 * u2;
  const w = def.L * u2 + pad * 2, h = Math.max(def.B, 1) * u2 + pad * 2;
  const map2 = (x, y) => [pad + x * u2, pad + y * u2];
  const body = wreck ? shipWreck2dG(def, u2, map2, { anim }) : ship2dG(def, u2, map2, { anim, uid: "_sp" });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(w)} ${f1(h)}" width="${f1(w)}" height="${f1(h)}">${body}</svg>`;
}

/* ============================================================
   PLATEAU COMPLET (pur, injecte par React via innerHTML)
   ============================================================ */
export function p2s(pts) { return pts.map(p => f1(p[0]) + "," + f1(p[1])).join(" "); }

// Geometrie d'un plateau : projection + centres de case (pour l'overlay FX).
export function boardGeom(mode, u, headroom) {
  const iso = mode === "iso";
  const art = Art(u);
  const E = 0.6 * u, MG = 0.5 * u;
  headroom = headroom == null ? 130 : headroom;
  let vb, pt, W, H;
  if (iso) {
    const minX = -6, maxX = 20 * K * u + 6;
    const minY = -10 * M * u - headroom, maxY = 10 * M * u + E + 10;
    vb = [minX, minY, maxX - minX, maxY - minY]; W = vb[2]; H = vb[3];
    pt = (gx, gy, z) => art.pr(gx, gy, z || 0);
  } else {
    W = NGRID * u + MG * 2; H = NGRID * u + MG * 2; vb = [0, 0, W, H];
    pt = (gx, gy) => [MG + gx * u, MG + gy * u];
  }
  const center = (r, c, z) => pt(c + 0.5, r + 0.5, iso ? (z || 0) : 0);
  const shipMap = (r, c, horiz) => iso
    ? (horiz ? (x, y) => [c + x, r + y] : (x, y) => [c + y, r + x])
    : (horiz ? (x, y) => pt(c + x, r + y) : (x, y) => pt(c + y, r + x));
  return { iso, art, E, MG, vb, W, H, pt, center, shipMap, u };
}

// Construit le SVG complet du plateau : eau + tranche + cases (data-r/c) +
// navires (tries loin->pres) + marques persistantes (plouf, flamme/fumee).
// ships : [{ id, r, c, horiz, wreck?, still?, drag? }]
export function boardSVG(opts) {
  const o = Object.assign({ mode: "iso", u: 34, edge: "own", headroom: 130, shots: null, ships: [], ghost: null, aoe: null, aim: false, idSalt: "b" }, opts || {});
  const G = boardGeom(o.mode, o.u, o.headroom);
  const { iso, art, E, MG, vb, pt, center, shipMap } = G;
  const u = o.u;
  const gid = "wat_" + o.idSalt;
  let base = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#1d5a80"/><stop offset="1" stop-color="#0c2940"/></linearGradient></defs>`;
  if (iso) {
    const cornL = pt(0, 0), cornB = pt(0, NGRID), cornR = pt(NGRID, NGRID);
    const cL = o.edge === "own" ? "#8c2f22" : "#232c33", cL2 = o.edge === "own" ? "#6d241a" : "#181f25";
    base += `<polygon points="${p2s([cornL, cornB, [cornB[0], cornB[1] + E], [cornL[0], cornL[1] + E]])}" fill="${cL}"/>`;
    base += `<polygon points="${p2s([cornB, cornR, [cornR[0], cornR[1] + E], [cornB[0], cornB[1] + E]])}" fill="${cL2}"/>`;
    base += `<polygon points="${p2s([[cornL[0], cornL[1] + E], [cornB[0], cornB[1] + E + 4], [cornR[0], cornR[1] + E]])}" fill="rgba(0,0,0,.35)"/>`;
    base += `<polygon points="${p2s([pt(0, 0), pt(NGRID, 0), pt(NGRID, NGRID), pt(0, NGRID)])}" fill="url(#${gid})"/>`;
  } else {
    base += `<rect x="${f1(MG - 6)}" y="${f1(MG - 6)}" width="${f1(NGRID * u + 12)}" height="${f1(NGRID * u + 12)}" rx="10" fill="#0a1d2c"/>`;
    base += `<rect x="${f1(MG)}" y="${f1(MG)}" width="${f1(NGRID * u)}" height="${f1(NGRID * u)}" rx="4" fill="url(#${gid})"/>`;
  }

  const ghostSet = new Set(o.ghost ? o.ghost.cells.map(([r, c]) => r + "," + c) : []);
  const aoeSet = new Set(o.aoe ? o.aoe.map(([r, c]) => r + "," + c) : []);
  const fills = { ok: "rgba(76,195,138,.45)", bad: "rgba(255,80,60,.48)", miss: "rgba(2,13,23,.55)", hit: "rgba(168,34,18,.82)", aoe: "rgba(255,140,50,.38)" };
  let cellsHtml = "", marks = "";
  for (let r = 0; r < NGRID; r++) for (let c = 0; c < NGRID; c++) {
    const pts = [pt(c, r), pt(c + 1, r), pt(c + 1, r + 1), pt(c, r + 1)];
    const tint = ((r * 7 + c * 13) % 4) * 0.012 + ((r + c) % 2 ? 0.030 : 0.004);
    const key = r + "," + c;
    const sh = o.shots && o.shots[r] ? o.shots[r][c] : null;
    let fill = `rgba(255,255,255,${tint.toFixed(3)})`, state = "";
    if (sh === "miss") { fill = fills.miss; state = "miss"; }
    else if (sh === "hit") { fill = fills.hit; state = "hit"; }
    if (ghostSet.has(key)) { fill = o.ghost.ok ? fills.ok : fills.bad; state = o.ghost.ok ? "ok" : "bad"; }
    else if (aoeSet.has(key) && !sh) { fill = fills.aoe; state = "aoe"; }
    cellsHtml += `<polygon class="nvCell" data-r="${r}" data-c="${c}" points="${p2s(pts)}" fill="${fill}"` + (state ? ` data-state="${state}"` : "") + ` stroke="rgba(150,215,255,.16)" stroke-width="0.9"/>`;
    if (sh === "miss") { const [x, y] = center(r, c); marks += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.13 * u)}" fill="rgba(190,225,250,.65)"/>`; }
    else if (sh === "hit") { const [x, y] = center(r, c); marks += flameG(x, y + 0.14 * u, (iso ? 0.52 : 0.44) * u, true) + smokeG(x + 0.06 * u, y - 0.3 * u, u * (iso ? 0.9 : 0.75), true); }
  }

  const sorted = (o.ships || []).slice().sort((a, b) => (a.r - a.c) - (b.r - b.c));
  let shipsHtml = "";
  for (const sp of sorted) {
    const def = SHIPS[sp.id]; if (!def) continue;
    const map = shipMap(sp.r, sp.c, sp.horiz);
    let inner;
    if (iso) inner = sp.wreck ? shipWreckIsoG(art, def, map, { anim: true }) : shipIsoG(art, def, map, { anim: true, cls: sp.still ? "" : "nvShipG" });
    else inner = sp.wreck ? shipWreck2dG(def, u, map, { anim: true, uid: sp.id + o.idSalt }) : ship2dG(def, u, map, { uid: sp.id + o.idSalt });
    shipsHtml += `<g data-ship="${sp.id}"${sp.drag ? ' class="nvShipDrag"' : ""}>${inner}</g>`;
  }

  const aimCls = o.aim ? " aim" : "";
  return `<svg class="naval-svg${aimCls}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f1).join(" ")}" preserveAspectRatio="xMidYMid meet"><g data-layer="base">${base}</g><g data-layer="cells">${cellsHtml}</g><g data-layer="ships">${shipsHtml}</g><g data-layer="marks" pointer-events="none">${marks}</g></svg>`;
}

/* --- sprite missile (pointe en bas, origine = point d'impact) --- */
export function missileSVG(len) {
  const w = len * 0.24;
  return `
    <g class="nvFlameIn"><path d="M ${-w * 0.32} ${-len} C ${-w * 0.5} ${-len - w * 1.4} ${w * 0.5} ${-len - w * 1.4} ${w * 0.32} ${-len} Z" fill="#ffb347"/>
    <path d="M ${-w * 0.18} ${-len} C ${-w * 0.26} ${-len - w * 0.8} ${w * 0.26} ${-len - w * 0.8} ${w * 0.18} ${-len} Z" fill="#ffe9a3"/></g>
    <line x1="${-w * 0.9}" y1="${-len * 1.28}" x2="${-w * 0.55}" y2="${-len * 0.72}" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/>
    <line x1="${w * 0.9}" y1="${-len * 1.18}" x2="${w * 0.55}" y2="${-len * 0.62}" stroke="rgba(255,255,255,.3)" stroke-width="1.4"/>
    <path d="M ${-w / 2} ${-len * 0.92} L ${-w * 1.05} ${-len * 0.7} L ${-w / 2} ${-len * 0.62} Z" fill="#8c2f22"/>
    <path d="M ${w / 2} ${-len * 0.92} L ${w * 1.05} ${-len * 0.7} L ${w / 2} ${-len * 0.62} Z" fill="#7a281c"/>
    <rect x="${-w / 2}" y="${-len * 0.95}" width="${w}" height="${len * 0.72}" rx="${w * 0.3}" fill="#7d858c"/>
    <rect x="${-w / 2}" y="${-len * 0.95}" width="${w * 0.42}" height="${len * 0.72}" rx="${w * 0.2}" fill="rgba(255,255,255,.22)"/>
    <line x1="${-w / 2}" y1="${-len * 0.5}" x2="${w / 2}" y2="${-len * 0.5}" stroke="rgba(0,0,0,.3)" stroke-width="1"/>
    <path d="M ${-w / 2} ${-len * 0.26} C ${-w * 0.4} ${-len * 0.08} ${-w * 0.14} ${0} 0 0 C ${w * 0.14} ${0} ${w * 0.4} ${-len * 0.08} ${w / 2} ${-len * 0.26} Z" fill="#8c2f22"/>
  `;
}
