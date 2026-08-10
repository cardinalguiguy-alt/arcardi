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
  let sum = 0, n2 = 0, hugging = 0, offAxis = 0, offRel = 0, n3 = 0;
  const roadAt = (x, y) => { const fx = Math.floor(x), fy = Math.floor(y);
    return fx >= 0 && fy >= 0 && fx < nav.w && fy < nav.h && !!nav.walk[fy * nav.w + fx]; };
  /* ⚠️ LA MESURE COMPTE DES CASES, ELLE NE SONDE PAS PAR DEMI-PAS. Premier jet :
     on avançait de 0,5 en 0,5 et on s'arrêtait sur le dernier échantillon
     ROULABLE — donc on ratait le bord d'un demi-pas, et une voiture PARFAITEMENT
     centrée sur une rue de deux cases mesurait 0,25 d'écart. Le banc accusait la
     conduite d'un défaut qui était le sien. Un banc de mesure se vérifie aussi
     (§10). */
  /* ⚠️⚠️ 433 — ET IL FALLAIT LE MÊME GABARIT DE PERSISTANCE QUE `townRoadCenter`.
     Sonder la largeur AU POINT compte la bouche des rues transversales comme de
     la chaussée : à hauteur d'une rue latérale, ce banc voyait « cinq cases de
     large », plaçait l'axe un cran et demi plus haut, et accusait d'un écart de
     1,5 case une voiture pile au milieu de son avenue. La chaussée, ici comme
     dans le moteur, est la largeur qui PERSISTE le long de la marche. */
  const SPAN = 3;
  const axisOffset = (x, y, ang) => {
    const fx = Math.floor(x), fy = Math.floor(y);
    if (!roadAt(x, y)) return null;
    const horiz = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang));
    const R = (ax, ay) => roadAt(ax + 0.5, ay + 0.5);
    let nPos = 6, nNeg = 6, seen = 0;
    for (let s = -SPAN; s <= SPAN; s++) {
      const sx = horiz ? fx + s : fx, sy = horiz ? fy : fy + s;
      if (!R(sx, sy)) continue;
      let p2 = 0, n2b = 0;
      if (horiz) {
        while (p2 < 6 && R(sx, sy + p2 + 1)) p2++;
        while (n2b < 6 && R(sx, sy - n2b - 1)) n2b++;
      } else {
        while (p2 < 6 && R(sx + p2 + 1, sy)) p2++;
        while (n2b < 6 && R(sx - n2b - 1, sy)) n2b++;
      }
      nPos = Math.min(nPos, p2); nNeg = Math.min(nNeg, n2b); seen++;
    }
    if (!seen || nPos >= 6 || nNeg >= 6) return null;   // esplanade : pas d'axe
    const base = horiz ? fy : fx;
    const mid = (base - nNeg + base + nPos + 1) / 2;
    // On rend l'écart ET la demi-largeur : le second sert à normaliser (voir
    // plus bas), sans quoi la mesure change de sens quand la rue change de
    // largeur.
    return { off: Math.abs((horiz ? y : x) - mid), half: (nPos + nNeg + 1) / 2 };
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
          if (off2 !== null) { offAxis += off2.off; offRel += off2.off / off2.half; n3++; }
        }
      }
    }
  }
  /* ⚠️ LA BONNE MESURE N'EST PAS LE DÉGAGEMENT, C'EST L'ÉCART À L'AXE. 85 % des
     rues de la ville font une à deux cases de large : exiger « trois cases de
     dégagement » serait exiger une ville qui n'existe pas. Ce qu'on veut, c'est
     que la voiture soit au MILIEU de la bande, quelle que soit sa largeur — donc
     on sonde perpendiculairement sous les roues et on mesure de combien elle est
     décentrée.

     ⚠️⚠️ ZIP 434 — ET L'ÉCART SE MESURE EN FRACTION DE DEMI-CHAUSSÉE, PLUS EN
     CASES. C'est le zip qui a élargi l'artère de la gare à quatre cases qui l'a
     révélé, et c'est encore le même défaut de banc qu'au 433 : le seuil absolu
     de 0,22 case était calibré sur une ville faite de rues de deux cases, où
     0,5 veut dire « collé au trottoir ». Sur une chaussée de quatre, 0,5 veut
     dire « pile dans sa voie » — et le banc a refusé une conduite MEILLEURE
     que celle qu'il validait la veille (mesuré, par largeur de rue : 0,180 de
     demi-chaussée sur les rues de deux cases, 0,156 sur l'artère de quatre).
     La grandeur qui a un sens partout est le rapport : 0 = pile sur l'axe,
     1 = roue sur la bordure, quelle que soit la largeur.
     ⚠️ Ce n'est PAS un seuil desserré pour faire passer le banc — c'est un
     changement d'unité, et l'écart en cases reste imprimé à côté. */
  const avg = sum / Math.max(1, n2);
  const rel = offRel / Math.max(1, n3);
  ok(rel < 0.35, "⚠️ il roule sur l'AXE de la chaussée",
     rel.toFixed(3) + " de demi-chaussée (1 = roue sur la bordure) · "
     + (offAxis / Math.max(1, n3)).toFixed(2) + " case en absolu");
  console.log("       dégagement moyen sous les roues : " + avg.toFixed(2) + " cases");
}
ok(corners > 0 && cornerSlow / corners > 0.8, "⚠️ il RALENTIT dans les virages",
   corners ? (cornerSlow + "/" + corners + " virages pris en dessous de la vitesse de croisière") : "aucun virage rencontré");

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ ZIP 433 — LE TRAJET NE TOURNE QUE QUAND LA RUE TOURNE.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ CE CHAPITRE EXISTE PARCE QUE LES ONZE CONTRÔLES D'AVANT DISAIENT TOUS OK
   pendant que Guillaume voyait, en jouant, « une trajectoire stupide, il prend
   des virages plus que nécessaire ». Ils mesuraient l'ARRIVÉE, la CHAUSSÉE, la
   VITESSE — jamais la FORME du trajet. La voiture arrivait bien, restait bien
   sur le pavé, ralentissait bien dans les courbes : elle montait simplement dans
   la bouche de chaque rue transversale au passage, et redescendait.

   ⚠️ CE QU'ON MESURE N'EST PAS « c'est joli » mais trois quantités géométriques
   qu'un défaut de ce genre fait exploser et qu'une route saine garde basses.
   Les chiffres ci-dessous ont été obtenus en LANÇANT ce banc contre le moteur
   du 432 (`git stash`), puis contre celui du 433 :

     |                              | 432   | 433  |
     |------------------------------|-------|------|
     | aller-retour (132 trajets)   | 598   | 0    |
     | rotation cumulée, moyenne    | 969°  | 214° |
     | rotation cumulée, pire       | 2095° | 462° |
     | pire détour                  | ×1,11 | ×1,03|

     1. la ROTATION CUMULÉE du tracé : un trajet qui descend une avenue
        rectiligne ne doit pas tourner ;
     2. les ALLER-RETOUR : deux virages consécutifs de sens OPPOSÉS, de plus de
        40° chacun, séparés par moins de trois tuiles. C'est la définition
        géométrique exacte d'une dent de scie, et une rue n'en produit jamais.
        ⚠️ Le seuil de DISTANCE est ce qui distingue un tracé légitimement
        sinueux (une route en S le long du lac, virages espacés) d'un
        tressautement ; sans lui, on interdirait les belles routes ;
     3. le DÉTOUR : la longueur du trajet rapportée au plus court chemin
        roulable, calculé ici par un Dijkstra à part — un banc ne mesure pas un
        trajet avec l'outil qui l'a produit. */
