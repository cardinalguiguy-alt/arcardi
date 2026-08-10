/* =============================================================================
   render-escaliers.mjs — LES MARCHES, LES FALAISES ET LES LIMONS DE LA
   HAUTE-VILLE. (436)
   -----------------------------------------------------------------------------
   ⚠️⚠️ IL EXISTE PARCE QUE GUILLAUME A VU L'ÉCART SANS QU'AUCUN BANC NE PUISSE
   LE VOIR : « corrige les écarts entre le détail du sol pavé et les escaliers
   du courthouse/uppertown. Il y a un écart flagrant de qualité de textures. »

   Et la cause de l'écart est structurelle, pas artistique — c'est le piège n°1
   du projet (§4 de CLAUDE.md) sous sa forme la plus tranquille. Les revêtements
   du 434 vivent dans `fermeArt`, donc `tools/render-rues.mjs` les regarde à
   chaque lancement, donc ils ont reçu quatre refus avant d'être livrés. Les
   marches, la falaise et le limon vivaient dans la closure de `drawTownFrame` :
   AUCUN outil ne pouvait les rastériser, personne ne les a jamais regardés hors
   du jeu, et ils sont restés au dessin du 425 pendant que tout le reste du sol
   de la ville passait au motif de 64 px. **Un dessin qu'aucun banc ne peut
   appeler est un dessin qui vieillit tout seul.**

   Ce qu'on mesure ici, et pourquoi ce sont ces grandeurs-là :

     1. LE BOUCLAGE, exactement comme au 434 : un pavé de 4×4 qui ne se
        raccorde pas dessine une seconde grille tous les 64 px.
     2. LA PARITÉ DE MATIÈRE AVEC LES PAVÉS DE RUE. C'est la grandeur qui
        manquait, et c'est littéralement la phrase de Guillaume traduite en
        nombre : on mesure l'écart-type et le nombre de teintes des marches ET
        des pavés, dans la même passe, et on exige que le premier ne soit pas
        inférieur de plus de 25 % au second. L'ancien dessin mesurait un
        écart-type de 6,7 pour 6 couleurs contre 12,0 pour 42 aux pavés — le
        rapport 0,56 disait l'écart avant qu'on le voie.
     3. LA PÉRIODE. Une volée doit rester lisible comme un escalier : on compte
        les nez de marche sur 64 px (il en faut exactement 16, un tous les
        4 px) et on vérifie que deux cases consécutives d'une même volée ne
        sont PAS le même dessin — c'est tout l'objet du pavé de 4×4, et c'est
        ce qu'un contrôle de bouclage ne dit pas.
     4. L'ALTERNANCE DES JOINTS de la falaise. Leçon de l'hôtel de ville (433) :
        ce qui fait un mur appareillé n'est pas la ligne d'assise, c'est le
        décalage des joints verticaux d'une assise à l'autre. L'ancien parement
        en avait UN par case, toujours au même endroit.

   ⚠️ Il appelle `A.drawTownStairTile` / `A.drawTownCliffFace` /
   `A.drawTownStairCheek`, c'est-à-dire EXACTEMENT les fonctions que la boucle
   de rendu appelle. Recopier le dessin ici mesurerait autre chose que le jeu.

   Usage :  node tools/render-escaliers.mjs
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
const ST = S.townStone;

/* ═══════════════ 1. LES TROIS MATIÈRES, ASSEMBLÉES ═══════════════════════
   ⚠️ SIX TUILES DE CÔTÉ, comme au 434 : à quatre on ne verrait qu'une période
   et le raccord serait hors cadre. Les pavés de rue sont posés à côté, sur la
   même planche — **une parité de matière se juge côte à côte**, c'est la leçon
   du banc du tribunal (« une cohérence se juge côte à côte ») et celle de
   `render-echelle` (un décor se juge contre son repère, pas seul). */
{
  const NT = 6, PAD = 6;
  const PANELS = [
    ["marches (montée N-S)", ST.stair.v],
    ["marches (montée E-O)", ST.stair.h],
    ["dallage d'esplanade (436)", S.townRoad.flag],
    ["pavés de rue (434)", S.townRoad.cobble],
  ];
  const W = PANELS.length * (NT * T + PAD) + PAD, H = NT * T + PAD * 2;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#2a2c30"; sh.ctx.fillRect(0, 0, W, H);
  PANELS.forEach(([, atlas], k) => {
    const ox = PAD + k * (NT * T + PAD);
    for (let ty = 0; ty < NT; ty++) for (let tx = 0; tx < NT; tx++) {
      sh.ctx.drawImage(atlas, (tx % ST.sup) * T, (ty % ST.sup) * T, T, T, ox + tx * T, PAD + ty * T, T, T);
    }
  });
  const up = scale(sh.px, W, H, 4);
  writePNG(path.join(OUT, "escaliers-surfaces.png"), up.px, up.W, up.H);
}

