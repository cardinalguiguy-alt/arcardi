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
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "meteo", "lumiere", "faune"]);
const C = mods.fermeConstants, E = mods.fermeEngine, WX = mods.meteo, LM = mods.lumiere, F = mods.faune;

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

console.log(`\nverify-meteo : ${n - fail}/${n}`);
process.exit(fail ? 1 : 0);
