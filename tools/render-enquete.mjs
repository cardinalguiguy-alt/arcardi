/* =============================================================================
   render-enquete.mjs — LES ONZE DESSINS DE L'ENQUÊTE, REGARDÉS. (zip 442)
   -----------------------------------------------------------------------------
       node tools/render-enquete.mjs  →  enquete-meubles.png · enquete-dehors.png

   ⚠️⚠️ IL EST ÉCRIT AVANT LE PREMIER `fillRect`, PAS APRÈS — c'est le corollaire
   du §4.2 de `CLAUDE.md` que le 441 a appliqué à l'église, et la raison tient en
   une phrase : *un dessin qu'aucun banc ne peut appeler ne se dégrade pas, il
   reste au niveau du jour où il a été écrit pendant que tout ce qui est mesuré
   monte* (436). Onze dessins neufs sans banc, c'est onze dessins qui auront
   douze zips de retard le jour où quelqu'un les regardera.

   Il APPELLE `courtPropSprite` par `buildSprites`, donc il juge le jeu et non sa
   maquette (§3 du 439).

   CE QU'IL MESURE, ET POURQUOI CHAQUE GRANDEUR EST LÀ :

     1. AUCUN PIXEL SUR LE BORD DU CANEVAS. C'est le piège n°1 des sprites de ce
        projet (§4), payé TROIS fois dans le seul zip 433 et une fois de plus au
        438 sur la flèche du cyprès : un canevas découpe en silence, le dessin
        est joli, il manque juste deux rangées que personne ne cherche.

     2. LES ÎLOTS PERDUS DANS UN APLAT. La grandeur du 438, celle qu'il a fallu
        écrire QUATRE fois avant de trouver la bonne, et qui traduit exactement
        ce que Guillaume appelle « sale ». On la reprend telle quelle plutôt que
        d'en inventer une cinquième.

     3. L'ÉCHELLE CONTRE LE PERSONNAGE. Un décor ne se juge pas contre d'autres
        décors (429) : une borne de section doit arriver au genou, une armoire
        scellée doit dominer. Mesuré, pas supposé.

     4. ⚠️ LA BORNE MARTELÉE DOIT SE DISTINGUER DE L'INTACTE. C'est la seule des
        trois qui doit se remarquer à l'écran, et c'est sur elle que repose la
        déduction du code A. Deux dessins qui ne diffèrent que dans les données
        seraient une énigme invisible — c'est le défaut de la cire blanche sur le
        marbre pâle au 441, transposé.

     5. ⚠️ LES DEUX MOITIÉS DE L'ARMOIRE PARTAGENT LEUR OSSATURE. Le taxi a payé
        ça au 436 : face et dos écrits deux fois avec les mêmes cotes recopiées
        AVAIENT DÉJÀ COMMENCÉ À DIVERGER. On compare les rangées de bandes
        rivetées des deux moitiés, ligne à ligne.

     6. ⚠️ OMBELINE A L'ANATOMIE DE LÉONIE. Deux PNJ de la même ville qui
        n'auraient pas les mêmes proportions se lisent comme deux jeux (438).

   CE QU'IL NE MESURE PAS, ET IL LE DIT : rien de la mise en scène. Un meuble
   posé dans la mauvaise pièce, une porte bouchée, un cul-de-sac d'une case sont
   du ressort de `verify-enquete` et de `render-mairie` ; ici on ne regarde que
   les pixels.
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt;
const S = A.buildSprites();

let fails = 0;
const ok = (cond, name, extra) => {
  console.log(`  ${cond ? "OK   " : "ÉCHEC"}   ${name}${extra ? "  —  " + extra : ""}`);
  if (!cond) fails++;
};
const title = (s) => console.log(`\n=== ${s} ===\n`);

const CHAR = S.getChar("f", 1, false, false, false, false, false, false, null);
const CHAR_H = 23;   // hauteur PEINTE d'un personnage debout (mesurée au 429)

const px = (im) => im.__px || im.px;
const alphaAt = (im, x, y) => px(im)[(y * im.width + x) * 4 + 3];
const key = (im, x, y) => {
  const p = px(im), i = (y * im.width + x) * 4;
  return p[i + 3] < 8 ? "" : p[i] + "," + p[i + 1] + "," + p[i + 2];
};
function extent(im) {
  let top = 1e9, bot = -1, left = 1e9, right = -1;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    if (alphaAt(im, x, y) > 8) { if (y < top) top = y; if (y > bot) bot = y; if (x < left) left = x; if (x > right) right = x; }
  }
  return { h: bot - top + 1, w: right - left + 1, top, bot, left, right };
}

/* La mesure du 438, reprise TELLE QUELLE — on n'en réinvente pas une cinquième.
   Un îlot d'un ou deux pixels dont TOUT le pourtour est d'une seule couleur est
   ce que l'œil appelle « sale ». Connexité à HUIT voisins : à quatre, un cerne
   d'un pixel en diagonale n'est plus connexe et le banc accuse le contour. */
