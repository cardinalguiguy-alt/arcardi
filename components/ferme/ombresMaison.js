/* =============================================================================
   ombresMaison.js — LES OMBRES PORTÉES DES MEUBLES, DANS LES MAISONS (2026-10-18)
   -----------------------------------------------------------------------------
   « Les objets ont l'air de stickers, donne-leur du volume de manière cohérente.
   Les lampes, les objets posés contre les murs » (Guillaume, 2026-10-18). Ses
   choix sur les leviers proposés : les OMBRES PORTÉES depuis la vraie lumière de
   la pièce, le HALO DES LAMPES tout de suite (l'interrupteur reste au lot 2c),
   une seule livraison.

   CE QUI FAISAIT LE STICKER : un meuble n'avait au sol que son rectangle d'ombre
   de contact (`maisonArt.paintContactShadow`). Rien ne tombait sur le mur derrière
   lui, rien ne dépendait d'où vient la lumière : une bibliothèque contre le mur
   du fond était une image collée sur le papier peint.

   LE MODÈLE — UNE SEULE RÈGLE POUR LE JOUR ET LA NUIT, LE SOL ET LE MUR :
   - LES SOURCES d'une pièce : le jour, ses FENÊTRES (celles de la façade si elle
     la touche, celles de son mur du fond) ; la nuit, si elle est allumée, ses
     APPLIQUES (`maisonArt.homeAppliques`) et ses LAMPES (lampadaire, guéridon).
     Une fenêtre est une source LARGE (trois points le long de sa baie) : la
     lumière du jour fait des ombres douces, qui s'estompent en s'éloignant du
     meuble ; une lampe en a deux, rapprochés : des ombres plus franches.
   - LE MEUBLE vu par la lumière : son EMPRISE au sol (le rectangle de
     `maisonSprites`), extrudée à la hauteur de son SPRITE — la silhouette du rendu
     Blender, colonne par colonne. Le pied d'un lampadaire laisse passer la
     lumière, son abat-jour l'arrête ; le dessous d'une table basse reste clair
     entre ses pieds. Le sprite montre la face ET le dessus empilés (`studio.py` :
     une profondeur p et une hauteur h occupent p + h vers le haut) ; on tasse ses
     rangées de (h + p) à h pour retrouver la hauteur vraie.
   - UN POINT DU SOL (ou du mur du fond) est dans l'ombre d'une source quand le
     segment qui les joint traverse un meuble. La densité est la part de lumière
     perdue, pondérée par l'incidence (Lambert : la lumière rasante compte peu) et,
     pour une lampe, par la distance. Quatre paliers : du pixel, pas du flou.
   - LE MUR DU FOND reçoit l'ombre de ce qui est devant lui : le jour, la lumière
     vient de la façade, l'ombre d'une bibliothèque MONTE sur le mur derrière elle.
     Ses points sont pris à leur place ÉVASÉE (`HOME_FLARE`) : l'ombre suit la
     face telle qu'elle est cuite.

   ⚠️ LES MEUBLES NE CHANGENT PAS : ni leur dessin, ni leur collision. Cette couche
   se peint SOUS eux (le sol) et SUR la face du mur, avant eux.
   ⚠️ PUR : aucun DOM, aucun canevas. Le calcul rend des densités ; le jeu et le
   banc en font chacun leur image (`maskCanvas`, `createImageData` : le faux canevas
   des bancs l'a). C'est un calcul de quelques dizaines de ms par pièce : le JEU LE
   GARDE EN CACHE (une pièce, un mode, ses meubles, ses lampes), jamais par image.
   ========================================================================== */
import { MPX, CASE_M, pxOfM, HOME_FX0, HOME_FY0, HOME_FLARE, homeAppliques } from "./maisonArt";

export const OMBRE_JOUR = 0.46;            // la densité pleine, le jour (la lumière d'une fenêtre est diffuse)
export const OMBRE_NUIT = 0.52;            // la nuit, sous une lampe : plus franche
export const OMBRE_RGB = [24, 17, 30];     // un brun froid : l'ombre vire au violet, comme dans les rendus (`studio.SHADOW_TINT`)
export const FENETRE_Z = [0.90, 2.15];     // la baie par défaut (`maisonArt.paintWallWindow`) ; la cuisine et les bains ont la leur
const PORTE_Z = 2.04;                      // le vantail : sous lui, une porte n'est pas un mur