console.log("\n=== 1. le bouclage du pavé de 4×4 ===\n");
for (const [name, atlas] of [["marches N-S", ST.stair.v], ["marches E-O", ST.stair.h], ["dallage", S.townRoad.flag]]) {
  const N = atlas.width, px = atlas.__px;
  const at = (x, y, k) => px[(y * N + x) * 4 + k];
  const colDiff = (a, b) => { let s = 0; for (let y = 0; y < N; y++) for (let k = 0; k < 3; k++) s += Math.abs(at(a, y, k) - at(b, y, k)); return s / (N * 3); };
  const rowDiff = (a, b) => { let s = 0; for (let x = 0; x < N; x++) for (let k = 0; k < 3; k++) s += Math.abs(at(x, a, k) - at(x, b, k)); return s / (N * 3); };
  let cMax = 0, rMax = 0;
  for (let i = 0; i < N - 1; i++) { cMax = Math.max(cMax, colDiff(i, i + 1)); rMax = Math.max(rMax, rowDiff(i, i + 1)); }
  ok(colDiff(N - 1, 0) <= cMax * 1.2, `${name} — raccord horizontal`, `couture ${colDiff(N - 1, 0).toFixed(1)} vs pire transition interne ${cMax.toFixed(1)}`);
  ok(rowDiff(N - 1, 0) <= rMax * 1.2, `${name} — raccord vertical`, `couture ${rowDiff(N - 1, 0).toFixed(1)} vs pire transition interne ${rMax.toFixed(1)}`);
}

/* ═══════════════ 2. LA PARITÉ DE MATIÈRE — la demande, en chiffres ═══════ */
console.log("\n=== 2. la parité de matière avec les pavés de rue (la demande) ===\n");
const matiere = (atlas) => {
  const W = atlas.width, H = atlas.height, px = atlas.__px || atlas.px;
  let s = 0, s2 = 0;
  for (let i = 0; i < W * H; i++) { const L = lum(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]); s += L; s2 += L * L; }
  const mean = s / (W * H), sd = Math.sqrt(s2 / (W * H) - mean * mean);
  const pal = paletteOf(px, W, H);
  const n = pal.colors !== undefined ? pal.colors : (pal.n !== undefined ? pal.n : pal);
  return { mean, sd, n: Number(n) };
};
const ref = matiere(S.townRoad.cobble);
console.log(`         repère — pavés de rue : écart-type ${ref.sd.toFixed(1)}, ${ref.n} couleurs\n`);
for (const [name, atlas] of [["marches N-S", ST.stair.v], ["marches E-O", ST.stair.h], ["falaise", ST.cliff], ["limon", ST.cheek]]) {
  const m = matiere(atlas);
  /* ⚠️ UN RAPPORT, PAS UN SEUIL ABSOLU. C'est la leçon du seuil d'axe du taxi
     (434) : un nombre absolu calibré sur un décor devient faux quand le décor
     change. Ici la grandeur qui a un sens est « par rapport à ce qui est juste
     à côté à l'écran », et elle reste vraie le jour où l'on repeint les rues.
     ⚠️ Le limon fait 4 px de large : il ne peut pas porter autant de teintes
     qu'un pavé de 64 px, et l'exiger reviendrait à demander du bruit. On lui
     demande le relief, pas la palette. */
  const rel = m.sd / ref.sd;
  ok(rel >= 0.75, `${name} — relief comparable aux pavés`, `écart-type ${m.sd.toFixed(1)} soit ×${rel.toFixed(2)} du repère`);
  if (name !== "limon") ok(m.n >= ref.n * 0.6, `${name} — richesse de palette`, `${m.n} couleurs contre ${ref.n} aux pavés`);
}

