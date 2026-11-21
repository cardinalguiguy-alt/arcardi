/* =============================================================================
   verify-parapluie.mjs — LES PARAPLUIES SOUS LA PLUIE (2026-11-21, `components/ferme/parapluie.js`).
   Ce que le banc tient :
   1. QUI L'OUVRE : personne sans pluie ; sous une bruine, quelques-uns ; sous une averse, presque tous les habitants (un sur cinq n'en
      a pas) ; un joueur dès une pluie franche ; plus il pleut, plus il y en a (jamais un parapluie qui se ferme quand la pluie forcit) ;
      les huit couleurs servent ; même personnage, même pluie → même parapluie (déterministe, rien ne circule).
   2. LE DÔME : symétrique en silhouette ; plus large en bas qu'en haut (une demi-ellipse, pas une boîte) ; quatre pans alternés ;
      les bouts des cinq baleines sous le bord ; la pointe au milieu.
   3. LA PLACE : de face, le manche ne passe JAMAIS sur le visage (colonnes fines 8 à 23) et descend jusqu'à la main (rangée fine 30) ;
      le bord du dôme passe juste au-dessus de la tête ; de dos, pas de manche ; de profil, seulement entre le dôme et les cheveux.
   4. LE DESSIN : au pixel d'écran entier aux crans 2 à 4 (carrés de zoom/2 px calés sur leur grille).
   Usage : node tools/verify-parapluie.mjs        FALSIFY=visage (le manche au milieu) | boite (un dôme carré)
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { parapluie: UM } = await loadFerme(ROOT, ["parapluie"]);
const FALSIFY = process.env.FALSIFY || "";
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
console.log("\n=== verify-parapluie ===\n");
const seed = (i) => { let h = 2166136261; const s = "pnj-" + i; for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619); return h >>> 0; };

// 1. Qui l'ouvre
{
  const frac = (rain, pl = false) => { let n = 0; for (let i = 0; i < 1000; i++) if (UM.umbrellaOf(seed(i), rain, pl)) n++; return n / 1000; };
  ok(frac(0) === 0 && frac(0, true) === 0, "personne sans pluie");
  const fb = frac(0.15), fa = frac(0.7);
  ok(fb > 0.02 && fb < 0.3, "sous une bruine, quelques-uns", (100 * fb).toFixed(0) + " %");
  ok(fa > 0.72 && fa < 0.88, "sous une averse, presque tous les habitants (un sur cinq tête nue)", (100 * fa).toFixed(0) + " %");
  ok(!UM.umbrellaOf(seed(1), 0.08, true) && !!UM.umbrellaOf(seed(1), 0.14, true), "un joueur ouvre le sien dès une pluie franche");
  let closes = 0; for (let i = 0; i < 300; i++) { let was = false; for (let r = 0; r <= 1.0001; r += 0.02) { const o = !!UM.umbrellaOf(seed(i), r, false); if (was && !o) closes++; was = o; } }
  ok(closes === 0, "quand la pluie forcit, aucun parapluie ne se ferme");
  const cols = new Set(); for (let i = 0; i < 400; i++) { const u = UM.umbrellaOf(seed(i), 1, true); if (u) cols.add(u.col); }
  ok(cols.size === UM.PARAPLUIE.COLORS.length, "les " + UM.PARAPLUIE.COLORS.length + " couleurs servent", cols.size + " vues");
  ok(JSON.stringify(UM.umbrellaOf(seed(7), 0.6, false)) === JSON.stringify(UM.umbrellaOf(seed(7), 0.6, false)), "même personnage, même pluie : même parapluie");
}
// 2. Le dôme
{
  const { W, H } = UM.PARAPLUIE;
  let g = UM.domeGrid();
  if (FALSIFY === "boite") { g = new Uint8Array(W * H); for (let y = 1; y < 8; y++) for (let x = 0; x < W; x++) g[y * W + x] = 1; }
  let sym = true; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!!g[y * W + x] !== !!g[y * W + W - 1 - x]) sym = false;
  ok(sym, "la silhouette est symétrique");
  const width = (y) => { let n = 0; for (let x = 0; x < W; x++) if (g[y * W + x] === 1 || g[y * W + x] === 2) n++; return n; };
  ok(width(1) < width(4) - 8 && width(4) < width(7), "une demi-ellipse : étroite en haut, pleine en bas", [1, 2, 3, 4, 5, 6, 7].map(width).join(" "));
  const row7 = [...g.slice(7 * W, 8 * W)].map((v) => v).join("");
  let switches = 0; for (let x = 1; x < W; x++) if (g[7 * W + x] !== g[7 * W + x - 1]) switches++;
  ok(switches === 3 && g[7 * W] === 1, "quatre pans alternés, le pan éclairé à gauche (la lumière du nord-ouest)", row7);
  const tips = [...g.slice(8 * W, 9 * W)].filter((v) => v === 3).length;
  ok(tips === 6, "les bouts des cinq baleines sous le bord (celle du milieu sur deux pixels : largeur paire)", tips + " pixels");
  ok(g[W / 2 - 1] === 3 && g[W / 2] === 3, "la pointe au milieu");
}
// 3. La place (en px d'art ; le sprite commence à (0, 0) ; une rangée fine = ½ px)
{
  let faceHit = [], reach = [], rim = [];
  for (const side of [1, -1]) {
    let pl = UM.umbrellaPlace(0, 0, "down", side, 1);
    if (FALSIFY === "visage") pl = { ...pl, sx: 8 };
    const col = Math.round(pl.sx * 2);
    if (pl.sy0 * 2 < 20 && col >= 8 && col <= 23) faceHit.push("main " + side + " colonne fine " + col);
    if (Math.round(pl.sy1 * 2) !== 30) reach.push("main " + side + " : rangée " + pl.sy1 * 2);
    const bottom = (pl.dy + 4) * 2;   // le bord du dôme (rangée 7 de la grille), en rangées fines du sprite
    if (bottom > 0 || bottom < -4) rim.push("bord à la rangée fine " + bottom);
  }
  ok(!faceHit.length, "de face, le manche ne passe jamais sur le visage (colonnes fines 8 à 23)", faceHit.join(", "));
  ok(!reach.length, "de face, le manche descend jusqu'à la main (rangée fine 30)", reach.join(", "));
  ok(!rim.length, "le bord du dôme passe juste au-dessus de la tête (0 à 2 px d'art) : ni chapeau posé, ni ombrelle perchée", rim.join(", "));
  ok(!UM.umbrellaPlace(0, 0, "up", 1).stickVisible, "de dos, le manche est caché");
  const pr = UM.umbrellaPlace(0, 0, "right", 1);
  ok(pr.stickVisible && Math.round(pr.sy1 * 2) <= 2 && pr.sy1 > pr.sy0, "de profil, le manche ne se voit qu'entre le dôme et les cheveux (jamais à travers la tête)", "rangées fines " + pr.sy0 * 2 + " à " + pr.sy1 * 2);
}
// 4. Le dessin
{
  for (const z of [2, 3, 4]) {
    const r = []; let id = false;
    const ctx = { save() {}, restore() { id = false; }, getTransform: () => ({ a: z, d: z, e: 5.3, f: -1.7 }), setTransform(a, b, c, d, e, f) { id = a === 1 && e === 0; },
      fillRect(x, y, w, h) { r.push([x, y, w, h, id]); }, set fillStyle(v) {} };
    UM.drawUmbrella(ctx, { ox: 10.3, oy: 4.1, face: "down", side: 1, col: "#c8323c", dark: "#aa141e", bob: 0.5 });
    const cell = Math.max(1, Math.round(z / 2));
    const crisp = r.every(([x, y, w, h, i]) => i && Number.isInteger(x) && Number.isInteger(y) && x % cell === 0 && y % cell === 0 && w % cell === 0 && h % cell === 0);
    ok(r.length > 100 && crisp, "cran " + z + " : au pixel d'écran entier (carrés de " + cell + " px calés sur leur grille)", r.length + " rectangles");
  }
}
console.log("\n" + nOk + "/" + (nOk + fail) + (fail ? "  — " + fail + " ÉCHEC(S)" : "  — tout est vert") + "\n");
process.exit(fail ? 1 : 0);
