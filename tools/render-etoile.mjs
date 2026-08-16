/* =============================================================================
   render-etoile.mjs — LES DESSINS DE LA QUÊTE DE L'ÉTOILE. (zip 444)
   -----------------------------------------------------------------------------
       node tools/render-etoile.mjs

   ⚠️⚠️ IL A ÉTÉ ÉCRIT AVANT LE PREMIER `fillRect`, PAS APRÈS. C'est le
   corollaire du §4.2 de `CLAUDE.md` : *« ce dessin est-il regardable par un
   banc ? » est une question de QUALITÉ, et elle se pose avant de dessiner.* Les
   deux arbres de la ferme sont restés au niveau du zip 232 pendant deux cents
   zips uniquement parce qu'aucun banc ne pouvait les appeler.

   CE QU'IL MESURE, ET CHAQUE CONTRÔLE A ÉTÉ PAYÉ AILLEURS :

     1. AUCUN PIXEL SUR LE BORD HAUT DU CANEVAS. Le piège n°1 des sprites (§4),
        payé TROIS fois dans le seul zip 433 (l'enseigne du taxi, le drapeau de
        la mairie, le liseré des oiseaux) et deux fois de plus au 442. Il ne
        coûte rien sur le moment : le dessin est joli, il manque juste deux
        rangées que personne ne cherche.
        ⚠️ LE HAUT ET LUI SEUL — le mobilier d'intérieur fait seize de large PAR
        CONVENTION depuis le 426, et les deux moitiés de la cloche DOIVENT se
        toucher. Le banc du 442 avait commencé par interdire les quatre bords et
        refusait cinq dessins corrects.

     2. LES ÎLOTS QUI FLOTTENT DANS UN APLAT, en connexité à HUIT. C'est la
        bonne grandeur, et elle a demandé quatre rédactions au 438 : « le pixel
        isolé » interdit le pixel art, « les îlots de moins de quatre pixels »
        accuse les dégradés. Ici elle compte double — cette famille est la
        première du projet à ÉMETTRE DE LA LUMIÈRE, et un halo mal fait, c'est
        exactement du poivre autour d'une source.

     3. L'ÉCHELLE, CONTRE LE FERMIER ET PAS CONTRE D'AUTRES DÉCORS (429). Un
        objet deux fois trop grand au milieu d'objets deux fois trop grands a
        l'air juste. La compagne doit être « plus petite qu'une poule », ce que
        le texte anglais promet — et un dessin qui contredit son texte ment deux
        fois.

     4. LE CERNE EXISTE, MÊME DU CÔTÉ CLAIR (441). Un cierge de cire blanche sur
        le marbre pâle d'un chœur disparaît ; une étoile blanche sur un mur de
        pierre aussi. Ce qui manque n'est jamais du CONTRASTE, c'est un CERNE.

     5. LES DEUX ÉTATS D'UN MÊME OBJET GARDENT LA MÊME SILHOUETTE. Un sillon qui
        changerait de forme en se refermant se lirait comme un autre sillon —
        c'est le contrôle des trois saisons d'un arbre (437), transposé.

   ⚠️ CE QU'IL NE MESURE PAS, ET IL LE DIT :
     · IL NE JOUE PAS. Le halo de la compagne se voit VRAIMENT quand elle suit
       un fermier sur de l'herbe, la nuit, avec le voile de nuit par-dessus.
       Aucune planche ne dit ça.
     · IL NE JUGE PAS LE CRATÈRE DANS SON HERBE. Il l'appelle sur un fond peint
       ici, donc sur une approximation du sol de la ville. La vraie composition
       (le cratère au milieu du pré, avec ses arbres et son sentier) se voit
       dans `render-parc`-style ou en jouant. **Trou déclaré, et il est gênant.**
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const C = mods.fermeConstants, A = mods.fermeArt;
const S = A.buildSprites();

let fails = 0;
const ok = (cond, name, extra) => {
  console.log(`  ${cond ? "OK   " : "ÉCHEC"}   ${name}${extra ? "  —  " + extra : ""}`);
  if (!cond) fails++;
};

/* ── LES OUTILS DE MESURE. Ils lisent les pixels du canevas, jamais le code qui
   les a écrits : c'est la seule façon de voir ce que le joueur verra. */
