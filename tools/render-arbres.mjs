/* =============================================================================
   render-arbres.mjs — LES ONZE ESSENCES DE VALLEY TOWN. (437)
   -----------------------------------------------------------------------------
   ⚠️ IL EXISTE PARCE QUE `oakTree` ET `pineTree` N'ONT JAMAIS ÉTÉ REGARDÉS.
   Trois `arc()` et quatre triangles, écrits dans les premiers zips, jamais
   retouchés — pendant que la rue prenait un motif de 64 px (434) et la falaise
   ses assises (436). C'est le constat de tête de CLAUDE.md au 436, mot pour
   mot : *un dessin qu'aucun banc ne peut appeler ne se dégrade pas, il reste au
   niveau du jour où il a été écrit.* On n'ajoute donc pas onze dessins sans
   ajouter en même temps l'endroit où on les voit.

   Ce qu'il mesure, et pourquoi ces grandeurs-là :

     1. AUCUN PIXEL SUR LE BORD DU CANEVAS. Le piège n°1 des sprites de ce
        projet (§4 : « un canevas découpe en silence ce qui dépasse »), payé
        trois fois dans le seul zip 433. Un feuillage large de 33 px dans un
        canevas de 32 se fait raboter d'une colonne, et rien ne le dit.

     2. LA DENSITÉ DE FEUILLAGE. Demande de Guillaume : « je veux plus de
        feuilles ». C'est mesurable — le taux de remplissage de la boîte du
        feuillage — et l'ancien chêne donnait le chiffre de référence à battre.

     3. LE NOMBRE DE TONS DISTINCTS. Un aplat, c'est un ton ; un feuillage
        travaillé en compte au moins quatre (clair, moyen, sombre, cerne). Le
        piège de la moyenne du §8 s'applique ici aussi : un arbre peut avoir la
        bonne couleur moyenne et être parfaitement plat.

     4. LA SILHOUETTE N'EST PAS UN DISQUE. On compte les changements de largeur
        d'une rangée à l'autre : une couronne circulaire en a peu et par pas de
        un, une couronne lobée en a beaucoup. C'est la même grandeur que la
        rectitude du rivage de `render-eau.mjs`, transposée à un contour fermé.

     5. LES SAISONS CHANGENT LA COULEUR, PAS LA FORME. On compare la silhouette
        des trois variantes : elles doivent être IDENTIQUES au pixel près. Un
        arbre qui change de forme en changeant de saison se lit comme un autre
        arbre planté à sa place.

   ⚠️ Il appelle `A.townTreeKind`, c'est-à-dire la fonction que le jeu appelle
   pour choisir l'essence — pas une recopie (le stub menteur du §10).

   Usage :  node tools/render-arbres.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "planche"]);
const PL = mods.planche;
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine;
const S = A.buildSprites();
const tw = E.generateTownWorld();

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

/* ⚠️ ZIP 439 — QUATRE NOMS DE PLUS. Sans eux, les quatre essences importées
   de la planche s'affichaient « undefined » dans tous les messages du banc :
   le contrôle mesurait la bonne chose et le rapport était illisible. */
const NAMES = ["chêne", "érable", "bouleau", "saule", "magnolia", "cerisier", "mimosa", "pommier", "sapin", "pin", "cyprès",
               "sapin (planche)", "arbre rond (planche)", "saule (planche)", "magnolia (redessiné)"];
/* ⚠️⚠️ LES ESSENCES IMPORTÉES SONT HORS DU CONTRÔLE DE PROPRETÉ, et pour la
   même raison qu'au banc de rive : ce contrôle-là mesure la netteté de NOTRE
   trait — il a été réécrit quatre fois au 438 pour ça. Appliqué au dessin de
   Guillaume, il le NOTE (1,4 % de « points perdus », qui sont son tramage), et
   un banc n'a pas à arbitrer contre la référence qu'on a reçu l'ordre de
   recopier. Tout le reste — le bord du canevas, les saisons, la silhouette —
   continue de s'appliquer à elles : ce sont des propriétés de l'INTÉGRATION,
   pas du dessin. */
/* ⚠️ 2026-09-27 (phase 11) : le magnolia (indice 14) n'est plus importé — il
   est redessiné en code (`magnoliaTree`), donc il repasse sous le contrôle de
   propreté comme les onze autres. */
const IMPORTED = (k) => k >= 11 && k !== A.TT.REF_MAGNOLIA;
const SEASONS = ["summer", "spring", "autumn"];
const TW = S.townTrees[0].w, TH = S.townTrees[0].h;   // 48×64 depuis le 438