/* ═══════════════ 2 bis. LE DALLAGE — mesuré contre CE QU'IL REMPLACE ═════
   ⚠️⚠️ IL EST EXEMPTÉ DE LA RÈGLE DES 0,75, ET IL FAUT DIRE POURQUOI, SINON
   C'EST UN SEUIL DESSERRÉ. Une esplanade est faite de PEU DE GRANDES PIERRES ;
   sa matière tient dans l'écart d'une dalle à l'autre, pas dans une forêt de
   joints. Exiger l'écart-type d'un pavage de rue reviendrait littéralement à
   demander qu'on dessine une rue sur la place — c'est-à-dire à défaire
   l'argument du 434 (« le goudron s'arrête aux quatre bords de l'esplanade :
   une place n'est pas une chaussée »). Le précédent existe déjà dans
   `render-rues.mjs`, qui exempte le goudron du contrôle de continuité des
   formes, avec sa raison écrite à côté.
   ⚠️ LA GRANDEUR QUI A UN SENS EST DONC AUTRE : « est-ce mieux que ce qu'on
   remplace ? ». On recompose ici le damier du 425 — les deux gris, les cinq
   variantes, le joint clair au nord-ouest — et on compare. Une mesure contre
   l'ancien état ne peut pas être desserrée sans être fausse. */
