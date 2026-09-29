/* =============================================================================
   verify-pluie.mjs — L'HUMIDITÉ DU SOL ET LES FLAQUES, JOUÉES. (2026-09-29, phase 12b)
   -----------------------------------------------------------------------------
   `pluie.js` est PUR : une fonction de la météo passée, comme le manteau de
   neige. Ce banc la joue — une averse forcée à heure fixe (`meteo.js`, le même
   forçage que le menu dev), les jours passés, les saisons — et vérifie ce qu'on
   voit à l'écran ensuite : le sol se mouille vite, sèche par heures ; les flaques
   se remplissent sous une vraie pluie seulement, et rétrécissent à vitesse
   constante ; l'été sèche avant l'hiver ; le passé est mémoïsé sans dériver ;
   deux clients qui demandent la même minute obtiennent le même nombre.

   Ce qu'il ne joue pas : le dessin (voir `render-pluie.mjs`), l'éclairage de nuit
   des halos, les ronds de la pluie qui bougent.

   Usage :  node tools/verify-pluie.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "meteo", "pluie"]);
const C = mods.fermeConstants, WX = mods.meteo, PL = mods.pluie;

let fails = 0, checks = 0;
const ok = (n, c, x) => { checks++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const fx = (v, n = 2) => Number(v).toFixed(n);

const SEASON = (s) => () => s;
const A0 = C.DAY_START_MIN;
/* Une averse forcée (le genre du menu dev, montée comprise) à `at` minutes de jeu du jour `day`. */
const force = (day, kind, at) => WX.normalizeForce({ day, kind, at });
const hm = (h) => h * 60;

console.log("\n=== 1. un jour de beau temps ===\n");
{
  // Un jour sans épisode : on le cherche, on ne le suppose pas.
  let dry = null;
  for (let d = 1; d < 400 && !dry; d++) if (WX.dayWeather(d, "spring").eps.length === 0 && WX.dayWeather(d - 1, "spring").eps.length === 0 && WX.dayWeather(d - 2, "spring").eps.length === 0 && d > 3) dry = d;
  ok("trois jours secs de suite existent au printemps", dry != null, `jour ${dry}`);
  const p = PL.wetPack(dry, hm(14), SEASON("spring"), null);
  ok("un sol qui n'a pas reçu d'eau depuis trois jours est sec, sans flaque", p.w < 0.005 && p.p === 0, `w ${fx(p.w, 4)}, p ${fx(p.p, 3)}`);
}

/* Un jour `d` (et le suivant) sans aucun épisode NATUREL : l'averse forcée du jour `d` est alors
   la seule pluie, et le lendemain sèche sans qu'un autre orage vienne brouiller la mesure. */