/* LES LAMPES — le sprite, et la hauteur de son ampoule en part de la hauteur du meuble (l'abat-jour du lampadaire est
   son sommet ; celle du guéridon, la lampe posée sur le plateau). `r` : la portée de sa lumière, en cases du plan. */
export const LAMPES = { lampadaire: { z: 0.86, r: 2.6 }, gueridon: { z: 0.80, r: 1.9 } };
export const lampeDe = (sprite) => { const m = /^(lampadaire|gueridon)/.exec(sprite || ""); return m ? m[1] : null; };

const flarePx = (lx, zPx, xc) => HOME_FLARE * (lx - xc) * zPx;
const X = (lx) => (lx - HOME_FX0) * MPX;   // le repère des images cuites (`homePx`), sans arrondi
const Y = (ly) => (ly - HOME_FY0) * MPX;

/* LE MEUBLE VU PAR LA LUMIÈRE. `m` : { sprite, o, lx, ly } ; `meta` : `maisonSprites.MEUBLES` ; `alpha(nom)` :
   { w, h, a } (l'alpha du sprite, une valeur par pixel) ou null tant qu'il n'est pas chargé. Rend null pour ce qui
   ne porte pas d'ombre (le tapis, à plat ; un objet de mur). */
export function homeOccluder(m, meta, alpha) {
  if (/^tapis|^tableau|^escalier/.test(m.sprite)) return null;
  const mt = meta[m.sprite] && meta[m.sprite][m.o];
  if (!mt) return null;
  const sp = alpha(m.sprite + "_" + m.o);
  if (!sp) return undefined;                                   // pas encore chargé : à refaire
  const fw = mt.fw / CASE_M, fd = mt.fd / CASE_M;
  const pd = pxOfM(mt.fd), h = Math.max(4, mt.ay - pd);
  return {
    id: m.id || m.sprite + "@" + m.lx + "," + m.ly, sprite: m.sprite, u: m.u,   // 2026-10-21 : `u`, le meuble du joueur (sa lampe allumée, son feu)
    x0: X(m.lx), x1: X(m.lx + fw), y0: Y(m.ly), y1: Y(m.ly + fd),
    h, ay: mt.ay, zs: mt.ay / h, sl: X(m.lx) - mt.ax, sp,
  };
}

/* Le segment P → S traverse-t-il le meuble `o` ? Les deux tranches (x, y) de l'emprise bornent le paramètre ; la hauteur
   le borne encore ; puis on regarde la silhouette à quelques points du parcours dans l'emprise. */
function bloque(o, px, py, pz, sx, sy, sz) {
  const dx = sx - px, dy = sy - py, dz = sz - pz;
  let t0 = 0, t1 = 1;
  if (Math.abs(dx) < 1e-9) { if (px < o.x0 || px > o.x1) return false; }
  else { let a = (o.x0 - px) / dx, b = (o.x1 - px) / dx; if (a > b) { const t = a; a = b; b = t; } if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 >= t1) return false; }
  if (Math.abs(dy) < 1e-9) { if (py < o.y0 || py > o.y1) return false; }
  else { let a = (o.y0 - py) / dy, b = (o.y1 - py) / dy; if (a > b) { const t = a; a = b; b = t; } if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 >= t1) return false; }
  if (dz > 1e-9) { const tz = (o.h - pz) / dz; if (tz < t1) t1 = tz; }
  else if (pz > o.h) return false;
  if (t0 >= t1) return false;
  const len = (t1 - t0) * Math.hypot(dx, dy, dz);
  const n = Math.min(12, 2 + Math.ceil(len / 3));
  const { w, h, a } = o.sp;
  for (let i = 0; i < n; i++) {
    const t = t0 + (t1 - t0) * (i + 0.5) / n;
    const c = Math.floor(px + dx * t - o.sl), r = Math.round(o.ay - (pz + dz * t) * o.zs);
    if (c >= 0 && c < w && r >= 0 && r < h && a[r * w + c] > 100) return true;
  }
  return false;
}

/* LES SOURCES D'UNE PIÈCE, dans le repère des images cuites (x, y en px ; z en px au-dessus du sol).
   `mode` : "jour" ou "nuit". `lampes` : [{ occ, lampe }] les lampes ALLUMÉES de la pièce (la nuit). Chaque source :
   { pts: [[x, y, z]…], k, r (px, portée d'une lampe ; 0 : pas d'atténuation), self (l'id du meuble qui la porte) }.
   2026-10-21 (lot 2c) — les lumières sont à la main : `appliques` (faux : l'interrupteur de la pièce est éteint, seules ses
   lampes et son feu éclairent) ; `feux` : [{ occ }] la cheminée ou le poêle qui flambe, une source basse (`FEU_Z`). */
