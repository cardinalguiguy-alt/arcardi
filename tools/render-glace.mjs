/* =============================================================================
   render-glace.mjs — L'ÉTANG GELÉ (2026-09-30) : REGARDER LA GLACE, ET TENIR SES
   RÈGLES.
   -----------------------------------------------------------------------------
   Guillaume : « l'étang doit aussi être gelé en hiver, avec les canards qui
   marchent et glissent un peu dessus, les carpes figées ». Tranché : gel par
   FROID CUMULÉ (l'épaisseur `ice` du manteau, `neige.js`), la glace est un décor.

   Ce banc cuit la VRAIE eau de Valley Town (`eau.js`), pose la couche de glace
   (`glace.js`) aux épaisseurs qui comptent, et peint une planche :
     tools/out/glace-etang.png — libre · la glace prend · presque pris · gelé ·
                                 gelé sous 4 cm · gelé sous 12 cm
   Ce qu'il tient (chaque contrôle a été falsifié le jour de son écriture, voir
   la note en face de chacun) :
     §1  la glace part des BERGES (ordre au pixel), et ne recule jamais quand elle
         épaissit (un pixel gelé à a cm l'est à b > a) ;
     §2  le front avance PAR PIXELS, jamais d'un bloc (§4 de CLAUDE.md : une
         transition se fait par un ordre au pixel, jamais par un seuil commun) ;
     §3  le dessin et la faune lisent la MÊME règle (`pondFrozenAt` contre le
         pixel cuit) ;
     §4  la neige ne se pose que sur la glace, et le vent en balaie une part ;
     §5  les fenêtres de glace claire existent, jamais contre la berge ;
     §6  le manteau : la glace ne prend que l'hiver, part de zéro au premier jour
         d'hiver, et ses trois champs survivent à la copie (`clonePack`) ;
     §7  les carpes : sans glace, leur temps est le temps (au bit près).
   Usage : node tools/render-glace.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "eau", "glace", "neige", "faune"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, EAU = mods.eau, GL = mods.glace, NG = mods.neige, FAU = mods.faune;
const S = A.buildSprites();
const T = 16;
const tw = E.generateTownWorld();
const BAKE = EAU.townWaterBake(S, tw);

let fail = 0, n = 0;
const ok = (cond, label, detail) => {
  n++;
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

const ponds = BAKE ? BAKE.regions.filter((R) => R && R.isPond) : [];
console.log(`cuisson : ${ponds.length} région(s) d'étang`);
ok(ponds.length >= 1 && ponds.every((R) => R.dsh), "l'étang est cuit avec sa distance à la berge", `${ponds.length} région(s)`);

/* Les pixels mouillés d'une région, avec ce que la glace en dit à l'épaisseur `ice`. */
/* ⚠️ « Pris » se lit dans la carte que rend la cuisson (`frozen`), PAS dans l'alpha :
   premier jet, « alpha > 80 » — une glace jeune au creux est presque transparente
   (alpha ~60), le banc la comptait comme de l'eau et accusait la neige d'y tomber. */
function frozenMap(R, ice) {
  const r = GL.bakePondIce(R, ice, 0);
  return { r, map: r.frozen };
}
let wetN = 0;
for (const R of ponds) for (let i = 0; i < R.RW * R.RH; i++) if (R.lvl[i] !== 255) wetN++;
console.log(`pixels d'eau de l'étang : ${wetN}`);

/* ═══ §1 — DES BERGES VERS LE CENTRE, ET JAMAIS EN ARRIÈRE ═══════════════════
   Falsifié : seuil sans la distance (`iceThreshold` rendant T0 partout) → le
   ratio bord/centre tombe à ~1, le contrôle rougit. */
{
  let nearF = 0, nearN = 0, farF = 0, farN = 0, back = 0, read = 0;
  for (const R of ponds) {
    const a = frozenMap(R, 0.6).map, b = frozenMap(R, 1.0).map;
    for (let i = 0; i < R.RW * R.RH; i++) {
      if (R.lvl[i] === 255) continue;
      read++;
      const d = R.dsh[i];
      if (d < 0.3) { nearN++; nearF += a[i]; }
      else if (d > 1.1) { farN++; farF += a[i]; }
      if (a[i] && !b[i]) back++;
    }
  }
  const fn = nearF / Math.max(1, nearN), ff = farF / Math.max(1, farN);
  ok(nearN > 50 && farN > 50, "assez de pixels de bord et de creux pour conclure", `${nearN} au bord, ${farN} au creux (${read} lus)`);
  ok(fn > 0.85 && ff < 0.25, "à 0,6 cm, le bord est pris et le creux libre", `bord ${(100 * fn).toFixed(0)} %, creux ${(100 * ff).toFixed(0)} %`);
  ok(back === 0, "aucun pixel ne dégèle quand la glace épaissit (0,6 → 1 cm)", `${back} pixel(s)`);
}

