/* =============================================================================
   verify-ombres.mjs — LE SOLEIL DES OMBRES PORTÉES (`components/ferme/ombres.js`), JOUÉ SUR UNE JOURNÉE.
   (2026-10-05, nuit.) Guillaume : « les ombres portées calculées en fonction de l'heure, qui s'allongent au
   lever et au coucher, pas figées ». On tient : pas d'ombre la nuit ; l'ombre part vers l'ouest le matin et
   vers l'est le soir ; à midi elle tombe vers le bas de l'écran, penchée au sud-est (la lumière peinte) ; elle
   s'allonge vers le lever et le coucher ; l'hiver plus longue que l'été ; le ciel la pâlit ; elle ne saute
   jamais d'une minute à l'autre ; la matrice projette bien un point à h px de haut à (h·sx, h·sy).
   Usage : node tools/verify-ombres.mjs      (FALSIFY=lean : retire la pente de midi — un contrôle doit rougir)
   ========================================================================== */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import os from "os";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let src = fs.readFileSync(path.join(ROOT, "components", "ferme", "ombres.js"), "utf8");
if (process.env.FALSIFY === "lean") src = src.replace("NOON_LEAN: 0.28", "NOON_LEAN: 0");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ombres-"));
fs.writeFileSync(path.join(tmp, "ombres.mjs"), src);
const O = await import(pathToFileURL(path.join(tmp, "ombres.mjs")).href);
const SUN = { winter: [8.5, 16.5], spring: [6.5, 19.5], summer: [6, 21.5], autumn: [7.5, 18] };   // C.SUN_HOURS, recopiée pour rester pur ; comparée plus bas

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
console.log("\n=== verify-ombres — le soleil des ombres portées ===\n");

