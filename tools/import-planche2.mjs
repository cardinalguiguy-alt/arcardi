/* =============================================================================
   import-planche2.mjs — LA SECONDE PLANCHE DE GUILLAUME, DEVENUE DES SPRITES.
   (447)
   -----------------------------------------------------------------------------
   ⚠️ MÊME CHAÎNE QUE `import-planche.mjs`, MÊMES RAISONS, ET C'EST VOULU : on
   COPIE les pixels, on ne les transcrit pas (demande du 439, jamais démentie).
   Ce fichier existe séparément parce qu'une planche porte trois choses qui lui
   sont propres — son échelle, sa couleur de fond, son catalogue — et qu'un seul
   outil à deux jeux de constantes finit toujours par appliquer les unes à
   l'autre. Tout le reste vient de `lib-planche.mjs`, sans une ligne recopiée.

   ⚠️⚠️ CE QUI CHANGE PAR RAPPORT À LA PLANCHE 1, ET LES DEUX SONT MESURÉS :

   1. L'ÉCHELLE NE SE MESURE PAS DANS L'IMAGE, ELLE SE DÉRIVE DU GABARIT.
      La planche 1 avait un pas natif franc (3,25, trouvé par autocorrélation de
      la période des haies : 52 px = 16 × 3,25). La planche 2 n'en a pas : ses
      plages de couleur constante font 1 et 2 px, c'est un dessin FIN avec de
      l'anticrénelage, pas un pixel art agrandi. Deux mesures ont été écrites
      puis jetées (peigne de gradient, histogramme de plages) — et le contrôle
      est ce qui les a jetées : lancées sur la planche 1, dont on CONNAÎT le
      pas, elles répondent 3,0 avec une erreur de 0,27 sur un maximum de 0,5,
      c'est-à-dire du hasard. *Une mesure qui ne retrouve pas la réponse connue
      ne mesure rien.*
      L'échelle vient donc des gabarits du jeu, sur cinq objets indépendants :

        banc          138 px  →  `benchWood` fait 36 natifs      →  3,833
        petit arbre   174 px  →  gabarit d'arbre du 438 : 44     →  3,955
                      209 px  →  ... sur 52 de haut              →  4,019
        lampadaire    195 px  →  canevas de lampadaire : 48      →  4,063
        haie           62 px  →  UNE case : 16                   →  3,875
        maison        349 px  →  maison de ville : 96            →  3,635

      Moyenne 3,875, soit **une case du jeu = 62 px image**. On garde 3,875 et
      pas la moyenne exacte parce que c'est la valeur de la HAIE : elle est le
      seul objet qui doit tomber au pixel près, puisqu'elle se répète case par
      case et qu'un demi-pixel d'erreur y dessine une couture tous les 16 px
      (§4 : la période d'un motif compte plus que ses détails).

   2. LE FOND EST BLANC, ET IL SE PREND PAR LA COULEUR — voir la longue note de
      `backgroundMask` : ici la connexité serait FAUSSE, elle remplirait les
      jours entre les balustres.

   ⚠️ LE CATALOGUE EST ÉCRIT À LA MAIN, comme au 439, et pour la même raison :
   les boîtes viennent de la segmentation automatique (composantes connexes du
   non-fond, 16 taches de plus de 400 px), les NOMS ne peuvent venir que d'un
   œil sur la planche de contact. Trois boîtes ont dû être RECOUPÉES à la main,
   et c'est dit objet par objet ci-dessous : la maison, le muret et les haies ne
   font qu'une seule tache de 789×581, parce qu'ils se touchent dans le dessin.

   Usage :  node tools/import-planche2.mjs
   ========================================================================== */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { nativeSheet, backgroundMask, cut, slice, quantize, toRGBA } from "./lib-planche.mjs";
import { makeCanvas, writePNG } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
const SHEET = path.join(ROOT, "refs", "planche2.png");

/* ⚠️ 3,875 = 31/8 EXACTEMENT, et l'origine est à (0 ; 0) : la planche 2 est
   cadrée au ras de son coin, contrairement à la planche 1 (2 ; 1,5). Vérifié
   en minimisant la variance intra-bloc, comme au 439. */
export const STEP2 = 3.875, OX2 = 0, OY2 = 0;
const SC = (v) => Math.round(v / STEP2);   // px image → px natif

/* Le catalogue. [nom, x, y, w, h, K, mode]
   Coordonnées en PIXELS IMAGE de `refs/planche2.png` (1342×784).
   mode : "p" = découpe partielle assumée (l'objet touche un voisin dans le
   dessin, le contrôle de troncature doit le laisser passer) ;
          "t" = tuile, tranchée SANS recadrage (sa largeur EST la case). */
