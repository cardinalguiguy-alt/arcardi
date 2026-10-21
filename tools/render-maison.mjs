/* =============================================================================
   render-maison.mjs — L'INTÉRIEUR DES MAISONS, DESSINÉ COMME LE JEU LE DESSINE
   (2026-10-16 ; docs/PROJETS.md §6, lots 0 et 1)
   -----------------------------------------------------------------------------
   Deux planches, composées avec LES MÊMES FONCTIONS que la zone « home » du jeu :
   le plan (`maison.js`), les cuissons et la liste des dessins (`maisonArt.js`),
   les sprites de meubles rendus par Blender (`public/maison/`, ancres dans
   `maisonSprites.js`) et la fermière du jeu (`S.getChar`, agrandie au plus
   proche voisin : 16 px de dessin par case du MONDE pour elle, `MPX` par case du
   PLAN pour la maison, et une case du plan vaut `HOME_K` cases du monde —
   2026-10-17 : 64 px et ×2, elle est donc agrandie ×2 comme avant).

   1. LA COQUE (`maison-coque-<modèle>.png`) — les trois niveaux de l'étroite
      tels qu'on les trouve au premier passage de porte (vides, sauf le lit et
      la plante morte), pour N1 et N2 : la porte et les fenêtres côté rue sont
      celles de leur façade.
   2. LE TÉMOIN (`maison-temoin-planche.png`) — le rez-de-chaussée meublé :
      ambiance A de jour, la même la nuit (lampes, poêle, lune), ambiance B.
   3. LES OMBRES (`maison-ombres.png`, 2026-10-18). 4. LE LOT 2c (`maison-2c.png`, `maison-muraux.png`, 2026-10-21) : les
      objets de mur accrochés, la nuit appliques allumées puis éteintes à l'interrupteur, les cinq objets peints.
      ⚠️ La nuit est ici un passage sur les pixels (le faux canevas n'a pas de
      mode de composition) ; le jeu passe par sa couche de lumière.

   ⚠️ LES MURS LATÉRAUX ET LA FAÇADE SONT COUPÉS À 35 CM, le mur du fond reste
   plein : dans cette projection, une cloison nord-sud de 2,50 m cache sa
   propre porte (68 px de mur pour 26 px de porte, mesuré au lot 0).

   Usage :  node tools/render-maison.mjs      → tools/out/maison-*.png
   Les sprites : Blender -b -P tools/blender/rendre_meubles.py
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
const SPR = path.join(ROOT, "public", "maison");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "maisonArt", "maison", "maisonSprites", "ombresMaison"]);
const A = mods.fermeArt, MA = mods.maisonArt, H = mods.maison, C = mods.fermeConstants, OM = mods.ombresMaison;
const META = mods.maisonSprites.MEUBLES;
const S = A.buildSprites();
const { MPX, CASE_M } = MA;
const KC = MPX / (C.TILE * H.HOME_K);   // px de maison par px du personnage (2 : 64 px pour 2 cases de 16)
const mk = (w, h) => { const el = document.createElement("canvas"); el.width = w; el.height = h; return el; };

const images = new Map();
function img(nom) {
  if (!images.has(nom)) {
    const f = path.join(SPR, nom + ".png");
    if (!fs.existsSync(f)) { images.set(nom, null); return null; }
    const p = PNG.sync.read(fs.readFileSync(f));
    const c = makeCanvas(p.width, p.height);
    c.px.set(p.data);
    images.set(nom, c);
  }
  return images.get(nom);
}
/* 2026-10-18 — l'alpha d'un sprite (les ombres portées, `ombresMaison.js`). */
const alphas = new Map();
function alphaOf(nom) {
  if (!alphas.has(nom)) {
    const c = img(nom);
    if (!c) { alphas.set(nom, null); return null; }
    const a = new Uint8Array(c.width * c.height);
    for (let i = 0; i < a.length; i++) a[i] = c.px[i * 4 + 3];
    alphas.set(nom, { w: c.width, h: c.height, a });
  }
  return alphas.get(nom);
}
/* LES OMBRES PORTÉES D'UN NIVEAU, comme le jeu les calcule (`ombresMaison.js`) : pièce par pièce, de jour par ses fenêtres,
   de nuit par ses appliques et ses lampes (toutes les pièces allumées, au banc). Rend les canevas du sol, ceux des murs par
   face, et les sources de nuit (pour la passe de lumière du banc). `o.ombres === false` : sans (l'« avant »). */
