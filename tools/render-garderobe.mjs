/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-garderobe — LA PLANCHE DES VÊTEMENTS DE LA MAISON GARFIELD (2026-10-21).
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume : « les vêtements doivent être bien détaillés, moins comme des blocs, plus réalistes et beaux ». Un vêtement se juge
   dans ses TROIS vues (face, dos, profil) et EN MARCHE (les quatre images du pas), sur les deux silhouettes (fermière, fermier),
   puis sous les huit couleurs. Chaque ligne : un article ; colonnes : face ×4 images du pas, dos, profil ×2 (repos, pas).
   Sortie : tools/out/garderobe-planche.png (et garderobe-couleurs.png). `SORTIE=nom` change le préfixe (planche « avant »).
   Usage : node tools/render-garderobe.mjs */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt, C = mods.fermeConstants;
const S = A.buildSprites();
const PRE = process.env.SORTIE || "garderobe";
const look = (w) => C.wardrobeLook({ hat: 0, scarf: 0, outfit: 0, tint: 0, ...w });
// [libellé, genre, tenue de base, chaîne]
const rows = [["rien (f)", "f", 1, null], ["rien (m)", "m", 0, null]];
C.WARDROBE_HATS.forEach((it, i) => rows.push([it.id, i % 2 ? "m" : "f", i % 2 ? 0 : 1, look({ hat: i + 1 })]));
C.WARDROBE_SCARVES.forEach((it, i) => rows.push([it.id, i % 2 ? "m" : "f", i % 2 ? 0 : 1, look({ scarf: i + 1 })]));
C.WARDROBE_OUTFITS.forEach((it, i) => { rows.push([it.id + " (f)", "f", 1, look({ outfit: i + 1 })]); rows.push([it.id + " (m)", "m", 0, look({ outfit: i + 1 })]); });
rows.push(["ensemble", "f", 1, look({ hat: 3, scarf: 2, outfit: 1 })]);
rows.push(["ensemble (m)", "m", 0, look({ hat: 1, scarf: 4, outfit: 3 })]);
// les colonnes : [direction, image du pas]
const COLS = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [2, 0], [2, 1], [2, 3]];
function board(file, rws, cols, k) {
  const CW = 20, CH = 28, PAD = 2;
  const W = cols.length * (CW + PAD) + PAD, H = rws.length * (CH + PAD) + PAD;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#e9e2d4"; sh.ctx.fillRect(0, 0, W, H);
  rws.forEach((r, ri) => cols.forEach((cl, ci) => {
    const x0 = PAD + ci * (CW + PAD), y0 = PAD + ri * (CH + PAD);
    sh.ctx.fillStyle = (ri + ci) % 2 ? "#f4efe4" : "#ece5d6"; sh.ctx.fillRect(x0, y0, CW, CH);
    const fr = cl(r);
    sh.ctx.drawImage(fr, 0, 0, 16, 24, x0 + 2, y0 + 2, 16, 24);
  }));
  const up = scale(sh.px, W, H, k);
  writePNG(path.join(OUT, file), up.px, up.W, up.H);
  console.log("planche :", path.join("tools", "out", file), W + "×" + H, "px d'art ×" + k);
}
board(PRE + "-planche.png", rows, COLS.map(([d, f]) => (r) => S.charFrame(r[1], r[2], d, f, r[3])), 6);
// Les huit couleurs (et « rien ») sur la robe, le tailleur, le poncho, la cape et le tutu, de face.
const tints = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const trows = [1, 2, 3, 4, 5].map((o) => ["tenue " + o, o === 3 ? "m" : "f", o === 3 ? 0 : 1, o]);
trows.push(["chapeaux", "f", 1, 0]);
board(PRE + "-couleurs.png", trows, tints.map((t) => (r) => S.charFrame(r[1], r[2], 0, 0,
  r[3] ? look({ outfit: r[3], tint: t }) : look({ hat: [1, 3, 4, 2, 1, 3, 4, 2, 1][t], scarf: [1, 4, 1, 4, 1, 4, 1, 4, 1][t], tint: t }))), 6);
