/* ╔══════════════════════════════════════════════════════════════════════════
   ║ verify-neige — LA NEIGE DE VALLEY TOWN (phase 12a, 2026-09-28).
   ╚══════════════════════════════════════════════════════════════════════════
   JOUE `components/ferme/neige.js` et ce qui l'entoure :
     1. LE MANTEAU EST UNE PURE FONCTION du jour, de l'heure et des saisons des
        jours remontés : deux clients qui le lisent dans des ordres différents
        trouvent le même nombre, au bit près ;
     2. L'HIVER EST BLANC SANS ENSEVELIR : sur des centaines d'hivers, une part
        des midis sous la neige, jamais plus de ~40 cm ; le printemps la fond ;
     3. LE DÉPÔT ET LA FONTE SONT PROGRESSIFS (Guillaume) : la part du sol
        couverte monte avec l'épaisseur sans saut — pas plus de 12 % de la
        parcelle d'un cran de 2 mm — et elle est déjà partielle à 0,4 cm,
        complète au-delà de 3 cm ;
     4. LE GRAIN : sur un manteau épais au soleil, une minorité de pixels
        s'écarte du ton dominant (ni aplat, ni « neige de télévision ») ;
     5. LES OMBRES : l'ombre portée d'un bâtiment bleuit la neige au sud-est,
        jamais au nord-ouest ;
     6. LES EMPREINTES creusent, et la neige qui tombe les comble ;
     7. L'HIVER DU MOBILIER : plus une fleur sur un buisson caduc hiverné ;
     8. LES TOITS : chaque maison, commerce et monument peint a ses deux calques
        de neige à chaque cran, à sa taille ;
     9. LES CLÔTURES : la hauteur au voxel existe pour les cinq matières, et elle
        est ajourée là où le dessin l'est (piquets, fil).
   ⚠️ Tout banc qui compte publie ce qu'il a LU (§10 de CLAUDE.md), et celui-ci a
   été falsifié le jour de son écriture (voir la fin du fichier).
   Usage : node tools/verify-neige.mjs */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "fermeArt", "neige", "meteo", "clotures"]);
const C = mods.fermeConstants, E = mods.fermeEngine, A = mods.fermeArt, NG = mods.neige, K = mods.clotures;
const FALSIFY = process.env.FALSIFY || "";

let fail = 0, n = 0;
const ok = (name, cond, detail) => { n++; console.log((cond ? "  OK   " : "  FAIL ") + name + (detail ? "  —  " + detail : "")); if (!cond) fail++; };
const T = C.TILE, A0 = C.DAY_START_MIN, B0 = C.DAY_END_MIN;

console.log("§1 — Le manteau, pure fonction du temps");
{
  const allWinter = () => "winter";
  let diff = 0, reads = 0;
  for (let d = 5; d < 60; d += 3) {
    const times = [A0 + 30, A0 + 377, A0 + 800, B0 - 5];
    const fwd = times.map((t) => JSON.stringify(NG.snowPack(d, t, allWinter, null)));
    const bwd = times.slice().reverse().map((t) => JSON.stringify(NG.snowPack(d, t, allWinter, null))).reverse();
    for (let i = 0; i < times.length; i++) { reads++; if (fwd[i] !== bwd[i]) diff++; }
  }
  ok("lu en avant et en arrière, même manteau", diff === 0, `${diff} écarts sur ${reads} lectures`);
}

console.log("§2 — L'hiver est blanc sans ensevelir, le printemps fond");
{
  let white = 0, days = 0, maxG = 0;
  for (let d = 5; d < 1205; d++) {
    const pk = NG.snowPack(d, (A0 + B0) / 2, () => "winter", null);
    days++; if (pk.g > 1) white++; if (pk.g > maxG) maxG = pk.g;
  }
  const part = white / days;
  ok("une part des midis d'hiver sous la neige", part > 0.3 && part < 0.95, `${(part * 100).toFixed(0)} % de ${days} midis`);
  ok("jamais enseveli", maxG < 45, `au plus ${maxG.toFixed(1)} cm`);
  let springWhite = 0, sd = 0;
  for (let d = 5; d < 605; d++) { const pk = NG.snowPack(d, (A0 + B0) / 2, (x) => (x < d - 1 ? "winter" : "spring"), null); sd++; if (pk.g > 1) springWhite++; }
  ok("deux jours de printemps fondent l'hiver (au soleil de midi)", springWhite / sd < 0.25, `${(springWhite / sd * 100).toFixed(0)} % de ${sd} midis encore blancs`);
}

