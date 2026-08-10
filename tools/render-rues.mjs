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
const CX = C.TOWN_ST_COLS[2];                    // l'artère nord-sud du tribunal (x = 150)
const cm = C.TOWN_CEMETERY;
const VIEWS = [
  ["artere", { x: 20, y: 62, w: 34, h: 16 }],    // la grande artère, ses bordures, une allée de maison
  ["carrefour", { x: CX - 12, y: 62, w: 28, h: 16 }],
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
  for (const ry of C.TOWN_ST_ROWS) {
    const top = ry === C.TOWN_MAIN_ST_Y ? Y0 : ry, h = ry === C.TOWN_MAIN_ST_Y ? WD : 2;
    for (let x = 12; x < tw.w - 4; x++) for (let dy = 0; dy < h; dy++) {
      const i = (top + dy) * tw.w + x;
      if (tw.ground[i] !== C.G_PATH) continue;
      street++; if (!tw.road[i]) plain++;
    }
  }
  ok(plain === 0, "aucune rue est-ouest laissée en terre battue", `${street} cases de rue, ${plain} sans revêtement`);
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
  const { sh, v } = shots.artere, W = v.w * T;
  const axis = C.TOWN_MAIN_ST_Y0 + C.TOWN_MAIN_ST_W / 2;
  const rows = [];
  for (let y = 0; y < v.h * T; y++) {
    let n = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (sh.px[i] === 0xd6 && sh.px[i + 1] === 0xd4 && sh.px[i + 2] === 0xc8) n++;
    }
    if (n > 0) rows.push([y, n]);
  }
  ok(rows.length === 2, "la ligne tient sur deux rangées de pixels", rows.map(r => r[0]).join(", "));
  if (rows.length === 2) {
    ok(rows[1][0] === rows[0][0] + 1, "les deux rangées sont jointives", `${rows[0][0]} et ${rows[1][0]}`);
    // Et elles encadrent l'axe : la couture entre les deux est l'axe exact.
    const seamWorld = v.y + (rows[0][0] + 1) / T;
    ok(seamWorld === axis, "la ligne est CENTRÉE sur l'axe de la chaussée", `couture y = ${seamWorld}, axe ${axis}`);
    // Discontinue : le trait couvre nettement moins que toute la largeur.
    const cover = rows[0][1] / W;
    ok(cover > 0.25 && cover < 0.65, "la ligne est bien discontinue", `${(cover * 100).toFixed(0)} % de la longueur`);
  }
}

console.log("\nImages : tools/out/rues-surfaces.png, rues-artere.png, rues-carrefour.png, rues-cimetiere.png, rues-esplanade.png");
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC\n` : "\nTout est bon.\n");
process.exit(fail ? 1 : 0);
