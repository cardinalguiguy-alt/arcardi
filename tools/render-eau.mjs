/* =============================================================================
   render-eau.mjs — L'EAU DE VALLEY TOWN ET SA BERGE. (435)
   -----------------------------------------------------------------------------
   ⚠️ IL EXISTE PARCE QUE L'AUDIT DU 435 A TROUVÉ, EN REGARDANT, CE QUE SEPT
   BANCS DE RENDU NE MESURAIENT PAS. La leçon du 433, en tête de CLAUDE.md :
   *quand Guillaume voit un défaut qu'aucun banc ne voit, la question n'est pas
   « où est le bogue » mais « quelle grandeur ne mesure-t-on pas ».* Pour un
   plan d'eau, les grandeurs sont au nombre de quatre, et AUCUNE n'était mesurée
   nulle part :

     1. LA RECTITUDE DU RIVAGE. C'est le défaut que Guillaume a nommé : « les
        rives sont trop géométriques ». On la mesure comme on mesurerait une
        côte — la plus longue suite de pixels du trait d'eau alignés sur une
        même ligne, en X comme en Y. Un rivage droit d'une case fait déjà 16 px
        d'affilée ; c'est ce nombre-là qu'il faut voir tomber, et l'ancien
        `fillRect` pleine case le rendait indépassable.

     2. LA CONTINUITÉ DU TRAIT. Les carrés marcheurs se raccordent parce que
        deux cases voisines partagent leurs coins — mais une erreur d'ordre des
        bits dans `cfg`, ou une variante qui déforme le seuil jusqu'au bord de
        la case, ouvrirait une FISSURE d'un pixel tout autour du plan d'eau.
        Elle ne lèverait rien, ne se verrait pas sur une tuile, et se verrait
        sur toute la rive. On compte donc les pixels d'herbe cernés d'eau.

     3. LA PROFONDEUR EST-ELLE VISIBLE ? Une carte `depth` juste et une rampe
        trop serrée donnent le même aplat qu'avant. On compare la luminance du
        LARGE à celle du bord — pas la moyenne du tout, qui ne dit rien (§8 :
        « la statistique qui compte n'est pas la moyenne »).

     4. LE CONTRASTE. L'ancienne eau mesurait un écart-type de 8,3 pour une
        référence à 47,7 : de la gouache. On le remesure ici, assemblé.

   Et un cinquième contrôle qui n'est pas une mesure de dessin mais de RÈGLE :
   l'étang ne doit toucher NI l'allée en croix du parc NI les décors qui
   l'entourent. La forme est modulée par quatre harmoniques ; les régler d'un
   cran de trop noierait un massif taillé sans lever la moindre erreur — c'est
   arrivé pendant l'écriture de ce zip, sur le massif (122, 83).

   ⚠️ Il appelle `A.drawTownWaterTile` et `A.drawTownShoreTile`, c'est-à-dire
   EXACTEMENT les fonctions que la boucle de rendu appelle. Recopier le dessin
   ici aurait mesuré autre chose que le jeu (le stub menteur du §10).

   Usage :  node tools/render-eau.mjs
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
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/* ═══════════════════ LES PLANCHES ══════════════════════════════════════════
   ⚠️ LE DÉCOR AUTOUR EST APPROXIMÉ, L'EAU NE L'EST PAS — même parti pris que
   `render-rues.mjs`. L'herbe, le revêtement, la berge et l'eau sont les vrais
   dessins du jeu ; le dallage est peint à sa teinte moyenne plutôt que par la
   vingtaine de `fillRect` qui vivent, eux, dans la closure du rendu. Ce banc
   juge L'EAU, et il lui faut un fond honnête autour pour la juger. */
