/* =============================================================================
   verify-noms.mjs — LA POLICE PIXEL DES NOMS ET LEUR MASQUAGE (2026-09-25,
   phase 2 de la feuille de route graphique de Valley Town).
   -----------------------------------------------------------------------------
   Ce que l'audit a vu : des noms au-dessus des têtes qui s'empilent (gare,
   foire, carte), qu'un lampadaire recouvre, et qui sont écrits lissés au milieu
   d'un monde en gros pixels. `components/ferme/pixelFont.js` règle l'écriture
   et la priorité ; `queueNameTag` (FermeGame.js) règle l'ordre de dessin.
   Ce banc tient les quatre choses qui ne se voient pas en relisant :

   1. LA COUVERTURE, SANS REPLI. Un nom dont une lettre manque retombe sur
      l'ancienne écriture — sans erreur, sans trace (§4, le repli menteur). On
      balaie donc TOUS les noms et libellés que le jeu écrit lui-même, dans les
      deux langues, et on exige qu'aucun ne tombe dans le repli. Le premier
      passage a trouvé « Impact 3 — fouillé » : le tiret cadratin manquait.
   2. LA BOÎTE CONTIENT LE DESSIN. Le masquage compare des boîtes : un pixel
      peint hors de sa boîte est un chevauchement que personne ne détecte.
   3. UN ACCENT NE TOUCHE PAS SA LETTRE. Premier jet vu à l'écran : le
      circonflexe du « ô » posé contre la lettre, « Jérôme » se lisait
      « Jér8me ». On exige une rangée d'air entre la marque et la lettre.
   4. LE MASQUAGE. Priorité, inertie (un nom affiché garde sa place face à un
      égal), fondu (jamais une disparition sèche), apparition immédiate.

   Usage :  node tools/verify-noms.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme, makeCanvas, writePNG, scale } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
const { pixelFont: F, fermeConstants: C, fermeStrings: STR } = await loadFerme(ROOT, ["pixelFont", "fermeConstants", "fermeStrings"]);

let fail = 0, n = 0;
const ok = (cond, label, detail) => {
  n++;
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};
const mk = (w, h) => { const c = makeCanvas(w, h); return { width: w, height: h, getContext: () => c.ctx, __px: c.px }; };

console.log("\n=== verify-noms — la police pixel des noms et leur masquage ===\n");

/* ═══════════════════════════════════════════════ 1. LA COUVERTURE */
const names = new Set();
for (const r of C.VISITOR_ROSTER) names.add(r.name);
for (const nm of ["Greg", "Soan", "Harald"]) names.add(nm);   // les PNJ nommés de la ferme (§12 CLAUDE.md)
for (const lang of ["fr", "en"]) {
  const L = STR.fstr(lang);
  names.add(L.leoName);
  for (const k of Object.keys(L)) if (/^map(You|DarkPassage|Town)/.test(k) && typeof L[k] === "string") names.add(L[k]);
  for (let i = 1; i <= 8; i++) { names.add(L.star.farm.mapImpact(i)); names.add(L.star.farm.mapImpactSeen(i)); }
}
const missing = [...names].filter((s) => !F.pixelTextSupported(s));
ok(names.size >= 60, "les noms et libellés du jeu sont bien lus", `${names.size} lus`);
ok(missing.length === 0, "aucun n'a besoin de l'ancienne écriture", missing.length ? "manquent : " + missing.map((s) => JSON.stringify(s)).join(", ") : "");
ok(!F.pixelTextSupported("Иван") && !F.pixelTextSupported("Zoé 🌾"), "un pseudo hors police est bien RECONNU comme tel (il garde l'ancienne écriture)");

