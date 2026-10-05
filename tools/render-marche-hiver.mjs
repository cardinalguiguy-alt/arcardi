/* =============================================================================
   render-marche-hiver.mjs — LE MARCHÉ D'HIVER DE LA PRAIRIE, REGARDÉ HORS DU JEU (2026-10-05, nuit).
   -----------------------------------------------------------------------------
   Le calque d'hiver (`E.townWinterWorld`) : les étals sortis du champ de foire et
   posés dans la prairie du nord, l'arche entre les tilleuls du boulevard, le
   caillebotis jusqu'au pied de l'escalier ouest, le brasero du coin du feu, les
   guirlandes d'étal en étal. Ce banc peint le VRAI monde d'hiver avec le sol, la
   neige et les sprites du jeu — mais pas la closure du rendu : les décors sont
   posés à la main (bas-centre, triés par rangée), sans lumière ni reflets.
   ⚠️ Ce qu'il ne voit pas : la nuit composée (`lumiere.js`), les personnages, la
   fonte autour du brasero (`setMelts` est appelé par le jeu). Il se juge ENSUITE
   en jeu (§10 de CLAUDE.md).

   Planches : tools/out/marche-hiver-<cm>cm.png, tools/out/marche-hiver-guirlandes.png
   Usage :  node tools/render-marche-hiver.mjs [cm]
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "neige"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, NG = mods.neige;
const S = A.buildSprites();
const tw0 = E.generateTownWorld();
const tw = E.townWinterWorld(tw0);
const T = C.TILE;
const P = { x: 66, y: 13, w: 54, h: 23 };
const cm = Number(process.argv[2] || 12);

let fail = 0, nOk = 0;
const ok = (cond, label, detail) => { console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : "")); if (!cond) fail++; else nOk++; };
console.log("\n=== render-marche-hiver ===\n");

const env = A.townSnowEnv(tw, S, (wx, wy) => {
  const x = Math.floor(wx / T), y = Math.floor(wy / T);
  return x >= 0 && y >= 0 && x < tw.w && y < tw.h && tw.ground[y * tw.w + x] === C.G_WATER;
});
env.makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
ok(typeof env.duckAt === "function", "la neige lit le caillebotis (`duckAt`)");

function paint(cmN, garlandLit, frame) {
  const field = NG.makeSnowField(tw, env);
  const pk = { g: cmN, s: cmN * 1.25 + (cmN > 0 ? 1.5 : 0), r: Math.min(NG.NEIGE.ROAD_CAP, cmN * 0.3), berm: cmN * 1.1, rh: cmN * 0.8, rc: cmN, tl: cmN > 8 ? 0.8 : cmN > 1 ? 0.3 : 0, tc: cmN > 8 ? 0.8 : cmN > 1 ? 0.3 : 0, since: 0 };
  field.setParams(pk, { winter: true, frost: 0, wetRoad: 0.3, sun: 1 });
  field.setMelts(tw.props.filter((p) => p.kind === "brazier").map((p) => ({ x: (p.x + 0.5) * T, y: (p.y + 0.6) * T, r: T * 0.9 })));
  field.view(P.x, P.y, P.x + P.w - 1, P.y + P.h - 1);
  field.update(1e9, () => 0);
  const W = P.w * T, H = P.h * T;
  const sf = makeCanvas(W, H), ctx = sf.ctx;
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const i = y * tw.w + x, g = tw.ground[i], px = (x - P.x) * T, py = (y - P.y) * T;
    if (g === C.G_PATH) A.drawTownRoadTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_PATH_STONE) A.drawTownFlagTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_TOWN_STAIR) A.drawTownStairTile(ctx, S, tw, x, y, px, py);
    else A.drawTownGrassTile(ctx, S, tw, x, y, px, py);
    if (tw.duck[i]) A.drawTownDuckboardTile(ctx, tw, x, y, px, py);
    const sc = field.cell(x, y);
    if (sc) ctx.drawImage(sc.img, sc.sx, sc.sy, T, T, px, py, T, T);
  }
  /* ⚠️ Le faux canevas n'honore pas `translate` (CLAUDE.md) : un mandataire décale les coordonnées du MONDE
     vers la planche, pour les deux seules primitives que ces dessins emploient. */
  const OX = -P.x * T, OY = -P.y * T, real = ctx;
  const ctxW = new Proxy(real, {
    get(t, k) {
      if (k === "fillRect") return (x, y, w, h) => t.fillRect(x + OX, y + OY, w, h);
      if (k === "drawImage") return (im, ...a) => (a.length === 2 ? t.drawImage(im, a[0] + OX, a[1] + OY) : a.length === 4 ? t.drawImage(im, a[0] + OX, a[1] + OY, a[2], a[3]) : t.drawImage(im, a[0], a[1], a[2], a[3], a[4] + OX, a[5] + OY, a[6], a[7]));
      const v = t[k]; return typeof v === "function" ? v.bind(t) : v;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  const ctx2 = ctxW;
  // les décors et les arbres, rangée par rangée (l'ancrage au sol)
  const items = [];
  for (const pr of tw.props) {
    if (pr.x < P.x - 3 || pr.x > P.x + P.w + 3 || pr.y < P.y - 1 || pr.y > P.y + P.h + 3) continue;
    items.push({ y: pr.y, x: pr.x, fn: () => {
      const by = (pr.y + 1) * T;
      if (pr.kind === "marketArch") {
        const im = S.townMarketArch, half = im.width / 2, left = pr.side < 0, cxw = ((pr.cx | 0) + 0.5) * T;
        ctx2.drawImage(im, left ? 0 : half, 0, half, im.height, cxw - half + (left ? 0 : half), by - im.height, half, im.height);
        return;
      }
      if (pr.kind === "brazier") {
        const im = S.townBrazier[frame & 3], bty = by - im.height + 1;
        ctx2.drawImage(im, pr.x * T + T / 2 - im.width / 2, bty);
        A.drawBrazierSparks(ctx2, pr.x * T + T / 2, bty + 10, 400 + frame * 110, pr.x * 31 + pr.y);
        return;
      }
      let im = pr.kind === "stall" ? (pr.alt ? S.townStallsAlt : S.townStalls)[pr.v % S.townStalls.length]
        : pr.kind === "barrel" ? S.townBarrel : pr.kind === "sacks" ? S.townSacks : pr.kind === "crate" ? S.townCrate
        : pr.kind === "flowerCart" ? S.townFlowerCart : pr.kind === "bench" ? S.plazaBench : pr.kind === "lamp" ? S.plazaLamp
        : pr.kind === "hangLamp" ? (garlandLit ? S.townHangLamp : S.townHangLampOff || S.townHangLamp)
        : C.TOWN_PLANCHE3_KINDS.has(pr.kind) ? S.townProp3[C.TOWN_PROP_ART[pr.kind]] : null;
      if (!im) return;
      const wMode = NG.WINTER_PROP_MODE[pr.kind];
      if (wMode && NG.winterizePixels) { /* le jeu passe par un cache ; ici, l'image d'été suffit à juger la place */ }
      ctx2.drawImage(im, pr.x * T + T / 2 - im.width / 2 + (pr.ox || 0), by - im.height);
    } });
  }
  for (let y = P.y - 1; y < P.y + P.h + 3; y++) for (let x = P.x - 2; x < P.x + P.w + 2; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const o = tw.objects[y * tw.w + x];
    if (o === C.O_TREE || o === C.O_TREE2) items.push({ y, x, fn: () => A.drawTownTree(ctx2, S, tw, x, y, x * T, y * T, "winter", o, 0, { tl: pk.tl, tc: pk.tc, ground: field.depthAt(x * T + 8, y * T + 8) }) });
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of items) it.fn();
  /* les fanions d'étal en étal (le dessin du jeu, `A.drawStallBunting`), et l'hiver leurs ampoules */
  const bulbs = [], rows = new Map();
  for (const p of tw.props) if (p.kind === "stall") { if (!rows.has(p.y)) rows.set(p.y, []); rows.get(p.y).push(p); }
  for (const [ry, list] of rows) {
    list.sort((a, b) => a.x - b.x);
    for (let k = 0; k + 1 < list.length; k++) {
      const a = list[k], b = list[k + 1];
      if (b.x - a.x > 6) continue;
      A.drawStallBunting(ctx2, a.x * T + T / 2, b.x * T + T / 2, (ry + 1) * T - 62, (ry + 1) * T - 48, k, { bulbs: true, lit: garlandLit, ms: 1000, out: bulbs });
    }
  }
  return { px: sf.px, W, H, bulbs };
}

const day = paint(cm, 0, 0);
{
  const big = scale(day.px, day.W, day.H, 2);
  const file = path.join(OUT, `marche-hiver-${cm}cm.png`);
  writePNG(file, big.px, big.W, big.H);
  console.log("écrit", path.relative(ROOT, file));
}
ok(day.bulbs.length === 0, "le jour, aucune ampoule n'est déclarée allumée");
const night = paint(cm, 1, 2);
ok(night.bulbs.length > 60, "allumées, les cordes des fanions portent des dizaines d'ampoules", `${night.bulbs.length} ampoules`);
{
  // Un gros plan de l'allée (le cœur du marché), où se juge la guirlande
  const AX = C.TOWN_WINTER_MARKET_AX, AXIS = C.TOWN_WINTER_MARKET_AXIS;
  const x0 = (AX - 12 - P.x) * T, y0 = (AXIS - 7 - P.y) * T, w = 24 * T, h = 11 * T;
  const crop = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = ((y0 + y) * night.W + (x0 + x)) * 4, di = (y * w + x) * 4;
    for (let k = 0; k < 4; k++) crop[di + k] = night.px[si + k];
  }
  const big = scale(crop, w, h, 3);
  const file = path.join(OUT, "marche-hiver-guirlandes.png");
  writePNG(file, big.px, big.W, big.H);
  console.log("écrit", path.relative(ROOT, file));
}
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC` : `\n${nOk}/${nOk} — tout passe`);
process.exit(fail ? 1 : 0);
