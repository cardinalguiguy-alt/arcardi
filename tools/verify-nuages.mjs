/* =============================================================================
   verify-nuages.mjs — LES OMBRES DES NUAGES (`components/ferme/nuages.js`, dessin : `nuagesArt.js`). 2026-11-21 (nuit).
   On tient : les cumulus de beau temps naissent en fin de matinée et fondent avant le soir, jamais d'un coup, à la couverture
   annoncée, plus souvent l'été que l'hiver ; le ciel qui se charge en donne, pas un ciel clair ; pas d'ombre de nuage la nuit ni
   sous la pluie (elle suit le soleil, `ombres.js`) ; le champ est périodique SANS COUTURE, déterministe ; la couverture demandée
   est celle qu'on obtient ; à faible couverture ce sont des NUAGES (des taches isolées), pas un réseau de filaments (le premier
   jet) ; la dérive va vers l'est, comme la fumée, et forcit avec le vent ; l'interrupteur du menu dev a son nom dans les deux
   langues ; les appels sont aux bons endroits de la boucle (avant l'ombre du soleil, après le monde trié).
   Usage : node tools/verify-nuages.mjs        FALSIFY=reseau : le champ redevient un bruit fractal seuillé — un contrôle rougit
           FALSIFY=nuit : l'ombre ne suit plus le soleil — un contrôle rougit
   ========================================================================== */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import os from "os";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let src = fs.readFileSync(path.join(ROOT, "components", "ferme", "nuages.js"), "utf8");
if (process.env.FALSIFY === "reseau") {
  src = src.replace("if (q < 1) { const k = 1 - q; v += k * k; }", "").replace("v += 0.16 * fbm(x, y, N, seed + 3);", "v += 1.6 * fbm(x, y, N, seed + 3);");
}
if (process.env.FALSIFY === "nuit") src = src.replace("NUAGES.K * Math.max(0, sunA || 0)", "NUAGES.K * 0.3");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nuages-"));
fs.writeFileSync(path.join(tmp, "nuages.mjs"), src);
fs.copyFileSync(path.join(ROOT, "components", "ferme", "ombres.js"), path.join(tmp, "ombres.mjs"));
const NU = await import(pathToFileURL(path.join(tmp, "nuages.mjs")).href);
const OM = await import(pathToFileURL(path.join(tmp, "ombres.mjs")).href);

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
console.log("\n=== verify-nuages — les ombres des nuages ===\n");
const Z = NU.NUAGES;

/* 1. LES CUMULUS DE BEAU TEMPS */
{
  const seasons = ["spring", "summer", "autumn", "winter"], share = {};
  let maxC = 0, nightZero = true, maxStep = 0, plateauOk = true, seen = 0;
  for (const s of seasons) {
    let n = 0;
    for (let d = 1; d <= 2000; d++) {
      const c = NU.cumulusCover(d, s, 14.5);
      if (c > 0) { n++; maxC = Math.max(maxC, c); }
      if (NU.cumulusCover(d, s, 8) !== 0 || NU.cumulusCover(d, s, 20) !== 0 || NU.cumulusCover(d, s, 23) !== 0) nightZero = false;
      if (d <= 200 && c > 0) {
        seen++;
        let prev = NU.cumulusCover(d, s, 9);
        for (let h = 9; h <= 21; h += 1 / 60) { const v = NU.cumulusCover(d, s, h); maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; }
        if (Math.abs(NU.cumulusCover(d, s, 13.5) - NU.cumulusCover(d, s, 16.5)) > 1e-9) plateauOk = false;
      }
    }
    share[s] = n / 2000;
  }
  ok("des cumulus certains jours seulement, à la fréquence de chaque saison (±0,04 sur 2 000 jours)",
    seasons.every((s) => Math.abs(share[s] - Z.CU_ODDS[s]) < 0.04), seasons.map((s) => `${s} ${share[s].toFixed(2)}`).join(", "));
  ok("plus souvent l'été que l'hiver", share.summer > share.winter + 0.25);
  ok("pas de cumulus avant 10 h ni après 19 h 30", nightZero);
  ok("leur couverture au plus fort reste dans la plage annoncée (pas de voile entre eux)", maxC <= Z.CU_COVER[1] + 1e-9 && maxC >= Z.CU_COVER[1] - 0.02, `max ${maxC.toFixed(3)}`);
  ok("ils naissent et fondent sans à-coup (≤ 0,01 par minute de jeu)", seen > 50 && maxStep <= 0.01, `${seen} journées, pas max ${maxStep.toFixed(4)}`);
  ok("ils tiennent de 13 h à 17 h", plateauOk);
}