function dirt(im) {
  const W = im.width, H = im.height;
  const seen = new Uint8Array(W * H);
  let specks = 0, area = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (key(im, x, y)) area++;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seen[y * W + x]) continue;
    const c = key(im, x, y);
    if (!c) { seen[y * W + x] = 1; continue; }
    const cells = [], st = [[x, y]];
    seen[y * W + x] = 1;
    while (st.length) {
      const [cx, cy] = st.pop(); cells.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (seen[ny * W + nx] || key(im, nx, ny) !== c) continue;
        seen[ny * W + nx] = 1; st.push([nx, ny]);
      }
    }
    if (cells.length <= 2) {
      const around = new Set();
      for (const [ax, ay] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = ax + dx, ny = ay + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k2 = key(im, nx, ny);
        if (k2 && k2 !== c) around.add(k2);
      }
      if (around.size === 1) specks += cells.length;
    }
  }
  return { pct: area ? +(specks / area * 100).toFixed(2) : 0, n: specks, area };
}

/* Les onze dessins, avec leur repère d'échelle. ⚠️ LES REPÈRES SONT DES FAITS
   (429) : la hauteur réelle de l'objet rapportée à une personne de 1,70 m. La
   fourchette est large (±40 %) — on cherche les erreurs d'un facteur deux, pas
   le centimètre. Les meubles d'intérieur qui s'adossent à un mur sont exemptés
   du repère (ils sont accrochés, pas posés) et le disent. */
const CASES = [
  ["archiviste (Ombeline)", S.courtProps.archivistNPC, 1.13, "mi-corps, comme l'hôtesse de la mairie"],
  ["armoire scellée (g.)", S.courtProps.strongbox, 1.30, "elle domine, on n'atteint pas le dessus"],
  ["armoire scellée (d.)", S.courtProps.strongbox2, 1.30, "l'autre moitié, même ossature"],
  ["commande de verrou", S.courtProps.keyPost, 1.04, "la clé est à hauteur de main"],
  ["lutrin à registre", S.courtProps.registerStand, 1.22, "on lit debout, sans se pencher"],
  ["fichier du cadastre", S.courtProps.cardIndex, 1.13, "on tire un tiroir à hauteur de poitrine"],
  ["carton d'archives", S.courtProps.docBox, 0.96, "deux cartons empilés"],
  ["règlement affiché", S.courtProps.bylaw, null, "accroché au mur : pas de repère au sol"],
  ["borne de section", S.townBoundStone[0], 0.61, "elle arrive au genou, on l'enjambe"],
  ["borne martelée", S.townBoundStone[1], 0.61, "la même, au burin"],
  ["borne d'origine", S.townDatumStone, 0.87, "plus haute, elle porte un chapiteau"],
  ["plaque commémorative", S.townPlaque, 0.96, "on la lit en se penchant à peine"],
];