{
  const cs = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeConstants.js"), "utf8");
  const m = cs.match(/export const SUN_HOURS = (\{[^}]*\})/);
  ok("la table recopiée ici est celle du ciel (C.SUN_HOURS)", m && JSON.stringify(eval("(" + m[1] + ")")) === JSON.stringify(SUN));
}
for (const season of ["winter", "spring", "summer", "autumn"]) {
  const [r, s] = SUN[season], noon = (r + s) / 2;
  ok(`${season} : pas d'ombre de nuit (avant le lever, après le coucher)`, O.sunShadow(r - 0.5, r, s, season) === null && O.sunShadow(s + 0.5, r, s, season) === null && O.sunShadow(23, r, s, season) === null);
  const am = O.sunShadow(r + 1, r, s, season), pm = O.sunShadow(s - 1, r, s, season), md = O.sunShadow(noon, r, s, season);
  ok(`${season} : le matin, l'ombre part vers l'ouest ; le soir, vers l'est`, am.sx < 0 && pm.sx > 0, `matin sx ${am.sx.toFixed(2)}, soir sx ${pm.sx.toFixed(2)}`);
  ok(`${season} : à midi, elle tombe vers le bas, penchée au sud-est`, md.sy > 0 && md.sx > 0.15 * md.sy && md.sx < md.sy, `sx ${md.sx.toFixed(2)}, sy ${md.sy.toFixed(2)}`);
  // elle raccourcit jusqu'à midi puis s'allonge (longueur au pas de 10 min)
  let mono = true, prev = Infinity, minK = Infinity;
  for (let h = r + 0.25; h <= noon; h += 1 / 6) { const o = O.sunShadow(h, r, s, season); if (o.k > prev + 1e-9) mono = false; prev = o.k; minK = Math.min(minK, o.k); }
  prev = 0;
  for (let h = noon; h < s - 0.25; h += 1 / 6) { const o = O.sunShadow(h, r, s, season); if (o.k < prev - 1e-9) mono = false; prev = o.k; }
  ok(`${season} : elle raccourcit jusqu'à midi, puis s'allonge vers le coucher`, mono, `midi ×${minK.toFixed(2)}, une heure après le lever ×${am.k.toFixed(2)}`);
  /* continuité : d'une minute à l'autre, l'ombre d'un objet de 40 px ne glisse pas de plus d'un pixel, et son
     opacité ne bouge pas de plus d'un centième. ⚠️ La géométrie se compare entre deux ombres EXISTANTES : au lever,
     l'ombre naît d'un coup à sa longueur rasante — mais à opacité nulle, c'est le fondu qui doit être continu. */
  let jump = 0, ja = 0, o0 = null;
  for (let h = r + 0.002; h < s; h += 1 / 60) {
    const o = O.sunShadow(h, r, s, season);
    if (o && o0) jump = Math.max(jump, Math.hypot((o.sx - o0.sx) * 40, (o.sy - o0.sy) * 40));
    ja = Math.max(ja, Math.abs((o ? o.a : 0) - (o0 ? o0.a : 0)));
    o0 = o;
  }
  ok(`${season} : aucune minute ne fait sauter l'ombre (objet de 40 px)`, jump < 1 && ja < 0.01, `glissement max ${jump.toFixed(2)} px, opacité ${ja.toFixed(4)}`);
}
{
  const w = O.sunShadow(12.5, ...SUN.winter, "winter"), su = O.sunShadow(13.75, ...SUN.summer, "summer");
  ok("l'hiver, l'ombre de midi est plus longue que l'été", w.k > su.k * 1.5, `hiver ×${w.k.toFixed(2)}, été ×${su.k.toFixed(2)}`);
  const lo = O.sunShadow(SUN.spring[0] + 0.2, ...SUN.spring, "spring");
  ok("au lever, elle naît pâle (pas d'ombre franche d'un coup)", lo === null || lo.a < O.OMBRE.ALPHA * 0.75, lo ? `a ${lo.a.toFixed(3)}` : "pas encore");
  const max = Math.max(...Array.from({ length: 200 }, (_, i) => { const o = O.sunShadow(SUN.winter[0] + 0.01 + i * 0.04, ...SUN.winter, "winter"); return o ? o.k : 0; }));
  ok("la longueur reste bornée (elle ne sort pas de l'écran)", max <= O.OMBRE.K_MAX + 1e-9, `×${max.toFixed(2)} au plus`);
}
{
  const [r, s] = SUN.summer, h = 14;
  const clear = O.sunShadow(h, r, s, "summer"), grey = O.sunShadow(h, r, s, "summer", { dark: 0.3 }), rain = O.sunShadow(h, r, s, "summer", { dark: 0.45, rain: 0.7 }), snow = O.sunShadow(h, r, s, "summer", { snow: 0.5 });
  ok("le ciel couvert la pâlit, la pluie et la neige qui tombe l'éteignent", grey.a < clear.a * 0.7 && rain.a < 0.02 && snow.a < 0.02, `clair ${clear.a.toFixed(2)}, couvert ${grey.a.toFixed(2)}, pluie ${rain.a.toFixed(3)}, neige ${snow.a.toFixed(3)}`);
}
{
  const sh = { sx: 0.6, sy: 0.4 }, base = 500, ox = 100, oy = 300;
  const [a, b, c, d, e, f] = O.shearMatrix(sh, base, ox, oy);
  const map = (x, y) => [a * x + c * y + e, b * x + d * y + f];
  const p0 = map(220, base), p1 = map(220, base - 40);
  ok("la matrice laisse la ligne de sol en place", Math.abs(p0[0] - (220 - ox)) < 1e-9 && Math.abs(p0[1] - (base - oy)) < 1e-9);
  ok("…et pose un point à 40 px de haut à (40·sx, 40·sy) de son pied", Math.abs(p1[0] - (220 - ox + 40 * sh.sx)) < 1e-9 && Math.abs(p1[1] - (base - oy + 40 * sh.sy)) < 1e-9);
}
console.log(`\n${fails ? "❌" : "✅"} ${total - fails}/${total} contrôles passés.`);
process.exit(fails ? 1 : 0);
