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
/* ⚠️ ET IL ROULE AU MILIEU. Mesure directe : le dégagement moyen sous les roues
   pendant les 132 courses. Un taxi qui longe le trottoir a un dégagement de 1 ;
   l'axe d'une avenue en vaut 3 ou plus. C'est LA plainte qui a produit la carte
   de chanfrein, donc c'est elle qu'on mesure — pas « le chemin existe ». */
{
  let sum = 0, n2 = 0, hugging = 0, offAxis = 0, n3 = 0;
  const roadAt = (x, y) => { const fx = Math.floor(x), fy = Math.floor(y);
    return fx >= 0 && fy >= 0 && fx < nav.w && fy < nav.h && !!nav.walk[fy * nav.w + fx]; };
  /* ⚠️ LA MESURE COMPTE DES CASES, ELLE NE SONDE PAS PAR DEMI-PAS. Premier jet :
     on avançait de 0,5 en 0,5 et on s'arrêtait sur le dernier échantillon
     ROULABLE — donc on ratait le bord d'un demi-pas, et une voiture PARFAITEMENT
     centrée sur une rue de deux cases mesurait 0,25 d'écart. Le banc accusait la
     conduite d'un défaut qui était le sien. Un banc de mesure se vérifie aussi
     (§10). */
  const axisOffset = (x, y, ang) => {
    const fx = Math.floor(x), fy = Math.floor(y);
    if (!roadAt(x, y)) return null;
    const horiz = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang));
    let nPos = 0, nNeg = 0;
    const R = (ax, ay) => roadAt(ax + 0.5, ay + 0.5);
    if (horiz) {
      while (nPos < 6 && R(fx, fy + nPos + 1)) nPos++;
      while (nNeg < 6 && R(fx, fy - nNeg - 1)) nNeg++;
    } else {
      while (nPos < 6 && R(fx + nPos + 1, fy)) nPos++;
      while (nNeg < 6 && R(fx - nNeg - 1, fy)) nNeg++;
    }
    if (nPos >= 6 || nNeg >= 6) return null;         // esplanade : pas d'axe
    const base = horiz ? fy : fx;
    const mid = (base - nNeg + base + nPos + 1) / 2;
    return Math.abs((horiz ? y : x) - mid);
  };
  for (const a of stops) for (const b of stops) {
    if (a === b) continue;
    const p = E.townRoadPath(tw, a.x, a.y, b.x, b.y);
    if (!p) continue;
    const t = { x: p[0].x, y: p[0].y, ang: Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x), spd: 0, path: p, i: 1 };
    let sec = 0, done = false;
    while (sec < MAX_S && !done) {
      done = E.taxiStep(t, DT, CFG); sec += DT;
      if (((sec * 60) | 0) % 6 === 0) {
        const fx = Math.floor(t.x), fy = Math.floor(t.y);
        if (fx >= 0 && fy >= 0 && fx < nav.w && fy < nav.h) {
          const cl = nav.clear[fy * nav.w + fx];
          sum += cl; n2++; if (cl <= 1) hugging++;
          const off2 = axisOffset(t.x, t.y, t.ang);
          if (off2 !== null) { offAxis += off2; n3++; }
        }
      }
    }
  }
  /* ⚠️ LA BONNE MESURE N'EST PAS LE DÉGAGEMENT, C'EST L'ÉCART À L'AXE. 85 % des
     rues de la ville font une à deux cases de large : exiger « trois cases de
     dégagement » serait exiger une ville qui n'existe pas. Ce qu'on veut, c'est
     que la voiture soit au MILIEU de la bande, quelle que soit sa largeur — donc
     on sonde perpendiculairement sous les roues et on mesure de combien elle est
     décentrée. Zéro = pile sur l'axe ; 0,5 = collée à un bord d'une rue de deux
     cases, c'est-à-dire le défaut d'origine. */
  const avg = sum / Math.max(1, n2);
  ok(offAxis / Math.max(1, n3) < 0.22, "⚠️ il roule sur l'AXE de la chaussée",
     "écart moyen à l'axe : " + (offAxis / Math.max(1, n3)).toFixed(2) + " case (0,5 = collé au bord)");
  console.log("       dégagement moyen sous les roues : " + avg.toFixed(2) + " cases");
}
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