export const FEU_Z = 0.28;   // la hauteur de la flamme, en part de la hauteur du foyer
export function homeRoomLights(plan, L, room, facade, faces, mode, lampes = [], appliques = true, feux = []) {
  const out = [];
  const dedans = (lx, ly) => room.rects.some(([x0, y0, x1, y1]) => lx >= x0 && lx < x1 && ly >= y0 && ly < y1);
  if (mode === "jour") {
    const [za, zh] = room.fenetre ? [room.fenetre.allege, room.fenetre.haut] : FENETRE_Z;
    const zc = pxOfM((za + zh) / 2);
    const baie = (a, b, ly, versSud) => {
      const w = b - a, ys = Y(ly) + (versSud ? 4 : -4);
      out.push({ pts: [0.18, 0.5, 0.82].map((t) => [X(a + w * t), ys, zc]), k: w, r: 0 });
    };
    // la façade (au sud) : ses fenêtres qui donnent dans la pièce
    if (facade) for (const [a, b] of facade.fenetres[L] || []) if (dedans((a + b) / 2, plan.d - 0.1)) baie(a, b, plan.d, false);
    // le mur du fond de la pièce (la cuisine, les bains)
    for (const f of faces) if (f.room === room.id) for (const [a, b] of f.fenetres || []) baie(Math.max(a, f.x0), Math.min(b, f.x1), f.y, true);
  } else {
    for (const f of faces) {
      if (!appliques || f.room !== room.id) continue;
      for (const ap of homeAppliques(plan, L, f)) {
        // la tulipe est à 8 px du mur : la lumière part de là, un peu devant lui
        out.push({ pts: [[X(ap.lx) - 3, Y(f.y) + 8, pxOfM(ap.z)], [X(ap.lx) + 3, Y(f.y) + 8, pxOfM(ap.z)]], k: 1, r: 3.0 * MPX });
      }
    }
    for (const { occ, lampe } of lampes) {
      const cx = (occ.x0 + occ.x1) / 2, cy = (occ.y0 + occ.y1) / 2, z = occ.h * LAMPES[lampe].z;
      out.push({ pts: [[cx - 3, cy, z], [cx + 3, cy, z]], k: 1.2, r: LAMPES[lampe].r * MPX, self: occ.id });
    }
    for (const { occ } of feux) {
      // devant le foyer (son bord sud) : la flamme éclaire la pièce, pas l'intérieur du conduit
      const cx = (occ.x0 + occ.x1) / 2, z = occ.h * FEU_Z;
      out.push({ pts: [[cx - 5, occ.y1 - 2, z], [cx + 5, occ.y1 - 2, z]], k: 1.1, r: 3.2 * MPX, self: occ.id });
    }
  }
  return out;
}

/* LES OMBRES D'UNE PIÈCE. `occs` : les meubles de la pièce (`homeOccluder`) ; `lights` : `homeRoomLights` ; `faces` :
   [{ f, wallPx }] les faces du niveau (on ne garde que celles de la pièce). Rend { sol, murs: [{ fid, m }] } où chaque
   masque est { x, y, w, h, d: Uint8Array } — la densité de 0 à 4 (quatre paliers), dans le repère des images cuites. */