/* 2. LE CIEL QUI SE CHARGE, ET L'UNION */
{
  ok("un ciel clair (dark 0) ne donne aucun nuage par lui-même", NU.weatherCover({ dark: 0 }) === 0 && NU.weatherCover(null) === 0);
  let mono = true, prev = -1;
  for (let d = 0; d <= 1; d += 0.01) { const v = NU.weatherCover({ dark: d }); if (v < prev - 1e-12) mono = false; prev = v; }
  ok("plus le ciel fonce, plus il est couvert, jusqu'au plafond", mono && Math.abs(NU.weatherCover({ dark: 1 }) - Z.WX_COVER) < 1e-9);
  const a = NU.cumulusCover(1, "summer", 14.5), b = NU.weatherCover({ dark: 0.2 }), u = NU.cloudCover(1, "summer", 14.5, { dark: 0.2 });
  ok("la couverture de l'instant est l'union des deux (jamais leur somme)", Math.abs(u - (1 - (1 - a) * (1 - b))) < 1e-12 && u <= 1, `${a.toFixed(2)} ∪ ${b.toFixed(2)} = ${u.toFixed(2)}`);
}

/* 3. L'OMBRE SUIT LE SOLEIL : NI LA NUIT, NI SOUS LA PLUIE */
{
  const R = [6, 21.5];
  const night = NU.cloudShadowAlpha((OM.sunShadow(23, R[0], R[1], "summer") || { a: 0 }).a);
  const rain = NU.cloudShadowAlpha((OM.sunShadow(14, R[0], R[1], "summer", { dark: 0.5, rain: 0.7 }) || { a: 0 }).a);
  const sun = OM.sunShadow(14, R[0], R[1], "summer", { dark: 0.05 }), day = NU.cloudShadowAlpha(sun.a);
  ok("pas d'ombre de nuage la nuit", night === 0, `${night}`);
  ok("presque rien sous la pluie (< 0,02)", rain < 0.02, rain.toFixed(4));
  ok("par beau temps, l'ombre d'un nuage vaut presque celle d'un mur au même instant", day > 0.2 && Math.abs(day - Z.K * sun.a) < 1e-12, `${day.toFixed(3)} contre ${sun.a.toFixed(3)}`);
}

