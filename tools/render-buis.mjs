/* =============================================================================
   render-buis.mjs — LES BUIS DE VALLEY TOWN, EN VOLUMES. (2026-09-28, phase 7b)
   -----------------------------------------------------------------------------
   Guillaume : les « bandes vertes “interactives” simplistes » et les « petits
   buis à baies » sont laids. `buis.js` les refait — la boule (`shrub`), le
   massif en nuage (`grassTuft`, qui était la bande), le buis taillé
   (`topiary`), chacun TAILLÉ ou LIBRE selon le quartier. Ce banc appelle le
   code du jeu (les cellules d'atlas que le jeu pose, `drawTownBuis`,
   `drawFarmBush`), jamais une recopie.

   Ce qu'il mesure :
     1. chaque forme, dans chaque saison et sous chaque neige : peinte, rien sur
        le bord du canevas (§4 de CLAUDE.md : un canevas coupe en silence), le
        pied au milieu de la case, la même silhouette aux trois saisons, du
        volume (≥ 5 tons), la lumière en haut à gauche ;
     2. PLUS UNE BAIE : aucun pixel saturé qui ne soit ni vert ni brun ; les
        pousses du printemps (vert tendre) existent, l'hiver ternit ;
     3. la neige : un chapeau en haut, les flancs restent verts ;
     4. la BANDE a disparu : le haut d'un massif ondule ;
     5. qui est taillé : sur la vraie carte — pelouses municipales et quartiers
        aisés taillés, rive sauvage et pré des quartiers modestes libres, le
        collier et les buis sur tige de la place fixés par le générateur ;
     6. la ferme : l'espèce « shrub » de ses haies sauvages dessine le buis LIBRE ;
     7. l'atlas : aucun canevas par buis — quelques pages pour tout.
   ⚠️ 2026-09-28 (soir) — INTERRUPTEUR `C.TOWN_BUIS_LEGACY` (fermeConstants.js) : actif
   (le défaut), le jeu dessine les buis d'AVANT ce banc ; §1 à §5 regardent toujours
   `buis.js` (le code gardé), §6 et §7 vérifient ce que le jeu pose vraiment — l'ancien
   arbuste à la ferme, les quatre anciens dessins construits, leur hiver d'alors.
   Planches : tools/out/buis-planche.png (formes × saisons, neige légère et
   épaisse) et tools/out/buis-carte.png (la carte : jaune taillé, rouge libre).

   ⚠️ FALSIFIÉ (un banc neuf se falsifie le jour où on l'écrit, §10) :
   FALSIFY=baies|bande|neige|ancre|sauvage|saison — chacun doit ROUGIR.

   Usage :  node tools/render-buis.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
const FALSIFY = process.env.FALSIFY || "";
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "buis", "neige", "eau"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, BU = mods.buis, NG = mods.neige, EAU = mods.eau;
const S = A.buildSprites();
const tw = E.generateTownWorld();
const BT = BU.BUIS_TEST;
const T = 16;

let fail = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

const SEASONS = ["summer", "spring", "winter"];
const FORMS = Object.keys(BT.FORMS);
/* La cellule posée comme le jeu la pose (par le bas, centrée), dans un canevas
   de sa taille. */
function cellPixels(form, v, season, snow) {
  const cell = BU.buisCell(S.townEnclos, form, v, season, snow);
  const sh = makeCanvas(cell.w, cell.h);
  BU.drawBuisCell(sh.ctx, cell, cell.w / 2, FALSIFY === "ancre" ? cell.h - 4 : cell.h, 0);
  return { px: sh.px, w: cell.w, h: cell.h };
}
const MAT = 160;   // matière : opaque ; l'ombre de contact (alpha ≤ 0,3) n'en est pas
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0;
  let h = 0;
  if (mx !== mn) { if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; h *= 60; }
  return { h, s, v: mx / 255 };
};
const lum = (r, g, b) => r * 0.3 + g * 0.59 + b * 0.11;
const snowish = (r, g, b) => { const c = hsv(r, g, b); return b >= r && c.v > 0.62 && c.s < 0.35; };
function stats(p) {
  let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, sx = 0;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (p.px[(y * p.w + x) * 4 + 3] <= MAT) continue;
    n++; sx += x; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { n, x0, x1, y0, y1, cx: sx / Math.max(1, n) };
}