/* Le canevas des bancs ne relit pas ses pixels ; on redessine donc chaque
   sprite dans une planche dont on garde le tampon, et on mesure dessus. */
function pixelsOf(img) {
  const sh = makeCanvas(TW, TH);
  drawTree(sh.ctx, img, 0, 0);
  return sh.px;
}
/* 2026-09-27 (phase 11) : un arbre de ville est une CELLULE d'atlas
   (`{img,sx,sy,w,h}`), plus un canevas — la lecture passe par ici. */
function drawTree(ctx, img, x, y) {
  if (img.sx !== undefined) ctx.drawImage(img.img, img.sx, img.sy, img.w, img.h, x, y, img.w, img.h);
  else ctx.drawImage(img, x, y);
}
const at = (px, x, y) => {
  const o = (y * TW + x) * 4;
  return px[o + 3] > 8 ? [px[o], px[o + 1], px[o + 2]] : null;
};

console.log("\n=== 1. rien ne touche le bord du canevas (§4) ===\n");
{
  let bad = [];
  for (let k = 0; k < S.townTrees.length; k++) for (const se of SEASONS) {
    const px = pixelsOf(S.townTrees[k][se][1]);
    let hit = 0;
    for (let x = 0; x < TW; x++) { if (at(px, x, 0)) hit++; if (at(px, x, TH - 1)) hit++; }
    for (let y = 0; y < TH; y++) { if (at(px, 0, y)) hit++; if (at(px, TW - 1, y)) hit++; }
    if (hit && !IMPORTED(k)) bad.push(NAMES[k] + "/" + se + " (" + hit + ")");
  }
  ok(bad.length === 0, "aucun pixel peint sur le bord des 33 sprites", bad.length ? bad.join(", ") : "0 débord");
  /* ⚠️⚠️ ZIP 439 — POUR LES ESSENCES IMPORTÉES, LA RÈGLE DU BORD NE MESURE PAS
     LE BON RISQUE, ET IL FAUT LE DIRE PLUTÔT QUE DE L'EXEMPTER EN SILENCE.
     Le magnolia de la planche fait 47 px de large dans un gabarit de 48 : il
     touche un bord PAR CONSTRUCTION, sans qu'un seul pixel soit perdu. La règle
     du §4 protège d'un dessin qu'on peint TROP GRAND pour son canevas ; ici le
     dessin est donné, c'est le gabarit qui est juste. La question utile devient
     donc : *le rendu contient-il exactement autant de pixels que la source ?*
     Elle est décisive — elle attrape le cisaillement du vent qui pousserait une
     colonne hors du cadre, ce qui est le vrai danger de ce mécanisme — et elle
     ne peut pas se satisfaire d'un dessin qui « a l'air entier ». */
  {
    const lost = [];
    for (let k = 0; k < S.townTrees.length; k++) {
      if (!IMPORTED(k)) continue;
      const src = ["treeFir", "treeApple", "treeWillow", "treeMagnolia"][k - 11];
      const d = PL.PLANCHE[src];
      let want = 0;
      for (const r of d.rows) for (const ch of r) if (ch !== ".") want++;
      for (const se of SEASONS) for (let f = 0; f < S.townTrees[k][se].length; f++) {
        const px = pixelsOf(S.townTrees[k][se][f]);
        let got = 0;
        for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (at(px, x, y)) got++;
        if (got !== want) lost.push(`${NAMES[k]}/${se}/f${f} : ${got} au lieu de ${want}`);
      }
    }
    ok(lost.length === 0, "aucun pixel perdu au montage des essences importées",
       lost.length ? lost.slice(0, 4).join(" · ") : "45 images (5 poses), aucune amputée");
  }
}

