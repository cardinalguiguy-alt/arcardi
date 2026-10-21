/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-coiffure — LA PLANCHE DU SALON DE COIFFURE (2026-10-21).
   ╚══════════════════════════════════════════════════════════════════════════
   Les onze coupes (`C.HAIR_CUTS`, dessin : `components/ferme/coiffureArt.js`) sur la fermière ET le fermier, dans leurs trois vues
   et au pas ; puis les douze couleurs, les quatre barbes, et les coupes sous trois chapeaux et sous un col (ce qui retombe sur les
   épaules doit repasser devant). Sorties : tools/out/coiffure-planche.png, coiffure-couleurs.png, coiffure-chapeaux.png.
   ⚠️ Elle se JUGE à l'œil, elle ne mesure rien. Usage : node tools/render-coiffure.mjs */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt, C = mods.fermeConstants;
const S = A.buildSprites();
const look = (h, w) => ((w ? C.wardrobeLook({ hat: 0, scarf: 0, outfit: 0, tint: 0, ...w }) : null) || "") + C.hairLook(h) || null;
function board(file, rws, cols, k) {
  const CW = 20, CH = 28, PAD = 2;
  const W = cols.length * (CW + PAD) + PAD, H = rws.length * (CH + PAD) + PAD;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#e9e2d4"; sh.ctx.fillRect(0, 0, W, H);
  rws.forEach((r, ri) => cols.forEach((cl, ci) => {
    const x0 = PAD + ci * (CW + PAD), y0 = PAD + ri * (CH + PAD);
    sh.ctx.fillStyle = (ri + ci) % 2 ? "#f4efe4" : "#ece5d6"; sh.ctx.fillRect(x0, y0, CW, CH);
    sh.ctx.drawImage(cl(r), 0, 0, 16, 24, x0 + 2, y0 + 2, 16, 24);
  }));
  const up = scale(sh.px, W, H, k);
  writePNG(path.join(OUT, file), up.px, up.W, up.H);
  console.log("planche :", path.join("tools", "out", file), W + "×" + H, "px d'art ×" + k);
}
const VIEWS = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [2, 3]];
const fr = (g, o, d, f, lk) => S.charFrame(g, o, d, f, lk);
// 1. les coupes : une rangée par coupe et par genre (0 = la coupe d'origine)
const rows = [];
C.HAIR_CUTS.forEach((ct, i) => { rows.push(["f", 1, look({ c: i })]); rows.push(["m", 0, look({ c: i })]); });
board("coiffure-planche.png", rows, VIEWS.map(([d, f]) => (r) => fr(r[0], r[1], d, f, r[2])), 6);
// 2. les couleurs (une coupe par colonne de couleur), puis les barbes (face, profil, sur le fermier), sur trois coupes
const dyeRows = [2, 7, 9, 11].map((c) => ["f", 1, c]);
board("coiffure-couleurs.png", dyeRows, C.HAIR_DYES.map((_, d) => (r) => fr(r[0], r[1], 0, 0, look({ c: r[2], d }))), 6);
const beardCols = [];
for (let b = 0; b < C.BEARDS.length; b++) for (const d of [0, 2]) beardCols.push((r) => fr("m", 0, d, 0, look({ c: r, d: r === 6 ? 2 : 5, b })));
board("coiffure-barbes.png", [5, 6, 7, 8, 11], beardCols, 6);
// 3. sous les chapeaux et sous un col : haut-de-forme, béret, capeline ; robe du soir + boa ; étole
const hatCols = [{ hat: 3 }, { hat: 1 }, { hat: 2 }, { outfit: 1, scarf: 2 }, { scarf: 3 }, { outfit: 2 }];
const hcols = [];
for (const w of hatCols) for (const d of [0, 1, 2]) hcols.push((r) => fr("f", 1, d, 0, look({ c: r }, w)));
board("coiffure-chapeaux.png", C.HAIR_CUTS.map((_, i) => i), hcols, 5);
// 4. Froufrou, le coiffeur (look "froufrou"), à côté de Carla et de Léo — l'extravagance se juge contre ses voisins
board("coiffure-froufrou.png", [["m", 0, "froufrou"], ["f", 1, "carla"], ["m", 0, "leo"]], VIEWS.map(([d, f]) => (r) => fr(r[0], r[1], d, f, r[2])), 8);