const CATALOGUE = [
  // ── LES ARBRES ────────────────────────────────────────────────────────────
  /* ⚠️ LE GRAND ARBRE EST DÉLIBÉRÉMENT HORS GABARIT : 60×85 natifs contre les
     48×64 des onze essences du 437. Ce n'est pas une erreur d'échelle — la
     maquette le montre débordant largement sur les cases voisines, c'est un
     arbre de PLACE, pas un arbre de rue. Son emprise se dérive du sprite
     (`townPropBox`), donc rien à recopier ailleurs. */
  ["treeBig",      17,   3, 241, 336, 16],
  /* ⚠️ "p" ASSUMÉ : le petit arbre est ENTIER dans sa boîte (vérifié sur la
     planche de contrôle), mais son feuillage touche le pilastre de l'escalier —
     la propagation part donc dans toute la volée et accuse 6 518 pixels. C'est
     le cas « voisin, pas troncature » que le 439 avait déjà rencontré sur les
     galets et le coffre. */
  ["treeSmall",   296,  42, 174, 209, 14, "p"],
  // ── LA PIERRE ─────────────────────────────────────────────────────────────
  /* Le mur de briques beige : une TEXTURE, pas un objet. On la tranche telle
     quelle et c'est `fermeArt` qui en fera un pavé. */
  /* ⚠️ "p" ici aussi, et pour la même raison : le bas du mur affleure la pointe
     du toit de la maison, deux pixels plus bas. */
  ["brickWall",   509,  18, 335, 178, 14, "p"],
  /* ⚠️ L'ESCALIER EST RECOUPÉ : la tache de segmentation (255,226,355×447)
     englobe le tronçon de balustrade accroché à sa droite, qui est un objet
     séparé dans le jeu (il se pose le long d'une terrasse, pas au bord d'une
     volée). On s'arrête donc à x=547, et le tronçon est pris juste après. */
  /* ⚠️⚠️ L'EXCLUSION EXISTE POUR UN CAS QU'AUCUN RECTANGLE NE RÉSOUT, et c'est
     le premier de tout le projet. Le PIED DU PETIT ARBRE pend dans la boîte de
     l'escalier : le tronc occupe x 362..417 pour y 202..250, la volée passe
     sous lui, et le pilastre de tête commence plus haut (y=227) et plus à
     droite (x=452). Rogner en y décapiterait le pilastre, rogner en x
     couperait la rampe. Premier jet livré : une souche brune qui FLOTTE
     au-dessus de l'escalier, parfaitement visible sur la planche de contrôle et
     parfaitement invisible dans le code.
     ⚠️ Elle ne « nettoie » rien : elle retire du FOND EN PLUS, sur un rectangle
     nommé, avant la découpe. Un objet qui a besoin d'une exclusion le DIT ici,
     au lieu qu'on s'aperçoive du voisin trois zips plus tard. */
  ["stairs",      255, 226, 292, 447, 16, "p", [355, 198, 68, 54]],
  ["balusterEnd", 545, 330,  68, 108, 12, "p"],
  ["balustrade",  856, 133, 233,  77, 12],
  // ── LE BÂTI ───────────────────────────────────────────────────────────────
  /* ⚠️⚠️ LA MAISON EST RECOUPÉE ELLE AUSSI, et c'est la découpe la plus délicate
     de la planche : elle est POSÉE SUR le muret, les deux se touchent sur toute
     la largeur de sa base. La boîte s'arrête au ras du soubassement (y=552) ;
     ce qui est en dessous appartient au muret.
     ⚠️ LE PANNEAU « Aurelien » EST DANS LA BOÎTE, son texte n'y sera PAS : le
     bois se copie, les lettres se réécrivent VIVANTES au rendu (§4 — un texte
     cuit n'est ni bilingue ni traduisible, et il fait planter les bancs, qui
     n'ont pas de `fillText`). C'est aussi ce qui permettra d'y écrire le nom du
     joueur au lieu de « Aurelien ». */
  /* ⚠️ SECONDE EXCLUSION, ET ELLE S'EST VUE SUR LA PLANCHE DE CONTRÔLE, PAS
     DANS LE CODE : la balustrade isolée descend jusqu'à y=210, la boîte de la
     maison commence à 203, et leurs abscisses se recouvrent sur 106 px. Premier
     jet livré : un TRAIT VIOLET FONCÉ qui flotte au-dessus du toit. Aucun
     contrôle ne pouvait le lever — le dessin de la maison est entier, il a
     juste un morceau de voisin en plus, et « en plus » ne déclenche rien.
     ⚠️ On ne peut pas descendre la boîte : la pointe du toit est à y=202. */
  ["house",       613, 203, 349, 349, 18, "p", [850, 196, 245, 18]],
  ["lampPost",   1269,  20,  50, 201, 12],
  ["bench",      1103, 130, 146,  84, 12],
  // ── LA VÉGÉTATION BASSE ───────────────────────────────────────────────────
  ["hedgeSeg",    504, 717, 218,  62, 10, "p"],
  ["hedgeCorner", 963, 363, 122, 186, 10, "p"],
  /* ⚠️⚠️ LE PARTERRE SE PREND EN TROIS MASSIFS, PAS EN SIX TOUFFES — et c'est la
     segmentation automatique qui avait tort, pas l'œil. Elle rendait six taches
     parce que six touffes ne se touchent pas au pixel près ; mais elles se
     CHEVAUCHENT toutes dans le dessin, et découpées une par une elles sortent
     amputées de ce que la voisine leur mangeait. Guillaume n'a pas dessiné six
     plantes, il a dessiné un parterre : un rocher et deux massifs fleuris qui
     l'encadrent. Le contrôle de troncature le disait déjà à sa façon — il
     accusait 900 pixels hors boîte sur quatre d'entre elles. */
  ["rockBed",    1161, 423, 112,  88, 12, "p"],
  ["flowerBedL", 1099, 376,  59, 146, 12, "p"],
  ["flowerBedR", 1275, 371,  67, 148, 12, "p"],
  ["flowerRow",  1157, 368, 120,  56, 12, "p"],
];