function paint(sh, v, now) {
  for (let y = v.y; y < v.y + v.h; y++) for (let x = v.x; x < v.x + v.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x, g = tw.ground[i], px = (x - v.x) * T, py = (y - v.y) * T;
    const gt = S.townGrass;
    if (g === C.G_PATH) { if (!A.drawTownRoadTile(sh.ctx, S, tw, x, y, px, py)) sh.ctx.drawImage(S.path, px, py); }
    else if (g === C.G_PATH_STONE) { if (!A.drawTownFlagTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#a5a4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else if (g === C.G_BRIDGE) {
      sh.ctx.fillStyle = "#a9834f"; sh.ctx.fillRect(px, py, T, T);
      for (let k = 0; k < 4; k++) { sh.ctx.fillStyle = (k % 2) ? "#b78f58" : "#9c7746"; sh.ctx.fillRect(px, py + k * 4, T, 4); }
    }
    else {
      sh.ctx.drawImage(gt[(x * 37 + y * 17) % gt.length], px, py);
      if (g === C.G_TOWN_LAWN) { sh.ctx.fillStyle = "rgba(24,70,30,0.20)"; sh.ctx.fillRect(px, py, T, T); }
    }
    A.drawTownShoreTile(sh.ctx, S, tw, x, y, px, py);
    A.drawTownWaterTile(sh.ctx, S, tw, x, y, px, py, now);
    const o = tw.objects[i];
    if (o === C.O_TREE || o === C.O_TREE2) sh.ctx.drawImage(o === C.O_TREE ? S.oak : S.pine, px - 8, py - 32);
  }
}
function shot(name, v, k, now = 0) {
  const sh = makeCanvas(v.w * T, v.h * T);
  paint(sh, v, now);
  const up = scale(sh.px, v.w * T, v.h * T, k);
  writePNG(path.join(OUT, name + ".png"), up.px, up.W, up.H);
  return sh;
}

const p = C.TOWN_PARK, pd = C.TOWN_POND;
const VP = { x: Math.round(pd.cx) - 12, y: Math.round(pd.cy) - 9, w: 24, h: 18 };
shot("eau-etang", VP, 4);

/* ⚠️⚠️ LES MESURES SE FONT SUR UNE SCÈNE NUE, ET C'EST UNE CORRECTION, PAS UNE
   COMMODITÉ. Premier jet : on mesurait la rectitude du rivage sur la PLANCHE,
   décor compris — elle accusait une rive droite de 21 px, et le dessin n'y
   était pour rien. Le détecteur d'eau travaille sur la couleur (bleu dominant),
   et la rangée de SAPINS qui borde le parc au nord est peinte en vert-bleu :
   il comptait leur silhouette comme un rivage. La leçon est celle du 433,
   retournée — un banc qui échoue peut se tromper de grandeur exactement comme
   un banc qui passe. On peint donc, pour mesurer, ce qui définit le trait
   d'eau et rien d'autre : l'herbe, la berge, l'eau. La planche, elle, garde
   son décor, parce qu'une rive se JUGE dans son décor. */
const etang = (() => {
  const sh = makeCanvas(VP.w * T, VP.h * T);
  for (let y = VP.y; y < VP.y + VP.h; y++) for (let x = VP.x; x < VP.x + VP.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const px = (x - VP.x) * T, py = (y - VP.y) * T, gt = S.townGrass;
    sh.ctx.drawImage(gt[(x * 37 + y * 17) % gt.length], px, py);
    A.drawTownShoreTile(sh.ctx, S, tw, x, y, px, py);
    A.drawTownWaterTile(sh.ctx, S, tw, x, y, px, py, 0);
  }
  return sh;
})();
// La même scène quatre minutes plus tard : les reflets doivent avoir bougé, le
// rivage non. C'est le seul moyen de séparer une animation d'un scintillement.
shot("eau-etang-t2", VP, 4, 240000);
shot("eau-lac-sud", { x: C.TOWN_PIER.x - 16, y: C.TOWN_LAKE.y - 7, w: 36, h: 20 }, 3);
// Les seize configurations de coins, alignées, à toutes les profondeurs : c'est
// la planche qui montre le trait lui-même, hors de tout décor.
{
  const NC = 16, ND = S.townWater.depths, PAD = 4;
  const W = NC * (T + PAD) + PAD, H = 2 * ND * (T + PAD) + PAD;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#3c6b34"; sh.ctx.fillRect(0, 0, W, H);
  for (let cfg = 0; cfg < NC; cfg++) for (let vr = 0; vr < 2; vr++) for (let d = 0; d < ND; d++) {
    sh.ctx.drawImage(S.townWater.tiles[cfg][vr][d], PAD + cfg * (T + PAD), PAD + (vr * ND + d) * (T + PAD));
  }
  const up = scale(sh.px, W, H, 5);
  writePNG(path.join(OUT, "eau-contours.png"), up.px, up.W, up.H);
}

console.log("\n=== 1. la rectitude du rivage ===\n");
/* La plus longue suite de pixels alignés sur le TRAIT D'EAU. On repère le trait
   par le changement d'état eau/pas-eau d'un pixel au suivant, puis on compte la
   plus longue rangée horizontale et la plus longue colonne verticale de ces
   points de transition. ⚠️ ON MESURE EN PIXELS, PAS EN CASES : c'est la seule
   unité dans laquelle « la rive traverse la case » veut dire quelque chose, et
   c'est aussi ce qui rend la mesure comparable à l'ancien rendu (qui ne pouvait
   pas descendre sous 16). */
/* ⚠️⚠️ 437 — ON NE MESURE PLUS LA RIVE LÀ OÙ ELLE EST MAÇONNÉE, et c'est la
   même correction que celle appliquée au lac du sud dans `render-parc.mjs` : un
   OUVRAGE est droit, c'est ce qui le fait lire comme un ouvrage. Le belvédère
   du 437 pose quatre cases de terrasse au bord de l'étang, donc 64 px de rive
   parfaitement rectiligne — et le banc a crié, à juste titre selon sa règle,
   sur quelque chose de voulu. Compter ça comme un défaut aurait poussé à tordre
   une terrasse, c'est-à-dire à casser du juste pour faire taire une mesure.
   La zone exclue est passée en pixels, dérivée de la carte : aucune coordonnée
   n'est réécrite ici. */
function shoreRuns(sh, W, H, skip) {
  const skipped = (x, y) => {
    if (!skip) return false;
    for (const s2 of skip) if (x >= s2.x && x < s2.x + s2.w && y >= s2.y - 2 && y < s2.y + s2.h + 2) return true;
    return false;
  };
  const isW = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const i = (y * W + x) * 4, r = sh.px[i], g = sh.px[i + 1], b = sh.px[i + 2];
    // L'eau du jeu : bleu/vert dominant, jamais l'herbe (verte, rouge bas).
    return b > r + 18 && b > 70;
  };
  const edgeH = new Uint8Array(W * H), edgeV = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (skipped(x, y)) continue;
    if (isW(x, y) !== isW(x, y + 1)) edgeH[y * W + x] = 1;   // frontière horizontale
    if (isW(x, y) !== isW(x + 1, y)) edgeV[y * W + x] = 1;   // frontière verticale
  }
  let hRun = 0, vRun = 0;
  for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) { n = edgeH[y * W + x] ? n + 1 : 0; if (n > hRun) hRun = n; } }
  for (let x = 0; x < W; x++) { let n = 0; for (let y = 0; y < H; y++) { n = edgeV[y * W + x] ? n + 1 : 0; if (n > vRun) vRun = n; } }
  return { hRun, vRun };
}
{
  // Les cases DALLÉES qui touchent l'étang, en pixels de la planche : elles
  // sont trouvées sur la carte, jamais écrites à la main.
  const built = [];
  for (let y = VP.y; y < VP.y + VP.h; y++) for (let x = VP.x; x < VP.x + VP.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    /* ⚠️⚠️ ZIP 439 — LE TABLIER D'UN PONT EST UN OUVRAGE, AU MÊME TITRE QUE LA
       TERRASSE DU BELVÉDÈRE, et il s'exclut pour la même raison. Le pont
       japonais posé sur l'étang au 439 donne 112 px de bord d'eau parfaitement
       DROIT — et c'est juste : un tablier EST droit, c'est ce qui le fait lire
       comme un ouvrage. Ce contrôle cherche un RIVAGE tracé à la règle, pas une
       construction. Sans cette exclusion il criait « 33 px de rive horizontale »
       et poussait à tordre les harmoniques de l'étang pour faire taire une
       mesure qui visait le pont — exactement le piège nommé au 437 à propos de
       ce même banc et de cette même terrasse. Deux heures de réglage
       d'harmoniques y sont passées avant de comprendre que la mesure ne parlait
       pas de l'étang. */
    const gg = tw.ground[y * tw.w + x];
    if (gg !== C.G_PATH_STONE && gg !== C.G_BRIDGE) continue;
    built.push({ x: (x - VP.x) * T, y: (y - VP.y) * T, w: T, h: T });
  }
  const W = VP.w * T, H = VP.h * T, r = shoreRuns(etang, W, H, built);
  /* ⚠️ LE SEUIL EST EXPRIMÉ EN PIXELS ET IL EST ABSOLU — c'est voulu, et c'est
     l'inverse de la leçon du 434 (« un seuil dans une unité qui dépend du décor
     devient faux quand le décor change »). Ici l'unité NE dépend pas du décor :
     un rivage droit d'une seule case fait 16 px quelle que soit la taille de
     l'étang. Sous 16, la rive traverse forcément les cases. */
  ok(r.hRun < 16, "aucune rive horizontale d'une case entière", `plus longue rangée : ${r.hRun} px`);
  ok(r.vRun < 16, "aucune rive verticale d'une case entière", `plus longue colonne : ${r.vRun} px`);
}

