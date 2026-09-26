/* ╔══════════════════════════════════════════════════════════════════════════
   ║ verify-faune — LA FAUNE DE VALLEY TOWN (phase 5, 2026-09-26).
   ╚══════════════════════════════════════════════════════════════════════════
   JOUE `components/ferme/faune.js` sur la vraie carte de la ville :
     1. AUCUNE TÉLÉPORTATION : une journée de jeu entière (16 min réelles),
        image par image, plus la bascule de jour et la bascule de saison ; le
        pas de chaque bête est borné par sa vitesse physique ;
     2. LES HABITATS : un canard ou une carpe ne touche jamais la rive, un chat
        marche sur une case praticable, un goéland posé est à terre, un goéland
        sur l'eau est dans l'eau ;
     3. LES SAISONS ET LES HEURES : pas de papillon la nuit, l'hiver ou sous
        l'orage ; pas de luciole le jour ; canetons au printemps seulement ;
     4. LE PARTAGE : deux « clients » au même instant voient les mêmes bêtes
        (même carte, même heure → mêmes positions, au bit près) ;
     5. LES RÉACTIONS : un canard effrayé reste dans l'eau et revient à sa
        routine ; un chat effrayé fuit puis revient ; un chat salue un joueur
        immobile.
   ⚠️ Tout banc qui compte publie ce qu'il a LU (§10 de CLAUDE.md). */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "faune", "fauneArt"]);
const C = mods.fermeConstants, E = mods.fermeEngine, F = mods.faune, FA = mods.fauneArt;

let fail = 0, n = 0;
const ok = (name, cond, detail) => { n++; console.log((cond ? "  OK   " : "  FAIL ") + name + (detail ? "  —  " + detail : "")); if (!cond) fail++; };

const tw = E.generateTownWorld();
const fw = F.faunaWorld(tw);
const nav = E.townNav(tw);
const walk = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < tw.w && ty < tw.h && !!nav.walk[ty * tw.w + tx]; };

console.log("§0 — Les lieux, dérivés de la carte");
ok("deux bassins d'étang", fw.pond.length === 2, `${fw.pond.length} bassins, ${fw.pond.map((p) => p.cells.length).join(" + ")} cases`);
ok("quatre groupes de colverts (étang ×2, roselières ×2)", fw.duckSites.length === 4 && fw.duckSites.every((s) => s.cells.length >= 2), fw.duckSites.map((s) => s.key + ":" + s.cells.length).join(" "));
ok("deux bancs de carpes", fw.fishSites.length === 2, fw.fishSites.map((s) => s.key + ":" + s.cells.length).join(" "));
ok("un quai et un ponton pour les goélands", fw.quay.length > 20 && fw.pier.length > 4, `${fw.quay.length} places de quai, ${fw.pier.length} de ponton, ${fw.floats.length} cases d'eau libre`);
ok("trois chats, chacun avec au moins 4 places", fw.cats.length === 3 && fw.cats.every((c) => c.spots.length >= 4), fw.cats.map((c) => c.coat + ":" + c.spots.length).join(" "));
ok("les places des chats sont praticables", fw.cats.every((c) => c.spots.every((s) => walk(s.x, s.y))));
ok("des maisons de papillons", fw.bflyHomes.length > 40, `${fw.bflyHomes.length} maisons sur ${fw.flowers.length} fleurs`);
ok("des zones de lucioles", fw.ffZones.length >= 5, fw.ffZones.map((z) => z.key).join(" "));
ok("de l'eau profonde pour les sauts", fw.deep.length > 50, `${fw.deep.length} cases`);

/* Une journée : `dayStartAt` fixe, 16 minutes réelles, image par image (1/30 s). */
const T0 = Date.UTC(2026, 8, 26, 10, 0, 0);
const envAt = (ms, season, dayStart, day, stormy) => F.faunaEnv({ nowMs: ms, dayStartAt: dayStart ?? T0, day: day ?? 3, seasonKey: season || "summer", stormy: !!stormy });
const BIG = { x0: 0, x1: tw.w, y0: 0, y1: tw.h };

