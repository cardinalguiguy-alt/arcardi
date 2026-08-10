/* =============================================================================
   import-planche.mjs — LA PLANCHE DE GUILLAUME, DEVENUE DES SPRITES. (439)
   -----------------------------------------------------------------------------
   ⚠️⚠️ POURQUOI CET OUTIL EXISTE, ET POURQUOI IL REMPLACE DU CODE ÉCRIT LA
   VEILLE. Le 439 a d'abord TRANSCRIT la planche à la main, en `fillRect`, objet
   par objet. Verdict de Guillaume : « il y a toujours un écart […] c'est
   vraiment en dessous de mon niveau d'exigence », puis, sans ambiguïté : « je
   veux simplement que tu copies et colles les sprites ». Il a raison, et la
   raison est structurelle : une transcription à la main est une IMITATION, et
   une imitation d'un dessin de trente couleurs par quelqu'un qui le regarde ne
   converge jamais. On copie donc les pixels.

   ⚠️ CE QUE ÇA NE CHANGE PAS : LE JEU NE CHARGE TOUJOURS AUCUN PNG. La sortie
   est un MODULE JS de données (palette + rangées de caractères) que
   `fermeArt.js` rejoue en canevas au chargement, exactement comme le reste.
   C'est délibéré : `CLAUDE.md` §9 dit qu'un PNG dans la ferme créerait un
   troisième pipeline (chargement, cache, palette hors-fichier) et casserait les
   bancs de rendu, qui n'ont pas de navigateur. Ici les bancs continuent de
   marcher sans une ligne de changement, et `refs/` n'est plus nécessaire à
   l'exécution — seulement à la RÉGÉNÉRATION.

   La chaîne, et le pourquoi de chaque maillon, est dans `lib-planche.mjs` :
   rééchantillonnage à 3,25 (mesuré), médiane 3×3 (jamais de moyenne), détourage
   par remplissage depuis le bord (jamais par « ce pixel est-il gris ? »),
   quantification k-moyennes en luminance pondérée, semis déterministe.

   ⚠️ LE CATALOGUE EST ÉCRIT À LA MAIN, ET C'EST LE SEUL ENDROIT QUI LE SOIT.
   Les boîtes viennent de la segmentation automatique (composantes connexes du
   non-fond, sans dilatation) ; les NOMS, eux, ne peuvent venir que d'un œil
   humain sur la planche de contact. `cut()` recadre de toute façon sur le
   contenu : une boîte un peu large ne décale rien.

   Usage :  node tools/import-planche.mjs
   ========================================================================== */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { nativeSheet, backgroundMask, cut, slice, quantize, toRGBA } from "./lib-planche.mjs";
import { makeCanvas, writePNG, scale } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
const SHEET1 = path.join(ROOT, "refs", "Code_Generated_Image.png");

/* Le catalogue. [nom, x, y, w, h, K] — K = nombre de couleurs gardées.
   ⚠️ K N'EST PAS UNIFORME, ET C'EST MESURÉ : un houppier de saule a besoin de
   seize valeurs pour garder ses mèches, un seau en a assez de huit. Trop peu,
   le dessin se poste'rise ; trop, on garde du bruit de génération que la
   quantification est justement là pour retirer. */