console.log("\n=== 1. chaque forme, chaque saison, chaque neige ===\n");
const all = {};
{
  const edge = [], empty = [], anchor = [], silh = [], flat = [], light = [];
  let cells = 0;
  for (const f of FORMS) for (let v = 0; v < BT.FORMS[f].length; v++) {
    for (const se of SEASONS) for (let sn = 0; sn <= 2; sn++) {
      const p = cellPixels(f, v, se, sn);
      all[`${f}${v}${se}${sn}`] = p;
      cells++;
      const st = stats(p);
      if (st.n < 60) empty.push(`${f}${v}/${se}/${sn}`);
      /* Le haut et les côtés seulement : le bas du dessin est le bord sud de la
         case, où l'ombre et la jupe de neige s'arrêtent EXPRÈS (`buis.js`). */
      let hit = 0;
      for (let x = 0; x < p.w; x++) if (p.px[x * 4 + 3] > 8) hit++;
      for (let y = 0; y < p.h; y++) { if (p.px[(y * p.w) * 4 + 3] > 8) hit++; if (p.px[(y * p.w + p.w - 1) * 4 + 3] > 8) hit++; }
      if (hit) edge.push(`${f}${v}/${se}/${sn} (${hit})`);
    }
    // Le pied, la silhouette, le volume, la lumière : en été, sans neige.
    const p = all[`${f}${v}summer0`], st = stats(p);
    if (!(st.y1 >= p.h - 8 && st.y1 <= p.h - 1 && Math.abs(st.cx - p.w / 2) <= 3)) anchor.push(`${f}${v} (bas ${p.h - 1 - st.y1} px sous le bord, centre ${(st.cx - p.w / 2).toFixed(1)})`);
    const mask = (q) => { let s = ""; for (let i = 0; i < q.w * q.h; i++) s += q.px[i * 4 + 3] > 8 ? "1" : "0"; return s; };
    if (!(mask(p) === mask(all[`${f}${v}spring0`]) && mask(p) === mask(all[`${f}${v}winter0`]))) silh.push(`${f}${v}`);
    const tones = new Set();
    let ul = 0, nul = 0, lr = 0, nlr = 0;
    const cy = (st.y0 + st.y1) / 2;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const o = (y * p.w + x) * 4;
      if (p.px[o + 3] <= MAT) continue;
      tones.add(`${p.px[o]},${p.px[o + 1]},${p.px[o + 2]}`);
      const L = lum(p.px[o], p.px[o + 1], p.px[o + 2]), d = (x - st.cx) + (y - cy);
      if (d < -2) { ul += L; nul++; } else if (d > 2) { lr += L; nlr++; }
    }
    if (tones.size < 5) flat.push(`${f}${v} (${tones.size})`);
    if (!(ul / Math.max(1, nul) > lr / Math.max(1, nlr) + 6)) light.push(`${f}${v} (${(ul / Math.max(1, nul)).toFixed(0)} contre ${(lr / Math.max(1, nlr)).toFixed(0)})`);
  }
  console.log(`        ${cells} cellules (${FORMS.length} formes, ${SEASONS.length} saisons, 3 neiges)`);
  ok(empty.length === 0, "chaque cellule est peinte", empty.join(", ") || `${cells} cellules`);
  ok(edge.length === 0, "rien sur le bord du canevas (haut, gauche, droite) — le bas est le bord sud de la case, exprès", edge.slice(0, 6).join(", ") || "0 débord");
  ok(anchor.length === 0, "le pied au milieu de la case, la matière centrée", anchor.join(", ") || "toutes les formes");
  ok(silh.length === 0, "la même silhouette aux trois saisons (sans neige)", silh.join(", ") || "toutes les formes");
  ok(flat.length === 0, "du volume : au moins cinq tons de matière", flat.join(", ") || "toutes les formes");
  ok(light.length === 0, "la lumière vient du haut à gauche (moitié haut-gauche plus claire)", light.join(", ") || "toutes les formes");
}