/* Un monde, un champ, une parcelle de prairie et de jardins (celle de render-neige). */
const tw = E.generateTownWorld();
const S = A.buildSprites();
const env = A.townSnowEnv(tw, S, (wx, wy) => { const x = Math.floor(wx / T), y = Math.floor(wy / T); return x >= 0 && y >= 0 && x < tw.w && y < tw.h && tw.ground[y * tw.w + x] === C.G_WATER; });
env.fields = NG.snowTileFields(tw, env.trees, env.tall);
const CX = 1, CY = 3;                        // la parcelle (16..23, 24..31) en cases
const st = NG.buildChunkStatic(tw, CX, CY, env);
const pack = (g) => ({ g, s: g, r: Math.min(NG.NEIGE.ROAD_CAP, g * 0.3), berm: g, rh: g, rc: g, tl: 0, tc: 0, since: 0 });
const render = (g, P, imp) => { const out = new Uint8ClampedArray(NG.CH * NG.CH * 4); NG.renderChunk(st, pack(g), { winter: true, frost: 0, wetRoad: 0, sun: 1, ...(P || {}) }, imp || null, out); return out; };
const isSnow = (out, i) => out[i * 4 + 3] === 255 && out[i * 4 + 2] > 150 && out[i * 4 + 2] >= out[i * 4];

console.log("§3 — Le dépôt et la fonte, progressifs");
{
  const N = NG.CH * NG.CH;
  let grassPx = 0;
  const open = new Uint8Array(N);
  for (let y = 0; y < NG.CH; y++) for (let x = 0; x < NG.CH; x++) { const c = st.cls[(y + 1) * (NG.CH + 2) + x + 1]; if (c === NG.CL.GRASS || c === NG.CL.LAWN) { open[y * NG.CH + x] = 1; grassPx++; } }
  const cover = (g) => { const out = render(g); let k = 0; for (let i = 0; i < N; i++) if (open[i] && isSnow(out, i)) k++; return k / grassPx; };
  let prev = cover(0), jump = 0, jumpAt = 0;
  const curve = [];
  for (let g = 0.02; g <= 4.001; g += 0.02) {
    const c = FALSIFY === "saut" ? (g < 1 ? 0 : 1) : cover(g);
    if (c - prev > jump) { jump = c - prev; jumpAt = g; }
    prev = c;
    if (Math.abs(g * 10 - Math.round(g * 10)) < 1e-6 && Math.round(g * 10) % 5 === 0) curve.push(`${g.toFixed(1)}:${Math.round(c * 100)}%`);
  }
  ok("pas de saut de couverture", jump < 0.12, `plus grand saut ${(jump * 100).toFixed(1)} % à ${jumpAt.toFixed(2)} cm ; ${grassPx} px d'herbe lus`);
  const c04 = cover(0.4), c3 = cover(3.2);
  ok("à 0,4 cm, des plaques (ni rien, ni tout)", c04 > 0.02 && c04 < 0.6, `${(c04 * 100).toFixed(0)} %`);
  ok("au-delà de 3 cm, couvert", c3 > 0.97, `${(c3 * 100).toFixed(1)} %`);
  console.log("        courbe : " + curve.join("  "));
}

console.log("§4 — Le grain");
{
  const out = render(12);
  const N = NG.CH * NG.CH, tally = new Map();
  let snow = 0;
  for (let i = 0; i < N; i++) {
    if (!isSnow(out, i) || st.cls[(((i / NG.CH) | 0) + 1) * (NG.CH + 2) + (i % NG.CH) + 1] !== NG.CL.GRASS) continue;
    const k = (out[i * 4] << 16) | (out[i * 4 + 1] << 8) | out[i * 4 + 2];
    tally.set(k, (tally.get(k) || 0) + 1); snow++;
  }
  const top = Math.max(...tally.values()), other = 1 - top / snow;
  ok("un grain, ni aplat ni bruit", FALSIFY === "aplat" ? false : other > 0.04 && other < 0.45, `${(other * 100).toFixed(1)} % des ${snow} px hors du ton dominant (${tally.size} tons)`);
}

console.log("§5 — Les ombres portées, au sud-est");
{
  // Un bâtiment de la carte : une case haute dont le voisin sud-est est ouvert.
  let found = null;
  for (let y = 5; y < tw.h - 5 && !found; y++) for (let x = 5; x < tw.w - 5 && !found; x++) {
    const i = y * tw.w + x;
    if (env.casterAt(x * T + 8, y * T + 8) !== 40) continue;
    if (env.casterAt(x * T + 8, (y + 1) * T + 8) || env.casterAt((x + 1) * T + 8, (y + 1) * T + 8)) continue;
    if (tw.ground[(y + 1) * tw.w + x + 1] !== C.G_GRASS) continue;
    if (env.casterAt((x - 1) * T + 8, (y - 1) * T + 8) === 40) found = { x, y };
  }
  if (!found) ok("un pied de bâtiment ouvert au sud-est", false, "aucun trouvé");
  else {
    const cx = Math.floor(found.x * T / NG.CH), cy = Math.floor(found.y * T / NG.CH);
    const s2 = NG.buildChunkStatic(tw, cx, cy, env);
    const at = (wx, wy) => s2.cast[(wy - cy * NG.CH + 1) * (NG.CH + 2) + (wx - cx * NG.CH + 1)] / 255;
    const se = at(found.x * T + 18, (found.y + 1) * T + 3), nw = at(found.x * T - 12, found.y * T - 14);
    ok("ombre au sud-est d'un bâtiment, pas au nord-ouest", FALSIFY === "ombre" ? false : se > 0.6 && nw < 0.2, `case ${found.x},${found.y} : sud-est ${se.toFixed(2)}, nord-ouest ${nw.toFixed(2)}`);
  }
  let treeCast = 0;
  for (let i = 0; i < st.cast.length; i++) if (st.cast[i] > 60) treeCast++;
  ok("les arbres de la parcelle portent leur ombre", treeCast > 200, `${treeCast} px d'ombre portée`);
}

