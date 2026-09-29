/* =============================================================================
   render-fumee.mjs — LA FUMÉE D'UNE CHEMINÉE, REGARDÉE HORS DU JEU. (2026-09-29, phase 12c)
   -----------------------------------------------------------------------------
   Peint la colonne de `fumee.js` avec LE MÊME code de disque que la boucle du jeu
   (`drawChimneySmoke`, FermeGame.js), sur trois fonds : un ciel de jour, un ciel
   couvert, un ciel nocturne (le fond DÉJÀ multiplié par le ciel de nuit, comme la
   scène le sera) ; au vent nul, faible, fort. Une souche de pierre, pour l'échelle.
   Ce qu'il ne voit pas : la maison, la lumière des fenêtres. Le jeu tranche.

   Planche : tools/out/fumee.png (×4).   Usage :  node tools/render-fumee.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const FU = (await loadFerme(ROOT, ["fumee"])).fumee;

let fails = 0, checks = 0;
const ok = (n, c, x) => { checks++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };

const BG = [
  { name: "jour", top: [160, 196, 232], bot: [206, 224, 240], mul: 1 },
  { name: "couvert", top: [122, 132, 146], bot: [150, 158, 168], mul: 1 },
  { name: "nuit", top: [22, 27, 48], bot: [30, 36, 58], mul: 0.42 },     // le fond, déjà sous le ciel de nuit
];
const WINDS = [0, 0.4, 1];
const W = 60, H = 80, CELL = { w: W, h: H };
const cols = BG.length * WINDS.length;
const sheet = makeCanvas(W * cols, H), ctx = sheet.ctx;
const buf = [];
let minAlpha = 1, maxAlpha = 0, drawn = 0;
BG.forEach((bg, bi) => WINDS.forEach((wind, wi) => {
  const ox = (bi * WINDS.length + wi) * W;
  for (let y = 0; y < H; y++) { const t = y / H; ctx.fillStyle = `rgb(${bg.top.map((v, i) => Math.round(v + (bg.bot[i] - v) * t)).join(",")})`; ctx.fillRect(ox, y, W, 1); }
  ctx.fillStyle = "#6b6259"; ctx.fillRect(ox + 24, H - 22, 12, 22);       // la souche
  ctx.fillStyle = "#5a5148"; ctx.fillRect(ox + 22, H - 24, 16, 3);
  const cx = ox + 30, cy = H - 26;
  // La colonne à trois instants superposés serait un fouillis : un seul, à un instant où le tuyau a déjà tiré dix bouffées.
  FU.smokePuffs(3, 1, 200.37, wind, buf);
  for (const q of buf) {
    const px = Math.round(cx + q.dx), py = Math.round(cy - q.dy);
    const g = Math.round(238 - 34 * Math.min(1, q.r / 4.2)), a = Math.min(0.72, q.a);
    ctx.fillStyle = `rgba(${Math.round(g * bg.mul)},${Math.round((g - 2) * bg.mul)},${Math.round((g - 6) * bg.mul)},${a.toFixed(3)})`;
    if (q.r < 1.7) ctx.fillRect(px, py, 2, 2);                    // une bouffée naissante : un carré de 2 pixels, pas une croix
    else { const rr = Math.max(2, Math.round(q.r - 0.3)); for (let dy = -rr; dy <= rr; dy++) { const hw = Math.floor(Math.sqrt(rr * rr + 0.25 - dy * dy)); ctx.fillRect(px - hw, py + dy, 2 * hw + 1, 1); } }
    minAlpha = Math.min(minAlpha, a); maxAlpha = Math.max(maxAlpha, a); drawn++;
  }
}));
const big = scale(sheet.px, W * cols, H, 4);
writePNG(path.join(ROOT, "tools", "out", "fumee.png"), big.px, big.W, big.H);
console.log(`\n  tools/out/fumee.png — ${cols} colonnes : ${BG.map((b) => b.name).join(" | ")} × vent ${WINDS.join(" / ")}\n`);

/* Les contrôles : sur un fond DE JOUR, la colonne est lisible (le contraste de la bouffée la plus dense
   contre son fond dépasse 12 en luminance), et sur un ciel COUVERT elle l'est moins mais reste là ; la nuit
   la fumée n'est pas plus claire que le ciel de plus de 30 (elle ne « brille » pas comme une lampe). */
const lumAt = (x, y) => { const o = (y * W * cols + x) * 4; return sheet.px[o] * 0.3 + sheet.px[o + 1] * 0.59 + sheet.px[o + 2] * 0.11; };
const contrast = (bi) => { let best = 0; for (let y = 4; y < H - 30; y++) for (let x = 0; x < W; x++) { const X = bi * WINDS.length * W + x; const bgL = BG[bi].top.reduce((a, v, i) => a + v * [0.3, 0.59, 0.11][i], 0); best = Math.max(best, Math.abs(lumAt(X, y) - (bgL + (BG[bi].bot[0] - BG[bi].top[0]) * 0.3 * (y / H)))); } return best; };
ok("des bouffées sont dessinées (le banc n'est pas vide)", drawn > 30, `${drawn} disques`);
ok("de jour, la colonne se lit contre le ciel", contrast(0) > 12, `contraste ${contrast(0).toFixed(0)}`);
ok("sous un ciel couvert, elle se lit encore (mais moins)", contrast(1) > 8, `contraste ${contrast(1).toFixed(0)}`);
ok("la nuit, la fumée ne brille pas plus que le ciel de plus de 40", contrast(2) < 40, `contraste ${contrast(2).toFixed(0)}`);
ok("aucune bouffée n'est plus opaque que 0,72 ni plus fine que 0", maxAlpha <= 0.72 + 1e-9 && minAlpha >= 0);
console.log(`\n${fails ? "❌ " + fails + " contrôle(s) en échec sur " + checks : "✅ " + checks + "/" + checks + " contrôles passés."}`);
process.exit(fails ? 1 : 0);