console.log("\n=== La forme du trajet (433) ===\n");
{
  /* Le plus court chemin PUR, sans aucun surcoût : le dénominateur du détour.
     Dijkstra octile sur le même graphe — écrit ici et pas dans le moteur, pour
     que le banc ne mesure pas le trajet avec l'outil qui l'a produit. */
  const pureLen = (x0, y0, x1, y1) => {
    const W = nav.w, H = nav.h;
    const s0 = Math.floor(y0) * W + Math.floor(x0), gI = Math.floor(y1) * W + Math.floor(x1);
    const g = new Float64Array(W * H).fill(Infinity);
    const heap = [], key = [];
    const push = (i, k) => { heap.push(i); key.push(k); let c = heap.length - 1;
      while (c > 0) { const p = (c - 1) >> 1; if (key[p] <= key[c]) break;
        [heap[p], heap[c]] = [heap[c], heap[p]]; [key[p], key[c]] = [key[c], key[p]]; c = p; } };
    const pop = () => { const t0 = heap[0], li = heap.length - 1;
      heap[0] = heap[li]; key[0] = key[li]; heap.pop(); key.pop();
      let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c;
        if (l < heap.length && key[l] < key[m]) m = l;
        if (r < heap.length && key[r] < key[m]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]]; [key[m], key[c]] = [key[c], key[m]]; c = m; } return t0; };
    g[s0] = 0; push(s0, 0);
    while (heap.length) {
      const cur = pop(); if (cur === gI) return g[gI];
      const cx = cur % W, cy = (cur / W) | 0, ce = tw.elev[cur];
      for (let k = 0; k < 8; k++) {
        const dx = k < 4 ? [1, -1, 0, 0][k] : [1, 1, -1, -1][k - 4];
        const dy = k < 4 ? [0, 0, 1, -1][k] : [1, -1, 1, -1][k - 4];
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nb = ny * W + nx;
        if (!nav.walk[nb]) continue;
        if (Math.abs(tw.elev[nb] - ce) > C.TOWN_STEP_MAX) continue;
        if (dx && dy && (!nav.walk[cy * W + nx] || !nav.walk[ny * W + cx])) continue;
        const ng = g[cur] + ((dx && dy) ? Math.SQRT2 : 1);
        if (ng < g[nb]) { g[nb] = ng; push(nb, ng); }
      }
    }
    return Infinity;
  };
  let sawtooth = 0, worstSaw = null, maxSpin = 0, worstSpin = null, sumSpin = 0, nP = 0;
  let maxDetour = 1, worstDet = null;
  for (const a of stops) for (const b of stops) {
    if (a === b) continue;
    const p = E.townRoadPath(tw, a.x, a.y, b.x, b.y);
    if (!p || p.length < 3) continue;
    nP++;
    const ang = [], seg = [];
    for (let k = 1; k < p.length; k++) {
      ang.push(Math.atan2(p[k].y - p[k - 1].y, p[k].x - p[k - 1].x));
      seg.push(Math.hypot(p[k].x - p[k - 1].x, p[k].y - p[k - 1].y));
    }
    let spin = 0, len = 0;
    for (const s of seg) len += s;
    const d = [];
    for (let k = 1; k < ang.length; k++) {
      let da = ang[k] - ang[k - 1];
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      d.push(da); spin += Math.abs(da);
    }
    for (let k = 1; k < d.length; k++) {
      if (d[k] * d[k - 1] < 0 && Math.abs(d[k]) > 0.7 && Math.abs(d[k - 1]) > 0.7 && seg[k] < 3) {
        sawtooth++;
        if (!worstSaw) worstSaw = a.key + "→" + b.key;
      }
    }
    const deg = spin * 180 / Math.PI;
    sumSpin += deg;
    if (deg > maxSpin) { maxSpin = deg; worstSpin = a.key + "→" + b.key; }
    const pure = pureLen(a.x, a.y, b.x, b.y);
    if (pure > 1 && len / pure > maxDetour) { maxDetour = len / pure; worstDet = a.key + "→" + b.key; }
  }
  ok(sawtooth === 0, "⚠️ aucune dent de scie",
     sawtooth ? (sawtooth + " aller-retour, dont " + worstSaw) : "0 aller-retour sur les " + nP + " trajets");
  ok(maxSpin < 700, "⚠️ il ne tourne que quand la rue tourne",
     "rotation cumulée : " + (sumSpin / nP).toFixed(0) + "° en moyenne, " + maxSpin.toFixed(0) + "° au pire (" + worstSpin + ")");
  ok(maxDetour < 1.12, "aucun détour",
     "le pire trajet fait ×" + maxDetour.toFixed(2) + " la distance minimale (" + worstDet + ")");
}

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