export function homeShadowRoom(plan, L, room, occs, lights, faces) {
  if (!lights.length || !occs.length) return { sol: null, murs: [] };
  const xc = plan.w / 2;
  // un point, toutes les sources : la part de lumière perdue. `n` : la normale de la surface (0 : le sol ; 1 : un mur face au sud).
  const densite = (px, py, pz, mur) => {
    let tot = 0, bl = 0;
    for (const L of lights) for (const [sx, sy, sz] of L.pts) {
      const dx = sx - px, dy = sy - py, dz = sz - pz, dd = Math.hypot(dx, dy, dz) || 1;
      let w = L.k * (mur ? dy : dz) / dd;
      if (w <= 0) continue;
      if (L.r) w /= 1 + (dd / L.r) * (dd / L.r);
      tot += w;
      const minx = Math.min(px, sx), maxx = Math.max(px, sx), miny = Math.min(py, sy), maxy = Math.max(py, sy);
      for (const o of occs) {
        if (o.id === L.self || o.x1 < minx || o.x0 > maxx || o.y1 < miny || o.y0 > maxy) continue;
        if (bloque(o, px, py, pz, sx, sy, sz)) { bl += w; break; }
      }
    }
    return tot > 0 ? Math.round(4 * bl / tot) : 0;
  };
  // LE SOL : la boîte de la pièce, pixel par pixel (au centre du pixel)
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const [x0, y0, x1, y1] of room.rects) { bx0 = Math.min(bx0, x0); by0 = Math.min(by0, y0); bx1 = Math.max(bx1, x1); by1 = Math.max(by1, y1); }
  const sx0 = Math.floor(X(bx0)), sy0 = Math.floor(Y(by0)), sw = Math.ceil(X(bx1)) - sx0, sh = Math.ceil(Y(by1)) - sy0;
  const sol = { x: sx0, y: sy0, w: sw, h: sh, d: new Uint8Array(sw * sh) };
  let rien = true;
  // ⚠️ PAR BLOCS DE 2 × 2 : le pixel du PERSONNAGE (un pixel de maison en est un demi, `HOME_K`). Au pixel de maison, le séjour
  // meublé coûtait 52 ms la nuit (mesuré au banc, 2026-10-18) ; par blocs, quatre fois moins, et l'ombre a le grain du joueur.
  const pose = (d, w, h, i, j, v) => { for (let b = j; b < Math.min(h, j + 2); b++) for (let a = i; a < Math.min(w, i + 2); a++) d[b * w + a] = v; };
  for (let j = 0; j < sh; j += 2) {
    const py = sy0 + j + 1, ly = py / MPX + HOME_FY0;
    for (let i = 0; i < sw; i += 2) {
      const px = sx0 + i + 1, lx = px / MPX + HOME_FX0;
      if (!room.rects.some(([x0, y0, x1, y1]) => lx >= x0 && lx < x1 && ly >= y0 && ly < y1)) continue;
      const v = densite(px, py, 0, false);
      if (v) { pose(sol.d, sw, sh, i, j, v); rien = false; }
    }
  }
  // LE MUR DU FOND de la pièce : chaque rangée de la face est une hauteur, prise à sa place évasée (`bakeHomeFace`)
  const murs = [];
  for (const { f, wallPx } of faces) {
    if (f.room !== room.id) continue;
    const yF = Math.round(Y(f.y)), H = Math.round(wallPx);
    const xa = Math.floor(X(f.x0) + Math.min(0, flarePx(f.x0, H, xc))), xb = Math.ceil(X(f.x1) + Math.max(0, flarePx(f.x1, H, xc)));
    const m = { x: xa, y: yF - H, w: xb - xa, h: H, d: new Uint8Array((xb - xa) * H) };
    const [za, zh] = room.fenetre ? [room.fenetre.allege, room.fenetre.haut] : FENETRE_Z;
    const trous = [...(f.fenetres || []).map(([a, b]) => [a, b, pxOfM(za), pxOfM(zh)]), ...(f.portes || []).map(([a, b]) => [a, b, 0, pxOfM(PORTE_Z)])];
    let ok = false;
    for (let r = 0; r < H; r += 2) {
      const z = H - r - 1, py = Y(f.y) + 0.5;
      for (let i = 0; i < m.w; i += 2) {
        const sxp = xa + i + 1;
        // l'inverse de X(lx) + flarePx(lx, z, xc) : lx = (sx + FX0·MPX + κ·xc·z) / (MPX + κ·z)
        const lx = (sxp + HOME_FX0 * MPX + HOME_FLARE * xc * z) / (MPX + HOME_FLARE * z);
        if (lx < f.x0 || lx >= f.x1) continue;
        if (trous.some(([a, b, z0, z1]) => lx >= a && lx < b && z >= z0 && z < z1)) continue;
        const v = densite(X(lx), py, z, true);
        if (v) { pose(m.d, m.w, m.h, i, r, v); ok = true; }
      }
    }
    if (ok) murs.push({ fid: f.id, m });
  }
  return { sol: rien ? null : sol, murs };
}

/* L'IMAGE D'UN MASQUE : la couleur de l'ombre, l'alpha = densité × force. `mk(w, h)` fabrique un canevas. */
export function maskCanvas(mk, m, force) {
  const c = mk(m.w, m.h), g = c.getContext("2d"), im = g.createImageData(m.w, m.h);
  const [r, gg, b] = OMBRE_RGB;
  for (let i = 0; i < m.d.length; i++) {
    const v = m.d[i];
    if (!v) continue;
    im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b;
    im.data[i * 4 + 3] = Math.round(255 * force * v / 4);
  }
  g.putImageData(im, 0, 0);
  return c;
}