const CATALOGUE = [
  // — les ouvrages de bois et de pierre
  ["archBridge",   8,  40, 81, 54, 16],
  ["fence",       98,  40, 67, 53, 14],
  ["woodBox",    172,  47, 38, 43, 12],
  ["stoneBlock", 218,  46, 21, 21, 10],
  /* ⚠️ `"p"` = découpe PARTIELLE assumée. Le muret de la planche est un L : on
     n'en prend que la volée droite, parce qu'un décor de rive se pose par
     tronçons et qu'un coin ne se répète pas. Le contrôle de troncature ci-dessous
     doit donc le laisser passer — mais il faut le DIRE, sinon la prochaine
     lecture croira à un oubli. */
  ["lowWall",    212,  68, 48, 28, 14, "p"],
  // — les arbres de la planche
  ["treeFir",      6, 107, 26, 46, 12],
  ["treeApple",   36, 101, 27, 52, 14],
  ["treeWillow",  70, 100, 44, 53, 16],
  ["treeMagnolia",117, 101, 47, 52, 16],
  // — la végétation basse
  ["hedgeBush",  170, 101, 16, 18, 10],
  ["grassTuft",  320,  96, 44, 23, 10],
  // — les sièges
  ["benchWood",  173, 130, 36, 21, 12],
  ["benchStone", 216, 132, 33, 19, 12],
  ["tableSet",   252, 125, 42, 29, 12],
  ["benchWall",  305, 125, 54, 32, 14],
  // — le mobilier de jardin
  ["hangLamp",   158, 159, 21, 38, 14],
  ["flowerTrough",184,166, 31, 28, 16],
  ["bonsai",     220, 161, 30, 35, 14],
  ["roseBox",    256, 163, 37, 32, 14],
  ["potPink",    299, 165, 22, 31, 14],
  ["oilLamp",    328, 176, 10, 20, 10],
  ["potReeds",   345, 163, 19, 33, 12],
  // — les massifs et les touffes
  ["lavender1",    7, 213, 24, 26, 12],
  ["lavender2",   36, 214, 23, 25, 12],
  ["goldBush1",  159, 207, 28, 28, 12],
  ["goldBush2",  189, 206, 29, 29, 12],
  ["goldBush3",  220, 206, 29, 29, 12],
  ["flowersPurple",7,243, 23, 24, 12],
  ["flowersWhite",35, 243, 23, 24, 12],
  ["flowersRed",  62, 241, 26, 26, 12],
  ["flowersYellow",91,242, 24, 25, 12],
  // — l'eau et ses bords
  ["lilyPadBloom",258,206, 18, 15, 10],
  ["lilyPads",   276, 205, 17, 22, 10],
  ["rod",        298, 217, 19, 26, 10],
  ["reedsWater", 323, 210, 41, 37, 14],
  ["lilyFlower", 160, 248, 20, 17, 10],
  ["lilyPads2",  184, 244, 25, 23, 10],
  ["reeds",      213, 241, 15, 26, 10],
  /* ⚠️ `"p"` ici aussi, et pour une raison différente : le groupe de galets TOUCHE
     le coffre voisin par son cerne sur la planche. La propagation du contrôle
     passe donc de l'un à l'autre et signale 159 pixels « hors boîte » qui sont
     le coffre. La boîte, elle, est juste — vérifié sur `planche-importee.png`,
     où les trois galets sortent entiers et sans un pixel de coffre. */
  ["stones",     249, 243, 32, 29, 10, "p"],
  ["chest",      281, 249, 17, 16, 10],
  ["bucket",     305, 250, 13, 15, 10],
  ["puddle",     324, 254, 19, 10,  8],
  ["flatStone",  348, 255, 13,  7,  8],
  // — les haies
  ["hedgeRow",    99,   6, 62, 30, 12],
  ["grassPatch", 172,  10, 39, 24, 10],
];

/* ⚠️⚠️ LES TUILES DE HAIE SONT DÉCOUPÉES « BRUT », SANS RECADRAGE, et il faut
   dire pourquoi c'est une autre opération. Un DÉCOR se recadre sur son contenu :
   sa boîte n'a pas de sens, seule sa silhouette en a une. Une TUILE, elle, tient
   sa largeur de la CASE : recadrée, elle perdrait ses colonnes de bord et deux
   cases voisines laisseraient voir une couture d'un pixel — c'est-à-dire qu'on
   redessinerait la grille de 16 px que les zips 434 et 438 ont passé deux passes
   à effacer.
   ⚠️ ET LEURS ABSCISSES SONT DES MULTIPLES DE 16, ce qui n'est pas une
   coïncidence heureuse mais la confirmation de la mesure d'échelle : la haie de
   la planche est dessinée SUR la grille de cases du jeu. Vérifiable à l'œil sur
   `tools/out/ref-haie.png`. */