/* ═══════════════════════════════════════════════ 2 et 3. LE DESSIN */
// Peint un texte seul, lettres en blanc et ombre en noir, sur un canevas transparent.
function paint(str, s, shadow) {
  const W = (F.pixelTextWidth(str) + 6) * s + 8, H = 16 * s;
  const cv = makeCanvas(W, H), cx = W / 2, by = 11 * s;
  F.drawPixelText(cv.ctx, mk, str, cx, by, s, "#ffffff", shadow ? "#000000" : null);
  const box = F.pixelTextBox(str, cx, by, s);
  let fx0 = 1e9, fx1 = -1, out = 0;
  const rows = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (cv.px[i + 3] === 0) continue;
    if (x < box.x || y < box.y || x >= box.x + box.w || y >= box.y + box.h) out++;
    if (cv.px[i] === 255) { if (x < fx0) fx0 = x; if (x > fx1) fx1 = x; rows.add(Math.floor((y - by) / s) + 6); }
  }
  return { out, fillW: fx1 - fx0 + 1, rows, cv, W, H };
}
let outBox = 0, badW = 0;
for (const s of [1, 2, 3]) for (const nm of names) {
  const r = paint(nm, s, true);
  outBox += r.out;
  if (r.fillW !== F.pixelTextWidth(nm) * s) badW++;
}
ok(outBox === 0, "la boîte de masquage contient tout le dessin, ombre comprise (échelles 1, 2, 3)", `${outBox} pixel(s) dehors`);
ok(badW === 0, "la largeur annoncée est la largeur peinte", `${badW} écart(s) sur ${names.size * 3}`);

// Une rangée d'air entre la marque et la lettre : on compare le glyphe accentué
// à sa lettre de base (décomposition Unicode), la différence EST la marque.
const accented = "àâäáãéèêëôöóòõùûüúÿýñçÀÂÄÁÉÈÊËÎÏÍÔÖÓÙÛÜÚŸÑÇîïíì".split("");
let touching = [];
for (const ch of accented) {
  const base = ch.normalize("NFD")[0];
  const a = paint(ch, 1, false);
  // ⚠️ Le « i » accentué perd son point : son corps est la seule tige (rangées
  // 2 à 5). Premier jet : comparé à « l », qui monte jusqu'en 0 — le banc
  // voyait un accent collé là où il y a une rangée d'air.
  const bRows = base === "i" ? new Set([2, 3, 4, 5]) : paint(base, 1, false).rows;
  const markRows = [...a.rows].filter((r) => !bRows.has(r));
  const bodyTop = Math.min(...[...bRows].filter((r) => r >= 0 && r <= 7));
  const bodyBottom = Math.max(...bRows);
  // la marque est soit au-dessus (accents), soit au-dessous (cédille)
  const above = markRows.filter((r) => r < bodyTop), below = markRows.filter((r) => r > bodyBottom);
  const gapAbove = above.length ? bodyTop - Math.max(...above) - 1 : 1;
  if (ch === "ç" || ch === "Ç") continue;              // la cédille s'attache à la lettre, c'est son dessin
  if (gapAbove < 1 || below.length) touching.push(ch);
}
ok(touching.length === 0, "aucun accent ne touche sa lettre (une rangée d'air, la leçon de « Jér8me »)", touching.join(" ") || `${accented.length - 2} glyphes accentués lus`);