console.log("\n=== 2. plus une baie ; le printemps et l'hiver ===\n");
{
  let berries = 0, read = 0;
  const bad = [];
  for (const f of FORMS) for (let v = 0; v < BT.FORMS[f].length; v++) for (const se of SEASONS) {
    const p = all[`${f}${v}${se}0`];
    const px = FALSIFY === "baies" ? new Uint8ClampedArray(p.px) : p.px;
    if (FALSIFY === "baies") {
      const st = stats(p);
      for (let k = 0; k < 6; k++) { const x = Math.round(st.cx) - 3 + k, y = Math.round((st.y0 + st.y1) / 2); const o = (y * p.w + x) * 4; px[o] = 224; px[o + 1] = 60; px[o + 2] = 90; px[o + 3] = 255; }
    }
    /* Une baie : saturée, assez claire, ni verte (55°–175°) ni BRUNE (15°–45°
       et sombre : le bois de la tige, la terre du pied — premier jet, le banc
       prenait le chêne de la tige pour une baie). */
    let n = 0;
    for (let i = 0; i < p.w * p.h; i++) {
      const o = i * 4;
      if (px[o + 3] <= MAT) continue;
      read++;
      const c = hsv(px[o], px[o + 1], px[o + 2]);
      const brown = c.h >= 15 && c.h <= 45 && c.v < 0.66;
      if (c.s > 0.45 && c.v > 0.45 && !brown && (c.h < 55 || c.h > 175)) n++;
    }
    berries += n;
    if (n) bad.push(`${f}${v}/${se} (${n})`);
  }
  ok(berries === 0 && read > 5000, "aucun pixel de baie ni de fleur (saturé, ni vert ni brun), en aucune saison", bad.slice(0, 5).join(", ") || `0 sur ${read} px lus`);
  const lime = (p) => { let n = 0; for (let i = 0; i < p.w * p.h; i++) { const o = i * 4; if (p.px[o + 3] <= MAT) continue; const c = hsv(p.px[o], p.px[o + 1], p.px[o + 2]); if (c.h >= 75 && c.h <= 100 && c.v > 0.65 && c.s > 0.4) n++; } return n; };
  const sat = (p) => { let s = 0, n = 0; for (let i = 0; i < p.w * p.h; i++) { const o = i * 4; if (p.px[o + 3] <= MAT) continue; s += hsv(p.px[o], p.px[o + 1], p.px[o + 2]).s; n++; } return s / Math.max(1, n); };
  const noShoot = [], notDull = [];
  for (const f of FORMS) for (let v = 0; v < BT.FORMS[f].length; v++) {
    if (!(lime(all[`${f}${v}spring0`]) > lime(all[`${f}${v}summer0`]) + 3)) noShoot.push(`${f}${v}`);
    const w = FALSIFY === "saison" ? all[`${f}${v}summer0`] : all[`${f}${v}winter0`];
    if (!(sat(w) < sat(all[`${f}${v}summer0`]) - 0.03)) notDull.push(`${f}${v} (${sat(w).toFixed(2)} contre ${sat(all[`${f}${v}summer0`]).toFixed(2)})`);
  }
  ok(noShoot.length === 0, "au printemps, les jeunes pousses vert tendre se voient", noShoot.join(", ") || "toutes les formes");
  ok(notDull.length === 0, "l'hiver, le buis ternit (saturation plus basse qu'en été)", notDull.slice(0, 4).join(", ") || "toutes les formes");
}

