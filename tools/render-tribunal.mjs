/* =============================================================================
   render-tribunal.mjs — LE MOBILIER DU TRIBUNAL ET DE LA VILLE, EN PNG. (426)
   -----------------------------------------------------------------------------
   Même raison d'être que render-fruits.mjs au 398, et la même phrase suffit :
   ON NE PEUT PAS SOIGNER CE QU'ON NE REGARDE PAS. Ce zip ajoute vingt-cinq
   meubles d'intérieur et huit décors de rue, tous dessinés au pixel dans
   fermeArt.js ; les juger sans les voir reviendrait à refaire les quatre
   refontes en aveugle que le 397 a payées.

   ⚠️ CE QU'IL NE MONTRE PAS : la scène. Le rendu d'un niveau du tribunal vit
   dans la closure de FermeGame.js et ne peut pas être appelé hors navigateur ;
   la GÉOMÉTRIE (circulation, portes, escaliers) est donc contrôlée ailleurs, par
   tools/verify-vallee.mjs. Les deux bancs sont complémentaires et aucun ne
   remplace l'autre.

   ⚠️ ET LE FOND N'EST PAS DÉCORATIF. Un meuble se juge sur le sol où il sera
   POSÉ : le parquet des bureaux, le marbre du hall, la dalle du sous-sol. Un
   fauteuil sombre sur fond blanc paraît net et disparaît sur le parquet.

   Usage :  node tools/render-tribunal.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt;
const C = mods.fermeConstants;
const S = A.buildSprites();

// Les trois sols du bâtiment, repris À L'IDENTIQUE des couleurs de
// drawCourtFrame — un fond « à peu près » ne prouverait rien.
const FLOORS = [
  ["parquet", [0x8a, 0x64, 0x40]],
  ["marbre", [0xcd, 0xc9, 0xbd]],
  ["dalle", [0x6e, 0x6f, 0x74]],
];
const GRASS = [0x5c, 0x9e, 0x4e];

function sheet(imgs, bg, cell, pad = 6) {
  const cols = Math.min(9, imgs.length), rows = Math.ceil(imgs.length / cols);
  const W = cols * (cell + pad) + pad, H = rows * (cell + pad) + pad;
  const s = makeCanvas(W, H);
  s.ctx.fillStyle = `rgba(${bg[0]},${bg[1]},${bg[2]},1)`;
  s.ctx.fillRect(0, 0, W, H);
  imgs.forEach((im, i) => {
    if (!im || !im.__px) return;
    const cx = pad + (i % cols) * (cell + pad), cy = pad + Math.floor(i / cols) * (cell + pad);
    // Ancrage par le BAS, comme dans le jeu : c'est la seule façon de voir si
    // un meuble « flotte » ou s'il pose bien sur sa case.
    s.ctx.drawImage(im, cx + Math.floor((cell - im.width) / 2), cy + cell - im.height);
    s.ctx.fillStyle = "rgba(0,0,0,0.35)";
    s.ctx.fillRect(cx, cy + cell, cell, 1);   // la ligne de sol
  });
  return s;
}

// Combien de couleurs, combien de pixels peints : deux nombres qui suffisent à
// repérer un sprite vide (un `kind` mal orthographié) ou un sprite plat.
function stats(im) {
  const cols = new Set();
  let opaque = 0;
  for (let i = 0; i < im.__px.length; i += 4) {
    if (im.__px[i + 3] > 8) { opaque++; cols.add(`${im.__px[i]},${im.__px[i + 1]},${im.__px[i + 2]}`); }
  }
  return { cols: cols.size, opaque };
}

console.log("\n=== mobilier du tribunal → tools/out/ ===\n");
console.log("meuble            couleurs  px opaques");
console.log("-".repeat(42));
const kinds = Object.keys(S.courtProps);
let thin = [];
for (const k of kinds) {
  const st = stats(S.courtProps[k]);
  console.log(`${k.padEnd(18)}${String(st.cols).padStart(6)}${String(st.opaque).padStart(11)}`);
  // ⚠️ LE SEUIL ATTRAPE LE SPRITE DE SECOURS. Un `kind` inconnu rend un carré
  // rose de 12×12 : 1 couleur, 144 pixels. Deux couleurs ou moins = suspect.
  if (st.cols <= 2) thin.push(k);
}
if (thin.length) console.log(`\n⚠️  sprites suspects (≤ 2 couleurs) : ${thin.join(", ")}`);

for (const [name, bg] of FLOORS) {
  const sh = sheet(kinds.map(k => S.courtProps[k]), bg, 48);
  const up = scale(sh.px, sh.width, sh.height, 3);
  writePNG(path.join(OUT, `tribunal-mobilier-${name}.png`), up.px, up.W, up.H);
}
// Les décors de rue, sur l'herbe — c'est là qu'ils vivent.
const townKinds = [
  ["etal-0", S.townStalls[0]], ["etal-1", S.townStalls[1]], ["etal-2", S.townStalls[2]], ["etal-3", S.townStalls[3]],
  ["kiosque", S.townKiosk], ["tombe", S.townGrave], ["jardiniere", S.townPlanter],
  ["panneau-rue", S.townStreetSign], ["statue", S.townStatue], ["puits", S.townWell], ["caisse", S.townCrate],
];
console.log("\n=== décors de rue → tools/out/ ===\n");
for (const [n, im] of townKinds) {
  const st = stats(im);
  console.log(`${n.padEnd(18)}${String(st.cols).padStart(6)}${String(st.opaque).padStart(11)}`);
}
{
  const sh = sheet(townKinds.map(t => t[1]), GRASS, 64);
  const up = scale(sh.px, sh.width, sh.height, 3);
  writePNG(path.join(OUT, "ville-decors.png"), up.px, up.W, up.H);
}
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — LES DEUX COMMERCES DE LA HAUTE-VILLE ET LE TABLEAU DES NOUVELLES.
   ⚠️ SUR LEUR VRAI SOL, ET LA HAUTE-VILLE EST DALLÉE DE PIERRE CLAIRE, pas
   herbue : un bâtiment noir jugé sur du vert paraît net et se dilue sur du
   gris. C'est la leçon du fond de ce banc, appliquée aux bâtiments.
   ⚠️ Et ils sont rendus À CÔTÉ DE LA GARE, qui est le repère : la demande du
   zip est la COHÉRENCE visuelle, et une cohérence se juge en mettant les
   choses l'une à côté de l'autre, jamais l'une après l'autre. */
