/* ╔══════════════════════════════════════════════════════════════════════════
   ║ verify-meteo — LA MÉTÉO (2026-09-26).
   ╚══════════════════════════════════════════════════════════════════════════
   JOUE `components/ferme/meteo.js` sur des milliers de journées, et ce que
   la lumière (`lumiere.js`) et la faune (`faune.js`) en font :
     1. PURE : même jour, même saison → même temps, au bit près ;
     2. LES SAISONS : plus de pluie à l'automne qu'en été, l'été surtout des
        orages (dont des secs), la neige l'hiver seulement, la grêle l'automne
        et l'hiver seulement ;
     3. AUCUN SAUT : chaque canal varie par petits pas, et tout est à zéro
        aux deux bouts de la journée (la bascule de jour ne coupe rien) ;
     4. L'ORAGE MONTE : le ciel se couvre avant la pluie, les premiers éclairs
        sont lointains, la pluie cesse avant que le ciel se dégage ;
     5. LA PLUIE NE TOMBE PAS VIOLENTE D'EMBLÉE ; l'orage sec ne mouille pas ;
     6. LA NEIGE : trois intensités, et les flocons grossissent avec elle ;
     7. LE FORÇAGE : rien ne change avant son heure, il monte, il vaut pour
        son jour seulement, et il se relit après un aller-retour JSON ;
     8. LES ÉCLAIRS : chaque tonnerre répond à un éclair vu, et un orage qui
        monte ajoute des éclairs sans déplacer les anciens ;
     9. LA SAISON FORCÉE : `E.seasonOf()` la suit, et la relâche ;
    10. LA FAUNE : aucune bête ne saute quand l'averse arrive, et l'averse ne
        réécrit pas le passé.
   ⚠️ Tout banc qui compte publie ce qu'il a LU (§10 de CLAUDE.md). */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "meteo", "lumiere", "faune", "neige"]);
const C = mods.fermeConstants, E = mods.fermeEngine, WX = mods.meteo, LM = mods.lumiere, F = mods.faune, NG = mods.neige;

let fail = 0, n = 0;
const ok = (name, cond, detail) => { n++; console.log((cond ? "  OK   " : "  FAIL ") + name + (detail ? "  —  " + detail : "")); if (!cond) fail++; };

const SEASONS = ["spring", "summer", "autumn", "winter"];
const DAYS = 4000;
const A = C.DAY_START_MIN, B = C.DAY_END_MIN;
const PRECIP = new Set(["shower", "rain", "storm", "hail", "snowLight", "snow", "snowHeavy"]);

console.log("§1 — Une pure fonction du jour, de la saison et de l'heure");
{
  let diff = 0, reads = 0;
  for (let d = 1; d < 300; d++) for (const se of SEASONS) {
    const a = JSON.stringify(WX.dayWeather(d, se)), b = JSON.stringify(WX.dayWeather(d, se));
    const tm = A + (d * 37) % (B - A);
    if (a !== b || JSON.stringify(WX.weatherAt(d, tm, se, null)) !== JSON.stringify(WX.weatherAt(d, tm, se, null))) diff++;
    reads++;
  }
  ok("deux « clients » tirent le même temps", diff === 0, `${diff} écarts sur ${reads} jours`);
}

console.log("§2 — Les saisons");
const count = {};
for (const se of SEASONS) {
  const c = count[se] = { days: 0, precip: 0, rainy: 0, kinds: {} };
  for (let d = 1; d <= DAYS; d++) {
    const eps = WX.dayWeather(d, se).eps;
    c.days++;
    if (eps.some((e) => PRECIP.has(e.kind))) c.precip++;
    if (eps.some((e) => e.kind === "shower" || e.kind === "rain" || e.kind === "storm")) c.rainy++;
    for (const e of eps) c.kinds[e.kind] = (c.kinds[e.kind] || 0) + 1;
  }
}
const pct = (a, b) => (100 * a / b).toFixed(1) + " %";
for (const se of SEASONS) console.log(`      ${se}: précipitations ${pct(count[se].precip, DAYS)}, pluie ${pct(count[se].rainy, DAYS)} — ${JSON.stringify(count[se].kinds)}`);
ok("plus de jours de pluie à l'automne qu'en été (au moins deux fois)", count.autumn.rainy >= 2 * count.summer.rainy, `${count.autumn.rainy} contre ${count.summer.rainy}`);
{
  const k = count.summer.kinds, storms = (k.storm || 0) + (k.dryStorm || 0), wet = (k.shower || 0) + (k.rain || 0);
  ok("l'été : surtout des orages, dont des secs", storms > wet && (k.dryStorm || 0) > 0.3 * storms, `${storms} orages (${k.dryStorm || 0} secs) contre ${wet} pluies`);
}
ok("la neige l'hiver seulement", ["spring", "summer", "autumn"].every((se) => !count[se].kinds.snow && !count[se].kinds.snowLight && !count[se].kinds.snowHeavy)
   && count.winter.kinds.snowLight > 0 && count.winter.kinds.snow > 0 && count.winter.kinds.snowHeavy > 0,
   `hiver : fine ${count.winter.kinds.snowLight}, modérée ${count.winter.kinds.snow}, forte ${count.winter.kinds.snowHeavy}`);
ok("la grêle l'automne et l'hiver seulement", !count.spring.kinds.hail && !count.summer.kinds.hail && count.autumn.kinds.hail > 0 && count.winter.kinds.hail > 0,
   `automne ${count.autumn.kinds.hail}, hiver ${count.winter.kinds.hail}`);
ok("il fait souvent beau (au moins 40 % de jours secs, hors hiver et automne)", ["spring", "summer"].every((se) => count[se].precip < 0.6 * DAYS));
{
  let late = 0, eps = 0;
  for (const se of SEASONS) for (let d = 1; d <= DAYS; d++) for (const e of WX.dayWeather(d, se).eps) {
    eps++; if (e.t0 < A || e.t0 + e.rise + e.hold + e.fall > B - 9.99) late++;
  }
  ok("chaque épisode commence et finit dans sa journée", late === 0, `${late} sur ${eps} épisodes`);
}

