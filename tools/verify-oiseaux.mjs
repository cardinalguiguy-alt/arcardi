/* =============================================================================
   verify-oiseaux.mjs — LES GRUES CENDRÉES QUI PASSENT (`components/ferme/oiseaux.js`, dessin : `oiseauxArt.js`). 2026-11-21.
   On tient : seulement en migration (l'automne avancé vers le sud-ouest, la fin de l'hiver et le début du printemps vers le
   nord-est ; jamais l'été) ; de jour seulement ; jamais sous la pluie, la neige ou l'orage ; déterministes (deux joueurs, même vol) ;
   le V a sa tête devant et deux branches derrière elle ; le vol traverse la carte et en sort ; une fréquence de quelques vols par
   heure réelle au plus fort, pas un défilé.
   Usage : node tools/verify-oiseaux.mjs      FALSIFY=ete : les grues passent aussi l'été — un contrôle rougit
   ========================================================================== */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import os from "os";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let src = fs.readFileSync(path.join(ROOT, "components", "ferme", "oiseaux.js"), "utf8");
if (process.env.FALSIFY === "ete") src = src.replace("return autumn >= spring ? { k: autumn, dir: 1 } : { k: spring, dir: -1 };", "return { k: 1, dir: 1 };");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oiseaux-"));
fs.writeFileSync(path.join(tmp, "oiseaux.mjs"), src);
const G = await import(pathToFileURL(path.join(tmp, "oiseaux.mjs")).href);
let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
console.log("\n=== verify-oiseaux — les grues cendrées ===\n");
const W0 = { rain: 0, snow: 0, dark: 0, bolts: 0 };
const base = 1795000000000;
const countFlights = (phase, hour, W, hours = 6) => {
  let n = 0;
  for (let t = 0; t < hours * 3600e3; t += G.GRUES.SLOT_S * 1000) {
    const fl = G.flightOf(Math.floor((base + t) / (G.GRUES.SLOT_S * 1000)), 4242, 224, 168, G.migrationAt(phase).k, G.migrationAt(phase).dir);
    if (fl && G.cranesNow({ nowMs: fl.t0, seed: 4242, mapW: 224, mapH: 168, phase, hour, W }).length) n++;
  }
  return n;
};
ok("jamais l'été (phase 1,5)", countFlights(1.5, 12, W0) === 0);
ok("jamais au cœur de l'hiver (phase 3,3)", countFlights(3.3, 12, W0) === 0);
const aut = countFlights(2.6, 12, W0, 12), spr = countFlights(0.1, 12, W0, 12);
ok("à l'automne avancé, quelques vols par heure réelle (2 à 6)", aut / 12 >= 2 && aut / 12 <= 6, `${(aut / 12).toFixed(1)} par heure`);
ok("au retour (fin d'hiver, début de printemps), aussi", spr / 12 >= 2 && spr / 12 <= 6, `${(spr / 12).toFixed(1)} par heure`);
ok("de nuit, rien", countFlights(2.6, 22, W0) === 0 && countFlights(2.6, 6.5, W0) === 0);
ok("sous la pluie, la neige ou l'orage, rien", countFlights(2.6, 12, { ...W0, rain: 0.5 }) === 0 && countFlights(2.6, 12, { ...W0, snow: 0.4 }) === 0 && countFlights(2.6, 12, { ...W0, bolts: 0.5, dark: 0.8 }) === 0);
// le cap : sud-ouest à l'automne, nord-est au retour
let sw = 0, ne = 0, nA = 0, nS = 0;
for (let s = 0; s < 400; s++) {
  const a = G.flightOf(s, 7, 224, 168, 1, 1), b = G.flightOf(s, 7, 224, 168, 1, -1);
  if (a) { nA++; if (a.hx < 0 && a.hy > 0) sw++; }
  if (b) { nS++; if (b.hx > 0 && b.hy < 0) ne++; }
}
ok("l'automne vers le sud-ouest, le retour vers le nord-est (bas-gauche / haut-droite de l'écran)", sw === nA && ne === nS && nA > 50, `${sw}/${nA}, ${ne}/${nS}`);
// déterministe
const f1 = G.flightOf(1234, 99, 224, 168, 1, 1), f2 = G.flightOf(1234, 99, 224, 168, 1, 1);
ok("déterministe : même créneau, même graine, même vol", JSON.stringify(f1) === JSON.stringify(f2));
// le V
let vOk = true, nCheck = 0;
for (let s = 0; s < 200 && nCheck < 40; s++) {
  const fl = G.flightOf(s, 11, 224, 168, 1, 1); if (!fl) continue; nCheck++;
  const b = G.flockAt(fl, fl.t0, 224, 168), lead = b.find((q) => q.i === 0);
  if (!lead || b.length !== fl.n) { vOk = false; break; }
  for (const q of b) {
    if (q.i === 0) continue;
    const along = (q.gx - lead.gx) * fl.hx + (q.gy - lead.gy) * fl.hy;
    if (along > -0.4) { vOk = false; break; }                     // toutes derrière la tête
  }
  const sides = b.filter((q) => q.i > 0).map((q) => Math.sign((q.gx - lead.gx) * -fl.hy + (q.gy - lead.gy) * fl.hx));
  if (!sides.includes(1) || !sides.includes(-1)) vOk = false;     // deux branches
}
ok("le V : la tête devant, toutes les autres derrière elle, sur deux branches", vOk && nCheck >= 20, `${nCheck} vols lus`);
// il traverse et sort
let fl = null; for (let k = 0; k < 50 && !fl; k++) fl = G.flightOf(k, 3, 224, 168, 1, 1);
const before = G.flockAt(fl, fl.t0 - 60e3, 224, 168).length, mid = G.flockAt(fl, fl.t0, 224, 168).length, after = G.flockAt(fl, fl.t0 + 60e3, 224, 168).length;
ok("le vol entre sur la carte, la traverse, et en sort", before === 0 && mid === fl.n && after === 0, `${before} / ${mid} / ${after}`);
// le menu dev
const st = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeStrings.js"), "utf8");
ok("son interrupteur a son nom en français et en anglais", (st.match(/cranes: "/g) || []).length >= 2);
console.log(`\n${total - fails}/${total} contrôles${fails ? ` — ${fails} ÉCHEC(S)` : " — tout est vert"}\n`);
process.exit(fails ? 1 : 0);
