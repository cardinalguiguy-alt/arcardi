/* =============================================================================
   render-foire.mjs — LE CHAMP DE FOIRE, TEL QU'ON LE VERRA. (431)
   -----------------------------------------------------------------------------
   ⚠️⚠️ CE BANC EXISTE PARCE QUE LES DEUX AUTRES NE POUVAIENT PAS RÉPONDRE À LA
   QUESTION POSÉE. `render-echelle` mesure un décor CONTRE UN PERSONNAGE, et il a
   raison de le faire (429) ; `render-tribunal` aligne les meubles sur leur sol.
   Ni l'un ni l'autre ne dit à quoi ressemble une RANGÉE d'étals — or c'est
   exactement la demande de Guillaume (« embellis le marché »), et exactement ce
   que le 426 avait raté en croyant l'avoir fait : dix barnums corrects mis bout
   à bout ne font pas une foire, et on ne peut pas le voir en les regardant un
   par un.

   Ce que le fichier dessine, et pourquoi ces trois planches-là :

   1. LA RANGÉE, sur son dallage, avec les guirlandes de fanions tendues d'un
      étal à l'autre et des clients devant. ⚠️ LES GUIRLANDES SONT RECOPIÉES DE
      drawTownFrame — elles ne sont pas un sprite, elles se calculent au rendu
      (une corde relie deux choses, elle n'est posée nulle part). C'est une
      duplication, et on la dit : les deux courbes doivent rester identiques.
      L'alternative — ne pas les montrer — reviendrait à ne jamais regarder ce
      qui fait le plus pour l'image.
   2. L'ARCHE, avec sa moitié gauche et sa moitié droite dessinées SÉPARÉMENT
      comme le fait le jeu, et l'écartement réel des deux poteaux. C'est le seul
      moyen de vérifier que la couture ne se voit pas.
   3. LES SIX MÉTIERS EN GROS PLAN, chacun avec une fermière à côté.

   ⚠️ AUCUN TEXTE N'EST DESSINÉ ICI. `ctx.fillText` n'est pas rastérisable hors
   navigateur (§4 de CLAUDE.md) : le nom du marché s'écrit VIVANT au rendu, donc
   le panneau de l'arche est vide sur cette planche — et c'est normal.

   Usage :  node tools/render-foire.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt;
const C = mods.fermeConstants;
const E = mods.fermeEngine;
const S = A.buildSprites();
const T = 16;

const CHARS = [
  S.getChar("f", 1, false, false, false, false, false, false, null),
  S.getChar("m", 3, true, false, false, false, false, false, null),
  S.getChar("f", 5, false, true, false, false, false, false, null),
];

/* Le dallage de la place, repris À L'IDENTIQUE de drawTownFrame (cas
   G_PATH_STONE). Un fond « à peu près » ne prouverait rien : c'est sur CE gris
   que les bâches doivent ressortir. */
function paveStone(g, W, H) {
  for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) {
    const tx = (x / T) | 0, ty = (y / T) | 0;
    const v = ((tx * 41 + ty * 23) % 5);
    g.fillStyle = ((tx + ty) % 2 === 0) ? ["#b3b2b8", "#b6b5bb", "#afaeb4", "#b1b0b6", "#b4b3b9"][v]
                                        : ["#a5a4ab", "#a8a7ae", "#a2a1a8", "#a6a5ac", "#a3a2a9"][v];
    g.fillRect(x, y, T, T);
    g.fillStyle = "rgba(255,255,255,0.13)"; g.fillRect(x, y, T, 1); g.fillRect(x, y, 1, T);
    g.fillStyle = "rgba(60,58,66,0.16)"; g.fillRect(x, y + T - 1, T, 1); g.fillRect(x + T - 1, y, 1, T);
  }
}

function shadow(g, cx, by, rx) {
  g.fillStyle = "rgba(20,26,16,0.22)";
  g.beginPath(); g.ellipse(cx, by - 2, rx, 3.5, 0, 0, 7); g.fill();
}

/* ⚠️ RECOPIE ASSUMÉE DE drawTownFrame (zip 431) — voir l'en-tête. Les deux
   courbes doivent rester identiques : sinon ce banc validerait une guirlande
   que le jeu ne dessine pas. */