console.log("\n=== 2. la densité de feuillage (« plus de feuilles ») ===\n");
{
  const fill = (img) => {
    const px = pixelsOf(img);
    let n = 0;
    for (let y = 0; y < 44; y++) for (let x = 0; x < TW; x++) if (at(px, x, y)) n++;
    return n;
  };
  const ref = fill(S.oak), refP = fill(S.pine);
  const vals = S.townTrees.map((t, k) => [NAMES[k], fill(t.summer[1])]);
  console.log("        ancien chêne " + ref + " px, ancien sapin " + refP + " px");
  console.log("        " + vals.map(([n, v]) => n + " " + v).join(" · "));
  const feuillus = vals.slice(0, 8).map(v => v[1]);
  /* ⚠️ LE SEUIL EST À 78 % DE L'ANCIEN CHÊNE, ET C'EST HONNÊTE PLUTÔT QUE
     COMPLAISANT. L'ancien chêne est un DISQUE PLEIN de rayon 14 : c'est la
     couverture maximale du gabarit, et aucune couronne lobée ne peut l'égaler
     — les creux d'un houppier sont précisément ce qui le distingue d'un rond.
     Exiger davantage reviendrait à exiger de revenir au rond. Ce contrôle-ci
     ne dit donc qu'une chose : « le nouvel arbre n'est pas plus MAIGRE » ; la
     question « y a-t-il plus de feuilles ? » est celle du § suivant, et elle
     ne se mesure pas en surface. */
  ok(Math.min(...feuillus) > ref * 0.78, "aucun feuillu n'est plus maigre que l'ancien chêne",
     "le plus maigre : " + Math.min(...feuillus) + " px contre " + ref + " (disque plein)");
}

console.log("\n=== 2 bis. LA PROPRETÉ — le contraire du grain (438) ===\n");
{
  /* ⚠️⚠️ CE CONTRÔLE REMPLACE CELUI DU 437, ET LE REMPLACEMENT EST LA LEÇON.
     Le 437 mesurait le « grain » — le nombre de frontières de ton par pixel —
     et le prenait pour de la qualité : plus il montait, mieux c'était censé
     être. Verdict de Guillaume sur le résultat : « c'est dégueulasse […] ton
     rendu est vraiment sale ». **Le grain montait, la propreté baissait, et le
     banc applaudissait.** C'est le §10 de CLAUDE.md à l'envers : un banc qui
     PASSE pendant que Guillaume voit un défaut ne dit pas que la chose est
     bonne — il dit qu'on mesure autre chose.
     La grandeur juste est le PIXEL ISOLÉ : un pixel dont les quatre voisins
     sont tous d'une autre couleur. C'est exactement ce que l'œil appelle
     « sale », et c'est ce qu'aucune référence de Guillaume ne contient. Un
     dessin propre est fait de FORMES : chaque pixel a au moins un voisin de sa
     couleur. */
  /* ⚠️ ON NE COMPTE QUE LE FEUILLAGE (les tons à dominante verte), et ce n'est
     pas une commodité : le CŒUR d'une fleur est un pixel isolé PAR DÉFINITION —
     c'est ce qui en fait une fleur et non un point. Le compter comme de la
     saleté pousserait à retirer les cœurs, c'est-à-dire à casser du juste pour
     faire taire une mesure (même piège qu'au 437 avec la terrasse du
     belvédère). Le tronc et les fruits sortent pour la même raison. */
  /* ⚠️⚠️ ET LA BONNE GRANDEUR N'EST PAS « LE PIXEL ISOLÉ » NON PLUS — première
     version de ce contrôle, écrite puis jetée dans la même heure. Elle comptait
     comme saleté la pointe d'un rameau de saule, le bout d'un arc d'ombre et le
     cœur d'une fleur, c'est-à-dire du dessin VOULU à un pixel de large. Un banc
     qui interdit le pixel unique interdit le pixel art.
     La saleté, c'est la part de la surface qui appartient à des ÎLOTS — des
     taches de moins de quatre pixels flottant dans un aplat. Un semis aléatoire
     en est entièrement fait ; un dessin de formes n'en a presque pas, et les
     quelques-uns qui restent sont des extrémités de traits. */
  const dirt = (img) => {
    const px = pixelsOf(img);
    const key = (x, y) => { const c = at(px, x, y); return c ? c.join(",") : null; };
    const seen = new Uint8Array(TW * TH);
    let area = 0, specks = 0;
    for (let y = 1; y < TH - 1; y++) for (let x = 1; x < TW - 1; x++) {
      const c = key(x, y);
      if (!c) continue;
      const rgb = at(px, x, y);
      if (!(rgb[1] >= rgb[0] && rgb[1] >= rgb[2])) continue;   // feuillage seulement
      area++;
      if (seen[y * TW + x]) continue;
      // Composante connexe de même couleur, en largeur.
      /* ⚠️ EN HUIT VOISINS, ET C'EST LA TROISIÈME CORRECTION DE CE CONTRÔLE.
         À quatre, un cerne d'un pixel qui descend en DIAGONALE est une suite de
         pixels qui ne se touchent que par les coins : chacun devient sa propre
         composante de taille 1, et le banc accusait le contour lui-même — 45
         « points perdus » sur un sapin dont le contour est impeccable. Un
         pixel art se lit en huit voisins ; c'est aussi comme ça que l'œil le
         lit. */
      const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      const st = [[x, y]]; const cells = [];
      seen[y * TW + x] = 1;
      while (st.length) {
        const [cx2, cy2] = st.pop(); cells.push([cx2, cy2]);
        for (const [dx, dy] of NB8) {
          const nx = cx2 + dx, ny = cy2 + dy;
          if (nx < 1 || ny < 1 || nx >= TW - 1 || ny >= TH - 1) continue;
          if (seen[ny * TW + nx] || key(nx, ny) !== c) continue;
          seen[ny * TW + nx] = 1; st.push([nx, ny]);
        }
      }
      /* ⚠️⚠️ ET UN ÎLOT N'EST UNE SALISSURE QUE S'IL FLOTTE DANS UN APLAT.
         Deuxième version jetée : « toute tache de moins de quatre pixels ». Elle
         accusait à 20 % des dessins que l'œil trouve propres — parce qu'un
         bouquet peint PAR-DESSUS un autre découpe la zone claire du premier en
         éclats, et que ces éclats font partie d'un DÉGRADÉ (ils touchent deux
         ou trois tons voisins). Ce que l'œil appelle sale, c'est le point perdu
         au milieu d'une surface unie : un îlot dont TOUT le pourtour est d'une
         seule et même couleur. C'est exactement ce que faisaient les douze
         pixels épars de l'ancien chêne, et le semis du 437. */
      if (cells.length <= 2) {
        const around = new Set();
        for (const [ax, ay] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = ax + dx, ny = ay + dy;
          if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue;
          const k2 = key(nx, ny);
          if (k2 && k2 !== c) around.add(k2);
        }
        if (around.size === 1) specks += cells.length;
      }
    }
    return { pct: area ? +(specks / area * 100).toFixed(1) : 0, n: specks };
  };
  const ref = dirt(S.oak), refP = dirt(S.pine);
  const vals = S.townTrees.map((t, k) => [NAMES[k], IMPORTED(k) ? { pct: 0, n: 0 } : dirt(t.summer[1])]);
  console.log("        ancien chêne " + ref.pct + " % (" + ref.n + " px perdus), ancien sapin " + refP.pct + " %");
  console.log("        " + vals.map(([n, v]) => n + " " + v.pct).join(" · "));
  const worst = Math.max(...vals.map(v => v[1].pct));
  ok(worst <= 1.0, "aucune essence ne dépasse 1 % de points perdus dans un aplat",
     "la plus sale : " + worst + " % (ancien chêne : " + ref.pct + " %)");
}

