/* =============================================================================
   render-fruits.mjs — LES SPRITES DE FRUITS ET DE VERGERS, EN PNG. (zip 398)
   -----------------------------------------------------------------------------
   Guillaume : « Insiste sur la qualité des sprites de citrons, de blueberries,
   de fraises et framboises. »

   On ne peut pas insister sur la qualité de ce qu'on ne regarde pas. Cet outil
   est le premier de la ferme à rendre ses sprites hors navigateur — le
   labyrinthe a eu le sien au 397, et les quatre refontes graphiques faites en
   aveugle avant lui ont coûté quatre zips.

   Il écrit dans `tools/out/` :
     * chaque fruit, agrandi ×8 (on juge un sprite de 16 px agrandi, jamais à
       sa taille : à 16 px on ne voit pas où l'on s'est trompé) ;
     * chaque fruit posé sur TROIS FONDS différents — clair, sombre, et le
       violet des panneaux. C'est le seul moyen de voir si le cerne fait son
       travail : une myrtille bleu foncé sur fond violet, sans cerne, disparaît ;
     * chaque verger à ses quatre stades, côte à côte, pour juger la
       PROGRESSION — qui est ce qu'on regarde vraiment en jouant ;
     * les barquettes.

   Usage :  node tools/render-fruits.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, paletteOf, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const C = mods.fermeConstants, A = mods.fermeArt;

const S = A.buildSprites();

/* Les trois fonds. Ce ne sont pas des goûts : ce sont les trois surfaces sur
   lesquelles ces sprites apparaissent réellement dans le jeu — l'herbe, le
   panneau sombre du sac, et le violet des modales. */
const BACKDROPS = [
  ["herbe", [0x5f, 0x8f, 0x3f]],
  ["panneau", [0x1e, 0x1a, 0x28]],
  ["violet", [0x4a, 0x35, 0x60]],
];

function sheet(items, cellW, cellH, pad = 4) {
  const W = items.length * (cellW + pad) + pad, H = cellH + pad * 2;
  const s = makeCanvas(W, H);
  items.forEach((it, i) => {
    if (it.__px) s.ctx.drawImage(it, pad + i * (cellW + pad), pad);
  });
  return s;
}

console.log("\n=== sprites de fruits et de vergers → tools/out/ ===\n");
console.log("fruit         couleurs  pixels opaques");
console.log("-".repeat(44));

let worst = 99;
for (const f of C.FRUITS) {
  const spr = S.fruits[f.id];
  const st = paletteOf(spr.__px, spr.width, spr.height);
  worst = Math.min(worst, st.colors);
  console.log(f.name.padEnd(14) + String(st.colors).padStart(6) + String(st.opaque).padStart(12));

  // le fruit sur les trois fonds, agrandi ×8
  const cell = 16, W = (cell + 2) * 3 + 2, H = cell + 4;
  const s = makeCanvas(W, H);
  BACKDROPS.forEach(([, rgb], i) => {
    s.ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    s.ctx.fillRect(2 + i * (cell + 2), 2, cell, cell);
    s.ctx.drawImage(spr, 2 + i * (cell + 2), 2);
  });
  const big = scale(s.px, W, H, 8);
  writePNG(path.join(OUT, `fruit-${f.id}.png`), big.px, big.W, big.H);

  const p = S.punnets[f.id];
  const pb = scale(p.__px, p.width, p.height, 6);
  writePNG(path.join(OUT, `barquette-${f.id}.png`), pb.px, pb.W, pb.H);
}

// les vergers : les quatre stades côte à côte, une planche par espèce
for (let k = 0; k < C.ORCHARDS.length; k++) {
  const spec = C.ORCHARDS[k];
  const stages = S.orchards[k];
  const s = sheet(stages, 24, 28);
  const big = scale(s.px, s.width, s.height, 5);
  writePNG(path.join(OUT, `verger-${spec.id}.png`), big.px, big.W, big.H);
}

// la planche de contact : les quatre fruits ensemble, à taille réelle et ×4.
// C'est elle qui dit s'ils APPARTIENNENT AU MÊME MONDE — quatre sprites
// magnifiques mais dessinés dans quatre styles font un jeu moins cohérent que
// quatre sprites moyens dessinés dans le même.
{
  const all = C.FRUITS.map(f => S.fruits[f.id]);
  const s = sheet(all, 16, 16);
  const big = scale(s.px, s.width, s.height, 6);
  writePNG(path.join(OUT, "fruits-planche.png"), big.px, big.W, big.H);
}

console.log("-".repeat(44));
console.log(`
LIRE CES IMAGES. Quatre questions, dans cet ordre :
  1. LE FRUIT SE RECONNAÎT-IL SANS SON NOM ? Un citron sans ses deux tétons est
     une orange ; une framboise lisse est une fraise sans akènes.
  2. A-T-IL DU VOLUME ? Il faut au moins trois valeurs par masse. Le tableau
     ci-dessus compte les couleurs distinctes : sous 8, le sprite est colorié,
     pas peint. Pire ici : ${worst}.
  3. SURVIT-IL AUX TROIS FONDS ? C'est à ça que sert le cerne, et c'est sur le
     fond violet qu'on voit s'il manque.
  4. LA PROGRESSION DU VERGER SE LIT-ELLE ? Le stade « en fruits » doit sauter
     aux yeux de l'autre bout de la ferme : c'est la seule information que le
     joueur cherche vraiment en traversant son champ.

⚠️ Cet outil ne prouve RIEN de la ressemblance avec le rendu du navigateur : il
peint au pixel franc, ce que la ferme fait aussi, mais il ne connaît ni la
composition ni l'anticrénelage. Il sert à REGARDER, ce qui n'avait jamais été
possible côté ferme.
`);
