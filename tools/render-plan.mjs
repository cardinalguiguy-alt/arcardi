/* =============================================================================
   render-plan.mjs — LE PLAN ILLUSTRÉ DE VALLEY TOWN (2026-10-03).
   -----------------------------------------------------------------------------
   Appelle `buildTownPlan` — EXACTEMENT la fonction que la carte ouverte appelle
   (`FermeGame.js`, `buildTownMinimapBase`) — sur la ville générée, et écrit le
   plan en entier + quelques gros plans (×1, pixels du plan) dans tools/out/.
   Mesure aussi ce qu'un œil ne mesure pas : le plan est-il construit en un temps
   raisonnable, et combien de bâtiments a-t-il dessinés (maisons + civiques +
   « remises » génériques) contre le nombre de maisons du catalogue ?

   ⚠️ Le faux canvas n'a ni texte ni translate ni clip : la lettre N de la rose
   des vents est absente ici (elle est dans un `try`), présente en jeu. Les noms et
   les repères sont peints en direct par `drawTownMap`, pas par ce plan.

   Usage :  node tools/render-plan.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, writePNG, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "planVille"]);
const C = mods.fermeConstants, E = mods.fermeEngine, P = mods.planVille;

let fail = 0;
const ok = (cond, label, detail) => { console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : "")); if (!cond) fail++; };

const tw = E.generateTownWorld();
const t0 = Date.now();
const cv = P.buildTownPlan(tw);
const ms = Date.now() - t0;
cv.getContext("2d");
const PW = cv.width, PH = cv.height, px = cv.__px;
console.log(`\n=== plan ${PW}×${PH} construit en ${ms} ms (faux canvas) ===\n`);
ok(PW === tw.w * P.PLAN_S && PH === tw.h * P.PLAN_S, "la taille suit la ville", `${tw.w}×${tw.h} cases × ${P.PLAN_S}`);
ok(px && px.length === PW * PH * 4, "les pixels existent");
// aucune case du plan n'est restée transparente
let hole = 0; for (let i = 3; i < px.length; i += 4) if (px[i] < 255) hole++;
ok(hole === 0, "aucun pixel transparent", hole + " trouvés");

/* ═══ Ce que le plan DIT : un toit par maison du catalogue, et rien d'inventé ═══
   ⚠️ LA LISTE DES MAISONS VIENT DU CATALOGUE (`C.townAllHouses`), pas d'un nombre
   écrit ici : le jour où une parcelle déménage ou s'ajoute, ce banc suit. */
const B = P.townPlanBuildings(tw), S = P.PLAN_S;
const count = (k) => B.filter((b) => b.kind === k).length;
console.log("\n=== les bâtiments dessinés ===\n");
ok(count("house") === C.townAllHouses().length, "un toit par maison du catalogue", `${count("house")} / ${C.townAllHouses().length}`);
ok(count("ruin") === 1 && count("court") === 1 && count("hall") === 1 && count("church") === 1 && count("station") === 1 && count("shop") === 2, "les civiques y sont tous (ruine, tribunal, mairie, église, gare, 2 commerces)");
ok(count("shed") <= 12, "peu de remises génériques (ce qui bloque sans être connu)", count("shed") + " : " + B.filter((b) => b.kind === "shed").map((b) => `${b.x},${b.y} ${b.w}×${b.h}`).join(" · "));
// le milieu de chaque toit porte une couleur de la famille de son toit, pas celle de l'herbe
const near = (a, b2) => Math.hypot(a[0] - b2[0], a[1] - b2[1], a[2] - b2[2]);
let bad = [];
for (const b of B) {
  if (b.kind === "shed") continue;
  const x = Math.round((b.x + b.w * 0.3) * S), y = Math.round((b.y + b.h / 2 + 0.7) * S), o = (y * PW + x) * 4;
  const got = [px[o], px[o + 1], px[o + 2]];
  // la pente sud est à 0,80 de la teinte du toit, la nord à 1,14 : on accepte toute la plage (±), pas l'herbe
  const d = Math.min(...[0.7, 0.8, 0.9, 1.0, 1.14, 1.3].map((k) => near(got, b.roof.map((v) => v * k))));
  if (d > 40) bad.push(`${b.kind}@${b.x},${b.y}`);
}
ok(bad.length === 0, "le milieu de chaque toit est de la couleur de son toit", bad.join(" "));
// la rue est lisible : la ligne médiane de l'artère existe (jaune pâle sur l'asphalte)
let yellow = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 180 && px[i + 1] > 160 && px[i + 2] > 70 && px[i + 2] < 130 && px[i] > px[i + 2] + 70) yellow++;
ok(yellow > 1000, "l'artère porte sa ligne médiane", yellow + " pixels jaunes");
// l'eau est de l'eau : bleue au centre de chaque case d'eau, SAUF sous un décor posé dessus (pont, nénuphar, pas japonais)
const covered = new Set();
for (const p of tw.props) {
  if (p.kind === "archBridge") { const bx = C.townPropBox("archBridge", p.x, p.y); for (let y = Math.floor(bx.y0); y < Math.ceil(bx.y1); y++) for (let x = Math.floor(bx.x0); x < Math.ceil(bx.x1); x++) covered.add(y * tw.w + x); }
  else covered.add(p.y * tw.w + p.x);
}
let wcount = 0, notBlue = [];
for (let ty = 0; ty < tw.h; ty++) for (let tx = 0; tx < tw.w; tx++) if (tw.ground[ty * tw.w + tx] === C.G_WATER) {
  wcount++; const o = (((ty * S + 4) * PW) + tx * S + 4) * 4;
  const frame = tx === tw.w - 1 || ty === tw.h - 1 || tx === 0 || ty === 0;   // le cadre (liseré + vignette) couvre la dernière rangée
  if (!(px[o + 2] > px[o] + 30) && !covered.has(ty * tw.w + tx) && !frame) notBlue.push(tx + "," + ty);
}
ok(notBlue.length === 0, "toute case d'eau libre est bleue", `${wcount} cases d'eau ; hors-bleu : ${notBlue.slice(0, 6).join(" ")}`);

writePNG(path.join(OUT, "plan-ville.png"), px, PW, PH);
const crop = (name, x0, y0, w, h) => {
  const S = P.PLAN_S, X = Math.round(x0 * S), Y = Math.round(y0 * S), CW = w * S, CH = h * S, out = new Uint8ClampedArray(CW * CH * 4);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) for (let k = 0; k < 4; k++) out[(y * CW + x) * 4 + k] = px[((Y + y) * PW + (X + x)) * 4 + k];
  writePNG(path.join(OUT, name), out, CW, CH);
};
crop("plan-place.png", 60, 44, 60, 46);          // la grand-place, la mairie, le tribunal
crop("plan-haute-ville.png", 116, 6, 76, 30);    // la terrasse et l'église
crop("plan-lac.png", 40, 130, 120, 38);          // le lac et le ponton
crop("plan-marche.png", 8, 56, 66, 50);          // la gare, le champ de foire
console.log(fail ? `\n${fail} ÉCHEC(S)` : "\nTout est vert.");
process.exit(fail ? 1 : 0);