/* 4. LE CHAMP */
const N = Z.N;
const f1 = NU.cloudField(4242), f2 = NU.cloudField(4242), f3 = NU.cloudField(7);
{
  let same = true; for (let i = 0; i < f1.length; i++) if (f1[i] !== f2[i]) { same = false; break; }
  let diff = 0; for (let i = 0; i < f1.length; i++) if (f1[i] !== f3[i]) diff++;
  ok("déterministe : la même graine donne le même ciel chez tous", same);
  ok("une autre graine, un autre ciel", diff > f1.length * 0.3, `${(100 * diff / f1.length).toFixed(0)} % des cellules diffèrent`);
  // la couture : l'écart entre la dernière colonne et la première ne doit pas dépasser l'écart ordinaire entre voisines
  let seam = 0, inner = 0, seamV = 0;
  for (let y = 0; y < N; y++) { seam += Math.abs(f1[y * N + N - 1] - f1[y * N]); for (let x = 0; x < N - 1; x++) inner += Math.abs(f1[y * N + x] - f1[y * N + x + 1]); }
  for (let x = 0; x < N; x++) seamV += Math.abs(f1[(N - 1) * N + x] - f1[x]);
  seam /= N; seamV /= N; inner /= N * (N - 1);
  ok("périodique sans couture (est-ouest et nord-sud)", seam < inner * 1.6 + 0.5 && seamV < inner * 1.6 + 0.5, `couture ${seam.toFixed(2)} / ${seamV.toFixed(2)}, voisines ${inner.toFixed(2)}`);
  // la couverture obtenue = la couverture demandée
  const cum = NU.fieldCdf(f1);
  let worst = 0, worstC = 0;
  for (const c of [0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75]) {
    const lut = NU.alphaLut(cum, c);
    let n = 0; for (let i = 0; i < f1.length; i++) if (lut[f1[i]] >= 128) n++;
    const got = n / f1.length;
    if (Math.abs(got - c) > worst) { worst = Math.abs(got - c); worstC = c; }
  }
  ok("la part du sol à plus de mi-ombre est la couverture demandée (±0,04)", worst <= 0.04, `pire écart ${worst.toFixed(3)} à ${worstC}`);
  ok("une couverture nulle ne pose rien", NU.alphaLut(cum, 0).every((v) => v === 0));
  // des NUAGES, pas un réseau : à 20 %, beaucoup de taches séparées, la plus grosse loin d'avaler les autres (torique)
  const lut = NU.alphaLut(cum, 0.2), seen = new Uint8Array(N * N), sizes = [];
  for (let i = 0; i < N * N; i++) {
    if (seen[i] || lut[f1[i]] < 128) continue;
    let n = 0; const st = [i]; seen[i] = 1;
    while (st.length) {
      const j = st.pop(); n++;
      const x = j % N, y = (j / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = ((y + dy + N) % N) * N + ((x + dx + N) % N);
        if (!seen[k] && lut[f1[k]] >= 128) { seen[k] = 1; st.push(k); }
      }
    }
    sizes.push(n);
  }
  const tot = sizes.reduce((a, b) => a + b, 0), big = Math.max(...sizes);
  ok("à 20 % de couverture, des nuages séparés (≥ 25 taches) et aucun ne fait le quart du total",
    sizes.length >= 25 && big < 0.25 * tot, `${sizes.length} taches, la plus grosse ${(100 * big / tot).toFixed(0)} %`);
}

/* 5. LA DÉRIVE */
{
  const [vx0, vy0] = NU.driftSpeed(0), [vx1, vy1] = NU.driftSpeed(1);
  ok("les nuages vont vers l'est (comme la fumée des cheminées), un peu vers le bas", vx0 > 0 && vy0 > 0 && vy0 < 0.3 * vx0);
  ok("plus vite quand le vent forcit", vx1 > 2.5 * vx0, `${(vx0 / 16).toFixed(1)} → ${(vx1 / 16).toFixed(1)} cases/s`);
}

