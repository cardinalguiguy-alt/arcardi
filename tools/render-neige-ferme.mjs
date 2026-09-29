/* =============================================================================
   render-neige-ferme.mjs — LA NEIGE DE LA FERME, REGARDÉE HORS DU JEU (2026-09-29).
   -----------------------------------------------------------------------------
   Guillaume : « s'il neige, alors synchroniser les deux [lieux] — je veux donc
   amener la neige sur la ferme » ; sol, traces et décors ; « neige fine, sillons
   lisibles » sur le champ. Ce banc peint de VRAIS morceaux d'une ferme générée
   (`E.generateWorld`), avec le sol du jeu (les tuiles de `buildSprites`), la neige
   du jeu (`neige.js` : `makeSnowField` sur `A.farmSnowEnv`, le même champ que la
   boucle), les chapeaux de neige des décors (`NG.snowCapPixels`, ce que lit
   `snowCapCanvas`) et la neige des toits (`NG.snowRoofPixels`) — jamais une recopie.
   ⚠️ Ce qu'il ne voit pas : la lumière de la scène (le multiply du ciel), les
   personnages, les cultures. La neige se juge ENSUITE en jeu (§10 de CLAUDE.md).

   Planches : tools/out/neige-ferme-<lieu>-<cm>.png.
   Usage :  node tools/render-neige-ferme.mjs [lieu] [cm]
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
const T = C.TILE;

/* Une ferme générée, et un champ labouré devant la maison (arrosé à moitié) :
   c'est ce qu'un joueur aura sous les yeux l'hiver. */
function makeFarm() {
  const w = E.generateWorld(42);
  for (let y = 37; y <= 40; y++) for (let x = 36; x <= 45; x++) {
    const i = y * w.w + x;
    if (w.objects[i] !== C.O_NONE) continue;
    w.ground[i] = x < 41 ? C.G_TILLED : C.G_WATERED;
  }
  // Une clôture et un mur, pour les chapeaux de neige.
  for (let x = 35; x <= 46; x++) { const i = 36 * w.w + x; if (w.objects[i] === C.O_NONE && w.ground[i] === C.G_GRASS) w.objects[i] = C.O_FENCE_H; }
  for (let x = 47; x <= 49; x++) { const i = 39 * w.w + x; if (w.objects[i] === C.O_NONE) w.objects[i] = C.O_WALL; }
  return w;
}
const PLACES = {
  cour: { x: 33, y: 26, w: 24, h: 16 },      // la maison, la boutique, le champ, la clôture
  riviere: { x: 86, y: 34, w: 24, h: 16 },   // la rivière, ses berges de sable, des arbres
  gare: { x: 0, y: 20, w: 18, h: 14 },       // la voie, le quai, la gare
  cratere: { x: 60, y: 44, w: 16, h: 11, crater: [67, 49] },   // un cratère chaud de la quête, dans un pré
};
/* La fonte d'un cratère de la ferme : le rayon que lui donne le jeu (FermeGame.js). */
const craterMelt = (cx, cy) => ({ x: (cx + 0.5) * T, y: (cy + 0.5) * T, r: C.STAR_CRATER_DRAW_R * T * C.STAR_FARM_CRATER_DRAW_SCALE * 1.1 });
const argPlace = process.argv[2], argCm = process.argv[3];
const places = argPlace ? [argPlace] : Object.keys(PLACES);

const depths = argCm ? [Number(argCm)] : [3, 12, 30];

function packFor(cm) {
  return { g: cm, s: cm * 1.25 + (cm > 0 ? 1.5 : 0), r: 0, berm: 0, rh: cm * 0.8, rc: cm, tl: cm > 8 ? 0.8 : cm > 1 ? 0.3 : 0, tc: cm > 8 ? 0.8 : cm > 1 ? 0.3 : 0, since: 0 };
}
function fieldFor(w) {
  const env = A.farmSnowEnv(w, S);
  env.makeCanvas = (cw, chh) => { const c = document.createElement("canvas"); c.width = cw; c.height = chh; return c; };
  return { env, f: NG.makeSnowField(w, env) };
}
/* `snowCapCanvas` du jeu, hors navigateur : le chapeau (1, 2) ou le toit (11, 12).
   ⚠️ Le faux canevas ignore `globalAlpha` dans `drawImage` : un calque n'est donc posé
   ici que s'il DOMINE (alpha > 0,5) — le fondu entre deux niveaux ne se juge qu'en jeu. */
