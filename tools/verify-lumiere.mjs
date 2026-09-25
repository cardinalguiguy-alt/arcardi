/* =============================================================================
   verify-lumiere.mjs — LA LUMIÈRE (2026-09-25, phase 3 de la feuille de route
   graphique de Valley Town).
   -----------------------------------------------------------------------------
   `components/ferme/lumiere.js` remplace le voile de nuit par un ciel qui
   MULTIPLIE la scène et des lampes qui s'y AJOUTENT, en paliers, arrêtées par
   les bâtiments. Le rendu (canevas, composition `multiply`/`lighter`) ne se
   juge qu'à l'écran — le faux canevas des bancs ne compose pas. Ce banc tient
   ce qui, dessous, est de la DONNÉE et de la GÉOMÉTRIE, et qui ne se voit pas
   en relisant :

   1. LE CIEL. Continu sur toute la journée (un saut d'une minute à l'autre
      serait un flash à l'écran), blanc à midi, lune la nuit, une soirée qui
      ne fait que s'assombrir, une aube qui ne fait que s'éclaircir — et des
      instants-clés DÉRIVÉS des constantes de l'aube et du crépuscule.
   2. L'OBSCURITÉ (`nightFromSky`), qui décide des allumages : bornée, nulle
      à midi, au plafond sous la lune.
   3. LES LANTERNES : une lanterne allumée le reste quand la nuit s'épaissit
      (pas de clignotement au crépuscule), et elles s'allument ÉCHELONNÉES.
   4. LES FENÊTRES : noires chez un dormeur, noires à midi, toutes éteintes
      après 1h30, échelonnées le soir.
   5. LES ANNEAUX : paliers qui ne remontent jamais en s'éloignant, symétrie,
      tramage présent.
   6. LES OMBRES : l'union des quadrilatères de `shadowQuads` confrontée, point
      par point, à un test INDÉPENDANT (le segment lampe → point coupe-t-il
      l'emprise ?). Deux écritures de la même géométrie qui doivent s'accorder.
   7. L'ORAGE ET SES ÉCLAIRS : ciel d'orage plus sombre à toute heure, éclair
      qui éclaircit, fréquence plausible sur une journée d'orage, rejouable.
   8. LES MONUMENTS : chaque calque de nuit existe à chaque cran, à la taille
      de son image de jour, n'allume RIEN hors du bâtiment, et en allume assez ;
      leurs lampes peintes tombent dans l'image, la flaque sous le verre.
   9. LA FENÊTRE DES MAISONS : chaque pixel du calque allumé tombe sur une
      vitre de la maison, dans les dix façades — une fenêtre allumée à côté de
      sa vitre est exactement le défaut que la table partagée empêche.
  10. LE VERRE DES LANTERNES : l'ancre tirée du dessin tombe sur un pixel
      chaud et clair du sprite allumé.

   Usage :  node tools/verify-lumiere.mjs
   ========================================================================== */
import { readFileSync, existsSync } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const { lumiere: LM, fermeConstants: C, fermeArt: A } = await loadFerme(ROOT, ["lumiere", "fermeConstants", "fermeArt"]);

let fail = 0, n = 0;
const ok = (cond, label, detail) => {
  n++;
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};
const lum = LM.lum;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

console.log("\n=== verify-lumiere — le ciel, les lampes, les fenêtres, les ombres ===\n");

