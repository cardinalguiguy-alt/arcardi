/* =============================================================================
   verify-chantier.mjs — LE CHANTIER DE LA PLACE SE TIENT-IL ? (2026-10-11)
   -----------------------------------------------------------------------------
   La vraie horloge et le vrai script (`chantier.js`) sur le vrai plan du park (`skatepark.js`). Il JOUE la journée, minute par minute :
     1. la fenêtre : le lundi du changement de saison, 14 h–17 h à Paris — en heure d'été (12 h–15 h UTC) comme d'hiver (13 h–16 h) ;
     2. ce que la place porte : avant (la patinoire au printemps, le park l'été), pendant (le chantier, sa minute), après (le park, la
        place vide), et rien de daté si le park est fermé ou la saison forcée ;
     3. le déroulé : chaque cadre avant ses feuilles, chaque feuille posée avant la fin des feuilles ;
     4. l'équipe : aucun ouvrier à pied DANS un module déjà monté (cadre posé), aucun hors des abords de la place, des marches à vitesse
        humaine, tout le monde remonté dans la camionnette à la fin ;
     5. la barrière : chaque panneau posé dans les premières minutes et retiré à la fin.
   Usage :  node tools/verify-chantier.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mods = await loadFerme(ROOT, ["fermeConstants", "skatepark", "chantier"]);
const C = mods.fermeConstants, SP = mods.skatepark, CH = mods.chantier;
let fail = 0, nOk = 0;
const ok = (cond, label, detail) => { console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : "")); if (!cond) fail++; else nOk++; };
console.log("\n=== verify-chantier ===\n");
const H = 3600 * 1000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

// ── 1. LA FENÊTRE
{
  const k = Math.floor((Date.UTC(2026, 9, 12, 6) - C.SEASON_EPOCH) / C.SEASON_REAL_MS);
  const s0 = C.SEASON_EPOCH + k * C.SEASON_REAL_MS;
  const w = CH.chantierWindow(s0);
  ok(new Date(s0).getUTCDay() === 1, "une saison commence un lundi à 0 h UTC", iso(s0));
  ok(new Date(w.t0).getUTCHours() === 12 && w.t1 - w.t0 === 3 * H, "en heure d'été : 12 h–15 h UTC (14 h–17 h à Paris), trois heures", `${iso(w.t0)} → ${iso(w.t1)}`);
  const s1 = s0 + 7 * C.SEASON_REAL_MS;   // sept saisons plus tard : en novembre-décembre
  const w1 = CH.chantierWindow(s1);
  ok(new Date(w1.t0).getUTCHours() === 13, "en heure d'hiver : 13 h–16 h UTC", `${iso(w1.t0)}`);
}
// ── 2. CE QUE LA PLACE PORTE
{
  const SEAS = ["spring", "summer", "autumn", "winter"];
  let spring = null, summer = null;
  for (let k = 0; k < 8 && (!spring || !summer); k++) {
    const s0 = C.SEASON_EPOCH + k * C.SEASON_REAL_MS;
    if (SEAS[k % 4] === "spring" && !spring) spring = s0;
    if (SEAS[k % 4] === "summer" && !summer) summer = s0;
  }
  const ws = CH.chantierWindow(spring), wu = CH.chantierWindow(summer);
  const at = (ms) => CH.placeStateAt(ms, true, null);
  ok(at(ws.t0 - 60000).kind === "winter", "le lundi du printemps, avant 14 h : la patinoire est encore là");
  const mid = at(ws.t0 + 30 * 60000);
  ok(mid.kind === "chantier" && mid.type === "montage" && Math.abs(mid.t - 30) < 1e-6, "à 14 h 30 : le montage, minute 30", JSON.stringify(mid));
  ok(at(ws.t1 + 60000).kind === "park", "après 17 h : le park");
  ok(at(spring + 3 * 24 * H).kind === "park", "le jeudi du printemps : le park");
  ok(at(wu.t0 - 60000).kind === "park" && at(wu.t0 + 60000).type === "demontage" && at(wu.t1 + 60000).kind === "market", "l'été : le park jusqu'au démontage, puis la place vide");
  ok(at(spring - 24 * H).kind === "winter" && at(summer + 8 * 24 * H).kind === "market", "l'hiver : la patinoire ; l'automne : la place vide");
  ok(CH.placeStateAt(ws.t0 + 30 * 60000, false, null).kind === "market", "park fermé au public : aucun chantier, la place vide au printemps");
  ok(CH.placeStateAt(ws.t0 + 30 * 60000, true, "spring").kind === "park", "saison forcée : rien de daté, le park");
}
// ── 3. LE DÉROULÉ
{
  const tl = CH.primTimeline();
  ok(tl.every((q) => q && q.f1 <= q.s0 + 1e-6 || q.f1 <= CH.PHASE.SHEETS[1]), "chaque cadre est posé avant ou pendant le début de ses feuilles");
  ok(tl.every((q) => q.s1 <= CH.PHASE.SHEETS[1] + 1e-6 && q.f0 >= CH.PHASE.FRAMES[0] - 1e-6), "les feuilles finissent avec la phase, les cadres commencent avec la leur");
  let late = 0, bad = 0;
  SP.PARK_PRIMS.forEach((p, i) => { for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const m = CH.buildMinute(i, "sheet", r, c); if (m > CH.PHASE.SHEETS[1]) late++; if (m < tl[i].s0 - 1e-6) bad++; } });
  ok(!late && !bad, "chaque feuille tombe dans la fenêtre de sa primitive", `${late} en retard, ${bad} en avance`);
}
// ── 4. L'ÉQUIPE
{
  const P = SP.PARK, tl = CH.primTimeline();
  let inside = 0, out = 0, fast = 0, n = 0, lastSeen = {};
  const outs = [];
  const where = [];
  for (let t = 0.6; t < CH.PHASE.VAN_OUT[0]; t += 0.1) {
    for (const w of CH.CREW) {
      const s = CH.workerAt(w.id, t);
      if (!s) continue;
      n++;
      if (s.act !== "ride") {
        const built = SP.PARK_PRIMS.some((p, i) => {
          if (tl[i].f0 > t) return false;
          const b = p.bb;
          return s.x > P.x0 + b[0] + 0.05 && s.x < P.x0 + b[2] - 0.05 && s.y > P.y0 + b[1] + 0.05 && s.y < P.y0 + b[3] - 0.05 && SP.heightAt(s.x, s.y) > 0.01;
        });
        if (built) { inside++; if (where.length < 4) where.push(`${w.id}@${t.toFixed(1)} (${(s.x - P.x0).toFixed(1)},${(s.y - P.y0).toFixed(1)}) ${s.act}`); }
        // l'allée pavée de l'est (le chariot y attend son conducteur) est un abord, jusqu'à douze cases de la place
        const lane = s.y > 91.5 && s.y < 96 && s.x < P.x0 + P.w + 13;
        if (!lane && (s.x < P.x0 - 4 || s.x > P.x0 + P.w + 5 || s.y < 69 || s.y > P.y0 + P.h + 3)) { out++; if (outs.length < 3) outs.push(`${w.id}@${t.toFixed(1)} (${s.x.toFixed(1)},${s.y.toFixed(1)})`); }
      }
      const L = lastSeen[w.id];
      if (L && L.act !== "ride" && s.act !== "ride") { const v = Math.hypot(s.x - L.x, s.y - L.y) / 6; if (v > 2.6) fast++; }
      lastSeen[w.id] = s;
    }
  }
  ok(inside === 0, "aucun ouvrier à pied dans un module déjà monté", `${inside}/${n} ${where.join(" · ")}`);
  ok(out === 0, "personne hors des abords de la place (allée, boulevard)", `${out}/${n} ${outs.join(" · ")}`);
  ok(fast === 0, "des marches à vitesse humaine (≤ 2,6 cases/s, ≈ 3 m/s)", `${fast} dépassements`);
  ok(CH.CREW.every((w) => !CH.workerAt(w.id, CH.PHASE.VAN_OUT[0] + 0.5)), "à la fin, tout le monde est remonté dans la camionnette");
  /* 2026-10-12 — la barrière posée, on passe par une PORTE : un pas qui traverse une de ses lignes hors des portes est un ouvrier
     qui l'enjambe (premier jet : les chemins ne la connaissaient pas). Échantillons au 1/100 de minute (≈ 0,03 case par pas). */
  {
    const F = CH.FENCE, panels = CH.fencePanels();
    const posed = (t) => panels.every((f) => t >= f.on && (f.off == null || t < f.off));
    let cross = 0; const ex = [];
    for (const w of CH.CREW) {
      let L = null;
      for (let t = 0.6; t < CH.PHASE.VAN_OUT[0]; t += 0.01) {
        const s = CH.workerAt(w.id, t);
        if (!s || s.act === "ride") { L = null; continue; }
        if (L && posed(t)) {
          // le point OÙ le pas coupe la ligne (interpolé : un échantillon après la porte peut être déjà à côté d'elle)
          const atX = (x0) => L.y + (s.y - L.y) * (x0 - L.x) / (s.x - L.x), atY = (y0) => L.x + (s.x - L.x) * (y0 - L.y) / (s.y - L.y);
          const cutX = (x0) => Math.sign(s.x - x0) !== Math.sign(L.x - x0), cutY = (y0) => Math.sign(s.y - y0) !== Math.sign(L.y - y0);
          const inY = (y) => y > F.yN && y < F.yS, inX = (x) => x > F.xW && x < F.xE;
          let bad = false;
          if (cutX(F.xW) && inY(atX(F.xW))) bad = true;
          if (cutX(F.xE)) { const y = atX(F.xE); if (inY(y) && !(y > F.gateE[0] && y < F.gateE[1])) bad = true; }
          if (cutY(F.yS) && inX(atY(F.yS))) bad = true;
          if (cutY(F.yN)) { const x = atY(F.yN); if (inX(x) && !(x > F.gateN[0] && x < F.gateN[1])) bad = true; }
          if (bad) { cross++; if (ex.length < 3) ex.push(`${w.id}@${t.toFixed(2)} (${s.x.toFixed(1)},${s.y.toFixed(1)})`); }
        }
        L = s;
      }
    }
    ok(cross === 0, "la barrière posée, personne ne l'enjambe : on passe par une porte", `${cross} ${ex.join(" · ")}`);
  }
  const acts = new Set();
  for (let t = 0.6; t < 178; t += 0.2) for (const w of CH.CREW) { const s = CH.workerAt(w.id, t); if (s) acts.add(s.act); }
  ok(["fence", "squeegee", "weld", "carry", "screw", "point"].every((a) => acts.has(a)), "chaque geste du chantier a lieu au moins une fois", [...acts].join(" "));
}
// ── 5. LA BARRIÈRE
{
  const F = CH.fencePanels();
  ok(F.length >= 30, "la barrière fait le tour de la place", `${F.length} panneaux`);
  ok(F.every((f) => f.on >= 0 && f.on < 12), "posée dans les douze premières minutes", `dernier à ${Math.max(...F.map((f) => f.on)).toFixed(1)} min`);
  ok(F.every((f) => f.off != null && f.off > CH.PHASE.UNFENCE[0] && f.off < CH.PHASE.VAN_OUT[0] + 1), "retirée à la fin", `${F.filter((f) => f.off == null).length} jamais retirés`);
}
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC` : `\n${nOk}/${nOk} — tout passe`);
process.exit(fail ? 1 : 0);
