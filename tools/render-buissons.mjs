/* =============================================================================
   render-buissons.mjs — REGARDER LES BUISSONS DE LA FERME ET LA FAUX. (2026-09-13)
   -----------------------------------------------------------------------------
   Il appelle `A.drawFarmBush`, la fonction que le jeu appelle — pas une recopie.
   ⚠️ 2026-09-20 (demande Guillaume : « les buissons sont cheap, je veux les
   mêmes que sur Valley Town ») : L'ÉTAT SAUVAGE N'A PLUS SON PROPRE ATLAS
   (`S.farmBush` ne porte plus que `.trim`) — `drawFarmBush` pioche directement
   parmi les quatre espèces de ville (`townShrub`/`townGoldBush`/`townLavender`
   /`townFlowerClump`). Les contrôles d'atlas (bord, silhouette par saison,
   volume de tons) ne veulent donc plus rien dire pour le sauvage : ils
   resteraient verts en testant une image que le jeu ne dessine plus (le banc
   imaginaire du §10 de CLAUDE.md, à l'envers). Remplacés par un contrôle sur
   ce que `drawFarmBush` dessine RÉELLEMENT pour l'état sauvage : les quatre
   espèces sortent bien du hachage de case, chacune se peint, chacune s'ancre
   au pied de la case comme le taillé.
   Deux planches :
     · tools/out/buissons-planche.png : le taillé (atlas, trois saisons × trois
       variantes) et le sauvage (les quatre espèces de ville, un échantillon de
       chacune), sur l'herbe de la ferme, plus l'icône de la faux ;
     · tools/out/buissons-ferme.png : un vrai morceau de ferme générée (la lisière
       la plus fournie de la graine 42), arbres et rochers compris, un buisson
       sur trois taillé — pour juger la DENSITÉ et la place, pas seulement le
       dessin.

   Ce qu'il mesure :
     1. rien sur le bord des neuf cases d'atlas du taillé, ni de l'icône (§4) ;
     2. le taillé : les trois saisons ont la même silhouette, trois variantes
        distinctes, du volume (≥ 4 tons) ;
     3. le sauvage : les quatre espèces de ville sortent bien du hachage de
        case (échantillon de 64 cases), chacune se peint réellement ;
     4. l'ancrage : la matière tombe au pied de la case, centrée — sauvage et
        taillé.

   Usage :  node tools/render-buissons.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine;
const S = A.buildSprites();
const FB = S.farmBush;
const FARM_BUSH_SPECIES = ["shrub", "goldBush", "lavender", "clump"];

let fail = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

const SEASONS = ["summer", "spring", "autumn"];
function cellPixels(cell) {
  const sh = makeCanvas(cell.w, cell.h);
  A.blitCell(sh.ctx, cell, 0, 0);
  return sh.px;
}
// MATIÈRE = opaque ; l'ombre portée (alpha 0,34) n'en fait pas partie (§ la reine et son halo).
const matter = (px, W, x, y) => px[(y * W + x) * 4 + 3] > 160;
const painted = (px, W, x, y) => px[(y * W + x) * 4 + 3] > 8;

console.log("\n=== 1. rien sur le bord des neuf cases du taillé ===\n");
{
  const bad = [];
  for (const se of SEASONS) for (let v = 0; v < 3; v++) {
    const cell = FB.trim[se][v], px = cellPixels(cell);
    let hit = 0;
    for (let x = 0; x < cell.w; x++) { if (painted(px, cell.w, x, 0)) hit++; if (painted(px, cell.w, x, cell.h - 1)) hit++; }
    for (let y = 0; y < cell.h; y++) { if (painted(px, cell.w, 0, y)) hit++; if (painted(px, cell.w, cell.w - 1, y)) hit++; }
    if (hit) bad.push(`${se}/v${v} (${hit})`);
  }
  ok(bad.length === 0, "aucun pixel sur le bord des neuf cases d'atlas (taillé)", bad.join(", ") || "0 débord");
  const ic = makeCanvas(16, 16); ic.ctx.drawImage(S.icons.scythe, 0, 0);
  let n = 0, edge = 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (painted(ic.px, 16, x, y)) { n++; if (x === 0 || y === 0 || x === 15 || y === 15) edge++; }
  ok(n > 30 && edge === 0, "l'icône de la faux est peinte, sans toucher le bord", `${n} px, ${edge} au bord`);
}

console.log("\n=== 2. le taillé : silhouette, variantes, volume ===\n");
{
  const mask = (px, W, H) => { let s = ""; for (let i = 0; i < W * H; i++) s += px[i * 4 + 3] > 8 ? "1" : "0"; return s; };
  const W = FB.trim.w, H = FB.trim.h;
  let sameSeason = true;
  const masks = [];
  for (let v = 0; v < 3; v++) {
    const ms = SEASONS.map(se => mask(cellPixels(FB.trim[se][v]), W, H));
    if (!(ms[0] === ms[1] && ms[1] === ms[2])) sameSeason = false;
    masks.push(ms[0]);
  }
  ok(sameSeason, "taillé : les trois saisons ont la même silhouette");
  ok(new Set(masks).size === 3, "taillé : trois variantes distinctes");
  const tones = new Set();
  for (let v = 0; v < 3; v++) {
    const px = cellPixels(FB.trim.summer[v]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (matter(px, W, x, y) && v === 0) {
      const o = (y * W + x) * 4; tones.add(`${px[o]},${px[o + 1]},${px[o + 2]}`);
    }
  }
  ok(tones.size >= 4, "taillé : du volume, ≥ 4 tons", `${tones.size} tons (été, v0)`);
}

console.log("\n=== 3. le sauvage : les quatre espèces de ville sortent du hachage ===\n");
{
  const seen = new Set(), firstIFor = {};
  const N = 64;
  for (let i = 0; i < N; i++) {
    const sp = FARM_BUSH_SPECIES[A.farmBushSpeciesIdx(i)];
    seen.add(sp);
    if (firstIFor[sp] === undefined) firstIFor[sp] = i;
  }
  ok(seen.size === FARM_BUSH_SPECIES.length, `les 4 espèces apparaissent sur ${N} cases`, [...seen].sort().join(", "));
  for (const sp of FARM_BUSH_SPECIES) {
    const i = firstIFor[sp];
    ok(i !== undefined, `« ${sp} » a au moins une case dans l'échantillon`);
    if (i === undefined) continue;
    const sh = makeCanvas(32, 40);
    const ok2 = A.drawFarmBush(sh.ctx, S, C.O_BUSH, i, 0, 8, "summer", 0);
    let n = 0;
    for (let y = 0; y < 40; y++) for (let x = 0; x < 32; x++) if (painted(sh.px, 32, x, y)) n++;
    ok(ok2 && n > 20, `« ${sp} » (case ${i}) se peint réellement`, `${n} px peints`);
  }
}

console.log("\n=== 4. l'ancrage au pied de la case ===\n");
{
  for (const [obj, nm] of [[C.O_BUSH, "sauvage"], [C.O_BUSH_TRIM, "taillé"]]) {
    const sh = makeCanvas(48, 48);
    A.drawFarmBush(sh.ctx, S, obj, 0, 16, 16, "summer", 0);
    let bot = -1, sx = 0, n = 0;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (matter(sh.px, 48, x, y)) { bot = Math.max(bot, y); sx += x; n++; }
    const cx = sx / Math.max(1, n);
    ok(bot >= 16 + 8 && bot <= 16 + 15 && Math.abs(cx - 24) <= 3, `${nm} : la matière finit au pied de la case, centrée`,
       `bas à ${bot - 16}/16, centre ${(cx - 16).toFixed(1)}/16`);
  }
  ok(A.drawFarmBush(makeCanvas(16, 16).ctx, S, C.O_ROCK, 0, 0, 0, "summer", 0) === false, "un objet qui n'est pas un buisson n'est pas dessiné");
}

/* ─── Planche 1 ─────────────────────────────────────────────────────────── */
{
  const cols = 9, cw = 32, ch = 40, W = cols * cw + 40, H = 2 * ch + 12;
  const sh = makeCanvas(W, H);
  for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) sh.ctx.drawImage(S.grass[((x >> 4) * 7 + (y >> 4) * 3) % 3], x, y);
  // Rangée 1 : le taillé (atlas, trois saisons × trois variantes).
  {
    let c = 0;
    for (const se of SEASONS) for (let v = 0; v < 3; v++, c++) {
      const cell = FB.trim[se][v];
      A.blitCell(sh.ctx, cell, 4 + c * cw + (cw - cell.w) / 2, 6 + (ch - cell.h));
    }
  }
  // Rangée 2 : le sauvage — les quatre espèces de ville. Neuf colonnes pour
  // quatre espèces : deux chacune (huit) puis une troisième pour la première
  // espèce, plutôt que de remplir la rangée espèce par espèce (qui aurait
  // épuisé les neuf colonnes avant d'atteindre la dernière espèce).
  {
    const perSpecies = FARM_BUSH_SPECIES.map(sp => {
      const found = [];
      for (let i = 0; i < 200 && found.length < 3; i++) if (FARM_BUSH_SPECIES[A.farmBushSpeciesIdx(i)] === sp) found.push(i);
      return found;
    });
    const order = [];
    for (let round = 0; round < 3; round++) for (const found of perSpecies) if (found[round] !== undefined) order.push(found[round]);
    order.slice(0, cols).forEach((i, c) => {
      A.drawFarmBush(sh.ctx, S, C.O_BUSH, i, 4 + c * cw + cw / 2 - 8, 6 + ch + ch - 16, "summer", 0);
    });
  }
  sh.ctx.drawImage(S.icons.scythe, W - 28, 8);
  const up = scale(sh.px, W, H, 4);
  writePNG(path.join(OUT, "buissons-planche.png"), up.px, up.W, up.H);
}

