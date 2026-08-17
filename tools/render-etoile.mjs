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

/* La planche du CRATÈRE, seule : il fait quinze cases fissures comprises, il ne
   tient pas avec le reste, et il se peint sur un fond d'herbe.
   ⚠️ ZIP 446 — TROIS ÉTATS SUR LA MÊME PLANCHE, parce que c'est CE QUI A CHANGÉ :
   le modèle de Guillaume est fourni en deux images (fumant / refroidi) et le
   bassin de verre est le troisième. Les regarder côte à côte est la seule façon
   de voir qu'ils gardent la même silhouette. */
function craterBoard() {
  const T = 16, W = 780, H = 300;
  const sur = makeCanvas(W, H), g = sur.ctx;
  /* Un fond d'herbe APPROXIMÉ, et le banc le déclare : le vrai gazon de la ville
     est un pavé de 64 px (438) que seule la boucle de rendu assemble. Ici on
     veut juger la FORME du cratère, pas sa cohabitation avec l'herbe. */
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
    const v = ((x * 7 + y * 13) % 23) / 23;
    g.fillStyle = `rgb(${(74 + v * 12) | 0},${(112 + v * 16) | 0},${(58 + v * 10) | 0})`;
    g.fillRect(x, y, 4, 4);
  }
  const at = [130, 390, 650];
  S.drawStarCrater(g, at[0], 170, T, 0, 2200, { heat: 1 });
  S.drawStarCraterAir(g, at[0], 170, T, 2200, { heat: 1 });
  S.drawStarCrater(g, at[1], 170, T, 0, 2200, { heat: 0.20 });
  S.drawStarCraterAir(g, at[1], 170, T, 2200, { heat: 0.20 });
  S.drawStarCrater(g, at[2], 170, T, 1, 2200, {});
  return sur;
}

/* ╔═══════════════════════════════════════════════════════════════════════════
   ║ ZIP 448 — LA PLANCHE DE LA COMÈTE. ELLE N'EXISTAIT PAS, ET C'EST LA CAUSE.
   ╚═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LE DESSIN DU 445 TENAIT EN HUIT LIGNES DANS LA CLOSURE DE LA BOUCLE DE
   RENDU — un `createLinearGradient` et un `arc()` blanc. Guillaume l'a résumé en
   « trop ridicule ». Il ne l'a jamais été par négligence : il a VIEILLI, faute
   d'un endroit où se voir, pendant que le cratère prenait trois passes et sept
   contrôles. C'est le deuxième visage du piège n°1, et c'est la troisième fois
   qu'il se paie (les sols d'intérieur, les arbres de la ferme, la comète).
   ⚠️ ON MONTRE TROIS TAILLES sur DEUX FONDS : la comète loin (elle doit encore
   se lire), à mi-course, et au moment du contact. Un seul fond aurait flatté le
   halo — c'est déjà la règle de la planche principale, cette famille émet de la
   lumière. */
function cometBoard() {
  const W = 900, H = 460;
  const sur = makeCanvas(W, H), g = sur.ctx;
  // Un ciel de nuit voilé (celui de la scène) et une bande claire : un cœur
  // blanc sur du gris pâle est exactement ce qui disparaît sans cerne (441).
  g.fillStyle = "#0a0c1e"; g.fillRect(0, 0, W, H * 0.62);
  g.fillStyle = "#b9c2cc"; g.fillRect(0, H * 0.62, W, H * 0.38);
  const ang = Math.atan2(Math.sin(0.72), -Math.cos(0.72));   // le même quadrant que le jeu
  const shots = [[130, 100, 5], [370, 120, 13], [700, 150, 27]];
  for (const [x, y, R] of shots) S.drawStarComet(g, x, y, ang, R, 2400, { q: 3 });
  for (const [x, y, R] of shots) S.drawStarComet(g, x, y + 310, ang, R, 2400, { q: 3 });
  // La traînée qui reste, à cinq âges — et l'impact, à quatre instants.
  for (let i = 0; i < 5; i++)
    S.drawStarCometTrail(g, 60 + i * 60, 262, ang, 14, i / 5, 2400, { q: 3 });
  for (let i = 0; i < 4; i++)
    S.drawStarImpactFlash(g, 420 + i * 145, 262, i * 0.30, 15, { q: 3 });
  return sur;
}

