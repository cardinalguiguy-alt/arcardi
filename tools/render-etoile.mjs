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
/* ⚠️ `quete` EST DEMANDÉ DEPUIS LE 449 POUR UNE SEULE RAISON : la brûlure du
   cratère a une moitié GÉOMÉTRIE, qui se mesure ici, et une moitié CHRONOLOGIE,
   qui se mesure dans `verify-quete`. Sa règle vit dans `quete.js` ; ce banc
   l'APPELLE au lieu de recopier son seuil — sinon il jugerait sa propre maquette
   (troisième forme du défaut de banc, CLAUDE.md). */
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "quete"]);
const C = mods.fermeConstants, A = mods.fermeArt, Q = mods.quete;
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
  // 461 — mêmes pixels, deux palettes de petites étoiles apprivoisables.
  twice(S.starWispColors.blue[0][0], 236, 22);
  twice(S.starWispColors.rose[0][0], 264, 22);
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
  /* ⚠️ ZIP 454 — le sillon est une FONCTION maintenant : on l'appelle, on ne
     pioche plus un canevas cuit. C'est ce qui fait qu'il ne peut plus vieillir. */
  S.drawStarFurrow(g, 330, 66, 16, 0, 2200, { heat: 1 });
  S.drawStarFurrow(g, 330, 66 + H / 2, 16, 1, 2200, {});
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
   ║ ZIP 454 — LE SILLON DEVIENT UN DESSIN QU'ON PEUT MESURER.
   ╚═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ IL ÉTAIT DÉJÀ SUR LA PLANCHE, ET ÇA N'A JAMAIS SUFFI. Deux contrôles le
   regardaient (le bord du haut, « les deux états sont le même sillon ») et aucun
   ne mesurait ce qu'un impact doit avoir : du RELIEF. Il n'en avait aucun — une
   bande de terre à plat, peinte en 2022, à côté d'un cratère qui prenait sept
   contrôles. *Un dessin qu'aucun banc ne juge ne se dégrade pas : il reste au
   niveau du jour où il a été écrit* (§ piège n°1, deuxième visage), et c'est
   Guillaume qui l'a vu à l'écran, comme les six fois précédentes.
   ⚠️ ON LE CUIT DANS UN CANEVAS À FOND TRANSPARENT pour garder les contrôles de
   silhouette qui existaient (ils sont bons), et on en ajoute trois qui mesurent
   la seule chose qui a changé : la pente, la profondeur, et l'accord entre ce
   qu'on voit et ce que les pieds sentent. */
function furrowProbe(phase, heat) {
  const T = 16, W = 340, H = 220;
  const sur = makeCanvas(W, H);
  S.drawStarFurrow(sur.ctx, W / 2, H / 2, T, phase, 2200, { heat: heat === undefined ? 1 : heat });
  return sur;
}
const FURROW_HOT = furrowProbe(0, 1), FURROW_COLD = furrowProbe(1, 0);

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
  const W = 900, H = 620;
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
  /* 462 — les fragments de ferme, volontairement montrés à côté de la grosse
     tête : la planche doit rendre leur différence jugeable d'un regard. */
  for (let i = 0; i < 4; i++)
    S.drawStarFragmentMeteor(g, 690 + i * 55, 285 + (i & 1) * 25, 0.72, 7 + i, 1800 + i * 90, { q: 1 });
  /* 463 — le choc des fragments a sa propre ligne de temps. La planche doit
     montrer en même temps le contact, l'éjection, la colonne et la retombée :
     une seule capture prise au hasard pourrait flatter un flash d'une image. */
  const ages = [55, 260, 570, 980];
  for (let i = 0; i < ages.length; i++)
    S.drawStarFragmentImpact(g, 135 + i * 210, 550, ages[i], 13, { q: 3 });
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
  for (const color of ["blue", "rose"]) all.push(["wisp " + color, S.starWispColors[color][0][0]]);
  for (let n = 0; n < 4; n++) all.push(["shard " + n, S.starShard[n]]);
  for (let p = 0; p < 3; p++) all.push(["magpie " + p, S.magpie[p]]);
  all.push(["kiln", S.starKiln], ["rack", S.starRack], ["shutter", S.starShutter],
           ["nestTree", S.starNestTree], ["furrow chaud", FURROW_HOT], ["furrow froid", FURROW_COLD],
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
                            ["l'arbre au nid", S.starNestTree], ["le sillon chaud", FURROW_HOT],
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
  const a = silhouette(FURROW_HOT), b = silhouette(FURROW_COLD);
  let same = 0, any = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] || b[i]) any++; if (a[i] && b[i]) same++; }
  const r = same / any;
  ok(r > 0.62, "⚠️ le sillon chaud et le sillon refermé sont le MÊME sillon",
     `${(r * 100).toFixed(0)} % de recouvrement`);
  /* ⚠️⚠️ ZIP 454 — CE SECOND CONTRÔLE A CHANGÉ DE GRANDEUR, ET LE BANC L'A EXIGÉ.
     Il lisait « les deux silhouettes ne sont pas identiques », ce qui était vrai
     tant que les deux états étaient deux canevas peints séparément : le sillon
     refermé était un peu plus court, et cet écart-là servait de preuve qu'il
     s'était passé quelque chose. Depuis que les deux états sortent du MÊME champ
     de hauteur (c'est tout l'intérêt : la balafre ne change pas de forme en se
     refermant, l'herbe repousse dedans), la silhouette est identique par
     construction et le contrôle est passé au rouge à 100 %.
     ⚠️ Il n'a pas trouvé de défaut : il mesurait une différence qui a cessé
     d'exister. Ce qui change VRAIMENT entre les deux états est la COULEUR — terre
     brune contre herbe verte — et c'est donc elle qu'on mesure. Un état refermé
     qui ressemblerait au frais serait un vrai défaut, et celui-là, on le verrait. */
  {
    const mean = (cv) => { const d = px(cv); let r = 0, g2 = 0, b = 0, n = 0;
      for (let i = 0; i < cv.width * cv.height; i++)
        if (d[i * 4 + 3] > 200) { r += d[i * 4]; g2 += d[i * 4 + 1]; b += d[i * 4 + 2]; n++; }
      return n ? [r / n, g2 / n, b / n] : [0, 0, 0]; };
    const A = mean(FURROW_HOT), B = mean(FURROW_COLD);
    /* La terre est plus rouge que verte, l'herbe l'inverse : c'est le seul écart
       qui survit à un changement d'éclairage. */
    ok(A[0] > A[1] && B[1] > B[0], "…et le frais est de la TERRE quand le refermé est de l'HERBE",
       `chaud R${A[0].toFixed(0)}/V${A[1].toFixed(0)} · froid R${B[0].toFixed(0)}/V${B[1].toFixed(0)}`);
  }
}

/* ╔═══════════════════════════════════════════════════════════════════════════
   ║ 5 bis. ZIP 454 — LE SILLON A-T-IL VRAIMENT UNE PHYSIQUE ?
   ╚═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ C'EST LA DEMANDE DE GUILLAUME MOT POUR MOT (« que l'impact ait une vraie
   physique, un peu comme le cratère »), et elle se mesure — sans quoi on aurait
   simplement REDESSINÉ une bande de terre en croyant l'avoir creusée. Trois
   grandeurs, et chacune répond à une phrase de la demande.
   ⚠️ LA PREMIÈRE EST CELLE DU §8 DE `CLAUDE.md` : ce qui manque à une image plate
   n'est pas une moyenne, c'est un ÉCART. Une bande de terre uniforme et une
   balafre creusée ont la même couleur moyenne ; seul l'écart-type les sépare. */