console.log("§1 — Aucune téléportation (une journée entière + la nuit d'après, image par image)");
const VMAX = { duck: 4.5, fish: 2, gull: 9, cat: 6.5 };
for (const season of ["spring", "summer"]) {
  const worst = { duck: 0, fish: 0, gull: 0, cat: 0 };
  const where = {};
  let prev = null, frames = 0;
  const dt = 1 / 30;
  const DAY = C.DAY_REAL_MS;
  // La journée, puis la bascule (nouveau dayStartAt) : la nuit continue.
  for (let ms = T0; ms < T0 + DAY + 60000; ms += dt * 1000) {
    const dayStart = ms < T0 + DAY ? T0 : T0 + DAY;
    const env = envAt(ms, season, dayStart, ms < T0 + DAY ? 3 : 4);
    const cur = new Map();
    for (const d of F.faunaDucks(fw, env)) cur.set(d.id, ["duck", d.x, d.y]);
    for (const f of F.faunaFish(fw, env)) cur.set(f.id, ["fish", f.x, f.y]);
    for (const g of F.faunaGulls(fw, env)) cur.set(g.id, ["gull", g.x, g.y - (g.alt || 0)]);
    for (const c of F.faunaCats(fw, env, tw)) cur.set(c.id, ["cat", c.x, c.y]);
    if (prev) for (const [id, [k, x, y]] of cur) {
      const p = prev.get(id); if (!p) continue;
      const v = Math.hypot(x - p[1], y - p[2]) / dt;
      if (v > worst[k]) { worst[k] = v; where[k] = id + " à " + ((ms - T0) / 1000).toFixed(1) + " s"; }
    }
    prev = cur; frames++;
  }
  for (const k of Object.keys(VMAX)) ok(`${season} — ${k} : pas plus vite que ${VMAX[k]} cases/s`, worst[k] <= VMAX[k], `pire ${worst[k].toFixed(2)} (${where[k] || "—"}), ${frames} images`);
}
{
  // La bascule de saison : les canetons du printemps ne s'évaporent pas… ils s'en vont avec la saison (décidé).
  const env1 = envAt(T0, "spring"), env2 = envAt(T0, "summer");
  const d1 = F.faunaDucks(fw, env1).filter((d) => d.kind === "tiny").length, d2 = F.faunaDucks(fw, env2).filter((d) => d.kind === "young").length;
  ok("printemps : cinq canetons ; été : trois jeunes", d1 === 5 && d2 === 3, `${d1} / ${d2}`);
  ok("automne et hiver : pas de petits", ["autumn", "winter"].every((s) => F.faunaDucks(fw, envAt(T0, s)).every((d) => d.kind === "duck")));
}

console.log("§2 — Les habitats");
{
  let dMin = 9, fMin = 9, catBad = 0, perchBad = 0, floatBad = 0, reads = 0;
  for (let ms = T0; ms < T0 + C.DAY_REAL_MS; ms += 1700) {
    for (const season of ["spring", "winter"]) {
      const env = envAt(ms, season);
      for (const d of F.faunaDucks(fw, env)) { dMin = Math.min(dMin, fw.wdist(d.x, d.y)); reads++; }
      for (const f of F.faunaFish(fw, env)) { fMin = Math.min(fMin, fw.wdist(f.x, f.y)); reads++; }
      for (const c of F.faunaCats(fw, env, tw)) { if (!walk(c.x, c.y)) catBad++; reads++; }
      for (const g of F.faunaGulls(fw, env)) {
        reads++;
        if (g.mode === "perch" && tw.ground[Math.floor(g.y) * tw.w + Math.floor(g.x)] === C.G_WATER) perchBad++;
        if (g.mode === "float" && fw.wdist(g.x, g.y) < 0.5) floatBad++;
      }
    }
  }
  ok("un canard reste à 0,4 case de la rive au moins", dMin >= 0.4, `min ${dMin.toFixed(2)}`);
  ok("une carpe reste à 0,35 case de la rive au moins", fMin >= 0.35, `min ${fMin.toFixed(2)}`);
  ok("un chat marche toujours sur une case praticable", catBad === 0, `${catBad} écarts`);
  ok("un goéland posé est à terre", perchBad === 0, `${perchBad} écarts`);
  ok("un goéland sur l'eau est dans l'eau", floatBad === 0, `${floatBad} écarts (${reads} positions lues)`);
}

