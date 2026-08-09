/* =============================================================================
   verify-taxi.mjs — LE TAXI DE VALLEY TOWN, REJOUÉ POUR DE VRAI. (432)
   -----------------------------------------------------------------------------
   ⚠️⚠️ CE BANC EXISTE PARCE QU'UNE CONDUITE SE JUGE MAL À L'ŒIL. Trois vitesses
   cibles se contredisent en permanence (croisière, virage, freinage d'approche) ;
   regardée une minute, la voiture a toujours l'air d'aller au bon endroit — et
   tourne en rond une fois sur cent, sur un trajet qu'on n'a pas essayé. On
   n'essaie pas : on rejoue les 132 trajets, à 60 images par seconde, avec la
   VRAIE fonction du moteur (`E.taxiStep`) sur le VRAI réseau routier.

   Ce qu'il vérifie, dans l'ordre de ce qui coûterait le plus cher :
     1. le réseau routier est connexe là où on promet des destinations ;
     2. chaque trajet ARRIVE, et en un temps plausible ;
     3. la voiture ne coupe jamais par l'herbe (elle reste sur le dallage) ;
     4. elle ralentit vraiment dans les virages — sinon « conduite soignée » est
        un mot dans un commentaire, pas un comportement.

   Usage :  node tools/verify-taxi.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine"]);
const E = mods.fermeEngine, C = mods.fermeConstants;

let pass = 0, fail = 0;
const ok = (cond, label, detail) => {
  if (cond) { pass++; console.log("  OK   " + label + (detail ? "  —  " + detail : "")); }
  else { fail++; console.log("  FAIL " + label + (detail ? "  —  " + detail : "")); }
};

const tw = E.generateTownWorld();
const nav = E.townRoadNav(tw);
const stops = E.townTaxiStops(tw);

console.log("\n=== Le réseau routier ===\n");
let drivable = 0;
for (let i = 0; i < nav.walk.length; i++) drivable += nav.walk[i];
ok(drivable > 3000, "la ville a un vrai réseau de rues", drivable + " cases roulables");
ok(nav.main >= 0 && nav.mainN > drivable * 0.6, "une artère principale domine",
   nav.mainN + " cases sur " + drivable);
ok(stops.length >= 10, "assez de destinations", stops.length + " arrêts");
ok(stops.every(s => nav.comp[Math.floor(s.y) * nav.w + Math.floor(s.x)] === nav.main),
   "⚠️ chaque arrêt est SUR le réseau principal",
   "sinon on propose une destination où le taxi ne peut pas aller");

console.log("\n=== Les 132 trajets, rejoués image par image ===\n");
const CFG = {
  SPEED: C.TAXI_SPEED, ACCEL: C.TAXI_ACCEL, BRAKE: C.TAXI_BRAKE,
  CORNER_MIN: C.TAXI_CORNER_MIN, LOOKAHEAD: C.TAXI_LOOKAHEAD,
  TURN_RATE: C.TAXI_TURN_RATE, ARRIVE_R: C.TAXI_ARRIVE_R,
};
const DT = 1 / 60, MAX_S = 240;
let runs = 0, arrived = 0, offRoad = 0, slowest = 0, fastest = 1e9, worstOff = null;
let sumT = 0, corners = 0, cornerSlow = 0;

const drivableAt = (x, y) => {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (fx < 0 || fy < 0 || fx >= nav.w || fy >= nav.h) return false;
  return !!nav.walk[fy * nav.w + fx];
};

for (const a of stops) for (const b of stops) {
  if (a === b) continue;
  const p = E.townRoadPath(tw, a.x, a.y, b.x, b.y);
  runs++;
  if (!p || p.length < 2) continue;
  const t = { x: p[0].x, y: p[0].y, ang: Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x), spd: 0, path: p, i: 1 };
  let sec = 0, done = false, off = 0, minCornerSpd = CFG.SPEED, sawCorner = false;
  while (sec < MAX_S && !done) {
    const before = t.i;
    done = E.taxiStep(t, DT, CFG);
    sec += DT;
    /* ⚠️ TOLÉRANCE D'UNE DEMI-CASE : la voiture coupe forcément un peu les
       angles (elle a un rayon de braquage), et le chemin passe au CENTRE des
       cases. Ce qu'on interdit, c'est de traverser la pelouse, pas de mordre
       le trottoir. */
    if (!drivableAt(t.x, t.y) && !drivableAt(t.x + 0.5, t.y) && !drivableAt(t.x - 0.5, t.y)
        && !drivableAt(t.x, t.y + 0.5) && !drivableAt(t.x, t.y - 0.5)) off++;
    if (before !== t.i && t.i > 2 && t.i < p.length - 2) {
      // un point de passage franchi en plein trajet : y a-t-il eu un virage ?
      const va = Math.atan2(p[t.i - 1].y - p[t.i - 2].y, p[t.i - 1].x - p[t.i - 2].x);
      const vb = Math.atan2(p[t.i].y - p[t.i - 1].y, p[t.i].x - p[t.i - 1].x);
      let da = Math.abs(vb - va); while (da > Math.PI) da = Math.abs(da - 2 * Math.PI);
      if (da > 0.7) { sawCorner = true; minCornerSpd = Math.min(minCornerSpd, t.spd); }
    }
  }
  if (done) { arrived++; sumT += sec; slowest = Math.max(slowest, sec); fastest = Math.min(fastest, sec); }
  if (off > 0) { offRoad++; if (!worstOff || off > worstOff.n) worstOff = { n: off, from: a.key, to: b.key }; }
  if (sawCorner) { corners++; if (minCornerSpd < CFG.SPEED * 0.9) cornerSlow++; }
}
ok(arrived === runs, "TOUS les trajets arrivent", arrived + "/" + runs);
ok(offRoad === 0, "⚠️ le taxi ne roule JAMAIS sur l'herbe",
   offRoad ? (offRoad + " trajets hors chaussée, pire : " + worstOff.from + "→" + worstOff.to) : "132 trajets sur le dallage");
