/* =============================================================================
   render-parc.mjs — LE PARC, SES MASSIFS, ET LES DEUX RIVES DU LAC DU SUD. (437)
   -----------------------------------------------------------------------------
   ⚠️ IL RÉPOND AU DERNIER ANGLE MORT NOMMÉ EN §10 DE CLAUDE.md : « aucun banc
   ne regarde une fenêtre complète de Valley Town ». Les six bancs du 434-436
   peignent chacun SA surface et approximent le reste à sa teinte moyenne ;
   celui-ci assemble tout ce qui se dessine hors de la closure — l'herbe, le
   revêtement (gravier compris), les massifs fleuris, la berge, l'eau, les
   arbres — et n'approxime plus que les props qui, eux, vivent encore dans le
   rendu. C'est la première planche du projet où l'on voit un morceau de ville
   à peu près comme le joueur le voit.

   Ce qu'il mesure, et pourquoi :

     1. LA RIVE DU LAC N'EST PLUS TRACÉE À LA RÈGLE. C'est la demande de
        Guillaume, et elle se mesure en deux temps : la plus longue suite de
        COLONNES dont la rive est à la même rangée (le trait à la règle), et le
        nombre de fois où la rive revient sur elle-même dans une colonne (les
        criques, ce dont une `shore(x)` est INCAPABLE par construction).
        ⚠️ La mesure exclut l'esplanade du ponton : un quai maçonné EST droit,
        et le compter comme un défaut pousserait à tordre un ouvrage.

     2. LE HAUT-FOND N'EST PLUS UN HALO DE LARGEUR CONSTANTE. On mesure l'écart
        type de la largeur du plateau le long du rivage : à zéro, c'est un
        pochoir.

     3. LE PARC A RECULÉ, ET IL A DE QUOI ÊTRE UN PARC. Distance à la place,
        surface fleurie, nombre d'allées de gravier, décors, essences.

     4. RIEN N'A LES PIEDS DANS L'EAU et rien ne bouche une allée : c'est le
        contrôle qui protège des cinquante décors semés par le générateur.

   Usage :  node tools/render-parc.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine;
const S = A.buildSprites();
const T = 16;
const tw = E.generateTownWorld();

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

/* ═══════════════════ LA PLANCHE ═══════════════════════════════════════════
   ⚠️ SEULS LES PROPS SONT APPROXIMÉS, et ils le sont par leur VRAI sprite
   quand il existe (buisson, bloc, jardinière, banc, lampadaire, massif taillé,
   kiosque) : ce sont des `S.*` ordinaires, seule leur mise en file par ancrage
   au sol vit dans la closure. Ce banc la refait, ce qui est une recopie de
   TRIAGE, pas de dessin — un tri qui se trompe se voit ici comme dans le jeu. */
const PROP_IMG = (p) => (
  p.kind === "bench" ? S.plazaBench :
  p.kind === "lamp" ? S.plazaLamp :
  p.kind === "topiary" ? S.plazaTopiary :
  p.kind === "planter" ? S.townPlanter :
  p.kind === "kiosk" ? S.townKiosk :
  p.kind === "shrub" ? S.townShrub[((p.x * 7 + p.y * 13) >>> 0) % S.townShrub.length] :
  p.kind === "boulder" ? S.townBoulder[((p.x * 11 + p.y * 5) >>> 0) % S.townBoulder.length] :
  /* ZIP 439 — le mobilier de rive, sprites de la planche. ⚠️ CETTE TABLE DOIT
     RESTER IDENTIQUE À CELLE DE `drawTownFrame`, variantes comprises : c'est
     une recopie, donc une divergence en attente (§8). Elle est ici parce que
     l'alternative — ne pas dessiner les nouveaux décors — donnerait une planche
     où la rive paraît vide alors qu'elle est meublée, c'est-à-dire un verdict
     FAUX et non une approximation. C'est ce que la première passe a produit. */
  ((k) => k ? k : null)(
    { archBridge: S.townArchBridge, fence: S.townFence, woodBox: S.townWoodBox,
      lowWall: S.townLowWall, stoneBlock: S.townStoneBlock, stoneBench: S.townStoneBench,
      benchWall: S.townBenchWall, hangLamp: S.townHangLamp, stepStones: S.townStepStones,
      chest: S.townChest, bucket: S.townBucket, rod: S.townRod, potReeds: S.townPotReeds,
      flowerTrough: S.townFlowerTrough, bonsai: S.townBonsai, roseBox: S.townRoseBox,
      potPink: S.townPotPink, oilLamp: S.townOilLamp, table: S.townTable,
      reedTuft: S.townReedTuft, reedsWater: S.townReedsWater, hedgeRow: S.townHedgeRow,
      grassTuft: S.townGrassTuft, flatStone: S.townFlatStone }[p.kind]
    || ({ goldBush: S.townGoldBush, lavender: S.townLavender,
          clump: S.townFlowerClump, lily: S.townLilyPads }[p.kind] || [])[((p.x * 11 + p.y * 17) >>> 0) % 4]
  ));