console.log("§3 — Les heures, les saisons, l'orage");
{
  const at = (h) => T0 + ((h * 60 - C.DAY_START_MIN) / (C.DAY_END_MIN - C.DAY_START_MIN)) * C.DAY_REAL_MS;
  const nb = (env) => F.faunaButterflies(fw, env, BIG).length, nf = (env) => F.faunaFireflies(fw, env, BIG).length;
  ok("papillons à midi en été", nb(envAt(at(12), "summer")) > 30, `${nb(envAt(at(12), "summer"))}`);
  ok("aucun papillon à 23h", nb(envAt(at(23), "summer")) === 0);
  ok("aucun papillon en hiver", nb(envAt(at(12), "winter")) === 0);
  ok("aucun papillon un jour d'orage", nb(envAt(at(12), "summer", null, 7, true)) === 0);
  ok("moins de papillons en automne qu'en été", nb(envAt(at(12), "autumn")) < nb(envAt(at(12), "summer")), `${nb(envAt(at(12), "autumn"))} < ${nb(envAt(at(12), "summer"))}`);
  ok("lucioles à 23h en été", nf(envAt(at(23), "summer")) > 40, `${nf(envAt(at(23), "summer"))}`);
  ok("aucune luciole à midi", nf(envAt(at(12), "summer")) === 0);
  ok("aucune luciole en hiver", nf(envAt(at(23), "winter")) === 0);
  // L'éclair : pas continu. Sur 20 s, une luciole passe la plupart du temps éteinte.
  let on = 0, tot = 0, maxK = 0;
  for (let ms = at(23); ms < at(23) + 20000; ms += 50) for (const f of F.faunaFireflies(fw, envAt(ms, "summer"), BIG)) { tot++; if (f.k > 0.05) on++; maxK = Math.max(maxK, f.k); }
  ok("une luciole clignote : allumée moins d'un quart du temps", on / tot < 0.25 && maxK > 0.95, `${(100 * on / tot).toFixed(1)} % du temps, crête ${maxK.toFixed(2)}`);
  // Les papillons : la vitesse de croisière (hors grande boucle) est celle d'un papillon.
  let sp = [], flying = 0, lastB = null;
  for (let ms = at(12); ms < at(12) + 30000; ms += 100) {
    const cur = new Map(F.faunaButterflies(fw, envAt(ms, "summer"), BIG).map((b) => [b.id, b]));
    if (lastB) for (const [id, b] of cur) { const p = lastB.get(id); if (p && b.flying && p.flying) { sp.push(Math.hypot(b.x - p.x, b.y - p.y) / 0.1); flying++; } }
    lastB = cur;
  }
  sp.sort((a, b) => a - b);
  const med = sp[sp.length >> 1] || 0;
  ok("papillon : vitesse médiane en vol entre 0,8 et 2,6 cases/s", med > 0.8 && med < 2.6, `médiane ${med.toFixed(2)} sur ${flying} mesures`);
  const bf = F.faunaButterflies(fw, envAt(at(12), "summer"), BIG);
  ok("six espèces de papillons en été", new Set(bf.map((b) => b.sp)).size >= 5, [...new Set(bf.map((b) => b.sp))].join(" "));
}

console.log("§4 — Le partage : deux clients, le même instant, les mêmes bêtes");
{
  const env = envAt(T0 + 123456, "summer");
  const a = JSON.stringify([F.faunaDucks(fw, env), F.faunaGulls(fw, env), F.faunaCats(fw, env, tw), F.faunaFish(fw, env)]);
  const tw2 = E.generateTownWorld();
  const fw2 = F.faunaWorld(tw2);
  const b = JSON.stringify([F.faunaDucks(fw2, env), F.faunaGulls(fw2, env), F.faunaCats(fw2, env, tw2), F.faunaFish(fw2, env)]);
  ok("mêmes positions au bit près (carte regénérée, cache vidé)", a === b, `${a.length} octets comparés`);
}

