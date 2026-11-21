/* =============================================================================
   verify-buee.mjs — LA BUÉE DU SOUFFLE (2026-11-21, `components/ferme/buee.js`).
   Ce que le banc tient :
   1. LE FROID : rien au-dessus de `T_NONE`, plein sous `T_FULL`, croissant entre les deux ; une température absente = rien.
   2. LE RYTHME : un souffle est vivant ~LIFE/PERIOD du temps ; une foule ne souffle pas en chœur (à un instant donné, ni personne ni
      tout le monde, sur 400 personnages) ; même personnage, même instant → même souffle (déterministe).
   3. LA FORME : au pixel fin, bornée (aucun nuage plus large qu'une tête), non vide en début de vie ; elle NE GROUILLE PAS (d'une image
      à la suivante, au moins 70 % des pixels restent) ; deux souffles successifs ne sont pas le même dessin.
   4. LE SENS : de face il s'écarte de la tête (d'un côté ou de l'autre) et monte ; de dos, de derrière la tête ; de profil vers son côté ; le
      vent pousse à droite ; le nuage monte un peu.
   5. LE DESSIN : rien à force nulle ; à force pleine, au PIXEL D'ÉCRAN ENTIER (carrés de zoom/2 px, calés sur leur grille), crans 2 à 4.
   Usage : node tools/verify-buee.mjs        FALSIFY=choeur (tout le monde en phase) | grouille (bords retirés à chaque image)
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { buee: BU } = await loadFerme(ROOT, ["buee"]);
const FALSIFY = process.env.FALSIFY || "";
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
console.log("\n=== verify-buee ===\n");
const breathAt = FALSIFY === "choeur" ? (t, seed, mv) => BU.breathAt(t, 1, mv) : BU.breathAt;
const puffCells = FALSIFY === "grouille" ? (u, seed, n) => BU.puffCells(u, seed + Math.floor(u * 1000), n) : BU.puffCells;

// 1. Le froid
{
  const B = BU.BUEE;
  ok(BU.breathK(B.T_NONE) === 0 && BU.breathK(25) === 0 && BU.breathK(B.T_FULL) === 1 && BU.breathK(-15) === 1, "rien au-dessus de " + B.T_NONE + " °C, plein sous " + B.T_FULL + " °C");
  let mono = true; for (let t = B.T_FULL; t < B.T_NONE; t += 0.25) if (BU.breathK(t) < BU.breathK(t + 0.25)) mono = false;
  ok(mono && BU.breathK(3) > 0.3 && BU.breathK(3) < 0.7, "croissant quand il fraîchit ; à mi-chemin, à moitié", "à 3 °C : " + BU.breathK(3).toFixed(2));
  ok(BU.breathK(undefined) === 0 && BU.breathK(NaN) === 0, "une température absente : aucune buée");
}
// 2. Le rythme
{
  const seeds = Array.from({ length: 400 }, (_, i) => BU.idSeed("perso-" + i));
  let alive = 0, N = 0, minF = 1, maxF = 0;
  for (let k = 0; k < 120; k++) {
    const t = 1000 + k * 0.173; let f = 0;
    for (const s of seeds) { if (breathAt(t, s, false)) f++; }
    alive += f; N += seeds.length; minF = Math.min(minF, f / seeds.length); maxF = Math.max(maxF, f / seeds.length);
  }
  const want = BU.BUEE.LIFE / BU.BUEE.PERIOD[0];
  ok(Math.abs(alive / N - want * 0.95) < 0.06, "au repos, un nuage vivant ~" + (want * 100).toFixed(0) + " % du temps (un souffle sur six plus court)", (100 * alive / N).toFixed(1) + " %");
  ok(minF > 0.2 && maxF < 0.5, "une foule ne souffle pas en chœur : à tout instant, entre 20 et 50 % des gens soufflent", (100 * minF).toFixed(0) + " à " + (100 * maxF).toFixed(0) + " %");
  let mv = 0, M = 0; for (let k = 0; k < 2000; k++) { if (breathAt(k * 0.0731, seeds[k % 50], true)) mv++; M++; }
  ok(mv / M > alive / N * 1.3, "en marche, on souffle plus souvent", (100 * mv / M).toFixed(0) + " % du temps");
  const a = breathAt(1234.5, seeds[3], false), b = breathAt(1234.5, seeds[3], false);
  ok(JSON.stringify(a) === JSON.stringify(b), "même personnage, même instant : même souffle");
}
// 3. La forme
{
  const seed = BU.idSeed("joueur");
  let maxR = 0, empty = [], keep = 1, same = 0;
  for (let n = 0; n < 60; n++) {
    for (let u = 0; u <= 1.0001; u += 0.02) {
      const c = puffCells(u, seed, n);
      for (const [dx, dy] of c) maxR = Math.max(maxR, Math.abs(dx) / 2, Math.abs(dy) / 2 * 1.6);
      if (u > 0.04 && u < 0.6 && c.length < 3) empty.push(n + "@" + u.toFixed(2));
      if (u + 0.02 <= 0.55) {
        const nx = puffCells(u + 0.02, seed, n), S = new Set(nx.map(([x, y]) => x + "," + y));
        if (c.length) keep = Math.min(keep, c.filter(([x, y]) => S.has(x + "," + y)).length / c.length);
      }
    }
    const A = puffCells(0.4, seed, n).map(String).join("|"), B = puffCells(0.4, seed, n + 1).map(String).join("|");
    if (A === B) same++;
  }
  ok(maxR <= 4, "un nuage ne dépasse jamais 4 px d'art du centre (moins large qu'une tête)", "rayon max " + maxR.toFixed(1));
  ok(!empty.length, "un nuage a ses pixels dès qu'il sort, jusqu'au milieu de sa vie", empty.slice(0, 4).join(", "));
  ok(keep >= 0.7, "il ne grouille pas : d'une image à l'autre (1/50 de sa vie), au moins 70 % de ses pixels restent", "au pire " + (100 * keep).toFixed(0) + " %");
  ok(same < 6, "deux souffles successifs ne sont pas le même dessin", same + " / 60 identiques");
}
// 4. Le sens
{
  const at = (face, u, w = 0, side = 1) => BU.puffCenter(10, 10, face, u, w, side);
  ok(Math.abs(at("down", 0.8)[0] - 10) > 3 && at("down", 0.8)[1] < at("down", 0.1)[1], "de face, il s'écarte de la tête et monte (il se détache sur le fond, il ne tache pas le vêtement)");
  ok(at("down", 0.8, 0, -1)[0] < 10 && at("down", 0.8, 0, 1)[0] > 10, "de face, d'un côté ou de l'autre selon le souffle");
  let sides = 0; for (let n = 0; n < 200; n++) sides += BU.sideOf(BU.idSeed("q"), n);
  ok(Math.abs(sides) < 40, "les deux côtés reviennent aussi souvent", "écart " + sides + " sur 200");
  ok(at("up", 0.8)[1] < at("up", 0.1)[1] && Math.abs(at("up", 0.05)[0] - 10) >= 5.5, "de dos, il sort de derrière la tête (au-delà de sa silhouette) et monte");
  ok(at("right", 0.8)[0] > at("right", 0.1)[0] && at("left", 0.8)[0] < at("left", 0.1)[0], "de profil, il part devant la bouche, du bon côté");
  ok(at("right", 0.8)[1] < at("right", 0.1)[1], "il monte un peu en vieillissant (l'air chaud)");
  ok(at("up", 0.8, 1)[0] > at("up", 0.8, 0)[0] + 2, "le vent le pousse vers la droite de l'écran, comme la fumée");
}
// 5. Le dessin
{
  const mk = (z) => { const r = []; let id = false; return { r, save() {}, restore() { id = false; }, getTransform: () => ({ a: z, d: z, e: 7.3, f: -2.6 }),
    setTransform(a, b, c, d, e, f) { id = a === 1 && d === 1 && e === 0 && f === 0; }, fillRect(x, y, w, h) { r.push([x, y, w, h, id]); }, set fillStyle(v) {}, set globalAlpha(v) {} }; };
  const seed = BU.idSeed("x");
  let tAlive = 0; while (!BU.breathAt(tAlive, seed, false) || BU.breathAt(tAlive, seed, false).u < 0.3) tAlive += 0.05;
  const c0 = mk(3); BU.drawBreath(c0, { mx: 10.3, my: 7.9, face: "down", tSec: tAlive, seed, moving: false, k: 0, wind: 0 });
  ok(!c0.r.length, "à force nulle (il fait doux), rien n'est dessiné");
  for (const z of [2, 3, 4]) {
    const c1 = mk(z); BU.drawBreath(c1, { mx: 10.3, my: 7.9, face: "right", tSec: tAlive, seed, moving: false, k: 1, wind: 0.4 });
    const cell = Math.max(1, Math.round(z / 2));
    const crisp = c1.r.every(([x, y, w, h, id]) => id && w === cell && h === cell && Number.isInteger(x) && Number.isInteger(y) && x % cell === 0 && y % cell === 0);
    ok(c1.r.length > 4 && crisp, "cran " + z + " : des carrés d'écran de " + cell + " px, entiers et calés sur leur grille (jamais lissés)", c1.r.length + " carrés");
  }
}
console.log("\n" + nOk + "/" + (nOk + fail) + (fail ? "  — " + fail + " ÉCHEC(S)" : "  — tout est vert") + "\n");
process.exit(fail ? 1 : 0);
