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

/* (2026-09-27, nuit : les contrôles du bloc 467 — détourage, teinte, rambarde
   de fer — sont partis avec lui. Le grand escalier qui le remplace est contrôlé
   au § 5.) */

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
  if (name === "marches N-S") {
    let same = true;
    for (let y = 0; y < ST.treadSource.height; y++) for (let x = 0; x < ST.treadSource.width; x++) {
      const a = (y * atlas.width + x) * 4, b = (y * ST.treadSource.width + x) * 4;
      for (let k = 0; k < 4; k++) if (atlas.__px[a + k] !== ST.treadSource.__px[b + k]) same = false;
    }
    ok(same, `${name} — pixels exacts de la marche source`, `${ST.treadSource.width}×${ST.treadSource.height} px sans altération`);
  } else {
    ok(rel >= 0.75, `${name} — relief comparable aux pavés`, `écart-type ${m.sd.toFixed(1)} soit ×${rel.toFixed(2)} du repère`);
  }
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
  /* ⚠️⚠️ ZIP 447 — LE CHIFFRE ATTENDU PASSE DE 4 À 16, ET C'EST UN CHANGEMENT
     D'INTENTION, PAS UN DESSERRAGE. Ce contrôle mesurait très bien la période
     du DESSIN ; ce qu'il ne mesurait pas, c'est si cette période avait le
     moindre rapport avec la MONTÉE. Elle n'en avait aucune : quatre nez peints
     par case, une seule marche franchie. Le banc était donc au vert sur un
     escalier qui, à l'écran, se lit à plat — la quatrième forme du §« un banc
     qui passe » : il mesurait autre chose que ce qu'on voulait.
     La période attendue est maintenant la CASE, parce que le giron EST la case
     (`STAIR_TREAD = 16`). Et le contrôle qui suit, lui, est neuf : il compare la
     période du dessin au dénivelé réellement franchi. C'est celui qui aurait
     attrapé le défaut d'origine, et il n'existait pas. */
  ok(best === 16, "la volée a une période d'UNE CASE (autocorrélation)", `fondamental au décalage ${best} (r = ${ac(best).toFixed(2)}), pic ${peak.toFixed(2)}`);

  /* ⚠️⚠️ LE CONTRÔLE QUI MANQUAIT : LA MARCHE DESSINÉE EST-ELLE LA MARCHE
     FRANCHIE ? On compte les girons peints sur une case et on exige qu'il y en
     ait UN, puis on vérifie que la contremarche que le relief lui donne est
     visible — au moins 6 px, sinon la volée redevient une texture rayée.
     ⚠️ Les deux nombres viennent du monde, pas d'un réglage : le dénivelé le
     plus faible d'une volée réelle, multiplié par TOWN_ELEV_PX. */
  {
    const girons = 16 / best;
    ok(girons === 1, "une case porte exactement UNE marche", `${girons} giron(s) par case`);
    let pire = 99, oùPire = "";
    /* La première volée (le grand escalier) est peinte d'un tenant
       (`townGrandFlightSurface`) : sa contremarche est contrôlée au § 5. Le
       contrôle reste entier sur les volées qui appellent `drawTownStairTile`. */
    for (const st of C.TOWN_STAIRS.slice(1)) {
      const pas = Math.abs(st.to - st.from) / (st.len + 1);
      const h = pas * C.TOWN_ELEV_PX;
      if (h < pire) { pire = h; oùPire = `(${st.x},${st.y})`; }
    }
    ok(pire >= 6, "la contremarche se voit sur toutes les volées",
       `la plus basse : ${pire.toFixed(1)} px en ${oùPire} (il en faut 6)`);
  }

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

/* ═══════════════ 5. LE GRAND ESCALIER DE L'ÉGLISE (2026-09-27, nuit) ═══════
   Une volée droite dans l'axe du portail, un palier, un pont sur le boulevard.
   Ce qu'on tient ici, et pourquoi :
     · la GÉOMÉTRIE se dérive de l'église, du bord de la terrasse et du
       boulevard — si l'un bouge, la volée suit, et ce banc le constate ;
     · la MARCHE PEINTE EST LA MARCHE FRANCHIE : on lit les nez de marche dans
       les PIXELS de la volée, et on les compare à l'altitude où marche le
       personnage — c'est la seule mesure qui relie le dessin à la physique ;
     · la COLLISION ET LE DESSIN DES GARDE-CORPS COÏNCIDENT, case par case,
       dans les deux sens (une case solide sans dessin est un mur invisible ;
       un dessin sans collision, un garde-corps qu'on traverse) — sauf la rampe
       au-dessus de la chaussée, qu'on doit pouvoir passer DESSOUS ;
     · le PONT : sous la volée, la chaussée est pavée, rue et revêtement, et le
       tablier porte l'altitude de la marche. */
