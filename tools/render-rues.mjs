/* =============================================================================
   render-rues.mjs — LE REVÊTEMENT DES RUES DE VALLEY TOWN. (434)
   -----------------------------------------------------------------------------
   ⚠️ IL EXISTE PARCE QUE LE 433 A COÛTÉ TROIS DÉCOUPES DE CANEVAS ET UNE
   « TRAJECTOIRE STUPIDE » QUE DOUZE CONTRÔLES REGARDAIENT SANS LA VOIR. La
   leçon écrite ce jour-là, en tête de CLAUDE.md : *quand Guillaume voit un
   défaut qu'aucun banc ne voit, la question n'est pas « où est le bogue » mais
   « quelle grandeur ne mesure-t-on pas ».* Pour un revêtement de sol, les deux
   grandeurs sont connues d'avance, et aucune n'était mesurée nulle part :

     1. LE BOUCLAGE. Un motif de 4×4 tuiles qui ne se raccorde pas à lui-même
        dessine une SECONDE grille, tous les 64 px — c'est-à-dire pire que la
        tuile unique qu'il remplace. Ça ne se voit pas sur une tuile, ça ne se
        voit qu'assemblé, et ça saute aux yeux en jeu. On mesure donc l'écart
        entre les colonnes qui se raccordent, comparé à l'écart entre deux
        colonnes ordinaires : un bouclage juste ne se distingue pas du reste.

     2. LA SYMÉTRIE (leçon du 425/433, payée quatre fois). L'allée du cimetière
        penchait d'une case vers l'est DEPUIS LE 425 et c'est Guillaume qui l'a
        vue, en jouant. On la mesure maintenant contre l'axe de l'enclos.

   Et un troisième contrôle qui n'est pas une mesure de dessin mais de RÈGLE :
   le rebord doit ceindre la rue et JAMAIS traverser un carrefour. Un carrefour
   barré par un trottoir se verrait tout de suite en jouant, et pas du tout à la
   lecture — le taxi le traverserait sans rien signaler.

   ⚠️ Il appelle `A.drawTownRoadTile`, c'est-à-dire EXACTEMENT la fonction que la
   boucle de rendu appelle. Recopier le dessin ici aurait mesuré autre chose que
   le jeu (le stub menteur du §10).

   Usage :  node tools/render-rues.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, paletteOf, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine;
const S = A.buildSprites();
const T = 16;

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/* ═══════════════ 1. LES TROIS SURFACES, ASSEMBLÉES SUR 6×6 TUILES ═════════
   ⚠️ SIX TUILES ET PAS QUATRE : à quatre, on ne verrait qu'UNE période et le
   raccord serait hors cadre. C'est le même piège que le banc de la rangée
   d'étals (431) — un élément seul ne dit rien de ce à quoi ressemble une
   rangée. Le découpage reproduit celui du rendu (`x % sup`), à la ligne près. */
const RS = S.townRoad;
const SURFACES = [["goudron", RS.asphalt], ["pavés", RS.cobble], ["briques", RS.brick]];
{
  const NT = 6, PAD = 6;
  const W = SURFACES.length * (NT * T + PAD) + PAD, H = NT * T + PAD * 2;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#2a2c30"; sh.ctx.fillRect(0, 0, W, H);
  SURFACES.forEach(([, atlas], k) => {
    const ox = PAD + k * (NT * T + PAD);
    for (let ty = 0; ty < NT; ty++) for (let tx = 0; tx < NT; tx++) {
      sh.ctx.drawImage(atlas, (tx % RS.sup) * T, (ty % RS.sup) * T, T, T, ox + tx * T, PAD + ty * T, T, T);
    }
  });
  const up = scale(sh.px, W, H, 4);
  writePNG(path.join(OUT, "rues-surfaces.png"), up.px, up.W, up.H);
}