console.log("\n=== 2. la continuité du trait (aucune fissure aux coutures) ===\n");
{
  const W = VP.w * T, H = VP.h * T;
  const isW = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const i = (y * W + x) * 4;
    return etang.px[i + 2] > etang.px[i] + 18 && etang.px[i + 2] > 70;
  };
  let holes = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (isW(x, y)) continue;
    if (isW(x - 1, y) && isW(x + 1, y) && isW(x, y - 1) && isW(x, y + 1)) holes++;
  }
  ok(holes === 0, "aucun pixel sec cerné d'eau", `${holes} trou(s)`);
}

console.log("\n=== 3. la profondeur se voit-elle ? ===\n");
{
  const W = VP.w * T;
  let near = [], far = [];
  for (let y = VP.y; y < VP.y + VP.h; y++) for (let x = VP.x; x < VP.x + VP.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x;
    if (tw.ground[i] !== C.G_WATER) continue;
    const bucket = tw.depth[i] < 40 ? near : tw.depth[i] > 200 ? far : null;
    if (!bucket) continue;
    // le pixel central de la case : jamais le bord, où le liseré fausserait tout
    const j = (((y - VP.y) * T + 8) * W + ((x - VP.x) * T + 8)) * 4;
    bucket.push(lum(etang.px[j], etang.px[j + 1], etang.px[j + 2]));
  }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const lNear = avg(near), lFar = avg(far);
  ok(near.length > 3 && far.length > 3, "l'étang a un bord ET un large", `${near.length} cases de haut-fond, ${far.length} au large`);
  ok(lNear - lFar > 25, "le large est nettement plus sombre que le bord",
     `L ${lNear.toFixed(1)} au bord contre ${lFar.toFixed(1)} au large (écart ${(lNear - lFar).toFixed(1)})`);
}

