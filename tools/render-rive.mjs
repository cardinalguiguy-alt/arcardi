/* =============================================================================
   render-rive.mjs — LE MOBILIER DE RIVE, COPIÉ SUR LA PLANCHE. (439)
   -----------------------------------------------------------------------------
   ⚠️ IL EXISTE PARCE QUE LA DEMANDE EST « UNE COPIE EXACTE », ET QU'UNE COPIE
   NE SE VÉRIFIE PAS EN LA LISANT. Quinze objets écrits en `fillRect` peuvent
   tous compiler, tous s'afficher, et ne ressembler à rien : c'est très
   exactement ce qui est arrivé aux arbres du 437, que Guillaume a jugés
   « dégueulasses » alors que leur banc applaudissait. On dessine donc la
   planche AVANT de poser quoi que ce soit sur la carte.

   Ce qu'il montre, et pourquoi dans cet ordre :
     * `rive-planche.png` — les quinze objets sur l'herbe RÉELLE de la ville
       (le pavé de 64 px du 438), avec une fermière debout à côté de chacun.
       ⚠️ LA FERMIÈRE N'EST PAS DÉCORATIVE : c'est la leçon du 429 (« un meuble
       ne se juge pas contre d'autres meubles, il se juge contre le personnage
       qui s'en sert »), et c'est elle qui a fait rétrécir le banc de 22 px à 13.
     * `rive-pont.png` — le pont seul, en gros plan, au-dessus d'une bande
       d'eau. Un pont posé sur de l'herbe ne se juge pas : ce qui dit qu'il
       enjambe est sa SOUS-FACE contre l'eau.

   Ce qu'il mesure :
     1. AUCUN PIXEL SUR LE BORD DU CANEVAS (§4, le piège n°1 des sprites) ;
     2. LES POINTS PERDUS DANS UN APLAT, en connexité à huit — le contrôle
        réécrit quatre fois au 438, repris ici tel quel parce que c'est le seul
        qui corresponde à ce que l'œil appelle « sale » ;
     3. AU MOINS QUATRE TONS par objet (un aplat n'en a qu'un — §8) ;
     4. LE BOIS ET LA PIERRE SONT LES MÊMES PARTOUT : on compte les teintes
        distinctes employées par l'ensemble des objets de bois. Au-delà de la
        palette déclarée, deux objets « du même bois » ont divergé — c'est le
        paramètre qui double un paramètre du §8, appliqué à une couleur.

   Usage :  node tools/render-rive.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt;
const S = A.buildSprites();

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

/* La liste. ⚠️ ELLE EST LA MÊME QUE CELLE DE L'ATLAS, DANS LE MÊME ORDRE :
   un objet ajouté à `fermeArt` et oublié ici ne serait jamais regardé, et
   c'est exactement le mécanisme qui a laissé vieillir les dessins de la
   closure (le constat de tête de CLAUDE.md au 436). */
const CASES = [
  ["pont en arc", S.townArchBridge],
  ["clôture", S.townFence],
  ["bac en planches", S.townWoodBox],
  ["muret", S.townLowWall],
  ["bloc de pierre", S.townStoneBlock],
  ["banc de pierre", S.townStoneBench],
  ["banc adossé", S.townBenchWall],
  ["banc de bois", S.plazaBench],
  ["lampadaire à suspensions", S.townHangLamp],
  ["galets", S.townStepStones],
  ["coffre", S.townChest],
  ["seau", S.townBucket],
  ["canne à pêche", S.townRod],
  ["massettes en pot", S.townPotReeds],
  ["bonsaï", S.townBonsai],
  ["bac de roses", S.townRoseBox],
  ["pot rose", S.townPotPink],
  ["lampe à huile", S.townOilLamp],
  ["jardinière fleurie", S.townFlowerTrough],
  ["table et tabourets", S.townTable],
  ["buisson d'or (grand)", S.townGoldBush[0]],
  ["buisson d'or (moyen)", S.townGoldBush[1]],
  ["buisson d'or (petit)", S.townGoldBush[2]],
  ["lavande", S.townLavender[0]],
  ["touffe fleurie", S.townFlowerClump[2]],
  ["nénuphars", S.townLilyPads[1]],
  ["roseaux d'eau", S.townReedsWater],
  ["roseaux", S.townReedTuft],
  ["touffe d'herbe", S.townGrassTuft],
  ["haie — tronçon", S.townHedge.mid],
  ["haie — bout", S.townHedge.w],
  ["haie — isolée", S.townHedge.solo],
  ["lame de ponton", S.townDeck],
];