console.log("\n=== 2 bis. le dallage d'esplanade contre le damier du 425 ===\n");
{
  /* ⚠️ Le damier du 425 était peint À LA CASE (16 px), pas au pixel : le
     recomposer au pixel donnerait un bruit fin qui n'a jamais existé à
     l'écran. On le reconstitue donc case par case, comme le rendu le faisait. */
  const oldT = makeCanvas(64, 64);
  for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
    const v = ((tx * 41 + ty * 23) % 5);
    oldT.ctx.fillStyle = ((tx + ty) % 2 === 0) ? ["#b3b2b8", "#b6b5bb", "#afaeb4", "#b1b0b6", "#b4b3b9"][v]
                                               : ["#a5a4ab", "#a8a7ae", "#a2a1a8", "#a6a5ac", "#a3a2a9"][v];
    oldT.ctx.fillRect(tx * 16, ty * 16, 16, 16);
    oldT.ctx.fillStyle = "rgba(255,255,255,0.13)";
    oldT.ctx.fillRect(tx * 16, ty * 16, 16, 1); oldT.ctx.fillRect(tx * 16, ty * 16, 1, 16);
    oldT.ctx.fillStyle = "rgba(60,58,66,0.16)";
    oldT.ctx.fillRect(tx * 16, ty * 16 + 15, 16, 1); oldT.ctx.fillRect(tx * 16 + 15, ty * 16, 1, 16);
  }
  const before = matiere(oldT), after = matiere(S.townRoad.flag);
  ok(after.sd >= before.sd * 3, "le dallage a gagné en matière", `écart-type ${before.sd.toFixed(1)} (425) → ${after.sd.toFixed(1)} (436), ×${(after.sd / before.sd).toFixed(1)}`);
  /* ⚠️⚠️ ET LE NOMBRE DE TEINTES NE SE COMPARE PAS À L'ANCIEN — troisième fois
     dans ce zip qu'un contrôle se trompe de grandeur avant que le dessin soit
     en cause, et celle-ci est la plus instructive. Le damier du 425 comptait
     **49 couleurs** contre 24 au dallage neuf, et il aurait donc « gagné » : ses
     deux gris étaient recouverts de quatre voiles alpha (blanc 0,13 et sombre
     0,16, au nord, à l'ouest, au sud, à l'est), et chaque combinaison fabriquait
     une teinte de plus. **Compter les couleurs d'une image composée en alpha,
     c'est compter des accidents de mélange, pas de la matière.** On garde donc
     un plancher absolu, et l'écart-type — qui, lui, ne se laisse pas gonfler par
     un voile — reste la mesure qui décide. */
  ok(after.n >= 20, "et assez de teintes pour ne pas être un aplat", `${after.n} couleurs (le damier du 425 en comptait ${before.n}, dont l'essentiel venait de ses quatre voiles alpha)`);
  /* ⚠️ ET LA PÉRIODE, qui est la vraie raison d'être de ce chantier : l'ancien
     damier se répétait tous les 32 px (deux cases), le nouveau tous les 64. On
     le lit à l'autocorrélation des colonnes, sans aucun seuil de couleur. */
  const N = S.townRoad.flag.width, px = S.townRoad.flag.__px;
  const colL = new Float64Array(N);
  for (let x = 0; x < N; x++) { let a = 0; for (let y = 0; y < N; y++) a += lum(px[(y * N + x) * 4], px[(y * N + x) * 4 + 1], px[(y * N + x) * 4 + 2]); colL[x] = a / N; }
  const m = colL.reduce((a, b) => a + b, 0) / N;
  const ac = (lag) => { let num = 0, den = 0; for (let x = 0; x < N; x++) { num += (colL[x] - m) * (colL[(x + lag) % N] - m); den += (colL[x] - m) ** 2; } return num / (den || 1); };
  let worst = -1;
  for (const lag of [16, 32]) worst = Math.max(worst, ac(lag));
  ok(worst < 0.55, "aucune période de 16 ni de 32 px ne subsiste", `r(16) = ${ac(16).toFixed(2)}, r(32) = ${ac(32).toFixed(2)}`);
}

