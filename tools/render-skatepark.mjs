/* =============================================================================
   render-skatepark.mjs — LE SKATEPARK DE LA PLACE, REGARDÉ HORS DU JEU (2026-10-11).
   -----------------------------------------------------------------------------
   Le VRAI relief (`skatepark.js`) et son VRAI dessin (`skateparkArt.js`), posés sur le dallage de la place du monde de
   printemps, à trois heures du jour : le contact des modules au sol, l'ombre du soleil sur le dallage (passée comme dans le jeu :
   une silhouette teinte `OMBRE.RGB` à l'opacité du soleil), puis les tranches dans l'ordre de leur clé de tri. Un repère de
   taille (un personnage, 16 × 24 px) est posé sur la galerie, sur le plat de la mini-rampe et au sol.
   ⚠️ Ni la lumière de nuit, ni les reflets, ni les arbres de la place : ça se juge en jeu.
   Contrôles : chaque tranche a une clé croissante ; aucune tranche vide ; l'atlas tient en mémoire (< 2 Mpx) ; le pied de chaque
   courbe touche le sol (pas de jour entre le bois et le dallage) ; le coping de chaque courbe est à l'angle voulu.
   Planches : tools/out/skatepark-<heure>h.png (×2), tools/out/skatepark-zoom.png (la mini-rampe et la galerie, ×4).
   Usage :  node tools/render-skatepark.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "skatepark", "skateparkArt", "ombres", "meteo"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, SP = mods.skatepark, SA = mods.skateparkArt, OMB = mods.ombres, WX = mods.meteo;
const S = A.buildSprites();
const tw = E.townMarketWorld(E.generateTownWorld());
const T = C.TILE;
const V = { x: 34, y: 70, w: 33, h: 32 };   // la vue (cases) : la place et son allée de terre

let fail = 0, nOk = 0;
const ok = (cond, label, detail) => { console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : "")); if (!cond) fail++; else nOk++; };
console.log("\n=== render-skatepark ===\n");

const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const t0 = Date.now();
const park = SA.bakePark(mk);
console.log(`  cuisson : ${Date.now() - t0} ms, ${park.strips.length} tranches, atlas ${park.atlasW}×${park.atlasH}`);

ok(park.strips.every((s, i) => !i || s.key > park.strips[i - 1].key), "les clés de tri des tranches croissent du nord au sud");
ok(park.strips.every((s) => s.w > 0 && s.h > 0), "aucune tranche vide");
ok(park.atlasW * park.atlasH < 2e6, "l'atlas tient en mémoire", `${(park.atlasW * park.atlasH / 1e6).toFixed(2)} Mpx`);
{
  // Le pied d'une courbe touche le sol ; son coping est à l'angle voulu.
  const q = SP.QUARTER, P = SP.PARK;
  const hToe = SP.heightAt(P.x0 + 14, P.y0 + q.toeV - 0.01), hLip = SP.heightAt(P.x0 + 14, P.y0 + q.toeV - q.d + 0.01);
  ok(hToe < 0.01, "le pied du quarter touche le sol", hToe.toFixed(3));
  ok(Math.abs(hLip - q.Ht) < 0.06, "le coping du quarter est à sa hauteur", hLip.toFixed(3));
  const tq = SP.transition(q.R, q.Ht), tm = SP.transition(SP.MINI.R, SP.MINI.Ht);
  const deg = (r) => r * 180 / Math.PI;
  ok(deg(tq.ang) > 70 && deg(tq.ang) < 82, "l'angle de coping du quarter (70-82°)", deg(tq.ang).toFixed(1) + "°");
  ok(deg(tm.ang) > 70 && deg(tm.ang) < 82, "l'angle de coping de la mini-rampe (70-82°)", deg(tm.ang).toFixed(1) + "°");
}

/* Le personnage-repère : une silhouette simple (16 × 24, comme les sprites), monté de la hauteur du relief sous ses pieds. */
function marker(ctx, x, y, ox, oy) {
  const lift = SP.liftPx(x, y), px = Math.round(x * T) - ox, py = Math.round(y * T - lift) - oy;
  ctx.fillStyle = "rgba(20,16,12,0.35)"; ctx.fillRect(px - 5, py - 1, 10, 2);
  ctx.fillStyle = "#2d3a6b"; ctx.fillRect(px - 3, py - 10, 6, 10);
  ctx.fillStyle = "#c2412d"; ctx.fillRect(px - 4, py - 18, 8, 9);
  ctx.fillStyle = "#e8b48a"; ctx.fillRect(px - 3, py - 24, 6, 6);
  ctx.fillStyle = "#3a2618"; ctx.fillRect(px - 3, py - 24, 6, 2);
}