console.log("\n=== 3. le feuillage n'est pas un aplat ===\n");
{
  let worst = 99, who = "";
  for (let k = 0; k < S.townTrees.length; k++) {
    const px = pixelsOf(S.townTrees[k].summer[1]);
    const set = new Set();
    for (let y = 0; y < 44; y++) for (let x = 0; x < TW; x++) {
      const c = at(px, x, y); if (c) set.add(c.join(","));
    }
    if (set.size < worst) { worst = set.size; who = NAMES[k]; }
  }
  const oakSet = (() => {
    const px = pixelsOf(S.oak); const set = new Set();
    for (let y = 0; y < 44; y++) for (let x = 0; x < TW; x++) { const c = at(px, x, y); if (c) set.add(c.join(",")); }
    return set.size;
  })();
  ok(worst >= 5, "au moins cinq tons dans chaque houppier", "le plus pauvre : " + who + " avec " + worst + " (ancien chêne : " + oakSet + ")");
}

console.log("\n=== 4. la silhouette n'est pas un disque ===\n");
{
  const wiggle = (img) => {
    const px = pixelsOf(img);
    let prev = null, n = 0;
    for (let y = 2; y < 44; y++) {
      let a = -1, b = -1;
      for (let x = 0; x < TW; x++) if (at(px, x, y)) { if (a < 0) a = x; b = x; }
      if (a < 0) { prev = null; continue; }
      const w = b - a + 1;
      if (prev !== null && Math.abs(w - prev) >= 2) n++;
      prev = w;
    }
    return n;
  };
  const vals = S.townTrees.map((t, k) => [NAMES[k], wiggle(t.summer[1])]);
  console.log("        " + vals.map(([n, v]) => n + " " + v).join(" · ") + "   (ancien chêne : " + wiggle(S.oak) + ")");
  ok(vals.slice(0, 8).every(v => v[1] >= 4), "le contour des feuillus change de largeur d'au moins 4 rangées",
     "le plus lisse : " + Math.min(...vals.slice(0, 8).map(v => v[1])));
}