const tw = E.generateTownWorld();
const EP = C.TOWN_ELEV_PX;
const G = C.TOWN_GRAND_STAIR, F = G.flight, L = G.landing, OV = C.TOWN_OVERPASS, BR = C.TOWN_STAIR_BRIDGE;
const id = (x, y) => y * tw.w + x;
console.log("\n=== 5. le grand escalier de l'église ===\n");
{
  const legacy = (tw.props || []).filter(pr => ["rail", "railY", "courtFlowerPot", "courtSignFlowers"].includes(pr.kind));
  ok(legacy.length === 0, "⚠️ aucun morceau de l'ancien montage n'est encore émis", `${legacy.length} morceau(x)`);
  const cl = C.TOWN_GRAND_STAIR_CLEAR;
  const intruders = (tw.props || []).filter(pr => pr.x >= cl.x && pr.x < cl.x + cl.w && pr.y >= cl.y && pr.y < cl.y + cl.h
    && ["bench", "statue", "streetSign"].includes(pr.kind));
  ok(intruders.length === 0, "aucun banc, statue ou panneau générique ne contredit la composition",
     intruders.map(p => `${p.kind}(${p.x},${p.y})`).join(" ") || "aucun intrus");
  const trees = [];
  for (let y = cl.y; y < cl.y + cl.h; y++) for (let x = cl.x; x < cl.x + cl.w; x++) {
    const o = tw.objects[id(x, y)];
    if (o === C.O_TREE || o === C.O_TREE2) trees.push(`(${x},${y})`);
  }
  ok(trees.length === 0, "aucun arbre ne pousse dans la composition", trees.join(" ") || "aucun");

  // La géométrie se DÉRIVE.
  const ax = C.TOWN_CHURCH.x + C.TOWN_CHURCH.w / 2;
  ok(F.x + F.w / 2 === ax && L.x + L.w / 2 === ax, "la volée et le palier sont dans l'axe du portail",
     `axe ${ax}, volée ${F.x}..${F.x + F.w - 1}, palier ${L.x}..${L.x + L.w - 1}`);
  ok(L.y === C.TOWN_UPPER.y + C.TOWN_UPPER.h && L.y + L.h === F.y, "le palier va du bord de la terrasse à la tête de la volée",
     `rangées ${L.y}..${L.y + L.h - 1}, volée à ${F.y}`);
  const nord = C.TOWN_ROADS.find(r => r.id === "nord");
  const nordRows = new Set(C.townRoadCells(nord).filter(([x]) => x === ax).map(([, y]) => y));
  ok(nordRows.size === G.road.h && [...nordRows].every(y => y >= G.road.y && y < G.road.y + G.road.h),
     "les rangées du pont sont celles du boulevard du Nord, sous l'axe", `boulevard en ${[...nordRows].sort().join(",")} · pont ${G.road.y}..${G.road.y + G.road.h - 1}`);
  const lowest = C.townGrandStepElev(G.road.h - 1);
  ok(lowest * EP >= 30, "la dernière marche au-dessus de la chaussée laisse passer un personnage dessous",
     `${(lowest * EP).toFixed(1)} px de dégagement (le personnage en fait 23)`);

  // Le pont.
  let paved = 0, deckOk = 0, n = 0;
  for (let y = BR.y; y < BR.y + BR.h; y++) for (let x = BR.x; x < BR.x + BR.w; x++) {
    n++;
    if (tw.ground[id(x, y)] === C.G_PATH && tw.elev[id(x, y)] === 0 && tw.road[id(x, y)]) paved++;
    const inOv = x >= OV.x && x < OV.x + OV.w;
    const want = inOv ? C.townGrandStepElev(y - F.y) : -1;
    if (Math.abs(tw.deck[id(x, y)] - want) < 1e-4) deckOk++;
  }
  ok(paved === n, "sous le pont, la chaussée est pavée et au sol", `${paved}/${n} cases`);
  ok(deckOk === n, "le tablier porte l'altitude de sa marche (colonnes ouvertes), aucune sous les rampes", `${deckOk}/${n} cases`);
  let deckElsewhere = 0;
  for (let i = 0; i < tw.deck.length; i++) if (tw.deck[i] >= 0 && !C.townOverpassCell(i % tw.w, (i / tw.w) | 0)) deckElsewhere++;
  ok(deckElsewhere === 0, "aucune autre case de la ville n'a deux niveaux", `${deckElsewhere} case(s)`);

  // La marche peinte est la marche franchie : les nez, lus dans les pixels.
  const im = S.townGrandStair.flight, W = im.width, H = im.height;
  ok(W === F.w * T && H === F.len * T + EP, "la volée peinte couvre exactement la volée et sa hauteur", `${W}×${H} px`);
  let holes = 0;
  for (let i = 0; i < W * H; i++) if (im.__px[i * 4 + 3] < 255) holes++;
  ok(holes === 0, "la volée peinte est opaque partout (rien ne transparaît du sol dessous)", `${holes} pixel(s) non opaques`);
  const rowL = [];
  for (let y = 0; y < H; y++) {
    let sL = 0;
    for (let x = T; x < W - T; x++) sL += lum(im.__px[(y * W + x) * 4], im.__px[(y * W + x) * 4 + 1], im.__px[(y * W + x) * 4 + 2]);
    rowL.push(sL / (W - 2 * T));
  }
  /* Un nez = la rangée la plus claire juste au-dessus d'une chute franche de
     luminance (le nez, puis l'ombre de la contremarche). */
  const noses = [];
  for (let y = 1; y < H - 1; y++) if (rowL[y] - rowL[y + 1] > 40 && rowL[y] >= rowL[y - 1]) noses.push(y);
  const top0 = F.y * T - EP;
  const want = [];
  for (let k = 0; k < F.len; k++) want.push(Math.round((F.y + k) * T - C.townGrandStepElev(k) * EP) + T - 1 - top0);
  const miss = want.filter(w => !noses.some(y => Math.abs(y - w) <= 1));
  ok(noses.length === F.len && miss.length === 0, "⚠️⚠️ chaque nez peint est au bord de la marche où l'on marche",
     `${noses.length} nez peints, attendus ${F.len} en ${want.join(",")}${miss.length ? " · manquent " + miss.join(",") : ""}`);
  const risers = [];
  for (let k = 1; k < F.len; k++) risers.push(Math.round(want[k] - want[k - 1] - T));
  ok(risers.every(r => r >= 5), "chaque contremarche se voit", `${risers.join(",")} px`);

  // Collision et dessin des garde-corps coïncident.
  const drawn = new Set((tw.props || []).filter(p => /^stair(Post|Balus|Side|Rail)$/.test(p.kind)).map(p => p.x + "," + p.y));
  const railCells = new Set();
  for (const r of C.TOWN_RAILS) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) railCells.add(x + "," + y);
  const noDraw = [...railCells].filter(k => !drawn.has(k));
  const noColl = [...drawn].filter(k => { const [x, y] = k.split(",").map(Number); return !railCells.has(k) && !C.townOverpassCell(x, y); });
  const notSolid = [...railCells].filter(k => { const [x, y] = k.split(",").map(Number); return !tw.solid[id(x, y)]; });
  ok(noDraw.length === 0, "chaque case de garde-corps solide a son dessin", noDraw.join(" ") || `${railCells.size} cases`);
  ok(noColl.length === 0, "chaque garde-corps dessiné bloque (sauf la rampe au-dessus de la chaussée)", noColl.join(" ") || `${drawn.size} décors`);
  ok(notSolid.length === 0, "les cases de garde-corps sont solides dans le monde", notSolid.join(" ") || "toutes");
  const overRails = (tw.props || []).filter(p => p.kind === "stairRail" && C.townOverpassCell(p.x, p.y));
  ok(overRails.length === 2 * G.road.h && overRails.every(p => !tw.solid[id(p.x, p.y)] && Math.abs(p.e - C.townGrandStepElev(p.y - F.y)) < 1e-6),
     "au-dessus de la chaussée, la rampe se dessine à la hauteur de sa marche et laisse passer dessous", `${overRails.length} morceaux`);
  // Le pot.
  const pot = S.townGrandStair.pot;
  let red = 0, clay = 0;
  for (let i = 0; i < pot.width * pot.height; i++) {
    const r = pot.__px[i * 4], g = pot.__px[i * 4 + 1], b = pot.__px[i * 4 + 2], a = pot.__px[i * 4 + 3];
    if (!a) continue;
    if (r > 140 && r > g + 70 && r > b + 60) red++;
    if (r > 140 && g > 70 && g < 120 && b < 90) clay++;
  }
  ok(pot.width >= 24 && pot.width <= 38 && pot.height >= 34 && pot.height <= 54 && red > 20 && clay > 40,
     "le pot de géraniums est bien détouré du bloc d'origine", `${pot.width}×${pot.height} px, ${red} px de fleurs rouges, ${clay} de terre cuite`);
}