const TUILES = [
  ["hedgeMid",  112,  3, 16, 20, 10],   // une case de haie taillée, au milieu d'un tronçon
  ["hedgeEnd",   96,  3, 16, 20, 10],   // le bout ouest ; l'est est son miroir (voir fermeArt)
  ["hedgeSolo",  96, 17, 16, 18, 10],   // une haie isolée : c'est un buisson, pas un tronçon
  /* ⚠️⚠️ LA LAME DE PONTON EST TRANSPOSÉE, ET C'EST LA SEULE TRANSFORMATION DE
     TOUT L'IMPORT. Le pont de la planche est vu EN ÉLÉVATION et franchit
     l'image de gauche à droite : ses planches sont donc VERTICALES, comme il se
     doit — les lames d'un tablier sont perpendiculaires à la marche. Le ponton
     du lac, lui, court du nord au sud : ses lames doivent être HORIZONTALES.
     Recopier la tuile telle quelle donnerait un ponton dont on voit les lames
     dans le sens de la longueur, c'est-à-dire un plancher qu'on lit comme un
     mur. On échange donc x et y — sur un carré de 16, c'est exact et sans
     perte, et le grain du bois de la planche est conservé au pixel près. */
  ["deckPlank",  40, 54, 16, 16, 10, "t"],
];

const sh = nativeSheet(SHEET1);
const bg = backgroundMask(sh);

/* L'encodage. Une rangée = une chaîne ; un caractère = un index de palette
   (`0`..`o` pour 0..63), le point = transparent.
   ⚠️ LISIBLE PLUTÔT QUE COMPACT, ET C'EST UN CHOIX. Un base64 serait deux fois
   plus court et parfaitement illisible en revue : le jour où un sprite sort de
   travers, on veut pouvoir REGARDER la donnée, comme on regarde un `fillRect`.
   Le fichier fait une centaine de kilo-octets, à comparer aux 23 000 lignes de
   `FermeGame.js` — ce n'est pas là que se joue le poids du projet. */
const ENC = (i) => String.fromCharCode(48 + i);