/* 6. L'INTERRUPTEUR ET LES APPELS DANS LA BOUCLE (lecture du source) */
{
  const fg = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
  const st = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeStrings.js"), "utf8");
  const m = fg.match(/const AJOUTS = \{([^}]*)\};/);
  const keys = m ? [...m[1].matchAll(/(\w+)\s*:/g)].map((x) => x[1]) : [];
  const names = [...st.matchAll(/devAjoutNames: \{([^}]*)\}/g)].map((x) => [...x[1].matchAll(/(\w+)\s*:/g)].map((y) => y[1]));
  ok("chaque ajout de la nuit a son nom dans le menu dev, en français ET en anglais", keys.length >= 1 && names.length === 2 && names.every((ns) => keys.every((k) => ns.includes(k))),
    `clés ${keys.join(", ")} ; ${names.length} tables lues`);
  const farmPass = fg.indexOf("sunShadowPass(draws, (d) => (d.cb != null ? d.cb : null), fSnowSeason, null);");
  const farmClouds = fg.lastIndexOf("cloudsNow(fSnowSeason);", farmPass);
  const townPass = fg.indexOf("const shTown = sunShadowPass(");
  const townClouds = fg.lastIndexOf("cloudsNow(snowSeason);", townPass);
  ok("les nuages de l'image sont réglés AVANT l'ombre du soleil (ferme et ville)", farmPass > 0 && farmClouds > 0 && farmPass - farmClouds < 300 && townPass > 0 && townClouds > 0 && townPass - townClouds < 300);
  const farmLoop = fg.indexOf('console.error("[FERME] farm draw ignoré", e); } }'), townLoop = fg.indexOf('console.error("[FERME] town draw ignoré", e); } }');
  ok("leur ombre est posée APRÈS le monde trié (ferme et ville)", fg.indexOf("cloudsPaint();", farmLoop) - farmLoop < 200 && fg.indexOf("cloudsPaint();", townLoop) - townLoop < 400);
  const ssp = fg.indexOf("function sunShadowPass("), ers = fg.indexOf("NA.eraseSunShadow(g, vx0, vy0, bw, bh);"), cmp = fg.indexOf("ctx.drawImage(sb, 0, 0, bw, bh, vx0, vy0, bw, bh);");
  ok("sous un nuage, l'ombre portée s'efface du tampon avant qu'il ne soit posé", ssp > 0 && ers > ssp && cmp > ers);
}

/* 7. 2026-11-21 — LES FAÇADES MOUILLÉES (`tools/build-wet-facades.mjs`) : chaque bâtiment peint qui déclare `wet` a son calque à chaque
   cran, à la taille de son image de jour, transparent hors du bâtiment ; et le jeu le pose AVANT la lueur des vitres. */
{
  const { loadFerme } = await import("./lib-canvas.mjs");
  const { PNG } = await import("pngjs");
  const { fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants"]);
  let n = 0, miss = [], size = [], leak = [];
  for (const [key, b] of Object.entries(C.TOWN_BITMAPS)) {
    if (!b.wet) continue;
    for (const z of b.zooms) {
      const mip = C.townBitmapMip(b, z), fw = path.join(ROOT, "public", mip.wet), fd = path.join(ROOT, "public", mip.day);
      if (!fs.existsSync(fw)) { miss.push(mip.wet); continue; }
      n++;
      if (z !== 2) continue;
      const w = PNG.sync.read(fs.readFileSync(fw)), d = PNG.sync.read(fs.readFileSync(fd));
      if (w.width !== d.width || w.height !== d.height) { size.push(key); continue; }
      let out = 0; for (let i = 3; i < w.data.length; i += 4) if (w.data[i] > 0 && d.data[i] < 8) out++;
      if (out) leak.push(`${key} ${out}`);
    }
  }
  ok("chaque bâtiment peint mouillable a son calque à chaque cran (maisons, commerces, monuments)", n >= 100 && !miss.length, `${n} calques` + (miss.length ? ` ; manquent ${miss.slice(0, 3).join(", ")}` : ""));
  ok("  à la taille de son image de jour, et rien hors du bâtiment", !size.length && !leak.length, [size.join(", "), leak.slice(0, 3).join(", ")].filter(Boolean).join(" ; ") || "0");
  const fg = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
  const f0 = fg.indexOf("function drawScreenExactBitmap("), wI = fg.indexOf("loadBitmap(mip.wet)", f0), gI = fg.indexOf("glowImg = loadBitmap(mip.glow)", f0);
  ok("  posé avant la lueur des vitres (une fenêtre allumée reste allumée sous la pluie)", f0 > 0 && wI > f0 && gI > wI);
}

console.log(`\n${total - fails}/${total} contrôles${fails ? ` — ${fails} ÉCHEC(S)` : " — tout est vert"}\n`);
process.exit(fails ? 1 : 0);