console.log("\n=== le bouclage : le motif se raccorde-t-il à lui-même ? ===\n");
for (const [name, atlas] of SURFACES) {
  const N = atlas.width, px = atlas.__px;
  const at = (x, y, k) => px[(y * N + x) * 4 + k];
  /* L'écart moyen entre deux colonnes voisines, sur les trois canaux. Puis le
     même écart pour la paire qui se raccorde (dernière colonne → première).
     ⚠️ ON COMPARE UN RAPPORT, PAS UN SEUIL ABSOLU : un motif très contrasté a
     un écart de voisinage élevé partout, et un seuil fixe le déclarerait faux.
     Ce qui doit être vrai est « le raccord ne se distingue pas du reste ».
     ⚠️⚠️ ET ON LE COMPARE AU MAXIMUM, PAS À LA MOYENNE — premier jet, et il
     accusait à tort les pavés et les briques. Un pavage n'a pas un écart
     uniforme : l'intérieur d'une pierre ne change presque pas d'une colonne à
     la suivante, un JOINT change beaucoup. La moyenne est donc tirée vers le
     bas par les intérieurs, et toute couture tombant sur un joint — c'est-à-dire
     toute couture d'un pavage correct — la dépassait. La bonne question n'est
     pas « la couture est-elle discrète » mais « la couture est-elle PLUS
     VOYANTE que la plus voyante des transitions internes ». Le banc s'est
     trompé avant le dessin : c'est exactement pour ça qu'on relit ses verdicts
     (§10, « un banc de rendu se vérifie aussi »). */
  const colDiff = (a, b) => {
    let s = 0;
    for (let y = 0; y < N; y++) for (let k = 0; k < 3; k++) s += Math.abs(at(a, y, k) - at(b, y, k));
    return s / (N * 3);
  };
  const rowDiff = (a, b) => {
    let s = 0;
    for (let x = 0; x < N; x++) for (let k = 0; k < 3; k++) s += Math.abs(at(x, a, k) - at(x, b, k));
    return s / (N * 3);
  };
  let cMax = 0, rMax = 0;
  for (let i = 0; i < N - 1; i++) { cMax = Math.max(cMax, colDiff(i, i + 1)); rMax = Math.max(rMax, rowDiff(i, i + 1)); }
  const cSeam = colDiff(N - 1, 0), rSeam = rowDiff(N - 1, 0);
  // La marge de 20 % : le maximum sur 63 échantillons est lui-même bruité, et
  // une couture qui tombe sur une transition de joint la dépasse d'un cheveu
  // sans rien montrer à l'œil. Ce contrôle-ci dit « pas de rupture franche » ;
  // celui d'après, plus dur, dit « les formes se poursuivent vraiment ».
  ok(cSeam <= cMax * 1.2, `${name} — raccord horizontal`, `couture ${cSeam.toFixed(1)} vs pire transition interne ${cMax.toFixed(1)}`);
  ok(rSeam <= rMax * 1.2, `${name} — raccord vertical`, `couture ${rSeam.toFixed(1)} vs pire transition interne ${rMax.toFixed(1)}`);
  /* ⚠️⚠️ ET VOICI LE CONTRÔLE QUI DÉCIDE VRAIMENT — les deux précédents sont
     statistiques, celui-ci est STRUCTUREL. Un motif bouclé a des PIERRES À
     CHEVAL sur le bord : le pixel de la dernière colonne et celui de la
     première appartiennent alors à la même pierre, donc portent la même
     couleur. Sans `roadWrap`, la pierre serait coupée net au bord droit et le
     bord gauche recommencerait sur du joint : la concordance s'effondre. C'est
     la différence entre « la couture est discrète » et « la couture n'existe
     pas », et seule la seconde est ce qu'on veut.
     ⚠️ Le goudron en est exempté À DESSEIN : son grain est tiré pixel par
     pixel, aucune forme ne traverse, la concordance y serait fortuite. Ce sont
     ses fissures et ses reprises qui bouclent, et c'est la mesure statistique
     ci-dessus qui les couvre. */
  if (name !== "goudron") {
    let same = 0;
    for (let y = 0; y < N; y++) {
      const a = (y * N + N - 1) * 4, b = (y * N) * 4;
      if (px[a] === px[b] && px[a + 1] === px[b + 1] && px[a + 2] === px[b + 2]) same++;
    }
    ok(same >= N * 0.45, `${name} — les formes traversent le bord`, `${same}/${N} rangées concordantes`);
  }
}

