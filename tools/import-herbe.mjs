/* =============================================================================
   import-herbe.mjs — L'HERBE HAUTE DU SOUS-BOIS, EN GEMINI. (2026-09-20)
   -----------------------------------------------------------------------------
   ⚠️ POURQUOI CE FICHIER EXISTE. Le dessin procédural du 2026-09-19
   (`drawTownTallGrass`, FermeGame.js) a été jugé en jeu par Guillaume : trop
   peu de brins, trop lisses, ils se lisent comme des cornes, et la touffe est
   trop clairsemée pour donner l'impression d'un sol couvert. Décision (§2 de
   CLAUDE.md, sprite de végétation neuf) : un prompt Gemini a été proposé,
   Guillaume l'a collé lui-même et a déposé trois JPEG dans `refs/` — jamais
   d'appel Gemini automatisé depuis ce dépôt.

   ⚠️ PIPELINE C (§9 de CLAUDE.md), PAS `import-planche.mjs`. Les deux
   pipelines de bitmap coexistent pour des raisons différentes :
     - `import-planche.mjs` quantifie une planche PEINTE PAR GUILLAUME en une
       poignée de couleurs et la rejoue en CANEVAS (aucun PNG livré au jeu) —
       fait pour un dessin dont chaque coup de pinceau doit rester fidèle.
     - Pipeline C (ici, comme l'hôtel de ville) livre un vrai PNG au jeu,
       chargé par `bitmapAssets.js`. C'est le bon choix pour une sortie
       Gemini : la reproduire en `fillRect` serait l'imitation que Guillaume a
       déjà refusée une fois (voir l'historique du 439 dans `import-planche.mjs`).

   ⚠️ TROIS JPEG, PAS UN : Gemini ne propose pas l'export PNG dans cette
   interface — même défaut que `refs/hdv.jpg` (voir `import-townhall.mjs`) —
   donc chaque "fond transparent" est un magenta PEINT en pixels. Mais ici
   PLUSIEURS touffes cohabitent sur la même planche (tailles, pliage) :
   contrairement au bâtiment (un seul sujet), on ne peut pas se contenter
   d'une bbox globale après détourage — il faut isoler CHAQUE composante
   connexe du premier plan, comme les carreaux de fenêtre de
   `build-townhall-sprite.mjs` (même famille de technique, appliquée à un
   autre usage).

   ⚠️ LE MAGENTA N'EST PAS UNE TEINTE UNIQUE : mesuré (voir la conversation),
   il dérive légèrement d'une image à l'autre et même d'un coin à l'autre
   d'une même image (compression JPEG) — R≈174-188, G≈47-74, B≈113-129 sur les
   neuf coins échantillonnés des trois fichiers. `isMagentaish` teste une
   FAMILLE de teinte (R et B nettement au-dessus de G), jamais une valeur
   figée — même discipline que `isCheckerish` (import-townhall.mjs), mais
   testée PAR PIXEL plutôt que par diffusion depuis le bord (voir le
   commentaire de `loadAndCutBackground` : ici le fond n'a aucune chance de
   réapparaître dans le sujet, contrairement au damier gris de l'hôtel de
   ville).

   ⚠️ ÉTAPE 2 — LE DÉCOUPAGE FINAL EST ÉCRIT À LA MAIN (le tableau CUTS
   ci-dessous), PAS PAR LES COMPOSANTES RECALCULÉES : les boîtes ont été
   lues UNE fois sur la sortie de l'étape 1 (`comps` imprimées en console),
   vérifiées à l'œil une par une (tools/out/herbe-*-alpha.png), puis figées.
   Recalculer les composantes à chaque exécution et leur faire porter le nom
   serait fragile : un pixel magenta de plus ou de moins dans une future
   régénération changerait l'ORDRE de tri sans qu'aucune ligne ne le signale
   — même piège que « le repli qui ment » du §4 de CLAUDE.md, appliqué à un
   nom de fichier plutôt qu'à un texte.

   Usage : node tools/import-herbe.mjs
   Sortie étape 1 (vérification) : tools/out/herbe-<source>-alpha.png (pleine
   résolution, détourée) et tools/out/herbe-<source>-mask.png (le masque).
   Sortie étape 2 (livrée au jeu) : public/town/grass-tall-*.png.
   ========================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCES = [
  { key: "simple", src: "refs/herbe haute simple.jpg" },
  { key: "tailles", src: "refs/herbe-haute-tailles.jpg" },
  { key: "pliage", src: "refs/herbe-haute-pliage.jpg" },
];

// Famille de magenta : R et B nettement au-dessus de G, tous deux assez
// lumineux. Calibré sur des échantillons réels (coins des trois JPEG),
// jamais sur une valeur unique — le fond dérive d'un fichier à l'autre.
function isMagentaish(r, g, b) {
  return r > 130 && b > 90 && (r - g) > 45 && (b - g) > 25;
}

// ⚠️ PAS DE DIFFUSION DEPUIS LES BORDS ICI, À LA DIFFÉRENCE DE
// `import-townhall.mjs` : le damier gris de l'hôtel de ville pouvait
// légitimement réapparaître DANS le bâtiment (pierre claire, ardoise), donc
// seule la connexité au bord permettait de ne retirer QUE le fond. Le
// magenta, lui, n'a aucune raison d'apparaître dans une touffe d'herbe
// (mesuré : tous les verts échantillonnés ont G >= R, le magenta a R et B
// tous deux très supérieurs à G) — un test PAR PIXEL suffit, et il a
// l'avantage de reboucher aussi les poches de magenta enfermées ENTRE des
// brins qui se croisent, que la diffusion depuis le bord ne peut pas
// atteindre (trouvé sur `pliage[1]` : un triangle magenta pris au piège
// entre deux brins, invisible tant qu'on ne regarde que le masque du bord).
function loadAndCutBackground(file) {
  const raw = readFileSync(file);
  const img = jpeg.decode(raw, { useTArray: true, formatAsRGBA: true });
  const { width: W, height: H, data } = img;
  const alpha = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    alpha[i] = isMagentaish(data[o], data[o + 1], data[o + 2]) ? 0 : 255;
  }
  return { W, H, data, alpha };
}

// Composantes connexes du premier plan (alpha != 0), 4-voisins. Une touffe
// dont les brins s'écartent en éventail laisse des poches de fond ENTRE les
// pointes, mais la base reste un seul bloc : chaque touffe = une seule
// composante, à condition que la diffusion depuis les bords ait bien vidé
// ces poches (vérifié visuellement à l'étape 1, jamais supposé).
function connectedComponents(W, H, alpha, minArea) {
  const visited = new Uint8Array(W * H);
  const comps = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (visited[i] || alpha[i] === 0) continue;
    let x0 = x, x1 = x, y0 = y, y1 = y, area = 0;
    const q = [i]; visited[i] = 1;
    while (q.length) {
      const ci = q.pop(), cy = (ci / W) | 0, cx = ci - cy * W;
      area++;
      if (cx < x0) x0 = cx; if (cx > x1) x1 = cx;
      if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (visited[ni] || alpha[ni] === 0) continue;
        visited[ni] = 1; q.push(ni);
      }
    }
    if (area >= minArea) comps.push({ x0, x1, y0, y1, area });
  }
  return comps.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0)); // lecture haut->bas, gauche->droite
}

const sourceAlpha = {}; // key -> {W,H,data,alpha}, réutilisé à l'étape 2

for (const { key, src } of SOURCES) {
  const cut = loadAndCutBackground(src);
  sourceAlpha[key] = cut;
  const { W, H, data, alpha } = cut;
  const kept = alpha.reduce((s, a) => s + (a ? 1 : 0), 0);
  console.log(`\n=== ${key} (${src}) : ${W}x${H}, ${kept} px gardés (${(100 * kept / (W * H)).toFixed(1)}%) ===`);

  const png = new PNG({ width: W, height: H });
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    png.data[o] = data[o]; png.data[o + 1] = data[o + 1]; png.data[o + 2] = data[o + 2];
    png.data[o + 3] = alpha[i];
  }
  writeFileSync(`tools/out/herbe-${key}-alpha.png`, PNG.sync.write(png));

  const pngMask = new PNG({ width: W, height: H });
  for (let i = 0; i < W * H; i++) {
    const o = i * 4, v = alpha[i];
    pngMask.data[o] = v; pngMask.data[o + 1] = v; pngMask.data[o + 2] = v; pngMask.data[o + 3] = 255;
  }
  writeFileSync(`tools/out/herbe-${key}-mask.png`, PNG.sync.write(pngMask));

  const comps = connectedComponents(W, H, alpha, 400);
  console.log(`  composantes >= 400px : ${comps.length}`);
  comps.forEach((c, i) => {
    console.log(`   [${i}] x[${c.x0}..${c.x1}] y[${c.y0}..${c.y1}] -> ${c.x1 - c.x0 + 1}x${c.y1 - c.y0 + 1} px, aire ${c.area}`);
  });
  console.log(`  Écrit : tools/out/herbe-${key}-alpha.png, tools/out/herbe-${key}-mask.png`);
}

/* ═══════════════════════════════════════════════════════════════════════
   ÉTAPE 2 — DÉCOUPAGE FINAL, VERS public/town/.
   Boîtes lues sur la console ci-dessus (voir le commentaire du fichier).
   `h` est la hauteur CIBLE en unités MONDE (T=16px/case, ZOOM=3 appliqué
   par `ctx.setTransform` dans FermeGame.js — même repère que les arbres de
   `fermeArt.js`, jamais un pixel déjà multiplié par le zoom). La largeur se
   déduit du ratio du recadrage, jamais fixée à part : une touffe étirée de
   travers serait pire que mal calée.
   ⚠️ Les trois poses `rest/bendL/bendR` PARTAGENT UNE SEULE échelle (dérivée
   de `rest`) : le point qui compte n'est pas que leur boîte fasse la même
   taille (une touffe pliée s'étale forcément plus large — les brins
   parcourent un arc plus grand), c'est que le PIED reste ancré au même point
   d'une image à l'autre. L'ancrage bas-centre suffit, comme les poses de
   marche du personnage. */