title("1. le piège n°1 des sprites : ce qui déborde par le HAUT est rogné");
{
  /* ⚠️⚠️ LA PREMIÈRE ÉCRITURE DE CE CHAPITRE MESURAIT LA MAUVAISE GRANDEUR, et
     c'est la septième fois d'affilée dans ce dépôt (rues 434, eau 435, escaliers
     436, mairie 439, parc 440, pont 441, marché de ce banc-ci). Elle interdisait
     tout pixel sur les QUATRE bords — et elle a refusé cinq dessins sur douze,
     tous corrects. Le mobilier d'intérieur de ce projet fait SEIZE de large PAR
     CONVENTION (voir `courtPropSprite`) : une étagère, un plan mural, un
     cartonnier occupent toute la largeur de leur case depuis le 426, et les deux
     moitiés de l'armoire scellée DOIVENT se toucher, sinon le meuble se fend au
     milieu. Interdire les côtés, c'était interdire la convention.

     ⚠️ CE QUI EST RÉELLEMENT DANGEREUX EST LE HAUT, et lui seul : un sprite est
     ancré par son bord BAS et grandit vers le haut, donc c'est là — et
     seulement là — qu'un canevas trop court rogne en silence. C'est ce qui est
     arrivé à l'enseigne du taxi, au drapeau de la mairie et au liseré des
     oiseaux (433), puis à la flèche du cyprès (438).
     ⚠️ Les dessins de DEHORS, eux, sont cernés et posés dans un canevas plus
     large qu'eux : pour ceux-là on garde les trois côtés, parce qu'un liseré qui
     touche le bord est lui-même découpé (la leçon de `padOutline`, 433). */
  const DEHORS = new Set(["borne de section", "borne martelée", "borne d'origine", "plaque commémorative"]);
  for (const [name, im] of CASES) {
    if (!im) { ok(false, `${name} : sprite manquant`); continue; }
    const W = im.width, H = im.height;
    let top = 0, side = 0;
    for (let x = 0; x < W; x++) if (alphaAt(im, x, 0) > 8) top++;
    for (let y = 0; y < H - 1; y++) { if (alphaAt(im, 0, y) > 8) side++; if (alphaAt(im, W - 1, y) > 8) side++; }
    if (DEHORS.has(name)) {
      ok(top === 0 && side === 0, `${name} (dehors) ne touche ni le haut ni les côtés`,
         top || side ? `${top} px en haut, ${side} px sur les côtés` : `${W}×${H}`);
    } else {
      ok(top === 0, `${name} ne déborde pas par le haut`, top ? `${top} px rognés` : `${W}×${H}`);
    }
  }
  /* ⚠️ ET L'INVERSE POUR L'ARMOIRE : ses deux moitiés DOIVENT toucher leur bord
     MITOYEN. Un meuble de deux cases dont les moitiés ne se rejoignent pas
     laisse une couture d'un pixel au milieu — le défaut que le 434 a passé un
     chapitre entier à traquer sur les pavages, à l'échelle d'un meuble. */
  const g0 = S.courtProps.strongbox, d0 = S.courtProps.strongbox2;
  let joinG = 0, joinD = 0;
  for (let y = 0; y < g0.height; y++) { if (alphaAt(g0, g0.width - 1, y) > 8) joinG++; if (alphaAt(d0, 0, y) > 8) joinD++; }
  ok(joinG > 20 && joinD > 20, "⚠️ les deux moitiés de l'armoire se REJOIGNENT (aucune couture au milieu)",
     `${joinG} / ${joinD} px de contact`);
}

title("2. la propreté : aucun point perdu dans un aplat (grandeur du 438)");
{
  const vals = CASES.filter(c => c[1]).map(([n, im]) => [n, dirt(im)]);
  for (const [n, v] of vals) console.log(`        ${n.padEnd(24)} ${String(v.pct).padStart(5)} %  (${v.n} px sur ${v.area})`);
  const worst = vals.reduce((a, b) => (b[1].pct > a[1].pct ? b : a));
  /* Le seuil est celui du 438 (les essences neuves y font 0 à 0,4 %, l'ancien
     chêne 1,3 %). On ne le desserre pas pour des meubles : un meuble est plus
     petit qu'un houppier, donc un point perdu y pèse PLUS lourd. */
  ok(worst[1].pct <= 1.0, "aucun dessin ne dépasse 1 % de points perdus dans un aplat",
     `le plus sale : ${worst[0]} à ${worst[1].pct} %`);
}