function ombresDe(plan, L, facade, faces, meubles, nuit, appliques = true) {
  const ff = faces.map(({ f }) => f), fl = faces.map(({ f, bake }) => ({ f, wallPx: bake.wallPx }));
  const occAll = meubles.map((m) => OM.homeOccluder(m, META, alphaOf)).filter(Boolean);
  const sols = [], murs = new Map(), sources = [];
  for (const room of plan.niveaux[L].pieces) {
    const occs = occAll.filter((oc) => {
      const pc = H.homeRoomAt(plan, L, (oc.x0 + oc.x1) / 2 / MPX + MA.HOME_FX0, (oc.y0 + oc.y1) / 2 / MPX + MA.HOME_FY0);
      return pc && pc.id === room.id;
    });
    const lampes = nuit ? occs.filter((oc) => OM.lampeDe(oc.sprite)).map((occ) => ({ occ, lampe: OM.lampeDe(occ.sprite) })) : [];
    const lights = OM.homeRoomLights(plan, L, room, facade, ff, nuit ? "nuit" : "jour", lampes, appliques);   // 2026-10-21 : l'interrupteur (lot 2c)
    if (nuit) for (const lt of lights) {
      const [x, y, z] = lt.pts[0];
      sources.push({ x: x + 3, y: y - z * 0.45, r: lt.r, k: lt.self ? 0.9 : 0.6, c: [255, 196, 120] });
    }
    const r = OM.homeShadowRoom(plan, L, room, occs, lights, fl);
    const force = nuit ? OM.OMBRE_NUIT : OM.OMBRE_JOUR;
    if (r.sol) sols.push({ c: OM.maskCanvas(mk, r.sol, force), x: r.sol.x, y: r.sol.y });
    for (const { fid, m } of r.murs) murs.set(fid, [...(murs.get(fid) || []), { c: OM.maskCanvas(mk, m, force), x: m.x, y: m.y, a: 1 }]);
  }
  return { sols, murs, sources };
}
const CHAR = S.getChar("f", 1, false, false, false, false, false, false, null);

/* Une variante de plan : les sols et les murs d'une pièce remplacés (l'ambiance). */
function avecDeco(plan, L, deco) {
  const p2 = { ...plan, niveaux: plan.niveaux.map((lv, i) => (i !== L ? lv : {
    ...lv, pieces: lv.pieces.map((pc) => (deco[pc.id] ? { ...pc, ...deco[pc.id] } : pc)) })) };
  return p2;
}