console.log("\n=== 3. la neige : un chapeau, les flancs verts ===\n");
{
  const noSnow = [], notMore = [], white = [], noCap = [];
  const snowCount = (p) => { let n = 0; for (let i = 0; i < p.w * p.h; i++) { const o = i * 4; if (p.px[o + 3] > MAT && snowish(p.px[o], p.px[o + 1], p.px[o + 2])) n++; } return n; };
  for (const f of FORMS) for (let v = 0; v < BT.FORMS[f].length; v++) {
    const p1 = all[`${f}${v}winter1`];
    let p2 = all[`${f}${v}winter2`];
    if (FALSIFY === "neige") {
      const px = new Uint8ClampedArray(p2.px);
      for (let i = 0; i < p2.w * p2.h; i++) if (px[i * 4 + 3] > MAT) { px[i * 4] = 236; px[i * 4 + 1] = 242; px[i * 4 + 2] = 250; }
      p2 = { ...p2, px };
    }
    const s1 = snowCount(p1), s2 = snowCount(p2);
    if (!s1) noSnow.push(`${f}${v}`);
    if (!(s2 > s1)) notMore.push(`${f}${v} (${s1} → ${s2})`);
    // Les flancs : la bande de 45 % à 75 % de la hauteur de la matière reste verte.
    const st = stats(p2), ya = st.y0 + (st.y1 - st.y0) * 0.45, yb = st.y0 + (st.y1 - st.y0) * 0.75;
    let n = 0, w = 0;
    for (let y = Math.ceil(ya); y <= yb; y++) for (let x = 0; x < p2.w; x++) {
      const o = (y * p2.w + x) * 4;
      if (p2.px[o + 3] <= MAT) continue;
      n++; if (snowish(p2.px[o], p2.px[o + 1], p2.px[o + 2])) w++;
    }
    if (!(w / Math.max(1, n) < 0.35)) white.push(`${f}${v} (${Math.round(100 * w / Math.max(1, n))} %)`);
    // Le chapeau : dans le quart haut, la neige domine.
    let n2 = 0, w2 = 0;
    for (let y = st.y0; y <= st.y0 + (st.y1 - st.y0) * 0.25; y++) for (let x = 0; x < p2.w; x++) {
      const o = (y * p2.w + x) * 4;
      if (p2.px[o + 3] <= MAT) continue;
      n2++; if (snowish(p2.px[o], p2.px[o + 1], p2.px[o + 2])) w2++;
    }
    if (!(w2 / Math.max(1, n2) > 0.4) && f !== "topiary" && f !== "overgrown") noCap.push(`${f}${v} (${Math.round(100 * w2 / Math.max(1, n2))} %)`);
  }
  ok(noSnow.length === 0, "une neige légère se pose sur chaque forme", noSnow.join(", ") || "toutes les formes");
  ok(notMore.length === 0, "une neige épaisse en pose davantage", notMore.join(", ") || "toutes les formes");
  ok(white.length === 0, "sous une neige épaisse, les flancs restent verts (moins d'un tiers de blanc à mi-hauteur)", white.join(", ") || "toutes les formes");
  ok(noCap.length === 0, "…et le haut porte un chapeau (la neige domine le quart haut)", noCap.join(", ") || "toutes les formes (hors topiaires : un cône ne tient pas la neige)");
}