/* ═══════════════ 3. LA PÉRIODE : est-ce encore un escalier ? ═════════════ */
console.log("\n=== 3. la volée reste lisible, et deux cases ne sont pas le même dessin ===\n");
{
  const atlas = ST.stair.v, N = atlas.width, px = atlas.__px;
  /* Les nez de marche : sur une colonne quelconque, on compte les rangées où
     la luminance BONDIT vers le haut. Il doit y en avoir exactement une tous
     les 4 px — c'est la seule chose qui dise « ça monte », et c'est ce qu'on
     risquait de perdre en enrichissant la matière. */
  /* ⚠️ SUR LA MOYENNE DE RANGÉE, PAS SUR UNE COLONNE — et le banc s'est trompé
     avant le dessin, comme celui des rues et celui de l'eau avant lui. Premier
     jet : une seule colonne, `L(y) − L(y−1) > 30`. Il comptait 29 nez pour 16
     marches, parce que le granulat et les éclats font sauter la luminance d'un
     pixel à l'autre dans n'importe quelle colonne. Un nez de marche est une
     ligne CONTINUE sur toute la largeur : c'est donc le profil moyen par
     rangée qui le porte, et le grain s'y annule tout seul. */
  const rowL = new Float64Array(N);
  for (let y = 0; y < N; y++) {
    let s2 = 0;
    for (let x = 0; x < N; x++) s2 += lum(px[(y * N + x) * 4], px[(y * N + x) * 4 + 1], px[(y * N + x) * 4 + 2]);
    rowL[y] = s2 / N;
  }
  /* ⚠️⚠️ ON MESURE UNE PÉRIODE PAR AUTOCORRÉLATION, PAS EN COMPTANT DES SAUTS —
     et c'est la deuxième fois que ce banc se trompe de grandeur avant même que
     le dessin soit en cause. Premier jet : une colonne, `L(y) − L(y−1) > 30` →
     29 nez pour 16 marches (le granulat fait sauter n'importe quelle colonne).
     Deuxième jet : la moyenne par rangée, même règle → 32, soit exactement deux
     fois trop, parce qu'une marche a DEUX montées de luminance (la contremarche
     sombre → le dallage, puis l'ombre portée → le nez). Compter des sauts
     demandait donc un seuil réglé pour n'en garder qu'un sur deux, c'est-à-dire
     un seuil réglé sur le résultat : le banc qui ne peut plus rien refuser.
     La grandeur qui a un sens est la PÉRIODE du profil, et elle se lit sans
     aucun seuil : l'autocorrélation du profil de luminance doit culminer au
     décalage 4. */
  const mean = rowL.reduce((a, b) => a + b, 0) / N;
  const ac = (lag) => {
    let num = 0, den = 0;
    for (let y = 0; y < N; y++) { num += (rowL[y] - mean) * (rowL[(y + lag) % N] - mean); den += (rowL[y] - mean) ** 2; }
    return num / (den || 1);
  };
  /* ⚠️ ON CHERCHE LE PLUS PETIT DÉCALAGE QUI ATTEINT LE PIC, PAS LE PIC. Un
     signal de période 4 corrèle tout aussi bien à 8, 12 et 16 : le maximum brut
     tombait sur 8 (r = 0,98 contre 0,98 à 4). La PÉRIODE est le fondamental. */
  let peak = 0;
  for (let lag = 2; lag <= 16; lag++) peak = Math.max(peak, ac(lag));
  let best = 0;
  for (let lag = 2; lag <= 16; lag++) if (ac(lag) >= peak - 0.03) { best = lag; break; }
  ok(best === 4, "la volée a une période de 4 px (autocorrélation)", `fondamental au décalage ${best} (r = ${ac(best).toFixed(2)}), pic ${peak.toFixed(2)}`);

  /* ⚠️ ET LE CONTRÔLE QUI DIT SI LE PAVÉ DE 4×4 SERT À QUELQUE CHOSE : deux
     cases voisines de la MÊME volée doivent différer. C'est très exactement ce
     que l'ancien dessin ratait — quatre traits blancs, quatre traits noirs,
     identiques partout — et aucun contrôle de bouclage ne l'aurait attrapé,
     puisqu'un motif parfaitement uniforme boucle parfaitement. */
  let diff = 0;
  for (let ty = 0; ty < ST.sup; ty++) for (let tx = 0; tx + 1 < ST.sup; tx++) {
    let d = 0;
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const a = ((ty * T + v) * N + tx * T + u) * 4, b = ((ty * T + v) * N + (tx + 1) * T + u) * 4;
      d += Math.abs(px[a] - px[b]) + Math.abs(px[a + 1] - px[b + 1]) + Math.abs(px[a + 2] - px[b + 2]);
    }
    if (d / (T * T * 3) > 6) diff++;
  }
  const pairs = ST.sup * (ST.sup - 1);
  ok(diff === pairs, "deux cases voisines d'une volée sont deux dessins", `${diff}/${pairs} paires distinctes`);
}