console.log("§3 — Aucun saut");
{
  const STEP = 0.25, LIMIT = 0.06; // en minutes de jeu (0,2 s réelle) ; un pas de 6 % au plus
  let worst = 0, where = "", edge = 0, reads = 0;
  for (const se of SEASONS) for (let d = 1; d <= 600; d++) {
    let prev = WX.weatherAt(d, A, se, null);
    for (const c of WX.CHANNELS) if (prev[c] > 1e-6) edge++;
    for (let t = A + STEP; t <= B; t += STEP) {
      const w = WX.weatherAt(d, t, se, null); reads++;
      for (const c of WX.CHANNELS) { const dv = Math.abs(w[c] - prev[c]); if (dv > worst) { worst = dv; where = `${se} jour ${d} ${c} à ${(t / 60).toFixed(2)} h`; } }
      prev = w;
    }
    for (const c of WX.CHANNELS) if (prev[c] > 1e-6) edge++;
  }
  ok(`aucun canal ne bouge de plus de ${LIMIT} en ${STEP} minute de jeu`, worst <= LIMIT, `pire ${worst.toFixed(3)} (${where}), ${reads} lectures`);
  ok("tout est à zéro aux deux bouts de la journée", edge === 0, `${edge} canaux non nuls`);
}

/* Le premier instant (minutes de jeu) où `f(t)` dépasse `v`, dans l'épisode. */
const firstAbove = (d, se, e, f, v) => { for (let t = e.t0; t <= e.t0 + e.rise + e.hold; t += 0.5) if (f(WX.weatherAt(d, t, se, null)) >= v) return t; return Infinity; };
const lastAbove = (d, se, e, f, v) => { let last = -Infinity; for (let t = e.t0 + e.rise; t <= e.t0 + e.rise + e.hold + e.fall; t += 0.5) if (f(WX.weatherAt(d, t, se, null)) >= v) last = t; return last; };
const soloEps = (kind) => {
  const out = [];
  for (const se of SEASONS) for (let d = 1; d <= DAYS && out.length < 150; d++) {
    const eps = WX.dayWeather(d, se).eps;
    if (eps.length === 1 && eps[0].kind === kind) out.push({ d, se, e: eps[0] });
  }
  return out;
};

console.log("§4 — L'orage monte");
{
  const list = soloEps("storm");
  let skyFirst = 0, farFirst = 0, rainStopsFirst = 0;
  for (const { d, se, e } of list) {
    const pk = e.p;
    if (firstAbove(d, se, e, (w) => w.dark, 0.5 * pk.dark) < firstAbove(d, se, e, (w) => w.rain, 0.5 * pk.rain)) skyFirst++;
    // Le premier éclair possible (bolts > 0) tombe quand l'orage est encore loin.
    const t1 = firstAbove(d, se, e, (w) => w.bolts, 0.02);
    if (WX.weatherAt(d, t1, se, null).near < 0.3) farFirst++;
    if (lastAbove(d, se, e, (w) => w.rain, 0.05) < lastAbove(d, se, e, (w) => w.dark, 0.3 * pk.dark)) rainStopsFirst++;
  }
  ok("le ciel se couvre avant que la pluie tombe", skyFirst === list.length, `${skyFirst}/${list.length} orages`);
  ok("les premiers éclairs sont lointains (near < 0,3)", farFirst === list.length, `${farFirst}/${list.length}`);
  ok("la pluie cesse avant que le ciel se dégage", rainStopsFirst === list.length, `${rainStopsFirst}/${list.length}`);
  const e0 = list[0];
  ok("un orage met au moins une minute RÉELLE à atteindre sa pluie", (firstAbove(e0.d, e0.se, e0.e, (w) => w.rain, 0.8 * e0.e.p.rain) - e0.e.t0) * C.DAY_REAL_MS / (B - A) >= 60000,
     `${((firstAbove(e0.d, e0.se, e0.e, (w) => w.rain, 0.8 * e0.e.p.rain) - e0.e.t0) * C.DAY_REAL_MS / (B - A) / 1000).toFixed(0)} s`);
}

console.log("§5 — La pluie commence en bruine ; l'orage sec ne mouille pas");
{
  let gentle = 0, total = 0, rampS = Infinity;
  for (const kind of ["shower", "rain"]) for (const { d, se, e } of soloEps(kind)) {
    total++;
    const t0 = firstAbove(d, se, e, (w) => w.rain, 0.001), tPk = firstAbove(d, se, e, (w) => w.rain, 0.9 * e.p.rain);
    if (WX.weatherAt(d, t0 + 1, se, null).rain < 0.08) gentle++;
    rampS = Math.min(rampS, (tPk - t0) * C.DAY_REAL_MS / (B - A) / 1000);
  }
  ok("la première minute de pluie est une bruine (< 0,08)", gentle === total, `${gentle}/${total} épisodes`);
  ok("de la première goutte au plus fort : au moins 8 s réelles", rampS >= 8, `au plus court ${rampS.toFixed(1)} s`);
  let wet = 0, bolts = 0, darkMax = 0;
  for (const { d, se, e } of soloEps("dryStorm")) for (let t = e.t0; t < e.t0 + e.rise + e.hold + e.fall; t += 2) {
    const w = WX.weatherAt(d, t, se, null);
    if (w.rain + w.hail + w.snow > 0) wet++;
    if (w.bolts > 0.3) bolts++;
    darkMax = Math.max(darkMax, w.dark);
  }
  ok("orage sec : pas une goutte, des éclairs, un ciel à peine assombri", wet === 0 && bolts > 0 && darkMax <= 0.45, `${wet} lectures mouillées, ${bolts} lectures d'éclairs, sombre max ${darkMax.toFixed(2)}`);
}

console.log("§6 — La neige");
{
  const peak = (kind) => { const l = soloEps(kind); let s = 0, f = 0; for (const { d, se, e } of l) { const w = WX.weatherAt(d, e.t0 + e.rise + e.hold / 2, se, null); s += w.snow; f += w.flake; } return { s: s / l.length, f: f / l.length, n: l.length }; };
  const L1 = peak("snowLight"), L2 = peak("snow"), L3 = peak("snowHeavy");
  ok("trois intensités croissantes", L1.s < L2.s && L2.s < L3.s, `${L1.s.toFixed(2)} < ${L2.s.toFixed(2)} < ${L3.s.toFixed(2)} (${L1.n}/${L2.n}/${L3.n} épisodes)`);
  ok("des flocons de plus en plus gros", L1.f < L2.f && L2.f < L3.f, `${L1.f.toFixed(2)} < ${L2.f.toFixed(2)} < ${L3.f.toFixed(2)}`);
  let bad = 0; for (let d = 1; d < 500; d++) for (let t = A; t < B; t += 7) { const w = WX.weatherAt(d, t, "winter", null); if (w.snow <= 0 && w.flake > 0) bad++; }
  ok("pas de taille de flocon sans neige", bad === 0, `${bad} écarts`);
}

