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
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "maisonArt", "maison", "maisonSprites"]);
const A = mods.fermeArt, MA = mods.maisonArt, H = mods.maison, C = mods.fermeConstants;
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
  const items = MA.homeDrawItems(plan, L, {
    H, faces, cutPx: (f) => (f.ext || !o.perso || f.room === (H.homeRoomAt(plan, L, o.perso[0], o.perso[1]) || {}).id ? 1e9 : 0), lows: H.homeLows(plan, L, facade),
    meubles, meta: META, img, ciel, ampoules: o.ampoules || [],
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
  if (o.nuit) nuit(cv, W, Hh, o.lumieres || []);
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
function temoin(deco, nuitOn, swaps) {
  const plan = avecDeco(P, 0, deco);
  let meubles = swap(SEJOUR_A, swaps);
  if (nuitOn) meubles = swap(meubles, { lampadaire: "lampadaire_allume", gueridon: "gueridon_allume", lampadaire_moutarde: "lampadaire_moutarde_allume" });
  const tapis = TAPIS(swaps.tapis || "tapis");
  // le tapis est à plat : dessiné sous tout, avant la liste
  const lum = [];
  if (nuitOn) {
    const L1 = MA.homePx(2.32 + 0.17, 4.62 + 0.34 - 1.48 / CASE_M); lum.push({ x: L1[0], y: L1[1], r: 2.6 * MPX, k: 1.0, c: [255, 196, 120] });
    const L2 = MA.homePx(3.0 + 0.57, 4.55 + 0.2 - 0.2 / CASE_M); lum.push({ x: L2[0], y: L2[1], r: 2.2 * MPX, k: 0.85, c: [255, 140, 60] });   // le feu
    const L3 = MA.homePx(2.3 + 0.15, 7.35 + 0.39 - 0.8 / CASE_M); lum.push({ x: L3[0], y: L3[1], r: 1.6 * MPX, k: 0.8, c: [255, 190, 110] });
    const L4 = MA.homePx(4.0, 8.6); lum.push({ x: L4[0], y: L4[1], r: 1.6 * MPX, k: 0.35, c: [150, 175, 230] });
  }
  return compose(plan, 0, { model: "n2", variant: "simple" }, { meubles: [tapis, ...meubles].map((m) => ({ ...m, niveau: 0 })), nuit: nuitOn, lumieres: lum, perso: [3.9, 6.95] });
}
planche("maison-temoin-planche.png", [
  compose(P, 0, { model: "n2", variant: "simple" }, { perso: [3.3, 5.3 + DY] }),
  temoin(decoA, false, {}),
  temoin(decoA, true, {}),
  temoin(decoB, false, { canape: "canape_canard", fauteuil: "fauteuil_vert", tapis: "tapis_bleu", lampadaire: "lampadaire_moutarde" }),
]);