title("3. l'échelle, contre un personnage de 23 px");
{
  console.log("dessin                    px    ×perso   attendu   écart");
  console.log("-".repeat(62));
  for (const [name, im, want, why] of CASES) {
    if (!im) continue;
    const e = extent(im), ratio = e.h / CHAR_H;
    if (want === null) { console.log(`${name.padEnd(24)}${String(e.h).padStart(5)}${("×" + ratio.toFixed(2)).padStart(9)}       —       —   ${why}`); continue; }
    const err = ratio / want;
    console.log(`${name.padEnd(24)}${String(e.h).padStart(5)}${("×" + ratio.toFixed(2)).padStart(9)}${("×" + want.toFixed(2)).padStart(10)}${((err >= 1 ? "+" : "") + ((err - 1) * 100).toFixed(0)).padStart(7)}%   ${why}`);
    ok(err <= 1.4 && err >= 0.6, `${name} : l'échelle tient`, `×${ratio.toFixed(2)} pour ×${want.toFixed(2)}`);
  }
}

title("4. les deux bornes se distinguent, et l'armoire ne diverge pas");
{
  /* ⚠️⚠️ LA BORNE MARTELÉE PORTE TOUTE LA DÉDUCTION DU CODE A. Si elle
     ressemblait à l'intacte, le joueur passerait devant sans rien voir, et
     l'énigme deviendrait « allez dans le bois au hasard ». On mesure la
     PROPORTION de pixels qui diffèrent : deux dessins jumeaux donneraient zéro,
     deux dessins sans rapport donneraient tout. On veut une différence NETTE et
     LOCALE — la face gravée, pas la silhouette. */
  const a = S.townBoundStone[0], b = S.townBoundStone[1];
  ok(a.width === b.width && a.height === b.height, "les deux bornes ont la même silhouette (c'est la même pierre)");
  let diff = 0, both = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const ka = key(a, x, y), kb = key(b, x, y);
    if (!ka && !kb) continue;
    both++;
    if (ka !== kb) diff++;
  }
  const pct = 100 * diff / both;
  ok(pct >= 6 && pct <= 40, "⚠️ la borne martelée SE VOIT, sans devenir un autre objet",
     `${pct.toFixed(1)} % de pixels différents`);
  const ea = extent(a), eb = extent(b);
  ok(ea.h === eb.h && ea.w === eb.w, "…et leur emprise est identique", `${ea.w}×${ea.h}`);

  /* ⚠️ LES DEUX MOITIÉS DE L'ARMOIRE PARTAGENT LEUR OSSATURE. Le taxi a payé ça
     au 436 : face et dos écrits deux fois avec les mêmes cotes recopiées avaient
     DÉJÀ commencé à diverger (les bas de caisse d'un côté, pas de l'autre). On
     compare les rangées où chaque moitié pose de la matière : elles doivent être
     les mêmes, sinon le meuble se casse en deux au milieu. */
  const g = S.courtProps.strongbox, d = S.courtProps.strongbox2;
  ok(g.height === d.height && g.width === d.width, "les deux moitiés de l'armoire ont le même gabarit");
  const rows = (im) => Array.from({ length: im.height }, (_, y) => {
    let n = 0; for (let x = 0; x < im.width; x++) if (alphaAt(im, x, y) > 8) n++; return n > 0;
  }).join("");
  ok(rows(g) === rows(d), "⚠️ …et exactement les mêmes rangées peintes (l'ossature ne diverge pas)");
  /* Chaque moitié porte UNE entrée de serrure, et elles sont de part et d'autre
     — c'est ce qui fait lire « on ne l'ouvre pas seul » avant toute explication. */
  const gold = (im) => { let sx = 0, n = 0; for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) { const p = px(im), i = (y * im.width + x) * 4; if (p[i + 3] > 8 && p[i] > 190 && p[i + 1] > 140 && p[i + 2] < 110) { sx += x; n++; } } return n ? sx / n : -1; };
  const cg = gold(g), cd = gold(d);
  ok(cg >= 0 && cd >= 0, "chaque vantail porte son entrée de serrure", `x moyen ${cg.toFixed(1)} / ${cd.toFixed(1)}`);
  ok(cg < g.width / 2 && cd > d.width / 2, "⚠️ …et elles sont de part et d'autre du meuble (la règle des deux clés se VOIT)");
}