console.log("§7 — Le forçage du menu dev");
{
  let before = 0, reads = 0;
  const at = 14 * 60;
  for (let d = 1; d < 400; d++) for (const kind of WX.WX_KINDS) {
    const f = { day: d, kind, at };
    for (let t = A; t < at; t += 11) { reads++; if (JSON.stringify(WX.weatherAt(d, t, "autumn", f)) !== JSON.stringify(WX.weatherAt(d, t, "autumn", null))) before++; }
  }
  ok("rien ne change avant l'heure du forçage", before === 0, `${before} écarts sur ${reads} lectures`);
  const d = 17, f = { day: d, kind: "storm", at };
  const w1 = WX.weatherAt(d, at + 2, "summer", f), w2 = WX.weatherAt(d, at + 400, "summer", f);
  ok("un orage commandé MONTE (presque rien au début, tout au bout)", w1.rain < 0.05 && w2.rain > 0.8 && w2.bolts > 0.5, `pluie ${w1.rain.toFixed(2)} → ${w2.rain.toFixed(2)}, éclairs ${w2.bolts.toFixed(2)}`);
  ok("il tient jusqu'au bout de la journée", WX.weatherAt(d, B, "summer", f).rain > 0.8);
  ok("le lendemain, la rotation reprend", JSON.stringify(WX.weatherAt(d + 1, at + 400, "summer", f)) === JSON.stringify(WX.weatherAt(d + 1, at + 400, "summer", null)));
  // Le beau temps commandé efface l'épisode en cours.
  let dd = 1; while (!(WX.dayWeather(dd, "autumn").eps[0] && WX.dayWeather(dd, "autumn").eps[0].kind === "rain")) dd++;
  const ep = WX.dayWeather(dd, "autumn").eps[0], mid = ep.t0 + ep.rise + ep.hold / 2;
  const fc = { day: dd, kind: "clear", at: mid };
  const wc = WX.weatherAt(dd, mid + WX.FORCE_BLEND + 1, "autumn", fc);
  ok("« beau » commandé en pleine pluie : tout retombe à zéro", WX.weatherAt(dd, mid, "autumn", fc).rain > 0.3 && WX.CHANNELS.every((c) => wc[c] < 1e-9), `pluie ${WX.weatherAt(dd, mid, "autumn", fc).rain.toFixed(2)} → ${wc.rain}`);
  let worst = 0; let prev = WX.weatherAt(dd, mid - 1, "autumn", fc);
  for (let t = mid - 0.75; t < mid + 200; t += 0.25) { const w = WX.weatherAt(dd, t, "autumn", fc); for (const c of WX.CHANNELS) worst = Math.max(worst, Math.abs(w[c] - prev[c])); prev = w; }
  ok("le forçage ne fait pas sauter le temps", worst <= 0.06, `pire pas ${worst.toFixed(3)}`);
  const rt = WX.normalizeForce(JSON.parse(JSON.stringify(f)));
  ok("le forçage survit à un aller-retour JSON", rt && rt.day === d && rt.kind === "storm" && rt.at === at);
  ok("un forçage abîmé est refusé", [null, {}, { day: 3, kind: "tornade", at: 400 }, { day: 0, kind: "rain", at: 400 }, { day: 3, kind: "rain", at: "x" }].every((x) => WX.normalizeForce(x) === null));
}

console.log("§8 — Les éclairs et le tonnerre");
{
  const T0 = Date.UTC(2026, 8, 26, 12, 0, 0), day = 9;
  const hits = LM.strikesIn(T0, T0 + 600000, day, WX.BOLT_ODDS_MAX);
  let seen = 0; for (const h of hits) if (LM.flashAt(h.at + 20, day, WX.BOLT_ODDS_MAX) === 1) seen++;
  ok("chaque coup compté se voit au ciel", hits.length > 30 && seen === hits.length, `${seen}/${hits.length} coups en 10 min (un toutes les ${(600 / hits.length).toFixed(1)} s)`);
  const lo = LM.strikesIn(T0, T0 + 600000, day, WX.BOLT_ODDS_MAX / 3).map((h) => h.at);
  const hiSet = new Set(hits.map((h) => h.at));
  ok("un orage qui monte AJOUTE des éclairs sans déplacer les anciens", lo.length > 5 && lo.length < hits.length && lo.every((a) => hiSet.has(a)), `${lo.length} ⊂ ${hits.length}`);
  ok("pas d'éclair sans orage", LM.flashAt(T0, day, 0) === 0 && LM.strikesIn(T0, T0 + 60000, day, 0).length === 0);
  const far = WX.thunderFor(0, 0.5), near = WX.thunderFor(1, 0.5);
  ok("un orage lointain gronde plus tard et plus bas", far.delayMs > near.delayMs + 2000 && far.volume < near.volume, `loin ${far.delayMs} ms / ${far.volume.toFixed(2)}, proche ${near.delayMs} ms / ${near.volume.toFixed(2)}`);
  const s0 = LM.skyLight(12 * 60, 0, 0), s5 = LM.skyLight(12 * 60, 0.5, 0), s1 = LM.skyLight(12 * 60, 1, 0), sT = LM.skyLight(12 * 60, true, 0);
  ok("le ciel s'assombrit par degrés", LM.lum(s0) > LM.lum(s5) && LM.lum(s5) > LM.lum(s1) && s1.every((v, k) => Math.abs(v - sT[k]) < 1e-12),
     `${LM.lum(s0).toFixed(2)} > ${LM.lum(s5).toFixed(2)} > ${LM.lum(s1).toFixed(2)}`);
}