console.log("\n5 bis. LE SILLON A UNE PHYSIQUE (454)\n");
{
  const dev = (cv) => { const d = px(cv); const v = [];
    for (let i = 0; i < cv.width * cv.height; i++)
      if (d[i * 4 + 3] > 200) v.push(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
    const m = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
    return Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, v.length)); };
  const sd = dev(FURROW_HOT);
  ok(sd > 18, "⚠️⚠️ la terre est ÉCLAIRÉE, pas coloriée (écart-type de luminance)",
     `écart-type ${sd.toFixed(1)} (le plat d'avant tournait autour de 8)`);

  /* ⚠️ LA COURSE A UN SENS, ET C'EST LA MOITIÉ DE L'HISTOIRE : elle entre par
     l'est, se creuse, et s'arrête à l'ouest. On mesure donc la LARGEUR peinte aux
     deux bouts. Un sillon symétrique se lirait comme une tranchée qu'on a
     creusée, pas comme quelque chose qui est tombé. */
  {
    const d = px(FURROW_HOT), W = FURROW_HOT.width, H = FURROW_HOT.height;
    const colH = (x) => { let n = 0; for (let y = 0; y < H; y++) if (d[(y * W + x) * 4 + 3] > 200) n++; return n; };
    /* Le centre du canevas est l'ANCRE ; la cuvette est à `BOWL_DX` cases à
       l'ouest, l'entrée à `LEN/2` cases à l'est. On lit là où le dessin est,
       jamais à des pixels choisis à l'œil. */
    const T = 16, cx = W / 2;
    const east = colH(Math.round(cx + (C.STAR_FURROW_LEN / 2 - 0.8) * T));
    const bowl = colH(Math.round(cx + C.STAR_FURROW_BOWL_DX * T));
    ok(bowl > east * 1.8, "⚠️ elle s'élargit d'est en ouest : c'est une COURSE, pas une tranchée",
       `entrée ${east} px de haut, cuvette ${bowl} px`);
  }

  /* ⚠️⚠️ ET L'ENFONCEMENT LIT LE MÊME CHAMP QUE LE DESSIN — c'est le contrôle qui
     protège du pire défaut possible ici : « il s'enfonce à côté du sillon »,
     invisible en relecture et criant à l'écran. On balaie la balafre entière et on
     vérifie que là où ça descend, c'est peint, et que le point le plus profond est
     bien la cuvette. */
  {
    const T = 16;
    let outside = 0, inked = 0, deepest = null, maxSink = 0;
    const d = px(FURROW_HOT), W = FURROW_HOT.width, H = FURROW_HOT.height;
    for (let dy = -60; dy <= 60; dy++) for (let dx = -140; dx <= 90; dx++) {
      /* ⚠️⚠️ LE SEUIL N'EST PAS UNE COMPLAISANCE, C'EST LA BORDURE TRAMÉE. Le bord
         de la terre s'effiloche en trame de Bayer (446 : une terre semi-transparente
         sur de l'herbe donne du brouillard), donc la toute dernière frange est
         volontairement AJOURÉE — un pixel sur deux y manque, et l'enfoncement, lui,
         est continu. Comparer les deux dans cette frange, c'est reprocher au dessin
         d'avoir fait exactement ce qu'on lui a demandé. On mesure donc l'accord là
         où le sillon est un sillon (un quart de sa profondeur), et le contrôle
         suivant tient la frange à sa place. */
      const sink = S.starFurrowSink(dx / T, dy / T, T);
      if (sink <= C.STAR_FURROW_SINK_PX * 0.25) continue;
      inked++;
      const x = Math.round(W / 2 + dx), y = Math.round(H / 2 + dy);
      if (x < 0 || y < 0 || x >= W || y >= H || d[(y * W + x) * 4 + 3] <= 200) outside++;
      if (sink > maxSink) { maxSink = sink; deepest = dx / T; }
    }
    ok(inked > 500 && outside === 0, "⚠️⚠️ on ne s'enfonce QUE là où la terre est peinte",
       `${inked} points d'enfoncement, ${outside} hors du dessin`);
    /* ⚠️ ET LA FRANGE AJOURÉE RESTE UNE FRANGE : si elle s'épaississait, le
       contrôle du dessus deviendrait complaisant sans que personne ne s'en
       aperçoive — c'est comme ça qu'un banc cesse de mesurer quelque chose. */
    {
      let frange = 0, frangeOut = 0;
      for (let dy = -60; dy <= 60; dy++) for (let dx = -140; dx <= 90; dx++) {
        const sk = S.starFurrowSink(dx / T, dy / T, T);
        if (sk <= 0.2 || sk > C.STAR_FURROW_SINK_PX * 0.25) continue;
        frange++;
        const x = Math.round(W / 2 + dx), y = Math.round(H / 2 + dy);
        if (x < 0 || y < 0 || x >= W || y >= H || d[(y * W + x) * 4 + 3] <= 200) frangeOut++;
      }
      ok(frangeOut < frange * 0.5, "…et la frange ajourée reste minoritaire, même dans la frange",
         `${frangeOut} px ajourés sur ${frange} points de bordure`);
    }
    ok(deepest !== null && Math.abs(deepest - C.STAR_FURROW_BOWL_DX) < 0.6,
       "…et le point le plus profond est la cuvette d'arrêt",
       `plus profond à ${deepest === null ? "?" : deepest.toFixed(2)} cases (cuvette ${C.STAR_FURROW_BOWL_DX})`);
    ok(Math.abs(maxSink - C.STAR_FURROW_SINK_PX) < 1.2, "…et il descend de ce qui est annoncé",
       `${maxSink.toFixed(1)} px pour ${C.STAR_FURROW_SINK_PX} annoncés`);
    /* ⚠️ LE BOURRELET SE MONTE, IL NE SE DESCEND PAS : signe opposé, et c'est ce
       qui fait qu'on l'ENJAMBE. Sans ce contrôle, une erreur de signe donnerait un
       fermier qui plonge en marchant sur la terre projetée. */
    let lipUp = 0;
    for (let dx = -140; dx <= 90; dx++) for (let dy = -60; dy <= 60; dy++)
      if (S.starFurrowSink(dx / T, dy / T, T) < -0.2) lipUp++;
    ok(lipUp > 100, "⚠️ …et le bourrelet, lui, se monte", `${lipUp} points au-dessus du sol`);
  }

  /* ⚠️ ET LE CANEVAS CUIT EST ASSEZ GRAND : rien ne touche son bord. C'est le
     piège n°1 des sprites mesuré sur les QUATRE bords (ici on a le droit, ce
     dessin ne se raccorde à rien) — un canevas trop juste rabote en silence. */
  {
    const d = px(FURROW_HOT), W = FURROW_HOT.width, H = FURROW_HOT.height;
    let edge = 0;
    for (let x = 0; x < W; x++) { if (d[(x) * 4 + 3] > 8) edge++; if (d[((H - 1) * W + x) * 4 + 3] > 8) edge++; }
    for (let y = 0; y < H; y++) { if (d[(y * W) * 4 + 3] > 8) edge++; if (d[(y * W + W - 1) * 4 + 3] > 8) edge++; }
    ok(edge === 0, "⚠️ le sillon ne touche aucun bord de sa toile", `${edge} px sur le cadre`);
  }
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

  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 459 — ON PERD PIED, ON DÉVALE, ON S'AGRIPPE : LE MOTEUR EST *JOUÉ* ICI.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ CE BLOC NE MESURE PLUS DES FORMULES, IL SIMULE UNE PARTIE. Le 458
     vérifiait une inégalité (« marche en montée − glissade ≥ 1 case/s ») ; c'était
     un raccourci algébrique vers la vraie question, et la vraie question est
     celle que le §25 de `ferme/README.md` reproche à tous les bancs du dépôt de ne
     jamais poser : **est-ce qu'on ARRIVE ?** Ici on la pose en dur — on prend
     `starSlipStep`, on lui donne le VRAI creux (`starCraterSink`), on tient une
     direction à 60 images par seconde, et on regarde si le fermier sort du trou.
     ⚠️⚠️ ET ELLE A PAYÉ AVANT MÊME D'ÊTRE ÉCRITE EN BANC : le premier jet du
     moteur gageait le compteur d'effort sur « est-ce que je monte ? ». En dévalant
     on dépasse le point bas de quelques centimètres, la pente s'inverse sous les
     pieds, le compteur repartait de zéro — **219 points de départ sur 317 ne
     pouvaient plus sortir du cratère**, et aucune relecture ne l'aurait vu. C'est
     la leçon du 449 (« quand on peut énoncer une propriété, on la BALAIE ») portée
     à un cran de plus : quand on peut JOUER une propriété, on la joue.
     ⚠️ LE MOTEUR EST PUR EXPRÈS (aucun React, aucun canevas) : c'est ce qui rend
     cette simulation possible. Un état de glissade écrit dans la closure de la
     boucle de rendu aurait été le piège n°1 du projet, dans sa version « il fait
     vieillir ». */
  {
    const sink = (a, b) => S.starCraterSink(a, b, 16);
    /* Le pas de jeu, tel que `updateMeTown` l'applique : la machine décide, on
       marche OU on dévale. ⚠️ CETTE BOUCLE EST LA SEULE COPIE DU JEU DANS CE
       FICHIER, et elle tient en huit lignes — au-delà, on jugerait sa propre
       maquette (troisième forme du défaut de banc, CLAUDE.md). */
    function play(x0, y0, dirf, maxS) {
      /* ⚠️ « DEDANS » SE LIT DÈS LA POSITION DE DÉPART. Écrit `false` puis mis à
         jour après le premier pas, il ratait les départs posés SUR la lèvre : un
         seul pas vers l'extérieur et le harnais n'avait jamais rien vu, donc il
         déclarait « bloqué » quelqu'un qui venait de sortir en une image. Trois
         faux échecs sur 317, tous à 4,2 cases du centre. */
      let x = x0, y = y0, st = Q.starSlipNew(), t = 0, vpk = 0, slid = 0, inside = sink(x0, y0) > 0;
      const dt = 1 / 60;
      while (t < maxS) {
        const g = Q.starCraterSlope(sink, x, y), sk = sink(x, y);
        const [ix, iy] = dirf(x, y, st, t);
        Q.starSlipStep(st, g, sk, ix, iy, dt, true);
        let vx = st.vx, vy = st.vy;
        const slipping = st.mode === "slide" || st.mode === "recover" || st.mode === "climb";
        if (!slipping) {
          const im = Math.hypot(ix, iy);
          if (im > 0.01) {
            const inv = g.n > 0.001 ? 1 / g.n : 0;
            const dot = (ix / im) * g.gx * inv + (iy / im) * g.gy * inv;
            const sp = C.PLAYER_SPEED * Q.starClimbMul(g.n, dot);
            vx = (ix / im) * sp; vy = (iy / im) * sp;
          } else { vx = 0; vy = 0; }
        }
        if (st.mode === "slide") { vpk = Math.max(vpk, Math.hypot(vx, vy)); slid += Math.hypot(vx, vy) * dt; }
        x += vx * dt; y += vy * dt; t += dt;
        /* ⚠️ « SORTI » VEUT DIRE « ENTRÉ PUIS RESSORTI ». Le premier jet coupait
           dès que l'enfoncement était nul et qu'on tenait debout — c'est-à-dire à
           la PREMIÈRE image des essais qui partent du sentier, hors de la cuvette.
           Deux contrôles sortaient alors « crête 0,00 case/s » sur un moteur qui
           marchait très bien : le banc mesurait une partie qui n'avait pas
           commencé. C'est la sixième forme du défaut de banc (une grandeur juste
           sur un intervalle que le joueur ne regarde pas), en version harnais. */
        if (sink(x, y) > 0) inside = true;
        if (inside && sink(x, y) <= 0 && st.mode === "foot") break;
      }
      return { x, y, t, st, vpk, slid, out: inside && sink(x, y) <= 0 };
    }

    /* ── 1. LE PLANCHER. « Ensuite il peut se déplacer sur ses pieds dans le
       cratère » — c'est une DEMANDE, donc c'est une mesure. Le fond marchable est
       l'endroit où la pente reste sous le seuil de perte d'appui ; s'il se réduit à
       un point, la phrase est morte et la mécanique du chapitre 2 avec elle (on ne
       peut pas se tenir immobile là où l'on glisse). */
    let floorMin = 99, floorMax = 0, bowlMin = 99;
    for (let ai = 0; ai < 48; ai++) {
      const a = ai / 48 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      let fr = 99, br = 0;
      for (let r = 0.05; r <= 8; r += 0.05) {
        if (fr === 99 && Q.starCraterSlope(sink, ca * r, sa * r).n >= Q.STAR_SLIP_N) fr = r;
        if (sink(ca * r, sa * r) > 0) br = r;
      }
      floorMin = Math.min(floorMin, fr); floorMax = Math.max(floorMax, fr); bowlMin = Math.min(bowlMin, br);
    }
    ok(floorMin >= Q.STAR_SLIP_FLOOR_MIN,
       "⚠️⚠️ LE FOND SE MARCHE VRAIMENT (« il peut se déplacer sur ses pieds »)",
       `plancher de ${floorMin.toFixed(2)} à ${floorMax.toFixed(2)} case (plancher mini ${Q.STAR_SLIP_FLOOR_MIN})`);
    ok(floorMax < bowlMin * 0.85,
       "…et la paroi reste une PAROI (le plancher ne mange pas la cuvette)",
       `plancher ${floorMax.toFixed(2)} contre cuvette ${bowlMin.toFixed(2)}`);

    /* ── 2. L'ARRIVÉE. ⚠️⚠️ LE CONTRÔLE LE PLUS IMPORTANT DU FICHIER. */
    let stuck = 0, tested = 0, worstT = 0, worstAt = null;
    for (let ai = 0; ai < 24; ai++) {
      const a = ai / 24 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      for (let r = 0.3; r <= 4.4; r += 0.3) {
        if (sink(ca * r, sa * r) <= 0) continue;
        tested++;
        const o = play(ca * r, sa * r, () => [ca, sa], 40);
        if (!o.out) stuck++;
        else if (o.t > worstT) { worstT = o.t; worstAt = r; }
      }
    }
    ok(tested > 250, "⚠️ la sortie est JOUÉE depuis toute la cuvette, pas depuis trois points", `${tested} départs`);
    ok(stuck === 0,
       "⚠️⚠️⚠️ EN TENANT UNE DIRECTION, ON SORT DU TROU — DEPUIS PARTOUT",
       `${stuck} bloqué(s) sur ${tested}, pire cas ${worstT.toFixed(1)} s à ${worstAt === null ? "?" : worstAt.toFixed(1)} case du centre`);
    /* ⚠️ ET IL ÉCHOUE DANS LES DEUX SENS (leçon du 444) : une sortie instantanée
       voudrait dire qu'on ne glisse pas, et la demande était « sensation d'effort
       renforcée ». Trois secondes de maintien + la remontée : moins de deux
       secondes serait un trou décoratif, plus de douze une corvée. */
    ok(worstT > 2 && worstT < 12, "…et elle COÛTE, sans devenir une corvée",
       `pire cas ${worstT.toFixed(1)} s`);

    /* ── 3. LA GLISSADE ELLE-MÊME. On entre en marchant, exactement comme un
       joueur qui arrive du sentier — puis on lâche tout. */
    let slideT = 0, slidePk = 0, endR = 0, n3 = 0;
    for (let ai = 0; ai < 8; ai++) {
      const a = ai / 8 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const o = play(ca * 5.2, sa * 5.2, (x, y, st, t) => (t < 0.9 ? [-ca, -sa] : [0, 0]), 12);
      slideT += o.t; slidePk = Math.max(slidePk, o.vpk); endR = Math.max(endR, Math.hypot(o.x, o.y)); n3++;
    }
    ok(slidePk > 2.2, "⚠️⚠️ ÇA DÉVALE VRAIMENT (« glissade un peu rapide »)", `crête ${slidePk.toFixed(2)} cases/s`);
    ok(slidePk < C.PLAYER_SPEED, "…et jamais plus vite que la marche (on glisse, on n'est pas éjecté)",
       `${(slidePk / C.PLAYER_SPEED * 100).toFixed(0)} % de la marche`);
    ok(slidePk <= Q.STAR_SLIP_VMAX + 0.01, "…sous sa borne dure", `${slidePk.toFixed(2)} ≤ ${Q.STAR_SLIP_VMAX}`);
    ok(endR < floorMax + 0.6,
       "⚠️⚠️ ON FINIT AU FOND, DEBOUT — « avant d'atteindre le fond » a une fin",
       `au plus loin ${endR.toFixed(2)} case du centre, plancher ${floorMax.toFixed(2)}`);

    /* ── 4. « DIFFICILE À CONTRÔLER » — ET C'EST UN INTERVALLE, PAS UN SEUIL.
       On mesure la même chute avec et sans ordre latéral. Trop peu de déviation :
       le joueur appuie sans effet, donc il croit le jeu bloqué (456). Trop :
       ce n'est plus une glissade, c'est une marche rapide. */
    const epis = (dirf) => {
      let x = 0, y = -3.4, st = Q.starSlipNew(), t = 0, on = false;
      const dt = 1 / 60;
      while (t < 10) {
        const g = Q.starCraterSlope(sink, x, y), sk = sink(x, y);
        const [ix, iy] = dirf(t);
        Q.starSlipStep(st, g, sk, ix, iy, dt, true);
        let vx = st.vx, vy = st.vy;
        if (st.mode === "foot" || st.mode === "brace") {
          const im = Math.hypot(ix, iy);
          if (im > 0.01) {
            const inv = g.n > 0.001 ? 1 / g.n : 0;
            const dot = (ix / im) * g.gx * inv + (iy / im) * g.gy * inv;
            const sp = C.PLAYER_SPEED * Q.starClimbMul(g.n, dot);
            vx = (ix / im) * sp; vy = (iy / im) * sp;
          } else { vx = 0; vy = 0; }
        }
        if (st.mode === "slide") on = true; else if (on) return { x, y, t };
        x += vx * dt; y += vy * dt; t += dt;
      }
      return { x, y, t };
    };
    const free = epis(t => (t < 0.2 ? [0, 1] : [0, 0]));
    const side = epis(t => (t < 0.2 ? [0, 1] : [1, 0]));
    const brake = epis(t => (t < 0.2 ? [0, 1] : [0, -1]));
    const dev = Math.abs(side.x - free.x), held = free.y - brake.y;
    ok(dev > 0.35, "⚠️ on peut VISER un côté du fond (sinon les touches ne répondent pas)", `${dev.toFixed(2)} case de déviation`);
    ok(dev < 2.0, "⚠️⚠️ …mais on ne PILOTE pas (« trajectoire difficile à contrôler »)", `${dev.toFixed(2)} case`);
    ok(held < 0.8, "⚠️⚠️ ET ON NE FREINE PAS : pousser à contresens ne retient presque rien",
       `${held.toFixed(2)} case gagnée vers le haut`);

    /* ── 5. LA GRIMPE. Cramponné veut dire : la pente n'entre pas. */
    {
      const st = Q.starSlipNew();
      st.mode = "climb"; st.hold = Q.STAR_CLIMB_HOLD_MS; st.hx = 0; st.hy = -1;
      let vmin = 99, vmax = 0;
      for (let ai = 0; ai < 24; ai++) {
        const a = ai / 24 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        for (let r = 0.5; r <= 4.4; r += 0.2) {
          const x = ca * r, y = sa * r; if (sink(x, y) <= 0) continue;
          st.mode = "climb"; st.idle = 0; st.hold = Q.STAR_CLIMB_HOLD_MS;
          Q.starSlipStep(st, Q.starCraterSlope(sink, x, y), sink(x, y), 0, -1, 1 / 60, true);
          const v = Math.hypot(st.vx, st.vy);
          vmin = Math.min(vmin, v); vmax = Math.max(vmax, v);
        }
      }
      ok(Math.abs(vmax - vmin) < 0.001 && Math.abs(vmax - Q.STAR_CLIMB_SPEED) < 0.001,
         "⚠️⚠️ CRAMPONNÉ, LA PENTE N'ENTRE PLUS : même vitesse partout dans le trou",
         `${vmin.toFixed(2)} à ${vmax.toFixed(2)} case/s (visé ${Q.STAR_CLIMB_SPEED})`);
      // …et lâcher décroche (réponse de Guillaume : « lâcher la touche = rechute »).
      const st2 = Q.starSlipNew(); st2.mode = "climb"; st2.hx = 0; st2.hy = -1; st2.hold = Q.STAR_CLIMB_HOLD_MS;
      const g5 = Q.starCraterSlope(sink, 0, -3.0);
      for (let i = 0; i < 20; i++) Q.starSlipStep(st2, g5, sink(0, -3.0), 0, 0, 1 / 60, true);
      ok(st2.mode === "slide", "⚠️ …et lâcher la direction DÉCROCHE", `mode « ${st2.mode} » après 0,33 s sans touche`);
    }

    /* ── 6. CE QUE VOIT L'AUTRE JOUEUR. ⚠️ `starSlipSeen` est une DÉDUCTION (§3 de
       CLAUDE.md : aucun champ de plus sur le réseau) ; si elle se trompe, deux
       clients dessinent deux fermiers différents au même endroit. On la confronte
       donc au moteur, image par image, sur une descente et sur une remontée. */
    {
      let agree = 0, seen = 0;
      let x = 0, y = -4.0, st = Q.starSlipNew(), t = 0;
      const dt = 1 / 60;
      while (t < 14) {
        const g = Q.starCraterSlope(sink, x, y), sk = sink(x, y);
        const [ix, iy] = t < 2 ? [0, 1] : [0, -1];          // on descend, puis on veut ressortir
        Q.starSlipStep(st, g, sk, ix, iy, dt, true);
        let vx = st.vx, vy = st.vy;
        const slipping = st.mode === "slide" || st.mode === "recover" || st.mode === "climb";
        if (!slipping) {
          const inv = g.n > 0.001 ? 1 / g.n : 0;
          const dot = ix * g.gx * inv + iy * g.gy * inv;
          const sp = C.PLAYER_SPEED * Q.starClimbMul(g.n, dot);
          vx = ix * sp; vy = iy * sp;
        }
        const mine = Q.starSlipPose(st, true, g.n), his = Q.starSlipSeen(g, sk, vx, vy);
        /* ⚠️⚠️ ON MESURE L'ACCORD LÀ OÙ LE JOUEUR REGARDE, et on dit lequel : sur
           les images où ça VA VITE (plus d'une case et demie par seconde) ou où
           l'on grimpe. Le reste est la queue de la glissade — le fermier finit de
           s'immobiliser au fond, à trente centimètres près et pendant deux
           dixièmes de seconde, et « il dérape encore » ou « il est debout » y sont
           littéralement indiscernables de l'extérieur. Exiger l'accord là aussi
           demanderait de la MÉMOIRE chez celui qui regarde, donc un état par
           joueur distant, donc quelque chose qui dérive au premier paquet perdu.
           *On préfère un désaccord nommé à un état à réconcilier.* */
        if (mine && (Math.hypot(vx, vy) > 1.5 || st.mode === "climb")) { seen++; if (mine === his) agree++; }
        x += vx * dt; y += vy * dt; t += dt;
        if (sk <= 0 && st.mode === "foot" && t > 3) break;
      }
      ok(seen > 120, "⚠️ la déduction est confrontée au moteur sur toute une descente-remontée", `${seen} images vives`);
      ok(agree === seen,
         "⚠️⚠️ CE QUE L'AUTRE CLIENT DÉDUIT EST EXACTEMENT CE QUE LE MOTEUR FAIT",
         `${agree}/${seen} images (glissade rapide et grimpe)`);
    }
  }

  /* ── LA POUSSIÈRE (458). ⚠️ ELLE EST REGARDABLE DÈS LE JOUR DE SON ÉCRITURE,
     et c'est la leçon du 455 appliquée à l'endroit : un effet né dans la closure
     de la boucle n'aurait eu aucun banc, donc il aurait vieilli. */
  {
    const sur = makeCanvas(120, 120), g4 = sur.ctx;
    const count = (k) => {
      g4.clearRect(0, 0, 120, 120);
      S.drawStarDust(g4, 60, 60, 16, k, 7);
      let n = 0; for (let i = 3; i < sur.px.length; i += 4) if (sur.px[i] > 8) n++;
      return n;
    };
    const a0 = count(0.15), a1 = count(0.55), a2 = count(0.99), a3 = count(1);
    /* ⚠️⚠️ ZIP 459 — CE SEUIL DESCEND DE 40 À 28, ET C'EST LA DÉCISION QUI A
       CHANGÉ, PAS LA MESURE (leçon du 456 : *un seuil de banc n'est pas une
       vérité, c'est la décision du jour où on l'a écrit*). Guillaume, en jouant :
       « la poussière doit être autour des pieds, pas de la tête aussi. » Une
       bouffée qui reste sous le genou est forcément plus petite qu'une bouffée qui
       montait jusqu'au crâne ; garder l'ancien seuil aurait REFUSÉ la correction
       demandée. Ce qui ne bouge pas, c'est qu'elle doit se VOIR. */
    ok(a0 > 28, "⚠️ une bouffée neuve se voit", `${a0} px`);
    ok(a1 > a0, "⚠️⚠️ elle S'OUVRE (une bouffée qui ne grandit pas est une tache)", `${a0} → ${a1} px`);
    ok(a3 === 0, "⚠️ et à un, elle a totalement disparu", `${a2} px à 0,99 · ${a3} px à 1`);
    /* ⚠️ LES DEUX TONS DEMANDÉS SE VOIENT, ET C'EST LE MOT MÊME DE LA DEMANDE :
       « poussière marron / grise ». Un seul ton passerait tous les contrôles
       ci-dessus. */
    /* ⚠️⚠️ LA TEINTE SE LIT SUR LA COULEUR DÉMULTIPLIÉE, PAS SUR LE TAMPON — ET
       CE CORRECTIF DU 459 EST EXACTEMENT « UN BANC DE RENDU SE VÉRIFIE AUSSI »
       (455, la sonde de la bulle). Le faux canevas compose sur du NOIR
       transparent : une bouffée à 34 % d'opacité y sort à 52 de rouge, pas 152.
       Le contrôle passait quand même parce que huit bouffées empilées finissaient
       par saturer — c'est-à-dire qu'il mesurait un EMPILEMENT et pas une palette,
       et qu'il serait passé au vert sur deux tons faux. On divise donc par l'alpha
       avant de juger, et chaque graine est comptée seule. */
    let brown = 0, grey = 0;
    for (let sd = 0; sd < 8; sd++) {
      g4.clearRect(0, 0, 120, 120);
      S.drawStarDust(g4, 60, 60, 16, 0.5, sd);
      for (let i = 0; i < sur.px.length; i += 4) {
        const al = sur.px[i + 3] / 255;
        if (al < 0.03) continue;
        const r = sur.px[i] / al, gg = sur.px[i + 1] / al, b = sur.px[i + 2] / al;
        if (r > gg + 6 && gg > b + 6) brown++;
        else if (Math.abs(r - b) <= 12 && r > 90) grey++;
      }
    }
    ok(brown > 20 && grey > 20, "⚠️⚠️ il y a du MARRON et du GRIS, pas un ton unique",
       `${brown} px marron · ${grey} px gris`);
    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ZIP 459 — ET ELLE RESTE SOUS LE GENOU. Retour de Guillaume, en jouant.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ CE CONTRÔLE EST LE SEUL QUI AURAIT ATTRAPÉ LE DÉFAUT, ET IL N'EXISTAIT
       PAS : les cinq contrôles ci-dessus mesurent la VIE d'une bouffée (elle
       s'ouvre, elle s'éteint, elle a deux tons) et pas un seul ne mesurait OÙ elle
       est. C'est mot pour mot la cinquième forme du défaut de banc du 458 — *il
       mesure ce qu'une chose EST et jamais QUAND (ou ici : OÙ) elle est.*
       ⚠️ LA BORNE EST DÉRIVÉE DU SPRITE : l'appelant passe l'ancre du personnage,
       ses semelles sont quatorze pixels plus bas, son genou quatre pixels au-dessus
       des semelles. Rien au-dessus de l'ancre + 8, donc rien au-dessus du genou —
       et surtout rien près de la tête, qui est à l'ancre − 8. */
    {
      let top = 999, bot = -999;
      for (const k of [0.1, 0.3, 0.6, 0.85]) {
        g4.clearRect(0, 0, 120, 120);
        for (let sd = 0; sd < 6; sd++) S.drawStarDust(g4, 60, 60, 16, k, sd);
        for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++)
          if (sur.px[(y * 120 + x) * 4 + 3] > 8) { if (y - 60 < top) top = y - 60; if (y - 60 > bot) bot = y - 60; }
      }
      ok(top >= 6, "⚠️⚠️⚠️ LA POUSSIÈRE EST AUX PIEDS : rien ne monte au-dessus du genou",
         `plus haut grain à ${top} px sous l'ancre (semelles à +14, tête à −8)`);
      ok(bot >= 14, "…et elle touche bien le sol", `plus bas grain à ${bot} px`);
    }
  }

  /* ── ZIP 449 — OÙ ÇA BRÛLE, EN CASES. La moitié GÉOMÉTRIE de la brûlure (la
     moitié CHRONOLOGIE est dans `verify-quete`, qui balaie le temps).
     ⚠️⚠️ CE BLOC MESURE UNE DÉCISION DE GUILLAUME — « seulement le fond du trou »
     — ET C'EST LA SEULE FAÇON DE SAVOIR QU'ELLE EST TENUE. `STAR_BURN_DEPTH_K`
     est une fraction de PROFONDEUR ; ce qu'elle vaut en CASES ne se lit nulle
     part, il faut le sonder. Le jour où `craterHoleK` ou `STAR_CRATER_SINK_PX`
     bouge, ce rayon bouge sans que personne n'ait touché à la brûlure.
     ⚠️ ET IL ÉCHOUE DANS LES DEUX SENS (leçon du 444) : une brûlure qui déborde
     du trou punirait un passant, une brûlure trop petite ne se rencontrerait
     jamais — les deux sont des mécaniques mortes, pas des réglages. */
  {
    let rb = 0, rbMin = 99, rh = 0;
    for (let ai = 0; ai < 64; ai++) {
      const a = ai / 64 * Math.PI * 2;
      let lastBurn = 0;
      for (let r = 0; r <= C.STAR_CRATER_DRAW_R + 0.5; r += 0.01) {
        const k = S.starCraterSink(Math.cos(a) * r, Math.sin(a) * r * 0.86, 16) / C.STAR_CRATER_SINK_PX;
        if (k >= Q.STAR_BURN_DEPTH_K) lastBurn = r;
        if (k > 0) rh = Math.max(rh, r);
      }
      rb = Math.max(rb, lastBurn); rbMin = Math.min(rbMin, lastBurn);
    }
    ok(rb < rh, "⚠️⚠️ ce qui BRÛLE est strictement dans le trou (la pente se franchit)",
       `brûlure ${rb.toFixed(2)} cases, trou ${rh.toFixed(2)} cases`);
    ok(rb < C.STAR_CRATER_DRAW_R * 0.6, "…et loin du bourrelet, qu'on enjambe sans rien",
       `${(rb / C.STAR_CRATER_DRAW_R * 100).toFixed(0)} % de l'emprise dessinée`);
    ok(rbMin >= 1.2, "⚠️ mais assez large pour qu'on tombe dedans en y entrant",
       `${(rbMin * 2).toFixed(1)} cases de traversée au plus étroit`);
    ok(rb < Q.STAR_CRATER_R, "⚠️⚠️ et l'anneau où l'on se tient tranquille reste praticable",
       `brûlure ${rb.toFixed(2)} cases, anneau de calme ${Q.STAR_CRATER_R}`);
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

console.log("\n8 bis. LE FRAGMENT DE FERME (462) — caillou instable, pas boule de feu\n");
{
  const probeFrag = (t) => {
    const s = makeCanvas(180, 140), g = s.ctx;
    g.fillStyle = "#000"; g.fillRect(0, 0, 180, 140);
    S.drawStarFragmentMeteor(g, 105, 72, 0.72, 12, t, { q: 1 });
    return s.px;
  };
  const a = probeFrag(1800), b = probeFrag(1880);
  let ink = 0, white = 0, orange = 0, dark = 0, diff = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] + a[i + 1] + a[i + 2] > 35) ink++;
    if (a[i] > 240 && a[i + 1] > 240 && a[i + 2] > 240) white++;
    if (a[i] > 150 && a[i] > a[i + 1] * 1.25 && a[i + 2] < 120) orange++;
    if (a[i] > 25 && a[i] < 100 && a[i + 1] < 80 && a[i + 2] < 80) dark++;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diff++;
  }
  ok(ink > 120, "le petit météore peint une vraie silhouette", `${ink} px`);
  ok(white < 8, "⚠️ il n'a PAS le cœur blanc de la grosse boule de feu", `${white} px blancs`);
  ok(orange > 25 && dark > 25, "⚠️⚠️ c'est un caillou sombre et incandescent", `${dark} px roche · ${orange} px braise`);
  ok(diff > 80, "⚠️⚠️ sa rotation rapide change vraiment sa silhouette", `${diff} px changés en 80 ms`);
}