function capCanvas(img, lvl, bury) {
  const w = img.width, h = img.height;
  const px = img.getContext("2d").getImageData(0, 0, w, h).data;
  const r = lvl >= 11 ? { w, h, pad: 0, px: NG.snowRoofPixels(px, w, h, lvl - 10, 0.55) } : NG.snowCapPixels(px, w, h, lvl, w * 31 + h, bury | 0);
  const c = makeCanvas(r.w, r.h);
  const id = c.ctx.createImageData(r.w, r.h); id.data.set(r.px); c.ctx.putImageData(id, 0, 0);
  c.pad = r.pad;
  return c;
}
function propSnow(ctx, f, img, tx, ty, dx, dy) {
  const d = f.depthAt(tx * T + 8, ty * T + 8);
  if (d < 0.6) return;
  const bury = Math.min(3, Math.floor(d / 7.4)), k2 = Math.max(0, Math.min(1, (d - 3) / 5));
  const lv = k2 > 0.5 ? 2 : Math.min(1, (d - 0.6) / 1.5) > 0.5 ? 1 : 0;
  if (lv) { const c = capCanvas(img, lv, bury); ctx.drawImage(c, dx, dy - c.pad); }
}

function paintPlace(w, f, P, cm) {
  const pk = packFor(cm);
  f.setParams(pk, { winter: true, frost: 0, wetRoad: 0, sun: 1 });
  if (P.crater) f.setMelts([craterMelt(P.crater[0], P.crater[1])]);
  f.view(P.x, P.y, P.x + P.w - 1, P.y + P.h - 1);
  f.update(1e9, () => 0);
  const walkers = NG.makeWalkers();
  const walk = (id, kind, pts) => {
    let t = 0;
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 8);
      for (let s = 0; s <= n; s++) walkers.step(id, kind, (ax + (bx - ax) * s / n) * T, (ay + (by - ay) * s / n) * T, t += 16, f, 1);
    }
  };
  walk("a", "boot", [[P.x + 2.5, P.y + P.h - 2.2], [P.x + 9, P.y + P.h - 3.5], [P.x + 16, P.y + P.h - 6]]);
  walk("h", "hoof", [[P.x + 1, P.y + 3.4], [P.x + 12, P.y + 4.2]]);
  f.view(P.x, P.y, P.x + P.w - 1, P.y + P.h - 1);
  f.update(1e9, () => 0);
  const W = P.w * T, H = P.h * T;
  const sf = makeCanvas(W, H), ctx = sf.ctx;
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const i = y * w.w + x, g = w.ground[i], px = (x - P.x) * T, py = (y - P.y) * T;
    const img = g === C.G_GRASS ? S.grass[(x * 7 + y * 13) % 3] : g === C.G_TILLED ? S.tilled : g === C.G_WATERED ? S.watered
      : g === C.G_WATER ? S.water[0] : g === C.G_SAND ? S.sand : g === C.G_BRIDGE ? S.bridge : g === C.G_BRIDGE_SITE ? S.bridgeRuin : S.path;
    ctx.drawImage(img, px, py);
    const sc = f.cell(x, y);
    if (sc) ctx.drawImage(sc.img, sc.sx, sc.sy, T, T, px, py, T, T);
  }
  // La voie et le quai, peints APRÈS les cases, puis leur neige (comme dans le jeu).
  for (let y = P.y; y < P.y + P.h; y++) for (let k = 0; k < 2; k++) {
    const x = C.STATION_RAIL_X + k;
    if (x < P.x || x >= P.x + P.w) continue;
    A.drawStationTile(ctx, S, "rail", k, y, (x - P.x) * T, (y - P.y) * T);
    const sc = f.cell(x, y); if (sc) ctx.drawImage(sc.img, sc.sx, sc.sy, T, T, (x - P.x) * T, (y - P.y) * T, T, T);
  }
  for (let y = C.STATION_PLATFORM.y; y < C.STATION_PLATFORM.y + C.STATION_PLATFORM.h; y++) for (let x = C.STATION_PLATFORM.x; x < C.STATION_PLATFORM.x + C.STATION_PLATFORM.w; x++) {
    if (x < P.x || x >= P.x + P.w || y < P.y || y >= P.y + P.h) continue;
    A.drawStationTile(ctx, S, "platformFarm", x - C.STATION_PLATFORM.x, y - C.STATION_PLATFORM.y, (x - P.x) * T, (y - P.y) * T);
    const sc = f.cell(x, y); if (sc) ctx.drawImage(sc.img, sc.sx, sc.sy, T, T, (x - P.x) * T, (y - P.y) * T, T, T);
  }
  // Le cratère, décal de sol posé APRÈS les cases (comme dans le jeu), puis sa fumée.
  if (P.crater && S.drawStarCrater) {
    const ccx = (P.crater[0] - P.x + 0.5) * T, ccy = (P.crater[1] - P.y + 0.5) * T;
    S.drawStarCrater(ctx, ccx, ccy, T * C.STAR_FARM_CRATER_DRAW_SCALE, 0, 2200, { heat: 0.5, star: false });
    if (S.drawStarCraterAir) S.drawStarCraterAir(ctx, ccx, ccy, T * C.STAR_FARM_CRATER_DRAW_SCALE, 2200, { heat: 0.5 });
  }
  // Rangée par rangée : les décors, dans l'ordre du jeu (l'ancrage au sol).
  const houseImg = (S.houses && S.houses[0]) || S.house;
  for (let y = P.y - 1; y < P.y + P.h + 3; y++) {
    for (let x = P.x - 2; x < P.x + P.w + 2; x++) {
      if (x < 0 || y < 0 || x >= w.w || y >= w.h) continue;
      const i = y * w.w + x, o = w.objects[i], px = (x - P.x) * T, py = (y - P.y) * T;
      if (o === C.O_ROCK) { ctx.drawImage(S.rock, px, py); propSnow(ctx, f, S.rock, x, y, px, py); }
      else if (o === C.O_FENCE_H) { ctx.drawImage(S.fence, px, py); propSnow(ctx, f, S.fence, x, y, px, py); }
      else if (o === C.O_WALL) { ctx.drawImage(S.wall, px, py); propSnow(ctx, f, S.wall, x, y, px, py); }
      else if (o === C.O_TREE || o === C.O_TREE2) {
        const img = o === C.O_TREE ? S.oak : S.pine, load = o === C.O_TREE2 ? pk.tc : pk.tl;
        ctx.drawImage(img, px - 8, py + T - 48);
        const mx = NG.treeSnowMix(load, (NG.h32(x, y, 7) % 100) / 100);
        const lv = mx.k > 0.5 ? mx.b : mx.a;
        if (lv) { const c = capCanvas(img, lv, 0); ctx.drawImage(c, px - 8, py + T - 48 - c.pad); }
      }
    }
    if (y === C.HOUSE.y + C.HOUSE.h - 1 && houseImg) {
      const hx = (C.HOUSE.x - P.x) * T, hy = (C.HOUSE.y + C.HOUSE.h - P.y) * T - 96;
      ctx.drawImage(houseImg, hx, hy);
      const rs = { l: Math.min(1, Math.max(0, (pk.rh - 0.25) / 1.4)), h: Math.min(1, Math.max(0, (pk.rh - 2.5) / 5)) };
      const lv = rs.h > 0.5 ? 12 : rs.l > 0.5 ? 11 : 0;
      if (lv) ctx.drawImage(capCanvas(houseImg, lv, 0), hx, hy);
    }
  }
  return { px: sf.px, W, H };
}

