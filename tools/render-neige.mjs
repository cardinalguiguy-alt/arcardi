/* =============================================================================
   render-neige.mjs — LA NEIGE DE VALLEY TOWN, REGARDÉE HORS DU JEU. (2026-09-28, phase 12a)
   -----------------------------------------------------------------------------
   Guillaume : « la qualité graphique de la neige doit être bluffante, les
   ombres, le grain, les textures ». Ce banc peint de VRAIS morceaux de la
   carte (le générateur du jeu), avec le sol du jeu (`A.drawTown*Tile`), la
   neige du jeu (`neige.js` : `makeSnowField`, le même champ que la boucle),
   les clôtures enneigées et les arbres d'hiver du jeu — jamais une recopie.
   ⚠️ Ce qu'il ne voit pas : la lumière de la scène (le multiply du ciel,
   `lumiere.js`), les maisons (des bitmaps : un pavé gris les remplace), les
   personnages. La neige se juge ENSUITE en jeu (§10 de CLAUDE.md).

   Planches : tools/out/neige-<lieu>-<épaisseur>-<ciel>.png (×3).

   Usage :  node tools/render-neige.mjs [lieu] [cm] [soleil|gris]
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
const tw = E.generateTownWorld();
const T = C.TILE;

const PLACES = {
  rue: { x: 6, y: 58, w: 22, h: 14 },        // une rue, des jardins, des haies, un peu de dallage
  jardins: { x: 12, y: 30, w: 22, h: 14 },   // des jardins et des arbres
  /* 2026-10-05 (nuit) — DEUX RUES PAVÉES EN BIAIS (à bord libre, `townRoadField`) : Guillaume, en jeu, à la fonte :
     « un bug autour des routes, c'est trop carré ». La neige classait la rue CASE PAR CASE alors que le pavé est
     peint au contour — ces deux lieux montrent la lisière, la raide (rue de l'ouest) et la douce (rue du nord). */
  biais: { x: 33, y: 118, w: 20, h: 18 },
  nord: { x: 14, y: 31, w: 30, h: 11 },
};
const argPlace = process.argv[2], argCm = process.argv[3], argSky = process.argv[4];
const places = argPlace ? [argPlace] : Object.keys(PLACES);
const depths = argCm ? [Number(argCm)] : [3, 12, 30];
const skies = argSky ? [argSky] : ["soleil"];

/* `FONTE=1` (2026-10-05, nuit) : l'état de la capture de Guillaume — le pré encore blanc, la chaussée déjà nue et
   sans congère (la rue fond la première). Planche : neige-<lieu>-<cm>-<ciel>-fonte.png. */
const FONTE = process.env.FONTE === "1";
function packFor(cm) {
  return { g: cm, s: cm * 1.25 + (cm > 0 ? 1.5 : 0), r: FONTE ? 0 : Math.min(NG.NEIGE.ROAD_CAP, cm * 0.3), berm: FONTE ? 0 : cm * 1.1, rh: cm * 0.8, rc: cm, tl: cm > 8 ? 0.8 : cm > 1 ? 0.3 : 0, tc: cm > 8 ? 0.8 : cm > 1 ? 0.3 : 0, since: 0 };
}

const env = A.townSnowEnv(tw, S, (wx, wy) => {
  const x = Math.floor(wx / T), y = Math.floor(wy / T);
  return x >= 0 && y >= 0 && x < tw.w && y < tw.h && tw.ground[y * tw.w + x] === C.G_WATER;
});
env.makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

function paintPlace(P, cm, sky) {
  const field = NG.makeSnowField(tw, env);
  const pk = packFor(cm);
  field.setParams(pk, { winter: true, frost: 0, wetRoad: Math.min(1, pk.r * 0.5 + (pk.g > 0.5 ? 0.4 : 0)), sun: sky === "soleil" ? 1 : 0 });
  field.view(P.x, P.y, P.x + P.w - 1, P.y + P.h - 1);
  field.update(1e9, () => 0);
  /* Quelques pas : un marcheur qui traverse en diagonale, un autre qui longe la rue. */
  const walkers = NG.makeWalkers();
  const walk = (id, kind, pts) => {
    let t = 0;
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 8);
      for (let s = 0; s <= n; s++) walkers.step(id, kind, (ax + (bx - ax) * s / n) * T, (ay + (by - ay) * s / n) * T, t += 16, field, 1);
    }
  };
  walk("a", "boot", [[P.x + 2.5, P.y + P.h - 2.2], [P.x + 8, P.y + P.h - 5.5], [P.x + 13, P.y + P.h - 6]]);
  walk("c", "paw", [[P.x + 15, P.y + 2.4], [P.x + 18, P.y + 4], [P.x + 20.5, P.y + 3.2]]);
  field.view(P.x, P.y, P.x + P.w - 1, P.y + P.h - 1);
  field.update(1e9, () => 0);
  const W = P.w * T, H = P.h * T;
  const sf = makeCanvas(W, H), ctx = sf.ctx;
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const i = y * tw.w + x, g = tw.ground[i], px = (x - P.x) * T, py = (y - P.y) * T;
    if (g === C.G_PATH) A.drawTownRoadTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_PATH_STONE) A.drawTownFlagTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_TOWN_STAIR) A.drawTownStairTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_WATER) { ctx.fillStyle = "#35608f"; ctx.fillRect(px, py, T, T); }
    else A.drawTownGrassTile(ctx, S, tw, x, y, px, py);
    const sc = field.cell(x, y);
    if (sc) ctx.drawImage(sc.img, sc.sx, sc.sy, T, T, px, py, T, T);
  }
  // Les maisons (des bitmaps dans le jeu) : un pavé, pour que la composition se lise.
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const i = y * tw.w + x;
    if (env.tall(i) && !tw.hedge[i]) { ctx.fillStyle = "#6d6258"; ctx.fillRect((x - P.x) * T, (y - P.y) * T - 10, T, T + 10); }
  }
  // Rangée par rangée : clôtures, arbres (l'ordre du jeu : l'ancrage au sol).
  const mix = (d) => NG.depthSnowMix(d, 0.5);
  for (let y = P.y - 1; y < P.y + P.h + 3; y++) for (let x = P.x - 2; x < P.x + P.w + 2; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x, o = tw.objects[i], px = (x - P.x) * T, py = (y - P.y) * T;
    if (tw.hedge[i]) A.drawTownHedgeTile(ctx, S, tw, x, y, px, py, mix(field.depthAt(x * T + 8, y * T + 8)).a);
    if (o === C.O_TREE || o === C.O_TREE2) A.drawTownTree(ctx, S, tw, x, y, px, py, "winter", o, 0, { tl: pk.tl, tc: pk.tc, ground: field.depthAt(x * T + 8, y * T + 8) });
  }
  return { px: sf.px, W, H };
}