console.log("\n=== la matière : un sol texturé, pas un aplat (§8) ===\n");
for (const [name, atlas] of SURFACES) {
  const N = atlas.width, px = atlas.__px;
  let sum = 0, sum2 = 0;
  for (let i = 0; i < N * N; i++) { const L = lum(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]); sum += L; sum2 += L * L; }
  const mean = sum / (N * N), sd = Math.sqrt(sum2 / (N * N) - mean * mean);
  const pal = paletteOf(px, N, N);
  const nCol = pal.colors !== undefined ? pal.colors : (pal.n !== undefined ? pal.n : pal);
  /* ⚠️ L'ÉCART-TYPE, PAS LA MOYENNE — c'est la leçon la plus chère du §8 : au
     421 la luminosité moyenne était juste et l'image fausse, faute d'ombres.
     Ce qu'on achète avec un pavé de 4×4, c'est du RELIEF ; un écart-type au ras
     de zéro voudrait dire qu'on a peint une couleur unie très détaillée. */
  ok(sd >= 9, `${name} — relief`, `L moyen ${mean.toFixed(1)} · écart-type ${sd.toFixed(1)} · ${nCol} couleurs`);
  /* ⚠️ TRENTE, ET LE SEUIL EST LE MÊME POUR LES TROIS — c'est délibéré. La
     tentation était d'en mettre 40 (les pavés en comptent 42, les briques 46)
     et d'exempter le goudron, qui plafonne à 33 : un bitume est UN matériau,
     sa richesse est dans l'écart de VALEUR (§8), pas dans le nombre de teintes.
     Un seuil par surface serait un seuil réglé sur le résultat, c'est-à-dire un
     banc qui ne peut plus rien refuser. */
  ok(Number(nCol) >= 30, `${name} — richesse de palette`, `${nCol} couleurs distinctes`);
}

/* ═══════════════ 2. LA VILLE, DEPUIS LE VRAI GÉNÉRATEUR ═══════════════════
   ⚠️ TROIS FENÊTRES, ET C'EST LE NOMBRE MINIMUM : le revêtement ne se juge pas
   sur une bande de rue, il se juge sur ce qui le BORDE. Une chaussée seule est
   toujours belle ; ce sont le bord, le carrefour et le raccord à l'herbe qui
   révèlent les défauts (leçon de la place du 425 : « une esplanade qui s'arrête
   net dans l'herbe a l'air découpée aux ciseaux »). */
const tw = E.generateTownWorld();
/* PHASE 7 (2026-09-27) : plus de colonne d'artère. Le carrefour de l'AVENUE est
   celui de la rue du Parc (ses contrôles de bordure lisent l'avenue) ; la vue
   « courbe » regarde celui de la rue des Jardins et de la rue du Parc, deux rues
   COURBES — le bord libre des rues pavées (`townRoadField`) s'y juge. */