console.log("\n=== 5. la saison change la couleur, pas la forme ===\n");
{
  let bad = [];
  for (let k = 0; k < S.townTrees.length; k++) {
    const base = pixelsOf(S.townTrees[k].summer[1]);
    for (const se of ["spring", "autumn"]) {
      const px = pixelsOf(S.townTrees[k][se][1]);
      let diff = 0;
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (!!at(base, x, y) !== !!at(px, x, y)) diff++;
      // Un pommier en fleurs perd ses pommes et un magnolia d'automne ses
      // fleurs : quelques pixels de coque bougent, la couronne non.
      /* ⚠️ 2026-09-27 (phase 11) — UNE EXCEPTION, NOMMÉE ET BORNÉE : le
         magnolia redessiné fleurit sur BOIS NU au printemps (c'est ce qui le
         rend vrai), donc sa silhouette change exprès avec la saison. On borne
         quand même l'écart : un magnolia qui changerait d'arbre entier
         (canevas vide, autre essence) le dépasserait. */
      const lim = k === A.TT.REF_MAGNOLIA ? 420 : 40;
      if (diff > lim) bad.push(NAMES[k] + "/" + se + " (" + diff + " px)");
    }
  }
  ok(bad.length === 0, "les trois saisons partagent la même silhouette", bad.length ? bad.join(", ") : "0 essence déformée");
}

console.log("\n=== 6. l'essence se déduit du lieu ===\n");
{
  /* ⚠️ ZIP 439 — LA TABLE SUIT `TT`, ELLE N'EST PLUS ÉCRITE EN DUR. À 11 sur
     une table de 15, les quatre essences importées tombaient hors du tableau :
     `count[k]` valait `undefined`, le maximum devenait `NaN`, et le contrôle
     « aucune essence n'écrase les autres » affichait « NaN % » en PASSANT. Un
     contrôle qui compare à NaN ne compare rien. */
  const count = new Array(Object.keys(A.TT).length).fill(0);
  let trees = 0, wetTrees = 0, wetWillow = 0, orchard = 0, orchardApple = 0;
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    const i = y * tw.w + x, o = tw.objects[i];
    if (o !== C.O_TREE && o !== C.O_TREE2) continue;
    trees++;
    const k = A.townTreeKind(tw, x, y, o);
    count[k]++;
    /* ⚠️ LES ESSENCES DE LA PLANCHE COMPTENT COMME LEURS ÉQUIVALENTES : un
       saule reste un saule qu'il soit dessiné par le code ou par Guillaume. Ce
       contrôle porte sur le LIEU (« un arbre de berge est-il un arbre de
       berge ? »), pas sur l'origine du dessin. */
    if (tw.shore[i] > 0) { wetTrees++; if ([A.TT.WILLOW, A.TT.FIR, A.TT.BIRCH, A.TT.REF_WILLOW, A.TT.REF_FIR].includes(k)) wetWillow++; }
    const or = C.TOWN_ORCHARD;
    if (x >= or.x && y >= or.y && x < or.x + or.w && y < or.y + or.h) { orchard++; if ([A.TT.APPLE, A.TT.FIR, A.TT.PINE, A.TT.REF_APPLE, A.TT.REF_FIR].includes(k)) orchardApple++; }
  }
  console.log("        " + count.map((v, k) => NAMES[k] + " " + v).join(" · "));
  ok(trees > 200, "la ville a de quoi conclure", trees + " arbres");
  ok(count.filter(v => v > 0).length >= 8, "au moins huit essences sont représentées", count.filter(v => v > 0).length + "/" + count.length);
  ok(wetTrees === 0 || wetWillow === wetTrees, "tout arbre de berge est un arbre de berge", wetWillow + "/" + wetTrees);
  ok(orchard === 0 || orchardApple === orchard, "le verger municipal ne porte que des pommiers (ou ses conifères)", orchardApple + "/" + orchard);
  const top = Math.max(...count);
  ok(top / trees < 0.55, "aucune essence n'écrase les autres", "la plus courante : " + Math.round(top / trees * 100) + " %");
}