function paint(hour) {
  const W = V.w * T, H = V.h * T, OX = V.x * T, OY = V.y * T;
  const sf = makeCanvas(W, H), ctx = sf.ctx;
  for (let y = V.y; y < V.y + V.h; y++) for (let x = V.x; x < V.x + V.w; x++) {
    const g = tw.ground[y * tw.w + x], px = (x - V.x) * T, py = (y - V.y) * T;
    if (g === C.G_PATH) A.drawTownRoadTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_PATH_STONE) A.drawTownFlagTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_TOWN_STAIR) A.drawTownStairTile(ctx, S, tw, x, y, px, py);
    else A.drawTownGrassTile(ctx, S, tw, x, y, px, py);
  }
  // le contact au sol (avec le sol)
  const ct = SA.parkContactLayer(park);
  ctx.drawImage(ct.cv, ct.x0 - OX, ct.y0 - OY);
  // l'ombre du soleil sur le dallage : la silhouette, teinte et posée à l'opacité du soleil (comme `sunShadowPass`)
  const [rise, set] = WX.sunHoursOfTag("spring");
  const sh = OMB.OMBRE && OMB.sunShadow(hour, rise, set, "spring", null);
  if (sh) {
    const buf = makeCanvas(W, H);
    SA.parkFloorShadow(park, buf.ctx, sh, OX, OY);
    const [r, g, b] = OMB.OMBRE.RGB;
    for (let i = 0; i < W * H; i++) {
      if (!buf.px[i * 4 + 3]) continue;
      const o = i * 4;
      sf.px[o] = Math.round(sf.px[o] * (1 - sh.a) + r * sh.a);
      sf.px[o + 1] = Math.round(sf.px[o + 1] * (1 - sh.a) + g * sh.a);
      sf.px[o + 2] = Math.round(sf.px[o + 2] * (1 - sh.a) + b * sh.a);
    }
  }
  SA.relightPark(park, sh, OMB.OMBRE.RGB);
  // les tranches, triées, et les repères à leur rang
  const P = SP.PARK;
  const marks = [[P.x0 + 8.9, P.y0 + 1.2], [P.x0 + 3.9, P.y0 + 3.0], [P.x0 + 15, P.y0 + 9.5], [P.x0 + 9.5, P.y0 + 13.6]];
  const items = park.strips.map((s) => ({ key: s.key, fn: () => ctx.drawImage(park.atlas, s.sx, s.sy, s.w, s.h, s.dx - OX, s.dy - OY, s.w, s.h) }));
  for (const [mx, my] of marks) items.push({ key: my * T, fn: () => marker(ctx, mx, my, OX, OY) });
  items.sort((a, b) => a.key - b.key);
  for (const it of items) it.fn();
  return { px: sf.px, W, H, sh };
}

for (const hour of [8.5, 13, 18.5]) {
  const im = paint(hour);
  const big = scale(im.px, im.W, im.H, 2);
  const file = path.join(OUT, `skatepark-${String(hour).replace(".", "h")}${String(hour).includes(".") ? "" : "h"}.png`);
  writePNG(file, big.px, big.W, big.H);
  console.log("écrit", path.relative(ROOT, file), im.sh ? `(ombre ×${im.sh.k.toFixed(2)}, a ${im.sh.a.toFixed(2)})` : "(sans ombre)");
}
{
  // Gros plan : la mini-rampe, la galerie, le début du quarter (midi)
  const im = paint(13);
  const P = SP.PARK, x0 = (P.x0 - 1 - V.x) * T, y0 = (P.y0 - 3 - V.y) * T, w = 16 * T, h = 11 * T;
  const crop = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = ((y0 + y) * im.W + (x0 + x)) * 4, di = (y * w + x) * 4;
    for (let k = 0; k < 4; k++) crop[di + k] = im.px[si + k];
  }
  const big = scale(crop, w, h, 4);
  const file = path.join(OUT, "skatepark-zoom.png");
  writePNG(file, big.px, big.W, big.H);
  console.log("écrit", path.relative(ROOT, file));
}
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC` : `\n${nOk}/${nOk} — tout passe`);
process.exit(fail ? 1 : 0);