console.log("\n=== 4. la bande a disparu ===\n");
{
  const bad = [];
  for (const f of ["cloud", "mound"]) for (let v = 0; v < BT.FORMS[f].length; v++) {
    let p = all[`${f}${v}summer0`];
    if (FALSIFY === "bande") {
      // La « bande verte » du 439 : un rectangle plein de 44 × 20, posé au pied.
      const px = new Uint8ClampedArray(p.px.length);
      for (let y = p.h - 22; y < p.h - 2; y++) for (let x = (p.w - 44) / 2; x < (p.w + 44) / 2; x++) { const o = (y * p.w + x) * 4; px[o] = 40; px[o + 1] = 90; px[o + 2] = 50; px[o + 3] = 255; }
      p = { ...p, px };
    }
    const st = stats(p), tops = [];
    const xa = st.x0 + Math.round((st.x1 - st.x0) * 0.2), xb = st.x1 - Math.round((st.x1 - st.x0) * 0.2);
    for (let x = xa; x <= xb; x++) for (let y = 0; y < p.h; y++) if (p.px[(y * p.w + x) * 4 + 3] > MAT) { tops.push(y); break; }
    const m = tops.reduce((a, b) => a + b, 0) / tops.length, sd = Math.sqrt(tops.reduce((a, b) => a + (b - m) * (b - m), 0) / tops.length);
    if (!(sd >= 1.2 && st.y1 - st.y0 >= 12)) bad.push(`${f}${v} (écart-type du faîte ${sd.toFixed(2)} px, haut de ${st.y1 - st.y0 + 1} px)`);
    else console.log(`        ${f}${v} : faîte qui ondule (écart-type ${sd.toFixed(2)} px), ${st.y1 - st.y0 + 1} px de haut`);
  }
  ok(bad.length === 0, "le haut d'un massif ondule : plus une bande plate", bad.join(", ") || "les cinq massifs");
  /* La haie du quai EST une bande (c'est une haie taillée) : ce qui la sépare de
     l'ancienne, c'est un faîte de touffes, pas un trait tiré à la règle — une
     colonne sur quatre au moins s'écarte du faîte le plus courant. */
  {
    let p = all.hedge0summer0;
    if (FALSIFY === "bande") {
      const px = new Uint8ClampedArray(p.px.length);
      for (let y = p.h - 22; y < p.h - 2; y++) for (let x = 2; x < p.w - 2; x++) { const o = (y * p.w + x) * 4; px[o] = 40; px[o + 1] = 90; px[o + 2] = 50; px[o + 3] = 255; }
      p = { ...p, px };
    }
    const st = stats(p), tops = [];
    for (let x = st.x0 + Math.round((st.x1 - st.x0) * 0.1); x <= st.x1 - Math.round((st.x1 - st.x0) * 0.1); x++)
      for (let y = 0; y < p.h; y++) if (p.px[(y * p.w + x) * 4 + 3] > MAT) { tops.push(y); break; }
    const cnt = {}; for (const t of tops) cnt[t] = (cnt[t] || 0) + 1;
    const mode = +Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
    const off = tops.filter(t => t !== mode).length / tops.length;
    ok(off >= 0.25, "la haie du quai a un faîte de touffes, pas un trait droit", `${Math.round(off * 100)} % des colonnes hors du faîte courant`);
  }
}

console.log("\n=== 5. qui est taillé, sur la vraie carte ===\n");
{
  const fam = { shrub: ["ball", "wild"], grassTuft: ["cloud", "mound"], topiary: ["topiary", "overgrown"], hedgeRow: ["hedge"] };
  const seen = {}, wrongFam = [], lawnFree = [], wildTrim = [], poorTrim = [];
  let nWild = 0, n = 0;
  for (const p0 of tw.props) {
    if (!BU.BUIS_KINDS.has(p0.kind)) continue;
    n++;
    const p = FALSIFY === "sauvage" ? { ...p0, wild: undefined } : p0;
    const k = BU.townBuisPick(tw, p);
    seen[k.form] = (seen[k.form] || 0) + 1;
    if (!fam[p0.kind].includes(k.form)) wrongFam.push(`${p0.kind}→${k.form}`);
    const g = tw.ground[p0.y * tw.w + p0.x];
    if (g === C.G_TOWN_LAWN && !p0.wild && !k.trim) lawnFree.push(`(${p0.x},${p0.y})`);
    if (p0.wild) { nWild++; if (k.trim) wildTrim.push(`(${p0.x},${p0.y})`); }
    if (!p0.wild && g === C.G_GRASS && C.townRankAt(p0.x + 0.5, p0.y + 0.5) === 2 && k.trim) poorTrim.push(`(${p0.x},${p0.y})`);
  }
  console.log("        " + Object.entries(seen).map(([f, c]) => `${f} ${c}`).join(" · ") + ` — sur ${n} buis`);
  ok(wrongFam.length === 0, "chaque décor garde sa famille (boule, massif, buis taillé)", wrongFam.slice(0, 4).join(", ") || `${n} buis`);
  ok(FORMS.every(f => seen[f] > 0), "les six formes sont posées quelque part", FORMS.filter(f => !seen[f]).join(", ") || "toutes");
  ok(lawnFree.length === 0, "une pelouse municipale est taillée", lawnFree.slice(0, 4).join(", ") || "toutes");
  ok(nWild > 0 && wildTrim.length === 0, "la rive sauvage ne porte que des buis libres", nWild ? (wildTrim.slice(0, 4).join(", ") || `${nWild} buis marqués`) : "aucun buis marqué `wild`");
  ok(poorTrim.length === 0, "le pré d'un quartier modeste n'est pas taillé", poorTrim.slice(0, 4).join(", ") || "aucun");
  const pz = C.TOWN_PLAZA, cent = [[5, 5], [pz.w - 6, 5], [5, pz.h - 6], [pz.w - 6, pz.h - 6]].map(([ox, oy]) => [pz.x + ox, pz.y + oy]);
  let tige = 0, collar = 0, collarN = 0;
  for (const [x, y] of cent) {
    const t = tw.props.find(p => p.kind === "topiary" && p.x === x && p.y === y);
    if (t) { const k = BU.townBuisPick(tw, t); if (k.form === "topiary" && k.variant === 0) tige++; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const s = tw.props.find(p => p.kind === "shrub" && p.x === x + dx && p.y === y + dy);
      if (!s) continue;
      collarN++;
      const k = BU.townBuisPick(tw, s);
      if (k.form === "ball" && k.variant === 0) collar++;
    }
  }
  ok(tige === 4, "les quatre parterres de la place ont leur buis sur tige", `${tige} sur 4`);
  ok(collarN >= 12 && collar === collarN, "leur collier est fait de boules égales", `${collar} sur ${collarN}`);
}