function quietPair(season, from = 20) {
  for (let d = from; d < 500; d++) if ([d - 2, d - 1, d, d + 1].every((k) => !WX.dayWeather(k, season).eps.length)) return d;
  return null;
}
console.log("\n=== 2. une averse forcée, puis le séchage ===\n");
{
  const day = quietPair("autumn");
  ok("quatre jours sans épisode naturel de suite existent en automne (la fenêtre du banc : deux jours avant, un après)", day != null, `jours ${day - 2} à ${day + 1}`);
  const f = force(day, "rain", hm(10));
  const at = (h) => PL.wetPack(day, hm(h), SEASON("autumn"), f);
  const next = (h) => PL.wetPack(day + 1, hm(h), SEASON("autumn"), f);
  const series = [9.9, 10.5, 11.2, 12, 14].map((h) => at(h).w);
  ok("avant l'averse : sec", series[0] < 0.05, `w ${fx(series[0])}`);
  ok("l'humidité monte, jamais ne redescend, tant que la pluie monte", series.every((v, i) => i === 0 || v >= series[i - 1] - 1e-9) && series[4] > series[1] + 0.3, series.map((v) => fx(v)).join(" ≤ "));
  ok("sous une pluie franche : trempé (≥ 0,8)", at(14).w >= 0.8, `w ${fx(at(14).w)}`);
  /* ⚠️ 2026-09-29 (audit) — « > 0,5 » est devenu « > 0,4 » : les flaques ne montent plus qu'au-delà
     d'une pluie de 0,5 (règle de Guillaume, `PUD_MIN_RAIN`), et la « pluie » forcée (0,7) en
     remplit moins qu'avant (0,48 après quatre heures). L'orage, lui, est tenu au § 4 bis. */
  ok("les flaques se remplissent plus lentement que le sol ne se mouille", at(12).p < at(12).w && at(14).p > at(12).p && at(14).p > 0.4, `p ${fx(at(12).p)} puis ${fx(at(14).p)} (w ${fx(at(12).w)})`);
  ok("les flaques restent sous 1 (elles ne débordent pas)", at(14).p <= 1 && at(20).p <= 1);
  ok("le lendemain matin, le sol a passé la nuit : encore humide, encore des flaques (la nuit de 2 h à 6 h n'existe pas)", next(6.2).w > 0.6 && next(6.2).p > 0.3, `w ${fx(next(6.2).w)}, p ${fx(next(6.2).p)}`);
  const w0 = next(6.2).w, p0 = next(6.2).p;
  ok("… il sèche dans la journée : le sol avant les flaques", next(12).w < w0 * 0.15 && next(12).p > p0 * 0.15, `à midi w ×${fx(next(12).w / w0)}, p ×${fx(next(12).p / p0)}`);
  ok("… et le soir tout est sec", next(20).w < 0.05 && next(20).p < 0.02, `à 20 h : w ${fx(next(20).w)}, p ${fx(next(20).p)}`);
  ok("la durée d'une flaque sous ciel d'automne : de trois à huit heures de jeu (entre 2,4 et 6,4 minutes réelles)", (() => { for (let h = 6.2; h < 26; h += 0.2) if (next(h).p < 0.02) return h - 6.2 >= 3 && h - 6.2 <= 8; return false; })(), (() => { for (let h = 6.2; h < 26; h += 0.2) if (next(h).p < 0.02) return fx(h - 6.2, 1) + " h de jeu"; return "jamais"; })());
}

console.log("\n=== 3. la saison fait sécher ===\n");
{
  // La même averse, le lendemain à 12 h : combien reste-t-il, par saison ? (les jours du couple valent pour toutes.)
  const lv = {};
  for (const season of ["winter", "autumn", "spring", "summer"]) {
    const d = quietPair(season, 30), f = force(d, "rain", hm(10));
    lv[season] = { w: PL.wetPack(d + 1, hm(11), SEASON(season), f).w, p: PL.wetPack(d + 1, hm(10), SEASON(season), f).p };
  }
  ok("l'hiver sèche moins vite que l'automne, l'automne que le printemps, le printemps que l'été (le sol)", lv.winter.w > lv.autumn.w && lv.autumn.w > lv.spring.w && lv.spring.w > lv.summer.w, ["winter", "autumn", "spring", "summer"].map((s) => `${s} ${fx(lv[s].w)}`).join(" > "));
  ok("les flaques d'été s'évaporent avant celles d'hiver", lv.winter.p > lv.summer.p, `hiver ${fx(lv.winter.p)}, été ${fx(lv.summer.p)}`);
}

console.log("\n=== 4. une bruine mouille, elle ne remplit pas ===\n");
{
  const day = 41, f = force(day, "shower", hm(10));
  const last = PL.wetPack(day, hm(13), SEASON("spring"), f);
  const heavy = PL.wetPack(day, hm(13), SEASON("spring"), force(day, "rain", hm(10)));
  // Averse (pointe plus faible que la pluie) : plus d'humidité que de flaques, et moins de flaques qu'une vraie pluie.
  ok("une averse mouille le sol", last.w > 0.35, `w ${fx(last.w)}`);
  ok("elle remplit moins de flaques qu'une pluie franche", last.p < heavy.p, `${fx(last.p)} contre ${fx(heavy.p)}`);
  const cover = PL.wetPack(day, hm(13), SEASON("spring"), force(day, "overcast", hm(10)));
  ok("un ciel couvert sans pluie ne mouille rien", cover.w < 0.05 && cover.p === 0, `w ${fx(cover.w, 3)}`);
}