/* ═══ §2 — LE FRONT AVANCE PAR PIXELS ═══════════════════════════════════════
   Par pas de 0,04 cm (le cran de cuisson du jeu), la part gelée ne saute jamais
   de plus de 6 %. Falsifié : bruit et distance retirés du seuil (un seuil commun)
   → un saut de ~100 % en un cran. */
{
  let prev = 0, worst = 0, at = 0, full = 0;
  for (let ice = 0; ice <= 2.2; ice += 0.04) {
    let f = 0;
    for (const R of ponds) { const m = frozenMap(R, ice).map; for (let i = 0; i < m.length; i++) f += m[i]; }
    const frac = f / Math.max(1, wetN);
    if (frac - prev > worst) { worst = frac - prev; at = ice; }
    prev = frac; full = frac;
  }
  ok(worst < 0.06, "la glace gagne l'étang par petites touches (cran de 0,04 cm)", `plus grand saut ${(100 * worst).toFixed(1)} % vers ${at.toFixed(2)} cm`);
  ok(full > 0.995, "à 2,2 cm tout l'étang est pris", `${(100 * full).toFixed(1)} %`);
  let empty = 0;
  for (const R of ponds) { const r = GL.bakePondIce(R, 0.04, 0); for (let i = 3; i < r.px.length; i += 4) if (r.px[i]) empty++; }
  ok(empty === 0, "sous 0,05 cm, rien n'est peint", `${empty} pixel(s)`);
}

/* ═══ §3 — LE DESSIN ET LA FAUNE LISENT LA MÊME RÈGLE ═══════════════════════
   `pondFrozenAt` (ce qu'un canard lit pour marcher ou nager) contre le pixel cuit,
   mesuré SUR LA BANDE DU FRONT (seuil à moins de 0,25 cm de l'épaisseur) : loin du
   front, les deux sont d'accord quoi qu'on écrive, et un désaccord s'y noyait
   (premier jet mesuré sur tout l'étang : resté vert, falsifié). Seul le grain de
   ±0,03 cm du dessin les sépare : 2,8 % mesuré ; falsifié (le bruit retiré de
   `pondFrozenAt` seul), 9,8 %. Le seuil est posé entre les deux (§10). */
{
  let dis = 0, tot = 0;
  for (const ice of [0.5, 0.9, 1.3]) for (const R of ponds) {
    const { map } = frozenMap(R, ice);
    for (let i = 0; i < R.RW * R.RH; i++) {
      if (R.lvl[i] === 255) continue;
      const wx = R.ox + (i % R.RW) + 0.5, wy = R.oy + ((i / R.RW) | 0) + 0.5;
      const thr = GL.iceThreshold(R.dsh[i], GL.iceNoise(wx / T, wy / T));
      if (Math.abs(thr - ice) > 0.25) continue;
      tot++;
      if (GL.pondFrozenAt(BAKE, wx, wy, ice) !== !!map[i]) dis++;
    }
  }
  ok(tot > 300 && dis / tot < 0.05, "le canard sait où est la glace qu'on voit (sur le front)", `${dis} désaccord(s) sur ${tot} points du front (${(100 * dis / tot).toFixed(1)} %)`);
  ok(!GL.pondFrozenAt(BAKE, C.TOWN_LAKE.x * T + 40, (C.TOWN_LAKE.y + 3) * T, 9), "le port ne gèle jamais", "");
}