/* ═════════════════════════════════════════════════════════════════════════
   2026-09-27 (phase 11) — LES TAILLES ET LES FLEURS DU MAGNOLIA.
   ═════════════════════════════════════════════════════════════════════════ */
const SIZE_KEYS = ["young", "planted", "short", "tall"];
function cellPx(cell, w, h) {
  const sh = makeCanvas(w, h);
  if (cell.sx !== undefined) sh.ctx.drawImage(cell.img, cell.sx, cell.sy, cell.w, cell.h, 0, 0, cell.w, cell.h);
  else sh.ctx.drawImage(cell, 0, 0);
  return sh.px;
}
// La boîte de ce qui est peint au-dessus de l'ombre (alpha franc : l'ombre est à 18-38 %).
function bodyBox(px, w, h) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 200) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0 };
}
console.log("\n=== 7. les tailles : redessinées, pas agrandies ===\n");
{
  const sized = S.townTrees.map((t, k) => [k, t]).filter(([, t]) => t.sizes);
  ok(sized.length === 12, "douze essences dessinées en code ont leurs tailles", sized.map(([k]) => NAMES[k]).join(", "));
  ok(!S.townTrees[A.TT.REF_WILLOW].sizes, "le saule de la planche garde son unique dessin (« absolument magnifiques »)");
  let edge = [], read = 0;
  const ratio = [];
  for (const [k, t] of sized) {
    const adult = bodyBox(cellPx(t.summer[1], t.w, t.h), t.w, t.h);
    const r = {};
    for (const key of SIZE_KEYS) {
      const m = t.sizes[key];
      for (const se of SEASONS) for (let f = 0; f < m[se].length; f++) {
        const px = cellPx(m[se][f], m.w, m.h); read++;
        let hit = 0;
        for (let x = 0; x < m.w; x++) { if (px[x * 4 + 3] > 8) hit++; if (px[((m.h - 1) * m.w + x) * 4 + 3] > 8) hit++; }
        for (let y = 0; y < m.h; y++) { if (px[(y * m.w) * 4 + 3] > 8) hit++; if (px[(y * m.w + m.w - 1) * 4 + 3] > 8) hit++; }
        if (hit) edge.push(NAMES[k] + "/" + key + "/" + se + "/f" + f + " (" + hit + ")");
      }
      const b = bodyBox(cellPx(m.summer[1], m.w, m.h), m.w, m.h);
      r[key] = { h: b.h / adult.h, w: b.w / adult.w, aspect: b.w / b.h };
    }
    ratio.push([NAMES[k], r]);
  }
  ok(edge.length === 0, "aucun pixel sur le bord d'un gabarit de taille (§4)", `${read} images lues · ` + (edge.length ? edge.slice(0, 4).join(" · ") : "0 débord"));
  for (const [nm, r] of ratio) console.log(`        ${nm.padEnd(22)} jeune ×${r.young.h.toFixed(2)} · trapu ×${r.short.h.toFixed(2)} (large ×${r.short.w.toFixed(2)}) · grand ×${r.tall.h.toFixed(2)}`);
  ok(ratio.every(([, r]) => r.tall.h >= 1.35), "chaque grand arbre dépasse l'adulte d'au moins un tiers", "le moins haut : ×" + Math.min(...ratio.map(([, r]) => r.tall.h)).toFixed(2));
  ok(ratio.every(([, r]) => r.young.h <= 0.85 && r.young.w <= 0.8), "chaque jeune est plus petit et plus mince que l'adulte");
  ok(ratio.every(([nm, r]) => r.short.h <= 1.02 && (r.short.aspect > r.tall.aspect)), "chaque trapu est plus court que l'adulte et plus large pour sa hauteur que le grand");
}
console.log("\n=== 8. le magnolia : des fleurs à leur taille ===\n");
{
  /* Grandeur choisie pour ce qu'elle SÉPARE (§8 de CLAUDE.md) : une fleur est
     une tache ROSE — rouge et bleu au-dessus du vert. Ni l'écorce (gris brun),
     ni les feuilles (vert), ni le feuillage d'automne (bleu sous le vert) n'en
     portent. On compte les taches connexes et leur largeur. */
  const pink = (r, g, b) => r > 150 && r > g + 8 && b > g;
  function blobs(get, w, h) {
    const seen = new Uint8Array(w * h), out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (seen[y * w + x] || !get(x, y)) continue;
      let x0 = x, x1 = x, y0 = y, y1 = y, n = 0; const st = [[x, y]]; seen[y * w + x] = 1;
      while (st.length) { const [a, b] = st.pop(); n++; x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = a + dx, d = b + dy; if (c < 0 || d < 0 || c >= w || d >= h || seen[d * w + c] || !get(c, d)) continue; seen[d * w + c] = 1; st.push([c, d]); } }
      out.push({ w: x1 - x0 + 1, h: y1 - y0 + 1, n });
    }
    return out;
  }
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const old = PL.PLANCHE.treeMagnolia, oldPal = old.pal.map(hex);
  const before = blobs((x, y) => { const ch = old.rows[y][x]; if (ch === ".") return false; const [r, g, b] = oldPal[ch.charCodeAt(0) - 48]; return pink(r, g, b); }, old.w, old.h).filter(b => b.n >= 4);
  const t = S.townTrees[A.TT.REF_MAGNOLIA], px = cellPx(t.spring[1], t.w, t.h);
  const after = blobs((x, y) => { const o = (y * t.w + x) * 4; return px[o + 3] > 200 && pink(px[o], px[o + 1], px[o + 2]); }, t.w, t.h).filter(b => b.n >= 4);
  const med = (a) => { const s = a.map(b => Math.max(b.w, b.h)).sort((p, q) => p - q); return s[s.length >> 1]; };
  console.log(`        planche : ${before.length} fleurs, taille médiane ${med(before)} px · redessiné : ${after.length} fleurs, taille médiane ${med(after)} px`);
  ok(med(before) >= 9, "le banc reconnaît les grandes fleurs de la planche (il sait voir le défaut)", "médiane " + med(before) + " px");
  ok(med(after) <= 5, "une fleur fait 3 à 5 px (15 à 35 cm à 13,5 px/m)", "médiane " + med(after) + " px");
  ok(after.length >= 20, "et il y en a des dizaines, pas six", after.length + " taches roses");
}
console.log("\n=== 9. les tailles sur la carte ===\n");
{
  const n = { adult: 0, young: 0, planted: 0, short: 0, tall: 0 };
  const lamps = tw.props.filter(p => p.kind === "lamp" || p.kind === "hangLamp" || p.kind === "oilLamp");
  let covered = [], big = 0;
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    const o = tw.objects[y * tw.w + x];
    if (o !== C.O_TREE && o !== C.O_TREE2) continue;
    const z = A.townTreeSize(tw, x, y, o); n[z]++;
    if (z !== "tall" && z !== "short") continue;
    big++;
    /* Lu sur le GABARIT dessiné (largeur, hauteur du canevas), pas recopié de
       la règle du jeu : une lanterne dans le rectangle du sprite est cachée. */
    const m = S.townTrees[A.townTreeKind(tw, x, y, o)].sizes[z];
    const hw = Math.floor(m.w / 2 / 16), up = Math.ceil(m.base / 16) - 1;
    for (const l of lamps) if (Math.abs(l.x - x) <= hw && l.y < y && l.y >= y - up) covered.push(`${x},${y}`);
  }
  console.log("        " + Object.entries(n).map(([k, v]) => k + " " + v).join(" · "));
  ok(n.tall > 40 && n.young + n.planted > 40 && n.short > 30, "les trois nouvelles tailles sont plantées en nombre", `grand ${n.tall} · jeune ${n.young + n.planted} · trapu ${n.short}`);
  ok(n.planted > 0 && n.young > 0, "des jeunes tuteurés en ville ET des jeunes libres dans les bois");
  ok(covered.length === 0, "aucun grand arbre ni trapu devant une lanterne", `${big} lus · ` + (covered.length ? covered.slice(0, 5).join(" · ") : "0"));
}

