/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-bonhomme — LA PLANCHE DES ACCESSOIRES DU BONHOMME (2026-10-05).
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume : « les accessoires pourraient être plus précisément posés et adaptés,
   surtout les bonnets et chapeaux ». Un chapeau se juge SUR DES TÊTES DE TAILLES
   DIFFÉRENTES (trois bonshommes : petit, moyen, grand), de PROFIL ET PENCHÉ par
   le dégel, pas sur un seul. Chaque ligne : un chapeau ; chaque colonne : un
   bonhomme (puis le dégel à 0,3 et 0,55). Sortie : tools/out/bonhomme-chapeaux.png.
   Mesure : le chapeau ne dépasse jamais la tête de plus de son bord, ne flotte
   pas au-dessus (aucun pixel de neige entre le bord et le crâne), ne cache pas
   les yeux. Usage : node tools/render-bonhomme.mjs */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt, C = mods.fermeConstants;
const T = C.TILE;
const SIZES = [[0.34, 0.26, 0.2], [0.5, 0.38, 0.28], [0.62, 0.48, 0.36]];
const HATS = ["none", "tophat", "beanie", "bucket", "beret"];
const sheet = (name, rows, cols, scaleK) => {
  const CW = 50, CH = 88, PAD = 2;
  const W = cols.length * (CW + PAD) + PAD, H = rows.length * (CH + PAD) + PAD;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "rgb(222,232,244)"; sh.ctx.fillRect(0, 0, W, H);
  rows.forEach((rw, r) => cols.forEach((cl, i) => {
    const x0 = PAD + i * (CW + PAD), y0 = PAD + r * (CH + PAD);
    sh.ctx.fillStyle = "rgb(205,218,234)"; sh.ctx.fillRect(x0, y0, CW, CH);
    sh.ctx.fillStyle = "rgb(236,242,250)"; sh.ctx.fillRect(x0, y0 + CH - 8, CW, 8);
    A.drawSnowman(sh.ctx, x0 + CW / 2, y0 + CH - 6, rw.balls, { hat: cl.hat, scarf: "red", nose: "carrot", arms: "twigs", extra: "buttons" }, rw.k, T);
  }));
  const up = scale(sh.px, W, H, scaleK);
  writePNG(path.join(OUT, name), up.px, up.W, up.H);
  console.log("planche :", path.join("tools", "out", name), W + "×" + H, "px d'art");
};
const cols = HATS.map((hat) => ({ hat }));
// 1. Les trois tailles, intacts.
sheet("bonhomme-chapeaux.png", SIZES.map((b) => ({ balls: b, k: 0 })), cols, 7);
// 2. Le dégel : le chapeau penche puis tombe (la taille moyenne).
sheet("bonhomme-chapeaux-degel.png", [0.2, 0.4, 0.55, 0.8].map((k) => ({ balls: SIZES[1], k })), cols, 7);