const out = [];
const report = [];
const clipped = [];
for (const [name, x, y, w, h, K, mode] of [...CATALOGUE, ...TUILES]) {
  const raw = TUILES.some(t => t[0] === name);
  let s = raw ? slice(sh, bg, x, y, w, h) : cut(sh, bg, x, y, w, h, 0);
  if (!s) { console.log("  ⚠️  " + name + " : rien dans la boîte"); continue; }
  if (mode === "t") {
    const px = new Uint8ClampedArray(s.w * s.h * 4);
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) {
      const a = (j * s.w + i) * 4, b = (i * s.h + j) * 4;
      for (let k = 0; k < 4; k++) px[b + k] = s.px[a + k];
    }
    s = { w: s.h, h: s.w, px };
  }
  const q = quantize(s, K);
  const rows = [];
  for (let j = 0; j < q.h; j++) {
    let r = "";
    for (let i = 0; i < q.w; i++) { const v = q.idx[j * q.w + i]; r += v === 255 ? "." : ENC(v); }
    rows.push(r);
  }
  /* ⚠️⚠️ LE SEUL CONTRÔLE QUI COMPTE À L'IMPORT : LA BOÎTE EST-ELLE ASSEZ
     GRANDE ? Le catalogue est écrit à la main ; une boîte trop courte d'un
     pixel coupe une branche, un pied de pot ou l'ombre d'un arbre — et `cut`
     recadre alors sur ce qui reste, donc le sprite sort PLAUSIBLE et FAUX.
     C'est le stub menteur du §10 appliqué à un découpage : rien ne lève,
     l'objet est juste un peu amputé, et ça ne se voit qu'en comparant avec la
     planche à l'œil.
     ⚠️ ON NE TESTE PAS « LE DESSIN TOUCHE-T-IL LE BORD DE LA BOÎTE » — première
     version, écrite puis jetée : elle accusait les QUARANTE-CINQ objets, parce
     que les boîtes viennent de la segmentation automatique et sont donc, par
     construction, les boîtes englobantes exactes. Un contrôle qui accuse tout
     n'accuse rien.
     La bonne question est : *en élargissant la boîte de deux pixels, trouve-t-on
     ENCORE du dessin ?* Si oui, la boîte coupait. Sinon, l'objet est bien
     entier — et les deux pixels de marge sont du fond, ce qui est précisément
     ce qu'on veut vérifier.
     ⚠️ C'est aussi ce qui remplace « aucun pixel sur le bord du canevas » côté
     banc de rendu. Cette règle-là existait parce que les sprites étaient
     DESSINÉS et pouvaient déborder d'un canevas trop petit ; un sprite importé
     est recadré au plus juste, donc il touche ses quatre bords par définition.
     La question utile s'est déplacée d'un cran en amont : ce n'est plus le
     canevas qui peut couper, c'est la boîte. */
  /* ⚠️⚠️ ET LA CROISSANCE NE SUFFIT PAS NON PLUS — deuxième version jetée.
     Élargir la boîte de deux pixels fait « grandir » quatre objets, mais ce
     qu'on trouve en plus est le VOISIN : sur la planche, les nénuphars et les
     galets sont posés à un ou deux pixels les uns des autres. Le contrôle
     grossissait donc sans fin, boîte après boîte, en accusant à chaque fois un
     objet parfaitement entier.
     Ce qui distingue une troncature d'un voisin est la CONNEXITÉ : un dessin
     coupé se prolonge par des pixels COLLÉS à lui, un voisin est une tache
     séparée. On propage donc depuis le contenu de la boîte d'origine, et on ne
     s'alarme que si la propagation sort de cette boîte. */
  if (!raw && mode !== "p" && s.src) {
    const seen = new Set(), st = [];
    for (let yy = s.src.y; yy < s.src.y + s.src.h; yy++) for (let xx = s.src.x; xx < s.src.x + s.src.w; xx++) {
      if (!bg[yy * sh.w + xx]) { const k = yy * sh.w + xx; if (!seen.has(k)) { seen.add(k); st.push(k); } }
    }
    let out2 = 0;
    while (st.length) {
      const i2 = st.pop(), ix = i2 % sh.w, iy = (i2 / sh.w) | 0;
      if (ix < s.src.x || iy < s.src.y || ix >= s.src.x + s.src.w || iy >= s.src.y + s.src.h) out2++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = ix + dx, ny = iy + dy;
        if (nx < 0 || ny < 0 || nx >= sh.w || ny >= sh.h) continue;
        const k = ny * sh.w + nx;
        if (seen.has(k) || bg[k]) continue;
        seen.add(k); st.push(k);
      }
    }
    if (out2) clipped.push(`${name} : ${out2} pixel(s) du MÊME dessin hors de la boîte`);
  }
  out.push(`  ${name}: { w: ${q.w}, h: ${q.h},\n    pal: [${q.pal.map(c => `"${c}"`).join(", ")}],\n    rows: [\n${rows.map(r => `      "${r}",`).join("\n")}\n    ] },`);
  report.push({ name, w: q.w, h: q.h, K: q.pal.length, from: q.colors });
}

const header = `/* ═══════════════════════════════════════════════════════════════════════════
   planche.js — LES SPRITES DE LA PLANCHE DE RÉFÉRENCE, EN DONNÉES.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ FICHIER GÉNÉRÉ PAR \`tools/import-planche.mjs\`. NE PAS ÉDITER À LA MAIN :
   toute retouche serait perdue à la prochaine importation. Pour changer un
   dessin, on change la PLANCHE (\`refs/\`) ou le catalogue de l'outil.

   ⚠️ CE SONT LES PIXELS DE LA PLANCHE DE GUILLAUME, PAS UNE TRANSCRIPTION.
   Demande explicite du 439 : « je veux simplement que tu copies et colles les
   sprites ». Chaîne complète et justifiée dans \`tools/lib-planche.mjs\` —
   rééchantillonnage à 3,25 (le pas natif MESURÉ de la planche, qui se trouve
   être exactement la case de 16 px du jeu), détourage par remplissage depuis le
   bord, quantification k-moyennes déterministe.

   ⚠️ LE JEU NE CHARGE AUCUN PNG : \`fermeArt.js\` rejoue ces rangées en canevas
   au chargement, comme tous les autres sprites. Les bancs de rendu, qui n'ont
   pas de navigateur, continuent donc de fonctionner sans changement — c'est
   toute la raison de passer par des données plutôt que par une image.

   Format : \`pal\` = la palette, \`rows\` = une chaîne par rangée, un caractère
   par pixel ('0'..'o' = index dans \`pal\`, '.' = transparent).
   ═══════════════════════════════════════════════════════════════════════════ */

export const PLANCHE = {
`;
fs.writeFileSync(path.join(ROOT, "components", "ferme", "planche.js"), header + out.join("\n") + "\n};\n");