function paint(v, now) {
  const sh = makeCanvas(v.w * T, v.h * T);
  for (let y = v.y; y < v.y + v.h; y++) for (let x = v.x; x < v.x + v.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x, g = tw.ground[i], px = (x - v.x) * T, py = (y - v.y) * T;
    if (g === C.G_PATH) { if (!A.drawTownRoadTile(sh.ctx, S, tw, x, y, px, py)) sh.ctx.drawImage(S.path, px, py); }
    else if (g === C.G_PATH_STONE) { if (!A.drawTownFlagTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#a5a4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else if (g === C.G_BRIDGE) {
      sh.ctx.fillStyle = "#a9834f"; sh.ctx.fillRect(px, py, T, T);
      for (let k = 0; k < 4; k++) { sh.ctx.fillStyle = (k % 2) ? "#b78f58" : "#9c7746"; sh.ctx.fillRect(px, py + k * 4, T, 4); }
    }
    else if (!A.drawTownGrassTile(sh.ctx, S, tw, x, y, px, py)) sh.ctx.drawImage(S.townGrass[(x * 37 + y * 17) % S.townGrass.length], px, py);
    if (g === C.G_TOWN_LAWN) { sh.ctx.fillStyle = (Math.floor(x / 3) & 1) ? "rgba(24,70,30,0.10)" : "rgba(140,200,120,0.07)"; sh.ctx.fillRect(px, py, T, T); }
    A.drawTownBloomTile(sh.ctx, S, tw, x, y, px, py);
    A.drawTownShoreTile(sh.ctx, S, tw, x, y, px, py);
    A.drawTownWaterTile(sh.ctx, S, tw, x, y, px, py, now);
    if (tw.hedge[i]) { sh.ctx.fillStyle = "#2f6b2f"; sh.ctx.fillRect(px, py - 6, T, T + 6); }
  }
  // La file par ancrage au sol : arbres et props ensemble, du nord au sud.
  const queue = [];
  for (let y = v.y - 3; y < v.y + v.h + 3; y++) for (let x = v.x - 2; x < v.x + v.w + 2; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const o = tw.objects[y * tw.w + x];
    if (o !== C.O_TREE && o !== C.O_TREE2) continue;
    queue.push({ by: (y + 1) * T, fn: (c2) => A.drawTownTree(c2, S, tw, x, y, (x - v.x) * T, (y - v.y) * T, "summer", o, now) });
  }
  for (const p of tw.props) {
    if (p.x < v.x - 2 || p.x > v.x + v.w + 2 || p.y < v.y - 3 || p.y > v.y + v.h + 3) continue;
    const img = PROP_IMG(p); if (!img) continue;
    queue.push({ by: (p.y + 1) * T, fn: (c2) => c2.drawImage(img, (p.x - v.x) * T + T / 2 - img.width / 2, (p.y + 1 - v.y) * T - img.height) });
  }
  queue.sort((a, b) => a.by - b.by);
  for (const q of queue) q.fn(sh.ctx);
  return sh;
}
function shot(name, v, k, now = 0) {
  const sh = paint(v, now);
  const up = scale(sh.px, v.w * T, v.h * T, k);
  writePNG(path.join(OUT, name + ".png"), up.px, up.W, up.H);
}

/* ─────────────────────────── LES MESURES ─────────────────────────── */
const lk = C.TOWN_LAKE, axis = C.TOWN_PIER.x + C.TOWN_PIER.w / 2;
const wild = (x) => Math.abs(x + 0.5 - axis) > C.TOWN_QUAY_HALF + C.TOWN_QUAY_FADE;
const tops = [];
for (let x = lk.x; x < lk.x + lk.w; x++) {
  let t = null;
  for (let y = lk.y; y < lk.y + lk.h; y++) if (tw.ground[y * tw.w + x] === C.G_WATER) { t = y; break; }
  tops.push(t);
}

console.log("\n=== 1. la rive n'est plus tracée à la règle ===\n");
{
  let run = 1, mx = 1, at = 0;
  for (let k = 1; k < tops.length; k++) {
    if (!wild(lk.x + k) || !wild(lk.x + k - 1)) { run = 1; continue; }
    if (tops[k] !== null && tops[k] === tops[k - 1]) { run++; if (run > mx) { mx = run; at = lk.x + k; } } else run = 1;
  }
  ok(mx <= 6, "aucune rive sauvage plate de plus de six colonnes", "la plus longue : " + mx + " colonnes (vers x=" + at + ")");
  /* ⚠️ LE CONTRÔLE QUI COMPTE VRAIMENT. Une `shore(x)` rend UN y par colonne :
     elle ne peut produire aucune alternance eau/terre/eau dans une même
     colonne. En compter, c'est prouver que le rivage se replie — ce qu'aucun
     réglage d'amplitude n'aurait pu donner à l'ancienne formule. */
  let folds = 0, coves = 0;
  for (let x = lk.x; x < lk.x + lk.w; x++) {
    if (!wild(x)) continue;
    let seen = 0, runs = 0, prev = false;
    for (let y = lk.y; y < lk.y + lk.h; y++) {
      const w = tw.ground[y * tw.w + x] === C.G_WATER;
      if (w && !prev) runs++;
      prev = w; if (w) seen++;
    }
    if (runs > 1) folds++;
    if (seen && tops[x - lk.x] !== null && tops[x - lk.x] - lk.y >= 6) coves++;
  }
  console.log("        colonnes à plusieurs nappes : " + folds + " · colonnes en crique profonde : " + coves);
  ok(folds + coves >= 6, "le rivage revient sur lui-même (impossible avec une fonction de x)",
     folds + " repli(s) et " + coves + " crique(s)");
  const spread = Math.max(...tops.filter(t => t !== null)) - Math.min(...tops.filter(t => t !== null));
  ok(spread >= 6, "la rive parcourt au moins six rangées du nord au sud", spread + " rangées");
}

console.log("\n=== 2. le haut-fond n'est pas un halo de largeur constante ===\n");
{
  const widths = [];
  for (let x = lk.x + 2; x < lk.x + lk.w - 2; x += 1) {
    const t = tops[x - lk.x]; if (t === null) continue;
    let n = 0;
    for (let y = t; y < lk.y + lk.h; y++) {
      const i = y * tw.w + x;
      if (tw.ground[i] !== C.G_WATER) break;
      if (tw.depth[i] < 235) n++;
    }
    if (n) widths.push(n);
  }
  const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
  const sd = Math.sqrt(widths.reduce((a, b) => a + (b - mean) * (b - mean), 0) / widths.length);
  ok(sd > 0.55, "la largeur du plateau varie le long de la rive",
     "moyenne " + mean.toFixed(2) + " case(s), écart-type " + sd.toFixed(2));
}

console.log("\n=== 3. le parc a reculé, et il a de quoi être un parc ===\n");
{
  const p = C.TOWN_PARK, pz = C.TOWN_PLAZA;
  ok(p.x - (pz.x + pz.w) >= 6, "au moins six cases de pelouse entre la place et le parc",
     (p.x - (pz.x + pz.w)) + " case(s)");
  ok(C.TOWN_POND.cx > p.x && C.TOWN_POND.cx < p.x + p.w && C.TOWN_KIOSK.x > p.x && C.TOWN_KIOSK.x < p.x + p.w,
     "l'étang et le kiosque ont suivi le parc", "étang cx=" + C.TOWN_POND.cx + ", kiosque x=" + C.TOWN_KIOSK.x);
  let flowers = 0, gravelT = 0, lawn = 0, trees = 0;
  const kinds = new Set();
  for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
    const i = y * tw.w + x;
    if (tw.bloom[i]) { flowers++; kinds.add(tw.bloom[i]); }
    if (tw.road[i] === C.TR_GRAVEL) gravelT++;
    if (tw.ground[i] === C.G_TOWN_LAWN) lawn++;
    const o = tw.objects[i];
    if (o === C.O_TREE || o === C.O_TREE2) trees++;
  }
  const props = tw.props.filter(q => q.x >= p.x && q.y >= p.y && q.x < p.x + p.w && q.y < p.y + p.h);
  const byKind = {}; for (const q of props) byKind[q.kind] = (byKind[q.kind] || 0) + 1;
  console.log("        " + Object.entries(byKind).map(([k, v]) => k + " " + v).join(" · "));
  ok(flowers >= 90, "le parc est fleuri", flowers + " case(s) fleurie(s) sur " + (lawn + flowers) + " de pelouse");
  ok(kinds.size >= 4, "quatre espèces au moins, pour que les quartiers du parc diffèrent", kinds.size + " espèce(s)");
  ok(gravelT >= 80, "les allées sont en gravier", gravelT + " case(s)");
  ok(trees >= 14, "le parc est planté", trees + " arbre(s)");
  ok((byKind.shrub || 0) >= 6 && (byKind.bench || 0) >= 3, "il y a de quoi s'asseoir et de quoi border les allées",
     (byKind.bench || 0) + " banc(s), " + (byKind.shrub || 0) + " buisson(s)");
}