/* ═══════════════════════════════════════════════ 1. LE CIEL */
{
  const T0 = C.DAY_START_MIN, T1 = C.DAY_END_MIN;
  let maxStep = 0, at = 0, read = 0;
  for (let t = T0; t < T1; t += 0.25) {
    const a = LM.skyAt(t), b = LM.skyAt(t + 0.25);
    read++;
    for (let k = 0; k < 3; k++) { const d = Math.abs(a[k] - b[k]) * 4; if (d > maxStep) { maxStep = d; at = t; } }
  }
  ok(maxStep < 0.02, "le ciel ne saute jamais d'une minute à l'autre", `pas max ${maxStep.toFixed(4)}/min vers ${Math.floor(at / 60)}h${String(Math.round(at % 60)).padStart(2, "0")} (${read} instants lus)`);
  const noon = LM.skyAt(12 * 60);
  ok(noon.every((v) => v === 1), "midi : la scène telle qu'elle est peinte", noon.join(","));
  const deep = LM.skyAt(C.DEEP_END_MIN + 30);
  ok(deep.every((v, k) => Math.abs(v - LM.SKY_NIGHT[k]) < 1e-9), "cœur de nuit : le ciel de lune", deep.map((v) => v.toFixed(2)).join(","));
  ok(deep[2] > deep[0] && deep[2] > deep[1], "la lune est BLEUE (le bleu domine la nuit)");
  ok(lum(deep) > 0.25, "et on y lit encore les silhouettes (décision « nuit de lune »)", `luminance ${lum(deep).toFixed(3)}`);
  // La soirée ne fait que s'assombrir ; l'aube ne fait que s'éclaircir.
  let evenUp = 0, dawnDown = 0;
  for (let t = C.DUSK_START_MIN; t < C.DEEP_END_MIN; t++) if (lum(LM.skyAt(t + 1)) > lum(LM.skyAt(t)) + 1e-9) evenUp++;
  for (let t = T0; t < C.DAWN_END_MIN + 90; t++) if (lum(LM.skyAt(t + 1)) < lum(LM.skyAt(t)) - 1e-9) dawnDown++;
  ok(evenUp === 0, "de 17h à 23h, le ciel ne fait que s'assombrir", `${evenUp} minutes où il remonte`);
  ok(dawnDown === 0, "à l'aube, il ne fait que s'éclaircir", `${dawnDown} minutes où il redescend`);
  // Les instants-clés sont DÉRIVÉS des constantes (§8).
  const keys = LM.skyKeys().map(([t]) => t);
  ok([C.DAWN_START_MIN, C.DAWN_END_MIN, C.DUSK_START_MIN, C.DUSK_MID_MIN, C.DEEP_END_MIN].every((c) => keys.includes(c)),
    "les instants-clés du ciel sont les bornes de l'aube et du crépuscule, pas des nombres à côté");
  ok(keys.every((t, i) => i === 0 || t >= keys[i - 1]), "les instants-clés sont dans l'ordre");
  // L'heure dorée et le coucher : chauds (le rouge devant le bleu).
  const gold = LM.skyAt(C.DUSK_START_MIN + 0.35 * (C.DUSK_MID_MIN - C.DUSK_START_MIN));
  ok(gold[0] - gold[2] > 0.1, "l'heure dorée est chaude", gold.map((v) => v.toFixed(2)).join(","));
}

/* ═══════════════════════════════════════════════ 2. L'OBSCURITÉ */
{
  let lo = 1, hi = 0, maxStep = 0;
  for (let t = C.DAY_START_MIN; t < C.DAY_END_MIN; t++) {
    const a = LM.nightFromSky(LM.skyAt(t)), b = LM.nightFromSky(LM.skyAt(t + 1));
    lo = Math.min(lo, a); hi = Math.max(hi, a); maxStep = Math.max(maxStep, Math.abs(a - b));
  }
  ok(lo === 0 && Math.abs(hi - LM.NIGHT_MAX) < 1e-9, "l'obscurité va de 0 (jour) au plafond (lune), jamais au-delà", `${lo} → ${hi.toFixed(3)}`);
  ok(maxStep < 0.03, "et elle ne saute pas", `pas max ${maxStep.toFixed(4)}/min`);
}

/* ═══════════════════════════════════════════════ 3. LES LANTERNES */
{
  let flicker = 0;
  const thresholds = new Set();
  for (let x = 0; x < 60; x++) for (let y = 0; y < 60; y++) {
    let was = false, first = null;
    for (let na = 0; na <= LM.NIGHT_MAX + 1e-9; na += 0.005) {
      const on = LM.lampLit(x, y, na);
      if (was && !on) flicker++;
      if (on && first == null) first = Math.round(na * 1000);
      was = on;
    }
    thresholds.add(first);
    if (!LM.lampLit(x, y, LM.NIGHT_MAX)) flicker++;
    if (LM.lampLit(x, y, 0)) flicker++;
  }
  ok(flicker === 0, "une lanterne allumée le reste quand la nuit s'épaissit ; toutes sous la lune, aucune à midi", `${flicker} défauts sur 3 600 cases`);
  ok(thresholds.size >= 4, "elles s'allument échelonnées", `${thresholds.size} seuils distincts`);
}

