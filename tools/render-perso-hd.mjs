/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-perso-hd — LES PERSONNAGES EN 32 × 48 (2026-10-23)
   ╚══════════════════════════════════════════════════════════════════════════
   Planches de `components/ferme/persoHdArt.js`, la fermière et le fermier par défaut (tenues 1 et 0) :
   - perso-hd-planche.png : l'ACTUEL (16 × 24 agrandi ×2, donc à la même taille à l'écran), face, dos, profil, puis la marche de
     face (8 images) et de profil (8 images) ;
   - perso-hd-expressions.png : les expressions, de face puis de profil ;
   - perso-hd-bande.png : la bande brute (1 px d'art = 1 px), l'actuel ×2 puis les deux faces, pour la poser dans une capture.
   Usage : node tools/render-perso-hd.mjs */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "persoHdArt"]);
const A = mods.fermeArt, C = mods.fermeConstants, HD = mods.persoHdArt;
const S = A.buildSprites();
const PAL = {
  f: HD.persoHdPalette({ hair: A.CHAR_HAIR_COLORS[1], top: C.OUTFITS[1].shirt }),
  m: HD.persoHdPalette({ hair: A.CHAR_HAIR_COLORS[0], top: C.OUTFITS[0].shirt, pants: C.OUTFITS[0].pants }),
};
const OUTFIT = { f: 1, m: 0 };

function board(file, rows, cols, k) {
  const CW = 36, CH = 52, PAD = 3;
  const W = cols.length * (CW + PAD) + PAD, H = rows.length * (CH + PAD) + PAD;
  const sh = makeCanvas(W, H), g = sh.ctx;
  g.fillStyle = "#d9d2c3"; g.fillRect(0, 0, W, H);
  rows.forEach((r, ri) => cols.forEach((cl, ci) => {
    const x0 = PAD + ci * (CW + PAD), y0 = PAD + ri * (CH + PAD);
    g.fillStyle = cl.old ? "#cbc3b2" : (ri + ci) % 2 ? "#ece6d8" : "#e4ddcd"; g.fillRect(x0, y0, CW, CH);
    if (cl.old) g.drawImage(S.charFrame(r, OUTFIT[r], cl.dir, cl.frame || 0, null), 0, 0, 16, 24, x0 + 2, y0 + 2, 32, 48);
    else HD.drawPersoHD(g, x0 + 2, y0 + 2, { gender: r, dir: cl.dir, frame: cl.frame || 0, expr: cl.expr, pal: PAL[r] });
  }));
  const up = scale(sh.px, W, H, k);
  writePNG(path.join(OUT, file), up.px, up.W, up.H);
  console.log("planche :", path.join("tools", "out", file), W + "×" + H, "×" + k);
}
// 2026-10-24 — la marche à huit images (persoHdArt, « LA MARCHE À HUIT IMAGES ») : l'image 0 debout, puis 1 à 8, de face et de profil
const WALK = [1, 2, 3, 4, 5, 6, 7, 8];
board("perso-hd-planche.png", ["f", "m"], [
  { old: true, dir: 0 }, { dir: 0 }, { dir: 1 }, { dir: 2 },
  ...WALK.map((frame) => ({ dir: 0, frame })), ...WALK.map((frame) => ({ dir: 2, frame })),
], 4);
board("perso-hd-expressions.png", ["f", "m"],
  HD.PERSO_HD_EXPRESSIONS.map((expr) => ({ dir: 0, expr })), 4);
// La même, de profil (lignes 3 et 4 de la planche ci-dessus ne le montrent pas : une seconde planche).
board("perso-hd-expressions-profil.png", ["f", "m"], HD.PERSO_HD_EXPRESSIONS.map((expr) => ({ dir: 2, expr })), 4);
// La marche brute : 6 lignes (fermière face, dos, profil ; fermier face, dos, profil) × 9 images (0 debout, 1 à 8 la foulée) — à
// assembler en animation : 18 images/s, deux par pas de `animT` dans FermeGame.js.
{
  const NF = HD.PERSO_HD_WALK_FRAMES, B = makeCanvas(NF * 32, 6 * 48);
  [["f", 0], ["f", 1], ["f", 2], ["m", 0], ["m", 1], ["m", 2]].forEach(([gender, dir], r) => {
    for (let f = 0; f < NF; f++) HD.drawPersoHD(B.ctx, f * 32, r * 48, { gender, dir, frame: f, pal: PAL[gender] });
  });
  writePNG(path.join(OUT, "perso-hd-marche-brute.png"), B.px, NF * 32, 6 * 48);
}
{
  const B = makeCanvas(3 * 32, 48);
  B.ctx.drawImage(S.charFrame("m", 0, 0, 0, null), 0, 0, 16, 24, 0, 0, 32, 48);
  HD.drawPersoHD(B.ctx, 32, 0, { gender: "f", dir: 0, pal: PAL.f });
  HD.drawPersoHD(B.ctx, 64, 0, { gender: "m", dir: 0, pal: PAL.m });
  writePNG(path.join(OUT, "perso-hd-bande.png"), B.px, 3 * 32, 48);
}
