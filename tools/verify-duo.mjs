/* =============================================================================
   verify-duo.mjs — LES FIGURES À DEUX SUR LA GLACE (2026-10-06 soir)
   Joue `duo.js` (pur) : continuité (pas de téléportation), mains toujours à portée, fin au repos, tout reste SUR la glace
   (`duoSpace`), la parade raccourcit près de la bande, le saut retombe ensemble ; et les garde-fous de source (l'hôte
   n'accepte que les figures connues, rien de positionnel ne voyage).
   Usage : node tools/verify-duo.mjs
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "duo"]);
const C = mods.fermeConstants, D = mods.duo;
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
const R = C.TOWN_RINK, cx = (R.x0 + R.x1 + 1) / 2, cy = (R.y0 + R.y1 + 1) / 2;
const a0 = { x: cx - 0.9, y: cy }, b0 = { x: cx + 0.9, y: cy + 0.2 };
console.log("\n=== verify-duo ===\n");
for (const fig of D.DUO.FIGS) {
  const sp = D.duoSpace(fig, a0, b0, 1, 0), P = D.duoPlan(fig, a0, b0, 1, 0, sp.len);
  ok(sp.ok, `${fig} : tient sur la glace au centre`, `len ${sp.len}`);
  let maxJump = 0, maxGap = 0, minGap = 9, prev = null, allIn = true;
  const N = 240;
  for (let i = 0; i <= N; i++) {
    const r = D.duoAt(P, P.dur * i / N);
    if (prev) maxJump = Math.max(maxJump, Math.hypot(r.a.x - prev.a.x, r.a.y - prev.a.y), Math.hypot(r.b.x - prev.b.x, r.b.y - prev.b.y));
    const g = Math.hypot(r.a.x - r.b.x, r.a.y - r.b.y); maxGap = Math.max(maxGap, g); minGap = Math.min(minGap, g);
    if (!C.rinkInside(r.a.x, r.a.y) || !C.rinkInside(r.b.x, r.b.y)) allIn = false;
    prev = r;
  }
  ok(maxJump < 0.2, `${fig} : continue, aucune téléportation`, `saut max ${maxJump.toFixed(3)} case/pas`);
  ok(maxGap < 2.3 && minGap > 0.45, `${fig} : les mains restent à portée, sans que les patineurs se confondent`, `écart ${minGap.toFixed(2)}–${maxGap.toFixed(2)}`);
  ok(allIn, `${fig} : toujours sur la glace`);
  const end = D.duoAt(P, P.dur + 1);
  ok(end.done && Math.hypot(end.a.vx, end.a.vy) < 0.3 && Math.hypot(end.b.vx, end.b.vy) < 0.3, `${fig} : finit au repos (les deux)`, `${Math.hypot(end.a.vx, end.a.vy).toFixed(2)} / ${Math.hypot(end.b.vx, end.b.vy).toFixed(2)} cases/s`);
}
{ // le saut : même hauteur, même instant, retombée commune
  const P = D.duoPlan("saut", a0, b0, 1, 0, 4), mid = D.duoAt(P, P.dur * 0.55);
  ok(mid.a.air > 5 && Math.abs(mid.a.air - mid.b.air) < 1e-6 && mid.a.pose === "axel" && mid.b.pose === "axel", "saut synchro : les deux en l'air, à la même hauteur", `${mid.a.air.toFixed(1)} px`);
  ok(!D.duoAt(P, P.dur * 0.5).landed && D.duoAt(P, P.dur * 0.9).landed, "saut synchro : la retombée est un instant (la gerbe)");
}
{ // près de la bande : la parade raccourcit, ou refuse
  const near = { x: R.x1 - 2.2, y: cy }, near2 = { x: R.x1 - 2.2, y: cy + 1.2 };
  const sp = D.duoSpace("parade", near, near2, 1, 0);
  ok(!sp.ok || sp.len < 7, "parade vers la bande : raccourcie ou refusée", sp.ok ? `len ${sp.len}` : "refusée");
  const out = D.duoSpace("ronde", { x: R.x0 - 3, y: cy }, { x: R.x0 - 2, y: cy }, 1, 0);
  ok(!out.ok, "ronde hors de la glace : refusée");
}
ok(D.duoFigOk("ronde") && !D.duoFigOk("pirate") && !D.duoFigOk(undefined), "seules les figures connues sont valables");
{
  const src = fs.readFileSync(path.join(ROOT, "components/ferme/FermeGame.js"), "utf8");
  ok(/kind === "duoAsk"/.test(src) && /kind === "duoYes"/.test(src), "l'hôte arbitre la demande et l'acceptation");
  ok(/DU\.duoFigOk\(req\.fig\)/.test(src), "l'hôte ne croit pas la figure demandée (`duoFigOk`)");
  ok(!/duo:\s*\{[^}]*\bx:/.test(src), "l'ordre diffusé ne porte aucune position");
}
console.log(`\n${fail ? "❌" : "✅"} ${nOk}/${nOk + fail} contrôles passés.`);
process.exit(fail ? 1 : 0);