function compose(plan, L, look, o = {}) {
  const facade = H.homeFacade(look, plan);
  const floor = MA.bakeHomeFloor(mk, plan, L, H);
  const W = floor.width, Hh = floor.height;
  const cv = makeCanvas(W, Hh), g = cv.ctx;
  g.drawImage(floor, 0, 0);
  const ciel = o.nuit ? [0.30, 0.35, 0.56] : [1, 1, 1];
  // le soleil par les fenêtres de la façade (l'après-midi), de jour
  if (!o.nuit) for (const [a, b] of facade.fenetres[L] || []) {
    const [pa, py] = MA.homePx(a, plan.d), [pb] = MA.homePx(b, plan.d);
    MA.paintSunPool(g, pa, py, pb - pa, MA.pxOfM(1.63), -MA.pxOfM(0.66), 0.9, MA.homePx(0, 0)[0], MA.homePx(plan.w, 0)[0]);
  }
  const faces = H.homeFaces(plan, L).map((f) => ({ f, bake: MA.bakeHomeFace(mk, plan, L, f) }));
  // 2026-10-17 : les équipements de la maison (la nuit, la cheminée est allumée)
  const fixes = H.homeFixes(plan, L, facade).map((f) => (o.nuit && f.sprite === "cheminee" ? { ...f, sprite: "cheminee_allume" } : f));
  const meubles = fixes.concat(o.meubles || H.HOME_DEPART.filter((m) => m.niveau === L));
  const om = o.ombres === false ? null : ombresDe(plan, L, facade, faces, meubles.map((m) => ({ ...m, sprite: m.sprite.replace(/_allume$/, "") })), !!o.nuit, o.appliques !== false);
  if (om) for (const s of om.sols) g.drawImage(s.c, s.x, s.y);
  const items = MA.homeDrawItems(plan, L, {
    H, faces, cutPx: (f) => (f.ext || !o.perso || f.room === (H.homeRoomAt(plan, L, o.perso[0], o.perso[1]) || {}).id ? 1e9 : 0), lows: H.homeLows(plan, L, facade),
    meubles, meta: META, img, ciel, ampoules: o.ampoules || [], mk,
    ombresMur: om ? (f) => om.murs.get(f.id) || [] : null,
    allumees: o.nuit && o.appliques !== false ? new Set(plan.niveaux[L].pieces.map((p) => p.id)) : null,
    // 2026-10-21 (lot 2c) — les objets de mur, peints comme au jeu (`bakeMural`) ; l'horloge à `o.tmin`
    murals: (o.murals || []).map((it) => {
      const sp = H.HOME_MURAUX[it.s], span = H.homeMuralSpan(plan, it), [w, h] = MA.muralPx(sp);
      return { s: it.s, fid: span.f.id, lx: span.x0, z: H.homeMuralZ(plan, L, it.s), w, h };
    }),
    muralImg: (s2, w, h) => MA.bakeMural(mk, s2, w, h), tmin: o.tmin ?? 1170,
  });
  if (o.perso) {
    const [lx, ly] = o.perso;
    const lift = H.homeStairLift(plan, L, lx, ly);
    const [px, py] = MA.homePx(lx, ly);
    const rz = Math.round(lift / CASE_M * MPX);
    items.push({ key: ly, draw: (ctx) => {
      ctx.globalAlpha = 0.25; ctx.fillStyle = "#20160f"; ctx.fillRect(px - 4.5 * KC, py - KC - rz, 9 * KC, 2 * KC); ctx.globalAlpha = 1;
      ctx.drawImage(CHAR, 0, 0, 16, 24, px - 8 * KC, py - 15 * KC - rz, 16 * KC, 24 * KC);   // pieds (ligne de contact, 15 px d'art) sur (px, py)
    } });
  }
  items.sort((a, b) => a.key - b.key);
  for (const it of items) it.draw(g);
  if (o.nuit) nuit(cv, W, Hh, [...(o.lumieres || []), ...(om ? om.sources : [])]);
  return cv;
}

function nuit(cv, W, Hh, lumieres) {
  const px = cv.px;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let lr = 0.17, lg = 0.19, lb = 0.30;
    for (const L of lumieres) {
      const d = Math.hypot(x - L.x, (y - L.y) * 1.15) / L.r;
      if (d >= 1) continue;
      const f = L.k * (1 - d) * (1 - d);
      lr += f * L.c[0] / 255 * 1.25; lg += f * L.c[1] / 255 * 1.25; lb += f * L.c[2] / 255 * 1.25;
    }
    px[i] = Math.min(255, px[i] * lr); px[i + 1] = Math.min(255, px[i + 1] * lg); px[i + 2] = Math.min(255, px[i + 2] * lb);
  }
}