/* ─── Planche 2 : un vrai morceau de ferme ─────────────────────────────── */
{
  const w = E.generateWorld(42);
  const VW = 30, VH = 18, T = 16;
  let best = null, bestN = -1;
  for (let y0 = 4; y0 < C.MAP_H - VH - 4; y0 += 3) for (let x0 = 8; x0 < C.MAP_W - VW - 4; x0 += 3) {
    let b = 0, t = 0;
    for (let y = y0; y < y0 + VH; y++) for (let x = x0; x < x0 + VW; x++) {
      const o = w.objects[y * C.MAP_W + x];
      if (o === C.O_BUSH) b++; else if (o === C.O_TREE || o === C.O_TREE2) t++;
    }
    const score = b * 3 + Math.min(t, 40);
    if (score > bestN) { bestN = score; best = { x0, y0, b, t }; }
  }
  const sh = makeCanvas(VW * T, VH * T), g = sh.ctx, draws = [];
  let nb = 0;
  for (let y = best.y0; y < best.y0 + VH; y++) for (let x = best.x0; x < best.x0 + VW; x++) {
    const i = y * C.MAP_W + x, px = (x - best.x0) * T, py = (y - best.y0) * T;
    const gr = w.ground[i];
    if (gr === C.G_WATER) { g.fillStyle = "#3f7fbf"; g.fillRect(px, py, T, T); }
    else if (gr === C.G_SAND) { g.fillStyle = "#d8c07a"; g.fillRect(px, py, T, T); }
    else g.drawImage(S.grass[(x * 7 + y * 3) % 3], px, py);
    let o = w.objects[i];
    if (o === C.O_BUSH && (nb++ % 3) === 2) o = C.O_BUSH_TRIM;
    if (o === C.O_TREE || o === C.O_TREE2) draws.push({ y: (y + 1) * T, fn: () => g.drawImage(o === C.O_TREE ? S.oak : S.pine, px - 8, py + T - 48) });
    else if (o === C.O_ROCK) draws.push({ y: py, fn: () => g.drawImage(S.rock, px, py) });
    else if (o === C.O_BUSH || o === C.O_BUSH_TRIM) draws.push({ y: (y + 1) * T, fn: () => A.drawFarmBush(g, S, o, i, px, py, "summer", 0) });
  }
  draws.sort((a, b) => a.y - b.y).forEach(d => d.fn());
  const up = scale(sh.px, VW * T, VH * T, 3);
  writePNG(path.join(OUT, "buissons-ferme.png"), up.px, up.W, up.H);
  console.log(`\n        planche ferme : graine 42, (${best.x0},${best.y0}) ${VW}×${VH} cases, ${best.b} buissons, ${best.t} arbres`);
}

console.log(fail ? `\n${fail} ÉCHEC(S) sur ${checks}\n` : `\n${checks}/${checks} — planches dans tools/out/buissons-*.png\n`);
process.exit(fail ? 1 : 0);