/* ═══════════════════════════════════════════════ 4. LES FENÊTRES */
{
  const NA = LM.NIGHT_MAX;
  let asleepLit = 0, noonLit = 0, lateLit = 0, eve = 0, eveN = 0, riser = 0, riserN = 0;
  const onsets = new Set();
  for (let h = 0; h < 27; h++) for (let w = 0; w < 2; w++) {
    if (LM.windowLit(h, w, 21 * 60, NA, true)) asleepLit++;
    if (LM.windowLit(h, w, 12 * 60, 0, false)) noonLit++;
    if (LM.windowLit(h, w, 1545, NA, false)) lateLit++;
    eveN++; if (LM.windowLit(h, w, 21 * 60, NA, false)) eve++;
    riserN++; if (LM.windowLit(h, w, C.DAY_START_MIN + 5, 0.5, false)) riser++;
    for (let na = 0; na <= NA; na += 0.01) if (LM.windowLit(h, w, 20 * 60, na, false)) { onsets.add(Math.round(na * 100)); break; }
  }
  ok(asleepLit === 0, "un propriétaire qui dort a ses fenêtres noires", `${asleepLit} allumées`);
  ok(noonLit === 0, "aucune fenêtre allumée à midi", `${noonLit}`);
  ok(lateLit === 0, "toutes éteintes après 1h30", `${lateLit} encore allumées à 1h45`);
  ok(eve === eveN, "toutes allumées à 21h sous la lune", `${eve}/${eveN}`);
  ok(riser > 0 && riser < riserN * 0.6, "au petit matin, quelques lève-tôt seulement", `${riser}/${riserN}`);
  ok(onsets.size >= 4, "le soir, les pièces s'allument échelonnées", `${onsets.size} seuils distincts`);
}

/* ═══════════════════════════════════════════════ 5. LES ANNEAUX */
{
  for (const R of [32, 42, 72]) {
    const px = LM.ringPixels(R, [1, 0.5, 0.1]), S = 2 * R + 1;
    const a = (x, y) => px[(y * S + x) * 4 + 3];
    let up = 0, asym = 0;
    // Sans tramage (parité paire), le palier ne remonte jamais en s'éloignant.
    for (let d = 1; d <= R; d++) if (LM.lightBand(d / (R + 0.5), 0) > LM.lightBand((d - 1) / (R + 0.5), 0)) up++;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (a(x, y) !== a(S - 1 - x, y) && ((x + y) & 1) === ((S - 1 - x + y) & 1)) asym++;
    const levels = new Set();
    for (let i = 0; i < S * S; i++) levels.add(px[i * 4 + 3]);
    ok(up === 0, `rayon ${R} : le palier ne remonte jamais en s'éloignant`);
    ok(asym === 0, `rayon ${R} : l'anneau est symétrique (hors tramage)`);
    ok(a(R, R) === 255, `rayon ${R} : plein au centre`);
    ok(a(0, 0) === 0 && a(0, R) === 0, `rayon ${R} : rien au bord du carré`);
    ok(levels.size === LM.LIGHT_BANDS + 1, `rayon ${R} : ${LM.LIGHT_BANDS} paliers et le noir, pas un dégradé`, `${levels.size} valeurs d'alpha`);
  }
  let dith = 0;
  for (let i = 0; i <= 1000; i++) if (LM.lightBand(i / 1000, 1) !== LM.lightBand(i / 1000, 0)) dith++;
  ok(dith > 0 && dith < 500, "le haut de chaque palier est tramé, le reste non", `${dith} distances tramées sur 1 001`);
}

