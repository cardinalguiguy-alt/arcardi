/* =============================================================================
   verify-perso-simple.mjs — LE TRAIT SIMPLE (2026-10-31)
   `persoSimpleArt.js` et sa feuille (`S.getCharHD` quand `S.persoStyle === "simple"`). Ce que le banc tient :
   1. LE MÊME DESSIN À ×2 : `drawCharFrame` peinte en mode fin (sans les signes du vêtement), aux quatre pas ENTIERS, rend au pixel
      près l'ancienne image agrandie au plus proche — pour chaque tenue, costume de PNJ, ouvrier, coupe, barbe, teinte de peau et
      article de la Maison Garfield. C'est ce qui garantit que le demi-pas et les `Math.max(0, step)` n'ont rien changé à l'ancien.
   2. « NET » AU PIXEL FIN = SCALE2X : la règle des coins écrite au pixel fin rend, sur une image ×2 au plus proche, exactement la
      règle de Scale2x restreinte à « vider contre le vide » (le prototype du 2026-10-30), recopiée ici comme référence.
   3. LES SIGNES DU VÊTEMENT NE DESSINENT AUCUNE FORME : avec ou sans eux, la silhouette est la même — aucun pixel posé sur le vide.
   4. LA FEUILLE : jamais `null` pour un joueur ou un PNJ ; 9 images de marche, 4 pour les poses ; `__hdK` 2, `__simple` ; pas de
      mains jointes ; un cache par style (basculer ne rend pas la feuille de l'autre).
   5. LA MARCHE : les pieds touchent le bas du cadre à chaque image ; la tête descend de `2 × bob` pixels fins, ni plus ni moins.
   6. « SOIGNÉ » (niveau 4, 2026-11-21 : frange de côté, bras détachés du buste) : la silhouette ne bouge pas ; aucune teinte inventée
      (une couleur de l'image ou la sienne à −30) ; rien contre un œil, à aucune expression ; chaque tenue de joueur reçoit les deux
      retouches ; l'interrupteur (`PERSO_SOIGNE.on`) a son cache et rend, rallumé, la même feuille. La garde-robe en deux tons
      (`PERSO_SOIGNE.plat`, `flatRamp`) : même silhouette, jamais plus de couleurs.
   Usage : node tools/verify-perso-simple.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "persoSimpleArt"]);
const A = mods.fermeArt, C = mods.fermeConstants, PS = mods.persoSimpleArt;
const S = A.buildSprites();
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
console.log("\n=== verify-perso-simple ===\n");

// Les tenues à parcourir : [genre, tenue, look, drapeaux de PNJ, libellé]
const B36 = (n) => n.toString(36);
const CASES = [];
for (const g of ["f", "m"]) for (let o = 0; o < C.OUTFITS.length; o++) CASES.push([g, o, null, null, g + " tenue " + o]);
for (let t = 1; t < C.CHAR_SKIN_TONES.length; t++) CASES.push(["m", 0, "~" + t, null, "peau " + t]);
for (let c = 1; c < C.HAIR_CUTS.length; c++) CASES.push([c % 2 ? "f" : "m", 1, "^" + B36(c) + "00", null, "coupe " + c]);
for (let b = 1; b < C.BEARDS.length; b++) CASES.push(["m", 0, "^00" + B36(b), null, "barbe " + b]);
CASES.push(["f", 2, "^030", null, "teinture"]);
for (let i = 1; i <= C.WARDROBE_HATS.length; i++) CASES.push(["f", 1, "w" + i + "000", null, "chapeau " + i]);
for (let i = 1; i <= C.WARDROBE_SCARVES.length; i++) CASES.push(["m", 0, "w0" + i + "00", null, "écharpe " + i]);
for (let i = 1; i <= C.WARDROBE_OUTFITS.length; i++) for (const g of ["f", "m"]) CASES.push([g, 0, "w00" + i + "0", null, g + " tenue Garfield " + i]);
for (let i = 1; i <= C.WARDROBE_TINTS.length; i++) CASES.push([i % 2 ? "f" : "m", 3, "w000" + i, null, "teinte " + i]);
CASES.push(["f", 5, "w1234~2^200", null, "tout à la fois"]);
for (const k of ["overalls", "cap", "beeSuit", "plaid", "cheeseHat", "sugarWorker"]) CASES.push([k === "cheeseHat" ? "f" : "m", 0, null, { [k]: true }, "PNJ " + k]);
CASES.push(["m", 0, null, { cap: true, sugarWorker: true }, "PNJ Jérôme (casquette + sucrerie)"]);
for (const lk of ["carla", "leo", "froufrou", "vandal"]) CASES.push([lk === "carla" ? "f" : "m", 0, lk, {}, "PNJ " + lk]);
for (const lk of ["ouvrier:0", "ouvrier:5", "chef:2", "soudeur:1", "conducteur:3"]) for (const g of ["f", "m"]) CASES.push([g, 0, lk, {}, g + " " + lk]);

const old16 = (g, o, dir, fr, look, fl) => S.charFrame(g, o, dir, fr, look, fl || {}).__px;
const fine32 = (g, o, dir, fine, look, fl) => S.charFrameFine(g, o, dir, fine, look, fl || {}).__px;
const near2 = (px16) => { const o = new Uint8ClampedArray(32 * 48 * 4); for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) for (let k = 0; k < 4; k++) o[(y * 32 + x) * 4 + k] = px16[((y >> 1) * 16 + (x >> 1)) * 4 + k]; return o; };
const sameArr = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };

// 1. Le même dessin à ×2, aux pas entiers
{
  let bad = [];
  for (const [g, o, look, fl, lab] of CASES) for (let dir = 0; dir < 3; dir++) for (let fr = 0; fr < 4; fr++) {
    const step = fr === 1 ? 1 : fr === 3 ? -1 : 0;
    if (!sameArr(near2(old16(g, o, dir, fr, look, fl)), fine32(g, o, dir, { step, bob: Math.abs(step), stepI: step, habit: false }, look, fl))) bad.push(lab + " d" + dir + " i" + fr);
  }
  ok(!bad.length, "le mode fin, aux pas entiers, est l'ancien dessin ×2 au pixel près (" + CASES.length + " tenues × 3 vues × 4 images)", bad.slice(0, 6).join(", "));
}

// 2. « Net » au pixel fin = Scale2x restreint à « vider contre le vide »
{
  const scale2x = (px16) => {
    const key = (i) => (px16[i + 3] < 128 ? 0 : (0x1000000 | (px16[i] << 16) | (px16[i + 1] << 8) | px16[i + 2]));
    const at = (x, y) => (x < 0 || y < 0 || x >= 16 || y >= 24 ? 0 : key((y * 16 + x) * 4));
    const out = new Int32Array(32 * 48);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) {
      const P = at(x, y), Bv = at(x, y - 1), D = at(x - 1, y), F = at(x + 1, y), Hv = at(x, y + 1);
      const e = !P ? [P, P, P, P] : [D === Bv && Bv !== F && D !== Hv && !D ? 0 : P, Bv === F && Bv !== D && F !== Hv && !F ? 0 : P,
        D === Hv && D !== Bv && Hv !== F && !D ? 0 : P, Hv === F && D !== Hv && Bv !== F && !F ? 0 : P];
      const i = 2 * y * 32 + 2 * x;
      out[i] = e[0]; out[i + 1] = e[1]; out[i + 32] = e[2]; out[i + 33] = e[3];
    }
    return out;
  };
  let bad = [];
  for (const [g, o, look, fl, lab] of CASES) for (let dir = 0; dir < 3; dir++) for (let fr = 0; fr < 4; fr++) {
    const p = old16(g, o, dir, fr, look, fl);
    if (!sameArr(PS.persoSimpleGrid(p, { dir, frame: fr, niveau: 1 }), scale2x(p))) bad.push(lab + " d" + dir + " i" + fr);
  }
  ok(!bad.length, "les coins au pixel fin rendent exactement Scale2x « contre le vide » sur l'ancien ×2", bad.slice(0, 6).join(", "));
}

// 3. Les signes du vêtement ne posent rien sur le vide
{
  let bad = [], drawn = 0;
  for (const [g, o, look, fl, lab] of CASES) for (let dir = 0; dir < 3; dir++) for (const ph of [{ step: 0, stepI: 0 }, ...PS.PERSO_SIMPLE_WALK]) {
    const fine = { step: ph.step, bob: Math.abs(ph.step), stepI: ph.stepI };
    const a = fine32(g, o, dir, { ...fine, habit: false }, look, fl), b = fine32(g, o, dir, { ...fine, habit: true }, look, fl);
    let out = 0;
    for (let i = 0; i < a.length; i += 4) { if (!a[i + 3] && b[i + 3]) out++; if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) drawn++; }
    if (out) bad.push(lab + " d" + dir + " (" + out + " px)");
  }
  ok(!bad.length, "aucun signe de vêtement hors de la silhouette (toutes vues, toutes images de marche)", bad.slice(0, 6).join(", "));
  ok(drawn > 0, "les signes du vêtement dessinent bien quelque chose", drawn + " pixels changés au total");
}

// 4. La feuille
{
  S.persoStyle = "simple";
  let nul = [], dims = [];
  for (const [g, o, look, fl, lab] of CASES) {
    const npc = fl ? (Object.keys(fl).length ? fl : true) : null;
    const w = S.getCharHD(g, o, look, false, "neutre", npc), n = S.getCharHD(g, o, look, true, "neutre", npc);
    if (!w || !n) { nul.push(lab); continue; }
    if (w.width !== 9 * 32 || w.height !== 3 * 48 || n.width !== 4 * 32 || n.height !== 3 * 48 || w.__hdK !== 2 || !w.__simple || !n.__simple) dims.push(lab);
  }
  ok(!nul.length, "jamais de feuille nulle, joueurs comme PNJ (" + CASES.length + " tenues)", nul.slice(0, 6).join(", "));
  ok(!dims.length, "9 images de marche, 4 de poses, 32 × 48 la case, `__hdK` 2, `__simple`", dims.slice(0, 6).join(", "));
  ok(S.getCharHD("f", 1, null, false, "neutre", null, "clasp") === null, "pas de mains jointes au trait simple (l'appelant garde la marche)");
  const sSimple = S.getCharHD("m", 0, null, false, "neutre", null);
  S.persoStyle = "detaille";
  const sFin = S.getCharHD("m", 0, null, false, "neutre", null);
  S.persoStyle = "simple";
  ok(sFin && sFin !== sSimple && !sFin.__simple && S.getCharHD("m", 0, null, false, "neutre", null) === sSimple, "un cache par style : basculer rend la feuille de l'autre style, et revenir la même qu'avant");
  ok(S.getCharHD("f", 1, null, false, "joie", null) !== S.getCharHD("f", 1, null, false, "neutre", null), "une feuille par expression");
}

// 5. La marche : les pieds au sol, la tête descend du pas
{
  let bad = [];
  for (const [g, o, look, fl, lab] of CASES.slice(0, 16)) {
    const sh = S.getCharHD(g, o, look, false, "neutre", null), px = sh.__px, SW = sh.width;
    for (let dir = 0; dir < 3; dir++) {
      const top = (f) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) if (px[((dir * 48 + y) * SW + f * 32 + x) * 4 + 3]) return y; return -1; };
      const foot = (f) => { let n = 0; for (let x = 0; x < 32; x++) if (px[((dir * 48 + 47) * SW + f * 32 + x) * 4 + 3]) n++; return n; };
      const t0 = top(0);
      for (let f = 1; f <= 8; f++) {
        const want = t0 + Math.round(PS.PERSO_SIMPLE_WALK[f - 1].bob * 2);
        if (top(f) !== want || foot(f) < 4) bad.push(lab + " d" + dir + " i" + f + " (tête " + top(f) + " au lieu de " + want + ", " + foot(f) + " px au sol)");
      }
    }
  }
  ok(!bad.length, "à chaque image de marche, les pieds au sol et la tête descendue de 2 × bob pixels fins", bad.slice(0, 4).join(" ; "));
}

// 6. « Soigné » (niveau 4, 2026-11-21) : la frange de côté et les bras détachés, dans la règle du trait simple
{
  const EYE = 0x1000000 | 0x3a2a1e;
  const grid = (g, o, look, fl, dir, ph, niveau, expr, sweep) => {
    const fine = { step: ph.step, bob: Math.abs(ph.step), stepI: ph.stepI, habit: true };
    return PS.persoSimpleGridFine(fine32(g, o, dir, fine, look, fl), { dir, bobF: Math.round(fine.bob * 2), niveau, expr, pnj: !!fl, sweep });
  };
  const chan = (k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255];
  const dark30 = (k) => { const [r, g, b] = chan(k); const c = (v) => Math.max(0, Math.min(255, v - 30)); return 0x1000000 | (c(r) << 16) | (c(g) << 8) | c(b); };
  let sil = [], col = [], eye = [], n = 0;
  for (const [g, o, look, fl, lab] of CASES) for (let dir = 0; dir < 3; dir++) for (const ph of [{ step: 0, stepI: 0 }, ...PS.PERSO_SIMPLE_WALK])
    for (const expr of dir === 0 ? PS.PERSO_SIMPLE_EXPRESSIONS : ["neutre"]) for (const sweep of [1, -1]) {
      if (expr !== "neutre" && ph.step) continue;
      const a = grid(g, o, look, fl, dir, ph, 3, expr, sweep), b = grid(g, o, look, fl, dir, ph, 4, expr, sweep);
      const pal = new Set(a); n++;
      for (let i = 0; i < a.length; i++) {
        if (!a[i] !== !b[i]) { sil.push(lab + " d" + dir); break; }
        if (a[i] === b[i]) continue;
        if (!pal.has(b[i]) && b[i] !== dark30(a[i])) { col.push(lab + " d" + dir + " (" + (i % 32) + "," + ((i / 32) | 0) + ")"); break; }
        const x = i % 32, y = (i / 32) | 0;
        let near = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * 32 + x + dx; if (x + dx >= 0 && x + dx < 32 && j >= 0 && j < a.length && b[j] === EYE) near = true; }
        if (near) { eye.push(lab + " d" + dir + " " + expr); break; }
      }
    }
  ok(!sil.length, "« soigné » : la silhouette ne change pas d'un pixel (" + n + " images : tenues × vues × marche × expressions × deux côtés)", sil.slice(0, 6).join(", "));
  ok(!col.length, "« soigné » : chaque pixel retouché prend une couleur déjà dans l'image, ou la sienne à −30 (aucune teinte inventée)", col.slice(0, 6).join(", "));
  ok(!eye.length, "« soigné » : aucune retouche ne touche un œil, même en diagonale, quelle que soit l'expression", eye.slice(0, 6).join(", "));
  // ce que chaque joueur reçoit : la frange de face et de profil, les bras de face (les garçons ; les cheveux longs couvrent les bras des filles)
  const diff = (g, o, dir, y0, y1) => {
    const a = grid(g, o, null, null, dir, { step: 0, stepI: 0 }, 3, "neutre", 1), b = grid(g, o, null, null, dir, { step: 0, stepI: 0 }, 4, "neutre", 1);
    let k = 0; for (let i = y0 * 32; i < y1 * 32; i++) if (a[i] !== b[i]) k++; return k;
  };
  const miss = [];
  for (const g of ["f", "m"]) for (let o = 0; o < C.OUTFITS.length; o++) {
    if (diff(g, o, 0, 4, 13) < 6) miss.push(g + o + " frange de face");
    if (diff(g, o, 2, 4, 13) < 2) miss.push(g + o + " frange de profil");
    if (g === "m" && diff(g, o, 0, 20, 34) < 8) miss.push(g + o + " bras de face");
    if (diff(g, o, 2, 20, 34) < 8) miss.push(g + o + " bras de profil");
  }
  ok(!miss.length, "« soigné » : chaque tenue de joueur reçoit sa frange (face, profil) et ses bras détachés", miss.slice(0, 6).join(", "));
  // la garde-robe en deux tons (`plat`, `flatRamp` de garderobeArt.js) : même silhouette, moins de couleurs, jamais plus
  {
    const W_CASES = CASES.filter(([, , look]) => look && /^w/.test(look));
    let silW = [], more = [], fewer = 0;
    for (const [g, o, look, fl, lab] of W_CASES) for (let dir = 0; dir < 3; dir++) for (const ph of [{ step: 0, stepI: 0 }, ...PS.PERSO_SIMPLE_WALK]) {
      const fine = { step: ph.step, bob: Math.abs(ph.step), stepI: ph.stepI, habit: true };
      const a = fine32(g, o, dir, { ...fine, plat: false }, look, fl), b = fine32(g, o, dir, { ...fine, plat: true }, look, fl);
      const ca = new Set(), cb = new Set();
      for (let i = 0; i < a.length; i += 4) {
        if (!a[i + 3] !== !b[i + 3]) { silW.push(lab + " d" + dir); break; }
        if (a[i + 3]) ca.add((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]);
        if (b[i + 3]) cb.add((b[i] << 16) | (b[i + 1] << 8) | b[i + 2]);
      }
      if (cb.size > ca.size) more.push(lab + " d" + dir + " (" + ca.size + " → " + cb.size + ")");
      if (cb.size < ca.size) fewer++;
    }
    ok(!silW.length, "garde-robe en deux tons : la silhouette ne bouge pas (" + W_CASES.length + " articles × 3 vues × 9 images)", silW.slice(0, 6).join(", "));
    ok(!more.length && fewer > W_CASES.length, "garde-robe en deux tons : jamais plus de couleurs, moins dans " + fewer + " images", more.slice(0, 6).join(", "));
  }
  // l'interrupteur : deux caches, la bascule rend la feuille d'avant
  S.persoStyle = "simple";
  PS.PERSO_SOIGNE.on = true; const s4 = S.getCharHD("m", 2, null, false, "neutre", null);
  PS.PERSO_SOIGNE.on = false; const s3 = S.getCharHD("m", 2, null, false, "neutre", null);
  PS.PERSO_SOIGNE.on = true;
  ok(s4 && s3 && s4 !== s3 && S.getCharHD("m", 2, null, false, "neutre", null) === s4, "« soigné » éteint (`PERSO_SOIGNE.on`) : la feuille du 31 octobre, son propre cache ; rallumé, la même feuille qu'avant");
}

console.log("\n" + nOk + "/" + (nOk + fail) + (fail ? "  — " + fail + " ÉCHEC(S)" : "  — tout est vert") + "\n");
process.exit(fail ? 1 : 0);