/* ⚠️ UN SPRITE DU JEU EST UN CANEVAS DU FAUX DOM (`document.createElement`), UNE
   PLANCHE EST UNE SURFACE DE `makeCanvas` : deux formes, un seul accesseur. Sans
   ça, la moitié des contrôles lirait `undefined` et passerait au vert — le stub
   menteur du §10, dans l'outil censé nous en protéger. */
function px(cv) { return cv.__px || cv.px; }
function wOf(cv) { return cv.width; }
function hOf(cv) { return cv.height; }
function topEdgeInk(cv) {
  const d = px(cv);
  let n = 0;
  for (let x = 0; x < cv.width; x++) if (d[(x * 4) + 3] > 8) n++;
  return n;
}
/* ⚠️ « L'ÎLOT QUI FLOTTE DANS UN APLAT », en connexité à HUIT. À quatre, un
   cerne d'un pixel en diagonale n'est plus connexe et le banc accuse le contour
   lui-même (438). On tolère les pixels semi-transparents : un halo est fait de
   ça, et le mesurer comme de la matière condamnerait toute lumière. */
function floatingIslands(cv) {
  const w = cv.width, h = cv.height, d = px(cv);
  const key = (i) => d[i * 4 + 3] < 100 ? -1 : (d[i * 4] >> 4) * 256 + (d[i * 4 + 1] >> 4) * 16 + (d[i * 4 + 2] >> 4);
  const seen = new Uint8Array(w * h);
  let bad = 0, total = 0;
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || key(i) < 0) continue;
    const k = key(i), cell = [], q = [i];
    seen[i] = 1;
    while (q.length) {
      const p = q.pop(); cell.push(p);
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (seen[ni] || key(ni) !== k) continue;
        seen[ni] = 1; q.push(ni);
      }
    }
    total += cell.length;
    if (cell.length > 3) continue;
    // Le pourtour est-il d'UNE SEULE couleur ? Si oui, l'îlot flotte.
    const ring = new Set();
    for (const p of cell) {
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (key(ni) !== k) ring.add(key(ni));
      }
    }
    if (ring.size === 1 && [...ring][0] >= 0) bad += cell.length;
  }
  return total ? bad / total : 0;
}
function inkHeight(cv) {
  const d = px(cv);
  let top = -1, bot = -1;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++)
    if (d[((y * cv.width + x) * 4) + 3] > 40) { if (top < 0) top = y; bot = y; break; }
  return bot - top + 1;
}
/* La silhouette d'un dessin, en booléens — pour comparer deux états.
   ⚠️⚠️ LE SEUIL D'OPACITÉ EST UN PARAMÈTRE, ET LE PREMIER JET L'AVAIT FAUX. À 40,
   il attrapait le HALO de l'étoile (alpha 51), qui est un disque identique pour
   les quatre poses : le banc comparait donc quatre fois le même disque et
   annonçait « 0 pixel d'écart » alors que les quatre dessins étaient bel et bien
   différents. C'est le défaut nommé en tête de `CLAUDE.md` — *il mesure autre
   chose* — et il était au ROUGE, ce qui l'a rendu visible ; au vert, il aurait
   couvert une vraie régression pendant des zips.
   ⚠️ Deux seuils, donc, et chacun a un sens : `silhouette` (40) est la SURFACE
   OCCUPÉE, halo compris — c'est la bonne grandeur pour « le sillon garde sa
   forme ». `matter` (150) est la MATIÈRE — c'est la bonne pour « ces deux poses
   sont deux dessins ». Une seule fonction pour les deux aurait forcément menti à
   l'une des deux questions. */