/* ⚠️⚠️ ET UNE PLANCHE DE MESURE, SUR FOND NOIR, QUI N'EST PAS LA PLANCHE QU'ON
   REGARDE. Sur l'herbe, la terre et une fissure ont la même teinte dominante
   (rouge > vert dans les deux cas) et rien ne les sépare ; sur du noir, la
   MASSE reste claire (L ≥ 34) et la fissure reste sombre. Les deux rayons du
   446 ne se mesurent qu'à cette condition. */
function craterProbe(phase, heat) {
  const T = 16, S2 = 320;
  const sur = makeCanvas(S2, S2), gg = sur.ctx;
  S.drawStarCrater(gg, S2 / 2, S2 / 2, T, phase, 0, { heat, star: false });
  const d = sur.px;
  const lum = (x, y) => {
    if (x < 0 || y < 0 || x >= S2 || y >= S2) return 0;
    const i = (y * S2 + x) * 4;
    return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  };
  const al = (x, y) => (x < 0 || y < 0 || x >= S2 || y >= S2) ? 0 : d[(y * S2 + x) * 4 + 3];
  /* ⚠️⚠️ LA TERRE ET LA FISSURE SE SÉPARENT PAR L'ALPHA, PAS PAR LA COULEUR — et
     c'est la SECONDE rédaction de ce contrôle. La première lisait la luminance :
     elle marchait tant que le cratère était éclairé mollement, et elle est
     devenue fausse dès que la paroi ouest est passée dans l'ombre (L 27 contre un
     seuil de 34) — le banc a annoncé « 72 % d'irrégularité » sur un cratère
     parfaitement rond, parce qu'il ne VOYAIT pas son côté sombre. C'est le
     quatrième visage du défaut de banc de CLAUDE.md : *il mesure autre chose.*
     La terre est peinte OPAQUE (alpha 255, `putImageData`), les fissures ne le
     sont jamais (alpha ≤ 204) : la mesure ne dépend donc plus de l'éclairage. */
  const mass = [], any = [];
  for (let k = 0; k < 96; k++) {
    const a = k / 96 * Math.PI * 2;
    let rm = 0, ra = 0;
    for (let t = 3; t < 150; t++) {
      const x = Math.round(S2 / 2 + Math.cos(a) * t), y = Math.round(S2 / 2 + Math.sin(a) * t * 0.86);
      const v = al(x, y);
      if (v >= 250) rm = t;
      if (v >= 8) ra = t;
    }
    mass.push(rm); any.push(ra);
  }
  return { px: d, S: S2, lum, mass, any };
}

console.log("\n=== ZIP 444 — LES DESSINS DE LA QUÊTE DE L'ÉTOILE ===\n");

const planche = board();
{ const up = scale(planche.px, planche.width, planche.height, 2); writePNG(path.join(OUT, "etoile-planche.png"), up.px, up.W, up.H); }
const crat = craterBoard();
{ const up = scale(crat.px, crat.width, crat.height, 3); writePNG(path.join(OUT, "etoile-cratere.png"), up.px, up.W, up.H); }
const com = cometBoard();
{ const up = scale(com.px, com.width, com.height, 2); writePNG(path.join(OUT, "etoile-comete.png"), up.px, up.W, up.H); }

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