const FLAGS = ["#c05442", "#e0c463", "#4a9a58", "#3f79c0", "#c05c96", "#e08a3a"];
function bunting(g, ax, bx, topY, k, mastTo) {
  const seg = 14, sag = 8;
  g.fillStyle = "#6a4726";
  for (const mx of [ax, bx]) g.fillRect(mx - 1, topY, 2, mastTo - topY);
  g.fillStyle = "#d8b45a";
  for (const mx of [ax, bx]) g.fillRect(mx - 1, topY - 2, 2, 2);
  g.strokeStyle = "rgba(80,66,44,0.85)"; g.lineWidth = 1;
  g.beginPath();
  for (let s = 0; s <= seg; s++) {
    const t = s / seg, cx = ax + (bx - ax) * t, cy = topY + Math.sin(Math.PI * t) * sag;
    if (s === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
  }
  g.stroke();
  for (let s = 1; s < seg; s++) {
    const t = s / seg, cx = ax + (bx - ax) * t, cy = topY + Math.sin(Math.PI * t) * sag;
    g.fillStyle = FLAGS[(k * 3 + s) % FLAGS.length];
    g.beginPath(); g.moveTo(cx - 2.5, cy); g.lineTo(cx + 2.5, cy); g.lineTo(cx, cy + 6); g.fill();
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(cx - 2.5, cy, 5, 1);
  }
}

/* ---- PLANCHE 1 : la rangée, comme le générateur la pose (un étal tous les
   QUATRE pas), avec ses guirlandes et trois passants. */
{
  const N = 6, STEP = 4 * T, W = STEP * N + 64, H = 150;
  const v = makeCanvas(W, H);
  const g = v.ctx;
  paveStone(g, W, H);
  const ground = H - 22;
  const xs = [];
  for (let i = 0; i < N; i++) xs.push(32 + i * STEP);
  // Les étals d'abord, les guirlandes ensuite : dans le jeu la corde est mise
  // en file APRÈS les props, donc elle passe devant les bâches.
  xs.forEach((x, i) => {
    const im = S.townStalls[i % S.townStalls.length];
    shadow(g, x, ground, im.width * 0.28);
    g.drawImage(im, x - im.width / 2, ground - im.height);
  });
  for (let i = 0; i + 1 < N; i++) bunting(g, xs[i], xs[i + 1], ground - 62, i, ground - 48);
  // Les passants, DEVANT les étals : c'est là qu'ils se tiennent pour acheter.
  [0, 2, 4].forEach((i, k) => {
    g.drawImage(CHARS[k % CHARS.length], 0, 0, 16, 24, xs[i] + 12, ground + 2 - 23, 16, 24);
  });
  const up = scale(v.px, W, H, 3);
  writePNG(path.join(OUT, "foire-rangee-431.png"), up.px, up.W, up.H);
}

/* ---- PLANCHE 2 : l'arche, dessinée EN DEUX MOITIÉS comme dans le jeu, avec
   l'écartement réel des poteaux (cinq cases) et quelqu'un qui passe dessous. */
{
  const W = 220, H = 130;
  const v = makeCanvas(W, H);
  const g = v.ctx;
  paveStone(g, W, H);
  const ground = H - 18, im = S.townMarketArch, half = im.width / 2;
  const cx = W / 2;
  // Poteau gauche : moitié gauche du sprite. Poteau droit : moitié droite.
  shadow(g, cx - 2.5 * T, ground, 9);
  shadow(g, cx + 2.5 * T, ground, 9);
  g.drawImage(im, 0, 0, half, im.height, cx - half, ground - im.height, half, im.height);
  g.drawImage(im, half, 0, half, im.height, cx, ground - im.height, half, im.height);
  g.drawImage(CHARS[0], 0, 0, 16, 24, cx - 8, ground - 23, 16, 24);
  const up = scale(v.px, W, H, 3);
  writePNG(path.join(OUT, "foire-arche-431.png"), up.px, up.W, up.H);
}

/* ---- PLANCHE 3 : les six métiers en gros plan, chacun avec une fermière, et
   le mobilier de foire au bout. C'est la planche où l'on juge la MARCHANDISE —
   celle qu'on ne voit qu'en s'arrêtant devant l'étal. */
{
  const items = [
    ...S.townStalls.map((im, i) => [im, ["primeur", "poisson", "pain", "fleurs", "fromage", "poterie"][i]]),
    [S.townFlowerCart, "charrette"], [S.townBarrel, "tonneau"], [S.townSacks, "sacs"],
  ];
  const cell = 72, H = 120;
  const W = items.length * cell + 16;
  const v = makeCanvas(W, H);
  const g = v.ctx;
  paveStone(g, W, H);
  const ground = H - 16;
  items.forEach(([im, , ], i) => {
    const cx = 8 + i * cell + cell / 2;
    g.drawImage(CHARS[i % CHARS.length], 0, 0, 16, 24, cx - cell / 2 + 4, ground - 23, 16, 24);
    shadow(g, cx + 6, ground, im.width * 0.28);
    g.drawImage(im, cx + 6 - im.width / 2, ground - im.height);
  });
  g.fillStyle = "rgba(0,0,0,0.30)"; g.fillRect(0, ground, W, 1);
  const up = scale(v.px, W, H, 4);
  writePNG(path.join(OUT, "foire-metiers-431.png"), up.px, up.W, up.H);
}

/* ---- 2026-09-25 (phase 2) — LES DIX ÉTALS DU VRAI CHAMP DE FOIRE SONT TOUS
   DIFFÉRENTS. L'audit l'a vu : six métiers pour dix étals, donc quatre métiers
   deux fois au pixel près. La seconde rangée prend la variante (`alt`). Le
   contrôle lit le VRAI générateur et choisit le sprite exactement comme le jeu
   (`pr.alt ? townStallsAlt : townStalls`), puis compare les images pixel à
   pixel — une égalité de NOM de métier ne dit rien, deux dessins égaux si. */
let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};
{
  const tw = E.generateTownWorld();
  const stalls = tw.props.filter((p) => p.kind === "stall");
  const imgOf = (p) => (p.alt ? S.townStallsAlt : S.townStalls)[(p.v | 0) % S.townStalls.length];
  const sig = (c) => { const d = c.__px || c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619) >>> 0; return c.width + "x" + c.height + ":" + h; };
  const seen = new Map();
  let dup = 0;
  for (const p of stalls) { const k = sig(imgOf(p)); if (seen.has(k)) dup++; seen.set(k, (seen.get(k) || 0) + 1); }
  ok(stalls.length >= 10, "les étals du champ de foire sont bien lus", `${stalls.length} lus`);
  ok(dup === 0, "aucun étal n'est la copie d'un autre", `${seen.size} dessins pour ${stalls.length} étals`);
  // La planche : les deux rangées telles que le générateur les pose.
  const rows = [...new Set(stalls.map((p) => p.y))].sort((a, b) => a - b);
  const xs = stalls.map((p) => p.x), minX = Math.min(...xs), maxX = Math.max(...xs);
  const W = (maxX - minX + 4) * T, H = 150;
  const v = makeCanvas(W, H);
  paveStone(v.ctx, W, H);
  rows.forEach((ry, r) => {
    for (const p of stalls.filter((q) => q.y === ry)) {
      const im = imgOf(p), x = (p.x - minX + 2) * T, ground = 64 + r * 70;
      shadow(v.ctx, x, ground, im.width * 0.28);
      v.ctx.drawImage(im, x - im.width / 2, ground - im.height);
    }
  });
  const up = scale(v.px, W, H, 3);
  writePNG(path.join(OUT, "foire-deux-rangees.png"), up.px, up.W, up.H);
}

console.log("\n=== zip 431 — le champ de foire ===\n");
console.log(`${S.townStalls.length} métiers d'étal · arche ${S.townMarketArch.width}×${S.townMarketArch.height}`);
console.log("Écrit : foire-rangee-431.png · foire-arche-431.png · foire-metiers-431.png · foire-deux-rangees.png\n");
console.log(fail ? fail + " CONTRÔLE(S) EN ÉCHEC\n" : "Tout est bon.\n");
process.exit(fail ? 1 : 0);