const CUTS = [
  // -- famille RÉACTIVE (vent ambiant + flexion au contact, voir FermeGame.js)
  { name: "grass-tall-rest",    key: "pliage",  box: [384, 32, 781, 323], h: 20, scaleRef: "reactive" },
  { name: "grass-tall-bend-r",  key: "pliage",  box: [34, 378, 497, 789], h: null, scaleRef: "reactive" }, // penche vers la DROITE
  { name: "grass-tall-bend-l",  key: "pliage",  box: [714, 384, 1151, 789], h: null, scaleRef: "reactive" }, // penche vers la GAUCHE
  // -- famille DÉCORATIVE (dispersion au sol, pas encore de flexion — réponse
  // de Guillaume : « une autre variante basse qui réagit pas pour l'instant »)
  { name: "grass-tall-simple",  key: "simple",  box: [124, 104, 1057, 837], h: 24 },
  { name: "grass-tall-small",   key: "tailles", box: [33, 44, 371, 315],   h: 15 },
  { name: "grass-tall-big",     key: "tailles", box: [472, 88, 1137, 615], h: 28 },
  { name: "grass-tall-flat",    key: "tailles", box: [54, 664, 334, 789],  h: 11 },
  { name: "grass-tall-round",   key: "tailles", box: [434, 664, 839, 889], h: 16 },
];
const PAD = 4;