ok(slowest < 120, "aucune course interminable", "la plus longue : " + slowest.toFixed(1) + " s");
ok(fastest > 1.0, "aucune course instantanée", "la plus courte : " + fastest.toFixed(1) + " s");
console.log("       durée moyenne : " + (sumT / Math.max(1, arrived)).toFixed(1) + " s"
            + "   vitesse de croisière : " + C.TAXI_SPEED.toFixed(2) + " tuiles/s (= le cheval)");
ok(corners > 0 && cornerSlow / corners > 0.8, "⚠️ il RALENTIT dans les virages",
   corners ? (cornerSlow + "/" + corners + " virages pris en dessous de la vitesse de croisière") : "aucun virage rencontré");

console.log("\n=== Le démarrage et le freinage ===\n");
{
  // Une ligne droite franche : on mesure le temps pour atteindre 95 % de la
  // vitesse, puis la distance de freinage. Ce sont les deux chiffres qu'un
  // joueur ressent — « ça démarre mou », « ça pile ».
  const straight = [];
  for (let k = 0; k <= 60; k++) straight.push({ x: 10.5 + k, y: 10.5 });
  const t = { x: 10.5, y: 10.5, ang: 0, spd: 0, path: straight, i: 1 };
  let sec = 0, tTo95 = -1;
  while (sec < 20 && t.i < straight.length) {
    E.taxiStep(t, DT, CFG); sec += DT;
    if (tTo95 < 0 && t.spd >= CFG.SPEED * 0.95) tTo95 = sec;
  }
  ok(tTo95 > 0.6 && tTo95 < 2.5, "l'accélération est progressive", "0 → 95 % en " + tTo95.toFixed(2) + " s");
  const t2 = { x: 10.5, y: 10.5, ang: 0, spd: CFG.SPEED, path: [{ x: 10.5, y: 10.5 }, { x: 30.5, y: 10.5 }], i: 1 };
  let d0 = 0, brakeStart = -1;
  while (t2.i < 2 && d0 < 40) {
    const px = t2.x; E.taxiStep(t2, DT, CFG); d0 += Math.abs(t2.x - px);
    if (brakeStart < 0 && t2.spd < CFG.SPEED * 0.98) brakeStart = 30.5 - t2.x;
  }
  ok(brakeStart > 1.5 && brakeStart < 12, "le ralentissement commence LOIN du but",
     "il lève le pied à " + brakeStart.toFixed(1) + " tuiles de l'arrivée");
}

console.log("\n" + (fail ? "❌ " + fail + " contrôle(s) en échec — " : "✅ ") + pass + "/" + (pass + fail) + " contrôles passés.\n");
process.exit(fail ? 1 : 0);