/* ═══════════════════════════════════════════════ 4. LE MASQUAGE */
// Le rang que calcule le jeu (`paintLabels`) : palier, « était affiché », distance.
const rankOf = (fade, it) => [it.tier, fade.get(it.key) > 0.5 ? 0 : 1, it.d];
const frame = (fade, its, dt = 1 / 60) => F.pixelLabelMask(its.map((it) => ({ key: it.key, box: it.box, rank: rankOf(fade, it) })), fade, dt);
const box = (x) => ({ x, y: 0, w: 40, h: 10 });
{
  const fade = new Map();
  const a = frame(fade, [{ key: "moi", tier: 0, d: 0, box: box(0) }, { key: "res1", tier: 2, d: 1, box: box(20) }]);
  ok(a[0] === 1 && a[1] === 0, "moi d'abord : le résident qui me chevauche n'apparaît pas", `moi ${a[0]} · résident ${a[1]}`);
}
{
  const fade = new Map();
  const a = frame(fade, [{ key: "r1", tier: 2, d: 3, box: box(0) }, { key: "r2", tier: 2, d: 9, box: box(100) }]);
  ok(a[0] === 1 && a[1] === 1, "deux noms qui ne se touchent pas s'affichent tous les deux, d'emblée", `${a.join(" · ")}`);
  // r3 ENTRE dans le champ, plus près de moi que r1, et le chevauche.
  let b;
  for (let k = 0; k < 90; k++) b = frame(fade, [{ key: "r1", tier: 2, d: 3, box: box(0) }, { key: "r3", tier: 2, d: 2, box: box(10) }]);
  ok(b[0] === 1 && b[1] === 0, "un nom déjà affiché garde sa place face à un égal qui arrive", `r1 ${b[0].toFixed(2)} · r3 ${b[1].toFixed(2)}`);
}
{
  // Deux noms AFFICHÉS se rencontrent : le plus proche de moi gagne… puis garde
  // sa place quand les distances s'inversent (sinon ils s'échangeraient à
  // chaque pas en se croisant).
  const fade = new Map([["r1", 1], ["r2", 1]]);
  let a;
  for (let k = 0; k < 90; k++) a = frame(fade, [{ key: "r1", tier: 2, d: 3, box: box(0) }, { key: "r2", tier: 2, d: 2, box: box(10) }]);
  let b;
  for (let k = 0; k < 90; k++) b = frame(fade, [{ key: "r1", tier: 2, d: 1, box: box(0) }, { key: "r2", tier: 2, d: 4, box: box(10) }]);
  ok(a[1] === 1 && a[0] === 0 && b[1] === 1 && b[0] === 0, "deux noms affichés qui se rencontrent : le plus proche gagne, puis ne s'échange plus", `rencontre r1 ${a[0]} · r2 ${a[1]} — distances inversées r1 ${b[0]} · r2 ${b[1]}`);
}
{
  const fade = new Map([["r2", 1]]);
  const a = frame(fade, [{ key: "p", tier: 1, d: 5, box: box(0) }, { key: "r2", tier: 2, d: 1, box: box(10) }]);
  ok(a[1] > 0.5 && a[1] < 1, "un nom qui perd sa place s'EFFACE (fondu), il ne disparaît pas d'un coup", `après une image : ${a[1].toFixed(2)}`);
  let b = a;
  for (let k = 0; k < 60; k++) b = frame(fade, [{ key: "p", tier: 1, d: 5, box: box(0) }, { key: "r2", tier: 2, d: 1, box: box(10) }]);
  ok(b[1] === 0, "… et il est effacé en moins d'une seconde", `après 60 images : ${b[1]}`);
  frame(fade, [{ key: "p", tier: 1, d: 5, box: box(0) }]);
  ok(!fade.has("r2"), "un personnage sorti du champ est oublié (la mémoire ne grossit pas)");
}

/* La planche : les noms du jeu, à l'échelle de la ville (×2), sur pavé et sur herbe. */
{
  const list = [...names].filter((s) => !/^Impact/.test(s)).slice(0, 40);
  const W = 900, rowH = 22, H = Math.ceil(list.length / 3) * rowH + 20;
  const cv = makeCanvas(W, H);
  cv.ctx.fillStyle = "#c2ad8a"; cv.ctx.fillRect(0, 0, W / 2, H);
  cv.ctx.fillStyle = "#5a9a3c"; cv.ctx.fillRect(W / 2, 0, W / 2, H);
  list.forEach((nm, i) => F.drawPixelText(cv.ctx, mk, nm, 150 + (i % 3) * 300, 24 + Math.floor(i / 3) * rowH, 2, i % 2 ? "#ffe9a8" : "#ffffff", "#1a120c"));
  writePNG(path.join(OUT, "noms-police.png"), cv.px, W, H);
}

console.log(`\n${n - fail}/${n} contrôles passés. Planche : tools/out/noms-police.png\n`);
process.exit(fail ? 1 : 0);