function silhouette(cv) {
  const d = px(cv), out = new Uint8Array(cv.width * cv.height);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 40 ? 1 : 0;
  return out;
}
function matter(cv) {
  const d = px(cv), out = new Uint8Array(cv.width * cv.height);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 150 ? 1 : 0;
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. LA PLANCHE — ce qu'on regarde.
   ═══════════════════════════════════════════════════════════════════════════ */
function board() {
  const W = 640, H = 400;
  const sur = makeCanvas(W, H), g = sur.ctx;
  /* ⚠️ DEUX FONDS, ET C'EST LE POINT DE LA PLANCHE. Cette famille émet de la
     lumière : la juger sur un seul fond, c'est ne pas voir la moitié des
     défauts. Un fond SOMBRE flatte tout ce qui brille ; un fond CLAIR est celui
     qui a fait disparaître les cierges du chœur au 441. */
  g.fillStyle = "#1a2418"; g.fillRect(0, 0, W, H / 2);
  g.fillStyle = "#d8d4c6"; g.fillRect(0, H / 2, W, H / 2);
  const put = (img, x, y) => g.drawImage(img, x, y);
  const twice = (img, x, y) => { put(img, x, y); put(img, x, y + H / 2); };

  // L'étoile : 4 poses × 3 états, sur les deux fonds.
  for (let st = 0; st < 3; st++) for (let po = 0; po < 4; po++)
    twice(S.starWisp[st][po], 14 + po * 24 + st * 104, 22);
  // Les quatre éclats.
  for (let n = 0; n < 4; n++) twice(S.starShard[n], 330 + n * 20, 20);
  // La pie, trois poses.
  for (let p = 0; p < 3; p++) twice(S.magpie[p], 424 + p * 30, 16);
  // Le repère d'échelle : un fermier, à côté. ⚠️ C'EST LE SEUL CONTRÔLE
  // D'ÉCHELLE QUI VAILLE (429) — un décor se juge contre qui s'en sert.
  const ch = S.getChar ? S.getChar("f", 0, false, false, false, false, false, false, "") : null;
  if (ch) { g.drawImage(ch, 0, 0, 16, 24, 520, 12, 16, 24); g.drawImage(ch, 0, 0, 16, 24, 520, 12 + H / 2, 16, 24); }

  // Les décors de la verrerie.
  twice(S.starKiln, 14, 52);
  twice(S.starRack, 56, 58);
  twice(S.starShutter, 92, 50);
  twice(S.starNestTree, 128, 30);
  // Les quatre meubles du beffroi.
  const cp = S.courtProps;
  twice(cp.bellFrame, 190, 50);
  twice(cp.greatBell2, 210, 48);
  twice(cp.greatBell, 226, 48);
  twice(cp.ringerBoard, 248, 66);
  // Le sillon, ses deux états.
  put(S.starFurrow[0], 280, 60); put(S.starFurrow[1], 280, 100);
  put(S.starFurrow[0], 280, 60 + H / 2); put(S.starFurrow[1], 280, 100 + H / 2);
  return sur;
}

/* La planche du CRATÈRE, seule : il fait neuf cases, il ne tient pas avec le
   reste, et il se peint sur un fond d'herbe. */
function craterBoard() {
  const T = 16, W = 380, H = 190;
  const sur = makeCanvas(W, H), g = sur.ctx;
  /* Un fond d'herbe APPROXIMÉ, et le banc le déclare : le vrai gazon de la ville
     est un pavé de 64 px (438) que seule la boucle de rendu assemble. Ici on
     veut juger la FORME du cratère, pas sa cohabitation avec l'herbe. */
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
    const v = ((x * 7 + y * 13) % 23) / 23;
    g.fillStyle = `rgb(${(74 + v * 12) | 0},${(112 + v * 16) | 0},${(58 + v * 10) | 0})`;
    g.fillRect(x, y, 4, 4);
  }
  S.drawStarCrater(g, 100, 95, T, 0, 0);
  S.drawStarCrater(g, 280, 95, T, 1, 0);
  return sur;
}

console.log("\n=== ZIP 444 — LES DESSINS DE LA QUÊTE DE L'ÉTOILE ===\n");

const planche = board();
{ const up = scale(planche.px, planche.width, planche.height, 2); writePNG(path.join(OUT, "etoile-planche.png"), up.px, up.W, up.H); }
const crat = craterBoard();
{ const up = scale(crat.px, crat.width, crat.height, 3); writePNG(path.join(OUT, "etoile-cratere.png"), up.px, up.W, up.H); }