console.log("\n8 ter. L'IMPACT DU FRAGMENT (463) — poids, terre, retombée\n");
{
  const shot = (age) => {
    const s = makeCanvas(260, 220), g = s.ctx;
    g.fillStyle = "#000"; g.fillRect(0, 0, 260, 220);
    S.drawStarFragmentImpact(g, 130, 145, age, 15, { q: 3 });
    let ink = 0, dirt = 0, warm = 0, minX = 260, maxX = 0, minY = 220;
    for (let y = 0; y < 220; y++) for (let x = 0; x < 260; x++) {
      const i = (y * 260 + x) * 4, r = s.px[i], gg = s.px[i + 1], b = s.px[i + 2];
      if (r + gg + b < 45) continue;
      ink++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y);
      if (r > 40 && r < 150 && gg < 110 && b < 80) dirt++;
      if (r > 170 && gg > 70 && gg < 220 && b < 120) warm++;
    }
    return { ink, dirt, warm, width: maxX - minX, rise: 145 - minY };
  };
  const contact = shot(60), burst = shot(300), fall = shot(1140);
  ok(contact.warm > 10, "le contact comprime une chaleur brève", `${contact.warm} px chauds`);
  ok(burst.dirt > contact.dirt * 1.45, "⚠️ la TERRE prend le relais sur le flash", `${contact.dirt} → ${burst.dirt} px`);
  ok(burst.width > contact.width * 1.45, "⚠️ la gerbe s'ouvre latéralement", `${contact.width} → ${burst.width} px`);
  ok(burst.rise > 35, "la poussière monte au-dessus du cratère", `${burst.rise} px`);
  ok(fall.ink < burst.ink * 0.72, "⚠️ l'impact retombe et s'éteint", `${burst.ink} → ${fall.ink} px`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 455 — LA BULLE D'ÉMOTION, ET LA FRACTURE DE LA COMÈTE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ LA BULLE EST REGARDÉE DÈS SA PREMIÈRE LIGNE, ET C'EST DÉLIBÉRÉ. La leçon
   du 454 était payée par le SILLON : deux contrôles le regardaient depuis dix
   zips sans jamais mesurer son relief, et il était resté plat. Un dessin neuf
   qu'aucun banc n'appelle est un dessin qui vieillira ; celui-ci a ses mesures le
   jour où il est écrit.
   ⚠️ CE QU'ON MESURE EST CE QU'UNE CAPTURE NE MONTRE PAS : que le signe est bien
   SÉPARÉ de son point (à six pixels, un « ! » collé devient un « l »), que la
   bulle SURSAUTE au lieu d'apparaître, et qu'elle s'éteint pour de bon.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log("\n9. LA BULLE D'ÉMOTION (455) — un signe, pas une phrase\n");
{
  const S3 = 48;
  const shot = (a2) => {
    const sur = makeCanvas(S3, S3), gg = sur.ctx;
    /* ⚠️⚠️ UN FOND BLEU PUR, ET PAS DE L'HERBE — LE BANC S'EST TROMPÉ LÀ-DESSUS
       À SA PREMIÈRE ÉCRITURE. Le premier jet peignait « de l'herbe, comme dans le
       jeu » (#2a5c2a) : ses trois composantes sont TOUTES sous le seuil d'encre,
       donc le banc comptait le fond comme du trait et annonçait « 48 rangées
       d'encre » sur une image de 48 px de haut. *Un banc de rendu se vérifie
       aussi* (§10 de `CLAUDE.md`) — et le fond d'une mesure n'est pas un décor,
       c'est un réactif : il doit être ce que le dessin n'est JAMAIS. */
    gg.fillStyle = "#0000ff"; gg.fillRect(0, 0, S3, S3);
    S.drawEmoteBubble(gg, S3 / 2, S3 - 8, a2);
    return sur;
  };
  /* L'encre : les pixels franchement sombres. Le corps de la bulle est crème, le
     fond est vert — le signe est donc la seule chose noire de l'image. */
  /* ⚠️⚠️ ON NE REGARDE QU'UNE BANDE CENTRALE DE SIX PIXELS, ET C'EST LA SECONDE
     CORRECTION DE CE CONTRÔLE. Sur toute la largeur, le CERNE de la bulle (brun
     foncé) est de l'encre lui aussi : il traverse chaque rangée, donc il bouchait
     le trou qu'on cherche et le banc annonçait « 0 rangée vide » sur un « ! »
     parfaitement formé. *Il mesure autre chose* — quatrième visage du défaut de
     banc, ici dans sa version la plus bête : on mesurait le cadre en croyant
     mesurer le texte. La bande ne contient que le glyphe. */
  const inkRows = (sur) => {
    const d = sur.px, rows = [];
    const x0 = Math.round(S3 / 2 - 3), x1 = Math.round(S3 / 2 + 3);
    for (let y = 0; y < S3; y++) {
      let n = 0;
      for (let x = x0; x <= x1; x++) {
        const i = (y * S3 + x) * 4;
        if (d[i] < 110 && d[i + 1] < 110 && d[i + 2] < 90) n++;   // l'encre : sombre PARTOUT, bleu compris
      }
      rows.push(n);
    }
    return rows;
  };
  {
    const rows = inkRows(shot(1));
    /* ⚠️ ET LE GLYPHE SE DISTINGUE DU CERNE PAR SA LARGEUR, PAS PAR SA COULEUR
       (les deux sont la même encre) : le cerne traverse la bande entière, le fût
       fait trois pixels. Sans ce tri, les deux rangées vides qui séparent le cerne
       du haut du glyphe se comptaient comme le trou du « ! » — le banc aurait été
       vert sur un point collé au fût, ce qu'il est censé refuser. */
    const on = rows.map((n, y) => (n > 0 && n <= 4 ? y : -1)).filter(y => y >= 0);
    ok(on.length > 0, "la bulle « ! » peint bien quelque chose", `${on.length} rangées de glyphe`);
    /* ⚠️⚠️ LE POINT EST SÉPARÉ DU FÛT, ET C'EST TOUT LE CONTRÔLE. À six pixels de
       haut, un « ! » dont le point touche la barre se lit « l » — et sur une
       capture d'écran de jeu, personne ne le verra jamais. Il faut donc au moins
       UNE rangée vide entre deux rangées encrées. */
    let gaps = 0;
    for (let y = on[0]; y < on[on.length - 1]; y++) if (rows[y] === 0) gaps++;

    ok(gaps >= 1, "⚠️⚠️ le point du « ! » est SÉPARÉ du fût", `${gaps} rangée(s) vide(s) au milieu`);
    ok(gaps <= 2, "…mais pas au point de flotter", `${gaps} rangée(s)`);
  }
  {
    /* ⚠️ ELLE SURSAUTE : au tout début elle dépasse sa taille, puis retombe. Une
       bulle qui grandit régulièrement se lit comme une interface qui s'ouvre ;
       un sursaut se lit comme une réaction. Ça se mesure en largeur du corps. */
    const bodyW = (a2) => {
      const sur = shot(a2), d = sur.px;
      let lo = S3, hi = -1;
      for (let y = 0; y < S3; y++) for (let x = 0; x < S3; x++) {
        const i = (y * S3 + x) * 4;
        if (d[i] > 200 && d[i + 1] > 190 && d[i + 2] > 150) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
      }
      return hi - lo;
    };
    const w0 = bodyW(1), w1 = bodyW(0.6);
    ok(w0 > w1, "⚠️ la bulle SURSAUTE à l'apparition", `${w0} px → ${w1} px`);
    /* ⚠️⚠️ ZIP 456 — CE PLANCHER EST DESCENDU DE 8 À 6 PX AVEC LA BULLE, DANS LE
       MÊME ZIP, ET C'EST LA SEULE FAÇON HONNÊTE DE LE FAIRE. Guillaume a trouvé
       le « ! » trop gros (11×13 sur une tête de 16 px) ; le banc mesurait la
       taille d'AVANT, donc il refusait la correction. Un seuil de banc n'est pas
       une vérité, c'est la décision du jour où on l'a écrit : quand la décision
       change, il change AVEC elle et il dit lequel des deux a bougé. Ce qu'il
       protège, lui, n'a pas changé — un corps de bulle sous 6 px ne porterait plus
       un glyphe séparé de son point (contrôle du dessus). */
    ok(w1 >= 6, "…et elle reste lisible ensuite", `${w1} px de large`);
  }
  {
    const painted = (a2) => {
      const sur = shot(a2), d = sur.px;
      let n = 0;
      for (let y = 0; y < S3; y++) for (let x = 0; x < S3; x++) {
        const i = (y * S3 + x) * 4;
        if (d[i] > 200 && d[i + 2] < 240) n++;      // du crème, jamais le bleu du fond
      }
      return n;
    };
    ok(painted(0.6) > 20, "elle est bien là en pleine vie", `${painted(0.6)} px`);
    ok(painted(0) === 0, "⚠️ …et elle DISPARAÎT pour de bon à zéro", `${painted(0)} px`);
    ok(painted(0.01) === 0, "…et elle ne laisse pas un fantôme à 1 %");
  }
}


/* ⚠️⚠️ LA FRACTURE : ON COMPTE LES TÊTES, PAS LES PIXELS. Trois morceaux dessinés
   l'un sur l'autre font une seule tache ; ce qui doit se voir est qu'ils se
   SÉPARENT. On mesure donc la largeur du groupe perpendiculairement à la course,
   à deux instants, comme le 454 mesure l'étalement de la gerbe. */
/* ⚠️ ET UNE PLANCHE À REGARDER, parce qu'un contrôle vert ne dit pas si c'est
   joli (§25 de `ferme/README.md`). Trois tailles de bulle sur une bande de fond
   de jeu, puis la comète à trois instants de sa fracture. */
{
  const W2 = 300, H2 = 150;
  const sur = makeCanvas(W2, H2), gg = sur.ctx;
  gg.fillStyle = "#3a6b34"; gg.fillRect(0, 0, W2, H2 / 2);          // l'herbe de la ferme
  gg.fillStyle = "#0b1024"; gg.fillRect(0, H2 / 2, W2, H2 / 2);     // le ciel de nuit
  [1, 0.8, 0.55, 0.3, 0.12].forEach((a2, i) => S.drawEmoteBubble(gg, 40 + i * 46, 48, a2));
  const angP = Q.starFallAngle("farm");
  [Q.STAR_FRAG_AT - 0.06, Q.STAR_FRAG_AT + 0.05, 0.99].forEach((k, i) => {
    const cx0 = 74 + i * 82, cy0 = H2 / 2 + 44, R = 6 + i * 1.6;
    for (const f of Q.starFragments(k)) {
      S.drawStarComet(gg,
        cx0 - Math.cos(angP) * R * f.along - Math.sin(angP) * R * f.side,
        cy0 - Math.sin(angP) * R * f.along + Math.cos(angP) * R * f.side,
        angP, R * f.scale, 0, { q: 3, fade: 1, tail: R * f.scale * 7 });
    }
  });
  const up = scale(sur.px, W2, H2, 3);
  writePNG(path.join(OUT, "etoile-alerte.png"), up.px, up.W, up.H);
}

console.log("\n10. LA COMÈTE SE FEND (455)\n");
{
  const S4 = 260;
  const ang = Q.starFallAngle("farm");
  const groupWidth = (k) => {
    const sur = makeCanvas(S4, S4), gg = sur.ctx;
    gg.fillStyle = "#06060f"; gg.fillRect(0, 0, S4, S4);
    const R = 9;
    for (const f of Q.starFragments(k)) {
      const x = S4 / 2 - Math.cos(ang) * R * f.along - Math.sin(ang) * R * f.side;
      const y = S4 / 2 - Math.sin(ang) * R * f.along + Math.cos(ang) * R * f.side;
      S.drawStarComet(gg, x, y, ang, R * f.scale, 0, { q: 3, fade: 1, tail: R * f.scale * 8 });
    }
    /* La normale à la course : c'est le long d'ELLE que la séparation se lit. */
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const d = sur.px;
    let lo = 1e9, hi = -1e9, n = 0;
    for (let y = 0; y < S4; y++) for (let x = 0; x < S4; x++) {
      const i = (y * S4 + x) * 4;
      if (d[i] + d[i + 1] + d[i + 2] < 330) continue;          // le cœur clair des têtes
      const t = (x - S4 / 2) * nx + (y - S4 / 2) * ny;
      lo = Math.min(lo, t); hi = Math.max(hi, t); n++;
    }
    return { w: n ? hi - lo : 0, n };
  };
  const before = groupWidth(Q.STAR_FRAG_AT - 0.05);
  const after = groupWidth(0.99);
  ok(before.n > 0 && after.n > 0, "les deux instants dessinent bien quelque chose",
     `${before.n} px puis ${after.n} px`);
  ok(after.w > before.w * 1.6, "⚠️⚠️ les morceaux SE SÉPARENT en travers de la course",
     `${before.w.toFixed(0)} px → ${after.w.toFixed(0)} px`);
  ok(Q.starFragments(0.99).length === Q.STAR_FRAG_N, "…et ils sont bien trois à la fin",
     `${Q.starFragments(0.99).length} morceaux`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 456 — LA JAUGE DE LA POSTURE DU CRATÈRE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ ELLE EST REGARDÉE LE JOUR DE SON ÉCRITURE, comme la bulle du 455 et pour
   la raison du 454 : un dessin qu'aucun banc n'appelle reste au niveau du jour où
   il a été écrit (le sillon en a été la preuve, plat pendant dix zips).
   ⚠️⚠️ ET CE QU'ON MESURE EST CE QU'UNE CAPTURE NE MONTRE PAS. Une capture montre
   une barre ; elle ne montre pas qu'elle est MONOTONE (une barre qui reculerait
   d'un pixel entre deux tenues dirait au joueur qu'il a perdu du temps), ni
   qu'elle est VIDE à zéro (une barre qui commence à 2 px promet une avance qui
   n'existe pas), ni que l'état « ça ne compte pas » se distingue de l'état « ça
   monte » AUTREMENT QUE PAR LA LONGUEUR — c'est très exactement la question que
   le joueur se pose, et une barre courte et une barre grise se confondent.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log("\n11. LA JAUGE DE LA POSTURE (456) — « est-ce que je fais bien ? »\n");
{
  const S4 = 40;
  /* ⚠️ FOND BLEU PUR, LA LEÇON DU 455 : le fond d'une mesure n'est pas un décor,
     c'est un réactif — il doit être ce que le dessin n'est JAMAIS. La jauge est
     brune, crème et or ; aucun de ses tons n'a le bleu dominant. */
  const shot = (k, opt) => {
    const sur = makeCanvas(S4, S4), gg = sur.ctx;
    gg.fillStyle = "#0000ff"; gg.fillRect(0, 0, S4, S4);
    S.drawCalmMeter(gg, S4 / 2, S4 - 12, k, opt);
    return sur;
  };
  /* L'or du remplissage : rouge fort, vert moyen, bleu faible. Le cadre est brun
     très sombre et le fond est bleu — aucun des deux ne passe ce filtre. */
  const goldPx = (sur) => {
    const d = sur.px; let n = 0;
    for (let y = 0; y < S4; y++) for (let x = 0; x < S4; x++) {
      const i = (y * S4 + x) * 4;
      if (d[i] > 190 && d[i + 1] > 140 && d[i + 2] < 160) n++;
    }
    return n;
  };
  ok(goldPx(shot(0)) === 0, "⚠️ à zéro, la jauge est VIDE", `${goldPx(shot(0))} px d'or`);
  const g33 = goldPx(shot(0.34)), g66 = goldPx(shot(0.67)), g100 = goldPx(shot(1));
  ok(g33 > 0 && g66 > g33 && g100 > g66, "⚠️⚠️ elle monte, et elle ne recule jamais",
     `${g33} → ${g66} → ${g100} px`);
  /* ⚠️ LA MONOTONIE SE BALAIE, ELLE NE S'ÉCHANTILLONNE PAS (leçon 449 : un
     contrôle de cas ne vaut pas un invariant). Trente pas, et aucun ne doit
     redescendre — c'est ce qu'un arrondi mal posé casse en premier. */
  {
    let last = -1, bad = 0;
    for (let i = 0; i <= 30; i++) { const g = goldPx(shot(i / 30)); if (g < last) bad++; last = g; }
    ok(bad === 0, "…balayé sur 31 valeurs, pas trois", `${bad} recul(s)`);
  }
  /* ⚠️⚠️ L'ÉTAT « ÇA NE COMPTE PAS » NE SE DIT PAS PAR LA LONGUEUR. Une jauge
     vide et une jauge en attente se ressemblent trait pour trait si la seule
     différence est le remplissage : il faut que le CADRE change de ton. On
     compare donc le bleu moyen des deux cadres — le gris-bleu de nuit contre le
     brun. */
  {
    const blueOf = (sur) => {
      const d = sur.px; let sum = 0, n = 0;
      for (let y = 0; y < S4; y++) for (let x = 0; x < S4; x++) {
        const i = (y * S4 + x) * 4;
        if (d[i + 2] === 255 && d[i] === 0) continue;       // le fond
        sum += d[i + 2]; n++;
      }
      return n ? sum / n : 0;
    };
    const b0 = blueOf(shot(0)), bw = blueOf(shot(0, { warn: true }));
    ok(bw > b0 + 20, "⚠️⚠️ « ça ne compte pas » se voit AU CADRE, pas à la longueur",
       `bleu ${b0.toFixed(0)} → ${bw.toFixed(0)}`);
    ok(goldPx(shot(0.8, { warn: true })) === 0, "…et en attente, elle ne se remplit jamais");
  }
  /* ⚠️ LE §4 DE `CLAUDE.md`, PAYÉ TROIS FOIS AU 433 : un canevas découpe en
     silence ce qui dépasse. La jauge fait 24 px de large sur un canevas de 40 :
     aucun pixel ne doit toucher un bord. */
  {
    const d = shot(1).px; let edge = 0;
    for (let x = 0; x < S4; x++) for (const y of [0, S4 - 1]) {
      const i = (y * S4 + x) * 4;
      if (!(d[i] === 0 && d[i + 2] === 255)) edge++;
    }
    for (let y = 0; y < S4; y++) for (const x of [0, S4 - 1]) {
      const i = (y * S4 + x) * 4;
      if (!(d[i] === 0 && d[i + 2] === 255)) edge++;
    }
    ok(edge === 0, "⚠️ rien n'est peint sur le bord du canevas", `${edge} px`);
  }
  /* Une planche à regarder : un contrôle vert ne dit pas si c'est joli (§25). */
  {
    const W3 = 260, H3 = 60;
    const sur = makeCanvas(W3, H3), gg = sur.ctx;
    gg.fillStyle = "#2d2418"; gg.fillRect(0, 0, W3, H3);              // la terre du cratère
    [0, 0.25, 0.5, 0.75, 1].forEach((k, i) => S.drawCalmMeter(gg, 34 + i * 48, 26, k));
    [0, 0.5].forEach((k, i) => S.drawCalmMeter(gg, 58 + i * 96, 50, k, { warn: true }));
    const up = scale(sur.px, W3, H3, 3);
    writePNG(path.join(OUT, "etoile-jauge.png"), up.px, up.W, up.H);
  }
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ 12. ZIP 459 — LES TROIS POSES DU CRATÈRE, REGARDÉES LE JOUR DE LEUR ÉCRITURE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ C'EST LE BANC DE LA POSE ASSISE (`render-assise`, 428) TRANSPOSÉ, ET IL
   MESURE LES MÊMES TROIS CHOSES, parce que ce sont celles qui ont été payées :
     1. LES PIEDS NE BOUGENT PAS. Une pose ancrée ailleurs qu'au sol FLOTTE, et
        c'est le défaut qui a fait passer trois zips à la pose assise « assise par
        terre devant le banc » — invisible en relecture, criant à l'écran.
     2. RIEN NE DÉBORDE DU CADRE. Le canevas DÉCOUPE EN SILENCE (§4 de CLAUDE.md,
        payé trois fois dans le seul zip 433) : un bras levé de deux pixels de trop
        sort décapité et personne ne cherche pourquoi.
     3. LES QUATRE IMAGES DE LA GRIMPE SONT VRAIMENT QUATRE. C'est la leçon du 449
        sur la compagne, dont deux poses sortaient IDENTIQUES au pixel près sans
        que l'œil s'en aperçoive — un cycle de trois images sur quatre est un cycle
        qui boite, et on croit avoir écrit un cycle de quatre.
   ⚠️ ET ELLES SONT ÉPROUVÉES SUR PLUSIEURS TENUES, jamais sur un personnage : les
   poses DÉCOUPENT la feuille (elles n'inventent aucune couleur), donc ce qui se
   vérifie est la RECETTE. Si la salopette ou la combinaison d'apiculteur sort
   fausse, c'est la recette qui est fausse, pas ce cas-là. */
{
  console.log("\n12. les trois poses du cratère (459)\n");
  const CASES = [
    ["fermier", S.getChar("m", 0, false, false, false, false, false, false, null)],
    ["fermière", S.getChar("f", 1, false, false, false, false, false, false, null)],
    ["salopette", S.getChar("m", 3, true, false, false, false, false, false, null)],
    ["apiculteur", S.getChar("m", 2, false, false, true, false, false, false, null)],
  ];
  /* ⚠️⚠️⚠️ TOUTES LES POSES SONT TIRÉES DE LA RANGÉE 0, ET CE N'EST PAS UN CHOIX
     DE CADRAGE : `charSheet` empile ses trois orientations avec `g.translate`, que
     le faux canevas IGNORE (§10 de CLAUDE.md). Sur un banc, une feuille de
     personnage n'a donc QU'UNE rangée peinte — les rangées 1 (de dos) et 2 (de
     profil) y sont vides. Une pose demandée en rangée 1 ne dessine rien du tout,
     et le banc conclut « la pose est vide » sur un dessin parfaitement correct
     dans le jeu. C'est le stub menteur du §10, et il a coûté vingt minutes ici :
     quatre contrôles rouges, zéro défaut. `render-assise` fait pareil depuis le
     428 (`drawSeated(…, 0, …)`), sans avoir jamais écrit pourquoi. */
  const ROW = 0;
  const BOX = 40;                                     // large : on VEUT voir ce qui déborde
  const shotPose = (sheet, fn) => {
    const v = makeCanvas(BOX, BOX);
    fn(v.ctx, sheet, 12, 12);                         // ancre à (12,12) : 12 px de marge partout
    return v;
  };
  const ext = (v) => {
    let top = 1e9, bot = -1, left = 1e9, right = -1, n = 0;
    for (let y = 0; y < BOX; y++) for (let x = 0; x < BOX; x++) {
      if (v.px[(y * BOX + x) * 4 + 3] > 8) { n++; if (y < top) top = y; if (y > bot) bot = y; if (x < left) left = x; if (x > right) right = x; }
    }
    return { top, bot, left, right, n, h: bot - top + 1, w: right - left + 1 };
  };
  const debout = (sheet) => shotPose(sheet, (c, sh, px, py) => c.drawImage(sh, 0, 0, 16, 24, px, py - 8, 16, 24));

  console.log("cas             debout  glissade  arc-bout.  grimpe   (hauteur, px)");
  console.log("-".repeat(66));
  let anchorBad = 0, edgeBad = 0;
  for (const [name, sh] of CASES) {
    const st = ext(debout(sh));
    const sl = ext(shotPose(sh, (c, x, px, py) => A.drawStarSlide(c, x, ROW, px, py, 0, 1)));
    const br = ext(shotPose(sh, (c, x, px, py) => A.drawStarBrace(c, x, ROW, px, py)));
    const cl = ext(shotPose(sh, (c, x, px, py) => A.drawStarClimb(c, x, ROW, px, py, 0)));
    console.log(`${name.padEnd(14)}${String(st.h).padStart(6)}${String(sl.h).padStart(10)}${String(br.h).padStart(11)}${String(cl.h).padStart(9)}`);
    /* ⚠️ L'ANCRAGE : le bas de chaque pose tombe sur le sol de la pose debout, à
       un pixel près. C'est LA mesure — une pose qui flotte est le seul défaut de
       cette famille qu'on ne voit pas en relecture. */
    for (const [k, e] of [["glissade", sl], ["arc-boutement", br], ["grimpe", cl]]) {
      if (Math.abs(e.bot - st.bot) > 2) { anchorBad++; console.log(`      ⚠️ ${name}/${k} : bas à ${e.bot} contre ${st.bot} debout`); }
      if (e.top <= 0 || e.left <= 0 || e.bot >= BOX - 1 || e.right >= BOX - 1) edgeBad++;
    }
  }
  ok(anchorBad === 0, "⚠️⚠️ LES TROIS POSES GARDENT LES PIEDS AU SOL (aucune ne flotte)", `${anchorBad} écart(s)`);
  ok(edgeBad === 0, "⚠️ et aucune ne touche le bord de son cadre (le canevas découpe en silence)", `${edgeBad} débordement(s)`);

  /* LA GLISSADE PENCHE VRAIMENT — et dans le bon sens. On compare le centre de
     gravité du HAUT (tête et épaules) entre deux dévalements opposés : s'il ne
     bouge pas, il n'y a pas de « lean back », il y a un personnage debout. */
  {
    const sh = CASES[0][1];
    const headX = (lx) => {
      const v = shotPose(sh, (c, x, px, py) => A.drawStarSlide(c, x, ROW, px, py, lx, 0));
      let sum = 0, n = 0;
      for (let y = 0; y < 14; y++) for (let x = 0; x < BOX; x++)
        if (v.px[(y * BOX + x) * 4 + 3] > 8) { sum += x; n++; }
      return n ? sum / n : 0;
    };
    const east = headX(1), west = headX(-1);
    ok(west - east >= 4, "⚠️⚠️ ELLE PENCHE EN ARRIÈRE, ET DANS LE BON SENS",
       `épaules à ${east.toFixed(1)} px en dévalant vers l'est, ${west.toFixed(1)} vers l'ouest`);
    const straight = ext(shotPose(sh, (c, x, px, py) => A.drawStarSlide(c, x, ROW, px, py, 0, 1)));
    const stand = ext(debout(sh));
    ok(straight.h < stand.h - 1, "⚠️ …et il s'accroupit (une glissade debout n'est pas une glissade)",
       `${straight.h} px contre ${stand.h} debout`);
  }

  /* LES QUATRE TEMPS DE LA GRIMPE SONT QUATRE. */
  {
    const sh = CASES[0][1];
    const sig = [];
    for (let f = 0; f < A.STAR_CLIMB_FRAMES; f++) {
      const v = shotPose(sh, (c, x, px, py) => A.drawStarClimb(c, x, ROW, px, py, f));
      sig.push(Array.from(v.px).join(","));
    }
    const uniq = new Set(sig).size;
    ok(uniq === A.STAR_CLIMB_FRAMES, "⚠️⚠️ LES QUATRE IMAGES DE LA GRIMPE SONT VRAIMENT QUATRE",
       `${uniq} images distinctes sur ${A.STAR_CLIMB_FRAMES}`);
    /* ⚠️ ET ELLES SONT CONTRALATÉRALES : au premier temps, le bras gauche est plus
       haut que le droit ET la jambe droite plus haute que la gauche. Une escalade
       homolatérale (même côté ensemble) se lit comme une reptation. */
    const half = (f, x0, x1, y0, y1) => {
      const v = shotPose(sh, (c, x, px, py) => A.drawStarClimb(c, x, ROW, px, py, f));
      let top = 1e9;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++)
        if (v.px[(y * BOX + x) * 4 + 3] > 8) { top = Math.min(top, y); }
      return top;
    };
    /* ⚠️ LES QUATRE FENÊTRES SONT CALÉES SUR LA SILHOUETTE RÉELLE (corps x 16..25
       pour une ancre à 12), et pas devinées : une fenêtre à côté ne trouve RIEN,
       rend `1e9`, et le contrôle passe au vert en comparant deux infinis. C'est
       « un banc qui n'a jamais pu échouer ne vaut rien » (441) — il est passé
       comme ça une fois, ici, avant qu'on regarde les nombres qu'il imprimait. */
    const armL = half(0, 12, 16, 0, 20), armR = half(0, 24, 28, 0, 20);
    const legL = half(0, 14, 19, 21, BOX), legR = half(0, 21, 26, 21, BOX);
    ok(armL < 900 && armR < 900 && legL < 900 && legR < 900,
       "⚠️ les quatre membres sont bien là où le contrôle les cherche",
       `bras ${armL}/${armR} · jambes ${legL}/${legR}`);
    ok(armL < armR && legL > legR,
       "⚠️⚠️ ET LE CYCLE EST CONTRALATÉRAL (bras gauche haut ⇄ jambe droite haute)",
       `bras ${armL} vs ${armR} · jambes ${legL} vs ${legR}`);
  }

  /* La planche : cinq colonnes, quatre lignes. ⚠️ SUR LA TERRE DU CRATÈRE, pas sur
     du blanc — un cerne clair sur fond clair disparaît (leçon du 441), et c'est là
     que ces poses vivent. */
  {
    const W4 = 6 * 34 + 8, H4 = CASES.length * 34 + 8;
    const sur = makeCanvas(W4, H4), gg = sur.ctx;
    gg.fillStyle = "#3a2e1e"; gg.fillRect(0, 0, W4, H4);
    CASES.forEach(([, sh], r) => {
      const py = 8 + r * 34 + 16;
      gg.drawImage(sh, 0, 0, 16, 24, 12, py - 8, 16, 24);
      A.drawStarSlide(gg, sh, ROW, 12 + 34, py, 0, 1);
      A.drawStarBrace(gg, sh, ROW, 12 + 68, py);
      A.drawStarClimb(gg, sh, ROW, 12 + 102, py, 0);
      A.drawStarClimb(gg, sh, ROW, 12 + 136, py, 2);
      /* ⚠️ LA SIXIÈME COLONNE EST UNE GLISSADE DE BIAIS (vers l'est), et elle est
         là parce que la deuxième ne montre PAS ce qui a été demandé : de face, un
         « lean back » se lit à peine ; c'est en travers qu'on voit les épaules
         partir à contresens des pieds. Une planche qui ne montre pas la chose
         demandée est une planche qui rassure à tort. */
      A.drawStarSlide(gg, sh, ROW, 12 + 170, py, 1, 0.4);
    });
    const up = scale(sur.px, W4, H4, 4);
    writePNG(path.join(OUT, "etoile-poses.png"), up.px, up.W, up.H);
  }
}
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ 13. ZIP 459 — LA BULLE D'OUVRAGE DE TRISTAN.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ELLE A DEUX MOUVEMENTS ET IL FAUT MESURER LES DEUX SÉPARÉMENT, parce
   qu'ils répondent à deux questions différentes : la scie qui va et vient dit
   « c'est en train de se faire MAINTENANT », le trait de scie qui s'enfonce dit
   « on approche ». Un dessin qui n'aurait que le premier serait un moulin ; un
   dessin qui n'aurait que le second serait une barre de progression. C'est la
   leçon du 456 (« un geste continu doit rendre ce qui manque ET ce qui avance »),
   et un banc qui ne compterait que « des pixels sont peints » l'aurait ratée. */
{
  console.log("\n13. la bulle d'ouvrage de Tristan (459)\n");
  const B = 48;
  const shotB = (k, t) => {
    const v = makeCanvas(B, B);
    S.drawWorkBubble(v.ctx, 24, 34, k, t);
    return v;
  };
  const inkOf = (v) => { let n = 0; for (let i = 3; i < v.px.length; i += 4) if (v.px[i] > 8) n++; return n; };
  const sigOf = (v) => Array.from(v.px).join(",");
  ok(inkOf(shotB(0, 0)) > 200, "⚠️ la bulle se voit", `${inkOf(shotB(0, 0))} px`);
  const t0 = sigOf(shotB(0.5, 0)), t1 = sigOf(shotB(0.5, 380));
  ok(t0 !== t1, "⚠️⚠️ LA SCIE VA ET VIENT (sinon c'est une image fixe pendant huit minutes)");
  const k0 = shotB(0.05, 0), k1 = shotB(0.95, 0);
  ok(sigOf(k0) !== sigOf(k1), "⚠️⚠️ …ET LE TRAIT DE SCIE S'ENFONCE (sinon elle ne dit pas qu'on approche)");
  /* ⚠️ LE TRAIT SE MESURE, IL NE SE CROIT PAS : on compte les pixels sombres de la
     colonne du trait. Deux images « différentes » pouvaient l'être par la seule
     sciure qui tombe — c'est-à-dire que le contrôle du dessus, seul, serait passé
     au vert sur un trait qui ne bouge pas. */
  const cutDepth = (v) => {
    let n = 0;
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
      const i = (y * B + x) * 4;
      if (v.px[i + 3] > 8 && v.px[i] < 70 && v.px[i + 1] < 55 && v.px[i + 2] < 40) n++;
    }
    return n;
  };
  ok(cutDepth(k1) > cutDepth(k0), "⚠️⚠️ …et il s'enfonce VRAIMENT, en pixels comptés",
     `${cutDepth(k0)} px de trait à 5 %, ${cutDepth(k1)} px à 95 %`);
  {
    const d = shotB(0.5, 0).px; let edge = 0;
    for (let x = 0; x < B; x++) for (const y of [0, B - 1]) if (d[(y * B + x) * 4 + 3] > 8) edge++;
    for (let y = 0; y < B; y++) for (const x of [0, B - 1]) if (d[(y * B + x) * 4 + 3] > 8) edge++;
    ok(edge === 0, "⚠️ rien n'est peint sur le bord du canevas", `${edge} px`);
  }
  {
    const W5 = 5 * 32, H5 = 34;
    const sur = makeCanvas(W5, H5), gg = sur.ctx;
    gg.fillStyle = "#4c8f40"; gg.fillRect(0, 0, W5, H5);          // l'herbe de la ferme
    [0, 0.25, 0.5, 0.75, 1].forEach((k, i) => S.drawWorkBubble(gg, 16 + i * 32, 28, k, i * 260));
    const up = scale(sur.px, W5, H5, 4);
    writePNG(path.join(OUT, "etoile-tristan.png"), up.px, up.W, up.H);
  }
}
console.log(`\nPlanches : tools/out/etoile-planche.png · tools/out/etoile-cratere.png · tools/out/etoile-comete.png · tools/out/etoile-alerte.png · tools/out/etoile-jauge.png · tools/out/etoile-poses.png · tools/out/etoile-tristan.png`);
console.log(fails === 0 ? `\n✅ tous les contrôles passés.\n` : `\n❌ ${fails} contrôle(s) en échec.\n`);
process.exit(fails ? 1 : 0);