console.log("§9 — La saison forcée");
{
  const real = E.seasonOf().key;
  const other = SEASONS.find((s) => s !== real);
  E.setForcedSeason(other);
  const forced = E.seasonOf().key, at = E.seasonAt(Date.UTC(2026, 0, 6)).key;
  E.setForcedSeason(null);
  ok("E.seasonOf() suit le forçage, puis le relâche", forced === other && at === other && E.seasonOf().key === real, `${real} → ${forced} → ${E.seasonOf().key}`);
  ok("un forçage inconnu est ignoré", E.setForcedSeason("mousson") === null && E.seasonOf().key === real);
}

console.log("§10 — La faune sous l'averse");
{
  const tw = E.generateTownWorld();
  const fw = F.faunaWorld(tw);
  const T0 = Date.UTC(2026, 8, 26, 10, 0, 0);
  const DAY = C.DAY_REAL_MS;
  const RAIN_AT = T0 + DAY * 0.4;
  const env = (ms, stormAt) => F.faunaEnv({ nowMs: ms, dayStartAt: T0, day: 3, seasonKey: "summer",
    stormy: stormAt(ms), calm: stormAt(ms) ? 0 : 1, stormAt });
  const dry = () => false, wetLater = (ms) => ms >= RAIN_AT;
  const snap = (e) => {
    const m = new Map();
    for (const d of F.faunaDucks(fw, e)) m.set(d.id, ["duck", d.x, d.y]);
    for (const g of F.faunaGulls(fw, e)) m.set(g.id, ["gull", g.x, g.y - (g.alt || 0)]);
    for (const c of F.faunaCats(fw, e, tw)) m.set(c.id, ["cat", c.x, c.y]);
    return m;
  };
  // (1) Le passé n'est pas réécrit : avant l'averse, les bêtes sont où elles auraient été sans elle.
  let rewrite = 0, reads = 0;
  for (let ms = T0; ms < RAIN_AT - 60000; ms += 4000) {
    const a = snap(env(ms, dry)), b = snap(env(ms, wetLater));
    for (const [id, v] of a) { reads++; const w = b.get(id); if (!w || Math.hypot(w[1] - v[1], w[2] - v[2]) > 1e-9) rewrite++; }
  }
  ok("une averse à venir ne déplace personne avant son heure", rewrite === 0, `${rewrite} écarts sur ${reads} positions`);
  // (2) Aucun saut à l'arrivée de l'averse, image par image.
  const VMAX = { duck: 4.5, gull: 9, cat: 6.5 };
  const worst = { duck: 0, gull: 0, cat: 0 }, where = {};
  let prev = null, frames = 0;
  for (let ms = RAIN_AT - 90000; ms < RAIN_AT + 120000; ms += 1000 / 30) {
    const cur = snap(env(ms, wetLater));
    if (prev) for (const [id, [k, x, y]] of cur) {
      const p = prev.get(id); if (!p) continue;
      const v = Math.hypot(x - p[1], y - p[2]) * 30;
      if (v > worst[k]) { worst[k] = v; where[k] = id + " à " + ((ms - RAIN_AT) / 1000).toFixed(1) + " s"; }
    }
    prev = cur; frames++;
  }
  for (const k of Object.keys(VMAX)) ok(`${k} : pas de saut quand l'averse arrive (≤ ${VMAX[k]} cases/s)`, worst[k] <= VMAX[k], `pire ${worst[k].toFixed(2)} (${where[k] || "—"}), ${frames} images`);
  // (3) Et l'averse sert à quelque chose : les chats finissent à l'abri.
  const e2 = env(RAIN_AT + 240000, wetLater);
  const cats = F.faunaCats(fw, e2, tw);
  const sheltered = cats.filter((c) => fw.cats[c.idx].spots.some((s) => s.shelter && Math.hypot(s.x - c.x, s.y - c.y) < 1.5)).length;
  ok("quatre minutes après, les chats sont à l'abri", sheltered === cats.length, `${sheltered}/${cats.length}`);
  const B0 = F.faunaButterflies(fw, F.faunaEnv({ nowMs: T0 + DAY * 0.3, dayStartAt: T0, day: 3, seasonKey: "summer", calm: 1 }), { x0: 0, x1: tw.w, y0: 0, y1: tw.h }).length;
  const B5 = F.faunaButterflies(fw, F.faunaEnv({ nowMs: T0 + DAY * 0.3, dayStartAt: T0, day: 3, seasonKey: "summer", calm: 0.4 }), { x0: 0, x1: tw.w, y0: 0, y1: tw.h }).length;
  ok("les papillons s'effacent PEU À PEU quand l'averse monte", B5 > 0 && B5 < B0, `${B0} au calme, ${B5} à 40 %`);
}

/* 2026-09-29 — DEUX LIEUX (meteo.js § 3 bis). Guillaume : « cohérence ferme/ville,
   pas toujours simultanée (bien que fréquemment la même) ; s'il neige,
   synchroniser les deux » ; un jour sur cinq diffère. */