/* ═══ §4 — LA NEIGE SUR LA GLACE ════════════════════════════════════════════
   Mesurée en pixels opaques CLAIRS (la neige est opaque, la glace ne l'est pas
   au creux). Falsifié : la garde `frozen[i]` retirée → de la neige sur l'eau
   libre à 0,6 cm. */
{
  const snowFrac = (ice, snow) => {
    let s = 0, w = 0;
    for (const R of ponds) {
      const r = GL.bakePondIce(R, ice, snow);
      for (let i = 0; i < R.RW * R.RH; i++) {
        if (R.lvl[i] === 255) continue;
        w++;
        if (r.px[i * 4 + 3] === 255 && r.px[i * 4 + 2] > 200 && r.px[i * 4] > 180) s++;
      }
    }
    return s / Math.max(1, w);
  };
  const f4 = snowFrac(4, 4), f12 = snowFrac(4, 12), f0 = snowFrac(4, 0);
  ok(f4 > 0.25 && f4 < 0.7, "sous 4 cm, la neige couvre la glace par plaques", `${(100 * f4).toFixed(0)} % (sans neige : ${(100 * f0).toFixed(0)} % de pixels clairs)`);
  ok(f12 > f4 && f12 < 0.95, "sous 12 cm, presque tout, jamais tout (le vent balaie)", `${(100 * f12).toFixed(0)} %`);
  let onWater = 0;
  for (const R of ponds) {
    const a = frozenMap(R, 0.6).map, r = GL.bakePondIce(R, 0.6, 6);
    for (let i = 0; i < R.RW * R.RH; i++) if (R.lvl[i] !== 255 && !a[i] && r.px[i * 4 + 3] === 255) onWater++;
  }
  ok(onWater === 0, "aucune neige sur l'eau libre", `${onWater} pixel(s)`);
}

/* ═══ §5 — LES FENÊTRES DE GLACE CLAIRE ═════════════════════════════════════
   Alpha 0,5 exactement (≈ 128) : c'est leur marque. Falsifié : la condition
   `clear > 0.5` mise à `clear > 2` → zéro fenêtre. */
{
  let win = 0, winShore = 0;
  for (const R of ponds) {
    const r = GL.bakePondIce(R, 3, 0);
    for (let i = 0; i < R.RW * R.RH; i++) {
      if (R.lvl[i] === 255 || r.px[i * 4 + 3] !== 128) continue;
      win++;
      if (R.dsh[i] < 0.3) winShore++;
    }
  }
  ok(win > wetN * 0.05, "la glace pleine a des fenêtres claires", `${win} pixels (${(100 * win / wetN).toFixed(0)} %)`);
  ok(winShore === 0, "jamais de fenêtre contre la berge (le givre y est blanc)", `${winShore} pixel(s)`);
}

/* ═══ §6 — LE MANTEAU ═══════════════════════════════════════════════════════
   « Poser le champ, migrer, relire » (§4 de CLAUDE.md) : les trois champs neufs
   sortent de `snowPack`, qui passe par `clonePack`. Falsifié : `ice` retiré de
   `clonePack` → NaN/undefined. */
{
  const w = NG.snowPack(30, 20 * 60, () => "winter", null, "town");
  ok(Number.isFinite(w.ice) && Number.isFinite(w.si) && Number.isFinite(w.iceLag), "les trois champs de la glace survivent à la copie", `ice ${w.ice && w.ice.toFixed(2)} · si ${w.si && w.si.toFixed(2)} · lag ${w.iceLag && w.iceLag.toFixed(0)} s`);
  const su = NG.snowPack(30, 20 * 60, () => "summer", null, "town");
  ok(su.ice === 0, "jamais de glace l'été", `${su.ice}`);
  // Le premier jour d'hiver (les jours d'avant sont d'automne) part de zéro, et prend dans la nuit.
  const first6 = NG.snowPack(30, 6 * 60, (d) => (d >= 30 ? "winter" : "autumn"), null, "town");
  const first26 = NG.snowPack(30, 26 * 60, (d) => (d >= 30 ? "winter" : "autumn"), null, "town");
  ok(first6.ice === 0 && first26.ice > 0.4, "le premier jour d'hiver part de zéro, la première nuit prend", `6 h : ${first6.ice.toFixed(2)} cm, 2 h : ${first26.ice.toFixed(2)} cm`);
  // Froid cumulé : au bout de trois jours d'hiver, plus épais qu'au premier soir.
  const d3 = NG.snowPack(32, 26 * 60, (d) => (d >= 30 ? "winter" : "autumn"), null, "town");
  ok(d3.ice > first26.ice, "le froid se cumule d'un jour sur l'autre", `jour 3 : ${d3.ice.toFixed(2)} cm`);
}