const crossOf = (p, q) => C.townRoadCrossings().find((c) => (c.a === p && c.b === q) || (c.a === q && c.b === p));
const CX = crossOf("gare", "parc").x0;             // la PREMIÈRE colonne de la rue transversale (l'ancien `TOWN_ST_COLS[2]`)
const XC = crossOf("jardins", "parc"), CXc = Math.round(XC.cx), CYc = Math.round(XC.cy);
const cm = C.TOWN_CEMETERY;
const VIEWS = [
  ["artere", { x: 20, y: 62, w: 34, h: 16 }],    // la grande artère, ses bordures, une allée de maison
  ["carrefour", { x: CX - 12, y: 62, w: 28, h: 16 }],
  ["courbe", { x: CXc - 14, y: CYc - 8, w: 28, h: 16 }],
  ["cimetiere", { x: cm.x - 2, y: cm.y - 1, w: cm.w + 4, h: cm.h + 3 }],
  /* ⚠️ LA QUATRIÈME EST CELLE QUE GUILLAUME A DEMANDÉE EN TOUTES LETTRES :
     « la rue nord-sud ne doit pas couper l'esplanade ». Un compteur à zéro le
     prouve (voir plus bas), mais ce qu'on veut vraiment savoir est à quoi
     RESSEMBLE une chaussée qui meurt sur une place — et ça, seul un dessin le
     dit. */
  ["esplanade", { x: C.TOWN_PLAZA.x - 6, y: C.TOWN_PLAZA.y - 2, w: 22, h: 20 }],
];
const shots = {};
for (const [name, v] of VIEWS) {
  const sh = makeCanvas(v.w * T, v.h * T);
  for (let y = v.y; y < v.y + v.h; y++) for (let x = v.x; x < v.x + v.w; x++) {
    const i = y * tw.w + x, g = tw.ground[i], px = (x - v.x) * T, py = (y - v.y) * T;
    /* ⚠️ LE DÉCOR AUTOUR EST APPROXIMÉ, LA RUE NE L'EST PAS. L'herbe est le vrai
       sprite du jeu ; le dallage et le gazon sont peints à leur teinte moyenne
       plutôt que par la vingtaine de `fillRect` qui vivent, eux, dans la closure
       du rendu. C'est assumé et c'est dit : ce banc juge le REVÊTEMENT, et il
       faut un fond honnête autour pour le juger, pas un décor complet. */
    if (g === C.G_PATH) { if (!A.drawTownRoadTile(sh.ctx, S, tw, x, y, px, py)) sh.ctx.drawImage(S.path, px, py); }
    else if (g === C.G_PATH_STONE) { if (!A.drawTownFlagTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#a5a4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else if (g === C.G_WATER) { sh.ctx.fillStyle = "#3f7fd0"; sh.ctx.fillRect(px, py, T, T); }
    /* PHASE 7 (2026-09-27) : l'herbe passe par la VRAIE fonction du jeu — c'est
       elle qui pose la découpe d'une rue pavée courbe sur la case voisine
       (`drawTownRoadSpill`). Peinte avec les vieilles tuiles, l'herbe coupait
       chaque rue au bord de sa case, et ce banc montrait des marches que le jeu
       ne dessine pas. */
    else if ((g === C.G_GRASS || g === C.G_TOWN_LAWN) && A.drawTownGrassTile(sh.ctx, S, tw, x, y, px, py)) { /* peinte */ }
    else {
      const gt = S.townGrass;
      sh.ctx.drawImage(gt[(x * 37 + y * 17) % gt.length], px, py);
      if (g === C.G_TOWN_LAWN) { sh.ctx.fillStyle = "rgba(24,70,30,0.20)"; sh.ctx.fillRect(px, py, T, T); }
    }
    if (tw.hedge && tw.hedge[i]) { sh.ctx.fillStyle = "#2f6b32"; sh.ctx.fillRect(px, py + 2, T, T - 2); }
  }
  shots[name] = { sh, v };
  const up = scale(sh.px, v.w * T, v.h * T, 3);
  writePNG(path.join(OUT, "rues-" + name + ".png"), up.px, up.W, up.H);
}

console.log("\n=== la chaussée : géométrie et axe ===\n");
{
  const Y0 = C.TOWN_MAIN_ST_Y0, WD = C.TOWN_MAIN_ST_W;
  ok(WD % 2 === 0, "largeur de chaussée paire", `${WD} cases`);
  /* ⚠️ LE CONTRÔLE QUI PROTÈGE LE TAXI. `townRoadCenter` repose la voiture au
     milieu de la bande roulable : si l'élargissement n'était pas symétrique,
     l'axe se déplacerait et les 132 courses de verify-taxi.mjs changeraient de
     trajectoire sans qu'aucune d'elles n'échoue — un défaut parfaitement muet.
     L'ancien milieu (rangées 70-71) valait TOWN_MAIN_ST_Y + 1. */
  ok(Y0 + WD / 2 === C.TOWN_MAIN_ST_Y + 1, "l'axe n'a pas bougé en élargissant",
     `axe y = ${Y0 + WD / 2}, chaussée ${Y0}..${Y0 + WD - 1}`);
  let bad = 0, cnt = 0;
  for (let x = 12; x < tw.w - 4; x++) {
    for (let dy = -1; dy <= WD; dy++) {
      const y = Y0 + dy, i = y * tw.w + x;
      const isAsp = tw.road[i] === C.TR_ASPHALT;
      const inBand = dy >= 0 && dy < WD;
      if (isAsp && !inBand) bad++;
      if (inBand && isAsp) cnt++;
    }
  }
  ok(bad === 0, "aucun goudron hors de la bande", `${cnt} cases de goudron`);
  // La place n'est pas coupée : demande explicite de Guillaume.
  let inPlaza = 0;
  for (let y = C.TOWN_PLAZA.y; y < C.TOWN_PLAZA.y + C.TOWN_PLAZA.h; y++) {
    for (let x = C.TOWN_PLAZA.x; x < C.TOWN_PLAZA.x + C.TOWN_PLAZA.w; x++) if (tw.road[y * tw.w + x]) inPlaza++;
  }
  ok(inPlaza === 0, "l'esplanade n'est coupée par aucune chaussée", `${inPlaza} case(s) revêtue(s) dans la place`);
  // Et toutes les rues sont revêtues : une rue oubliée resterait en terre.
  let street = 0, plain = 0;
  // PHASE 7 : les cases de TOUTES les rues déclarées (`TOWN_ROADS`), plus des rangées.
  for (const r of C.TOWN_ROADS) for (const [x, y] of C.townRoadCells(r)) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x;
    if (tw.ground[i] !== C.G_PATH) continue;
    street++; if (!tw.road[i]) plain++;
  }
  ok(plain === 0, "aucune rue laissée en terre battue", `${street} cases de rue, ${plain} sans revêtement`);
}

console.log("\n=== l'allée du cimetière : centrée, en briques ===\n");
{
  let minX = 1e9, maxX = -1e9, n = 0;
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    if (tw.road[y * tw.w + x] === C.TR_BRICK) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); n++; }
  }
  const alleyMid = (minX + maxX + 1) / 2, encMid = cm.x + cm.w / 2;
  ok(n > 0, "l'allée est en briques", `${n} cases, colonnes ${minX}..${maxX}`);
  ok(alleyMid === encMid, "l'allée est CENTRÉE sur l'enclos",
     `axe de l'allée ${alleyMid} vs axe de l'enclos ${encMid}`);
  /* Et la vérification qui aurait attrapé le défaut de 2025 : les tombes sont
     posées en rangs symétriques ; si l'allée est juste, leurs distances à l'axe
     se répondent deux à deux. C'est le contrôle de symétrie du 431 (façades),
     appliqué à un plan au sol. */
  const gx = tw.props.filter(p => p.kind === "grave").map(p => p.x + 0.5 - alleyMid);
  const left = gx.filter(d => d < 0).map(d => -d).sort((a, b) => a - b);
  const right = gx.filter(d => d > 0).sort((a, b) => a - b);
  const sym = left.length === right.length && left.every((d, k) => Math.abs(d - right[k]) < 0.01);
  ok(sym, "les tombes sont symétriques de part et d'autre",
     `gauche ${[...new Set(left)].join("/")} · droite ${[...new Set(right)].join("/")}`);
}