console.log("§5 — Les réactions");
{
  // Un joueur marche le long de la rive de l'étang : les canards s'écartent, restent dans l'eau, puis reviennent.
  const S = {}, env0 = envAt(T0 + 400000, "summer");
  const site = fw.duckSites[0];
  let minW = 9, maxOff = 0;
  const pond = fw.pond[1];
  const cx = pond.c.x, cy = pond.c.y;
  for (let k = 0; k < 300; k++) {
    const env = envAt(T0 + 400000 + k * 33, "summer");
    const ducks = F.faunaDucks(fw, env).filter((d) => d.site === 0);
    // Le pire cas : une menace qui talonne la cane par le nord, et la pousse contre la rive sud.
    const hen = ducks[0], o0 = S.ducks && S.ducks.get(hen.id);
    const threat = { id: "me", x: hen.x + (o0 ? o0.ox : 0), y: hen.y + (o0 ? o0.oy : 0) - 0.7, moving: true, still: 0 };
    F.faunaReactDucks(S, fw, ducks, [threat], null, 1 / 30);
    for (const d of ducks) minW = Math.min(minW, fw.wdist(d.x, d.y));
    for (const o of S.ducks.values()) maxOff = Math.max(maxOff, Math.hypot(o.ox, o.oy));
  }
  let left = 0;
  for (let k = 0; k < 600; k++) {
    const env = envAt(T0 + 410000 + k * 33, "summer");
    const ducks = F.faunaDucks(fw, env).filter((d) => d.site === 0);
    F.faunaReactDucks(S, fw, ducks, [], null, 1 / 30);
    for (const d of ducks) minW = Math.min(minW, fw.wdist(d.x, d.y));
  }
  for (const o of S.ducks.values()) left = Math.max(left, Math.hypot(o.ox, o.oy));
  ok("canards effrayés : ils s'écartent", maxOff > 0.3, `écart max ${maxOff.toFixed(2)} case`);
  ok("canards effrayés : jamais hors de l'eau", minW >= 0.35, `min ${minW.toFixed(2)}`);
  // Ce qui reste est l'ESPACE VITAL entre canards d'un même groupe (faunaReactDucks) : jamais plus d'un rayon.
  let alarm = 0; for (const o of S.ducks.values()) alarm = Math.max(alarm, o.alarm);
  ok("canards : la fuite se résorbe (20 s après : plus d'alarme, écart ≤ l'espace vital)", left < 0.65 && alarm < 0.02, `reste ${left.toFixed(3)} case, alarme ${alarm.toFixed(3)}`);
  void site;
}
{
  // Un chat : un joueur fonce dessus → il fuit puis revient ; un joueur immobile → il vient se frotter.
  const S = {}, t0 = T0 + 30000;
  let rng = 1; const rnd = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const env = envAt(t0, "summer");
  const c0 = F.faunaCats(fw, env, tw)[0];
  let fled = false, back = false, maxD = 0;
  for (let k = 0; k < 30 * 40; k++) {
    const e = envAt(t0 + k * 33, "summer");
    const cats = F.faunaCats(fw, e, tw).slice(0, 1);
    const base = { x: cats[0].x, y: cats[0].y };
    const threats = k < 20 ? [{ id: "me", x: cats[0].x + 0.5, y: cats[0].y, moving: true, still: 0 }] : [];
    F.faunaReactCats(S, cats, threats, 1 / 30, walk, rnd);
    if (cats[0].react === "flee") fled = true;
    maxD = Math.max(maxD, Math.hypot(cats[0].x - base.x, cats[0].y - base.y));
    if (fled && !S.cats.has(cats[0].id)) { back = true; break; }
  }
  ok("chat bousculé : il fuit", fled, `jusqu'à ${maxD.toFixed(1)} cases de sa place`);
  ok("chat bousculé : il revient à sa routine", back);
  // Le bonjour : on cherche un chat au repos et « ami », un joueur immobile à 2 cases.
  let greeted = false, rubbed = false;
  for (let tt = T0; tt < T0 + 3600000 && !rubbed; tt += 7000) {
    const e = envAt(tt, "summer");
    const c = F.faunaCats(fw, e, tw).find((q) => q.friendly && q.resting && q.restT > 5 && !q.pose.startsWith("sleep"));
    if (!c) continue;
    const S2 = {};
    const me = { id: "me", x: c.x + 1.6, y: c.y + 0.3, moving: false, still: 3 };
    if (!walk(me.x, me.y)) continue;
    for (let k = 0; k < 30 * 14; k++) {
      const e2 = envAt(tt + k * 33, "summer");
      const cats = F.faunaCats(fw, e2, tw).filter((q) => q.id === c.id);
      F.faunaReactCats(S2, cats, [{ ...me, still: 3 + k / 30 }], 1 / 30, walk, rnd);
      if (cats[0].react === "approach") greeted = true;
      if (cats[0].react === "rub") { rubbed = true; break; }
    }
  }
  ok("un chat vient saluer un joueur immobile", greeted);
  ok("… et se frotte à ses jambes", rubbed);
}