const PAVE = [0xb3, 0xb2, 0xb8];
const bldKinds = [
  ["maison-garfield", S.townBoutique], ["salon", S.townSalon],
  ["tableau-nouvelles", S.townNewsBoard], ["gare", S.station],
  ["eglise", S.church], ["mairie", S.townHall2], ["tribunal", S.courthouse],
];
console.log("\n=== zip 427 — bâtiments de la Haute-Ville → tools/out/ ===\n");
for (const [n, im] of bldKinds) {
  const st = stats(im);
  console.log(`${n.padEnd(18)}${String(st.cols).padStart(6)}${String(st.opaque).padStart(11)}`);
}
{
  const sh = sheet(bldKinds.map(t => t[1]), PAVE, 200, 10);
  const up = scale(sh.px, sh.width, sh.height, 2);
  writePNG(path.join(OUT, "ville-batiments-427.png"), up.px, up.W, up.H);
}
/* LA GARDE-ROBE, PORTÉE. ⚠️ UN VÊTEMENT NE SE JUGE PAS À PLAT : ce qu'on veut
   voir, c'est s'il tient sur les trois orientations du personnage et s'il ne
   déborde pas du cadre de 16×24 (le canevas DÉCOUPE en silence ce qui dépasse —
   c'est exactement comme ça que le premier haut-de-forme est sorti décapité). */
{
  const rows = [];
  const push = (label, look) => rows.push([label, S.getChar("f", 1, false, false, false, false, false, false, look)]);
  push("aucune", null);
  C.WARDROBE_HATS.forEach((h, i) => push("chapeau:" + h.id, "w" + (i + 1) + "000"));
  C.WARDROBE_SCARVES.forEach((h, i) => push("echarpe:" + h.id, "w0" + (i + 1) + "00"));
  C.WARDROBE_OUTFITS.forEach((h, i) => push("tenue:" + h.id, "w00" + (i + 1) + "0"));
  C.WARDROBE_TINTS.forEach((h, i) => push("teinte:" + h.id, "w000" + (i + 1)));
  push("tout", "w3158");
  console.log("\n=== zip 427 — la garde-robe portée → tools/out/ ===\n");
  /* ⚠️ UNE GRILLE, PAS UNE FRISE. Vingt-quatre tenues alignées sur une seule
     rangée donnent une image de cinq mille pixels de large qu'on ne peut plus
     regarder — c'est-à-dire un banc de rendu qui ne sert plus à rien. Six par
     rangée, agrandies six fois : à cette échelle on voit un pixel de travers,
     et c'est le seul but. */
  const perRow = 6, cellW = 16 * 4, cellH = 24 * 3, pad = 6;
  const gr = Math.ceil(rows.length / perRow);
  const sh = makeCanvas(perRow * (cellW + pad) + pad, gr * (cellH + pad) + pad);
  sh.ctx.fillStyle = "rgba(92,158,78,1)"; sh.ctx.fillRect(0, 0, sh.width, sh.height);
  rows.forEach(([label, im], i) => {
    sh.ctx.drawImage(im, pad + (i % perRow) * (cellW + pad), pad + Math.floor(i / perRow) * (cellH + pad));
    console.log(`${label.padEnd(20)} ${stats(im).cols} couleurs`);
  });
  const up = scale(sh.px, sh.width, sh.height, 5);
  writePNG(path.join(OUT, "garde-robe-427.png"), up.px, up.W, up.H);
}
/* ══════════════════════════════════════════════════════════════════════════
   ZIP 431 — LA SYMÉTRIE DES FAÇADES, MESURÉE.
   ──────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE CONTRÔLE EXISTE PARCE QUE GUILLAUME A VU EN JEU CE QU'AUCUN BANC NE
   REGARDAIT (« même type de décalage pour l'architecture extérieure du
   tribunal »). La colonnade du tribunal partait de x = 18 au lieu de 12 : huit
   fûts parfaitement réguliers, mais SIX PIXELS à droite du fronton qui les
   couronne. Le péristyle penchait donc par rapport à son propre bâtiment.

   ⚠️ ET C'EST INVISIBLE EN REGARDANT LE DESSIN. Une planche de sprites montre
   des colonnes bien alignées entre elles ; l'erreur n'est pas dans la rangée,
   elle est dans son RAPPORT à l'axe. C'est la leçon du 429 (« un décor ne se
   juge pas contre d'autres décors ») transposée à l'intérieur d'un seul sprite,
   et la seule façon de l'attraper est de compter des pixels.

   Méthode : on replie l'image sur son axe vertical et on somme, colonne par
   colonne, l'écart entre une colonne et son miroir, rapporté au total peint.
   ⚠️ ON NE MESURE QUE LES FAÇADES CENSÉES ÊTRE SYMÉTRIQUES. L'hôtel de ville
   est ASYMÉTRIQUE EXPRÈS (beffroi décalé, c'est ce qui le rend reconnaissable —
   note du 425) et l'église porte son clocher sur le flanc : les inscrire ici
   reviendrait à demander un jour qu'on les « corrige », c'est-à-dire à détruire
   ce qui les distingue. Un banc qui contrôle la mauvaise chose est pire qu'un
   banc absent.
   ══════════════════════════════════════════════════════════════════════════ */
{
  function asym(im) {
    const px = im.__px || im.px;
    const colW = new Array(im.width).fill(0);
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
      if (px[(y * im.width + x) * 4 + 3] > 8) colW[x]++;
    }
    let diff = 0, tot = 0;
    for (let x = 0; x < im.width; x++) { diff += Math.abs(colW[x] - colW[im.width - 1 - x]); tot += colW[x]; }
    return tot ? (diff / tot) * 100 : 0;
  }
  const SYM = [
    ["tribunal", S.courthouse, 1.0, "fronton, colonnade et perron sur le même axe"],
    ["gare", S.station, 1.0, "un quai couvert, pignon centré"],
    ["Maison Garfield", S.townBoutique, 1.0, "vitrine à deux battants"],
    ["arche du marché", S.townMarketArch, 1.0, "deux poteaux, un panneau au milieu"],
    ["fontaine", S.plazaFountain, 3.0, "vasque ronde, jet au centre"],
  ];
  console.log("\n=== zip 431 — la symétrie des façades qui doivent l'être ===\n");
  console.log("façade               asym%   seuil   verdict");
  let bad = 0;
  for (const [n, im, lim, why] of SYM) {
    if (!im) { console.log(`${n.padEnd(20)} SPRITE MANQUANT`); bad++; continue; }
    const a = asym(im);
    const okk = a <= lim;
    if (!okk) bad++;
    console.log(`${n.padEnd(20)}${a.toFixed(1).padStart(6)}${lim.toFixed(1).padStart(8)}   ${okk ? "OK" : "⚠️ PENCHE"}   ${why}`);
  }
  console.log(bad ? `\n⚠️  ${bad} façade(s) hors seuil.\n`
                  : "\nToutes les façades symétriques le sont au pixel.\n");
}

console.log("\nÉcrit : tribunal-mobilier-{parquet,marbre,dalle}.png, ville-decors.png, ville-batiments-427.png, garde-robe-427.png\n");