// Redimensionnement par moyenne de zone, RGB prémultipliée par alpha —
// jamais une moyenne brute (§4 de CLAUDE.md, le piège des tableaux étalés
// s'applique ici sous une autre forme : moyenner du magenta à alpha=0 dans
// le RGB d'un pixel de sortie repeindrait un liseré rose autour de chaque
// brin, à ce rapport de réduction élevé — 15 à 30x contre 4x pour
// l'hôtel de ville, où la même moyenne brute passait inaperçue).
function resizeAlpha(src, x0, y0, x1, y1, targetH) {
  const W = src.W, data = src.data, alpha = src.alpha;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const scale = targetH / ch;
  const DW = Math.max(1, Math.round(cw * scale)), DH = Math.max(1, Math.round(ch * scale));
  const out = new PNG({ width: DW, height: DH });
  for (let dy = 0; dy < DH; dy++) {
    const sy0 = y0 + Math.floor(dy / scale);
    const sy1 = Math.max(sy0 + 1, y0 + Math.floor((dy + 1) / scale));
    for (let dx = 0; dx < DW; dx++) {
      const sx0 = x0 + Math.floor(dx / scale);
      const sx1 = Math.max(sx0 + 1, x0 + Math.floor((dx + 1) / scale));
      let rs = 0, gs = 0, bs = 0, as = 0, an = 0, n = 0;
      for (let sy = sy0; sy < sy1 && sy <= y1; sy++) for (let sx = sx0; sx < sx1 && sx <= x1; sx++) {
        const si = sy * W + sx, o = si * 4, a = alpha[si];
        rs += data[o] * a; gs += data[o + 1] * a; bs += data[o + 2] * a; as += a; an++; n++;
      }
      n = Math.max(1, n);
      const di = (dy * DW + dx) * 4;
      if (as > 0) {
        out.data[di] = Math.round(rs / as); out.data[di + 1] = Math.round(gs / as); out.data[di + 2] = Math.round(bs / as);
      }
      out.data[di + 3] = Math.round(as / n);
    }
  }
  dropIslands(out);
  return out;
}