console.log("\n=== les rebords : autour de la rue, jamais en travers ===\n");
{
  /* ⚠️ ON MESURE DES PIXELS, PAS UNE INTENTION (leçon de render-taxi au 433 :
     « les deux trois-quarts ANNONÇAIENT ground = 23 sur un dessin qui s'arrêtait
     cinq pixels plus haut »). Le nez de bordure est une RANGÉE CONTINUE de gris
     clair sur toute la largeur d'une case ; le biseau d'un pavé, lui, ne fait
     jamais plus de neuf pixels de suite. On cherche donc des séquences de 12
     pixels ou plus au-dessus de L 190. */
  const runAt = (sh, W, y, x0, x1) => {
    let best = 0, run = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      if (lum(sh.px[i], sh.px[i + 1], sh.px[i + 2]) >= 190) { run++; best = Math.max(best, run); } else run = 0;
    }
    return best;
  };
  const { sh, v } = shots.carrefour;
  const W = v.w * T, Y0 = C.TOWN_MAIN_ST_Y0;
  // En rase campagne (loin du carrefour), le nez de bordure doit être là.
  const openX0 = 0, openX1 = (CX - 4 - v.x) * T;
  const edge = runAt(sh, W, (Y0 - v.y) * T, openX0, openX1);
  ok(edge >= 12, "le nez de bordure borde la chaussée", `${edge} px de suite au bord nord`);
  // Dans le carrefour, aucune bordure : la rue transversale doit passer.
  let worst = 0;
  for (let dy = 0; dy < C.TOWN_MAIN_ST_W; dy++) {
    for (let py = 0; py < T; py++) {
      worst = Math.max(worst, runAt(sh, W, (Y0 + dy - v.y) * T + py, (CX - v.x) * T, (CX + 2 - v.x) * T));
    }
  }
  ok(worst < 12, "aucun trottoir ne barre le carrefour", `plus longue rangée claire : ${worst} px`);
}

