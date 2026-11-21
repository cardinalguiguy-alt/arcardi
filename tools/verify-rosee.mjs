/* =============================================================================
   verify-rosee.mjs — LA ROSÉE DU MATIN ET LES CHEMINS QU'ON Y LAISSE (2026-11-21 : `rosee.js`, `neige.js`).
   Ce que le banc tient :
   1. LE MODÈLE (`dewOf`) : pleine au petit matin d'une nuit claire ; sèche d'abord au soleil, plus tard à l'ombre ; partie à midi ;
      rien la nuit, sous la pluie, la neige, après une aube couverte ; le vent la réduit ; jamais séchée avant 7 h 30.
   2. LE DESSIN (`renderChunk`, la parcelle de prairie de verify-neige) : la rosée voile une part de l'herbe d'argent (ni rien, ni tout),
      seulement l'herbe ; plus à l'ombre qu'au soleil quand le soleil a commencé à sécher ; des gouttes à allumer au soleil.
   3. LES PAS : sans neige, un marcheur laisse ses pas dans la rosée et dans la gelée (`surfacePrints`), pas sur un sol sec ; le chemin
      se lit PLUS SOMBRE que l'herbe voilée autour ; la carte des pas s'efface quand la rosée a séché.
   Usage : node tools/verify-rosee.mjs        FALSIFY=sec (les pas posés sans rosée) | clair (le chemin dessiné clair)
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "fermeArt", "neige", "meteo", "rosee"]);
const C = mods.fermeConstants, E = mods.fermeEngine, A = mods.fermeArt, NG = mods.neige, WX = mods.meteo, RS = mods.rosee;
const FALSIFY = process.env.FALSIFY || "";
const T = C.TILE;
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
console.log("\n=== verify-rosee ===\n");

// 1. Le modèle
{
  const clear = { rain: 0, snow: 0, hail: 0, dark: 0, wind: 0 }, rise = WX.sunHoursOfTag("spring")[0];
  const d = (h, W = clear, Wd = clear, sn = 0, tag = "spring") => RS.dewOf(h, rise, tag, W, Wd, sn);
  ok(d(6.5).sun > 0.95 && d(6.5).shade > 0.95, "pleine au petit matin d'une nuit claire (6 h 30)", d(6.5).sun.toFixed(2));
  const mid = Math.max(rise + RS.ROSEE.FULL_AFTER_RISE, RS.ROSEE.MIN_FULL) + 0.9;
  ok(d(mid).sun < d(mid).shade - 0.2, "elle sèche d'abord au soleil, tient à l'ombre", "à " + mid.toFixed(1) + " h : soleil " + d(mid).sun.toFixed(2) + ", ombre " + d(mid).shade.toFixed(2));
  ok(d(12.5).sun === 0 && d(12.5).shade === 0 && d(2).sun === 0 && d(22).sun === 0, "rien à midi passé, ni la nuit, ni le soir");
  ok(d(7, { ...clear, rain: 0.3 }).sun === 0 && d(7, { ...clear, snow: 0.3 }).sun === 0 && d(7, clear, clear, 2).sun === 0, "rien sous la pluie, la neige qui tombe, ni sur la neige au sol");
  ok(d(7, { ...clear, dark: 0.7 }, { ...clear, dark: 0.7 }).sun === 0 && d(7, { ...clear, dark: 0.7 }, clear).sun > 0.9, "c'est le ciel de l'AUBE qui compte : une aube couverte n'en pose pas, un nuage à 7 h ne l'efface pas");
  ok(d(6.5, { ...clear, wind: 1 }).sun < 0.5, "le vent la réduit", d(6.5, { ...clear, wind: 1 }).sun.toFixed(2));
  ok(RS.dewOf(7.4, 4.5, "summer", clear, clear, 0).sun > 0.8, "jamais séchée avant 7 h 30, même l'été au lever précoce");
  let mono = true; for (let h = 6; h < 13; h += 0.1) if (d(h + 0.1).sun > d(h).sun + 1e-9 || d(h + 0.1).shade > d(h).shade + 1e-9) mono = false;
  ok(mono, "dans la matinée, elle ne fait que sécher (jamais de retour)");
}

// 2. Le dessin — la parcelle de prairie de verify-neige
const tw = E.generateTownWorld();
const S = A.buildSprites();
const env = A.townSnowEnv(tw, S, (wx, wy) => { const x = Math.floor(wx / T), y = Math.floor(wy / T); return x >= 0 && y >= 0 && x < tw.w && y < tw.h && tw.ground[y * tw.w + x] === C.G_WATER; });
env.fields = NG.snowTileFields(tw, env.trees, env.tall);
const CX = 1, CY = 3, CHN = NG.CH, N = CHN * CHN;
const st = NG.buildChunkStatic(tw, CX, CY, env);
const ZP = { g: 0, s: 0, r: 0, berm: 0, rh: 0, rc: 0, tl: 0, tc: 0, since: 0 };
const render = (P, imp) => { const out = new Uint8ClampedArray(N * 4); const gl = NG.renderChunk(st, ZP, { winter: false, frost: 0, wetRoad: 0, sun: 1, ...P }, imp || null, out); return { out, gl }; };
const clsAt = (i) => st.cls[(((i / CHN) | 0) + 1) * (CHN + 2) + (i % CHN) + 1];
const grassy = (c) => c === NG.CL.GRASS || c === NG.CL.LAWN || c === NG.CL.SHORE;
{
  const { out, gl } = render({ dew: 1, dewShade: 1 });
  let grass = 0, veiled = 0, other = 0;
  for (let i = 0; i < N; i++) {
    const c = clsAt(i);
    if (grassy(c)) { grass++; if (out[i * 4 + 3] && out[i * 4 + 2] > 200) veiled++; }
    else if (c && c !== NG.CL.TILLED && out[i * 4 + 3] && out[i * 4 + 2] > 200 && out[i * 4] > 180) other++;
  }
  let strong = 0; for (let i = 0; i < N; i++) if (grassy(clsAt(i)) && out[i * 4 + 3] > 60) strong++;
  ok(veiled / grass > 0.97 && strong / grass > 0.2 && strong / grass < 0.85, "pleine, la rosée voile toute l'herbe d'argent, plus franchement une part des brins (ni rien, ni tout)", (100 * veiled / grass).toFixed(0) + " % voilés, " + (100 * strong / grass).toFixed(0) + " % francs, de " + grass + " px d'herbe");
  ok(other === 0, "seulement sur l'herbe (pas sur la pierre ni la chaussée)", other + " px");
  ok(gl.filter((g) => g[3] === 1).length > 10, "des gouttes à allumer au soleil", gl.filter((g) => g[3] === 1).length + " gouttes");
  const { out: o0 } = render({ dew: 0, dewShade: 0 });
  let any = 0; for (let i = 0; i < N; i++) if (o0[i * 4 + 3]) any++;
  ok(any === 0, "sans rosée (ni gelée, ni hiver), la couche ne dessine rien", any + " px");
  const { out: oh } = render({ dew: 0.1, dewShade: 0.9 });
  let sunV = 0, shV = 0, sunN = 0, shN = 0;
  for (let i = 0; i < N; i++) {
    if (!grassy(clsAt(i))) continue;
    const o = (((i / CHN) | 0) + 1) * (CHN + 2) + (i % CHN) + 1, shaded = Math.max(st.shade[o], st.cast[o]) > 160;
    const v = oh[i * 4 + 3];
    if (shaded) { shN++; shV += v; } else { sunN++; sunV += v; }
  }
  const mSh = shV / Math.max(1, shN), mSun = sunV / Math.max(1, sunN);
  ok(shN > 50 && mSh > mSun * 2.5, "au soleil elle a séché, à l'ombre elle tient (le voile moyen)", "ombre " + mSh.toFixed(0) + ", soleil " + mSun.toFixed(0) + " (alpha moyen)");
}

// 3. Les pas
{
  const mk = (P) => { const f = NG.makeSnowField(tw, { ...env, makeCanvas: (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; } }); f.setParams(ZP, { winter: false, frost: 0, wetRoad: 0, sun: 1, ...P }); return f; };
  const walk = (f) => { const W0 = NG.makeWalkers(); let t = 0; for (let s2 = 0; s2 <= 80; s2++) W0.step("a", "boot", (9 + s2 * 0.06) * T, 28.5 * T, t += 16, f, 1); return f.printCount(); };   // dans la parcelle (1, 3)
  const fDew = mk({ dew: 1, dewShade: 1 }), fFrost = mk({ winter: true, frost: 1, frostShade: 1 }), fDry = mk(FALSIFY === "sec" ? { dew: 1 } : {});
  const pDew = walk(fDew), pFrost = walk(fFrost), pDry = walk(fDry);
  ok(pDew > 30, "sans neige, un marcheur laisse ses pas dans la rosée", pDew + " px");
  ok(pFrost > 30, "… et dans la gelée blanche", pFrost + " px");
  ok(pDry === 0, "rien sur un sol sec", pDry + " px");
  // le chemin se lit plus sombre que l'herbe voilée autour
  const pr = fDew._prints().prints, a0 = pr.get((CY) * Math.ceil(tw.w * T / CHN) + CX);
  const imp = a0 ? (x, y) => (x < 0 || y < 0 || x >= CHN || y >= CHN ? 0 : a0[y * CHN + x]) : null;
  const { out } = render({ dew: 1, dewShade: 1 }, imp);
  const lum = (i) => { const a = out[i * 4 + 3] / 255; const base = 90; return out[i * 4 + 1] * a + base * (1 - a); };
  let inL = 0, inN = 0, outL = 0, outN = 0;
  for (let i = 0; i < N; i++) {
    if (!grassy(clsAt(i))) continue;
    const k = a0 ? a0[i] : 0;
    if (k >= 25) { inL += FALSIFY === "clair" ? 250 : lum(i); inN++; } else if (k === 0) { outL += lum(i); outN++; }
  }
  ok(a0 && inN > 20 && inL / inN < outL / outN - 6, "le chemin se lit plus sombre que l'herbe voilée autour (herbe couchée, essuyée)", inN ? "dedans " + (inL / inN).toFixed(0) + ", autour " + (outL / outN).toFixed(0) : "aucun pas dans la parcelle");
  fDew.setParams(ZP, { winter: false, frost: 0, wetRoad: 0, sun: 1, dew: 0, dewShade: 0 });
  ok(fDew.printCount() === 0, "la rosée séchée, ses chemins partent avec elle (ils ne reviendront pas le lendemain)");
}
console.log("\n" + nOk + "/" + (nOk + fail) + (fail ? "  — " + fail + " ÉCHEC(S)" : "  — tout est vert") + "\n");
process.exit(fail ? 1 : 0);