console.log("\n=== 4 bis. les pas d'intégration, joués à la main ===\n");
{
  const W = (o) => ({ rain: 0, hail: 0, dark: 0, wind: 0, snow: 0, ...o });
  const drizzle = { w: 0, p: 0, since: 1e6 };
  for (let i = 0; i < 30; i++) PL.packStep(drizzle, W({ rain: 0.15, dark: 0.3 }), 0.1, 12, "autumn");
  ok("une bruine (0,15 de pluie) mouille le sol pendant trois heures sans former une flaque", drizzle.w > 0.5 && drizzle.p === 0, `w ${fx(drizzle.w)}, p ${fx(drizzle.p)}`);
  /* ⚠️ 2026-09-29 (audit, règle de Guillaume) — « les flaques ne doivent apparaître qu'en cas de
     forte pluie ; si la pluie est fine, pas de flaques ni de torrent ». Falsifié : avec l'ancien
     seuil (0,18), l'averse forme p 0,5 et le premier contrôle rougit. */
  const shower = { w: 0, p: 0, since: 1e6 };
  for (let i = 0; i < 30; i++) PL.packStep(shower, W({ rain: 0.5, dark: 0.42 }), 0.1, 12, "autumn");
  ok("une averse à sa crête (0,5) pendant trois heures : sol trempé, aucune flaque, aucun caniveau qui coule", shower.w > 0.8 && shower.p === 0 && PL.runOf(W({ rain: 0.5 })) === 0, `w ${fx(shower.w)}, p ${fx(shower.p)}, run ${fx(PL.runOf(W({ rain: 0.5 })))}`);
  const rain = { w: 0, p: 0, since: 1e6 };
  for (let i = 0; i < 30; i++) PL.packStep(rain, W({ rain: 0.9, dark: 0.9 }), 0.1, 12, "autumn");
  ok("un orage (0,9) pendant trois heures forme des flaques, et le caniveau coule à plein", rain.p > 0.5 && PL.runOf(W({ rain: 0.9 })) > 0.9, `p ${fx(rain.p)}, run ${fx(PL.runOf(W({ rain: 0.9 })))}`);
  // La nuit (pas de soleil), trois heures de séchage à partir d'un sol trempé : la saison seule décide.
  const after = {};
  for (const season of ["winter", "autumn", "spring", "summer"]) {
    const st = { w: 0.9, p: 0.5, since: 1e6 };
    for (let i = 0; i < 30; i++) PL.packStep(st, W({}), 0.1, 23, season);
    after[season] = st;
  }
  ok("de nuit, à sec, le sol trempé garde d'autant plus qu'on est en hiver (l'été sèche vite, même sans soleil)", after.winter.w > after.autumn.w && after.autumn.w > after.spring.w && after.spring.w > after.summer.w, ["winter", "autumn", "spring", "summer"].map((k) => `${k} ${fx(after[k].w)}`).join(" > "));
  ok("… et les flaques aussi, À VITESSE CONSTANTE : 0,06 par heure de jeu en hiver (0,32 restent), toute évaporée l'été en deux heures", Math.abs((0.5 - after.winter.p) / 3 - 0.06) < 0.005 && after.summer.p === 0, `hiver ${fx(after.winter.p, 3)}, été ${fx(after.summer.p, 3)}`);
  const sun = { w: 0.9, p: 0.5, since: 1e6 }, dark = { w: 0.9, p: 0.5, since: 1e6 };
  for (let i = 0; i < 20; i++) { PL.packStep(sun, W({}), 0.1, 12.75, "autumn"); PL.packStep(dark, W({ dark: 1 }), 0.1, 12.75, "autumn"); }
  ok("le soleil de midi sèche plus vite qu'un ciel couvert", sun.w < dark.w - 0.05 && sun.p < dark.p, `${fx(sun.w)} contre ${fx(dark.w)}`);
}

console.log("\n=== 5. la neige ne fait pas de flaques ; la grêle qui fond, un peu ===\n");
{
  const day = 42;
  const snow = PL.wetPack(day, hm(14), SEASON("winter"), force(day, "snow", hm(10)));
  ok("sous la neige, le sol n'est pas mouillé", snow.w < 0.05 && snow.p === 0, `w ${fx(snow.w, 3)}`);
  const hail = PL.wetPack(day, hm(14), SEASON("autumn"), force(day, "hail", hm(10)));
  ok("la grêle mouille (elle fond)", hail.w > 0.3, `w ${fx(hail.w)}, p ${fx(hail.p)}`);
}