console.log("\n=== 4. le contraste de la nappe ===\n");
{
  const W = VP.w * T;
  let s = 0, s2 = 0, n = 0;
  for (let y = VP.y; y < VP.y + VP.h; y++) for (let x = VP.x; x < VP.x + VP.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x;
    if (tw.ground[i] !== C.G_WATER || tw.depth[i] < 60) continue;
    for (let q = 0; q < T * T; q++) {
      const j = (((y - VP.y) * T + ((q / T) | 0)) * W + ((x - VP.x) * T + (q % T))) * 4;
      const L = lum(etang.px[j], etang.px[j + 1], etang.px[j + 2]);
      s += L; s2 += L * L; n++;
    }
  }
  const mean = s / n, sd = Math.sqrt(s2 / n - mean * mean);
  // ⚠️ L'ancienne eau mesurait 8,3 (mesuré au 434 sur `#3f7fd0` + son voile).
  // La référence de §8 est à 47,7, mais c'est celle d'une IMAGE ENTIÈRE : une
  // nappe d'eau calme n'a aucune raison de l'atteindre, et la viser ferait une
  // mer démontée. On demande le double de l'ancienne, pas le sextuple.
  ok(sd > 16, "la nappe n'est plus un aplat", `écart-type ${sd.toFixed(1)} (ancienne eau : 8,3)`);
}