console.log("\n=== 6. la ferme : " + (C.TOWN_BUIS_LEGACY ? "l'ancien arbuste (interrupteur actif)" : "le buis libre") + " ===\n");
{
  const FARM = ["shrub", "goldBush", "lavender", "clump"];
  let i = 0;
  while (FARM[A.farmBushSpeciesIdx(i)] !== "shrub" && i < 500) i++;
  const vr = A.farmBushVariant(i);
  const a = makeCanvas(64, 64), b = makeCanvas(64, 64);
  const drew = A.drawFarmBush(a.ctx, S, C.O_BUSH, i, 24, 30, "summer", 0);
  /* ⚠️ 2026-09-28 (soir) — `C.TOWN_BUIS_LEGACY` (fermeConstants.js) : interrupteur actif,
     l'espèce « shrub » redessine l'ancien arbuste de la ville (`S.townShrub`), posé par
     le bas comme avant « buis » ; coupé, le buis libre. Le banc suit le jeu. */
  if (C.TOWN_BUIS_LEGACY) {
    const img = S.townShrub && S.townShrub[vr % S.townShrub.length];
    if (img) b.ctx.drawImage(img, 24 + 8 - img.width / 2, 30 + 16 - 2 - img.height);
  } else BU.drawBuisCell(b.ctx, BU.buisCell(S.townEnclos, "wild", vr % BT.FORMS.wild.length, "summer", 0), 24 + 8, 30 + 16 - 2, 0);
  let same = true, n = 0;
  for (let k = 0; k < a.px.length; k++) { if (a.px[k] !== b.px[k]) { same = false; break; } }
  for (let k = 3; k < a.px.length; k += 4) if (a.px[k] > MAT) n++;
  ok(drew && same && n > 60, C.TOWN_BUIS_LEGACY ? "interrupteur `TOWN_BUIS_LEGACY` actif : l'espèce « shrub » de la ferme est l'ancien arbuste (`townShrub`)"
    : "l'espèce « shrub » des haies sauvages de la ferme est le buis LIBRE", `case ${i}, variante ${vr}, ${n} px`);
}

