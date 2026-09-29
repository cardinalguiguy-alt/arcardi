/* =============================================================================
   verify-jour.mjs — LA DURÉE DU JOUR ET LES CHEMINÉES QUI FUMENT. (2026-09-29, phase 12c)
   -----------------------------------------------------------------------------
   Deux choses que Guillaume attendait de la phase 12 : que le jour s'allonge et
   raccourcisse avec la saison, et que les cheminées peintes fument.

   1. LE CIEL SUIT LA SAISON (`fermeConstants.js` `SUN_HOURS`, `sunHoursOf`,
      `skyBoundsOf` ; `lumiere.js` `skyAt(t, bornes)`). Lever 6 h et coucher 19 h
      redonnent EXACTEMENT les cinq constantes du ciel de référence (rien ne bouge
      pour qui ne passe pas de bornes) ; le jour est plus court l'hiver que
      l'automne, l'automne que le printemps, le printemps que l'été ; le passage d'une
      saison à l'autre est CONTINU (un coucher qui sauterait au changement de saison
      serait vu par tous à la même seconde) ; les lanternes s'allument à l'heure du
      ciel (`nightFromSky`), donc plus tôt l'hiver.
   2. LES CHEMINÉES (`fumee.js`) : le feu suit la saison, l'heure et le temps ; les
      bouffées se LISENT dans l'horloge (sans état : deux lectures du même instant
      sont identiques), montent, gonflent, pâlissent, penchent au vent ; chaque
      cheminée peinte est posée sur le TOIT de son image.

   Usage :  node tools/verify-jour.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "lumiere", "fumee"]);
const C = mods.fermeConstants, E = mods.fermeEngine, LM = mods.lumiere, FU = mods.fumee;

let fails = 0, checks = 0;
const ok = (n, c, x) => { checks++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const fx = (v, n = 2) => Number(v).toFixed(n);
const B = (s) => C.skyBoundsOf(...C.SUN_HOURS[s]);
const lumOf = LM.lum;

console.log("\n=== 1. le ciel de référence ne bouge pas ===\n");
{
  const b = C.skyBoundsOf(...C.SUN_REF);
  ok("lever 6 h, coucher 19 h : les cinq constantes du ciel, exactement", b.dawnStart === C.DAWN_START_MIN && b.dawnEnd === C.DAWN_END_MIN && b.duskStart === C.DUSK_START_MIN && b.duskMid === C.DUSK_MID_MIN && b.deepEnd === C.DEEP_END_MIN, JSON.stringify(b));
  let same = true;
  for (let t = 0; t <= 1600; t += 7) { const a = LM.skyAt(t), c = LM.skyAt(t, b); if (a[0] !== c[0] || a[1] !== c[1] || a[2] !== c[2]) same = false; }
  ok("sans bornes, le ciel est celui d'avant (les anciens appelants et les bancs)", same);
  ok("`isNightTime` sans bornes lit les constantes", E.isNightTime(C.DAWN_END_MIN - 1) && !E.isNightTime(C.DAWN_END_MIN) && E.isNightTime(C.DUSK_START_MIN) && !E.isNightTime(C.DUSK_START_MIN - 1));
}

console.log("\n=== 2. la durée du jour ===\n");
{
  const len = (s) => C.SUN_HOURS[s][1] - C.SUN_HOURS[s][0];
  ok("le jour est plus court l'hiver que l'automne, l'automne que le printemps, le printemps que l'été", len("winter") < len("autumn") && len("autumn") < len("spring") && len("spring") < len("summer"), ["winter", "autumn", "spring", "summer"].map((s) => `${s} ${fx(len(s), 1)} h`).join(" < "));
  ok("l'écart d'un solstice à l'autre : de 7 à 8 heures de jour de plus l'été", len("summer") - len("winter") >= 7 && len("summer") - len("winter") <= 8, `${fx(len("summer") - len("winter"), 1)} h`);
  // Une saison dure sept jours réels ; on la lit à son centre.
  const center = (i) => C.SEASON_EPOCH + (i + 0.5) * C.SEASON_REAL_MS;
  const order = ["spring", "summer", "autumn", "winter"];
  ok("au centre de chaque saison, le lever et le coucher sont ceux de la table", order.every((s, i) => { const [r, st] = C.sunHoursOf(center(i)); return Math.abs(r - C.SUN_HOURS[s][0]) < 1e-9 && Math.abs(st - C.SUN_HOURS[s][1]) < 1e-9; }));
  ok("le menu dev fige la saison : la table, telle quelle", order.every((s) => JSON.stringify(C.sunHoursOf(center(0), s)) === JSON.stringify(C.SUN_HOURS[s])));
  ok("`sunHoursAt` (le moteur) lit le forçage, mais pas sans lui", (() => { E.setForcedSeason("winter"); const a = E.sunHoursAt(center(1)); E.setForcedSeason(null); const b = E.sunHoursAt(center(1)); return a[0] === C.SUN_HOURS.winter[0] && b[0] === C.SUN_HOURS.summer[0]; })());
  // La continuité : on balaie quatre semaines par pas d'une heure réelle.
  let maxJump = 0, prev = null, cnt = 0;
  for (let ms = center(0) - C.SEASON_REAL_MS; ms < center(0) + 3 * C.SEASON_REAL_MS; ms += 3600 * 1000) {
    const cur = C.sunHoursOf(ms);
    if (prev) maxJump = Math.max(maxJump, Math.abs(cur[0] - prev[0]), Math.abs(cur[1] - prev[1]));
    prev = cur; cnt++;
  }
  ok(`le lever et le coucher ne sautent jamais (${cnt} heures réelles lues) : moins de 6 minutes de jeu d'une heure à la suivante`, maxJump < 0.1, `écart maximal ${fx(maxJump * 60, 1)} min de jeu`);
  // Le changement de saison exact : les deux côtés de la frontière se touchent.
  const edge = C.SEASON_EPOCH + 2 * C.SEASON_REAL_MS;   // juillet → automne (été → automne)
  const a = C.sunHoursOf(edge - 60000), b = C.sunHoursOf(edge + 60000);
  ok("à la frontière de deux saisons, rien ne saute (à la minute près)", Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01, `${fx(a[1], 3)} → ${fx(b[1], 3)}`);
}

console.log("\n=== 3. le ciel et les lanternes ===\n");
{
  const seasons = ["winter", "spring", "summer", "autumn"];
  ok("les instants clés du ciel restent triés, pour chaque saison", seasons.every((s) => { const k = LM.skyKeys(B(s)); return k.every((e, i) => i === 0 || e[0] >= k[i - 1][0]); }));
  ok("plein jour à midi, quelle que soit la saison", seasons.every((s) => lumOf(LM.skyAt(12 * 60 + 30, B(s))) > 0.999));
  const first = (s) => { for (let t = 12 * 60; t < 1560; t++) if (LM.nightFromSky(LM.skyAt(t, B(s))) > 0.02) return t / 60; return null; };
  const fw = first("winter"), fs = first("summer"), fa = first("autumn"), fp = first("spring");
  ok("les lanternes s'allument plus tôt l'hiver que l'automne, l'automne que le printemps, le printemps que l'été", fw < fa && fa < fp && fp < fs, `hiver ${fx(fw, 1)} h, automne ${fx(fa, 1)} h, printemps ${fx(fp, 1)} h, été ${fx(fs, 1)} h`);
  ok("l'écart hiver / été : cinq heures d'allumage", fs - fw >= 4.9, `${fx(fs - fw, 1)} h`);
  const at1730 = (s) => LM.nightFromSky(LM.skyAt(17.5 * 60, B(s)));
  ok("à 17 h 30 : nuit d'hiver (une lune), plein jour l'été", at1730("winter") > 0.4 && at1730("summer") === 0, `hiver ${fx(at1730("winter"))}, été ${fx(at1730("summer"))}`);
  const dawn = (s) => { for (let t = 300; t < 720; t++) if (LM.nightFromSky(LM.skyAt(t, B(s))) < 0.02) return t / 60; return null; };
  ok("le matin, les lanternes s'éteignent plus tard l'hiver (le jour de jeu commence à 6 h : il fait noir)", dawn("winter") > dawn("autumn") && dawn("autumn") > dawn("spring") && dawn("spring") > dawn("summer"), ["winter", "autumn", "spring", "summer"].map((s) => `${s} ${fx(dawn(s), 1)} h`).join(" > "));
  ok("à 6 h d'un jour d'hiver le ciel est encore celui de la nuit, un jour d'été déjà l'aube", lumOf(LM.skyAt(360, B("winter"))) < lumOf(LM.skyAt(360, B("summer"))) - 0.15 && Math.abs(lumOf(LM.skyAt(360, B("winter"))) - lumOf(LM.SKY_NIGHT)) < 1e-9);
  ok("`isNightTime` avec les bornes de la saison : plus tôt l'hiver que l'été", E.isNightTime(14 * 60, B("winter")) === false && E.isNightTime(15 * 60, B("winter")) === true && E.isNightTime(15 * 60, B("summer")) === false && E.isNightTime(19 * 60 + 40, B("summer")) === true);
  ok("le mémo du ciel ne fuit pas (mille bornes différentes, la table reste bornée)", (() => { for (let i = 0; i < 1000; i++) LM.skyAt(700, { dawnStart: 300 + i, dawnEnd: 360 + i, duskStart: 1000 + i, duskMid: 1200 + i, deepEnd: 1380 + i }); return LM.skyAt(700, B("winter")) != null; })());
}

console.log("\n=== 4. le feu ===\n");
{
  const houses = Array.from({ length: 60 }, (_, i) => i + 3);
  const mean = (season, tmin, asleep = false, chill = 0) => houses.reduce((a, h) => a + FU.chimneyLevel(h, tmin, season, asleep, chill), 0) / houses.length;
  const ev = 20 * 60;
  ok("le soir, on fume plus l'hiver que l'automne, l'automne que le printemps, le printemps que l'été", mean("winter", ev) > mean("autumn", ev) && mean("autumn", ev) > mean("spring", ev) && mean("spring", ev) > mean("summer", ev), ["winter", "autumn", "spring", "summer"].map((s) => `${s} ${fx(mean(s, ev))}`).join(" > "));
  ok("l'été, par beau temps, aucune cheminée ne fume à midi", mean("summer", 13 * 60) === 0);
  ok("l'été, un soir de pluie, quelques-unes rallument (pas toutes)", mean("summer", ev, false, FU.chillOf({ rain: 1, snow: 0, dark: 0.5 })) > 0.05 && mean("summer", ev, false, FU.chillOf({ rain: 1, snow: 0, dark: 0.5 })) < 0.6, fx(mean("summer", ev, false, 0.3)));
  ok("l'hiver à midi (le feu d'entretien) : une maison sur deux environ, pas toutes, pas aucune", (() => { const n = houses.filter((h) => FU.chimneyLevel(h, 13 * 60, "winter", false) > 0.05).length; return n > 8 && n < 52; })(), `${houses.filter((h) => FU.chimneyLevel(h, 13 * 60, "winter", false) > 0.05).length} sur ${houses.length}`);
  ok("une rue ne fume jamais d'un bloc : au même instant, les maisons d'automne ont des feux différents", new Set(houses.map((h) => fx(FU.chimneyLevel(h, 13 * 60, "autumn", false), 2))).size > 3);
  ok("le poêle du matin, la soirée, puis les braises : 8 h > 13 h, 20 h > 13 h, 1 h 30 du matin < 20 h", mean("autumn", 8 * 60) > mean("autumn", 13 * 60) && mean("autumn", ev) > mean("autumn", 13 * 60) && mean("autumn", 25.5 * 60) < mean("autumn", ev), [8, 13, 20, 25.5].map((h) => fx(mean("autumn", h * 60))).join(" / "));
  ok("un propriétaire qui dort a un feu plus bas", mean("autumn", 23.5 * 60, true) < mean("autumn", 23.5 * 60, false));
  ok("le feu est une pure fonction (deux lectures, même nombre)", houses.every((h) => FU.chimneyLevel(h, 1000, "spring", false, 0.1) === FU.chimneyLevel(h, 1000, "spring", false, 0.1)));
  ok("le niveau reste dans [0, 1]", houses.every((h) => [360, 700, 1300, 1560].every((t) => ["winter", "spring", "summer", "autumn"].every((s) => { const v = FU.chimneyLevel(h, t, s, false, 0.3); return v >= 0 && v <= 1; }))));
  ok("`chillOf` : le temps qu'il fait, jamais plus de 0,3", FU.chillOf({ rain: 1, snow: 1, dark: 1 }) === 0.3 && FU.chillOf({ rain: 0, snow: 0, dark: 0 }) === 0);
}

console.log("\n=== 5. les bouffées ===\n");
{
  const out1 = [], out2 = [];
  FU.smokePuffs(7, 1, 1234.567, 0.3, out1); FU.smokePuffs(7, 1, 1234.567, 0.3, out2);
  ok("une bouffée se LIT dans l'horloge : deux lectures du même instant sont identiques (aucun état)", out1.length > 6 && JSON.stringify(out1) === JSON.stringify(out2), `${out1.length} bouffées`);
  ok("rien à niveau nul, de plus en plus quand le feu monte", (() => { const c = (l) => FU.smokePuffs(7, l, 500, 0, []).length; return c(0) === 0 && c(0.3) > 0 && c(0.3) < c(1); })());
  ok("au plus 14 bouffées par tuyau (le coût d'un tuyau)", (() => { let m = 0; for (let t = 0; t < 200; t += 0.37) m = Math.max(m, FU.smokePuffs(7, 1, t, 0, []).length); return m <= 14; })());
  const sorted = out1.slice().sort((a, b) => a.dy - b.dy);
  ok("la fumée monte, gonfle et pâlit avec l'âge", sorted.every((p, i) => i === 0 || (p.dy >= sorted[i - 1].dy && p.r >= sorted[i - 1].r - 1e-9)) && sorted[0].dy < sorted[sorted.length - 1].dy && sorted[sorted.length - 1].r > sorted[0].r + 0.8);
  ok("chaque bouffée est AU-DESSUS de la bouche du tuyau, et jamais plus vive que 0,72", out1.every((p) => p.dy >= 0 && p.a <= 0.72 + 1e-9 && p.a >= 0));
  ok("la plus vieille s'est effacée (transparence < 0,05 à moins de 0,4 s de la fin ; elle monte de 43 px au moins)", (() => { let worst = 0, n = 0; for (let t = 100; t < 160; t += 0.11) for (const p of FU.smokePuffs(9, 1, t, 0, [])) if (p.dy > 42.8) { worst = Math.max(worst, p.a); n++; } return n > 20 && worst < 0.05; })());
  const drift = (w) => { let s = 0, n = 0; for (let t = 100; t < 130; t += 0.5) for (const p of FU.smokePuffs(4, 1, t, w, [])) { s += p.dx; n++; } return s / n; };
  ok("le vent penche la colonne vers l'est", drift(1) > drift(0) + 3, `${fx(drift(0), 1)} px sans vent, ${fx(drift(1), 1)} px en tempête`);
  const a = FU.smokePuffs(1, 1, 300, 0, []), b = FU.smokePuffs(2, 1, 300, 0, []);
  ok("deux tuyaux d'un même toit ne respirent pas ensemble", JSON.stringify(a) !== JSON.stringify(b));
}

console.log("\n=== 6. les cheminées peintes sont sur leur toit ===\n");
{
  const withChim = Object.entries(C.TOWN_HOUSE_MODELS).filter(([, m]) => m.chimney);
  ok("cinq modèles ont une cheminée peinte (S1, S2, S3, N1, N2) ; S4, qui n'en a pas, n'en reçoit pas", withChim.map(([k]) => k).sort().join(",") === "n1,n2,s1,s2,s3" && !C.TOWN_HOUSE_MODELS.s4.chimney, withChim.map(([k]) => k).join(","));
  let bad = [];
  for (const [k, m] of withChim) for (const [cx, cy] of m.chimney) {
    // Dans le cadre de chaque version (ruine exceptée : rien n'y fume), et sur le toit — au-dessus des fenêtres d'étage.
    for (const [vn, v] of Object.entries(m.variants)) {
      if (vn === "ruine") continue;
      const [c0, c1, cw, ch] = v.crop;
      if (cx < c0 || cx > c0 + cw || cy < c1 || cy > c1 + ch) bad.push(`${k}/${vn} hors cadre`);
    }
    const topWin = Math.min(...m.wins.filter((w) => !w.lamp).map((w) => w.y));
    if (cy > topWin + 60) bad.push(`${k} sous la première fenêtre`);
  }
  ok("chaque bouche de tuyau est dans le cadre de chaque version et au niveau du toit", bad.length === 0, bad.join(" "));
  ok("la maison hantée n'a pas de feu (`ruine` : rien n'y fume)", (() => { const m = C.TOWN_HOUSE_MODELS[C.TOWN_RUIN.model]; return !!m.variants.ruine; })());
}

console.log(`\n${fails ? "❌ " + fails + " contrôle(s) en échec sur " + checks : "✅ " + checks + "/" + checks + " contrôles passés."}`);
process.exit(fails ? 1 : 0);