/* ══════════════════════════════════════════════════════════════════════════
   ZIP 436 — LA GRANDEUR QUI MANQUAIT : EST-CE QU'ON VOIT LES CASES ?
   ──────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ LES QUATRE CHAPITRES CI-DESSUS DISAIENT TOUS OK AU 435, PENDANT QUE
   L'ÉTANG RENDAIT UNE MOSAÏQUE DE CARRÉS BLEUS DE 16 px. Ils mesuraient la
   rectitude du RIVAGE, la continuité du TRAIT, l'écart bord/large et
   l'écart-type de la nappe — quatre grandeurs justes, aucune ne parlant de la
   grille INTÉRIEURE. C'est le §14.6 de CLAUDE.md dans sa forme la plus pure :
   un banc qui passe ne dit pas que la chose est bonne, il dit qu'on mesure
   autre chose. Et c'est le MÊME défaut que le banc corrigeait au rivage,
   déplacé de deux mètres vers le large.

   ⚠️ LA MESURE : on compare le saut de luminance À TRAVERS une arête de case
   au saut moyen à l'INTÉRIEUR des cases, sur la seule pleine eau. Si le
   dessin ignore la grille, les deux sont du même ordre (rapport ≈ 1). Si la
   profondeur est quantifiée par case, l'arête saute et l'intérieur ne bouge
   pas. Mesuré : **×3,05 au 435, ×1,27 aujourd’hui.**
   ⚠️ On écarte les colonnes de bord de la fenêtre et les cases de rive : là,
   un saut est LÉGITIME (c'est le trait d'eau), et l'inclure noierait le
   signal qu'on cherche. */