console.log("\n=== la ligne blanche ===\n");
{
  // ⚠️ HORS-ZIP 2026-09-02 — LE MARQUAGE A ÉTÉ RETIRÉ (fermeArt.js,
  // drawTownRoadTile), sur constat de l'audit du même jour : une peinture
  // routière du XXe siècle à côté du chaume et des guirlandes. Le contrôle ne
  // cherche donc plus le trait, il vérifie son ABSENCE — un banc qui teste
  // toujours une fonctionnalité supprimée est le piège périmé que le §14 du
  // dépôt interdit (« un piège périmé recopié ailleurs est pire qu'un piège
  // supprimé »).
  const { sh, v } = shots.artere, W = v.w * T;
  let n = 0;
  for (let y = 0; y < v.h * T; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (sh.px[i] === 0xd6 && sh.px[i + 1] === 0xd4 && sh.px[i + 2] === 0xc8) n++;
    }
  }
  ok(n === 0, "aucun marquage blanc résiduel sur la chaussée", `${n} pixel(s) trouvé(s)`);
}

/* ═══════════════ 2026-09-25 (phase 2) — LA FONTAINE POSÉE SUR LE DALLAGE ═════
   Ses deux cases sont de l'EAU pour la collision : `drawTownFlagTile` les
   prenait donc pour un bord de place, les dalles voisines traçaient leur
   pierre de bordure claire (`#cfcabb`) tout autour, et le jeu peignait les
   deux cases d'un aplat gris — le « rectangle clair derrière la fontaine » de
   l'audit. On peint le carré de 4×4 cases qui l'entoure EXACTEMENT comme le jeu
   (les deux cases de la fontaine comprises), et on exige : aucune pierre de
   bordure, et plus un pixel de l'ancien aplat (`#adacb3`). */
{
  const fo = C.TOWN_FOUNTAIN, sh = makeCanvas(4 * T, 4 * T);
  let painted = 0;
  for (let y = fo.y - 1; y <= fo.y + 2; y++) for (let x = fo.x - 1; x <= fo.x + 2; x++) {
    const g = tw.ground[y * tw.w + x];
    const inFtn = x >= fo.x && x < fo.x + 2 && y >= fo.y && y < fo.y + 2;
    if (g === C.G_PATH_STONE || inFtn) { if (A.drawTownFlagTile(sh.ctx, S, tw, x, y, (x - fo.x + 1) * T, (y - fo.y + 1) * T)) painted++; }
  }
  let edge = 0, flat = 0;
  for (let i = 0; i < sh.px.length; i += 4) {
    if (sh.px[i] === 0xcf && sh.px[i + 1] === 0xca && sh.px[i + 2] === 0xbb) edge++;
    if (sh.px[i] === 0xad && sh.px[i + 1] === 0xac && sh.px[i + 2] === 0xb3) flat++;
  }
  ok(painted === 16, "les seize cases autour de la fontaine sont du dallage, les siennes comprises", `${painted}/16 peintes`);
  ok(edge === 0 && flat === 0, "aucune bordure ni aplat gris sous la vasque", `${edge} px de bordure · ${flat} px d'aplat`);
}