/* Les TUILES : tranchées sans recadrage, parce que leur largeur EST la case.
   ⚠️ ELLES SONT CALÉES SUR LA GRILLE DE 62 px — c'est le contrôle d'échelle le
   plus parlant qu'on ait : posées à un multiple de 62 depuis l'origine choisie,
   les assises du muret et les nez de marche tombent au bon endroit. */
const TUILES = [
  /* Le muret de pierre grise, vu de face : la bande horizontale sous la maison.
     Trois cases de large prises au milieu du tronçon, là où le dessin est
     franc et loin des extrémités. */
  ["stoneWall",   980, 550, 186, 105, 14],
  /* ⚠️ LE CHEMIN EST LA MÊME MAÇONNERIE VUE DE DESSUS, et c'est une remarque de
     conception, pas d'import : Guillaume emploie le même appareil pour un MUR
     et pour un SOL. On le copie tel qu'il l'a composé — mais on le prend dans
     la branche VERTICALE, qui est celle qu'il a dessinée à plat, jamais dans la
     bande horizontale, qui est un parement. */
  ["pathStone",   746, 658,  93, 124, 12],
];

const sh = nativeSheet(SHEET, { step: STEP2, ox: OX2, oy: OY2 });
const bg = backgroundMask(sh, 8, { ref: 255, enclosed: true });
let nbg = 0; for (const v of bg) nbg += v;
console.log(`planche 2 : ${sh.w}×${sh.h} natifs (pas ${STEP2}) — fond ${(100 * nbg / (sh.w * sh.h)).toFixed(1)} %\n`);

const ENC = (i) => String.fromCharCode(48 + i);
const out = [], report = [], clipped = [];

/* Le masque du fond, augmenté d'un rectangle à ignorer. ⚠️ ON COPIE, on ne
   modifie jamais `bg` en place : l'exclusion d'un objet ne doit pas exister
   pour le suivant — sinon le petit arbre disparaîtrait de sa propre découpe. */
function bgSauf(rect) {
  if (!rect) return bg;
  const m = Uint8Array.from(bg);
  const [x, y, w, h] = rect;
  for (let j = SC(y); j < SC(y + h); j++) for (let i = SC(x); i < SC(x + w); i++) {
    if (i >= 0 && j >= 0 && i < sh.w && j < sh.h) m[j * sh.w + i] = 1;
  }
  return m;
}

for (const [name, x, y, w, h, K, mode, exclure] of [...CATALOGUE, ...TUILES]) {
  const raw = TUILES.some(t => t[0] === name);
  // Les boîtes du catalogue sont en px IMAGE ; la feuille est en px NATIFS.
  const bx = SC(x), by = SC(y), bw = SC(w), bh = SC(h);
  const msk = bgSauf(exclure);
  let s = raw ? slice(sh, msk, bx, by, bw, bh) : cut(sh, msk, bx, by, bw, bh, 0);
  if (!s) { console.log("  ⚠️  " + name + " : rien dans la boîte"); continue; }
  const q = quantize(s, K);
  const rows = [];
  for (let j = 0; j < q.h; j++) {
    let r = "";
    for (let i = 0; i < q.w; i++) { const v = q.idx[j * q.w + i]; r += v === 255 ? "." : ENC(v); }
    rows.push(r);
  }
  /* Le contrôle de troncature du 439, mot pour mot : en élargissant la boîte,
     trouve-t-on ENCORE du dessin COLLÉ à celui qu'on vient de prendre ? */
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
  report.push({ name, w: q.w, h: q.h, K: q.pal.length, from: q.colors, raw });
}

