/* =============================================================================
   verify-expressions.mjs — LES EXPRESSIONS AUTOMATIQUES (2026-10-23)
   Joue `expressions.js` (pur) contre les verdicts de Guillaume : l'ordre des priorités, la surprise bornée d'une chute qui dure, le
   sommeil d'un assis après 22 h, le clignement (rythme propre à chacun, entre 3 et 6 s, un dixième de seconde), la joie d'être assis
   ensemble PAR MOMENTS (ni jamais ni toujours), les retombées au park (vrille complète ou figure + demi-tour → rire ; figure seule →
   joie ; chute → rien) et au patin, le changement de look ; les PNJ ne font que cligner et dormir. Puis des garde-fous de source :
   `persoHdArt.js` sait dessiner chaque nom rendu, et FermeGame.js n'envoie aucun message neuf pour les expressions.
   Usage : node tools/verify-expressions.mjs
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["expressions", "persoHdArt"]);
const X = mods.expressions, HD = mods.persoHdArt, K = X.EXPR;
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
console.log("\n=== verify-expressions ===\n");

const base = (o) => ({ id: "p1", npc: false, seated: false, gameMin: 600, falling: false, hurt: false, buddy: false, ...o });
// un instant hors clignement pour l'identifiant donné (le clignement ne doit pas masquer ce qu'on teste)
const calm = (id, from) => { for (let t = from; ; t += 37) if (X.exprPick(X.newExprMem(), base({ id }), t) === "neutre") return t; };

// 1. les priorités
{
  const t = calm("p1", 100000), m = X.newExprMem();
  X.exprMark(m, "joie", t); X.exprMark(m, "rire", t);
  ok(X.exprPick(m, base(), t + 10) === "rire", "rire passe devant la joie");
  ok(X.exprPick(m, base({ hurt: true }), t + 10) === "gene", "la gêne (blessé) passe devant le rire");
  ok(X.exprPick(m, base({ hurt: true, falling: true }), t + 10) === "surprise", "la surprise (chute) passe devant la gêne");
  const m2 = X.newExprMem();
  X.exprPick(m2, base({ seated: true, gameMin: 23 * 60, falling: true }), t);
  ok(X.exprPick(m2, base({ seated: true, gameMin: 23 * 60, falling: true }), t + K.DOZE_AFTER + 5) === "sommeil", "le sommeil passe devant tout");
}
// 2. la surprise : la chute, bornée, puis une seconde
{
  const id = "chuteur", m = X.newExprMem(), t0 = calm(id, 200000);
  let last = -1;
  for (let t = t0; t < t0 + 9000; t += 50) { if (X.exprPick(m, base({ id, falling: true }), t) === "surprise") last = t; }
  const span = last - t0;
  ok(span >= K.SURPRISE_MAX - 60 && span <= K.SURPRISE_MAX + K.SURPRISE_TAIL, "une chute qui dure ne garde la surprise qu'au début", `${span} ms`);
  const m2 = X.newExprMem(), t1 = calm(id, 300000);
  X.exprPick(m2, base({ id, falling: true }), t1);
  const e1 = X.exprPick(m2, base({ id }), t1 + 900), e2 = X.exprPick(m2, base({ id }), t1 + K.SURPRISE_TAIL + 60);
  ok(e1 === "surprise" && e2 !== "surprise", "après la chute : encore une seconde de surprise, pas plus", `${e1} puis ${e2}`);
}
// 3. le sommeil d'un assis
{
  const m = X.newExprMem(), t0 = 400000;
  X.exprPick(m, base({ seated: true, gameMin: 23 * 60 }), t0);
  ok(X.exprPick(m, base({ seated: true, gameMin: 23 * 60 }), t0 + K.DOZE_AFTER - 1000) !== "sommeil", "assis depuis moins d'une minute : éveillé");
  ok(X.exprPick(m, base({ seated: true, gameMin: 23 * 60 }), t0 + K.DOZE_AFTER + 10) === "sommeil", "assis plus d'une minute après 22 h : il s'assoupit");
  ok(X.exprPick(m, base({ seated: true, gameMin: 15 * 60 }), t0 + K.DOZE_AFTER + 10) !== "sommeil", "l'après-midi : pas de sieste");
  X.exprPick(m, base({ seated: false, gameMin: 23 * 60 }), t0 + K.DOZE_AFTER + 20);
  ok(X.exprPick(m, base({ seated: true, gameMin: 23 * 60 }), t0 + K.DOZE_AFTER + 30) !== "sommeil", "il se lève puis se rassoit : le compte repart");
  const mn = X.newExprMem();
  X.exprPick(mn, base({ npc: true, seated: true, gameMin: 23 * 60 }), t0);
  ok(X.exprPick(mn, base({ npc: true, seated: true, gameMin: 23 * 60 }), t0 + K.DOZE_AFTER + 10) === "sommeil", "un PNJ aussi s'assoupit");
}
// 4. le clignement
{
  const ids = ["p1", "p2", "res3", "greg", "leo", "visitor7", "res12", "soan"];
  const periods = [], durs = [];
  for (const id of ids) {
    const starts = [];
    let inB = false, b0 = 0;
    for (let t = 0; t < 60000; t += 10) {
      const b = X.exprPick(X.newExprMem(), base({ id }), t) === "cligne";
      if (b && !inB) { starts.push(t); b0 = t; }
      if (!b && inB) durs.push(t - b0);
      inB = b;
    }
    for (let i = 1; i < starts.length; i++) periods.push(starts[i] - starts[i - 1]);
  }
  ok(Math.min(...periods) >= K.BLINK_MIN - 10 && Math.max(...periods) < K.BLINK_MIN + K.BLINK_SPAN + 10, "chacun cligne toutes les 3 à 6 s", `${Math.min(...periods)}–${Math.max(...periods)} ms`);
  ok(Math.max(...durs) <= K.BLINK_MS + 10 && Math.min(...durs) >= K.BLINK_MS - 10, "un clignement dure un dixième de seconde", `${Math.min(...durs)}–${Math.max(...durs)} ms`);
  ok(new Set(ids.map((id) => K.BLINK_MIN + (X.exprHash(id, 3) % K.BLINK_SPAN))).size >= 6, "les rythmes diffèrent d'un personnage à l'autre");
  ok(ids.every((id) => { for (let t = 0; t < 8000; t += 10) if (X.exprPick(X.newExprMem(), base({ id, npc: true }), t) === "cligne") return true; return false; }), "les PNJ clignent aussi");
}
// 5. les PNJ restent sobres
{
  const m = X.newExprMem(), t = calm("res1", 500000);
  X.exprMark(m, "joie", t); X.exprMark(m, "rire", t);
  const e = X.exprPick(m, base({ id: "res1", npc: true, hurt: true, falling: true }), t + 5);
  ok(e === "neutre", "un PNJ ne rit pas, ne sourit pas, ne s'étonne pas (sobre)", e);
}
// 6. assis côte à côte : la joie par moments
{
  let joy = 0, n = 0, longest = 0, run = 0;
  for (const id of ["p1", "p2", "p3"]) for (let t = 0; t < 600000; t += 100) {
    const m = X.newExprMem(); m.sitSince = t;   // fraîchement assis : pas de sieste
    const e = X.exprPick(m, base({ id, seated: true, buddy: true }), t);
    n++; if (e === "joie") { joy++; run++; longest = Math.max(longest, run); } else run = 0;
  }
  const share = joy / n;
  ok(share > 0.03 && share < 0.25, "assis ensemble : de la joie par moments, ni jamais ni toujours", `${(share * 100).toFixed(1)} % du temps`);
  ok(longest * 100 <= K.SIT_JOY + 100, "un moment de joie dure 3 s au plus", `${longest * 100} ms`);
  const m = X.newExprMem(), t = calm("p1", 700000);
  ok(X.exprPick(m, base({ seated: true, buddy: false }), t) !== "joie", "assis seul : pas de joie");
}
// 7. les retombées au park
{
  const fly = (spinTurns, trick, end) => {
    const m = X.newExprMem(), t0 = calm("rider", 800000), N = 40;
    for (let i = 0; i <= N; i++) X.exprRideStep(m, { mode: "air", th: (spinTurns * 2 * Math.PI * i) / N, flip: trick && i > 5 && i < 30 ? 0.5 : 0 }, t0 + i * 20);
    X.exprRideStep(m, { mode: end, th: 0 }, t0 + 900);
    return X.exprPick(m, base({ id: "rider" }), t0 + 950);
  };
  ok(fly(1, false, "ground") === "rire", "une vrille complète posée : rire");
  ok(fly(0.5, true, "ground") === "rire", "une figure et un demi-tour (combo) : rire");
  ok(fly(0, true, "ground") === "joie", "une figure simple posée : joie");
  ok(fly(0.5, false, "ground") === "joie", "un demi-tour posé : joie");
  ok(fly(0, false, "ground") === "neutre", "un simple saut : rien");
  ok(fly(1, true, "bail") === "neutre", "une figure ratée (la chute) : pas de rire (la chute fait la surprise ailleurs)");
}
// 8. au patin, le look
{
  const m = X.newExprMem(), t = calm("pat", 900000);
  X.exprSkateStep(m, "spin", t); X.exprSkateStep(m, "glide", t + 500);
  ok(X.exprPick(m, base({ id: "pat" }), t + 600) === "joie", "au patin, une vrille qui finit en glisse : joie");
  const m2 = X.newExprMem();
  X.exprSkateStep(m2, "axel", t); X.exprSkateStep(m2, "fall", t + 500);
  ok(X.exprPick(m2, base({ id: "pat" }), t + 600) !== "joie", "une figure qui finit à terre : pas de joie");
  const m3 = X.newExprMem();
  X.exprLookStep(m3, "w1000", t);
  ok(X.exprPick(m3, base({ id: "pat" }), t + 10) !== "joie", "la première tenue qu'on voit n'est pas un changement");
  X.exprLookStep(m3, "w1300", t + 20);
  ok(X.exprPick(m3, base({ id: "pat" }), t + 30) === "joie", "une nouvelle tenue fait sourire");
}
// 9. le dessin sait rendre chaque nom ; aucun message neuf
{
  const names = new Set(["neutre", "sommeil", "surprise", "gene", "rire", "joie", "cligne"]);
  ok([...names].every((n) => HD.PERSO_HD_EXPRESSIONS.includes(n)), "chaque expression rendue existe dans persoHdArt.js");
  const fg = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
  const sends = (fg.match(/exprEvent|exprArrivals|exprFishCaught/g) || []).length;
  const bad = fg.split("\n").filter((l) => /expr/i.test(l) && /sendReq\(|channelRef\.current\?\.send|hostSend\(\{ type: "broadcast", event: "(?!apply)/.test(l));
  ok(sends > 0 && bad.length === 0, "les expressions n'émettent aucun message (aucun sendReq ni event neuf)", bad.length ? bad[0].trim().slice(0, 80) : `${sends} usages`);
}
console.log(`\n${fail ? "❌" : "✅"} ${nOk}/${nOk + fail} contrôles`);
process.exit(fail ? 1 : 0);