console.log("\n=== 4. rien n'a les pieds dans l'eau, rien ne bouche une allée ===\n");
{
  let drowned = 0, onPath = 0;
  for (const q of tw.props) {
    const i = q.y * tw.w + q.x;
    /* ⚠️ ZIP 439 — LES PAS JAPONAIS SONT SUR L'EAU PAR DÉFINITION, et c'est la
       même exception que celle entrée dans `verify-vallee.mjs` le même jour :
       ce contrôle cherche des décors NOYÉS PAR ACCIDENT (le buisson que le
       creusement de l'anse a rattrapé), pas des décors dont la place est l'eau.
       Le reste de la règle est intact. */
    if (!["stepStones", "lily", "reedsWater"].includes(q.kind) && tw.ground[i] === C.G_WATER) drowned++;
    /* ⚠️ ON NE TESTE QUE LES DÉCORS DE JARDIN (`gard`), PAS TOUT CE QUI
       RESSEMBLE À UNE JARDINIÈRE. Le premier jet comptait les huit jardinières
       de la place centrale, posées sur du dallage depuis le 425 et parfaitement
       à leur place : un banc qui appelle « défaut » quelque chose de juste
       pousse à casser ce qui marche. Même distinction que le balayage du
       générateur, et payée le même jour. */
    if (q.gard && (tw.ground[i] === C.G_PATH || tw.ground[i] === C.G_PATH_STONE)) onPath++;
  }
  ok(drowned === 0, "aucun décor sur l'eau", drowned + " décor(s)");
  ok(onPath === 0, "aucun buisson, bloc ou jardinière au milieu d'une allée", onPath + " décor(s)");
  /* ⚠️⚠️ ZIP 439 — ET AUCUN ARBRE DONT LE HOUPPIER FLOTTE SUR L'EAU.
     Ce contrôle existe à cause d'un défaut que tous les autres ont laissé
     passer : le lac du sud s'arrêtait deux rangées avant le bord de la carte,
     ces deux rangées étaient de l'herbe, le semis d'arbres — qui ne connaît que
     « est-ce de l'herbe ? » — y avait planté QUATRE-VINGT-SEPT arbres, et leurs
     houppiers de 64 px couvraient quatre rangées d'eau. En jeu : une rangée
     d'arbres qui flottent sur le lac.

     ⚠️ LA MESURE ÉVIDENTE RÉPOND « TOUT VA BIEN ». « Un arbre est-il sur une
     case d'eau ? » — non, et à juste titre : la case était bien de l'herbe.
     C'est le §10 de CLAUDE.md dans sa forme la plus pure : *un banc qui passe ne
     dit pas que la chose est bonne, il dit qu'on mesure autre chose.*

     ⚠️⚠️ ET LA DEUXIÈME MESURE ESSAYÉE ÉTAIT FAUSSE AUSSI — elle est écrite ici
     parce qu'elle a l'air juste. « Un arbre sur une terre INACCESSIBLE » :
     séduisant, général, et muet sur ce cas précis. La bande de deux rangées
     était parfaitement accessible, en contournant le lac par l'est ou par
     l'ouest. Vérifié en remettant `TOWN_LAKE.h` à 12 : le contrôle disait OK.
     Un contrôle qu'on n'a pas vu ÉCHOUER sur le défaut qu'il est censé attraper
     n'est pas un contrôle, c'est une décoration (§14.6).

     La bonne grandeur est celle que le défaut nomme lui-même : ce que le sprite
     COUVRE. Un arbre fait 44 px de houppier sur 52 de haut, soit trois cases de
     large et trois et demie de haut au-dessus de son ancre. On compte l'eau
     là-dedans : au-delà de la moitié, l'arbre ne se lit plus comme un arbre au
     bord de l'eau, il se lit comme un arbre DANS l'eau. */
  {
    let floating = 0; const sample = [];
    for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
      const o = tw.objects[y * tw.w + x];
      if (o !== C.O_TREE && o !== C.O_TREE2) continue;
      let wet = 0, seen2 = 0;
      for (let dy = -3; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= tw.w || ny >= tw.h) continue;
        seen2++;
        if (tw.ground[ny * tw.w + nx] === C.G_WATER) wet++;
      }
      if (seen2 && wet / seen2 > 0.5) { floating++; if (sample.length < 6) sample.push(`(${x},${y})`); }
    }
    ok(floating === 0, "aucun houppier ne flotte sur l'eau", floating + " arbre(s) " + sample.join(" "));
  }
  // Le sentier de la rive doit être continu : on le suit d'ouest en est.
  let holes = 0;
  for (let x = lk.x + 1; x < lk.x + lk.w - 1; x++) {
    if (!wild(x) || !wild(x - 1) || tops[x - lk.x] === null) continue;
    let has = false;
    for (let y = lk.y - 4; y < lk.y + lk.h; y++) if (tw.ground[y * tw.w + x] === C.G_PATH) { has = true; break; }
    if (!has) holes++;
  }
  ok(holes === 0, "le sentier de rive ne s'interrompt pas", holes + " colonne(s) sans chemin");
}

/* ─────────────────────────── LES PLANCHES ─────────────────────────── */
{
  const p = C.TOWN_PARK;
  shot("parc-ensemble", { x: p.x - 2, y: p.y - 2, w: p.w + 4, h: p.h + 4 }, 2);
  shot("parc-etang", { x: Math.round(C.TOWN_POND.cx) - 11, y: Math.round(C.TOWN_POND.cy) - 8, w: 22, h: 17 }, 4);
  shot("lac-rive-ouest", { x: lk.x + 1, y: lk.y - 6, w: 34, h: 18 }, 3);
  shot("lac-rive-est", { x: lk.x + lk.w - 35, y: lk.y - 6, w: 34, h: 18 }, 3);
  shot("lac-quai", { x: C.TOWN_PIER.x - 15, y: lk.y - 6, w: 34, h: 18 }, 3);
}

console.log("\nImages : tools/out/parc-ensemble.png, parc-etang.png, lac-rive-ouest.png, lac-rive-est.png, lac-quai.png\n");
console.log(fail ? fail + " CONTRÔLE(S) EN ÉCHEC\n" : "Tout est bon.\n");
process.exit(fail ? 1 : 0);