title("5. Ombeline a l'anatomie de Léonie");
{
  /* ⚠️ DEUX PNJ DE LA MÊME VILLE QUI N'AURAIENT PAS LES MÊMES PROPORTIONS SE
     LISENT COMME DEUX JEUX (438, sur le gabarit de la mairie). On compare donc
     la seule chose qui compte à seize pixels : le gabarit et la ligne d'épaules.
     Ce qui les distingue — la couleur, les cheveux, les lunettes, le carton —
     n'a rien à voir avec l'anatomie et ne se mesure pas ici. */
  const o = S.courtProps.archivistNPC, l = S.courtProps.clerkNPC;
  ok(o.width === l.width && o.height === l.height, "même gabarit que l'hôtesse d'accueil", `${o.width}×${o.height}`);
  const eo = extent(o), el = extent(l);
  ok(Math.abs(eo.h - el.h) <= 2, "même hauteur peinte", `${eo.h} vs ${el.h}`);
  const shoulder = (im) => { for (let y = 0; y < im.height; y++) { let n = 0; for (let x = 0; x < im.width; x++) if (alphaAt(im, x, y) > 8) n++; if (n >= 8) return y; } return -1; };
  ok(Math.abs(shoulder(o) - shoulder(l)) <= 2, "la ligne d'épaules tombe au même endroit",
     `rangée ${shoulder(o)} vs ${shoulder(l)}`);
  /* Et elles ne se ressemblent PAS : un second PNJ qui serait une recoloration
     du premier ne serait pas un second PNJ. */
  let same = 0, tot = 0;
  for (let y = 0; y < o.height; y++) for (let x = 0; x < o.width; x++) {
    const ka = key(o, x, y), kb = key(l, x, y);
    if (!ka && !kb) continue; tot++;
    if (ka === kb) same++;
  }
  ok(same / tot < 0.5, "⚠️ …mais ce n'est pas la même personne recolorée", `${(100 * same / tot).toFixed(0)} % de pixels identiques`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   LES DEUX PLANCHES. Chaque dessin à côté d'une fermière, sur la même ligne de
   sol. ⚠️ LA LIGNE DE SOL EST TRACÉE : sans elle on ne voit pas qu'un objet
   flotte, et c'est la moitié de ce qu'on vient regarder.
   ═══════════════════════════════════════════════════════════════════════════ */
function plate(items, file, bg) {
  /* ⚠️ `getChar` REND UNE FEUILLE, PAS UNE POSE — et c'est le genre de détail
     qui fait dessiner une planche vide de moitié : à mesurer la hauteur de la
     feuille, la case faisait deux cents pixels de haut pour des meubles de
     trente. On DÉCOUPE la pose debout (16×24, la première de la feuille), comme
     le fait `render-echelle` depuis le 429. */
  const CELL = 54, PAD = 10, POSE_W = 16, POSE_H = 24;
  const maxH = Math.max(...items.map(([, im]) => im.height), POSE_H);
  const W = PAD + items.length * CELL + PAD, H = PAD + maxH + 18;
  const v = makeCanvas(W, H), g = v.ctx;
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const gy = H - 12;
  g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, gy, W, 1);
  items.forEach(([, im], k) => {
    const x0 = PAD + k * CELL;
    g.drawImage(CHAR, 0, 0, POSE_W, POSE_H, x0, gy - 23, POSE_W, POSE_H);
    g.drawImage(im, x0 + 20, gy - im.height);
  });
  const up = scale(v.px, W, H, 6);
  writePNG(path.join(OUT, file), up.px, up.W, up.H);
  console.log(`\n  → ${file}  (${W}×${H} px, ×6)`);
}
plate(CASES.slice(0, 8), "enquete-meubles.png", "#2b2620");
plate(CASES.slice(8), "enquete-dehors.png", "#3c4a30");

console.log(fails ? `\n❌ ${fails} ÉCHEC(S)\n` : `\n✅ Tous les contrôles passent.\n`);
console.log(`Ce banc ne dit RIEN de la mise en scène : un meuble posé dans la mauvaise
pièce, une porte bouchée ou un cul-de-sac d'une case sont du ressort de
verify-enquete et de render-mairie. Ici on ne regarde que des pixels.`);
process.exit(fails ? 1 : 0);