console.log("\n7. LE CRATÈRE — deux rayons, une profondeur, et un refroidissement\n");
{
  /* ⚠️ ON REMESURE LA FORME SUR LE PIXEL, PAS SUR LA FORMULE : un cratère
     parfaitement rond se lit comme un trou de golf, et c'est le genre de chose
     qu'on ne voit qu'en regardant.
     ⚠️⚠️ ET LE 446 MESURE CE QUE LE 444 NE MESURAIT PAS : la PROFONDEUR. Six
     bancs au vert n'avaient pas vu que le cratère était plat — il n'y avait
     aucune grandeur pour le dire (« quand Guillaume voit un défaut qu'aucun banc
     ne voit, la première question est : quelle grandeur ne mesure-t-on pas »). */
  const T = 16, P0 = craterProbe(0, 1), PC = craterProbe(0, 0);
  const rmMax = Math.max(...P0.mass), rmMin = Math.min(...P0.mass);
  const raMax = Math.max(...P0.any);
  const irr = (rmMax - rmMin) / rmMax;
  ok(irr > 0.12, "⚠️ le contour de la terre ONDULE (ce n'est pas un cercle)", `irrégularité ${(irr * 100).toFixed(0)} %`);
  ok(irr < 0.60, "…sans que le cratère cesse d'être un cratère", `${(irr * 100).toFixed(0)} %`);
  /* LA MASSE TIENT DANS L'EMPRISE GARANTIE — c'est le disque d'herbe libre que
     le générateur promet, et le seul endroit où l'on est sûr de ne rien
     recouvrir (règle du 440). */
  ok(rmMax <= C.STAR_CRATER_DRAW_R * T + 2, "⚠️ la TERRE tient dans l'emprise annoncée",
     `masse ${rmMax} px, emprise ${(C.STAR_CRATER_DRAW_R * T) | 0} px`);
  ok(rmMax >= C.STAR_CRATER_DRAW_R * T * 0.82, "…et elle la remplit (un cratère plus petit que sa case ment aussi)",
     `${(rmMax / (C.STAR_CRATER_DRAW_R * T) * 100).toFixed(0)} %`);
  /* LES FISSURES SORTENT DE LA MASSE ET S'ARRÊTENT À LEUR PROPRE RAYON. Les deux
     moitiés comptent : sans le premier, le modèle n'est pas tenu (ce sont elles
     qui disent « c'est TOMBÉ ») ; sans le second, on peint hors de tout ce qui
     est mesuré. */
  ok(raMax > rmMax * 1.25, "⚠️ les FISSURES sortent largement de la terre",
     `fissures ${raMax} px contre ${rmMax} px de terre`);
  ok(raMax <= C.STAR_CRATER_CRACK_R * T + 3, "…et elles s'arrêtent à leur propre rayon",
     `${raMax} px, annoncé ${(C.STAR_CRATER_CRACK_R * T) | 0} px`);

  /* ── LA PROFONDEUR, EN DEUX NOMBRES. Un cratère vu de dessus ne se lit creux
     qu'à deux conditions : le fond est plus sombre que la lèvre, et UNE des deux
     parois est dans l'ombre. Le dessin du 444 tenait la première et pas la
     seconde — d'où « c'est plat ». */
  /* ⚠️ MESURÉE SUR LE CRATÈRE ÉTEINT, ET C'EST UN DÉFAUT DE BANC TROUVÉ EN LE
     LANÇANT : sur le cratère chaud, les braises et leur lueur ÉCLAIRENT le fond
     (L 72 contre 70 pour la lèvre), donc le banc jugeait « pas de profondeur »
     un dessin qui en a. On mesure la TERRE, le feu se mesure ailleurs. */
  const ringL = (frac) => {
    let s = 0, n = 0;
    for (let k = 0; k < 96; k++) {
      const a = k / 96 * Math.PI * 2, r = PC.mass[k] * frac;
      s += PC.lum(Math.round(PC.S / 2 + Math.cos(a) * r), Math.round(PC.S / 2 + Math.sin(a) * r * 0.86));
      n++;
    }
    return s / n;
  };
  const lDeep = ringL(0.18), lRim = ringL(0.80);
  ok(lDeep < lRim * 0.72, "⚠️ le FOND est nettement plus sombre que la lèvre",
     `L ${lDeep.toFixed(0)} contre ${lRim.toFixed(0)}`);
  const sideL = (a0) => {
    let s = 0, n = 0;
    for (let k = 0; k < 96; k++) {
      const a = k / 96 * Math.PI * 2;
      if (Math.cos(a - a0) < 0.55) continue;
      for (const f of [0.30, 0.45, 0.60]) {
        const r = PC.mass[k] * f;
        s += PC.lum(Math.round(PC.S / 2 + Math.cos(a) * r), Math.round(PC.S / 2 + Math.sin(a) * r * 0.86));
        n++;
      }
    }
    return s / Math.max(1, n);
  };
  const west = sideL(Math.PI), east = sideL(0);
  ok(west < east * 0.80, "⚠️⚠️ UNE PAROI EST DANS L'OMBRE (c'est ÇA, le creux)",
     `ouest L ${west.toFixed(0)}, est L ${east.toFixed(0)}`);

  /* ── LE REFROIDISSEMENT. Les deux images de Guillaume sont le MÊME cratère :
     même terre, moins de feu. Un cratère qui changerait de forme en refroidissant
     se lirait comme un autre cratère (règle du sillon, banc §5). */
  const P1 = craterProbe(0, 0.20);
  let same = 0;
  for (let k = 0; k < 96; k++) if (Math.abs(P0.mass[k] - P1.mass[k]) <= 1) same++;
  ok(same >= 90, "⚠️ le cratère chaud et le cratère froid sont le MÊME cratère",
     `${same}/96 rayons identiques`);
  /* ⚠️⚠️ « DU FEU » SE MESURE PAR DIFFÉRENCE AVEC LE CRATÈRE ÉTEINT, ET C'EST LA
     TROISIÈME RÉDACTION DE CE CONTRÔLE. Les deux premières cherchaient une
     couleur — `R > 150 && R > 2·B`, puis un écart rouge-bleu — et les deux
     attrapaient la TERRE, qui est rouge elle aussi : le banc comptait
     soixante-quinze braises là où il y en avait neuf. Ce qu'on veut savoir n'est
     pas « quels pixels sont orange » mais « qu'est-ce que la chaleur AJOUTE » :
     c'est une différence entre deux images, et c'est exact par construction. */
  const fireVs = (P, PZ) => {
    let n = 0;
    for (let i = 0; i < P.px.length; i += 4) {
      const dr = P.px[i] - PZ.px[i], db = P.px[i + 2] - PZ.px[i + 2];
      if (dr > 25 && dr > db + 15) n++;
    }
    return n;
  };
  const fire = (P) => fireVs(P, PC);
  const f1 = fire(P0), f2 = fire(P1);
  ok(f2 < f1 * 0.62, "…mais il a beaucoup moins de braises", `${f1} px de feu → ${f2}`);
  ok(f2 > 0, "⚠️ …et il lui en reste (la seconde image en garde une dizaine)", `${f2} px`);

  /* ── LA FUMÉE, QUI EST L'AUTRE MOITIÉ DE LA DEMANDE. Elle doit MONTER : une
     fumée qui reste dans la cuvette est une tache. */
  {
    const S2 = 320, sur2 = makeCanvas(S2, S2), g2 = sur2.ctx;
    g2.fillStyle = "#000"; g2.fillRect(0, 0, S2, S2);
    let top = S2, bot = 0, hits = 0;
    for (const t of [0, 900, 1800, 2700, 3600]) S.drawStarCraterAir(g2, S2 / 2, S2 / 2, 16, t, { heat: 1 });
    const d2 = sur2.px;
    for (let y = 0; y < S2; y++) for (let x = 0; x < S2; x++) {
      const i = (y * S2 + x) * 4;
      if (d2[i] < 20) continue;
      hits++; if (y < top) top = y; if (y > bot) bot = y;
    }
    ok(hits > 0, "la fumée existe", `${hits} px`);
    ok(top < S2 / 2 - C.STAR_CRATER_DRAW_R * 16 * 0.9, "⚠️ elle MONTE au-dessus du trou",
       `plus haut point à ${(S2 / 2 - top)} px du centre`);
    ok(bot < S2 / 2 + 20, "…et elle ne descend pas sous la cuvette", `bas à ${bot - S2 / 2} px`);
    const sur3 = makeCanvas(S2, S2), g3 = sur3.ctx;
    g3.fillStyle = "#000"; g3.fillRect(0, 0, S2, S2);
    S.drawStarCraterAir(g3, S2 / 2, S2 / 2, 16, 0, { heat: 0 });
    let n3 = 0; for (let i = 0; i < sur3.px.length; i += 4) if (sur3.px[i] > 20) n3++;
    ok(n3 === 0, "⚠️ chaleur nulle = aucune fumée (le cratère de la fin ne fume pas)", `${n3} px`);
  }

  /* ── L'ENFONCEMENT. ⚠️ C'EST LA GRANDEUR QUE PERSONNE NE MESURAIT, ET C'EST
     LA DEMANDE MÊME DE CE ZIP. Trois propriétés, et la troisième est la seule
     qui protège de ce qui se verrait vraiment à l'écran : la CONTINUITÉ. Un
     décalage qui saute de onze pixels au bord du trou, c'est un fermier qui
     tressaute en entrant — un défaut qu'aucune capture fixe ne montre. */
  {
    const s0 = S.starCraterSink(0, 0, 16);
    ok(Math.abs(s0 - C.STAR_CRATER_SINK_PX) < 0.6, "au centre, on est au fond",
       `${s0.toFixed(1)} px sur ${C.STAR_CRATER_SINK_PX}`);
    ok(S.starCraterSink(C.STAR_CRATER_DRAW_R + 0.5, 0, 16) === 0, "hors de l'emprise, plus rien");
    let lip = 0, jump = 0, prev = null;
    for (let r = 0; r <= C.STAR_CRATER_DRAW_R + 0.4; r += 0.02) {
      for (const a of [0, 1.1, 2.3, 3.4, 4.6, 5.7]) {
        const v = S.starCraterSink(Math.cos(a) * r, Math.sin(a) * r * 0.86, 16);
        if (a === 0) {
          if (prev !== null) jump = Math.max(jump, Math.abs(v - prev));
          prev = v;
        }
        lip = Math.min(lip, v);
      }
    }
    ok(lip <= -1, "⚠️ on ENJAMBE le bourrelet (on monte avant de descendre)", `${lip.toFixed(1)} px`);
    ok(jump < 0.5, "⚠️⚠️ et le décalage est CONTINU (aucun tressautement au bord)",
       `plus grand saut ${jump.toFixed(2)} px pour 0,02 case`);
  }
}