console.log("\n=== 6. le passé est mémoïsé, deux clients s'accordent ===\n");
{
  const day = 50, f = force(day - 1, "storm", hm(12));
  const a = PL.wetPack(day, hm(9), SEASON("spring"), f);
  // Lire les minutes dans le désordre ne change rien (le cache avance et revient).
  const forward = [7, 8, 9, 12, 15].map((h) => PL.wetPack(day, hm(h), SEASON("spring"), f).w);
  const backward = [15, 12, 9, 8, 7].map((h) => PL.wetPack(day, hm(h), SEASON("spring"), f).w).reverse();
  ok("lire la journée à l'endroit ou à l'envers rend les mêmes nombres, au bit près", forward.every((v, i) => v === backward[i]), forward.map((v) => fx(v, 4)).join(" "));
  const again = PL.wetPack(day, hm(9), SEASON("spring"), f);
  ok("deux lectures de la même minute sont identiques", a.w === again.w && a.p === again.p);
  // Un client qui a lu toute la journée et un autre qui arrive à 9 h voient la même chose (le cache est par clé, pas par visite).
  const fresh = PL.wetPack(day, hm(9.03), SEASON("spring"), f), grid = PL.wetPack(day, hm(9), SEASON("spring"), f);
  ok("à 3 minutes près (le pas d'intégration est de 6), la valeur ne saute pas", Math.abs(fresh.w - grid.w) < 0.02, `${fx(fresh.w, 4)} contre ${fx(grid.w, 4)}`);
  ok("l'orage de la veille est encore là le lendemain matin", PL.wetPack(day, hm(7), SEASON("spring"), f).w > 0.4);
}

console.log("\n=== 7. les grandeurs restent dans leurs bornes ===\n");
{
  let lo = 1, hi = 0, plo = 1, phi = 0, n = 0;
  for (let d = 1; d <= 60; d++) for (const season of ["winter", "spring", "summer", "autumn"]) for (const h of [6, 9, 12, 15, 18, 21, 24]) {
    const p = PL.wetPack(d, hm(h), SEASON(season), null);
    lo = Math.min(lo, p.w); hi = Math.max(hi, p.w); plo = Math.min(plo, p.p); phi = Math.max(phi, p.p); n++;
  }
  ok(`sur ${n} instants tirés (60 jours × 4 saisons × 7 heures) : w et p restent dans [0, 1]`, lo >= 0 && hi <= 1 && plo >= 0 && phi <= 1, `w ${fx(lo)}..${fx(hi)}, p ${fx(plo)}..${fx(phi)}`);
  ok("la pluie naturelle mouille tout de même le sol certains jours (le banc n'est pas trivial)", hi > 0.6, `w max ${fx(hi)}`);
}

console.log("\n=== 8. la lecture d'un pixel ===\n");
{
  // La courbe du seuil des flaques : monotone, bornée, continue à zéro.
  let prev = Infinity, mono = true;
  for (let p = 0; p <= 1.0001; p += 0.05) { const t = PL.puddleThr(p); if (t > prev + 1e-9) mono = false; prev = t; }
  ok("le seuil de flaque baisse avec le niveau", mono && PL.puddleThr(0) > 0.9 && PL.puddleThr(1) < 0.4, `${fx(PL.puddleThr(0))} → ${fx(PL.puddleThr(1))}`);
  ok("presque rien à 0,05 : le seuil reste au-dessus de 0,8 (un jet linéaire en donnait un cinquième des ornières)", PL.puddleThr(0.05) > 0.8, `${fx(PL.puddleThr(0.05))}`);
  ok("la couche ne s'active pas sur un sol sec", !PL.wetActive({ wet: 0.02, pud: 0.02 }) && PL.wetActive({ wet: 0.2, pud: 0 }) && PL.wetActive({ wet: 0, pud: 0.1 }));
}

console.log(`\n${fails ? "❌ " + fails + " contrôle(s) en échec sur " + checks : "✅ " + checks + "/" + checks + " contrôles passés."}`);
process.exit(fails ? 1 : 0);