console.log("\n=== 4 bis. la grille intérieure se voit-elle encore ? ===\n");
{
  const W = VP.w * T;
  const Lat = (gx, gy) => {
    const j = (gy * W + gx) * 4;
    return lum(etang.px[j], etang.px[j + 1], etang.px[j + 2]);
  };
  // Pleine eau : la case ET ses quatre voisines sont de l'eau, donc aucun trait
  // d'eau ne traverse — tout saut mesuré ici est un saut de PROFONDEUR.
  const full = (x, y) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= tw.w || yy >= tw.h) return false;
      if (tw.ground[yy * tw.w + xx] !== C.G_WATER) return false;
    }
    return true;
  };
  let seam = 0, seamN = 0, inner = 0, innerN = 0;
  /* ⚠️⚠️ ZIP 440 — ON MESURE LES DEUX ARÊTES, PLUS SEULEMENT L'EST-OUEST. Une
     grille est une grille dans LES DEUX SENS : une profondeur quantifiée par
     case saute autant d'une rangée à la suivante que d'une colonne à la
     suivante, et n'en regarder qu'une revenait à mesurer la moitié du défaut
     qu'on cherche. Ça double aussi l'échantillon, ce qui est le motif immédiat
     du changement : le resserrement de l'étang au droit du pont (440) a fait
     tomber le compte d'arêtes horizontales de 216 à 192, sous le seuil de
     conclusion — le banc ne disait plus rien.
     ⚠️ ET C'EST LA SEULE CORRECTION ACCEPTABLE ICI. Baisser le seuil de 200 à
     190 aurait fait repasser le banc au vert sans rien mesurer de plus : un
     seuil réglé sur le résultat est le défaut que ce fichier attrape ailleurs
     (le « meublé » à `n < 6` du 439). On agrandit l'échantillon, on ne desserre
     pas la mesure — et le rapport mesuré, lui, ne bouge pas. */
  for (let y = VP.y + 1; y < VP.y + VP.h - 1; y++) for (let x = VP.x + 1; x < VP.x + VP.w - 1; x++) {
    const gx = (x - VP.x) * T, gy = (y - VP.y) * T;
    if (full(x, y) && full(x + 1, y)) {
      for (let q = 2; q < T - 2; q++) {
        // l'arête est-ouest de la case : la colonne T-1 contre la colonne 0 du voisin
        seam += Math.abs(Lat(gx + T - 1, gy + q) - Lat(gx + T, gy + q)); seamN++;
        // et six transitions internes de la même case, à la même distance
        for (const u of [3, 5, 7, 9, 11, 13]) { inner += Math.abs(Lat(gx + u, gy + q) - Lat(gx + u + 1, gy + q)); innerN++; }
      }
    }
    if (full(x, y) && full(x, y + 1)) {
      for (let q = 2; q < T - 2; q++) {
        // et l'arête nord-sud : la rangée T-1 contre la rangée 0 de la case du dessous
        seam += Math.abs(Lat(gx + q, gy + T - 1) - Lat(gx + q, gy + T)); seamN++;
        for (const u of [3, 5, 7, 9, 11, 13]) { inner += Math.abs(Lat(gx + q, gy + u) - Lat(gx + q, gy + u + 1)); innerN++; }
      }
    }
  }
  const s = seam / (seamN || 1), i2 = inner / (innerN || 1), ratio = s / (i2 || 1);
  ok(seamN > 200, "assez d'arêtes de pleine eau pour conclure", `${seamN} arête(s) mesurée(s), les deux sens`);
  ok(ratio < 1.55, "une arête de case ne saute pas plus qu'un pixel voisin",
     `×${ratio.toFixed(2)} (arête ${s.toFixed(1)}, intérieur ${i2.toFixed(1)}) — le 435 mesurait ×3,05`);
}