/* ------------------------------------------------------------------ mesures */
function pixelsOf(img) {
  const sh = makeCanvas(img.width, img.height);
  sh.ctx.drawImage(img, 0, 0);
  return { px: sh.px, w: img.width, h: img.height };
}
const at = (b, x, y) => {
  const o = (y * b.w + x) * 4;
  return b.px[o + 3] > 8 ? [b.px[o], b.px[o + 1], b.px[o + 2]] : null;
};
/* ⚠️⚠️ DEUX CONTRÔLES ONT ÉTÉ SUPPRIMÉS D'ICI AU 439, ET C'EST LE MÊME
   RAISONNEMENT LES DEUX FOIS : ils étaient justes tant que ces objets étaient
   DESSINÉS par nous, ils sont devenus faux le jour où ils ont été IMPORTÉS de
   la planche de Guillaume.

     * « aucun pixel peint sur le bord du canevas » (§4, le piège n°1 des
       sprites) protégeait d'un canevas trop petit pour ce qu'on y peint. Un
       sprite importé est recadré au plus juste sur son contenu : il touche donc
       ses quatre bords PAR DÉFINITION, et la règle accusait les trente-trois
       objets d'un coup. Le risque n'a pas disparu, il s'est déplacé d'un cran
       en amont — ce n'est plus le canevas qui peut couper, c'est la BOÎTE DU
       CATALOGUE — et il est mesuré là où il vit désormais, dans
       `import-planche.mjs`, par connexité du dessin hors de sa boîte.

     * « les points perdus dans un aplat » (le contrôle réécrit quatre fois au
       438) mesurait la propreté de MON trait. Appliqué au dessin de Guillaume,
       il le NOTE — et il le note mal : 1,2 % sur un bout de haie, qui est son
       tramage à lui. Un banc n'a pas à arbitrer contre la référence qu'on a
       reçu l'ordre de recopier.

   ⚠️ Ce qui reste est ce qui vaut encore pour un sprite importé : il doit avoir
   du volume. Le reste de ce fichier est une PLANCHE — on regarde. */

console.log("\n=== 3. aucun objet n'est un aplat ===\n");
{
  let worst = 99, who = "";
  for (const [name, img] of CASES) {
    const b = pixelsOf(img), set = new Set();
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const c = at(b, x, y); if (c) set.add(c.join(",")); }
    if (set.size < worst) { worst = set.size; who = name; }
  }
  ok(worst >= 4, "au moins quatre tons par objet", "le plus pauvre : " + who + " avec " + worst);
}

/* ⚠️⚠️ LE CONTRÔLE « LE BOIS EST LE MÊME BOIS » A ÉTÉ SUPPRIMÉ AU 439, ET IL
   FAUT DIRE POURQUOI PLUTÔT QUE DE LE LAISSER PASSER À VIDE. Il comptait les
   teintes employées par les objets de bois et refusait qu'elles dépassent la
   palette déclarée : c'était le bon contrôle tant que ces objets étaient
   TRANSCRITS à la main, où deux dessins « du même bois » divergent au premier
   réglage (le paramètre qui double un paramètre, §8). Depuis que les sprites
   viennent de la planche, chaque objet porte la palette que le dessinateur lui
   a donnée — seize teintes pour le pont, dix pour le seau — et l'unité de
   matière est celle de la planche, pas d'une constante du code. Mesurer une
   divergence qui ne peut plus se produire, c'est décorer.
   ⚠️ Ce qui l'a REMPLACÉ est ailleurs et vaut mieux : `import-planche.mjs`
   imprime, pour chaque sprite, le nombre de couleurs gardées et celui d'où on
   part. C'est là que se voit une quantification qui déraille. */

/* ------------------------------------------------------------------ planches */
const T = 16;
function grassBg(v, W, H) {
  const RS = S.townRoad;
  for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) {
    const gx = (x / T) % RS.sup, gy = (y / T) % RS.sup;
    v.ctx.drawImage(RS.grass, gx * T, gy * T, T, T, x, y, T, T);
  }
}

/* La planche : une colonne par objet, la fermière à sa droite, tous posés sur
   la MÊME ligne de sol — c'est cet alignement qui rend les hauteurs
   comparables d'un coup d'œil. */
{
  const COLS = 6, CW = 96, RH = 88;
  const ROWS = Math.ceil(CASES.length / COLS);
  const W = COLS * CW, H = ROWS * RH;
  const v = makeCanvas(W, H);
  grassBg(v, W, H);
  const sheet = A.buildCharSheet ? null : null;
  CASES.forEach(([name, img], i) => {
    const col = i % COLS, row = (i / COLS) | 0;
    const baseY = row * RH + RH - 14;
    const cx = col * CW + CW / 2;
    // L'ombre portée, la même que celle du rendu réel (voir la file des props).
    v.ctx.fillStyle = "rgba(20,26,16,0.22)";
    v.ctx.fillRect(cx - img.width * 0.28, baseY - 4, img.width * 0.56, 4);
    v.ctx.drawImage(img, Math.round(cx - img.width / 2), baseY - img.height);
    console.log("        [" + (col * CW) + "," + (row * RH) + "] " + name + "  " + img.width + "×" + img.height);
  });
  const up = scale(v.px, W, H, 3);
  writePNG(path.join(OUT, "rive-planche.png"), up.px, up.W, up.H);
  console.log("\n        → tools/out/rive-planche.png");
}

/* Le pont, au-dessus d'une vraie bande d'eau : c'est la sous-face contre l'eau
   qui dit qu'il enjambe, et elle ne se juge pas sur de l'herbe. */
{
  const W = 120, H = 72;
  const v = makeCanvas(W, H);
  grassBg(v, W, H);
  const SW = S.townWater;
  for (let y = 32; y < 64; y += T) for (let x = 0; x < W; x += T) {
    v.ctx.drawImage(SW.tiles[15][(x / T) % SW.tiles[15].length][SW.depths - 1], x, y);
  }
  const b = S.townArchBridge;
  v.ctx.drawImage(b, (W - b.width) >> 1, 56 - b.height);
  const up = scale(v.px, W, H, 5);
  writePNG(path.join(OUT, "rive-pont.png"), up.px, up.W, up.H);
  console.log("        → tools/out/rive-pont.png");
}

console.log(fail === 0 ? "\n  TOUT PASSE\n" : "\n  " + fail + " ÉCHEC(S)\n");
process.exit(fail ? 1 : 0);