function planche(nom, cvs, k = 1) {   // 2026-10-17 : à 64 px par case, la planche se lit à 1:1 (×2 à 32)
  const gap = 8;
  const W = cvs.reduce((s, c) => s + c.width + gap, gap), Hh = Math.max(...cvs.map((c) => c.height)) + 2 * gap;
  const pl = makeCanvas(W, Hh);
  pl.ctx.fillStyle = "#0e0b09"; pl.ctx.fillRect(0, 0, W, Hh);
  let x = gap;
  for (const c of cvs) { pl.ctx.drawImage(c, x, gap); x += c.width + gap; }
  const big = scale(pl.px, W, Hh, k);
  writePNG(path.join(OUT, nom), big.px, big.W, big.H);
  console.log(nom, big.W + "×" + big.H);
}

fs.mkdirSync(OUT, { recursive: true });
const P = H.PLAN_ETROITE;

// 1. LA COQUE — N1 et N2, trois niveaux, la fermière dans une pièce de chacun.
for (const model of ["n1", "n2"]) {
  const look = { model, variant: "simple" };
  planche(`maison-coque-${model}.png`, [
    compose(P, 0, look, { perso: [3.4, 6.6] }),
    compose(P, 1, look, { perso: [0.45, P.escalier.yHaut + 1.3] }),      // sur la volée de l'étage : elle monte aux combles
    compose(P, 2, look, { perso: [3.0, 4.6] }),
  ]);
}

// 2. LE TÉMOIN — le rez-de-chaussée meublé, sur le VRAI plan.
/* 2026-10-17 : le plan de 9 cases — le séjour commence à 4,5 (3,5 avant) et
   s'arrête à 9 : la composition d'avant glisse d'une case, plus profonde d'autant. */
const DY = P.niveaux[0].pieces.find((p) => p.id === "sejour").rects[0][1] - 3.5;
/* 2026-10-17 (le soir) : la CHEMINÉE tient le mur nord du séjour (équipement de la
   maison) — le canapé lui fait face, dos à la façade, le fauteuil sur le côté. */
const SEJOUR_A = [
  { sprite: "portemanteau", o: "S", lx: 1.6, ly: 7.9 },
  { sprite: "lampadaire", o: "S", lx: 2.32, ly: 4.62 },
  { sprite: "plante_verte", o: "S", lx: 4.42, ly: 4.62 },
  { sprite: "table_basse", o: "S", lx: 3.1, ly: 5.95 },
  { sprite: "fauteuil", o: "W", lx: 4.32, ly: 5.7 },
  { sprite: "canape", o: "N", lx: 2.75, ly: 7.2 },
  { sprite: "gueridon", o: "S", lx: 2.3, ly: 7.35 },
  { sprite: "plante_morte", o: "S", lx: 4.5, ly: 8.3 },
];
const TAPIS = (nom) => ({ sprite: nom, o: "S", lx: 2.6, ly: 5.4 });
const decoA = { entree: { sol: ["ciment", "classique"], murs: { papier: "rayures", lambris: "creme" } },
                sejour: { sol: ["parquet", "chene"], murs: { papier: "fleurs", lambris: "sauge" } } };
const decoB = { entree: { sol: ["ciment", "bleu"], murs: { papier: "toile_bleue", lambris: "bleu" } },
                sejour: { sol: ["parquet", "noyer"], murs: { papier: "vert_anglais", lambris: "bois" } },
                cage: { sol: ["ciment", "bleu"], murs: { papier: "toile_bleue", lambris: "bleu" } } };