/* ⚠️ TROUVÉ EN REGARDANT LE RÉSULTAT À 10x (jamais au premier jet) : à un
   rapport de réduction de 15-30x, un fin volute de brin qui ne tient plus
   que par UNE colonne de pixels dans la source peut perdre cette colonne au
   moment d'arrondir la boîte d'échantillonnage — la pointe survit, coupée de
   la base, comme une tache verte flottant sous la touffe. Elle ne s'est
   jamais vue sur les planches d'origine (aucune des trois n'a ce défaut) :
   c'est un artefact du REDIMENSIONNEMENT, pas du détourage. On garde donc la
   plus grande composante connexe de la sortie et on efface le reste. */
function dropIslands(png) {
  const { width: W, height: H, data } = png;
  const alphaOf = (i) => data[i * 4 + 3];
  const visited = new Uint8Array(W * H);
  let best = null;
  const all = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (visited[i] || alphaOf(i) === 0) continue;
    const pix = [i]; visited[i] = 1;
    const q = [i];
    while (q.length) {
      const ci = q.pop(), cy = (ci / W) | 0, cx = ci - cy * W;
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (visited[ni] || alphaOf(ni) === 0) continue;
        visited[ni] = 1; q.push(ni); pix.push(ni);
      }
    }
    all.push(pix);
    if (!best || pix.length > best.length) best = pix;
  }
  for (const pix of all) {
    if (pix === best) continue;
    for (const i of pix) data[i * 4 + 3] = 0;
  }
}

console.log("\n=== Étape 2 : découpage final -> public/town/ ===");
const reactiveScale = 20 / (CUTS[0].box[3] - CUTS[0].box[1] + 1); // dérivée de grass-tall-rest
for (const cut of CUTS) {
  const src = sourceAlpha[cut.key];
  const [x0, y0, x1, y1] = cut.box;
  const targetH = cut.h != null ? cut.h : Math.round((y1 - y0 + 1) * reactiveScale);
  const png = resizeAlpha(src, Math.max(0, x0 - PAD), Math.max(0, y0 - PAD), x1 + PAD, y1 + PAD, targetH);
  const out = `public/town/${cut.name}.png`;
  writeFileSync(out, PNG.sync.write(png));
  console.log(`  ${out} : ${png.width}x${png.height}`);
}
