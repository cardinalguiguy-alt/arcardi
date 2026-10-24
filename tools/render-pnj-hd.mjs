/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-pnj-hd — LES PNJ EN 32 × 48, À CÔTÉ DE LEUR 16 × 24 (2026-10-23, lot A)
   ╚══════════════════════════════════════════════════════════════════════════
   Une ligne par PNJ (les costumes de `drawCharFrame`, plus deux habitants ordinaires) : à gauche l'ancien agrandi ×2 (face, dos,
   profil), à droite le fin (`S.getCharHD(…, npc)`). Sortie : tools/out/pnj-hd-planche.png (×3). Usage : node tools/render-pnj-hd.mjs */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const { fermeArt: A } = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const S = A.buildSprites();
// [nom, genre, tenue, look, drapeaux de getChar]
const ROWS = [
  ["habitante", "f", 5, null, {}], ["habitant", "m", 7, null, {}],
  ["Soan", "m", 0, null, { cap: true }], ["Greg", "m", 0, null, { overalls: true }], ["Harald", "m", 6, null, { overalls: true, cap: true }],
  ["Tristan", "m", 2, null, { plaid: true }], ["René", "m", 3, null, { beeSuit: true }], ["Ingrid", "f", 4, null, { cheeseHat: true }],
  ["Jérôme", "m", 5, null, { sugarWorker: true }], ["Carla", "f", 1, "carla", {}], ["Léo", "m", 0, "leo", {}], ["Froufrou", "m", 0, "froufrou", {}],
  ["vandale", "m", 0, "vandal", {}], ["ouvrier", "m", 0, "ouvrier:0", {}], ["chef", "m", 0, "chef:1", {}], ["soudeur", "m", 0, "soudeur:2", {}],
  ["conductrice", "f", 0, "conducteur:3", {}],
];
const CW = 34, CH = 50, P = 3, NC = 7, GAP = 6;
const W = NC * (CW + P) + P + GAP, H = ROWS.length * (CH + P) + P;
const sh = makeCanvas(W, H), g = sh.ctx;
g.fillStyle = "#d9d2c3"; g.fillRect(0, 0, W, H);
ROWS.forEach(([, gender, outfit, look, fl], ri) => {
  const hd = S.getCharHD(gender, outfit, look, false, "neutre", Object.keys(fl).length ? fl : true);
  const y0 = P + ri * (CH + P);
  for (let ci = 0; ci < 6; ci++) {
    const x0 = P + ci * (CW + P) + (ci >= 3 ? GAP : 0), dir = ci % 3;
    g.fillStyle = ci < 3 ? "#cbc3b2" : (ri + ci) % 2 ? "#ece6d8" : "#e4ddcd"; g.fillRect(x0, y0, CW, CH);
    if (ci < 3) g.drawImage(S.charFrame(gender, outfit, dir, 0, look, fl), 0, 0, 16, 24, x0 + 1, y0 + 1, 32, 48);
    else if (hd) g.drawImage(hd, 0, dir * 48, 32, 48, x0 + 1, y0 + 1, 32, 48);
  }
});
const up = scale(sh.px, W, H, 3);
writePNG(path.join(ROOT, "tools", "out", "pnj-hd-planche.png"), up.px, up.W, up.H);
console.log("planche : tools/out/pnj-hd-planche.png —", ROWS.map((r) => r[0]).join(", "));