console.log("\n=== 10. le vent : cinq poses, pas de bascule d'un bloc ===\n");
{
  /* Ce qui se voit comme un « tic », c'est le NOMBRE de pixels qui changent d'une
     image à la suivante. Avec trois poses, le cycle passait du repos (1) à
     l'extrême (2) en un pas ; avec les demi-poses, le même trajet prend deux
     pas. On compare le plus gros saut du cycle neuf au saut direct d'avant. */
  const CYCLE = [1, 4, 2, 4, 1, 3, 0, 3];
  const diff = (a, b) => { let n = 0; for (let i = 3; i < a.length; i += 4) if ((a[i] > 8) !== (b[i] > 8) || (a[i] > 8 && (a[i - 3] !== b[i - 3] || a[i - 2] !== b[i - 2]))) n++; return n; };
  let before = 0, after = 0, lines = [];
  for (let k = 0; k < S.townTrees.length; k++) {
    const fr = S.townTrees[k].summer.map(pixelsOf);
    if (fr.length !== 5) continue;
    const old = diff(fr[1], fr[2]);
    let worst = 0;
    for (let i = 0; i < CYCLE.length; i++) worst = Math.max(worst, diff(fr[CYCLE[i]], fr[CYCLE[(i + 1) % CYCLE.length]]));
    before += old; after += worst; lines.push(`${NAMES[k]} ${old}→${worst}`);
  }
  console.log("        " + lines.join(" · "));
  ok(after <= before * 0.75, "le plus gros saut d'une image à l'autre baisse d'un quart au moins", `${before} → ${after} px (somme des essences)`);
}