/* ═══════════════ 4. LA FALAISE : DES JOINTS QUI ALTERNENT ════════════════ */
console.log("\n=== 4. la falaise est un mur appareillé, pas un rondin (leçon du 433) ===\n");
{
  const atlas = ST.cliff, W = atlas.width, H = atlas.height, px = atlas.__px;
  /* Un joint vertical = un pixel nettement plus sombre que ses deux voisins de
     rangée. On relève leur abscisse par rangée, puis on compte les rangées
     dont l'ensemble de joints diffère de la précédente. Un « rondin » (une
     ligne pleine largeur tous les N px, un seul joint toujours au même x) donne
     zéro ; un appareillage donne presque toutes les rangées. */
  const jointsOf = (y) => {
    const set = new Set();
    for (let x = 1; x < W - 1; x++) {
      const L = (xx) => lum(px[(y * W + xx) * 4], px[(y * W + xx) * 4 + 1], px[(y * W + xx) * 4 + 2]);
      if (L(x) < L(x - 1) - 18 && L(x) < L(x + 1) - 18) set.add(x);
    }
    return set;
  };
  let changed = 0, total = 0, seen = new Set();
  let prev = jointsOf(0);
  for (let y = 1; y < H; y++) {
    const cur = jointsOf(y);
    for (const v of cur) seen.add(v);
    total++;
    let same = 0;
    for (const v of cur) if (prev.has(v)) same++;
    if (cur.size === 0 || prev.size === 0 || same < Math.max(cur.size, prev.size) * 0.8) changed++;
    prev = cur;
  }
  ok(seen.size >= 14, "les joints verticaux tombent à des abscisses variées", `${seen.size} abscisses distinctes sur ${W} px`);
  ok(changed >= total * 0.25, "les joints se décalent d'une assise à l'autre", `${changed}/${total} rangées de changement`);
  // Et la falaise a un HAUT et un BAS : elle ne boucle pas verticalement, exprès.
  const rowL = (y) => { let s = 0; for (let x = 0; x < W; x++) s += lum(px[(y * W + x) * 4], px[(y * W + x) * 4 + 1], px[(y * W + x) * 4 + 2]); return s / W; };
  ok(rowL(0) > rowL(H - 1), "le haut du parement est plus clair que son pied", `L ${rowL(0).toFixed(1)} en tête contre ${rowL(H - 1).toFixed(1)} au pied`);
}

/* ═══════════════ 4 bis. UNE VOLÉE EST D'UN SEUL TENANT ══════════════════
   ⚠️⚠️ LA GRANDEUR QUI MANQUAIT, ET C'EST LE BANC QUI A TROUVÉ LE DÉFAUT. Le
   sens de la montée se déduit du gradient d'altitude (§7 : jamais de seconde
   description d'un même escalier). Lu sur les quatre voisines immédiates, il
   pouvait BASCULER sur la case de bord d'une volée large — son voisin latéral
   n'est plus de l'escalier, donc le gradient transversal cesse d'être nul. Une
   colonne de marches en travers de la volée, invisible tant que les marches
   étaient quatre traits gris, hurlante dès qu'elles sont en pierre.
   On vérifie donc que toutes les cases d'une même volée s'accordent. */
console.log("\n=== 4 bis. toutes les marches d'une volée montent dans le même sens ===\n");
{
  const tw0 = E.generateTownWorld();
  const isStair = (x, y) => (x >= 0 && y >= 0 && x < tw0.w && y < tw0.h && tw0.ground[y * tw0.w + x] === C.G_TOWN_STAIR);
  const seen = new Uint8Array(tw0.w * tw0.h);
  let flights = 0, split = 0;
  for (let y = 0; y < tw0.h; y++) for (let x = 0; x < tw0.w; x++) {
    if (!isStair(x, y) || seen[y * tw0.w + x]) continue;
    // La volée = la composante connexe (4-voisinage) de cases d'escalier.
    const stack = [[x, y]], cells = [];
    seen[y * tw0.w + x] = 1;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      cells.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (isStair(nx, ny) && !seen[ny * tw0.w + nx]) { seen[ny * tw0.w + nx] = 1; stack.push([nx, ny]); }
      }
    }
    flights++;
    const first = A.townStairVertical(tw0, cells[0][0], cells[0][1]);
    let odd = 0;
    for (const [cx, cy] of cells) if (A.townStairVertical(tw0, cx, cy) !== first) odd++;
    if (odd) { split++; console.log(`         volée (${cells[0][0]},${cells[0][1]}) de ${cells.length} cases : ${odd} en travers`); }
  }
  ok(split === 0, "aucune volée n'a de marche perpendiculaire aux autres", `${flights} volée(s) examinée(s), ${split} panachée(s)`);
}