console.log("§11 — La ferme et la ville");
{
  const P = WX.PLACES;
  ok("deux lieux, et toute zone qui n'est pas la ferme est en ville", P.length === 2 && WX.placeOf("farm") === "farm"
     && ["town", "court", "evil", undefined, null].every((z) => WX.placeOf(z) === "town"));
  // (1) La ville n'a pas bougé d'un bit : son ciel est le ciel de référence.
  let townDiff = 0, reads = 0;
  for (const se of SEASONS) for (let d = 1; d <= 500; d++) for (let t = A; t <= B; t += 23) {
    reads++;
    if (JSON.stringify(WX.weatherAt(d, t, se, null, "town")) !== JSON.stringify(WX.weatherAt(d, t, se, null))) townDiff++;
  }
  ok("⚠️ la ville garde exactement son ciel d'avant (sans lieu = la ville)", townDiff === 0, `${townDiff} écarts sur ${reads} lectures`);
  // (2) La ferme est une pure fonction du jour et de la saison.
  let impure = 0;
  for (const se of SEASONS) for (let d = 1; d <= 300; d++) {
    const t = A + (d * 53) % (B - A);
    if (JSON.stringify(WX.weatherAt(d, t, se, null, "farm")) !== JSON.stringify(WX.weatherAt(d, t, se, null, "farm"))) impure++;
  }
  ok("deux « clients » tirent le même temps sur la ferme", impure === 0, `${impure} écarts`);
  // (3) La fréquence : un jour sur cinq hors neige, et chaque jour différent se VOIT.
  const DD = 4000;
  let diffDays = 0, nonSnow = 0, invisible = 0, oneWetOtherDry = 0;
  const forms = {};
  const isSnowDay = (d, se) => WX.dayWeather(d, se).eps.some((e) => WX.SNOW_KINDS.includes(e.kind));
  for (const se of SEASONS) for (let d = 1; d <= DD; d++) {
    if (isSnowDay(d, se)) continue;
    nonSnow++;
    const fw = WX.placeDayWeather(d, se, "farm");
    if (JSON.stringify(fw.eps) === JSON.stringify(WX.dayWeather(d, se).eps)) continue;
    diffDays++;
    forms[fw.form] = (forms[fw.form] || 0) + 1;
    let seen = false, split = false;
    for (let t = A; t <= B; t += 5) {
      const a = WX.weatherAt(d, t, se, null, "town"), b = WX.weatherAt(d, t, se, null, "farm");
      if (Math.abs(a.rain - b.rain) > 0.15 || Math.abs(a.dark - b.dark) > 0.12 || Math.abs(a.hail - b.hail) > 0.15 || Math.abs(a.bolts - b.bolts) > 0.2) seen = true;
      if ((a.rain > 0.2) !== (b.rain > 0.2)) split = true;
    }
    if (!seen) invisible++;
    if (split) oneWetOtherDry++;
  }
  const share = diffDays / nonSnow;
  /* ⚠️ Le chiffre est la DÉCISION de Guillaume (un jour sur cinq), écrit ici en clair :
     comparé à `WX.PLACE_SPLIT`, le contrôle suivait la constante au lieu de la tenir
     (falsifié à 0,35 : il restait vert). */
  ok("un jour sur cinq (hors neige), à ±3 points", Math.abs(share - 1 / 5) < 0.03, `${(100 * share).toFixed(1)} % de ${nonSnow} jours — ${JSON.stringify(forms)}`);
  ok("les quatre formes existent : front décalé, intensité voisine, temps propre, ciel", forms.shift > 0 && forms.neighbor > 0 && forms.own > 0 && forms.sky > 0);
  ok("⚠️ un jour « différent » se VOIT (pluie, ciel, grêle ou éclairs écartés à un moment)", invisible === 0, `${invisible} jours différents à l'écran identique sur ${diffDays}`);
  ok("⚠️ il pleut sur l'un et pas sur l'autre au même moment, certains jours", oneWetOtherDry > 0.3 * diffDays, `${oneWetOtherDry} jours sur ${diffDays}`);
  // ⚠️⚠️ Le même CLIMAT des deux côtés (le premier jet mouillait la ferme deux fois plus l'été).
  {
    const WETK = new Set(["shower", "rain", "storm", "hail"]), gaps = [];
    for (const se of SEASONS) {
      let t = 0, f = 0;
      for (let d = 1; d <= DD; d++) {
        if (WX.dayWeather(d, se).eps.some((e) => WETK.has(e.kind))) t++;
        if (WX.placeDayWeather(d, se, "farm").eps.some((e) => WETK.has(e.kind))) f++;
      }
      gaps.push(`${se} ${(100 * t / DD).toFixed(1)}/${(100 * f / DD).toFixed(1)} %`);
      if (Math.abs(t - f) / DD > 0.03) gaps.push("⚠️");
    }
    ok("⚠️⚠️ la ferme n'est pas plus pluvieuse que la ville (jours mouillés à ±3 points, par saison)", !gaps.includes("⚠️"), gaps.join(" · "));
  }
  // (4) ⚠️⚠️ LA NEIGE : identique au dixième de milliardième, à chaque instant, chaque jour.
  let snowDiff = 0, snowReads = 0, farmSnowAlone = 0, snowDays = 0;
  for (let d = 1; d <= DD; d++) {
    const snowy = isSnowDay(d, "winter");
    if (snowy) snowDays++;
    if (snowy && JSON.stringify(WX.placeDayWeather(d, "winter", "farm").eps) !== JSON.stringify(WX.dayWeather(d, "winter").eps)) snowDiff++;
    for (let t = A; t <= B; t += 17) {
      snowReads++;
      const a = WX.weatherAt(d, t, "winter", null, "town"), b = WX.weatherAt(d, t, "winter", null, "farm");
      if (Math.abs(a.snow - b.snow) > 1e-12 || Math.abs(a.flake - b.flake) > 1e-12) farmSnowAlone++;
    }
  }
  ok("⚠️⚠️ s'il neige, les deux lieux ont la MÊME journée, épisodes compris", snowDiff === 0, `${snowDiff} écarts sur ${snowDays} jours de neige`);
  ok("⚠️⚠️ …et jamais un flocon sur l'un sans l'autre, à aucun instant", farmSnowAlone === 0, `${farmSnowAlone} écarts sur ${snowReads} lectures d'hiver`);
  ok("hors hiver, la ferme ne tire jamais de neige", ["spring", "summer", "autumn"].every((se) => {
    for (let d = 1; d <= DD; d++) if (WX.placeDayWeather(d, se, "farm").eps.some((e) => WX.SNOW_KINDS.includes(e.kind))) return false;
    return true;
  }));
  // L'hiver, une divergence n'ajoute jamais de pluie (elle ferait fondre un seul des deux manteaux).
  let winterRain = 0;
  for (let d = 1; d <= DD; d++) {
    const fw = WX.placeDayWeather(d, "winter", "farm");
    if (fw.form !== "same" && fw.form && fw.eps.some((e) => e.kind === "rain" || e.kind === "shower" || e.kind === "storm")
        && !WX.dayWeather(d, "winter").eps.some((e) => e.kind === "rain")) winterRain++;
  }
  ok("⚠️ l'hiver, la ferme ne reçoit pas de pluie que la ville n'a pas", winterRain === 0, `${winterRain} jours`);
  // (5) La ferme suit les mêmes lois : aucun saut, zéro aux bouts, épisodes dans la journée.
  let worst = 0, edge = 0, late = 0;
  for (const se of SEASONS) for (let d = 1; d <= 600; d++) {
    for (const e of WX.placeDayWeather(d, se, "farm").eps) if (e.t0 < A || e.t0 + e.rise + e.hold + e.fall > B - 9.99) late++;
    let prev = WX.weatherAt(d, A, se, null, "farm");
    for (const c of WX.CHANNELS) if (prev[c] > 1e-6) edge++;
    for (let t = A + 0.25; t <= B; t += 0.25) {
      const w = WX.weatherAt(d, t, se, null, "farm");
      for (const c of WX.CHANNELS) worst = Math.max(worst, Math.abs(w[c] - prev[c]));
      prev = w;
    }
    for (const c of WX.CHANNELS) if (prev[c] > 1e-6) edge++;
  }
  ok("ferme : aucun saut, zéro aux deux bouts, chaque épisode dans sa journée", worst <= 0.06 && edge === 0 && late === 0, `pire pas ${worst.toFixed(3)}, ${edge} bouts non nuls, ${late} épisodes débordants`);
  // (6) Le forçage vaut pour les deux lieux.
  let fdiff = 0;
  for (let d = 1; d < 200; d++) for (const kind of WX.WX_KINDS) {
    const f = { day: d, kind, at: 10 * 60 };
    for (const t of [10 * 60 + WX.FORCE_BLEND + 1, 15 * 60, B]) if (JSON.stringify(WX.weatherAt(d, t, "autumn", f, "farm")) !== JSON.stringify(WX.weatherAt(d, t, "autumn", f, "town"))) fdiff++;
  }
  ok("⚠️ une météo commandée au menu dev tombe sur les deux lieux", fdiff === 0, `${fdiff} écarts`);
  // (7) La prévision du matin lit le lieu.
  let fcDiff = 0;
  for (let d = 1; d <= 600; d++) if (JSON.stringify(WX.forecast(d, "autumn", "farm")) !== JSON.stringify(WX.forecast(d, "autumn"))) fcDiff++;
  ok("la prévision de la ferme diffère parfois de celle de la ville", fcDiff > 0, `${fcDiff} jours d'automne sur 600`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2026-10-05 — LA FIN DE SAISON (meteo.js § 0 bis), LA TEMPÉRATURE (§ 9), LA GELÉE (§ 10).
   ═══════════════════════════════════════════════════════════════════════════ */
console.log("§12 — La fin de saison : l'hiver qui s'adoucit, l'automne qui annonce l'hiver");
{
  /* (1) HORS FIN DE SAISON, RIEN N'A BOUGÉ D'UN BIT : l'empreinte des tirages, des deux
     lieux, des prévisions et des canaux, calculée avec le `meteo.js` d'AVANT la fin de
     saison (commit « patins bonhomme ») et recalculée ici. Falsifié : un poids d'odds
     déplacé d'une unité la change. */
  const { createHash } = await import("crypto");
  const h = createHash("sha256");
  for (const se of SEASONS) for (let d = 1; d <= 2000; d++) {
    h.update(JSON.stringify(WX.dayWeather(d, se))); h.update(JSON.stringify(WX.placeDayWeather(d, se, "farm"))); h.update(JSON.stringify(WX.forecast(d, se, "farm")));
    for (let t = A; t < B; t += 97) { h.update(JSON.stringify(WX.weatherAt(d, t, se, null, "town"))); h.update(JSON.stringify(WX.weatherAt(d, t, se, null, "farm"))); }
  }
  const fp = h.digest("hex").slice(0, 16);
  ok("⚠️ au cœur des saisons, le ciel est celui d'avant, au bit près", fp === "07145d00d582717b", `empreinte ${fp}`);
  // (2) L'étiquette : la clé seule avant la fin, 12 crans ensuite, et seulement l'hiver et l'automne.
  const tags = [0.2, 0.54, 0.55, 0.7, 0.999].map((p) => WX.seasonTag("winter", p));
  ok("l'étiquette : la clé au cœur de la saison, un cran ensuite", tags[0] === "winter" && tags[1] === "winter" && tags[2] === "winter~1" && tags[4] === "winter~12" && WX.seasonTag("summer", 0.99) === "summer" && WX.seasonTag("spring", 0.99) === "spring", tags.join(" "));
  ok("seasonBase / seasonLate relisent l'étiquette", WX.seasonBase("autumn~7") === "autumn" && WX.seasonLate("winter") === 0 && WX.seasonLate("winter~12") > 0.95 && WX.seasonLate("winter~1") < 0.02);
  // (3) Les chances, mesurées : moins de neige et plus de soleil à la fin de l'hiver ; pas de neige à la fin de l'automne.
  const stats = (tag) => {
    let snow = 0, gib = 0, gibEps = 0, wind = 0, rain = 0, sunny = 0, mins = 0, snowEp = 0;
    for (let d = 1; d <= 3000; d++) {
      const eps = WX.dayWeather(d, tag).eps, k = eps[0] ? eps[0].kind : "clear";
      if (WX.SNOW_KINDS.includes(k)) snow++;
      if (eps.some((e) => WX.SNOW_KINDS.includes(e.kind))) snowEp++;
      if (k === "giboulee") { gib++; gibEps += eps.length; }
      if (k === "windy") wind++;
      if (k === "rain") rain++;
      if (d <= 300) for (let t = A; t < B; t += 10) { const w = WX.weatherAt(d, t, tag, null); mins++; if (w.dark < 0.25 && w.rain < 0.05 && w.snow < 0.05) sunny++; }
    }
    return { snow: snow / 30, gib: gib / 30, perDay: gib ? gibEps / gib : 0, wind: wind / 30, rain: rain / 30, sunny: 100 * sunny / mins, snowEp };
  };
  const w0 = stats("winter"), w9 = stats(WX.seasonTag("winter", 0.97)), a0 = stats("autumn"), a9 = stats(WX.seasonTag("autumn", 0.97));
  /* ⚠️ 2026-10-05, ajustement de Guillaume : « garder des chutes de neige pas trop rares jusqu'à
     samedi soir et dimanche matin — diminuer leur occurrence mais surtout leur intensité ».
     Samedi 20 h (heure de Paris) ≈ 83 % de la saison, dimanche 10 h ≈ 91 %. */
  const wSat = stats(WX.seasonTag("winter", 0.83)), wSun = stats(WX.seasonTag("winter", 0.91));
  ok("fin d'hiver : la neige reste fréquente jusqu'au dimanche matin, mais moins qu'au cœur de l'hiver", wSat.snow >= 22 && wSun.snow >= 18 && w9.snow < w0.snow * 0.6, `${w0.snow.toFixed(1)} % → samedi soir ${wSat.snow.toFixed(1)} %, dimanche matin ${wSun.snow.toFixed(1)} %, fin ${w9.snow.toFixed(1)} % des jours`);
  const snowPeak = (tag) => { let s = 0, k = 0, mx = 0; for (let d = 1; d <= 3000; d++) for (const e of WX.dayWeather(d, tag).eps) if (WX.SNOW_KINDS.includes(e.kind)) { s += e.p.snow; k++; mx = Math.max(mx, e.p.snow); } return { mean: s / k, max: mx }; };
  const pk0 = snowPeak("winter"), pkSat = snowPeak(WX.seasonTag("winter", 0.83)), pkSun = snowPeak(WX.seasonTag("winter", 0.91));
  ok("fin d'hiver : SURTOUT des chutes moins fortes (intensité moyenne et plus forte chute)", pkSat.mean < pk0.mean * 0.65 && pkSun.mean < pk0.mean * 0.5 && pkSun.max < 0.6, `moyenne ${pk0.mean.toFixed(2)} → ${pkSat.mean.toFixed(2)} (samedi soir) → ${pkSun.mean.toFixed(2)} (dimanche matin), la plus forte ${pk0.max.toFixed(2)} → ${pkSun.max.toFixed(2)}`);
  ok("fin d'hiver : surtout du soleil (≥ 85 % du temps sans pluie ni ciel gris)", w9.sunny >= 85 && w9.sunny > w0.sunny, `${w0.sunny.toFixed(0)} % → ${w9.sunny.toFixed(0)} %`);
  ok("fin d'hiver : des journées de giboulées, deux à trois averses chacune", w9.gib > 25 && w9.perDay >= 2 && w9.perDay <= 3, `${w9.gib.toFixed(1)} % des jours, ${w9.perDay.toFixed(2)} averses par journée`);
  ok("⚠️ fin d'automne : pas une seule chute de neige", a9.snowEp === 0 && WX.placeDayWeather(1, WX.seasonTag("autumn", 0.97), "farm") && (() => { for (let d = 1; d <= 3000; d++) if (WX.placeDayWeather(d, WX.seasonTag("autumn", 0.97), "farm").eps.some((e) => WX.SNOW_KINDS.includes(e.kind))) return false; return true; })(), `${a9.snowEp} jours`);
  ok("fin d'automne : des coups de vent, moins de pluies de fond", a9.wind > 10 && a9.rain < a0.rain * 0.6, `vent ${a0.wind.toFixed(1)} % → ${a9.wind.toFixed(1)} %, pluie ${a0.rain.toFixed(1)} % → ${a9.rain.toFixed(1)} %`);
  // (4) La giboulée reste une giboulée : brève, sous un ciel clair, sans saut ; et commandée, une série.
  let gWorst = 0, gDark = 0, gLate = 0, gN = 0;
  const gTag = WX.seasonTag("winter", 0.97);
  for (let d = 1; d <= 1500; d++) {
    const eps = WX.dayWeather(d, gTag).eps;
    if (!eps.length || eps[0].kind !== "giboulee") continue;
    gN++;
    for (const e of eps) { if (e.t0 + e.rise + e.hold + e.fall > B - 9.99) gLate++; gDark = Math.max(gDark, e.p.dark); }
    let prev = WX.weatherAt(d, A, gTag, null);
    for (let t = A + 0.25; t <= B; t += 0.25) { const w = WX.weatherAt(d, t, gTag, null); for (const c of WX.CHANNELS) gWorst = Math.max(gWorst, Math.abs(w[c] - prev[c])); prev = w; }
  }
  ok("la giboulée : ciel clair (dark ≤ 0,2), aucun saut, dans la journée", gN > 100 && gDark <= 0.2 && gWorst <= 0.06 && gLate === 0, `${gN} journées, dark max ${gDark.toFixed(2)}, pire pas ${gWorst.toFixed(3)}, ${gLate} débordantes`);
  const fg = { day: 9, kind: "giboulee", at: 9 * 60 };
  let wet = 0, dry = 0;
  for (let t = 9 * 60 + 60; t < 20 * 60; t += 5) { const w = WX.weatherAt(9, t, "winter", fg); if (w.rain > 0.2) wet++; else if (w.rain < 0.02) dry++; }
  ok("une giboulée commandée alterne averses et éclaircies jusqu'au soir", wet > 10 && dry > 30, `${wet} relevés sous l'averse, ${dry} au sec`);
  // (5) Le manteau de la fin d'hiver : plus mince que celui du cœur de l'hiver (un hiver joué d'un bout à l'autre).
  const PER = Math.round(C.SEASON_REAL_MS / C.DAY_REAL_MS), W0 = 20000;
  const tagOf = (late) => (d) => { const p = (d - W0) / PER; return p < 0 ? "autumn" : p >= 1 ? "spring" : late ? WX.seasonTag("winter", p) : "winter"; };
  const meanG = (late, p0, p1) => { let s = 0, k = 0; for (let d = W0 + Math.floor(PER * p0); d < W0 + PER * p1; d += 3) { s += NG.snowPack(d, 13 * 60, tagOf(late), null, "town").g; k++; } return s / k; };
  const gMid = meanG(true, 0.2, 0.5), gEnd = meanG(true, 0.8, 1), gEndOld = meanG(false, 0.8, 1);
  ok("fin d'hiver : la neige recule (manteau de midi des 20 derniers %)", gEnd < 0.25 * gMid && gEnd < gEndOld, `cœur ${gMid.toFixed(1)} cm, fin ${gEnd.toFixed(2)} cm (sans fin de saison : ${gEndOld.toFixed(1)} cm)`);
}

console.log("§13 — La température et la gelée blanche");
{
  const idx = { spring: 0, summer: 1, autumn: 2, winter: 3 };
  // (1) Continue d'une saison à l'autre.
  let jump = 0;
  for (const ph of [0, 1, 2, 3]) jump = Math.max(jump, Math.abs(WX.yearMeanAt(ph - 1e-4) - WX.yearMeanAt(ph + 1e-4)));
  ok("la moyenne de l'année ne saute pas aux bascules", jump < 0.01, `pire saut ${jump.toFixed(4)} °C`);
  // (2) Par moment de l'année : le petit matin et l'après-midi, sur la météo réelle de l'étiquette.
  const range = (se, p, place) => {
    const tag = WX.seasonTag(se, p), ph = idx[se] + p, lo = [], hi = [];
    let frostDays = 0, frost11 = 0, frost12sun = 0;
    for (let d = 1; d <= 400; d++) {
      let a = 99, b = -99, f = false;
      const Wd = WX.weatherAt(d, A, tag, null, place);
      for (let t = A; t < B; t += 15) {
        const W = WX.weatherAt(d, t, tag, null, place), hr = t / 60, T = WX.temperatureAt(ph, hr, W, place, d);
        if (hr <= 10) a = Math.min(a, T); if (hr >= 12 && hr <= 17) b = Math.max(b, T);
        const fr = WX.frostOf(T, NG.sunAt(hr, tag), W, Wd, hr);
        if (hr < 10 && fr.shade > 0.15) f = true;
        if (Math.abs(hr - 11) < 1e-6 && fr.shade > 0.15) frost11++;
        if (Math.abs(hr - 12) < 1e-6 && fr.sun > 0.15) frost12sun++;
      }
      lo.push(a); hi.push(b); if (f) frostDays++;
    }
    const avg = (v) => v.reduce((s, x) => s + x, 0) / v.length;
    return { lo: avg(lo), hi: avg(hi), frost: frostDays / 4, frost11: frost11 / 4, frost12sun: frost12sun / 4 };
  };
  const rows = [["spring", 0.5], ["summer", 0.5], ["autumn", 0.5], ["autumn", 0.9], ["winter", 0.4], ["winter", 0.92]].map(([se, p]) => ({ se, p, ...range(se, p, "town") }));
  for (const r of rows) console.log(`        ${r.se} à ${Math.round(r.p * 100)} % : matin ${r.lo.toFixed(1)} °C, après-midi ${r.hi.toFixed(1)} °C, gelée ${r.frost.toFixed(0)} % des matins (à l'ombre à 11 h : ${r.frost11.toFixed(0)} %, au soleil à midi : ${r.frost12sun.toFixed(0)} %)`);
  const R = (se, p) => rows.find((r) => r.se === se && r.p === p);
  ok("l'été est chaud sans canicule permanente, l'hiver gèle", R("summer", 0.5).hi > 22 && R("summer", 0.5).hi < 28 && R("winter", 0.4).lo < -4, `été ${R("summer", 0.5).hi.toFixed(1)} °C l'après-midi, hiver ${R("winter", 0.4).lo.toFixed(1)} °C au matin`);
  ok("la fin de l'hiver est plus douce que son cœur (et l'après-midi dégèle)", R("winter", 0.92).hi > R("winter", 0.4).hi + 4 && R("winter", 0.92).hi > 4, `${R("winter", 0.4).hi.toFixed(1)} → ${R("winter", 0.92).hi.toFixed(1)} °C l'après-midi`);
  ok("⚠️ fin d'automne : une gelée au petit matin la plupart des jours, plus jamais au milieu de l'automne", R("autumn", 0.9).frost > 50 && R("autumn", 0.5).frost === 0, `${R("autumn", 0.5).frost.toFixed(0)} % → ${R("autumn", 0.9).frost.toFixed(0)} % des matins`);
  ok("⚠️ …et elle fond vite en fin de matinée (soleil à midi : ~jamais ; ombre à 11 h : rare)", R("autumn", 0.9).frost12sun < 2 && R("autumn", 0.9).frost11 < 15, `soleil à midi ${R("autumn", 0.9).frost12sun.toFixed(1)} %, ombre à 11 h ${R("autumn", 0.9).frost11.toFixed(1)} %`);
  // (3) Ce que le ciel impose.
  let snowWarm = 0, rainFrozen = 0, reads = 0;
  for (let d = 1; d <= 600; d++) for (let t = A; t < B; t += 20) {
    const W = WX.weatherAt(d, t, "winter", null), T = WX.temperatureAt(3.3, t / 60, W, "town", d); reads++;
    if (W.snow > 0.15 && T > 0.6) snowWarm++;
    if (W.rain > 0.15 && T < 0.8) rainFrozen++;
  }
  ok("il neige ⇒ 0,5 °C au plus ; il pleut ⇒ il ne gèle pas", snowWarm === 0 && rainFrozen === 0, `${snowWarm} neiges tièdes, ${rainFrozen} pluies sous zéro, ${reads} relevés`);
  // (4) La ferme, en rase campagne, est plus froide au petit matin (c'est là que la gelée prend le mieux).
  const Wc = { rain: 0, snow: 0, hail: 0, dark: 0, bolts: 0, near: 0, wind: 0, flake: 0 };
  ok("la ferme perd un degré de plus au petit matin, pas l'après-midi", WX.temperatureAt(2.9, 7, Wc, "farm", 5) < WX.temperatureAt(2.9, 7, Wc, "town", 5) - 0.5 && WX.temperatureAt(2.9, 15, Wc, "farm", 5) === WX.temperatureAt(2.9, 15, Wc, "town", 5));
  // (5) L'affichage : un entier, jamais « −0 ».
  ok("l'affichage arrondit sans « −0 »", Object.is(WX.tempRound(-0.3), 0) && WX.tempRound(-0.6) === -1 && WX.tempRound(4.5) === 5);
  // (6) Le moteur : l'étiquette et la phase suivent le forçage partagé de l'avancée.
  E.setForcedSeason("winter"); E.setForcedSeasonProgress(0.9);
  const tg = E.seasonTagAt(Date.now()), ph = E.seasonPhaseAt(Date.now());
  E.setForcedSeasonProgress(null); E.setForcedSeason(null);
  ok("le moteur : saison et avancée forcées ⇒ étiquette et phase", tg === WX.seasonTag("winter", 0.9) && Math.abs(ph - 3.9) < 1e-9 && E.setForcedSeasonProgress(1.2) === null, `${tg}, phase ${ph}`);
}

console.log(`\nverify-meteo : ${n - fail}/${n}`);
process.exit(fail ? 1 : 0);