/* ═══ §7 — LES CARPES ═══════════════════════════════════════════════════════
   Sans glace, `fishT` vaut `t` : les carpes sont celles d'avant au bit près. Avec
   un temps figé, deux instants éloignés donnent les mêmes carpes. */
{
  const fw = FAU.faunaWorld(tw);
  const base = FAU.faunaEnv({ nowMs: 1.8e12, dayStartAt: 1.8e12 - 3e5, day: 40, seasonKey: "winter", stormy: false });
  const a = FAU.faunaFish(fw, base), b = FAU.faunaFish(fw, { ...base, fishT: base.t });
  ok(a.length > 0 && JSON.stringify(a) === JSON.stringify(b), "sans glace, les carpes n'ont pas bougé d'un bit", `${a.length} carpes`);
  const f1 = FAU.faunaFish(fw, { ...base, fishT: 12345 }), f2 = FAU.faunaFish(fw, { ...base, t: base.t + 600, nowMs: base.nowMs + 6e5, fishT: 12345 });
  ok(JSON.stringify(f1) === JSON.stringify(f2), "sous la glace, les carpes sont figées", "dix minutes d'écart, mêmes positions");
}

/* ═══ LA PLANCHE ════════════════════════════════════════════════════════════ */
function paint(sh, v, ice, snow) {
  for (let y = v.y; y < v.y + v.h; y++) for (let x = v.x; x < v.x + v.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x, g = tw.ground[i], px = (x - v.x) * T, py = (y - v.y) * T;
    const gt = S.townGrass;
    if (g === C.G_BRIDGE) {
      sh.ctx.fillStyle = "#a9834f"; sh.ctx.fillRect(px, py, T, T);
      for (let k = 0; k < 4; k++) { sh.ctx.fillStyle = (k % 2) ? "#b78f58" : "#9c7746"; sh.ctx.fillRect(px, py + k * 4, T, 4); }
    } else if (g === C.G_PATH_STONE) { if (!A.drawTownFlagTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#a5a4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else sh.ctx.drawImage(gt[(x * 37 + y * 17) % gt.length], px, py);
    A.drawTownShoreTile(sh.ctx, S, tw, x, y, px, py);
    A.drawTownWaterTile(sh.ctx, S, tw, x, y, px, py, 0);
    if (g === C.G_WATER) EAU.drawWaterSurface(sh.ctx, S, tw, BAKE, x, y, px, py, 0, true);
  }
  if (!(ice > 0.05)) return;
  for (const R of ponds) {
    const r = GL.bakePondIce(R, ice, snow);
    const cv = makeCanvas(R.RW, R.RH);
    const id = cv.ctx.createImageData ? cv.ctx.createImageData(R.RW, R.RH) : { data: new Uint8ClampedArray(R.RW * R.RH * 4), width: R.RW, height: R.RH };
    id.data.set(r.px); cv.ctx.putImageData(id, 0, 0);
    sh.ctx.drawImage(cv.canvas || cv, R.ox - v.x * T, R.oy - v.y * T);
  }
}
const pd = C.TOWN_POND;
const VP = { x: Math.round(pd.cx) - 9, y: Math.round(pd.cy) - 9, w: 18, h: 18 };
const STATES = [[0, 0], [0.5, 0], [1.1, 0], [4, 0], [4, 4], [4, 12]];
const board = makeCanvas(VP.w * T * STATES.length, VP.h * T);
STATES.forEach(([ice, snow], k) => {
  const sh = makeCanvas(VP.w * T, VP.h * T);
  paint(sh, VP, ice, snow);
  board.ctx.drawImage(sh.canvas || sh, k * VP.w * T, 0);
});
const up = scale(board.px, VP.w * T * STATES.length, VP.h * T, 2);
writePNG(path.join(OUT, "glace-etang.png"), up.px, up.W, up.H);
console.log("planche : tools/out/glace-etang.png (libre · prend · presque pris · gelé · sous 4 cm · sous 12 cm)");

console.log(`\n${n - fail}/${n} contrôles passent.`);
process.exit(fail ? 1 : 0);