let fail = 0, nOk = 0;
const ok = (cond, label, detail) => { console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : "")); if (!cond) fail++; else nOk++; };
console.log("\n=== render-neige-ferme — la neige de la ferme ===\n");

const farm = makeFarm();
/* Le pixel de neige de la case (x, y), (lx, ly) : son alpha dans l'atlas du champ. */
const alphaAt = (f, x, y, lx, ly) => {
  const sc = f.cell(x, y);
  if (!sc) return -1;
  const d = sc.img.getContext("2d").getImageData(sc.sx + lx, sc.sy + ly, 1, 1).data;
  return d[3];
};
{
  const { f } = fieldFor(farm);
  f.setParams(packFor(30), { winter: true, frost: 0, wetRoad: 0, sun: 1 });
  const all = (x0, y0, x1, y1) => { f.view(x0, y0, x1, y1); f.update(1e9, () => 0); };
  // 1. L'eau et le passage sombre ne portent aucune neige.
  let water = 0, wet = 0, reads = 0, dark = null;
  for (let y = 0; y < farm.h && reads < 4000; y++) for (let x = 0; x < farm.w; x++) {
    const g = farm.ground[y * farm.w + x];
    if (g === C.G_DARK_PASSAGE) dark = [x, y];
    if (g !== C.G_WATER || (x + y) % 5) continue;
    all(x, y, x, y);
    for (let k = 0; k < 16; k += 5) { reads++; if (alphaAt(f, x, y, k, (k * 7) % 16) > 0) wet++; }
    water++;
  }
  ok(water > 20 && wet === 0, "aucune neige sur la rivière", `${wet} pixels enneigés sur ${reads} lus dans ${water} cases d'eau`);
  if (dark) {
    all(dark[0], dark[1], dark[0], dark[1]);
    let n = 0; for (let k = 0; k < 256; k += 3) if (alphaAt(f, dark[0], dark[1], k & 15, k >> 4) > 0) n++;
    ok(n === 0, "⚠️ le passage sombre reste visible (pas de neige)", `${n} pixels enneigés`);
  } else ok(true, "(pas de passage sombre sur cette ferme)");
  // 2. Les rails : le champignon d'acier nu, le ballast blanc.
  all(C.STATION_RAIL_X, 50, C.STATION_RAIL_X + 1, 52);
  let head = 0, ballast = 0, nb = 0;
  for (let ly = 0; ly < 16; ly++) {
    for (const col of [7, 8, 23, 24]) if (alphaAt(f, C.STATION_RAIL_X + (col >> 4), 51, col & 15, ly) === 255) head++;
    for (const col of [3, 12, 16, 28]) { nb++; if (alphaAt(f, C.STATION_RAIL_X + (col >> 4), 51, col & 15, ly) === 255) ballast++; }
  }
  ok(head === 0 && ballast > nb * 0.6, "les rails : le champignon d'acier nu, le ballast sous la neige", `acier ${head} px enneigés, ballast ${ballast}/${nb}`);
  // 3. ⚠️⚠️ LE CHAMP : sillons lisibles sous 30 cm (Guillaume : « neige fine, sillons lisibles »).
  all(36, 37, 45, 40);
  let tro = 0, trN = 0, rid = 0, riN = 0;
  for (let y = 37; y <= 40; y++) for (let x = 36; x <= 45; x++) for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx += 3) {
    const a = alphaAt(f, x, y, lx, ly);
    if ((ly & 3) >= 2) { trN++; if (a === 255) tro++; } else { riN++; if (a === 255) rid++; }
  }
  ok(tro / trN > 0.7 && rid / riN < 0.35, "⚠️⚠️ le champ sous 30 cm : le creux blanc, la crête nue", `creux ${(100 * tro / trN).toFixed(0)} % blancs, crêtes ${(100 * rid / riN).toFixed(0)} %`);
  // 4. Un pré, lui, est couvert sous 30 cm.
  let gr = 0, gN = 0;
  for (let y = 26; y < 30; y++) for (let x = 55; x < 60; x++) {
    if (farm.ground[y * farm.w + x] !== C.G_GRASS || farm.objects[y * farm.w + x] !== C.O_NONE) continue;
    all(x, y, x, y);
    for (let k = 0; k < 256; k += 7) { gN++; if (alphaAt(f, x, y, k & 15, k >> 4) === 255) gr++; }
  }
  ok(gN > 50 && gr / gN > 0.9, "le pré sous 30 cm est blanc", `${(100 * gr / gN).toFixed(0)} % de ${gN} pixels`);
  // 5. ⚠️ LA CARTE CHANGE SOUS LA NEIGE : labourer une case du pré rebâtit sa parcelle.
  const tx = 57, ty = 27, ti = ty * farm.w + tx;
  const g0 = farm.ground[ti];
  farm.ground[ti] = C.G_TILLED;
  const crest = () => { let n = 0; for (const ly of [0, 1, 4, 5]) for (let lx = 0; lx < 16; lx++) if (alphaAt(f, tx, ty, lx, ly) === 255) n++; return n; };
  all(tx, ty, tx, ty);
  const before = crest();
  f.invalidate(tx, ty, tx, ty);
  all(tx, ty, tx, ty);
  const after = crest();
  ok(before > 56 && after < 24, "⚠️ une case labourée sous la neige montre ses sillons dès qu'on l'invalide", `crêtes blanches : ${before}/64 → ${after}/64`);
  farm.ground[ti] = g0; f.invalidate(tx, ty, tx, ty);
  /* 5 bis. ⚠️ LE CHEMIN BON MARCHÉ (`invalidateGround`) rend EXACTEMENT la parcelle
     qu'une reconstruction complète aurait rendue — sinon le labour sous la neige
     ferait apparaître, une case sur deux, une lecture du sol périmée. */
  {
    const cx = Math.floor(tx * T / NG.CH), cy = Math.floor(ty * T / NG.CH);
    all(tx, ty, tx, ty);
    const st0 = f.staticOf(cx, cy);
    for (const [dx, dy, gg] of [[0, 0, C.G_TILLED], [1, 0, C.G_WATERED], [0, 1, C.G_PATH]]) farm.ground[(ty + dy) * farm.w + tx + dx] = gg;
    f.invalidateGround(tx, ty, tx + 1, ty + 1);
    const env2 = A.farmSnowEnv(farm, S);
    const fresh = NG.buildChunkStatic(farm, cx, cy, { ...env2, fields: f.fields });
    let diff = 0;
    for (const k of ["cls", "recv", "aux", "fine", "cov", "shade", "gut"]) for (let q = 0; q < fresh[k].length; q++) if (fresh[k][q] !== st0[k][q]) diff++;
    ok(diff === 0, "⚠️ relire le sol d'une case (le labour) rend la même parcelle qu'une reconstruction", `${diff} valeurs d'écart`);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) farm.ground[(ty + dy) * farm.w + tx + dx] = g0 === undefined ? C.G_GRASS : C.G_GRASS;
    farm.ground[ti] = g0;
    f.invalidateGround(tx, ty, tx + 1, ty + 1);
  }
  // 6. ⚠️ Le piège des deux cartes : la fontaine de la VILLE n'existe pas sur la ferme.
  const fx = C.TOWN_FOUNTAIN.x, fy = C.TOWN_FOUNTAIN.y;
  const st = f.staticOf(Math.floor(fx * T / NG.CH), Math.floor(fy * T / NG.CH));
  const o = ((fy * T + 5) - (Math.floor(fy * T / NG.CH) * NG.CH - 1)) * NG.SZ + ((fx * T + 5) - (Math.floor(fx * T / NG.CH) * NG.CH - 1));
  const g = farm.ground[fy * farm.w + fx];
  ok(g === C.G_WATER ? st.cls[o] === NG.CL.NONE : st.cls[o] !== NG.CL.STONE, "⚠️ la fontaine de la ville ne dalle pas un pré de la ferme", `case (${fx}, ${fy}) : sol ${g}, classe ${st.cls[o]}`);
  /* 6 bis. ⚠️ UN CRATÈRE CHAUD FAIT FONDRE LA NEIGE (Guillaume : « les animations de
     cratères et la quête jouables avec la neige ») : terre nue au fond, neige au-delà
     d'une fois et demie son rayon. */
  {
    const [cx, cy] = PLACES.cratere.crater, m = craterMelt(cx, cy);
    f.setMelts([m]);
    all(cx - 5, cy - 5, cx + 5, cy + 5);
    const at = (dx, dy) => { const wx = m.x + dx, wy = m.y + dy; return alphaAt(f, Math.floor(wx / T), Math.floor(wy / T), Math.floor(wx) & 15, Math.floor(wy) & 15); };
    let inside = 0, inN = 0, outside = 0, outN = 0;
    for (let a = 0; a < 64; a++) {
      const ca = Math.cos(a / 64 * 6.283), sa = Math.sin(a / 64 * 6.283) * 0.86;
      for (const k of [0.1, 0.4, 0.7]) { inN++; if (at(ca * m.r * k, sa * m.r * k) === 255) inside++; }
      for (const k of [1.9, 2.4]) { outN++; if (at(ca * m.r * k, sa * m.r * k) === 255) outside++; }
    }
    ok(inside === 0 && outside > outN * 0.9, "⚠️ un cratère chaud : terre nue au fond, neige au-delà", `${inside}/${inN} pixels enneigés dans le trou, ${outside}/${outN} au-delà`);
    f.setMelts([]);
    all(cx - 5, cy - 5, cx + 5, cy + 5);
    let back = 0; for (let a = 0; a < 16; a++) if (at(Math.cos(a) * m.r * 0.4, Math.sin(a) * m.r * 0.34) === 255) back++;
    ok(back > 12, "…et la neige revient quand il n'y a plus de cratère chaud", `${back}/16`);
  }
  // 7. Les pieds s'enfoncent moins dans le champ que dans le pré.
  ok(f.depthAt(38 * T + 8, 38 * T + 8) < 0.5 * f.depthAt(57 * T + 8, 27 * T + 8), "on s'enfonce moins dans le champ que dans le pré",
     `${f.depthAt(38 * T + 8, 38 * T + 8).toFixed(1)} cm contre ${f.depthAt(57 * T + 8, 27 * T + 8).toFixed(1)} cm`);
  // 8. L'abri des arbres se refait quand un arbre tombe.
  let tree = -1;
  for (let i = 0; i < farm.w * farm.h && tree < 0; i++) if (farm.objects[i] === C.O_TREE) tree = i;
  const shel0 = f.fields.shelter[tree];
  farm.objects[tree] = C.O_STUMP; f.refreshFields();
  const shel1 = f.fields.shelter[tree];
  farm.objects[tree] = C.O_TREE; f.refreshFields();
  ok(shel0 < 0.8 && shel1 === 1, "⚠️ un arbre abattu ne protège plus le sol de la neige", `abri ${shel0.toFixed(2)} → ${shel1}`);
}

// Les planches.
for (const pl of places) for (const cm of depths) {
  const { f } = fieldFor(farm);
  const r = paintPlace(farm, f, PLACES[pl], cm);
  const file = path.join(OUT, `neige-ferme-${pl}-${cm}.png`);
  const big = scale(r.px, r.W, r.H, 3);
  writePNG(file, big.px, big.W, big.H);
  console.log(`  →  ${path.relative(ROOT, file)}`);
}
console.log(`\nrender-neige-ferme : ${nOk}/${nOk + fail}`);
process.exit(fail ? 1 : 0);
