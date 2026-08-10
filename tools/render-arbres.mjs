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
               "sapin (planche)", "arbre rond (planche)", "saule (planche)", "magnolia (planche)"];
/* ⚠️⚠️ LES ESSENCES IMPORTÉES SONT HORS DU CONTRÔLE DE PROPRETÉ, et pour la
   même raison qu'au banc de rive : ce contrôle-là mesure la netteté de NOTRE
   trait — il a été réécrit quatre fois au 438 pour ça. Appliqué au dessin de
   Guillaume, il le NOTE (1,4 % de « points perdus », qui sont son tramage), et
   un banc n'a pas à arbitrer contre la référence qu'on a reçu l'ordre de
   recopier. Tout le reste — le bord du canevas, les saisons, la silhouette —
   continue de s'appliquer à elles : ce sont des propriétés de l'INTÉGRATION,
   pas du dessin. */
const IMPORTED = (k) => k >= 11;
const SEASONS = ["summer", "spring", "autumn"];
const TW = S.townTrees[0].w, TH = S.townTrees[0].h;   // 48×64 depuis le 438

/* Le canevas des bancs ne relit pas ses pixels ; on redessine donc chaque
   sprite dans une planche dont on garde le tampon, et on mesure dessus. */
function pixelsOf(img) {
  const sh = makeCanvas(TW, TH);
  sh.ctx.drawImage(img, 0, 0);
  return sh.px;
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
      for (const se of SEASONS) for (let f = 0; f < 3; f++) {
        const px = pixelsOf(S.townTrees[k][se][f]);
        let got = 0;
        for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (at(px, x, y)) got++;
        if (got !== want) lost.push(`${NAMES[k]}/${se}/f${f} : ${got} au lieu de ${want}`);
      }
    }
    ok(lost.length === 0, "aucun pixel perdu au montage des essences importées",
       lost.length ? lost.slice(0, 4).join(" · ") : "36 images, aucune amputée");
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
      if (diff > 40) bad.push(NAMES[k] + "/" + se + " (" + diff + " px)");
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

/* ─────────────────────────── LES PLANCHES ─────────────────────────── */
{
  const PAD = 6, COLS = S.townTrees.length;
  const W = COLS * (TW + PAD) + PAD, H = 3 * (TH + PAD) + PAD;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#4e8b46"; sh.ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < COLS; k++) for (let s = 0; s < 3; s++) {
    sh.ctx.drawImage(S.townTrees[k][SEASONS[s]][1], PAD + k * (TW + PAD), PAD + s * (TH + PAD));
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
  sh.ctx.drawImage(S.townTrees[0].summer[1], PAD + 2 * (TW + PAD), PAD);
  sh.ctx.drawImage(S.townTrees[8].summer[1], PAD + 3 * (TW + PAD), PAD);
  const up = scale(sh.px, W, H, 5);
  writePNG(path.join(OUT, "arbres-avant-apres.png"), up.px, up.W, up.H);
}

console.log("\nImages : tools/out/arbres-essences.png, arbres-avant-apres.png\n");
console.log(fail ? fail + " CONTRÔLE(S) EN ÉCHEC\n" : "Tout est bon.\n");
process.exit(fail ? 1 : 0);