if (clipped.length) {
  console.log("\n  ⚠️  BOÎTES TROP COURTES — le dessin touche le bord, il est peut-être coupé :");
  for (const c of clipped) console.log("      " + c);
} else console.log("\n  OK   aucun dessin ne touche le bord de sa boîte de catalogue");
console.log("\n  " + report.length + " sprites importés → components/ferme/planche.js");
const total = report.reduce((s, r) => s + r.w * r.h, 0);
console.log("  " + total + " pixels, " + (fs.statSync(path.join(ROOT, "components", "ferme", "planche.js")).size / 1024 | 0) + " Ko\n");
for (const r of report) console.log(`    ${r.name.padEnd(15)} ${(r.w + "×" + r.h).padEnd(8)} ${r.K} couleurs (de ${r.from})`);

/* La planche de contrôle : ce qui a été importé, à côté de rien d'autre. Elle
   n'existe pas pour décorer — c'est le seul endroit où l'on vérifie que le
   catalogue nomme bien ce qu'il croit nommer. */
{
  const COLS = 9, CW = 62, CH = 62;
  const rows = Math.ceil(report.length / COLS);
  const v = makeCanvas(COLS * CW, rows * CH);
  v.ctx.fillStyle = "#2f3338"; v.ctx.fillRect(0, 0, COLS * CW, rows * CH);
  report.forEach((r, i) => {
    const col = i % COLS, row = (i / COLS) | 0;
    v.ctx.fillStyle = ((col + row) % 2) ? "#383d43" : "#33373c";
    v.ctx.fillRect(col * CW, row * CH, CW, CH);
    const [nm, x, y, w, h, K, mode] = [...CATALOGUE, ...TUILES][i];
    let sp = TUILES.some(t => t[0] === nm) ? slice(sh, bg, x, y, w, h) : cut(sh, bg, x, y, w, h, 0);
    if (mode === "t") {
      const px = new Uint8ClampedArray(sp.w * sp.h * 4);
      for (let j = 0; j < sp.h; j++) for (let i2 = 0; i2 < sp.w; i2++) {
        const a = (j * sp.w + i2) * 4, b = (i2 * sp.h + j) * 4;
        for (let k = 0; k < 4; k++) px[b + k] = sp.px[a + k];
      }
      sp = { w: sp.h, h: sp.w, px };
    }
    const q = quantize(sp, K);
    const im = toRGBA(q);
    const dx = col * CW + ((CW - im.w) >> 1), dy = row * CH + CH - 3 - im.h;
    for (let yy = 0; yy < im.h; yy++) for (let xx = 0; xx < im.w; xx++) {
      const o = (yy * im.w + xx) * 4; if (!im.px[o + 3]) continue;
      const X = dx + xx, Y = dy + yy;
      if (X < 0 || Y < 0 || X >= COLS * CW || Y >= rows * CH) continue;
      const d = (Y * COLS * CW + X) * 4;
      v.px[d] = im.px[o]; v.px[d + 1] = im.px[o + 1]; v.px[d + 2] = im.px[o + 2]; v.px[d + 3] = 255;
    }
  });
  const up = scale(v.px, COLS * CW, rows * CH, 3);
  writePNG(path.join(OUT, "planche-importee.png"), up.px, up.W, up.H);
  console.log("\n  → tools/out/planche-importee.png (ordre du catalogue, ligne par ligne)");
}
