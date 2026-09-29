/* =============================================================================
   render-pluie.mjs — LE SOL SOUS LA PLUIE, REGARDÉ HORS DU JEU. (2026-09-29, phase 12b)
   -----------------------------------------------------------------------------
   Ce banc peint de VRAIS morceaux de la carte (le générateur du jeu), avec le
   sol du jeu (`A.drawTown*Tile`) et la couche mouillée du jeu (`pluie.js` :
   `makeWetLayer`, la même que la boucle, sur les parcelles statiques de la
   neige) — jamais une recopie. Ce qu'il ne voit pas : la lumière de la scène (le
   multiply du ciel, `lumiere.js`), les halos des lampadaires sur le sol mouillé,
   les ronds de la pluie qui bougent, les maisons (un pavé les remplace). La
   pluie se juge ENSUITE en jeu (§10 de CLAUDE.md).

   Planches : tools/out/pluie-<lieu>.png (×3) — cinq états côte à côte : sec ;
   humide (une plaque sur deux) ; trempé, premières flaques (les ornières) ;
   trempé, flaques pleines ; séchage (des plaques d'humidité, les flaques qui
   rétrécissent).

   Usage :  node tools/render-pluie.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "neige", "pluie"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, NG = mods.neige, PL = mods.pluie;
const S = A.buildSprites();
const tw = E.generateTownWorld();
const T = C.TILE;

let fails = 0, checks = 0;
const ok = (n, c, x) => { checks++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };

const PLACES = {
  rue: { x: 6, y: 58, w: 22, h: 14 },          // une rue, des jardins, un trottoir
  place: { x: 80, y: 57, w: 26, h: 14 },       // la place : opus civique et fontaine
  marche: { x: 60, y: 44, w: 22, h: 12 },      // asphalte, carrefour
};
const STATES = [
  { name: "sec", wet: 0, pud: 0 },
  { name: "humide", wet: 0.5, pud: 0 },
  { name: "trempé, ornières", wet: 0.95, pud: 0.3 },
  { name: "trempé, flaques", wet: 0.95, pud: 0.8 },
  { name: "séchage", wet: 0.4, pud: 0.15 },
];
const SKY = PL.skyReflect(0.6);

const env = A.townSnowEnv(tw, S, (wx, wy) => {
  const x = Math.floor(wx / T), y = Math.floor(wy / T);
  return x >= 0 && y >= 0 && x < tw.w && y < tw.h && tw.ground[y * tw.w + x] === C.G_WATER;
});
env.makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const field = NG.makeSnowField(tw, env);
const layerEnv = { makeCanvas: env.makeCanvas, staticOf: (cx, cy) => field.staticOf(cx, cy) };

function paint(P, state) {
  const layer = PL.makeWetLayer(tw, layerEnv);
  layer.setParams({ wet: state.wet, pud: state.pud, sky: SKY });
  layer.view(P.x, P.y, P.x + P.w - 1, P.y + P.h - 1);
  layer.update(1e9, () => 0);
  const W = P.w * T, H = P.h * T;
  const sf = makeCanvas(W, H), ctx = sf.ctx;
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const i = y * tw.w + x, g = tw.ground[i], px = (x - P.x) * T, py = (y - P.y) * T;
    if (g === C.G_PATH) A.drawTownRoadTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_PATH_STONE) A.drawTownFlagTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_TOWN_STAIR) A.drawTownStairTile(ctx, S, tw, x, y, px, py);
    else if (g === C.G_WATER) { ctx.fillStyle = "#35608f"; ctx.fillRect(px, py, T, T); }
    else A.drawTownGrassTile(ctx, S, tw, x, y, px, py);
    const wc = layer.cell(x, y);
    if (wc) ctx.drawImage(wc.img, wc.sx, wc.sy, T, T, px, py, T, T);
  }
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const i = y * tw.w + x;
    if (env.tall(i) && !tw.hedge[i]) { ctx.fillStyle = "#6d6258"; ctx.fillRect((x - P.x) * T, (y - P.y) * T - 10, T, T + 10); }
  }
  return { px: sf.px, W, H, layer };
}

console.log("\n=== render-pluie — planches ===\n");
for (const [name, P] of Object.entries(PLACES)) {
  const tiles = STATES.map((s) => paint(P, s));
  const w0 = tiles[0].W, h0 = tiles[0].H, GAP = 6, Z = 2;
  const totalW = (w0 + GAP) * STATES.length - GAP;
  const sheet = new Uint8ClampedArray(totalW * h0 * 4).fill(255);
  tiles.forEach((t, k) => {
    for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) {
      const o = (y * w0 + x) * 4, q = (y * totalW + k * (w0 + GAP) + x) * 4;
      sheet[q] = t.px[o]; sheet[q + 1] = t.px[o + 1]; sheet[q + 2] = t.px[o + 2]; sheet[q + 3] = 255;
    }
  });
  const big = scale(sheet, totalW, h0, Z);
  writePNG(path.join(OUT, `pluie-${name}.png`), big.px, big.W, big.H);
  console.log(`  tools/out/pluie-${name}.png (${totalW * Z}×${h0 * Z}) : ${STATES.map((s) => s.name).join(" | ")}`);
}

/* ── LES CONTRÔLES ─────────────────────────────────────────────────────────
   Sur toute la carte de la place et de la rue, lus dans les parcelles statiques
   de la neige (la classe de chaque pixel) et dans la couche rendue. */
