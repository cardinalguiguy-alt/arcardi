/* =============================================================================
   verify-course.mjs — LA COURSE DE LA PATINOIRE SE JOUE-T-ELLE ? (2026-10-05, nuit)
   -----------------------------------------------------------------------------
   `components/ferme/course.js` (pur) avec `patin.js` (la glissade du jeu). On JOUE :
     §1  la piste : l'îlot tient dans la glace avec de vrais couloirs, la grille est sur la glace, derrière la ligne,
         hors de l'îlot ; la boucle d'un couloir ne touche ni l'îlot ni la bande ;
     §2  le compte des tours : faire le tour compte, l'aller-retour sur la ligne et la marche arrière non ;
     §3  les résidents : même graine → même course (zéro message, même classement chez tous), ils finissent,
         du plus rapide au plus lent, et le plus lent peut tomber ;
     §4  un PATINEUR SIMULÉ (la physique de `patin.js`, une ligne idéale, la touche de course) : son temps sur cinq
         tours situe les résidents — le meilleur doit être battable, le plus lent pas ridicule ;
     §5  l'aspiration : dans le sillage oui, à côté, derrière ou à l'arrêt non ;
     §6  le classement et le fantôme (aller-retour au huitième de case).
   Usage : node tools/verify-course.mjs      (FALSIFY=laps : un passage de ligne compte toujours — §2 doit rougir)
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "components", "ferme");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "course-"));
const copied = new Set();
const copy = (n) => {
  if (copied.has(n)) return; copied.add(n);
  let src = fs.readFileSync(path.join(SRC, n + ".js"), "utf8");
  if (n === "course" && process.env.FALSIFY === "laps") src = src.replace("prog > laps + 0.75", "true");
  fs.writeFileSync(path.join(tmp, n + ".js"), src.replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.js"'));
  for (const m of src.matchAll(/from "\.\/([A-Za-z0-9_]+)"/g)) copy(m[1]);
};
copy("course"); copy("patin");
const CO = await import(pathToFileURL(path.join(tmp, "course.js")).href);
const PT = await import(pathToFileURL(path.join(tmp, "patin.js")).href);
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const K = CO.COURSE, RK = C.TOWN_RINK;

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
const onIce = (x, y) => C.rinkInside(x, y);

section("§1 — la piste");
{
  const I = K.ISLAND;
  const gapW = (K.CX - I.hx) - RK.x0, gapN = (K.CY - I.hy) - RK.y0, gapS = RK.y1 + 1 - (K.CY + I.hy), gapE = RK.x1 + 1 - (K.CX + I.hx);
  ok("l'îlot laisse de vrais couloirs tout autour (≥ 5 cases)", Math.min(gapW, gapN, gapS, gapE) >= 5, `ouest ${gapW}, nord ${gapN}, sud ${gapS}, est ${gapE}`);
  let bad = 0;
  for (let k = 0; k < 4; k++) { const g = CO.gridSlot(k); if (!onIce(g.x, g.y) || CO.islandSD(g.x, g.y) < 0.6 || g.x >= CO.startX()) bad++; }
  ok("les quatre places de la grille : sur la glace, hors de l'îlot, derrière la ligne", bad === 0);
  let off = 0;
  for (const d of [1, 1.5, 2.5, 4]) { const L = CO.loopLength(d); for (let s = 0; s < L; s += 0.25) { const p = CO.loopAt(d, s); if (!onIce(p.x, p.y) || CO.islandSD(p.x, p.y) < d - 0.05) off++; } }
  ok("la boucle d'un couloir (1 à 4 cases du bord de l'îlot) reste sur la glace et hors de l'îlot", off === 0, `${off} écart(s)`);
  const p0 = CO.loopAt(1.5, 0), p1 = CO.loopAt(1.5, 0.5);
  ok("la boucle part de la ligne, vers l'est (sens inverse des aiguilles d'une montre à l'écran)", Math.abs(p0.x - CO.startX()) < 1e-6 && p1.x > p0.x && p0.y > K.CY);
  const cones = CO.conePositions();
  ok("des plots tout autour de l'îlot, à pas régulier", cones.length > 20 && cones.every((c) => Math.abs(CO.islandSD(c.x, c.y)) < 0.05), `${cones.length} plots`);
}

section("§2 — le compte des tours");
{
  const g = CO.gridSlot(1), tr = CO.tracker(g.x, g.y);
  let r = tr.update(g.x, g.y);
  ok("au départ, derrière la ligne : zéro tour, progression négative", r.laps === 0 && r.prog < 0, `prog ${r.prog.toFixed(3)}`);
  const d = 1.5, L = CO.loopLength(d);
  for (let s = 0; s <= 3 * L + 1; s += 0.2) { const p = CO.loopAt(d, s); r = tr.update(p.x, p.y); }
  ok("trois tours bouclés comptent trois", r.laps === 3, `${r.laps} tours, prog ${r.prog.toFixed(2)}`);
  const tr2 = CO.tracker(g.x, g.y);
  for (let k = 0; k < 20; k++) { tr2.update(CO.startX() - 0.6, g.y); r = tr2.update(CO.startX() + 0.6, g.y); }
  ok("vingt allers-retours sur la ligne ne comptent rien", r.laps === 0);
  const tr3 = CO.tracker(g.x, g.y);
  for (let s = 0; s >= -2 * L; s -= 0.2) { const p = CO.loopAt(d, s); r = tr3.update(p.x, p.y); }
  ok("deux tours à l'envers ne comptent rien (la progression recule)", r.laps === 0 && r.prog < -1.5, `prog ${r.prog.toFixed(2)}`);
  const tr4 = CO.tracker(g.x, g.y);
  for (let s = 0; s <= 0.6 * L; s += 0.2) { const p = CO.loopAt(d, s); tr4.update(p.x, p.y); }
  for (let s = 0.6 * L; s >= -0.2; s -= 0.2) { const p = CO.loopAt(d, s); tr4.update(p.x, p.y); }
  for (let s = -0.2; s <= 0.6; s += 0.2) { const p = CO.loopAt(d, s); r = tr4.update(p.x, p.y); }
  ok("un demi-tour puis retour à la ligne ne compte rien", r.laps === 0);
}

section("§3 — les résidents-coureurs");
const runs = K.BOTS.map((b, i) => CO.botRun(b, i + 1, 12345 + i));
{
  const again = K.BOTS.map((b, i) => CO.botRun(b, i + 1, 12345 + i));
  ok("même graine, même course (au millième, sur toute la trajectoire)", runs.every((r, i) => r.finishMs === again[i].finishMs && r.samples.length === again[i].samples.length && r.samples.every((s, k) => s.x === again[i].samples[k].x)));
  ok("les trois arrivent", runs.every((r) => r.finishMs != null), runs.map((r) => CO.fmtMs(r.finishMs)).join(" / "));
  ok("le plus rapide devant, le plus lent derrière", runs[2].finishMs < runs[1].finishMs && runs[1].finishMs < runs[0].finishMs);
  let off = 0, inIsland = 0;
  for (const r of runs) for (const s of r.samples) { if (!onIce(s.x, s.y)) off++; if (CO.islandSD(s.x, s.y) < 0.4) inIsland++; }
  ok("ils restent sur la glace et hors de l'îlot", off === 0 && inIsland === 0, `${off} hors glace, ${inIsland} dans l'îlot`);
  let tumbles = 0;
  for (let seed = 1; seed <= 60; seed++) if (CO.botRun(K.BOTS[0], 1, seed).samples.some((s) => s.tumble)) tumbles++;
  ok("le plus lent tombe parfois (pas toujours)", tumbles > 10 && tumbles < 55, `${tumbles}/60 courses`);
  const tr = CO.tracker(runs[2].samples[0].x, runs[2].samples[0].y);
  let laps = 0; for (const s of runs[2].samples) laps = tr.update(s.x, s.y).laps;
  ok("le compteur des joueurs leur compte bien cinq tours", laps === K.LAPS, `${laps}`);
}

section("§4 — un patineur simulé (la physique de patin.js)");
function simulate(opts = {}) {
  const g = CO.gridSlot(0), st = PT.skateNew(0, 0), tr = CO.tracker(g.x, g.y), dt = 1 / 60;
  let x = g.x, y = g.y, t = 0, laps = 0, crashes = 0, lineS = 0;
  const d = opts.line || 1.25, L = CO.loopLength(d);
  while (t < 120 && laps < K.LAPS) {
    // la ligne idéale : un point 2,6 cases devant, sur la boucle du couloir choisi
    let best = 1e9, bs = lineS;
    for (let s = lineS - 1; s <= lineS + 4; s += 0.1) { const p = CO.loopAt(d, s), e = Math.hypot(p.x - x, p.y - y); if (e < best) { best = e; bs = s; } }
    lineS = bs;
    const tgt = CO.loopAt(d, lineS + (opts.look || 2.6));
    let ix = tgt.x - x, iy = tgt.y - y; const li = Math.hypot(ix, iy) || 1; ix /= li; iy /= li;
    const dk = opts.draftFrom ? CO.draftK({ x, y, vx: st.vx, vy: st.vy }, [opts.draftFrom(t)]) : 0;
    PT.skateStep(st, ix, iy, dt, { skates: true, run: true, vmaxK: 1 + K.DRAFT.vK * dk, accK: 1 + K.DRAFT.aK * dk });
    const nx = x + st.vx * dt, ny = y + st.vy * dt;
    const free = (px, py) => onIce(px, py) && CO.islandSD(px, py) > 0.3;
    if (free(nx, y)) x = nx; else { const v = PT.skateBump(st, "x"); if (v > K.CRASH_V) { PT.skateTumble(st); crashes++; } }
    if (free(x, ny)) y = ny; else { const v = PT.skateBump(st, "y"); if (v > K.CRASH_V) { PT.skateTumble(st); crashes++; } }
    laps = tr.update(x, y).laps; t += dt;
  }
  return { ms: Math.round(t * 1000), laps, crashes };
}
{
  const h = simulate();
  ok("le patineur simulé boucle ses cinq tours sans chute", h.laps === K.LAPS && h.crashes === 0, `${CO.fmtMs(h.ms)}, ${h.crashes} chute(s)`);
  const fast = runs[2].finishMs, slow = runs[0].finishMs;
  ok("le meilleur résident est BATTABLE (plus lent que la ligne idéale)", fast > h.ms, `résident ${CO.fmtMs(fast)} contre ${CO.fmtMs(h.ms)}`);
  ok("…mais pas de beaucoup (il faut bien patiner : moins de 15 % d'écart)", fast < h.ms * 1.15, `${((fast / h.ms - 1) * 100).toFixed(1)} %`);
  ok("le plus lent n'est pas ridicule (moins de 40 % au-dessus)", slow < h.ms * 1.4, `${((slow / h.ms - 1) * 100).toFixed(1)} %`);
  ok("une course dure entre 20 et 50 secondes (un mini-jeu)", h.ms > 20000 && h.ms < 50000, CO.fmtMs(h.ms));
  const wide = simulate({ line: 3.6 });
  ok("la corde paie : une ligne large est plus lente", wide.ms > h.ms, `${CO.fmtMs(wide.ms)} contre ${CO.fmtMs(h.ms)}`);
  const bull = simulate({ line: 1.25, look: 0.6 });
  ok("viser trop court fait zigzaguer ou heurter (plus lent ou des chutes)", bull.ms > h.ms || bull.crashes > 0, `${CO.fmtMs(bull.ms)}, ${bull.crashes} chute(s)`);
}

section("§5 — l'aspiration");
{
  const me = { x: 50, y: 94, vx: 8, vy: 0 };
  ok("dans le sillage (1,5 case devant, dans l'axe)", CO.draftK(me, [{ x: 51.5, y: 94 }]) > 0.4);
  ok("pas à côté", CO.draftK(me, [{ x: 50.5, y: 95.2 }]) === 0);
  ok("pas derrière", CO.draftK(me, [{ x: 48.5, y: 94 }]) === 0);
  ok("pas à l'arrêt", CO.draftK({ ...me, vx: 0.5 }, [{ x: 51.5, y: 94 }]) === 0);
}

section("§6 — le classement et le fantôme");
{
  const r = CO.ranking([{ id: "b1", ms: 30000, bot: true }, { id: "p1", ms: 30000 }, { id: "p2", ms: null }, { id: "b2", ms: 28000, bot: true }]);
  ok("par temps, l'humain avant le résident à égalité, les non-arrivés derniers", r.map((e) => e.id).join(",") === "b2,p1,b1,p2" && r[3].rank === 4);
  const pts = runs[1].samples.filter((_, i) => i % 2 === 0).map((s) => ({ x: s.x, y: s.y }));
  const enc = CO.ghostEncode(pts), dec = CO.ghostDecode(enc);
  const err = Math.max(...dec.map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y)));
  ok("le fantôme revient au huitième de case près", dec.length === pts.length && err <= 0.09, `${pts.length} points, ${enc.length} caractères, écart ${err.toFixed(3)}`);
  ok("un chrono se lit", CO.fmtMs(83456) === "1:23.46" && CO.fmtMs(null) === "—");
}

console.log(`\n${fails ? "❌" : "✅"} ${total - fails}/${total} contrôles passés.`);
process.exit(fails ? 1 : 0);