console.log("1. LE BORD DU HAUT — le piège n°1 des sprites\n");
{
  const all = [];
  for (let st = 0; st < 3; st++) for (let po = 0; po < 4; po++) all.push(["wisp " + st + po, S.starWisp[st][po]]);
  for (let n = 0; n < 4; n++) all.push(["shard " + n, S.starShard[n]]);
  for (let p = 0; p < 3; p++) all.push(["magpie " + p, S.magpie[p]]);
  all.push(["kiln", S.starKiln], ["rack", S.starRack], ["shutter", S.starShutter],
           ["nestTree", S.starNestTree], ["furrow chaud", S.starFurrow[0]], ["furrow froid", S.starFurrow[1]],
           ["greatBell", S.courtProps.greatBell], ["greatBell2", S.courtProps.greatBell2],
           ["bellFrame", S.courtProps.bellFrame], ["ringerBoard", S.courtProps.ringerBoard]);
  const guilty = all.filter(([, cv]) => topEdgeInk(cv) > 0).map(([n]) => n);
  ok(guilty.length === 0, `aucun pixel sur le bord HAUT (${all.length} dessins LUS)`, guilty.join(", ") || "0");
}

console.log("\n2. LA PROPRETÉ — les îlots qui flottent dans un aplat (connexité 8)\n");
{
  const worst = [];
  for (const [name, cv] of [["l'étoile calme", S.starWisp[0][0]], ["l'étoile apeurée", S.starWisp[1][0]],
                            ["un éclat", S.starShard[0]], ["la pie de dos", S.magpie[0]],
                            ["le four", S.starKiln], ["le râtelier", S.starRack],
                            ["l'arbre au nid", S.starNestTree], ["le sillon chaud", S.starFurrow[0]],
                            ["la cloche", S.courtProps.greatBell]]) {
    const r = floatingIslands(cv);
    worst.push([name, r]);
    ok(r <= 0.02, `${name} : îlots flottants`, (r * 100).toFixed(2) + " %");
  }
}

console.log("\n3. L'ÉCHELLE — contre le fermier, jamais contre d'autres décors\n");
{
  const FARMER = 24;   // une pose de la feuille de personnage
  const wisp = inkHeight(S.starWisp[0][0]);
  ok(wisp >= 10 && wisp <= 15, "la compagne est « plus petite qu'une poule »",
     `${wisp} px = ×${(wisp / FARMER).toFixed(2)} d'un fermier`);
  const shard = inkHeight(S.starShard[0]);
  ok(shard >= 10 && shard <= 18, "un éclat tient dans la main", `${shard} px = ×${(shard / FARMER).toFixed(2)}`);
  const bell = inkHeight(S.courtProps.greatBell);
  ok(bell >= 32 && bell <= 44, "⚠️ la cloche est une cloche de VOLÉE, pas une clochette",
     `${bell} px = ×${(bell / FARMER).toFixed(2)}`);
  const tree = inkHeight(S.starNestTree);
  ok(tree >= 48 && tree <= 62, "l'arbre au nid est un arbre", `${tree} px = ×${(tree / FARMER).toFixed(2)}`);
}

console.log("\n4. LE CERNE — il sert AUSSI contre un fond clair (441)\n");
{
  /* On mesure le TON LE PLUS SOMBRE du pourtour de la silhouette. Une étoile
     dont le bord est clair n'a pas de cerne, et elle disparaîtra sur la pierre
     pâle du beffroi exactement comme les cierges du chœur au 441. */
  /* ⚠️ ON MESURE LE BORD DE LA MATIÈRE, PAS CELUI DU HALO — et le premier jet
     confondait les deux. Avec `silhouette` (alpha > 40), le « bord » de l'étoile
     était le bord de son halo, dont aucun pixel n'est assez opaque pour être
     retenu : la fonction ne trouvait rien et rendait 255, c'est-à-dire ÉCHEC sur
     un dessin correct. Un cerne est une propriété de la masse, donc on la lit
     sur la masse (`matter`, alpha > 150). Deuxième fois dans ce banc que le
     seuil d'opacité est la grandeur qui se trompe : c'est noté. */
  const rimDark = (cv) => {
    const w = cv.width, h = cv.height, d = px(cv), sil = matter(cv);
    let dark = 255;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (!sil[y * w + x]) continue;
      let edge = false;
      for (let k = 0; k < 4 && !edge; k++) {
        const nx = x + [1, -1, 0, 0][k], ny = y + [0, 0, 1, -1][k];
        if (!sil[ny * w + nx]) edge = true;
      }
      if (!edge) continue;
      const i = (y * w + x) * 4;
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (d[i + 3] > 150) dark = Math.min(dark, l);
    }
    return dark;
  };
  for (const [name, cv, max] of [["l'étoile calme", S.starWisp[0][0], 110],
                                 ["un éclat", S.starShard[0], 110],
                                 ["la cloche", S.courtProps.greatBell, 90]]) {
    const l = rimDark(cv);
    ok(l <= max, `${name} : son bord porte un ton sombre`, `L ${l.toFixed(0)} (max ${max})`);
  }
}