console.log("\n=== render-pluie — les contrôles ===\n");
const CL = NG.CL, CHs = NG.CH, SZ = NG.SZ;
const cells = [];
for (const P of Object.values(PLACES)) for (let cy = Math.floor(P.y * T / CHs); cy <= Math.floor((P.y + P.h) * T / CHs); cy++) for (let cx = Math.floor(P.x * T / CHs); cx <= Math.floor((P.x + P.w) * T / CHs); cx++) cells.push([cx, cy]);
const uniq = [...new Map(cells.map((c) => [c.join(","), c])).values()];
const statics = uniq.map(([cx, cy]) => field.staticOf(cx, cy));
const render = (st, wp) => { const out = new Uint8ClampedArray(CHs * CHs * 4), mask = new Uint8Array(CHs * CHs); const r = PL.renderWetChunk(st, wp, out, mask); return { out, mask, r }; };
const stats = (wp) => {
  let hard = 0, pud = 0, wetHard = 0, grass = 0, wetGrass = 0, pudGrass = 0, pudOther = 0, rut = 0, rutPud = 0, plain = 0, plainPud = 0, shadeN = 0, shadeWet = 0, sunN = 0, sunWet = 0, alphaMax = 0, grassAlphaMax = 0;
  for (const st of statics) {
    const { out, mask } = render(st, wp);
    for (let y = 0; y < CHs; y++) for (let x = 0; x < CHs; x++) {
      const o = (y + 1) * SZ + (x + 1), c = st.cls[o], a = out[(y * CHs + x) * 4 + 3], m = mask[y * CHs + x];
      if (!c) { if (a) alphaMax = 99999; continue; }
      const isHard = c === CL.STREET || c === CL.STONE || c === CL.STAIR || c === CL.DECK;
      if (m && c !== CL.STREET && c !== CL.STONE) pudOther++;
      if (c === CL.GRASS || c === CL.LAWN || c === CL.SOFT) { grass++; if (a) wetGrass++; if (m) pudGrass++; grassAlphaMax = Math.max(grassAlphaMax, a); }
      if (isHard) { hard++; if (a) wetHard++; }
      if (c === CL.STREET) { const ax = st.aux[o] / NG.Q_AUX; if (ax === 1) { rut++; if (m) rutPud++; } else if (ax === 0) { plain++; if (m) plainPud++; } }
      if (m) pud++;
      if (isHard && !m) { const sh = Math.max(st.shade[o] / 255, 0.9 * st.cast[o] / 255); if (sh > 0.6) { shadeN++; if (a) shadeWet++; } else if (sh < 0.05) { sunN++; if (a) sunWet++; } }
    }
  }
  return { hard, pud, wetHard, grass, wetGrass, pudGrass, pudOther, rut, rutPud, plain, plainPud, shadeN, shadeWet, sunN, sunWet, alphaMax, grassAlphaMax };
};
const s0 = stats({ wet: 0, pud: 0, sky: SKY }), sH = stats({ wet: 0.5, pud: 0, sky: SKY }), sT = stats({ wet: 0.95, pud: 0.3, sky: SKY }), sF = stats({ wet: 0.95, pud: 1, sky: SKY }), sL = stats({ wet: 0.95, pud: 0.06, sky: SKY }), sD = stats({ wet: 0.35, pud: 0, sky: SKY });
ok("le sol sec ne peint rien", s0.wetHard === 0 && s0.pud === 0 && s0.wetGrass === 0, `${s0.hard} pixels durs lus`);
ok("une classe d'eau ne sort jamais du sol : rien hors de la carte", s0.alphaMax < 99999 && sF.alphaMax < 99999);
{
  const f = (s) => s.wetHard / s.hard;
  ok("humide (0,5) : une plaque sur deux environ, ni tout ni rien", f(sH) > 0.25 && f(sH) < 0.75, `${(100 * f(sH)).toFixed(0)} % des pixels durs`);
  ok("trempé : presque tout est mouillé", f(sT) > 0.85, `${(100 * f(sT)).toFixed(0)} %`);
  ok("l'humidité monte avec le niveau (0 < 0,35 < 0,5 < 0,95)", f(s0) < f(sD) && f(sD) < f(sH) && f(sH) < f(sT), [s0, sD, sH, sT].map((s) => (100 * f(s)).toFixed(0) + "%").join(" < "));
  const shadeR = sD.shadeWet / Math.max(1, sD.shadeN), sunR = sD.sunWet / Math.max(1, sD.sunN);
  ok("le sol sèche à l'ombre en dernier (à 0,35 d'humidité)", sD.shadeN > 200 && sD.sunN > 200 && shadeR > sunR + 0.12, `ombre ${(100 * shadeR).toFixed(0)} % contre soleil ${(100 * sunR).toFixed(0)} %, ${sD.shadeN} / ${sD.sunN} pixels`);
}
{
  const g = (s) => s.pud / s.hard;
  ok("pas de flaque sous 0,02 de niveau, quelques-unes juste au-dessus", stats({ wet: 0.95, pud: 0.02, sky: SKY }).pud === 0 && stats({ wet: 0.95, pud: 0.06, sky: SKY }).pud > 0);
  ok("les flaques grandissent avec le niveau", s0.pud < sL.pud && sL.pud < sT.pud && sT.pud < sF.pud, [sL, sT, sF].map((s) => s.pud).join(" < "));
  ok("à pleine flaque : de 8 % à 45 % du sol dur (ni un désert, ni un lac)", g(sF) > 0.08 && g(sF) < 0.45, `${(100 * g(sF)).toFixed(1)} %`);
  ok("au premier niveau : moins de 4 % du sol dur", g(sL) < 0.04, `${(100 * g(sL)).toFixed(2)} %`);
  const rutR = sT.rutPud / Math.max(1, sT.rut), plainR = sT.plainPud / Math.max(1, sT.plain);
  ok("les ornières se remplissent d'abord (trois fois plus que le goudron nu, à 0,3)", sT.rut > 100 && rutR > 3 * plainR + 0.03, `ornières ${(100 * rutR).toFixed(0)} % contre goudron ${(100 * plainR).toFixed(0)} %, ${sT.rut} pixels d'ornière`);
}
ok("aucune flaque sur l'herbe, une marche, un tablier ou une berge", sF.pudGrass === 0 && sF.pudOther === 0, `${sF.pudGrass + sF.pudOther} pixels`);
ok("l'herbe mouillée reste discrète (transparence ≤ 50 / 255)", sF.grassAlphaMax <= 50 && sF.wetGrass > 1000, `max ${sF.grassAlphaMax}, ${sF.wetGrass} pixels d'herbe mouillée`);
{
  const st = statics[0], a = render(st, { wet: 0.7, pud: 0.5, sky: SKY }), b = render(st, { wet: 0.7, pud: 0.5, sky: SKY });
  ok("déterministe : deux rendus de la même parcelle sont identiques", Buffer.compare(Buffer.from(a.out), Buffer.from(b.out)) === 0 && a.r.ripples.length === b.r.ripples.length);
  const rp = statics.map((s) => render(s, { wet: 0.95, pud: 0.8, sky: SKY }).r.ripples.length);
  ok("des points de ronds de pluie dans les flaques (et pas plus de 140 par parcelle)", Math.max(...rp) > 20 && Math.max(...rp) <= 140, `jusqu'à ${Math.max(...rp)}`);
  const none = statics.map((s) => render(s, { wet: 0.95, pud: 0, sky: SKY }).r.ripples.length);
  ok("aucun rond sans flaque", Math.max(...none) === 0);
}
{
  /* UNE FLAQUE COMBLE UN CREUX, ELLE NE RECOUVRE PAS UNE ZONE (Guillaume, 2026-09-29, devant le
     premier jet : « les flaques ne doivent pas ressembler à des zones surélevées »). Deux
     mesures : sur un dallage, l'eau prend les JOINTS avant les creux larges ; et une flaque
     n'est presque jamais un aplat — peu de ses pixels ont un carré de 5 × 5 tout entier en flaque. */
  let joint = 0, jointPud = 0, slab = 0, slabPud = 0, pudPx = 0, solid = 0;
  const wp = { wet: 0.95, pud: 0.3, sky: SKY }, wp2 = { wet: 0.95, pud: 0.8, sky: SKY };
  for (const st of statics) {
    const { mask } = render(st, wp);
    for (let y = 0; y < CHs; y++) for (let x = 0; x < CHs; x++) {
      const o = (y + 1) * SZ + (x + 1);
      if (st.cls[o] !== CL.STONE) continue;
      if (st.aux[o] / NG.Q_AUX >= 0.5) { joint++; if (mask[y * CHs + x]) jointPud++; } else { slab++; if (mask[y * CHs + x]) slabPud++; }
    }
    const m2 = render(st, wp2).mask;
    for (let y = 2; y < CHs - 2; y++) for (let x = 2; x < CHs - 2; x++) {
      if (!m2[y * CHs + x]) continue;
      pudPx++;
      let full = true;
      for (let dy = -2; dy <= 2 && full; dy++) for (let dx = -2; dx <= 2; dx++) if (!m2[(y + dy) * CHs + x + dx]) { full = false; break; }
      if (full) solid++;
    }
  }
  const jr = jointPud / Math.max(1, joint), sr = slabPud / Math.max(1, slab);
  ok("sur un dallage, l'eau prend les joints avant le reste (à 0,3 : au moins quatre fois plus)", joint > 5000 && jr > 4 * sr + 0.02, `joints ${(100 * jr).toFixed(1)} % contre pierre ${(100 * sr).toFixed(1)} % (${joint} px de joint)`);
  ok("une flaque n'est pas un aplat : moins de 12 % de ses pixels ont un carré de 5 × 5 tout en eau (à 0,8)", pudPx > 5000 && solid / pudPx < 0.12, `${(100 * solid / Math.max(1, pudPx)).toFixed(1)} % de ${pudPx} pixels`);
}
{
  // L'eau coule au caniveau : les départs sont sur le pied du trottoir, et seulement sous un sol trempé.
  let bad = 0, n = 0, dry = 0;
  for (const st of statics) {
    const r = render(st, { wet: 0.95, pud: 0.5, sky: SKY }).r;
    for (const [wx, wy] of r.flow) {
      n++;
      const x = wx - st.cx * CHs, y = wy - st.cy * CHs, o = (y + 1) * SZ + (x + 1), ax = st.aux[o] / NG.Q_AUX;
      if (st.cls[o] !== CL.STREET || ax < 2 || ax >= 3) bad++;
    }
    dry += render(st, { wet: 0.4, pud: 0.5, sky: SKY }).r.flow.length;
  }
  ok("les départs de l'eau qui coule sont tous au pied d'un trottoir", n >= 10 && bad === 0, `${n} départs, ${bad} hors caniveau`);
  ok("elle ne coule pas sous un sol simplement humide (< 0,55)", dry === 0, `${dry} départs`);
}
{
  // Le bord d'une flaque : sombre au nord-ouest, clair au sud-est (le banc lit les pixels rendus).
  let dark = 0, light = 0, edges = 0;
  for (const st of statics) {
    const { out, mask } = render(st, { wet: 0.95, pud: 0.8, sky: SKY });
    for (let y = 1; y < CHs - 1; y++) for (let x = 1; x < CHs - 1; x++) {
      if (!mask[y * CHs + x]) continue;
      const n = mask[(y - 1) * CHs + x], s = mask[(y + 1) * CHs + x], w = mask[y * CHs + x - 1], e = mask[y * CHs + x + 1];
      const q = (y * CHs + x) * 4, lum = out[q] * 0.3 + out[q + 1] * 0.59 + out[q + 2] * 0.11;
      if (!n || !w) { dark += lum; edges++; } else if (!s || !e) light += lum;
    }
  }
  const nl = Math.max(1, edges);
  ok("le bord haut-gauche d'une flaque est plus sombre que le bas-droit", edges > 300 && dark / nl < light / nl, `${(dark / nl).toFixed(0)} contre ${(light / nl).toFixed(0)} (${edges} pixels de bord)`);
}
{
  // Le ciel reflété : bleu par beau temps, gris sous un ciel couvert.
  const clear = PL.skyReflect(0), grey = PL.skyReflect(1);
  ok("le ciel reflété passe du bleu au gris d'ardoise", clear[2] - clear[0] > 40 && grey[2] - grey[0] < 40, `${clear} → ${grey}`);
}

console.log(`\n${fails ? "❌ " + fails + " contrôle(s) en échec sur " + checks : "✅ " + checks + "/" + checks + " contrôles passés."}`);
process.exit(fails ? 1 : 0);