const header = `/* ═══════════════════════════════════════════════════════════════════════════
   planche2.js — LES SPRITES DE LA SECONDE PLANCHE, EN DONNÉES.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ FICHIER GÉNÉRÉ PAR \`tools/import-planche2.mjs\`. NE PAS ÉDITER À LA MAIN.
   Pour changer un dessin, on change la PLANCHE (\`refs/planche2.png\`) ou le
   catalogue de l'outil.

   ⚠️ CE SONT LES PIXELS DE GUILLAUME, PAS UNE TRANSCRIPTION — même règle qu'au
   439. L'échelle (une case = 62 px image) n'a PAS été mesurée dans l'image :
   cette planche n'a pas de pas natif franc, et elle a été DÉRIVÉE de cinq
   gabarits du jeu qui tombent d'accord à moins de 3 %. Le détail, avec les deux
   mesures écrites puis jetées, est en tête de l'outil.

   ⚠️ LE JEU NE CHARGE AUCUN PNG : \`fermeArt.js\` rejoue ces rangées en canevas
   au chargement. Les bancs de rendu, qui n'ont pas de navigateur, continuent
   donc de voir ces dessins — c'est toute la raison de passer par des données.

   Format : \`pal\` = la palette, \`rows\` = une chaîne par rangée, un caractère
   par pixel ('0'..'o' = index dans \`pal\`, '.' = transparent).
   ═══════════════════════════════════════════════════════════════════════════ */

export const PLANCHE2 = {
`;
fs.writeFileSync(path.join(ROOT, "components", "ferme", "planche2.js"), header + out.join("\n") + "\n};\n");

console.log("objet          natif      K   couleurs lues");
for (const r of report) {
  console.log(`  ${r.name.padEnd(13)} ${String(r.w).padStart(3)}×${String(r.h).padStart(3)}  ${String(r.K).padStart(3)}   ${r.from}${r.raw ? "   (tuile)" : ""}`);
}
if (clipped.length) { console.log("\n⚠️  BOÎTES TROP PETITES :"); for (const c of clipped) console.log("   " + c); }
else console.log("\n✓ aucune boîte ne coupe un dessin");

/* La planche de contrôle : les sprites extraits, agrandis ×4, sur damier.
   ⚠️ ELLE EST LA SORTIE QUI COMPTE. Le reste se relit ; ça, ça se REGARDE. */
{
  const Z = 4, PAD = 8;
  let W = PAD, HH = 0;
  const sprs = report.map((r, i) => {
    const q = { w: r.w, h: r.h };
    return q;
  });
  for (const r of report) { W += r.w * Z + PAD; HH = Math.max(HH, r.h * Z); }
  const H2 = HH + PAD * 2;
  const sheet = makeCanvas(W, H2), ctx = sheet.ctx;
  for (let y = 0; y < H2; y += 8) for (let x = 0; x < W; x += 8) {
    const c = ((x >> 3) + (y >> 3)) & 1 ? 210 : 170;
    ctx.fillStyle = `rgb(${c},${c},${c})`; ctx.fillRect(x, y, 8, 8);
  }
  let px2 = PAD;
  for (const [name, x, y, w, h, K, mode, exclure] of [...CATALOGUE, ...TUILES]) {
    const raw = TUILES.some(t => t[0] === name);
    const m2 = bgSauf(exclure);
    const s = raw ? slice(sh, m2, SC(x), SC(y), SC(w), SC(h)) : cut(sh, m2, SC(x), SC(y), SC(w), SC(h), 0);
    if (!s) continue;
    const q = toRGBA(quantize(s, K));
    for (let j = 0; j < q.h; j++) for (let i = 0; i < q.w; i++) {
      const o = (j * q.w + i) * 4;
      if (!q.px[o + 3]) continue;
      ctx.fillStyle = `rgb(${q.px[o]},${q.px[o + 1]},${q.px[o + 2]})`;
      ctx.fillRect(px2 + i * Z, PAD + (HH - q.h * Z) + j * Z, Z, Z);
    }
    px2 += q.w * Z + PAD;
  }
  fs.mkdirSync(OUT, { recursive: true });
  writePNG(path.join(OUT, "planche2-importee.png"), sheet.px, W, H2);
  console.log(`\nplanche de contrôle : tools/out/planche2-importee.png (${W}×${H2}, ×${Z})`);
}