/* ─────────────────────────── LES PLANCHES ─────────────────────────── */
{
  const PAD = 6, COLS = S.townTrees.length;
  const W = COLS * (TW + PAD) + PAD, H = 3 * (TH + PAD) + PAD;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#4e8b46"; sh.ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < COLS; k++) for (let s = 0; s < 3; s++) {
    drawTree(sh.ctx, S.townTrees[k][SEASONS[s]][1], PAD + k * (TW + PAD), PAD + s * (TH + PAD));
  }
  const up = scale(sh.px, W, H, 3);
  writePNG(path.join(OUT, "arbres-essences.png"), up.px, up.W, up.H);
}
// Les anciens, à la même échelle, pour que la comparaison soit possible.
{
  const PAD = 6, W = 4 * (TW + PAD) + PAD, H = TH + PAD * 2;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#4e8b46"; sh.ctx.fillRect(0, 0, W, H);
  sh.ctx.drawImage(S.oak, PAD, PAD);
  sh.ctx.drawImage(S.pine, PAD + (TW + PAD), PAD);
  drawTree(sh.ctx, S.townTrees[0].summer[1], PAD + 2 * (TW + PAD), PAD);
  drawTree(sh.ctx, S.townTrees[8].summer[1], PAD + 3 * (TW + PAD), PAD);
  const up = scale(sh.px, W, H, 5);
  writePNG(path.join(OUT, "arbres-avant-apres.png"), up.px, up.W, up.H);
}

/* 2026-09-27 (phase 11) — la planche des tailles : une rangée par essence
   dessinée en code (jeune, tuteuré, adulte, trapu, grand), en été, avec un
   repère d'homme de 1,70 m (23 px) — et le magnolia dans ses trois saisons. */
{
  const rows = S.townTrees.map((t, k) => [k, t]).filter(([, t]) => t.sizes);
  const cols = ["young", "planted", "adult", "short", "tall"];
  const CW = 64, CH = 96, PAD = 6, W = PAD + (cols.length + 3) * (CW + PAD) + 20, H = PAD + rows.length * (CH + PAD);
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#4e8b46"; sh.ctx.fillRect(0, 0, W, H);
  rows.forEach(([k, t], r) => {
    const put = (cell, m, cx) => {
      const dx = cx + (CW - m.w) / 2, dy = PAD + r * (CH + PAD) + CH - 6 - m.base;
      if (cell.sx !== undefined) sh.ctx.drawImage(cell.img, cell.sx, cell.sy, cell.w, cell.h, dx, dy, cell.w, cell.h);
      else sh.ctx.drawImage(cell, dx, dy);
    };
    cols.forEach((c, i) => { const m = c === "adult" ? t : t.sizes[c]; put(m.summer[1], m, PAD + i * (CW + PAD)); });
    if (k === A.TT.REF_MAGNOLIA) ["spring", "summer", "autumn"].forEach((se, i) => put(t.sizes.tall[se][1], t.sizes.tall, PAD + (cols.length + i) * (CW + PAD)));
    // L'homme de 1,70 m, planté sur la même ligne de sol.
    sh.ctx.fillStyle = "#2b2b3a"; sh.ctx.fillRect(W - 14, PAD + r * (CH + PAD) + CH - 6 - 23, 6, 23);
  });
  const up = scale(sh.px, W, H, 3);
  writePNG(path.join(OUT, "arbres-tailles.png"), up.px, up.W, up.H);
}

console.log("\nImages : tools/out/arbres-essences.png, arbres-avant-apres.png, arbres-tailles.png\n");
console.log(fail ? fail + " CONTRÔLE(S) EN ÉCHEC\n" : "Tout est bon.\n");
process.exit(fail ? 1 : 0);