const swap = (list, map) => list.map((m) => (map[m.sprite] ? { ...m, sprite: map[m.sprite] } : m));
function temoin(deco, nuitOn, swaps, plus = {}) {
  const plan = avecDeco(P, 0, deco);
  let meubles = swap(SEJOUR_A, swaps);
  if (nuitOn) meubles = swap(meubles, { lampadaire: "lampadaire_allume", gueridon: "gueridon_allume", lampadaire_moutarde: "lampadaire_moutarde_allume" });
  const tapis = TAPIS(swaps.tapis || "tapis");
  // le tapis est à plat : dessiné sous tout, avant la liste
  const lum = [];
  if (nuitOn) {
    // 2026-10-18 : le lampadaire, le guéridon et les appliques viennent des sources des ombres (`ombresDe`)
    const L2 = MA.homePx(3.0 + 0.57, 4.55 + 0.2 - 0.2 / CASE_M); lum.push({ x: L2[0], y: L2[1], r: 2.2 * MPX, k: 0.85, c: [255, 140, 60] });   // le feu
    const L4 = MA.homePx(4.0, 8.6); lum.push({ x: L4[0], y: L4[1], r: 1.6 * MPX, k: 0.35, c: [150, 175, 230] });
  }
  return compose(plan, 0, { model: "n2", variant: "simple" }, { meubles: [tapis, ...meubles].map((m) => ({ ...m, niveau: 0 })), nuit: nuitOn, lumieres: lum, perso: [3.9, 6.95], ...plus });
}
planche("maison-temoin-planche.png", [
  compose(P, 0, { model: "n2", variant: "simple" }, { perso: [3.3, 5.3 + DY] }),
  temoin(decoA, false, {}),
  temoin(decoA, true, {}),
  temoin(decoB, false, { canape: "canape_canard", fauteuil: "fauteuil_vert", tapis: "tapis_bleu", lampadaire: "lampadaire_moutarde" }),
]);

// 3. LES OMBRES PORTÉES (2026-10-18, `ombresMaison.js`) — le séjour témoin, sans puis avec : de jour, de nuit. Recadré
// sur le séjour et agrandi ×2 (une ombre de quatre paliers ne se juge pas à 1:1).
{
  const [x0, y0] = MA.homePx(2.0, 3.4), [x1, y1] = MA.homePx(5.3, 9.5);
  const crop = (cv) => {
    const out = makeCanvas(x1 - x0, y1 - y0);
    out.ctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
    return out;
  };
  planche("maison-ombres.png", [
    crop(temoin(decoA, false, {}, { ombres: false })), crop(temoin(decoA, false, {})),
    crop(temoin(decoA, true, {}, { ombres: false })), crop(temoin(decoA, true, {})),
  ], 2);
}

// 4. LE LOT 2c (2026-10-21) — LES OBJETS DE MUR, L'INTERRUPTEUR, LE FEU. Le séjour témoin avec le paysage et le portrait accrochés
// là où ils tiennent (`maison.homeCanHang` : entre l'interrupteur et le trumeau, à droite du trumeau) : de jour ; la nuit appliques allumées ; la nuit appliques ÉTEINTES (le lampadaire et le guéridon allumés à la main, le feu).
// Recadré et ×2 comme les ombres. Puis les cinq objets, à 1:1 et ×4 (`maison-muraux.png`).
{
  const MURS = [{ u: 1, s: "tableau_paysage", n: 0, x: 50, y: 91 }, { u: 2, s: "tableau_portrait", n: 0, x: 92, y: 91 }];
  const v = MURS.map((it) => H.homeCanHang(P, { m: [], g: [], w: MURS }, it, it.u));
  console.log("  pose des objets du témoin :", v.map((r) => (r.ok ? "ok" : r.raison)).join(", "));
  const [x0, y0] = MA.homePx(2.0, 3.4), [x1, y1] = MA.homePx(5.3, 9.5);
  const crop = (cv) => {
    const out = makeCanvas(x1 - x0, y1 - y0);
    out.ctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
    return out;
  };
  planche("maison-2c.png", [
    crop(temoin(decoA, false, {}, { murals: MURS })),
    crop(temoin(decoA, true, {}, { murals: MURS })),
    crop(temoin(decoA, true, {}, { murals: MURS, appliques: false })),
  ], 2);
  const objs = Object.entries(H.HOME_MURAUX).map(([s2, sp]) => { const [w, h] = MA.muralPx(sp); return MA.bakeMural(mk, s2, w, h); });
  const fond = objs.map((c) => { const b = makeCanvas(c.width + 8, 48); b.ctx.fillStyle = "#e8dcc4"; b.ctx.fillRect(0, 0, b.width, 48); b.ctx.drawImage(c, 4, 4); return b; });
  planche("maison-muraux.png", fond, 4);
}