/* ═══════════════ 5. LA VRAIE VOLÉE, SUR LA VRAIE CARTE ═══════════════════
   ⚠️ TROIS FENÊTRES PRISES SUR `generateTownWorld()`, et le décor autour est
   celui de la ville. Un escalier ne se juge pas seul : il se juge à
   l'articulation entre le dallage d'en bas, la volée et la terrasse d'en
   haut — c'est là que l'ancien dessin trahissait, parce que la volée était
   plus PAUVRE que le sol qui l'encadre. */
const tw = E.generateTownWorld();
const EP = C.TOWN_ELEV_PX;
const stairSpots = [];
for (const st of C.TOWN_STAIRS) stairSpots.push(st);
const VIEWS = stairSpots.slice(0, 3).map((st, k) => ["volee" + (k + 1), {
  x: Math.max(0, (st.x | 0) - 9), y: Math.max(0, (st.y | 0) - 8), w: 20, h: 18,
}]);
for (const [name, v] of VIEWS) {
  const sh = makeCanvas(v.w * T, v.h * T);
  const elAt = (x, y) => (x < 0 || y < 0 || x >= tw.w || y >= tw.h ? 0 : tw.elev[y * tw.w + x]);
  sh.ctx.fillStyle = "#1d2a1a"; sh.ctx.fillRect(0, 0, v.w * T, v.h * T);
  for (let y = v.y; y < v.y + v.h + 2; y++) for (let x = v.x; x < v.x + v.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    const i = y * tw.w + x, g = tw.ground[i], e = tw.elev[i];
    const px = (x - v.x) * T, py = (y - v.y) * T - e * EP;
    /* ⚠️ MÊME AVEU QU'AU 434 : l'herbe et la rue sont les VRAIS dessins du jeu,
       le dallage est approximé à sa teinte moyenne (ses vingt `fillRect` vivent
       dans la closure du rendu). Ce banc juge la PIERRE DE LA HAUTE-VILLE ; il
       lui faut un fond honnête, pas un décor complet. */
    if (g === C.G_TOWN_STAIR) { if (!A.drawTownStairTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#b8b4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else if (g === C.G_PATH) { if (!A.drawTownRoadTile(sh.ctx, S, tw, x, y, px, py)) sh.ctx.drawImage(S.path, px, py); }
    else if (g === C.G_PATH_STONE) { if (!A.drawTownFlagTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#a5a4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else { const gt = S.townGrass; sh.ctx.drawImage(gt[(x * 37 + y * 17) % gt.length], px, py); }

    const drop = e - elAt(x, y + 1);
    if (drop > 0.01) {
      const fh = drop * EP;
      A.drawTownCliffFace(sh.ctx, S, tw, x, y, px, py + T, fh);
      sh.ctx.fillStyle = "#c6c1b6"; sh.ctx.fillRect(px, py + T - 2, T, 2);
      sh.ctx.fillStyle = "rgba(20,26,16,0.30)"; sh.ctx.fillRect(px, py + T + fh, T, 3);
    }
    if (g === C.G_TOWN_STAIR) for (const sd of [-1, 1]) {
      const dside = e - elAt(x + sd, y);
      if (dside <= 0.01) continue;
      A.drawTownStairCheek(sh.ctx, S, tw, x, y, px, py, sd < 0 ? px : px + T - 4, 4, dside * EP);
    }
  }
  const up = scale(sh.px, v.w * T, v.h * T, 3);
  writePNG(path.join(OUT, "escaliers-" + name + ".png"), up.px, up.W, up.H);
}

console.log("\nImages : tools/out/escaliers-surfaces.png, " + VIEWS.map(([n]) => "escaliers-" + n + ".png").join(", "));
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC` : "\nTout est bon.");
process.exit(fail ? 1 : 0);