/* ── LES CONTRÔLES ─────────────────────────────────────────────────────────
   Ce que la neige AJOUTE au-dessus d'un dessin (un chapeau, un coussin) est
   exactement ce qu'un cadre trop court découpe en silence (§4 de CLAUDE.md,
   « un canevas découpe en silence ce qui dépasse ») : on vérifie qu'aucun
   dessin enneigé ne touche le bord de son cadre. */
let fail = 0, nOk = 0;
const ok = (cond, label, detail) => { console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : "")); if (!cond) fail++; else nOk++; };
console.log("\n=== render-neige — les cadres de la neige ===\n");
{
  // 1. Les clôtures enneigées : rien sur la rangée du haut de leur cellule (FENCE_OV au-dessus du sol).
  const F = C.TOWN_FENCE, OV = mods.fermeArt.TOWN_FENCE_OV || 30;
  let cells = 0, touched = [];
  for (const style of [F.HEDGE, F.IRON, F.PICKET, F.BOARD, F.WIRE]) for (const shape of ["ew", "ns", "corner", "post"]) {
    const w = 7, h = 7, hedge = new Uint8Array(w * h);
    const cellsOf = { ew: [[2, 3], [3, 3], [4, 3]], ns: [[3, 2], [3, 3], [3, 4]], corner: [[3, 3], [4, 3], [3, 4]], post: [[3, 3]] }[shape];
    for (const [x, y] of cellsOf) hedge[y * w + x] = style;
    const mini = { w, h, hedge, gates: [] };
    for (const sn of [1, 2]) {
      const sf = makeCanvas(T * 3, T + OV + 4);
      A.drawTownHedgeTile(sf.ctx, S, mini, 3, 3, T, OV + 2, sn);
      cells++;
      let top = false;
      const row = process.env.FALSIFY === "cadre" ? 24 : 2;   // la rangée du haut du cadre (OV + 2 − OV = 2) ; falsifié : une rangée où la clôture dessine
      for (let x = 0; x < T * 3; x++) if (sf.px[(row * T * 3 + x) * 4 + 3]) top = true;
      if (top) touched.push(`${style}/${shape}/${sn}`);
    }
  }
  ok(touched.length === 0, "clôtures enneigées : rien au ras du haut de leur cellule", `${cells} cellules lues${touched.length ? " ; touchées : " + touched.join(", ") : ""}`);
  // 2. Les arbres d'hiver : aucun pixel sur le bord de leur canevas, pour chaque essence, taille, état.
  let trees = 0, edge = [];
  for (const k of Object.values(A.TT)) for (const size of ["adult", "young", "planted", "short", "tall"]) for (const lvl of [0, 1, 2]) {
    const c = S.townTreesWinter.get(k, size, lvl, 1, true);
    if (!c) continue;
    trees++;
    const d = c.img.getContext("2d").getImageData(c.sx, c.sy, c.w, c.h).data;
    let hit = false;
    for (let x = 0; x < c.w && !hit; x++) if (d[x * 4 + 3] > 20 || d[((c.h - 1) * c.w + x) * 4 + 3] > 20) hit = true;
    for (let y = 0; y < c.h && !hit; y++) if (d[(y * c.w) * 4 + 3] > 20 || d[(y * c.w + c.w - 1) * 4 + 3] > 20) hit = true;
    if (hit) edge.push(`${k}/${size}/${lvl}`);
  }
  ok(edge.length === 0 && trees > 100, "arbres d'hiver : aucun pixel sur le bord du canevas", `${trees} dessins lus${edge.length ? " ; au bord : " + edge.slice(0, 6).join(", ") : ""}`);
}

for (const name of places) {
  const P = PLACES[name];
  for (const cm of depths) for (const sky of skies) {
    const r = paintPlace(P, cm, sky);
    const big = scale(r.px, r.W, r.H, 3);
    const file = path.join(OUT, `neige-${name}-${cm}cm-${sky}${FONTE ? "-fonte" : ""}.png`);
    writePNG(file, big.px, big.W, big.H);
    console.log("écrit", path.relative(ROOT, file));
  }
}
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC` : `\n${nOk}/${nOk} — tout passe`);
process.exit(fail ? 1 : 0);