console.log("\n8. LA COMÈTE — sept couches, un sens de course, et un halo\n");
{
  /* ⚠️⚠️ ON SONDE UNE COMÈTE ISOLÉE SUR FOND NOIR, jamais celle de la planche :
     trois comètes qui se chevauchent mesureraient la voisine. Même discipline
     que `craterProbe`. */
  const S2 = 420, R = 26;
  const ANG = Math.atan2(Math.sin(0.72), -Math.cos(0.72));
  const ux = Math.cos(ANG), uy = Math.sin(ANG);
  const probe = (opt) => {
    const s2 = makeCanvas(S2, S2), g2 = s2.ctx;
    g2.fillStyle = "#000"; g2.fillRect(0, 0, S2, S2);
    S.drawStarComet(g2, S2 / 2, S2 / 2, ANG, R, 2400, Object.assign({ q: 3 }, opt || {}));
    const d = s2.px;
    return {
      at: (x, y) => {
        if (x < 0 || y < 0 || x >= S2 || y >= S2) return [0, 0, 0];
        const i = ((y | 0) * S2 + (x | 0)) * 4;
        return [d[i], d[i + 1], d[i + 2]];
      },
      px: d,
    };
  };
  const P2 = probe();
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

  /* 1. LE CŒUR EST BLANC. Le modèle de Guillaume en fait le point le plus clair
        de toute l'image ; sans lui la tête est une bille bleue. */
  const heart = P2.at(S2 / 2 + ux * R * 0.18, S2 / 2 + uy * R * 0.18);
  ok(heart[0] > 240 && heart[1] > 240 && heart[2] > 240, "⚠️ le CŒUR est blanc pur",
     `rgb(${heart.join(",")})`);

  /* 2. LE CROISSANT D'OR EST À L'ARRIÈRE, ET SEULEMENT LÀ. C'est le point
        contre-intuitif du modèle, et le seul qui, peint à l'envers, donne une
        tête qui a l'air de reculer. On lit l'or par sa signature (R nettement
        au-dessus de B) sur deux arcs opposés. */
  const goldOn = (sign) => {
    let n = 0, tot = 0;
    for (let k = 0; k < 64; k++) {
      const a = k / 64 * Math.PI * 2;
      const c = Math.cos(a) * ux + Math.sin(a) * uy;
      if (sign * c < 0.55) continue;
      for (let rr = R * 0.95; rr <= R * 1.30; rr += 1) {
        const p = P2.at(S2 / 2 + Math.cos(a) * rr, S2 / 2 + Math.sin(a) * rr);
        tot++;
        if (p[0] > 150 && p[0] > p[2] + 60) n++;
      }
    }
    return tot ? n / tot : 0;
  };
  const back = goldOn(-1), front = goldOn(1);
  ok(back > 0.30, "⚠️⚠️ la gaine d'or est à l'ARRIÈRE (ce que montre le modèle)",
     `${(back * 100).toFixed(0)} % de l'arc arrière`);
  ok(back > front * 1.8, "…et elle n'est qu'un liseré à l'avant",
     `arrière ${(back * 100).toFixed(0)} %, avant ${(front * 100).toFixed(0)} %`);

  /* 3. LE HALO EST LARGE ET FAIBLE, JAMAIS PETIT ET VIF. C'est la règle déjà
        écrite pour la chaleur du cratère (446) : une lueur qui monte en valeur
        sans s'élargir se lit comme une lampe. Guillaume demande « un glow » ;
        c'est ce nombre-là qui dit s'il y en a un. */
  {
    let far = 0;
    for (let k = 0; k < 48; k++) {
      const a = k / 48 * Math.PI * 2;
      const c = Math.cos(a) * ux + Math.sin(a) * uy;
      if (c < 0.4) continue;                        // devant, là où la queue ne peut pas mentir
      const p = P2.at(S2 / 2 + Math.cos(a) * R * 2.9, S2 / 2 + Math.sin(a) * R * 2.9);
      if (lum(p) > 8) far++;
    }
    ok(far >= 8, "⚠️ le HALO déborde largement de la tête (≥ 2,9 rayons)", `${far} rayons sur 19`);
  }

  /* 4. LA QUEUE EST DERRIÈRE, ET ELLE EST LONGUE. Une comète dont la queue
        n'atteint pas plusieurs rayons est un point lumineux. */
  {
    let reach = 0;
    for (let d = R; d < R * 12; d += 2) {
      const p = P2.at(S2 / 2 - ux * d, S2 / 2 - uy * d);
      if (lum(p) > 10) reach = d;
    }
    ok(reach > R * 5, "⚠️ la QUEUE traîne loin derrière", `${(reach / R).toFixed(1)} rayons`);
    let ahead = 0;
    for (let d = R * 1.6; d < R * 12; d += 2) {
      const p = P2.at(S2 / 2 + ux * d, S2 / 2 + uy * d);
      if (lum(p) > 10) ahead = d;
    }
    ok(ahead < reach * 0.55, "⚠️⚠️ …et rien de comparable DEVANT (sinon elle recule)",
       `devant ${(ahead / R).toFixed(1)} rayons, derrière ${(reach / R).toFixed(1)}`);
  }

  /* 5. LA QUEUE EST FAITE DE MÈCHES INÉGALES, PAS D'UN DÉGRADÉ. C'est très
        exactement ce que le dessin du 445 ne faisait pas, et c'est la même leçon
        que la gerbe du cratère (446) : tirées uniformément, les mèches redonnent
        un cône. On mesure la variation de luminance TRAVERS la queue. */
  {
    const nx2 = -uy, ny2 = ux, vals = [];
    for (let j = -14; j <= 14; j++) {
      const x = S2 / 2 - ux * R * 4 + nx2 * j * 3, y = S2 / 2 - uy * R * 4 + ny2 * j * 3;
      vals.push(lum(P2.at(x, y)));
    }
    let flips = 0;
    for (let i = 2; i < vals.length; i++) {
      const d1 = vals[i - 1] - vals[i - 2], d2 = vals[i] - vals[i - 1];
      if (d1 * d2 < 0 && Math.abs(d2) > 3) flips++;
    }
    ok(flips >= 3, "⚠️⚠️ la queue a du GRAIN en travers (des mèches, pas un dégradé)",
       `${flips} inversions de pente`);
  }

  /* 6. LE CERNE FAIT LE TOUR — le contrôle n°4 de ce banc, appliqué à la seule
        famille qui émette vraiment de la lumière. Sur un ciel voilé de gris, une
        tête sans cerne se dissout. */
  {
    let dark = 255;
    for (let k = 0; k < 48; k++) {
      const a = k / 48 * Math.PI * 2;
      const c = Math.cos(a) * ux + Math.sin(a) * uy;
      if (c < 0.2) continue;                        // hors du croissant d'or
      let best = 255;
      for (let rr = R * 0.98; rr <= R * 1.14; rr += 0.5) best = Math.min(best, lum(P2.at(S2 / 2 + Math.cos(a) * rr, S2 / 2 + Math.sin(a) * rr)));
      dark = Math.min(dark, best);
    }
    ok(dark <= 60, "⚠️ le bord de la tête porte un ton sombre (le cerne)", `L ${dark.toFixed(0)}`);
  }

  /* 7. `fade` ÉTEINT VRAIMENT. La comète arrive de loin : si l'atténuation ne
        passe pas par l'alpha des couleurs, elle APPARAÎT au lieu d'arriver — et
        elle serait fausse au banc, dont le `restore()` ne rend pas
        `globalAlpha` (le stub menteur du §10). */
  {
    const ink = (P) => { let n = 0; for (let i = 0; i < P.px.length; i += 4) if (P.px[i] + P.px[i + 1] + P.px[i + 2] > 40) n++; return n; };
    const full = ink(P2), dim = ink(probe({ fade: 0.25 }));
    ok(dim < full * 0.75, "⚠️ `fade` atténue pour de bon", `${full} px → ${dim} px`);
    ok(dim > 0, "…sans tout effacer", `${dim} px`);
  }

  /* 8. L'IMPACT MONTE ET RETOMBE, il ne s'allume pas. ⚠️ On mesure l'ÉTALEMENT
        entre deux instants : un flash qui garde la même taille est un
        `fillRect` blanc, c'est-à-dire ce qu'on vient de remplacer. */
  {
    const spread = (k) => {
      const s3 = makeCanvas(S2, S2), g3 = s3.ctx;
      g3.fillStyle = "#000"; g3.fillRect(0, 0, S2, S2);
      S.drawStarImpactFlash(g3, S2 / 2, S2 / 2, k, 22, { q: 3 });
      const d = s3.px;
      let far = 0;
      for (let y = 0; y < S2; y++) for (let x = 0; x < S2; x++) {
        const i = (y * S2 + x) * 4;
        if (d[i] + d[i + 1] + d[i + 2] < 60) continue;
        far = Math.max(far, Math.hypot(x - S2 / 2, y - S2 / 2));
      }
      return far;
    };
    const s0 = spread(0.05), s1 = spread(0.55);
    ok(s1 > s0 * 1.5, "⚠️ la gerbe d'impact S'ÉTALE", `${s0.toFixed(0)} px → ${s1.toFixed(0)} px`);
  }
}

console.log(`\nPlanches : tools/out/etoile-planche.png · tools/out/etoile-cratere.png · tools/out/etoile-comete.png`);
console.log(fails === 0 ? `\n✅ tous les contrôles passés.\n` : `\n❌ ${fails} contrôle(s) en échec.\n`);
process.exit(fails ? 1 : 0);
