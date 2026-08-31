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

const AR = E.townArchRise(tw);
function paint(v, now) {
  const sh = makeCanvas(v.w * T, v.h * T);
  for (let y = v.y; y < v.y + v.h; y++) for (let x = v.x; x < v.x + v.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x, g = tw.ground[i], px = (x - v.x) * T, py = (y - v.y) * T;
    if (g === C.G_PATH) { if (!A.drawTownRoadTile(sh.ctx, S, tw, x, y, px, py)) sh.ctx.drawImage(S.path, px, py); }
    else if (g === C.G_PATH_STONE) { if (!A.drawTownFlagTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#a5a4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else if (g === C.G_BRIDGE) {
      /* ⚠️ ZIP 439 — LA VRAIE LAME, PLUS L'APPROXIMATION. Ce banc peignait le
         tablier en quatre bandes de couleur, comme le jeu le faisait avant que
         la lame de la planche n'arrive. Résultat sur `parc-etang.png` : une
         cassure de ton nette entre le tablier et le sprite du pont — un défaut
         qui n'existe QUE dans le banc, et qu'on aurait cherché dans le jeu.
         Un banc qui approxime doit approximer par le VRAI sprite quand il
         existe (c'est déjà la règle écrite en tête de `PROP_IMG`). */
      sh.ctx.fillStyle = "#3f7fd0"; sh.ctx.fillRect(px, py, T, T);
      /* ⚠️ ZIP 439 — LE TABLIER MONTE ICI AUSSI, et il le faut : c'est sur
         cette planche qu'on vérifie que le dos d'âne du pont raccorde le
         chemin sans laisser de marche. Un banc qui peindrait le tablier plat
         montrerait un pont plat et déclarerait le chantier réussi. */
      const rise = AR[i] || 0, dpy = py - rise;
      if (rise > 0) {
        sh.ctx.fillStyle = "#6b4a30"; sh.ctx.fillRect(px, dpy + T - 1, T, rise + 1);
        sh.ctx.fillStyle = "rgba(30,20,12,0.35)"; sh.ctx.fillRect(px, dpy + T + rise - 1, T, 1);
        sh.ctx.fillStyle = "rgba(255,225,180,0.10)"; sh.ctx.fillRect(px, dpy + T - 1, T, 1);
      }
      if (S.townDeck) sh.ctx.drawImage(S.townDeck, px, dpy);
      else { sh.ctx.fillStyle = "#a9834f"; sh.ctx.fillRect(px, dpy, T, T); }
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
    /* ⚠️⚠️ ZIP 439 — LE PONT EN DEUX MOITIÉS, COMME DANS LE JEU. C'est LE
       contrôle de ce chantier : le garde-corps du fond derrière le passant, le
       tablier sous ses pieds, la main courante du devant par-dessus. Dessiné
       d'un seul tenant — l'état du 438 — le passant disparaissait dedans. */
    if (p.kind === "archBridge") {
      const bx = (p.x - v.x) * T + T / 2 - img.width / 2;
      const bby = (p.y + 1 - v.y) * T - img.height + C.TOWN_BRIDGE_DROP_PX;
      const rise = AR[p.y * tw.w + p.x] || 0, SP = C.TOWN_BRIDGE_SPLIT_Y, LO = img.height - SP;
      queue.push({ by: p.y * T - 0.02, fn: (c2) => c2.drawImage(img, 0, 0, img.width, SP, bx, bby - rise, img.width, SP) });
      queue.push({ by: (p.y + 1) * T + 0.02, fn: (c2) => c2.drawImage(img, 0, SP, img.width, LO, bx, bby - rise + SP, img.width, LO) });
      /* LE TÉMOIN : une silhouette debout au sommet du pont, montée de la
         flèche exactement comme le jeu monte le joueur. Sans elle, cette
         planche montre un joli pont dont on ne sait toujours pas s'il se
         franchit — et c'est précisément l'erreur du 438. */
      const wy = (p.y + 1 - v.y) * T - rise;
      queue.push({ by: (p.y + 1) * T - rise, fn: (c2) => {
        const wx = (p.x - v.x) * T + T / 2;
        c2.fillStyle = "#2b2f3a"; c2.fillRect(wx - 3, wy - 9, 6, 9);
        c2.fillStyle = "#e8c9a0"; c2.fillRect(wx - 3, wy - 15, 6, 6);
        c2.fillStyle = "#8a4b3a"; c2.fillRect(wx - 4, wy - 17, 8, 3);
      } });
      continue;
    }
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

/* ⚠️⚠️ ZIP 439 — LA PLANCHE DU PONT, EN GROS PLAN ET AVEC QUELQU'UN DESSUS.
   Elle existe parce que « le pont est-il praticable ? » ne se lit pas sur une
   vue d'ensemble : à l'échelle du parc, un pont traversé et un pont franchi
   font la même tache brune. Il faut voir le passant DEPASSER du garde-corps du
   fond et être coupé aux mollets par celui du devant — c'est ça, et rien
   d'autre, la preuve qu'on marche dessus. */
for (const q of tw.props) {
  if (q.kind !== "archBridge") continue;
  shot("pont-praticable", { x: q.x - 5, y: q.y - 5, w: 11, h: 9 }, 6);
  break;
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
  /* ⚠️ ZIP 439 — ON NE COMPTE PLUS « LES BUISSONS », ON COMPTE CE QUI BORDE.
     Le parc n'a plus un seul `shrub` : ses décors d'allée viennent de la
     planche (buisson d'or, bac de roses, touffe fleurie, lavande, jardinière).
     Le contrôle écrit sur le NOM d'un décor est mort le jour où le décor a
     changé de nom, en disant « 0 buisson » d'un parc qui n'en a jamais autant
     eu. On compte donc la CHOSE — un objet planté le long d'une allée — et pas
     son identifiant. */
  const border = ["shrub", "goldBush", "roseBox", "clump", "lavender", "flowerTrough", "bonsai", "topiary"]
    .reduce((n, k) => n + (byKind[k] || 0), 0);
  ok(border >= 6 && (byKind.bench || 0) >= 3, "il y a de quoi s'asseoir et de quoi border les allées",
     (byKind.bench || 0) + " banc(s), " + border + " décor(s) d'allée");
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
  /* ⚠️⚠️ ZIP 439 — ET AUCUNE PASSE NE RECOUVRE LE TABLIER D'UN PONT. Le pont
     japonais du parc est posé au-dessus de l'étang par une passe du générateur ;
     ses cases cessent alors d'être de l'eau. La passe SUIVANTE — le belvédère —
     cherche « la première rangée sèche au sud du centre de l'étang » : elle
     tombait pile sur le tablier et y dallait sa terrasse. Quatre des quatorze
     cases du pont repassaient en dallage, soit un pont coupé en son milieu.
     ⚠️ ET AUCUN CONTRÔLE EXISTANT NE POUVAIT LE VOIR : « rien n'a les pieds dans
     l'eau » disait OK (le belvédère était bien sur du sec), la circulation
     passait (on marche sur du dallage comme sur des planches), et le décor du
     pont était posé au bon endroit. Ce qui manquait est l'invariant : un décor
     de pont doit reposer sur un tablier COMPLET. C'est la même famille que le
     buisson enterré sous le parvis du kiosque (437) et que les décors noyés par
     le creusement de l'anse — une passe tardive qui recouvre une passe précoce
     sans le savoir. */
  {
    const bad = [];
    for (const q of tw.props) {
      if (q.kind !== "archBridge") continue;
      let holes = 0;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 0; dy++) {
        const i = (q.y + dy) * tw.w + (q.x + dx);
        if (tw.ground[i] !== C.G_BRIDGE) holes++;
      }
      if (holes) bad.push(`(${q.x},${q.y}) : ${holes} case(s) hors tablier`);
    }
    ok(bad.length === 0, "chaque pont repose sur un tablier complet", bad.join(" · "));
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

/* ⚠️⚠️ ZIP 439 — LE DOS D'ÂNE MONTE À L'IMAGE ET RESTE PLAT POUR LA MARCHE.
   Les deux moitiés de ce contrôle sont indissociables : une flèche qui ne monte
   pas ne corrige rien, et une flèche qui entre dans `tw.elev` transforme le pont
   en falaise (canStandTown refuse tout pas au-delà de TOWN_STEP_MAX). C'est le
   piège qu'on a esquivé de trois lignes, donc c'est celui qu'un banc doit tenir. */
console.log("\n=== 5. le pont se franchit par-dessus ===\n");
{
  let raised = 0, summit = 0, elevDirty = 0, offDeck = 0;
  for (let i = 0; i < AR.length; i++) {
    if (!AR[i]) continue;
    raised++;
    if (AR[i] > summit) summit = AR[i];
    if (tw.ground[i] !== C.G_BRIDGE) offDeck++;
    if (tw.elev[i] !== 0) elevDirty++;
  }
  ok(raised > 0, "le tablier a un profil d'arc", raised + " case(s) montées, flèche " + summit + " px");
  ok(summit === C.TOWN_BRIDGE_ARCH_PX, "la flèche atteint bien son sommet", summit + " / " + C.TOWN_BRIDGE_ARCH_PX + " px");
  ok(offDeck === 0, "aucune case hors tablier n'est montée", offDeck + " case(s) fautive(s)");
  ok(elevDirty === 0, "⚠️ l'arc n'a PAS touché l'altitude de collision", elevDirty + " case(s) polluée(s)");
  /* Les deux bouts du profil retombent à zéro : sans ça, le raccord avec le
     chemin est une marche de deux ou trois pixels — le défaut de grille qu'on
     passe son temps à corriger ailleurs (435, 437). */
  let steps = 0;
  for (const q of tw.props) {
    if (q.kind !== "archBridge") continue;
    for (const dy of [-1, 0]) for (const s2 of [-1, 1]) {
      const x = q.x + s2 * (C.TOWN_BRIDGE_ARCH_SPAN + 1), y = q.y + dy;
      if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
      if ((AR[y * tw.w + x] || 0) !== 0) steps++;
    }
  }
  ok(steps === 0, "l'arc retombe à zéro à ses deux têtes", steps + " raccord(s) en marche");
}

/* ⚠️⚠️ ZIP 440 — LE SENTIER QUI SORT DU LAC ET LE BOIS QUI L'AVALE.
   Demande de Guillaume : « le chemin à l'est de la jetée s'arrête sur rien du
   tout », puis « le sentier entre dans le bois et s'y perd […] c'est pas une
   zone très fréquentée, ça doit être un peu sauvage ».
   ⚠️ CE CHAPITRE MESURE UNE FIN, ET UNE FIN EST DIFFICILE À MESURER : « le
   chemin s'arrête » est vrai des deux versions, la mauvaise comme la bonne. Ce
   qui les sépare tient en trois grandeurs, et aucune n'est « la longueur » :
     1. il est CONTINU tant qu'il est dehors (une coupure avant le bois est le
        défaut de départ, déplacé de cinquante cases) ;
     2. il devient LACUNAIRE avant de cesser (sans quoi c'est une coupe nette,
        c'est-à-dire exactement ce qu'on corrige) ;
     3. il ne rétrécit JAMAIS à une case (le piège payé quatre fois au 437 :
        une allée d'une case ne montre que ses marches, et elle le ferait ici
        au moment précis où l'on veut qu'elle se fasse oublier). */
console.log("\n=== 6. le sentier de la rive est se perd dans le bois ===\n");
{
  const rows = [];
  for (let x = lk.x + lk.w; x < tw.w; x++) {
    const ys = [];
    for (let y = lk.y - 2; y < tw.h; y++) if (tw.ground[y * tw.w + x] === C.G_PATH) ys.push(y);
    rows.push([x, ys]);
  }
  const paved = rows.filter(([, ys]) => ys.length);
  const last = paved.length ? paved[paved.length - 1][0] : lk.x + lk.w - 1;
  ok(paved.length > 0, "le sentier repart bien au-delà du rectangle du lac", paved.length + " colonne(s)");
  ok(last >= 195, "il va chercher le coin bas-droit de la carte", `dernière plaque en x=${last} sur ${tw.w}`);
  const thin = paved.filter(([, ys]) => ys.length < 2);
  ok(thin.length === 0, "il ne rétrécit jamais à une seule case",
    thin.length ? thin.slice(0, 6).map(([x]) => "x=" + x).join(" ") : "0 colonne");
  /* ⚠️⚠️ ON APPELLE LE CHAMP DU JEU, ON NE LE REFAIT PAS. Premier jet : une
     copie du bruit écrite ici, avec un hachage réinventé — donc un autre champ,
     donc des tranches de profondeur qui ne correspondaient à aucune case que le
     générateur plante. Le banc annonçait « taillis 12 % » pour une futaie réglée
     à 50 %, et il passait au vert. C'est le §3 du 439 (« un banc qui repeint ne
     juge pas le jeu, il juge sa propre maquette ») appliqué à une FONCTION :
     `townWoodDepth` a été sortie de la closure du générateur exprès. */
  const wood = E.townWoodDepth;
  /* ⚠️ « CONTINU DEHORS » SE MESURE DEHORS, ET C'EST TOUT LE CONTRÔLE : on ne
     compte les trous que sur les colonnes où le sentier n'est pas encore entré
     sous les arbres. Compté partout, le contrôle accuserait la disparition
     qu'on vient d'écrire ; compté nulle part, il ne verrait pas la coupure du
     439 revenir cinquante cases plus loin. */
  let holesOut = 0, gappy = 0, lastRow = null;
  for (const [x, ys] of rows) {
    if (x > last) break;
    /* ⚠️ POUR UNE COLONNE MANQUANTE, ON REPREND LA RANGÉE DE LA DERNIÈRE
       PLAQUE, pas une valeur écrite ici : le champ dépend de y autant que de x
       (c'est tout l'intérêt d'un champ), donc une rangée devinée fait répondre
       le test sur un point qui n'est pas sur le chemin. Premier jet à `y = 160` :
       il accusait un trou parfaitement légitime, sous les arbres. */
    if (ys.length) lastRow = ys[0];
    const d = wood(x, lastRow === null ? C.TOWN_WOOD.y + 4 : lastRow);
    if (d < C.TOWN_TRAIL_FADE_FROM) { if (!ys.length) holesOut++; }
    else if (!ys.length) gappy++;
  }
  ok(holesOut === 0, "il est continu tant qu'il est à découvert", holesOut + " trou(s) hors du bois");
  ok(gappy >= 2, "il se troue AVANT de cesser (il ne se coupe pas net)", gappy + " plaque(s) manquante(s) sous les arbres");

  /* Le bois lui-même : ce qui le sépare d'un semis est le GRADIENT. Une densité
     plate, si haute soit-elle, ne fait pas une lisière — elle fait un décor.
     ⚠️ ON MESURE PAR TRANCHE DE PROFONDEUR, PAS PAR TRANCHE DE COLONNES. Premier
     jet : trois bandes verticales de vingt cases, moyennées sur toute la hauteur
     du rectangle. Elles diluaient le cœur avec les rangées du nord, où le champ
     est négatif et où il n'y a par construction aucun arbre du bois : le banc
     annonçait 23 % pour une futaie réglée à 44 %, et on serait allé « corriger »
     un dessin qui n'avait rien. Une bande de colonnes n'est pas une tranche de
     forêt — c'est un rectangle posé sur une forme qui n'est pas rectangulaire. */
  /* ⚠️⚠️ 2026-08-31 — LE DÉNOMINATEUR EST « LES CASES OÙ UN ARBRE POUVAIT
     POUSSER », PAS « LES CASES DU CHAMP », ET C'EST UNE CORRECTION DE BANC QUE
     LE FLEUVE A IMPOSÉE. Le champ de profondeur du bois croît vers le sud-est ;
     son cœur tombe donc là où le fleuve coule désormais. Compté sur toutes les
     cases, ce contrôle annonçait **15 % de couvert au cœur d'une futaie qui en
     porte 44** — il mesurait la part d'EAU du coin de carte, pas la densité du
     bois, et on serait allé épaissir une forêt qui n'avait rien.
     ⚠️ Ce n'est pas un assouplissement : l'eau et le sentier ne sont pas des
     arbres manquants, ce sont des endroits où le générateur n'a JAMAIS eu le
     droit d'en planter (il exige `G_GRASS`/`G_TOWN_LAWN`). Une case sur laquelle
     la règle ne s'applique pas n'appartient pas à la mesure de la règle.
     *Un dénominateur qui contient ce que la règle exclut mesure la carte, pas la
     règle.* */
  const plantable = (x, y) => {
    const i = y * tw.w + x, o = tw.objects[i];
    if (o === C.O_TREE || o === C.O_TREE2) return true;
    return tw.ground[i] === C.G_GRASS || tw.ground[i] === C.G_TOWN_LAWN;
  };
  const slab = (lo, hi) => {
    let n = 0, t = 0;
    for (let y = C.TOWN_WOOD.y; y < Math.min(tw.h - 1, C.TOWN_WOOD.y + C.TOWN_WOOD.h); y++) {
      for (let x = C.TOWN_WOOD.x; x < Math.min(tw.w - 1, C.TOWN_WOOD.x + C.TOWN_WOOD.w); x++) {
        const d = wood(x, y);
        if (d < lo || d >= hi) continue;
        if (!plantable(x, y)) continue;
        t++;
        const o = tw.objects[y * tw.w + x];
        if (o === C.O_TREE || o === C.O_TREE2) n++;
      }
    }
    return { r: n / (t || 1), t };
  };
  /* ⚠️ LES BORNES DES TRANCHES SONT CELLES DU MODÈLE, PAS DES NOMBRES RONDS :
     « plein bois » est par DÉFINITION `d ≥ TOWN_WOOD_DEPTH` (c'est là que la
     densité atteint son plafond). Un seuil écrit à la main ici serait un
     paramètre qui double `TOWN_WOOD_DEPTH`, c'est-à-dire la divergence du §8
     dans le banc censé la surveiller — et il l'a été : `6` sur une profondeur
     réglée à 5 mesurait une tranche qui n'existe presque pas. */
  const DEEP = C.TOWN_WOOD_DEPTH;
  const edge = slab(0, 1.5), mid = slab(1.5, DEEP), heart = slab(DEEP, 1e9);
  ok(heart.r > mid.r && mid.r > edge.r, "la densité MONTE de la lisière au cœur",
    `lisière ${(edge.r * 100).toFixed(0)} % · taillis ${(mid.r * 100).toFixed(0)} % · futaie ${(heart.r * 100).toFixed(0)} %`);
  ok(heart.t >= 60, "la futaie a une vraie surface", heart.t + " cases de plein bois");
  ok(edge.t + mid.t + heart.t >= 300, "et le bois entier aussi", (edge.t + mid.t + heart.t) + " cases sous les arbres");
  ok(heart.r >= 0.34, "le cœur du bois est vraiment un bois", `${(heart.r * 100).toFixed(0)} %`);
  /* ⚠️⚠️ ET LA LISIÈRE N'EST PAS UNE COLONNE. Même grandeur que la rive du 437,
     pour la même raison : une frontière écrite `x > 190` est un mur d'arbres
     tiré à la règle, et c'est ce qu'on obtient sans champ 2-D.
     ⚠️ PREMIER JET FAUX, ET IL PASSAIT AU VERT : « la première colonne portant
     un arbre » trouvait les arbres ÉPARS du semis général, à soixante cases de
     la forêt, et rendait un écart-type de 25 cases — un chiffre magnifique qui
     ne parlait pas du bois. C'est le banc qui se trompe de grandeur, pour la
     quatrième fois de la série (rues 434, eau 435, escaliers 436) : ici il
     mesurait la PRAIRIE. Une lisière, c'est là où la forêt COMMENCE à être une
     forêt — donc la première colonne dont la fenêtre de six est déjà dense. */
  const firsts = [];
  for (let y = C.TOWN_WOOD.y; y < tw.h - 1; y++) {
    for (let x = C.TOWN_WOOD.x; x < tw.w - 7; x++) {
      let n = 0;
      for (let k = 0; k < 6; k++) {
        const o = tw.objects[y * tw.w + x + k];
        if (o === C.O_TREE || o === C.O_TREE2) n++;
      }
      if (n >= 2) { firsts.push(x); break; }
    }
  }
  /* ⚠️⚠️ ON MESURE LE RÉSIDU, PAS L'ÉCART-TYPE BRUT — et c'est la deuxième fois
     que ce contrôle se trompe de grandeur. La lisière de ce bois est DIAGONALE
     par construction (le champ descend vers le coin), donc son écart-type brut
     vaut vingt-quatre cases quelle que soit sa forme : une diagonale tirée à la
     règle passerait haut la main. Ce qu'on veut savoir est si elle ondule
     AUTOUR de sa tendance. On retire donc la droite des moindres carrés et on
     mesure ce qui reste. Une lisière parfaitement droite rend zéro. */
  const n = firsts.length || 1;
  const ys = firsts.map((_, k) => C.TOWN_WOOD.y + k);
  const my = ys.reduce((a, b) => a + b, 0) / n, mx = firsts.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, syy = 0;
  for (let k = 0; k < firsts.length; k++) { sxy += (ys[k] - my) * (firsts[k] - mx); syy += (ys[k] - my) ** 2; }
  const slope = syy ? sxy / syy : 0;
  let res = 0;
  for (let k = 0; k < firsts.length; k++) { const e = firsts[k] - (mx + slope * (ys[k] - my)); res += e * e; }
  const sd = Math.sqrt(res / n);
  ok(sd >= 1.5, "la lisière ondule autour de sa pente au lieu d'être un trait",
    `résidu ${sd.toFixed(1)} case(s) sur ${firsts.length} rangées (pente ${slope.toFixed(1)} case/rangée)`);
}

/* ─────────────────────────── LES PLANCHES ─────────────────────────── */
{
  const p = C.TOWN_PARK;
  shot("parc-ensemble", { x: p.x - 2, y: p.y - 2, w: p.w + 4, h: p.h + 4 }, 2);
  shot("parc-etang", { x: Math.round(C.TOWN_POND.cx) - 11, y: Math.round(C.TOWN_POND.cy) - 8, w: 22, h: 17 }, 4);
  shot("lac-rive-ouest", { x: lk.x + 1, y: lk.y - 6, w: 34, h: 18 }, 3);
  shot("lac-rive-est", { x: lk.x + lk.w - 35, y: lk.y - 6, w: 34, h: 18 }, 3);
  shot("lac-quai", { x: C.TOWN_PIER.x - 15, y: lk.y - 6, w: 34, h: 18 }, 3);
  // ⚠️ Deux fenêtres pour le sentier de l'est : celle où il quitte le lac, et
  // celle où il se perd. Une seule, à cette échelle, ne montrerait ni l'une ni
  // l'autre — c'est trente cases de chemin qu'on juge, pas un objet.
  shot("sentier-est", { x: lk.x + lk.w - 6, y: lk.y - 2, w: 30, h: 14 }, 3);
  shot("sentier-bois", { x: 186, y: 152, w: 36, h: 16 }, 3);
  /* ⚠️ LA PASSE (2026-08-31). C'est par là que le navire sort du monde : c'est
     donc le seul endroit de la carte dont le cadrage soit imposé par une SCÈNE
     et pas par un décor. On la regarde centrée sur son goulet, avec de quoi
     voir le bassin d'un côté et le fleuve de l'autre — un goulet qu'on ne voit
     pas s'ouvrir et se refermer n'est pas un goulet, c'est une rive. */
  /* ⚠️ LE FLEUVE ENTIER, D'UN SEUL TENANT ET À FAIBLE ZOOM. C'est la seule
     planche qui montre ce que la décision de Guillaume a changé : un bassin qui
     se resserre, une passe, et une eau qui sort du cadre. Les vignettes de
     détail ne peuvent pas le dire — un profil se juge sur sa longueur. */
  shot("fleuve-entier", { x: lk.x - 2, y: lk.y - 8, w: tw.w - lk.x + 2, h: 24 }, 1);
  shot("fleuve-passe", { x: C.TOWN_RIVER_NECK_X - 18, y: lk.y - 2, w: 36, h: 16 }, 3);
  shot("fleuve-sortie", { x: tw.w - 30, y: lk.y - 2, w: 30, h: 16 }, 3);
}

console.log("\nImages : tools/out/parc-ensemble.png, parc-etang.png, lac-rive-ouest.png, lac-rive-est.png, lac-quai.png, sentier-est.png, sentier-bois.png, fleuve-passe.png, fleuve-sortie.png\n");
console.log(fail ? fail + " CONTRÔLE(S) EN ÉCHEC\n" : "Tout est bon.\n");
process.exit(fail ? 1 : 0);