/* ═══════════════ 6. LES PLANCHES ═══════════════════════════════════════════
   Trois fenêtres sur la vraie carte : le grand escalier, la volée de service, le
   belvédère. Le grand escalier est peint comme le jeu le peint : le sol, la
   volée d'un tenant, puis ses décors (piliers, balustrades, rampes, pots) triés
   par profondeur. ⚠️ Le dallage, la rue et l'herbe sont les VRAIS dessins. */
const VIEWS = C.TOWN_STAIRS.map((st, k) => ["volee" + (k + 1), k === 0
  ? { x: L.x - 5, y: G.edge - 12, w: L.w + 10, h: F.y + F.len + 5 - (G.edge - 12) }
  : { x: Math.max(0, (st.x | 0) - 9), y: Math.max(0, (st.y | 0) - 8), w: 20, h: 18 }]);
for (const [name, v] of VIEWS) {
  const sh = makeCanvas(v.w * T, v.h * T);
  const elAt = (x, y) => (x < 0 || y < 0 || x >= tw.w || y >= tw.h ? 0 : tw.elev[y * tw.w + x]);
  sh.ctx.fillStyle = "#1d2a1a"; sh.ctx.fillRect(0, 0, v.w * T, v.h * T);
  for (let y = v.y; y < v.y + v.h + 4; y++) for (let x = v.x; x < v.x + v.w; x++) {
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) continue;
    if (C.townGrandFlightCell(x, y) && !C.townOverpassCell(x, y)) continue;   // peinte d'un tenant
    const i = y * tw.w + x, g = tw.ground[i], e = tw.elev[i];
    const px = (x - v.x) * T, py = (y - v.y) * T - e * EP;
    if (g === C.G_TOWN_STAIR) { if (!A.drawTownStairTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#b8b4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else if (g === C.G_PATH) { if (!A.drawTownRoadTile(sh.ctx, S, tw, x, y, px, py)) sh.ctx.drawImage(S.path, px, py); }
    else if (g === C.G_PATH_STONE) { if (!A.drawTownFlagTile(sh.ctx, S, tw, x, y, px, py)) { sh.ctx.fillStyle = "#a5a4ab"; sh.ctx.fillRect(px, py, T, T); } }
    else { const gt = S.townGrass; sh.ctx.drawImage(gt[(x * 37 + y * 17) % gt.length], px, py); }
    if (y >= BR.y && y < BR.y + BR.h && (x === BR.x - 1 || x === BR.x + BR.w)) A.drawStairBridgeMouth(sh.ctx, px, py, x === BR.x - 1 ? 1 : -1);
    const drop = e - elAt(x, y + 1);
    if (drop > 0.01 && !C.townGrandFlightCell(x, y + 1)) {
      const fh = drop * EP;
      if (tw.ground[y * tw.w + x] === C.G_TOWN_STAIR) A.drawTownStairRiser(sh.ctx, S, tw, x, y, px, py + T, fh);
      else A.drawTownCliffFace(sh.ctx, S, tw, x, y, px, py + T, fh);
      sh.ctx.fillStyle = "#c6c1b6"; sh.ctx.fillRect(px, py + T - 2, T, 2);
      sh.ctx.fillStyle = "rgba(20,26,16,0.30)"; sh.ctx.fillRect(px, py + T + fh, T, 3);
    }
    if (g === C.G_TOWN_STAIR) for (const sd of [-1, 1]) {
      const dside = e - elAt(x + sd, y);
      if (dside <= 0.01) continue;
      A.drawTownStairCheek(sh.ctx, S, tw, x, y, px, py, sd < 0 ? px : px + T - 4, 4, dside * EP);
    }
  }
  // La volée d'un tenant, puis les décors du grand escalier, triés comme en jeu.
  A.drawTownGrandFlight(sh.ctx, S, -v.x * T, -v.y * T);
  const items = (tw.props || []).filter(p => /^stair/.test(p.kind) && p.x >= v.x - 1 && p.x < v.x + v.w + 1 && p.y >= v.y && p.y < v.y + v.h + 3)
    .map(p => ({ p, e: p.e !== undefined ? p.e : elAt(p.x, p.y) }))
    .sort((a, b) => C.townDepthKey((a.p.y + 1) * T, a.e) - C.townDepthKey((b.p.y + 1) * T, b.e));
  for (const { p, e } of items) {
    /* Le faux canevas ignore `translate` (voir lib-canvas) : on décale la
       position à la main, en pixels, comme le fait `pushE` en jeu. */
    const q = { ...p, x: p.x - v.x, y: p.y - v.y - e * EP / T };
    A.drawGrandStairProp(sh.ctx, S, q);
  }
  const up = scale(sh.px, v.w * T, v.h * T, 3);
  writePNG(path.join(OUT, "escaliers-" + name + ".png"), up.px, up.W, up.H);
}

console.log("\nImages : tools/out/escaliers-surfaces.png, " + VIEWS.map(([n]) => "escaliers-" + n + ".png").join(", "));
console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC` : "\nTout est bon.");
process.exit(fail ? 1 : 0);
