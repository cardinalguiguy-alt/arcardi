/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-lapins — LA PLANCHE DES LAPINS DE VALLEY TOWN (2026-10-05).
   ╚══════════════════════════════════════════════════════════════════════════
   Quatre robes × toutes les poses, sur de l'herbe, à côté d'un chat et d'une
   fermière (l'échelle se juge contre ses voisins, §4), à ×8. Sortie :
   tools/out/lapins-planche.png. Mesure aussi : la taille de chaque pose et le
   rapport au chat (un lapin de garenne est plus petit qu'un chat adulte).
   Usage : node tools/render-lapins.mjs */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fauneArt"]);
const FA = mods.fauneArt, A = mods.fermeArt;
const S = FA.buildFaunaSprites();
const COATS = FA.RABBIT_COAT_KEYS, POSES = FA.RABBIT_POSE_KEYS;
let fail = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); if (!c) fail++; };

const CW = 20, CH = 17, PAD = 2;
const perRow = 10;
const rowsPerCoat = Math.ceil(POSES.length / perRow);
const W = perRow * (CW + PAD) + PAD + 60, H = COATS.length * rowsPerCoat * (CH + PAD) + PAD;
const sh = makeCanvas(W, H);
const blit = (cell, x, y, flip) => {
  const px = cell.img.__px, aw = cell.img.width;
  for (let j = 0; j < cell.h; j++) for (let i = 0; i < cell.w; i++) {
    const o = ((cell.sy + j) * aw + cell.sx + i) * 4;
    if (px[o + 3] < 8) continue;
    sh.ctx.fillStyle = `rgba(${px[o]},${px[o + 1]},${px[o + 2]},1)`;
    const dx = flip ? cell.w - 1 - i : i;
    sh.ctx.fillRect(x - (flip ? cell.w - cell.ax : cell.ax) + dx, y - cell.ay + j, 1, 1);
  }
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  sh.ctx.fillStyle = ((x + y * 3) % 7 === 0) ? "rgba(104,150,70,1)" : (((x >> 2) + (y >> 2)) % 2 ? "rgba(112,158,76,1)" : "rgba(118,164,80,1)");
  sh.ctx.fillRect(x, y, 1, 1);
}
const stats = {};
COATS.forEach((coat, ci) => POSES.forEach((pose, pi) => {
  const cell = S.rabbit[coat][pose];
  const col = pi % perRow, row = Math.floor(pi / perRow);
  const cx = PAD + col * (CW + PAD), cy = PAD + (ci * rowsPerCoat + row) * (CH + PAD);
  const gx = cx + (cell.ax > 0 ? 10 : 10), gy = cy + CH - 3;
  sh.ctx.fillStyle = "rgba(0,0,0,0.22)"; sh.ctx.fillRect(gx - 5, gy, 10, 1);
  blit(cell, gx, gy + 0, false);
  if (ci === 0) stats[pose] = [cell.w, cell.h];
}));
// Repères d'échelle : un chat (roux, assis) et la fermière.
const cat = S.cat.roux.sit;
blit(cat, W - 46, 30, false);
const CHAR = A.buildSprites().getChar("f", 1, false, false, false, false, false, false, null);
sh.ctx.drawImage(CHAR, 0, 0, 16, 24, W - 24, 8, 16, 24);
const up = scale(sh.px, W, H, 8);
writePNG(path.join(OUT, "lapins-planche.png"), up.px, up.W, up.H);
console.log("tailles (w×h, cerne compris) :", JSON.stringify(stats));
const sit = S.rabbit.fauve.sit;
ok(sit.h - 4 <= 0.85 * (cat.h - 4), "assis, le lapin fait au plus 85 % du chat assis", `lapin ${sit.h - 4} px contre chat ${cat.h - 4} px (cernes retirés)`);
ok(Object.keys(S.rabbit).length === COATS.length, "toutes les robes dans l'atlas");
process.exit(fail ? 1 : 0);