console.log("\n5. LES DEUX ÉTATS GARDENT LA MÊME SILHOUETTE\n");
{
  const a = silhouette(S.starFurrow[0]), b = silhouette(S.starFurrow[1]);
  let same = 0, any = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] || b[i]) any++; if (a[i] && b[i]) same++; }
  const r = same / any;
  ok(r > 0.62, "⚠️ le sillon chaud et le sillon refermé sont le MÊME sillon",
     `${(r * 100).toFixed(0)} % de recouvrement`);
  ok(r < 0.98, "…mais ils ne sont pas identiques (sinon rien n'a changé)", `${(r * 100).toFixed(0)} %`);
}

console.log("\n6. L'ÉTOILE RESPIRE — quatre poses réellement différentes\n");
{
  let minDiff = 1e9;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = matter(S.starWisp[0][i]), b = matter(S.starWisp[0][j]);
    let d = 0; for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) d++;
    minDiff = Math.min(minDiff, d);
  }
  ok(minDiff >= 2, "⚠️ deux poses ne sont jamais le même dessin", `${minDiff} pixels d'écart au minimum`);
  /* ⚠️ ET LES TROIS ÉTATS D'HUMEUR DOIVENT SE DISTINGUER D'UN COUP D'ŒIL, sinon
     « elle a peur » est une information que le joueur n'a pas. */
  const inkH = (cv) => { const m = matter(cv); let t = -1, b2 = -1; for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (m[y * cv.width + x]) { if (t < 0) t = y; b2 = y; break; } return b2 - t + 1; };
  const h0 = inkH(S.starWisp[0][0]), h1 = inkH(S.starWisp[1][0]);
  ok(h1 < h0, "l'étoile apeurée est plus petite que l'étoile calme", `${h1} px contre ${h0}`);
}

console.log("\n7. LE CRATÈRE — sa forme est une isoligne, pas un cercle\n");
{
  /* On remesure la forme SUR LE PIXEL, pas sur la formule : un cratère
     parfaitement rond se lit comme un trou de golf, et c'est le genre de chose
     qu'on ne voit qu'en regardant. */
  const T = 16, sur = makeCanvas(200, 200), gg = sur.ctx;
  gg.fillStyle = "#000"; gg.fillRect(0, 0, 200, 200);
  S.drawStarCrater(gg, 100, 100, T, 0, 0);
  const d = sur.px;
  const lit = (x, y) => { const i = ((y * 200 + x) * 4); return d[i] + d[i + 1] + d[i + 2] > 30; };
  let rmin = 999, rmax = 0;
  for (let k = 0; k < 72; k++) {
    const a = k / 72 * Math.PI * 2;
    let r = 0;
    for (let t = 4; t < 95; t++) { const x = (100 + Math.cos(a) * t) | 0, y = (100 + Math.sin(a) * t * 0.78) | 0; if (lit(x, y)) r = t; }
    rmin = Math.min(rmin, r); rmax = Math.max(rmax, r);
  }
  const irr = (rmax - rmin) / rmax;
  ok(irr > 0.12, "⚠️ le contour ONDULE (ce n'est pas un cercle)", `irrégularité ${(irr * 100).toFixed(0)} %`);
  ok(irr < 0.55, "…sans que le cratère cesse d'être un cratère", `${(irr * 100).toFixed(0)} %`);
  ok(rmax * 1.0 <= 4.5 * T + 6, "il tient dans son emprise annoncée",
     `rayon peint ${rmax} px, annoncé ${(C.STAR_CRATER_DRAW_R * T) | 0}`);
}

console.log(`\nPlanches : tools/out/etoile-planche.png · tools/out/etoile-cratere.png`);
console.log(fails === 0 ? `\n✅ tous les contrôles passés.\n` : `\n❌ ${fails} contrôle(s) en échec.\n`);
process.exit(fails ? 1 : 0);