console.log("\n=== 7. l'atlas, et ce qui a quitté le jeu ===\n");
{
  ok(S.townEnclos.pages.length <= 6, "tous les buis de toutes les saisons tiennent dans quelques pages d'atlas", `${S.townEnclos.pages.length} page(s) de 512 × 512, clôtures comprises`);
  /* ⚠️ 2026-09-28 (soir) — `C.TOWN_BUIS_LEGACY` : interrupteur actif, les quatre anciens
     dessins SONT construits et reprennent leur hiver et leur absence de reflet d'alors ;
     coupé, ils ne le sont pas. Le banc tient les deux moitiés, selon ce que le jeu pose. */
  const OLD4 = ["townShrub", "plazaTopiary", "townGrassTuft", "townHedgeRow"];
  if (C.TOWN_BUIS_LEGACY) {
    ok(OLD4.every(k => S[k] !== undefined), "interrupteur `TOWN_BUIS_LEGACY` actif : les quatre anciens dessins sont construits",
       OLD4.filter(k => S[k] === undefined).join(", ") || "les quatre");
    ok(NG.WINTER_PROP_MODE.shrub === "bare" && NG.WINTER_PROP_MODE.topiary === "ever" && NG.WINTER_PROP_MODE.hedgeRow === "ever"
       && NG.WINTER_PROP_MODE.grassTuft === "straw" && EAU.WATER_FLAT_PROPS.has("grassTuft"),
       "interrupteur actif : leur hiver d'avant « buis » (brindilles, persistant, paille) et la bande couchée sans reflet");
  } else {
    ok(OLD4.every(k => S[k] === undefined),
       "les quatre anciens dessins ne sont plus construits (un dessin qu'on ne pose plus vieillit, §10)",
       OLD4.filter(k => S[k] !== undefined).join(", ") || "aucun");
    ok(!["shrub", "grassTuft", "topiary", "hedgeRow"].some(k => NG.WINTER_PROP_MODE[k]) && !EAU.WATER_FLAT_PROPS.has("grassTuft"),
       "leur hiver n'est plus « hiverné » en brindilles ou en paille, et le massif se tient debout (il se reflète)");
  }
}

/* ─────────────────────────── LES PLANCHES ─────────────────────────── */
{
  const COLW = 56, ROWH = 64;
  let rows = 0; for (const f of FORMS) rows += BT.FORMS[f].length;
  const W = COLW * 5 + 40, H = ROWH * rows + 16;
  const sh = makeCanvas(W, H), g = sh.ctx;
  g.fillStyle = "#5c8f4f"; g.fillRect(0, 0, COLW * 3 + 20, H);
  g.fillStyle = "#e7edf6"; g.fillRect(COLW * 3 + 20, 0, W - COLW * 3 - 20, H);
  let r = 0;
  for (const f of FORMS) for (let v = 0; v < BT.FORMS[f].length; v++) {
    const by = r * ROWH + ROWH;
    SEASONS.forEach((se, k) => BU.drawBuisCell(g, BU.buisCell(S.townEnclos, f, v, se, 0), 10 + k * COLW + COLW / 2, by, 0));
    for (let sn = 1; sn <= 2; sn++) BU.drawBuisCell(g, BU.buisCell(S.townEnclos, f, v, "winter", sn), 30 + (2 + sn) * COLW + COLW / 2, by, 0);
    r++;
  }
  const up = scale(sh.px, W, H, 3);
  writePNG(path.join(OUT, "buis-planche.png"), up.px, up.W, up.H);
  // La carte : jaune taillé, rouge libre, sur le rang des quartiers.
  const K = 4, CW = tw.w * K, CH = tw.h * K;
  const mp = makeCanvas(CW, CH), mg = mp.ctx;
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    const i = y * tw.w + x, gr = tw.ground[i];
    mg.fillStyle = gr === C.G_WATER ? "#3b6fb0" : (gr === C.G_PATH || gr === C.G_PATH_STONE || gr === C.G_TOWN_STAIR) ? "#b9b1a0"
      : (tw.solid[i] && !tw.soft[i]) ? "#6b5a4a" : gr === C.G_TOWN_LAWN ? "#7fb069"
      : ["#5d8f4c", "#4f7d41", "#3f6636"][C.townRankAt(x + 0.5, y + 0.5)];
    mg.fillRect(x * K, y * K, K, K);
  }
  for (const p of tw.props) {
    if (!BU.BUIS_KINDS.has(p.kind)) continue;
    mg.fillStyle = BU.townBuisPick(tw, p).trim ? "#ffe14a" : "#ff3a3a";
    mg.fillRect(p.x * K, p.y * K, K, K);
  }
  writePNG(path.join(OUT, "buis-carte.png"), mp.px, CW, CH);
  console.log("\n        planches : tools/out/buis-planche.png, tools/out/buis-carte.png");
}

console.log(`\n${checks - fail}/${checks}${FALSIFY ? "  (FALSIFY=" + FALSIFY + ")" : ""}`);
process.exit(fail ? 1 : 0);