/* ═══════════════════════════════════════════════ 6. LES OMBRES */
{
  // Le test indépendant : un point P est dans l'ombre si le segment lampe → P
  // traverse l'emprise. On échantillonne le segment (aucune formule commune
  // avec `shadowQuads` ni `pointInShadow`).
  const blocked = (lx, ly, r, px, py) => {
    if (px > r.x0 && px < r.x1 && py > r.y0 && py < r.y1) return null;   // dans l'emprise : hors sujet
    for (let i = 1; i < 400; i++) {
      const t = i / 400, x = lx + (px - lx) * t, y = ly + (py - ly) * t;
      if (x > r.x0 + 1e-6 && x < r.x1 - 1e-6 && y > r.y0 + 1e-6 && y < r.y1 - 1e-6) return true;
    }
    return false;
  };
  const inPoly = (q, x, y) => {
    let c = false;
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      const [xi, yi] = q[i], [xj, yj] = q[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  let rnd = 12345;
  const R = () => { rnd = (rnd * 1103515245 + 12345) >>> 0; return rnd / 4294967296; };
  let read = 0, disagreeQuads = 0, disagreeSeg = 0, shadowPts = 0;
  for (let k = 0; k < 400; k++) {
    const rect = { x0: 100 + R() * 40, y0: 100 + R() * 40 };
    rect.x1 = rect.x0 + 20 + R() * 80; rect.y1 = rect.y0 + 12 + R() * 40;
    let lx, ly;
    do { lx = rect.x0 - 60 + R() * (rect.x1 - rect.x0 + 120); ly = rect.y0 - 60 + R() * (rect.y1 - rect.y0 + 120); }
    while (lx > rect.x0 - 1 && lx < rect.x1 + 1 && ly > rect.y0 - 1 && ly < rect.y1 + 1);
    const far = 400, quads = LM.shadowQuads(lx, ly, rect, far);
    for (let s = 0; s < 60; s++) {
      const px = lx - 150 + R() * 300, py = ly - 150 + R() * 300;
      if (Math.hypot(px - lx, py - ly) > 150) continue;
      const ref = blocked(lx, ly, rect, px, py);
      if (ref == null) continue;
      // Loin des bords des quadrilatères (l'échantillonnage du test de
      // référence ne tranche pas à moins d'un demi-pixel d'une arête).
      const near = [[px + 0.6, py], [px - 0.6, py], [px, py + 0.6], [px, py - 0.6]].some(([x, y]) => blocked(lx, ly, rect, x, y) !== ref);
      if (near) continue;
      // Ni un rayon qui RASE un coin de l'emprise (trouvé au premier passage :
      // un rayon qui entrait de 0,005 px dans le coin, que l'échantillonnage
      // de référence manquait — les deux écritures exactes avaient raison).
      const segDist = (cx, cy) => {
        const vx = px - lx, vy = py - ly, t = clamp01(((cx - lx) * vx + (cy - ly) * vy) / (vx * vx + vy * vy));
        return Math.hypot(lx + vx * t - cx, ly + vy * t - cy);
      };
      if ([[rect.x0, rect.y0], [rect.x1, rect.y0], [rect.x0, rect.y1], [rect.x1, rect.y1]].some(([cx, cy]) => segDist(cx, cy) < 0.5)) continue;
      read++;
      if (ref) shadowPts++;
      if (quads.some((q) => inPoly(q, px, py)) !== ref) disagreeQuads++;
      if (LM.pointInShadow(lx, ly, rect, px, py) !== ref) disagreeSeg++;
    }
  }
  ok(read > 5000 && shadowPts > 500, "les ombres ont été confrontées sur assez de points", `${read} points lus, ${shadowPts} dans l'ombre`);
  ok(disagreeQuads === 0, "l'union des quadrilatères d'ombre = le test du segment", `${disagreeQuads} désaccords`);
  ok(disagreeSeg === 0, "`pointInShadow` = le test du segment", `${disagreeSeg} désaccords`);
  const rect = { x0: 0, y0: 0, x1: 96, y1: 48 };
  ok(LM.litFromFront(60, rect) && !LM.litFromFront(-10, rect) && !LM.litFromFront(20, rect),
    "une façade n'est éclairée que par une lampe DEVANT elle (au sud), pas derrière ni à côté");
  ok(LM.shadowQuads(48, 80, rect, 200).every((q) => q.every(([, y]) => y <= rect.y1 + 1e-9)),
    "une lampe devant la maison n'ombre jamais la rue devant elle");
}

/* ═══════════════════════════════════════════════ 7. L'ORAGE ET SES ÉCLAIRS */
{
  let lighter = 0;
  for (let t = C.DAY_START_MIN; t < C.DAY_END_MIN; t += 5) if (lum(LM.skyLight(t, true, 0)) >= lum(LM.skyLight(t, false, 0))) lighter++;
  ok(lighter === 0, "le ciel d'orage est plus sombre à toute heure", `${lighter} instants où il ne l'est pas`);
  let same = 0;
  for (let t = C.DAY_START_MIN; t < C.DAY_END_MIN; t += 7) { const a = LM.skyLight(t, false, 0), b = LM.skyAt(t); if (a.every((v, k) => v === b[k])) same++; }
  ok(same === Math.ceil((C.DAY_END_MIN - C.DAY_START_MIN) / 7), "sans orage, le ciel est l'heure seule");
  ok(lum(LM.skyLight(23 * 60, true, 1)) > lum(LM.skyLight(23 * 60, true, 0)) + 0.3, "un éclair éclaircit franchement la nuit d'orage");
  ok(LM.flashShape(-1) === 0 && LM.flashShape(10) === 1 && LM.flashShape(100) < LM.flashShape(150) && LM.flashShape(150) < 1 && LM.flashShape(5000) === 0,
    "un éclair : un coup franc, un creux, une réplique plus faible, puis rien");
  let strikes = 0, last = 0;
  const day = 7, t0 = 1790000000000;
  for (let t = t0; t < t0 + C.DAY_REAL_MS; t += 20) { const f = LM.flashAt(t, day); if (f === 1 && last < 1) strikes++; last = f; }
  const exp = C.DAY_REAL_MS / 26000;
  ok(strikes > exp * 0.5 && strikes < exp * 1.6, "une journée d'orage compte un éclair toutes les vingt à quarante secondes", `${strikes} éclairs sur ${C.DAY_REAL_MS / 60000} min (attendu ≈ ${exp.toFixed(0)})`);
  ok(LM.flashAt(t0 + 123456, day) === LM.flashAt(t0 + 123456, day), "l'éclair est une pure fonction du temps (deux joueurs voient le même)");
}

/* ═══════════════════════════════════════════════ 8. LES MONUMENTS */
for (const key of ["church", "townhall", "courthouse"]) {
  const SB = C.TOWN_BITMAPS[key];
  ok(!!SB.glow, `${key} : un calque de nuit est déclaré`);
  if (!SB.glow) continue;
  let bad = [];
  for (const z of SB.zooms) {
    const mip = C.townBitmapMip(SB, z);
    const fd = path.join(ROOT, "public", mip.day), fg = path.join(ROOT, "public", mip.glow);
    if (!existsSync(fg)) { bad.push(`cran ${z} : fichier absent`); continue; }
    const day = PNG.sync.read(readFileSync(fd)), glow = PNG.sync.read(readFileSync(fg));
    if (glow.width !== day.width || glow.height !== day.height) { bad.push(`cran ${z} : ${glow.width}x${glow.height} ≠ ${day.width}x${day.height}`); continue; }
    let lit = 0, outside = 0, opaque = 0;
    for (let i = 0; i < day.width * day.height; i++) {
      if (day.data[i * 4 + 3] >= 128) opaque++;
      if (glow.data[i * 4 + 3] > 8) { lit++; if (day.data[i * 4 + 3] < 128) outside++; }
    }
    if (outside) bad.push(`cran ${z} : ${outside} px allumés HORS du bâtiment`);
    if (lit < opaque * 0.012) bad.push(`cran ${z} : ${lit} px allumés, trop peu (${(100 * lit / opaque).toFixed(2)} %)`);
    if (lit > opaque * 0.2) bad.push(`cran ${z} : ${lit} px allumés, trop (${(100 * lit / opaque).toFixed(1)} %) — un aplat, pas des vitres`);
  }
  ok(bad.length === 0, `${key} : un calque de nuit par cran, à la taille du jour, rien hors du bâtiment, ni trop ni trop peu`, bad.join(" ; "));
  for (const l of SB.lights || []) {
    ok(l.x > 0 && l.x < 1 && l.y > 0 && l.y < 1 && l.ground >= l.y && l.ground <= 1 && l.r > 0,
      `${key} : la lampe peinte en (${l.x.toFixed(3)}, ${l.y.toFixed(3)}) est dans l'image, sa flaque sous son verre`);
  }
}

/* ═══════════════════════════════════════════════ 9. LA FENÊTRE DES MAISONS */
const S = A.buildSprites();
{
  const G = S.townHouseWindowGlow, W = A.HOUSE_WINDOW;
  ok(!!G && G.width === W.w && G.height === W.h, "le calque d'une fenêtre allumée a la taille du carreau", G ? `${G.width}x${G.height}` : "absent");
  const gd = G.getContext("2d").getImageData(0, 0, G.width, G.height).data;
  let glowPx = 0, mis = 0, muntin = 0;
  const PANES = new Set(["168,212,232", "208,236,246"]);   // #a8d4e8, #d0ecf6 — les deux bleus de `bWindow`
  for (let s = 0; s < C.TOWN_HOUSE_STYLES; s++) {
    const H = S.townHouses[s], hd = H.getContext("2d").getImageData(0, 0, H.width, H.height).data;
    for (const [wx, wy] of A.TOWN_HOUSE_WINDOWS) for (let y = 0; y < G.height; y++) for (let x = 0; x < G.width; x++) {
      const go = (y * G.width + x) * 4;
      if (x === W.mx || y === W.my) { if (gd[go + 3] > 0) muntin++; continue; }
      if (gd[go + 3] === 0) continue;
      glowPx++;
      const ho = ((wy + y) * H.width + wx + x) * 4;
      if (!PANES.has(`${hd[ho]},${hd[ho + 1]},${hd[ho + 2]}`)) mis++;
    }
  }
  ok(glowPx > 0 && mis === 0, "chaque pixel allumé tombe sur une vitre, dans les dix façades", `${glowPx} lus, ${mis} hors vitre`);
  ok(muntin === 0, "le croisillon reste le dessin (transparent dans le calque)", `${muntin}`);
  const wall = S.townHouseWall;
  ok(!!wall && wall.x0 > 0 && wall.x1 < 96 && wall.base <= 96 && wall.base > 80, "l'emprise du mur des maisons est lue sur le dessin", JSON.stringify(wall));
}

/* ═══════════════════════════════════════════════ 10. LE VERRE DES LANTERNES */
{
  for (const k of ["plazaLamp", "townHangLamp", "townOilLamp", "lamp"]) {
    const g = S.lampGlass && S.lampGlass[k], im = S[k];
    if (!g || !im) { ok(false, `${k} : ancre du verre tirée du dessin`, "absente"); continue; }
    const d = im.getContext("2d").getImageData(0, 0, im.width, im.height).data;
    // Le pixel le plus chaud à portée de l'ancre.
    let best = 0;
    for (let y = Math.floor(g.y - 2); y <= g.y + 2; y++) for (let x = Math.floor(g.x - 2); x <= g.x + 2; x++) {
      if (x < 0 || y < 0 || x >= im.width || y >= im.height) continue;
      const o = (y * im.width + x) * 4;
      if (d[o + 3] > 200) best = Math.max(best, d[o] + d[o + 1] - d[o + 2]);
    }
    ok(best > 260, `${k} : l'ancre du verre (${g.x.toFixed(1)}, ${g.y.toFixed(1)}) tombe sur le verre chaud du sprite allumé`, `chaleur ${best}`);
  }
}

console.log(`\n${n - fail}/${n} contrôles passent.`);
process.exit(fail ? 1 : 0);