/* ═══════════════ 2026-10-04 — UNE ZONE PAVÉE, UNE SEULE FAMILLE DE DALLAGE ═══
   Le parvis du tribunal débordait du rectangle civique : un U de grès des
   terrasses accolé au dallage civique, coupé en ligne droite sur un sol de niveau.
   On exige : aucune paire de dalles VOISINES de familles différentes, et le
   parvis du tribunal (sa rangée sud) bien civique. ⚠️ Falsifié en rappelant
   `townPavingFamily` sans la carte (l'ancien découpage) : 42 paires, rangée 68 en grès. */
{
  const fam = (x, y) => A.townPavingFamily(x, y, tw);
  const paved = (x, y) => x >= 0 && y >= 0 && x < tw.w && y < tw.h && tw.ground[y * tw.w + x] === C.G_PATH_STONE;
  let mixed = 0;
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    if (!paved(x, y)) continue;
    if (paved(x + 1, y) && fam(x + 1, y) !== fam(x, y)) mixed++;
    if (paved(x, y + 1) && fam(x, y + 1) !== fam(x, y)) mixed++;
  }
  ok(mixed === 0, "aucune zone pavée ne mêle deux familles de dallage", `${mixed} paire(s) de dalles voisines de familles différentes`);
  const Ct = C.TOWN_COURT, cx = Ct.x + (Ct.w >> 1);
  let yS = Ct.y + Ct.h; while (paved(cx, yS + 1)) yS++;
  ok(fam(cx, yS) === "civic", "le parvis du tribunal est civique jusqu'à sa dernière rangée", `rangée ${yS} : ${fam(cx, yS)}`);
}

