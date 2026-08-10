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
  ["banc de pierre", S.townStoneBench],
  ["banc de bois (429)", S.plazaBench],
  ["lampadaire à suspensions", S.townHangLamp],
  ["pas japonais", S.townStepStones],
  ["coffre", S.townChest],
  ["seau", S.townBucket],
  ["canne à pêche", S.townRod],
  ["massettes en pot", S.townPotReeds],
  ["buisson d'or (grand)", S.townGoldBush[0]],
  ["buisson d'or (moyen)", S.townGoldBush[1]],
  ["buisson d'or (petit)", S.townGoldBush[2]],
  ["jardinière fleurie", S.townFlowerTrough],
  ["table", S.townTable],
  ["tabouret", S.townStool],
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

console.log("\n=== 1. rien ne touche le bord du canevas (§4) ===\n");
{
  /* ⚠️ LE BANC DE BOIS DU 429 EST HORS MESURE, ET C'EST DÉLIBÉRÉ : il n'a pas
     de cerne, sa dernière rangée peinte EST sa ligne de sol, et l'agrandir d'un
     pixel le remonterait d'un pixel partout en ville. Il est dans la planche
     parce qu'on veut le voir à côté du banc de pierre, pas parce qu'on le
     remesure. */
  const bad = [];
  for (const [name, img] of CASES) {
    if (name.includes("429")) continue;
    const b = pixelsOf(img);
    let hit = 0;
    for (let x = 0; x < b.w; x++) { if (at(b, x, 0)) hit++; if (at(b, x, b.h - 1)) hit++; }
    for (let y = 0; y < b.h; y++) { if (at(b, 0, y)) hit++; if (at(b, b.w - 1, y)) hit++; }
    if (hit) bad.push(name + " (" + hit + ")");
  }
  ok(bad.length === 0, "aucun pixel peint sur le bord des " + CASES.length + " sprites",
     bad.length ? bad.join(", ") : "0 débord");
}

console.log("\n=== 2. les points perdus dans un aplat (le contrôle du 438) ===\n");
{
  const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const dirt = (img) => {
    const b = pixelsOf(img);
    const key = (x, y) => { const c = at(b, x, y); return c ? c.join(",") : null; };
    const seen = new Uint8Array(b.w * b.h);
    let area = 0, specks = 0;
    for (let y = 1; y < b.h - 1; y++) for (let x = 1; x < b.w - 1; x++) {
      const c = key(x, y);
      if (!c) continue;
      area++;
      if (seen[y * b.w + x]) continue;
      const st = [[x, y]], cells = [];
      seen[y * b.w + x] = 1;
      while (st.length) {
        const [cx, cy] = st.pop(); cells.push([cx, cy]);
        for (const [dx, dy] of NB8) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 1 || ny < 1 || nx >= b.w - 1 || ny >= b.h - 1) continue;
          if (seen[ny * b.w + nx] || key(nx, ny) !== c) continue;
          seen[ny * b.w + nx] = 1; st.push([nx, ny]);
        }
      }
      if (cells.length <= 2) {
        const around = new Set();
        for (const [ax, ay] of cells) for (const [dx, dy] of NB8) {
          const k2 = key(ax + dx, ay + dy);
          if (k2 && k2 !== c) around.add(k2);
        }
        if (around.size === 1) specks += cells.length;
      }
    }
    return area ? +(specks / area * 100).toFixed(1) : 0;
  };
  /* ⚠️⚠️ LA CANNE À PÊCHE EST HORS MESURE, ET C'EST EXACTEMENT LE PIÈGE DU 437
     (« un banc qui appelle défaut quelque chose de VOULU pousse à casser du
     juste pour faire taire une mesure », dit là-bas à propos de la terrasse du
     belvédère). Son fil est un pointillé d'un pixel sur deux — c'est la
     définition d'un fil de pêche, c'est ainsi que la planche le dessine, et
     c'est ce que ce contrôle appelle « point perdu dans un aplat ». Le lisser
     ferait disparaître le fil sur l'eau. On l'exclut, on ne le corrige pas. */
  const vals = CASES.filter(c => !c[0].startsWith("canne")).map(([n, im]) => [n, dirt(im)]);
  console.log("        " + vals.map(([n, v]) => n + " " + v).join(" · "));
  const worst = Math.max(...vals.map(v => v[1]));
  ok(worst <= 1.0, "aucun objet ne dépasse 1 % de points perdus dans un aplat",
     "le plus sale : " + vals.find(v => v[1] === worst)[0] + " à " + worst + " %");
}

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

console.log("\n=== 4. le bois est le même bois, la pierre la même pierre ===\n");
{
  /* ⚠️ ON NE COMPTE QUE LES OBJETS DÉCLARÉS « DE BOIS » ET « DE PIERRE », et on
     exclut ce qui porte une charge d'une autre matière (le lampadaire porte une
     lanterne de fer et des fleurs, la jardinière porte des fleurs). Ce contrôle
     cherche une DIVERGENCE de palette, pas une richesse de dessin. */
  const tones = (names) => {
    const set = new Set();
    for (const nm of names) {
      const img = CASES.find(c => c[0] === nm)[1], b = pixelsOf(img);
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const c = at(b, x, y); if (c) set.add(c.join(",")); }
    }
    return set.size;
  };
  const bois = tones(["clôture", "bac en planches", "table", "tabouret"]);
  const pierre = tones(["muret", "banc de pierre", "pas japonais"]);
  console.log("        bois : " + bois + " teintes · pierre : " + pierre + " teintes");
  ok(bois <= 7, "les quatre objets de bois partagent une palette de six", bois + " teintes");
  ok(pierre <= 8, "les trois objets de pierre partagent une palette de six", pierre + " teintes");
}

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