console.log("§6 — Les empreintes creusent, la neige les comble");
{
  const field = NG.makeSnowField(tw, { ...env, makeCanvas: (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; } });
  field.setParams(pack(12), { winter: true, frost: 0, wetRoad: 0, sun: 1 });
  const W0 = NG.makeWalkers();
  let t = 0;
  for (let s2 = 0; s2 <= 80; s2++) W0.step("a", "boot", (20 + s2 * 0.06) * T, 28.5 * T, t += 16, field, 1);
  const p0 = field.printCount();
  ok("un marcheur laisse des pas", p0 > 30, `${p0} px creusés`);
  const k0 = field._prints();
  let sum0 = 0; for (const a of k0.prints.values()) for (const v of a) if (v > 0) sum0 += v;
  field.addFall(FALSIFY === "comble" ? 0 : 8);
  field.fillAll();
  let sum1 = 0; for (const a of field._prints().prints.values()) for (const v of a) if (v > 0) sum1 += v;
  ok("8 cm de neige fraîche comblent les pas", sum1 < sum0 * 0.6, `profondeur cumulée ${sum0} → ${sum1}`);
}

console.log("§7 — L'hiver du mobilier : plus une fleur");
{
  let flowers = 0, read = 0;
  // 2026-09-28 : l'arbuste (`townShrub`) est devenu un buis, un persistant — son hiver est dans `buis.js` (render-buis).
  for (const im of [...(S.townGoldBush || []), ...(S.townFlowerClump || [])]) {
    const d = im.getContext("2d").getImageData(0, 0, im.width, im.height).data;
    const w = FALSIFY === "fleurs" ? d : NG.winterizePixels(d, im.width, im.height, "bare", 3);
    for (let i = 0; i < w.length; i += 4) {
      if (w[i + 3] < 8) continue;
      read++;
      const r = w[i], g = w[i + 1], b = w[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx > 110 && (mx - mn) / mx > 0.4 && !(g >= r && g >= b)) flowers++;
    }
  }
  ok("aucun pixel de fleur sur un caduc hiverné", flowers === 0 && read > 500, `${flowers} sur ${read} px lus`);
}

console.log("§8 — Les calques de neige des toits");
{
  let files = 0, missing = [], badSize = [];
  for (const [key, b] of Object.entries(C.TOWN_BITMAPS)) {
    if (!b.snowL) continue;
    for (const z of b.zooms) {
      const m = C.townBitmapMip(b, z);
      for (const f of [m.snowL, m.snowH]) {
        const p = path.join(ROOT, "public", f);
        if (!fs.existsSync(p)) { missing.push(f); continue; }
        files++;
        const day = PNG.sync.read(fs.readFileSync(path.join(ROOT, "public", m.day)));
        const hd = fs.readFileSync(p);
        const w = hd.readUInt32BE(16), h = hd.readUInt32BE(20);
        if (w !== day.width || h !== day.height) badSize.push(f);
      }
    }
  }
  ok("chaque calque existe", missing.length === 0 && files > 200, `${files} calques lus${missing.length ? " ; absents : " + missing.slice(0, 3).join(", ") : ""}`);
  ok("chaque calque a la taille de son image de jour", badSize.length === 0, badSize.slice(0, 3).join(", ") || `${files} tailles justes`);
}

console.log("§9 — Les clôtures : la hauteur au voxel, ajourée");
{
  const F = C.TOWN_FENCE, res = [];
  for (const style of [F.HEDGE, F.IRON, F.PICKET, F.BOARD, F.WIRE]) {
    const w = 5, h = 3, hedge = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) hedge[1 * w + x] = style;
    const mini = { w, h, hedge, gates: [] };
    const hts = K.townFenceHeights(mini, 2, 1);
    let top = 0, holes = 0;
    for (let u = 0; u < T; u++) { const v = hts ? hts[8 * T + u] : 0; if (v > top) top = v; if (!v) holes++; }
    res.push({ style, top, holes });
  }
  ok("cinq matières ont une hauteur", res.every((r) => r.top >= 6), res.map((r) => `${r.style}:${r.top}`).join(" "));
  const picket = res.find((r) => r.style === F.PICKET);
  ok("la palissade est ajourée sur son axe", picket.holes >= 3, `${picket.holes} colonnes vides sur 16`);
}

console.log(`\n${n - fail}/${n} contrôles${fail ? ` — ${fail} ÉCHEC(S)` : ""}`);
/* ⚠️ FALSIFIÉ le 2026-09-28 : FALSIFY=saut, =aplat, =ombre, =comble, =fleurs
   font chacun rougir le contrôle qu'ils visent. */
process.exit(fail ? 1 : 0);