/* ═══════════════ 2026-10-04 (nuit) — L'OBÉLISQUE, SON ENCLOS, SES VOISINS ═════
   Guillaume : « l'obélisque est cheap ». Repeint au pixel d'écran (`plazaMonumentHi`),
   dans un enclos de bornes et de chaînes qui EST la collision (`TOWN_MONUMENT_FOOT`),
   bancs reculés et lampadaires avancés en passe finale. On exige ce dont le rendu
   dépend, pas « est-il beau » :
   · l'enclos est solide, et le dessin opaque tient dans sa largeur (on ne voit pas
     une borne là où l'on peut marcher) — alpha ≥ 200 : les ombres ne comptent pas ;
   · le FÛT est plus sombre que le dallage civique (l'ancien était plus PÂLE que le
     sol, il ne s'en détachait pas : c'était ça, le « cheap ») ;
   · les bancs et les lampadaires restent par paires sur l'axe de la place (la
     porte de l'hôtel de ville, règle du 436) ;
   · sous la neige, l'enclos n'ombre pas en BLOC : une chaîne ne porte rien, le fût
     porte (vu en jeu au premier jet : un pavé bleu de 4 cases).
   ⚠️ Falsifié (lancé) : l'ancien fût (#cfcabc) vaut L 202 contre 163 au dallage ; sans
   `obeliskCasterCell`, la neige donne 40 px sous la chaîne comme sous le fût. */
{
  const FT = C.TOWN_MONUMENT_FOOT, mo = C.TOWN_MONUMENT, G = S.monumentGeo;
  let solidN = 0;
  for (let y = FT.y; y < FT.y + FT.h; y++) for (let x = FT.x; x < FT.x + FT.w; x++) if (tw.solid[y * tw.w + x]) solidN++;
  ok(solidN === FT.w * FT.h, "l'enclos de l'obélisque est solide, case pour case", `${solidN}/${FT.w * FT.h}`);
  const nat = S.plazaMonument, d = nat.__px || nat.px;
  let minX = 1e9, maxX = -1e9;
  for (let y = nat.height - FT.h * T; y < nat.height; y++) for (let x = 0; x < nat.width; x++) if (d[(y * nat.width + x) * 4 + 3] >= 200) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  const half = FT.w * T / 2, c0 = nat.width / 2;
  ok(minX >= c0 - half && maxX < c0 + half, "le dessin de l'enclos tient dans la collision", `opaque de ${minX - c0} à ${maxX + 1 - c0} px, emprise ±${half}`);
  const hi = S.plazaMonumentHi(2), hd = hi.__px || hi.px;
  ok(hi.width === G.W * 2 && hi.height === G.H * 2 && nat.width === G.W && nat.height === G.H, "un canevas par cran, à la taille des cotes", `cran 2 : ${hi.width} × ${hi.height}`);
  // le fût : la colonne du milieu, sur la moitié haute du fût (hors pyramidion et socle)
  let sL = 0, sN = 0;
  for (let y = Math.round((G.gy - 70) * 2); y < Math.round((G.gy - 45) * 2); y++) for (let x = Math.round(G.cx * 2) - 3; x < Math.round(G.cx * 2) + 3; x++) {
    const i = (y * hi.width + x) * 4; if (hd[i + 3] < 250) continue; sL += lum(hd[i], hd[i + 1], hd[i + 2]); sN++;
  }
  const fl = RS.flag, fd = fl.__px || fl.px; let pL = 0, pN = 0;
  for (let i = 0; i < fl.width * fl.height; i++) { pL += lum(fd[i * 4], fd[i * 4 + 1], fd[i * 4 + 2]); pN++; }
  ok(sN > 50 && sL / sN < pL / pN - 8, "le fût se détache du dallage : plus sombre que lui", `fût L ${(sL / Math.max(1, sN)).toFixed(0)} · dallage L ${(pL / pN).toFixed(0)}`);
  const at = (kind, x, y) => tw.props.some((p) => p.kind === kind && p.x === x && p.y === y);
  ok(at("bench", mo.x - 2, mo.y - 3) && at("bench", mo.x + 3, mo.y - 3) && at("lamp", mo.x - 3, mo.y + 2) && at("lamp", mo.x + 4, mo.y + 2),
     "bancs reculés et lampadaires avancés, par paires sur l'axe de la place",
     `bancs ${mo.x - 2}/${mo.x + 3} · lampadaires ${mo.x - 3}/${mo.x + 4} — axe ${mo.x + 1}`);
  const env = A.townSnowEnv(tw, S, () => false);
  const mcx = (FT.x + FT.w / 2) * T, mcy = (FT.y + FT.h / 2) * T;
  const ring = env.casterAt(mcx - G.postX + 4, mcy), shaft = env.casterAt(mcx, mcy);
  ok(ring === 0 && shaft > 40, "sous la neige, une chaîne ne porte pas d'ombre, le fût si", `entre chaîne et marches ${ring} px · fût ${shaft} px`);
}

console.log("\nImages : tools/out/rues-surfaces.png, rues-artere.png, rues-carrefour.png, rues-cimetiere.png, rues-esplanade.png");
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC\n` : "\nTout est bon.\n");
process.exit(fail ? 1 : 0);