console.log("\n=== 5. l'étang n'a rien noyé ===\n");
{
  const alleyX = p.x + (p.w >> 1), alleyY = p.y + (p.h >> 1);
  let cutCol = 0, cutRow = 0;
  for (let y = p.y; y < p.y + p.h; y++) for (const dx of [0, 1]) if (tw.ground[y * tw.w + alleyX + dx] === C.G_WATER) cutCol++;
  for (let x = p.x; x < p.x + p.w; x++) for (const dy of [0, 1]) if (tw.ground[(alleyY + dy) * tw.w + x] === C.G_WATER) cutRow++;
  ok(cutCol === 0 && cutRow === 0, "l'allée en croix du parc traverse à sec", `${cutCol} case(s) en colonne, ${cutRow} en rangée`);
  const inPark = (q) => q.x >= p.x && q.x < p.x + p.w && q.y >= p.y && q.y < p.y + p.h;
  const kinds = {};
  for (const q of tw.props) if (inPark(q)) kinds[q.kind] = (kinds[q.kind] || 0) + 1;
  /* ⚠️ CE CONTRÔLE A ÉTÉ ÉCRIT APRÈS AVOIR PERDU UN MASSIF. En poussant les
     harmoniques d'un cran, l'étang a mangé la case du massif (122, 83) : le
     générateur refuse poliment de poser un décor dans l'eau, donc rien n'a
     levé — il y avait juste trois massifs au lieu de quatre, et il aurait fallu
     les compter pour s'en apercevoir. C'est ce que fait cette ligne. */
  ok(kinds.topiary === 4, "les quatre massifs taillés sont posés", `${kinds.topiary || 0} massif(s)`);
  /* ⚠️ 437 — « AU MOINS DEUX » ET PLUS « EXACTEMENT DEUX ». Le parc a gagné un
     belvédère et deux bancs d'allée ; un contrôle qui fige un NOMBRE interdit
     d'en ajouter, alors que ce qu'on veut savoir est « peut-on s'asseoir au
     bord de l'eau ». Le compte exact reste juste pour les massifs taillés, qui
     sont quatre par construction (un par quadrant). */
  ok((kinds.bench || 0) >= 2, "on peut s'asseoir au bord de l'étang", `${kinds.bench || 0} banc(s)`);
  /* ⚠️ ZIP 439 — LES NYMPHÉAS FLOTTENT, ET C'EST LA MÊME EXCEPTION QUE CELLE
     ENTRÉE DANS `verify-vallee.mjs` ET `render-parc.mjs` LE MÊME JOUR. Ce
     contrôle cherche un décor NOYÉ PAR ACCIDENT — un banc que le creusement de
     l'étang a rattrapé — pas un décor dont la place EST l'eau. Le pont japonais
     du 439 vient avec ses six herbiers de nénuphars : sans cette ligne, le banc
     appelait « défaut » le sujet même du tableau. */
  const FLOTTE = new Set(["lily", "reedsWater", "stepStones"]);
  let dry = 0;
  for (const q of tw.props) if (inPark(q) && !FLOTTE.has(q.kind) && tw.ground[q.y * tw.w + q.x] === C.G_WATER) dry++;
  ok(dry === 0, "aucun décor du parc n'a les pieds dans l'eau", `${dry} décor(s) noyé(s)`);
}

console.log("\n=== 6. la berge et la profondeur, côté données ===\n");
{
  let band1 = 0, band2 = 0, rim = 0, water = 0, naked = 0;
  for (let i = 0; i < tw.w * tw.h; i++) {
    if (tw.shore[i] === 1) band1++; else if (tw.shore[i] === 2) band2++; else if (tw.shore[i] === 3) rim++;
    if (tw.ground[i] !== C.G_WATER) continue;
    water++;
    // Toute case d'eau de bord doit porter sa marque de rive : sans elle, le
    // quart de case laissé sec par le contour montrerait le lit, c'est-à-dire
    // de l'herbe verte À L'INTÉRIEUR du rivage.
    const x = i % tw.w, y = (i / tw.w) | 0;
    let edge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= tw.w || ny >= tw.h || tw.ground[ny * tw.w + nx] !== C.G_WATER) { edge = true; break; }
    }
    if (edge && tw.shore[i] !== 3) naked++;
  }
  ok(naked === 0, "toute case d'eau de bord porte sa rive mouillée", `${naked} case(s) nue(s)`);
  ok(band1 > 0 && band2 > 0, "les deux bandes de berge existent", `${band1} mouillée(s), ${band2} sèche(s), ${rim} de rive`);
  // ⚠️ Aucune berge sur la pierre, l'eau ou une rue : c'est le test qui remplace
  // un cas particulier par plan d'eau (quai du lac du sud, allée du parc, ponton).
  let onHard = 0;
  for (let i = 0; i < tw.w * tw.h; i++) {
    if (tw.shore[i] !== 1 && tw.shore[i] !== 2) continue;
    const g = tw.ground[i];
    if (g !== C.G_GRASS && g !== C.G_TOWN_LAWN) onHard++;
  }
  ok(onHard === 0, "aucun galet sur la pierre ni sur une rue", `${onHard} case(s)`);
  ok(water > 0 && tw.depth.some((d) => d > 200), "la carte de profondeur atteint le large", `${water} cases d'eau`);
}

console.log("\nImages : tools/out/eau-etang.png, eau-etang-t2.png, eau-lac-sud.png, eau-contours.png");
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC\n` : "\nTout est bon.\n");
process.exit(fail ? 1 : 0);