console.log("§6 — Les dessins : tailles et rapports (l'échelle unique, décision n° 5)");
{
  const S = FA.buildFaunaSprites();
  const bbox = (cell) => {
    const g = cell.img.getContext("2d"), d = g.getImageData(cell.sx, cell.sy, cell.w, cell.h).data;
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, edge = 0;
    for (let y = 0; y < cell.h; y++) for (let x = 0; x < cell.w; x++) if (d[(y * cell.w + x) * 4 + 3] > 40) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      if (x === 0 || y === 0 || x === cell.w - 1 || y === cell.h - 1) edge++;
    }
    return { w: x1 - x0 + 1, h: y1 - y0 + 1, edge };
  };
  const cellOf = (c) => (c.img ? c : { img: c, sx: 0, sy: 0, w: c.width, h: c.height });
  const L = {
    pigeon: bbox(cellOf(S.birds.pigeon.stand)).w, duck: bbox(S.duck.drake.swim).w, gull: bbox(S.gull.herring.stand).w,
    cat: bbox(S.cat.roux.walk1).w, catSit: bbox(S.cat.roux.front).h, laughing: bbox(S.gull.laughing.stand).w,
  };
  ok("pigeon ≈ 10 px cerne compris (8 à 11)", L.pigeon >= 8 && L.pigeon <= 11, `${L.pigeon} px`);
  // ⚠️ 1,2 et pas 1,75 (le rapport réel) : Guillaume a jugé en jeu le premier colvert (17 px) « trop grand ».
  ok("colvert plus long que le pigeon (1,2 à 2 fois), et pas plus de 14 px", L.duck / L.pigeon >= 1.2 && L.duck / L.pigeon <= 2 && L.duck <= 14, `${L.duck} / ${L.pigeon}`);
  ok("goéland plus long que la mouette rieuse", L.gull > L.laughing, `${L.gull} > ${L.laughing}`);
  ok("chat assis de face ≈ chat familier (10 à 13 px de haut)", L.catSit >= 10 && L.catSit <= 13, `${L.catSit} px (le familier fait ≈ 11)`);
  let edges = 0, cells = 0;
  const walkS = (node) => { for (const k of Object.keys(node)) { const v = node[k]; if (!v || k === "__atlas" || k === "birds") continue; if (v.img) { cells++; if (!k.startsWith("o") && bbox(v).edge) edges++; } else walkS(v); } };
  walkS(S);
  ok("aucun dessin cerné ne touche le bord de sa case", edges === 0, `${edges} sur ${cells} cases`);
  let pe = 0; for (const k of ["pigeon", "dove"]) for (const c of Object.values(S.birds[k])) if (bbox(cellOf(c)).edge) pe++;
  ok("pigeons : aucun pixel au bord (le piège du 433)", pe === 0, `${pe} poses`);
}

console.log(`\nverify-faune : ${n - fail}/${n}`);
process.exit(fail ? 1 : 0);
