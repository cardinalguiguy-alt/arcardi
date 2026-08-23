/* =============================================================================
   render-navire.mjs — LE NAVIRE DES ÉTOILES. (zip 450)
   -----------------------------------------------------------------------------
       node tools/render-navire.mjs

   ⚠️⚠️ ÉCRIT AVANT LE PREMIER `fillRect`, PAS APRÈS — corollaire du §4.2 de
   `CLAUDE.md` : *« ce dessin est-il regardable par un banc ? » est une question de
   QUALITÉ, et elle se pose avant de dessiner.* Le navire est le pisteur de la
   quête : s'il ment sur ce qu'il manque, toute la passe est perdue.

   CE QU'IL MESURE, ET POURQUOI CHAQUE CONTRÔLE EXISTE :

     1. AUCUN PIXEL SUR AUCUN DES QUATRE BORDS. Le canevas découpe en silence ce
        qui dépasse (427, payé TROIS fois dans le seul 433). Ici les quatre bords
        comptent et pas seulement le haut : le mât monte, la barre du safran sort
        à l'arrière, l'étrave sort à l'avant, l'ombre descend. Un dessin qui a
        quatre débordements possibles a besoin des quatre contrôles.

     2. ⚠️⚠️ LE FANTÔME A LA MÊME SILHOUETTE QUE LA PIÈCE. C'est LE contrôle de ce
        banc, et il mesure une promesse : le morceau manquant est peint en creux à
        sa place exacte, et si le creux ne ressemble pas à ce qu'on obtient, le
        jeu ment à l'enfant. Le dessin le garantit par construction (le fantôme
        est DÉRIVÉ des pixels de la pièce) — ce contrôle vérifie que la
        construction tient, pas qu'on a bien recopié.
        ⚠️ Le damier retire la MOITIÉ des pixels, exactement : on mesure donc que
        la silhouette est INCLUSE et que le taux est proche de 1/2, jamais
        l'égalité pixel à pixel.

     3. ⚠️⚠️ UN INVARIANT, PAS TROIS EXEMPLES (leçon du 449, où l'invariant a
        trouvé 20 défauts sur 164 que trois contrôles verts avaient manqués) :
        **la matière peinte croît strictement avec le nombre de morceaux posés**,
        balayé sur les TRENTE-DEUX masques. Si une pièce en effaçait une autre —
        le bordé qui recouvre le pied du mât est exactement ce risque — la courbe
        se creuserait et personne ne le verrait à l'œil.

     4. LA CALE EXISTE À ZÉRO MORCEAU. Un chantier vide doit se lire comme un
        chantier, pas comme un terrain vague : c'est la première nuit de la quête,
        et c'est là que l'enfant doit comprendre qu'il y a quelque chose à faire.

     5. L'ÉCHELLE, CONTRE LE FERMIER (429). « Un grand navire » est une promesse
        de texte ; un dessin qui la contredit ment deux fois (448).

     6. ⚠️⚠️ LA JOINTURE `C.STAR_SHIP_ORDER` ↔ `Q.STAR_SHIP_PARTS`, DANS LES DEUX
        SENS. Le 449 a payé deux listes qui répondaient à la même question sans
        jamais être comparées (le bandeau et le chevron). Ici trois fichiers lisent
        la même liste ; le jour où l'un s'en écarte, ce contrôle le dit — et sans
        lui, le bateau afficherait une voile là où le joueur a trouvé un safran.

     7. L'EMPRISE QUI BLOQUE EST PLUS PETITE QUE CE QU'ON PEINT. Une grandeur de
        DESSIN et une grandeur de COLLISION, deux paramètres (441) : confondues,
        on livre soit une coque qu'on traverse, soit un mur invisible large comme
        la voile.

   ⚠️ CE QU'IL NE MESURE PAS, ET IL LE DIT :
     · IL NE LE VOIT PAS DANS SON HERBE, ni au bord de l'eau. Le fond est peint
       ici, donc c'est une approximation : la vraie composition (le navire sur la
       grève, le ponton à côté, le lac derrière) ne se juge qu'en jouant.
     · IL NE JUGE PAS LA NUIT. `opt.night` multiplie une lueur ; ce que ça donne
       sous le voile de nuit du jeu ne se voit qu'à l'écran.
     · IL NE SAIT PAS SI C'EST BEAU.
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
/* ⚠️ `quete` EST DEMANDÉ POUR LA JOINTURE (contrôle 6) ET POUR RIEN D'AUTRE : le
   dessin, lui, ne reçoit que cinq booléens. Un banc de RENDU qui aurait besoin de
   monter la quête pour peindre serait un banc qu'on finit par ne plus lancer. */
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "quete"]);
const C = mods.fermeConstants, A = mods.fermeArt, Q = mods.quete;
const S = A.buildSprites();

let fails = 0;
const ok = (cond, name, extra) => {
  console.log(`  ${cond ? "OK   " : "ÉCHEC"}   ${name}${extra ? "  —  " + extra : ""}`);
  if (!cond) fails++;
};

function px(cv) { return cv.__px || cv.px; }

/* ── Peindre le navire seul dans une surface juste, pour le mesurer. La boîte est
   DÉRIVÉE des constantes du jeu, jamais recopiée (§8 de `CLAUDE.md`). */
const T = 16;
const BOX_W = C.STAR_SHIP_DRAW_W * T, BOX_H = C.STAR_SHIP_DRAW_H * T;
function shot(parts, opt) {
  /* ⚠️ UNE MARGE DE HUIT PIXELS AUTOUR, ET ELLE A UN RÔLE : sans elle, un dessin
     qui déborde serait rogné par la surface du BANC et le contrôle n°1 ne pourrait
     jamais échouer — *un banc qui n'a jamais pu échouer ne vaut rien* (441). Avec
     la marge, ce qui dépasse se voit et se compte. */
  const M = 8;
  const sur = makeCanvas(BOX_W + M * 2, BOX_H + M * 2);
  S.drawStarShip(sur.ctx, M + BOX_W / 2, M + BOX_H - Math.round(112 - 100 - 1),
                 T, parts, (opt && opt.t) || 0, opt || {});
  return sur;
}
/* La matière : ce qui est franchement opaque. ⚠️ Deux seuils dans ce dépôt et ils
   ne sont pas interchangeables (446) — `matter` (150) est la MATIÈRE, `ink` (40)
   est la surface OCCUPÉE, halo compris. Le fantôme est à 190 d'alpha : il compte
   donc comme matière, ce qui est juste — c'est du dessin, pas de la lumière. */
function count(cv, thr) {
  const d = px(cv);
  let n = 0;
  for (let i = 0; i < cv.width * cv.height; i++) if (d[i * 4 + 3] > thr) n++;
  return n;
}
function maskOf(cv, thr) {
  const d = px(cv), out = new Uint8Array(cv.width * cv.height);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > thr ? 1 : 0;
  return out;
}
function edgeInk(cv) {
  const d = px(cv), w = cv.width, h = cv.height;
  let n = 0;
  const hit = (x, y) => { if (d[((y * w + x) * 4) + 3] > 8) n++; };
  for (let x = 0; x < w; x++) { hit(x, 0); hit(x, h - 1); }
  for (let y = 0; y < h; y++) { hit(0, y); hit(w - 1, y); }
  return n;
}
/* ⚠️ « L'ÎLOT QUI FLOTTE DANS UN APLAT », EN CONNEXITÉ À HUIT — la grandeur du 438,
   qui a demandé quatre rédactions. À quatre, un cerne d'un pixel en diagonale
   n'est plus connexe et le banc accuse le contour lui-même. */
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
    const ring = new Set();
    for (const p of cell) {
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (key(ny * w + nx) !== k) ring.add(key(ny * w + nx));
      }
    }
    if (ring.size === 1 && [...ring][0] >= 0) bad += cell.length;
  }
  return total ? bad / total : 0;
}

const N = C.STAR_SHIP_ORDER.length;
const NONE = C.STAR_SHIP_ORDER.map(() => false);
const ALL = C.STAR_SHIP_ORDER.map(() => true);

console.log("\n=== LE NAVIRE DES ÉTOILES (450) ===\n");
console.log(`  boîte de dessin : ${BOX_W}×${BOX_H} px (${C.STAR_SHIP_DRAW_W}×${C.STAR_SHIP_DRAW_H} cases)`);
console.log(`  morceaux        : ${C.STAR_SHIP_ORDER.join(", ")}\n`);

/* ═══════════════════════════════════════════════════════════════════════════
   1. LA JOINTURE — avant tout dessin. Si les listes divergent, tout le reste
   mesure un bateau qui n'est pas celui du jeu.
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const fromQ = Q.STAR_SHIP_PARTS.map(p => p.key);
  ok(fromQ.length === N && fromQ.every((k, i) => k === C.STAR_SHIP_ORDER[i]),
     "la table de quete.js suit C.STAR_SHIP_ORDER, dans l'ordre",
     `${fromQ.length} clés lues`);
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 469 — UN MORCEAU PEUT N'AVOIR AUCUN LIEU, ET C'EST DÉSORMAIS LE CAS DE
     ║ QUATRE SUR CINQ.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ CE CONTRÔLE EXIGEAIT « chaque morceau s'accroche à un lieu qui existe » et
     « chaque morceau vient d'un lieu DISTINCT ». Les deux étaient justes tant que
     les cinq morceaux se TROUVAIENT dehors. Le déchant retire les chapitres 3, 4 et
     5 : le safran, le mât, la voile et la cloche ne se ramassent plus, ils se
     FABRIQUENT (voir `SHIP_SITE_OF` dans `quete.js`). Un `site: null` n'est plus
     une erreur, c'est la règle.
     ⚠️ CE QUI RESTE VRAI, ET QU'ON MESURE MAINTENANT : un morceau qui NOMME un lieu
     doit nommer un lieu qui existe (sinon la cale attend pour toujours un éclat
     introuvable — la cascade silencieuse du 468), et deux morceaux ne peuvent pas
     se partager le même lieu (l'un des deux ne se poserait jamais). */
  const siteIds = new Set(Q.STAR_SITES.map(s => s.id));
  const named = Q.STAR_SHIP_PARTS.filter(p => p.site);
  const orphans = named.filter(p => !siteIds.has(p.site));
  ok(orphans.length === 0, "⚠️ tout morceau qui NOMME un lieu nomme un lieu qui existe",
     `${named.length} morceau(x) à ramasser sur ${Q.STAR_SHIP_PARTS.length}, ${orphans.length} orphelin(s)`);
  const carried = new Set(named.map(p => p.site));
  ok(carried.size === named.length, "⚠️ …et deux morceaux ne se partagent pas le même lieu",
     `${carried.size} lieux pour ${named.length} morceau(x) ramassé(s)`);
  /* ⚠️⚠️ ET IL EN RESTE AU MOINS UN QUI SE RAMASSE. Sans ce plancher, le contrôle
     ci-dessus passerait au vert sur un navire dont AUCUN morceau ne vient du monde
     — c'est-à-dire un bateau entièrement offert par un panneau de commande, et la
     fin de la quête n'aurait plus rien à voir avec l'étoile. C'est le garde-fou
     qui empêche le pansement du 469 de devenir la charpente définitive. */
  ok(named.length >= 1, "⚠️⚠️ au moins un morceau se RAMASSE dans le monde (la coque)",
     named.map(p => `${p.key}←${p.site}`).join(" ") || "AUCUN");
  ok(Q.STAR_SHIP_TOTAL === N, "STAR_SHIP_TOTAL est dérivé, pas écrit", `${Q.STAR_SHIP_TOTAL}`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LES DEUX GRANDEURS QU'ON NE DOIT PAS CONFONDRE.
   ═══════════════════════════════════════════════════════════════════════════ */
ok(C.STAR_SHIP_BLOCK_W < C.STAR_SHIP_DRAW_W && C.STAR_SHIP_BLOCK_H < C.STAR_SHIP_DRAW_H,
   "l'emprise qui BLOQUE est plus petite que ce qu'on PEINT",
   `bloque ${C.STAR_SHIP_BLOCK_W}×${C.STAR_SHIP_BLOCK_H}, peint ${C.STAR_SHIP_DRAW_W}×${C.STAR_SHIP_DRAW_H}`);
/* ⚠️ ZIP 453 — LE CONTRÔLE SUR `STAR_SHIP_NEAR_R` A ÉTÉ SUPPRIMÉ AVEC ELLE. Il
   comparait deux constantes dont AUCUN code de jeu ne lisait la première : ce
   banc mesurait donc sa propre lecture, ce qui est la définition d'un contrôle
   qui ne peut pas échouer (441). Voir la note de suppression dans
   `fermeConstants.js`. */

/* ═══════════════════════════════════════════════════════════════════════════
   3. LES BORDS ET LA PROPRETÉ, SUR LES DEUX EXTRÊMES ET UN INTERMÉDIAIRE.
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const mid = C.STAR_SHIP_ORDER.map((_, i) => i < 2);
  for (const [name, parts] of [["à zéro morceau", NONE], ["à deux morceaux", mid], ["complet", ALL]]) {
    const cv = shot(parts, { t: 1500 });
    ok(edgeInk(cv) === 0, `aucun pixel sur les quatre bords ${name}`, `${edgeInk(cv)} pixel(s)`);
    const isl = floatingIslands(cv);
    ok(isl < 0.02, `aucun îlot flottant ${name}`, `${(isl * 100).toFixed(2)} %`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. ⚠️⚠️ LE CONTRÔLE CENTRAL — LE FANTÔME PROMET CE QU'ON OBTIENT.
   On peint chaque morceau SEUL, puis son absence SEULE, et on compare.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️⚠️ LE PREMIER JET DE CE CONTRÔLE NE POUVAIT PAS ÉCHOUER, ET IL ANNONÇAIT
   « 0,0 % » CINQ FOIS. Il comparait `shot(rien)` à `shot(une pièce)` : les quatre
   AUTRES fantômes sont identiques dans les deux images, donc ils s'annulaient, et
   ce qui restait était comparé à lui-même. *Un banc qui n'a jamais pu échouer ne
   vaut rien* (§10 de `CLAUDE.md`, payé au 441 sur `verify-pont`) — et « 0,0 % »
   répété est très exactement la forme sous laquelle ça se voit.
   ⚠️ LA BONNE ISOLATION EST `tout` CONTRE `tout SAUF i` : les deux images ont
   exactement les mêmes occultants dessinés dans le même ordre, donc leur
   différence EST la pièce i, et rien d'autre. Ce qui devient alors mesurable :
     · les pixels du FANTÔME qui tombent hors de la pièce → doivent être ZÉRO (un
       fantôme décalé d'un pixel, ou redessiné à la main, les ferait apparaître) ;
     · la DENSITÉ du damier → doit valoir la moitié, et le contrôle échoue si le
       fantôme devient un aplat (illisible) ou trois pixels (invisible). */
/* ⚠️ ET LA SECONDE RÉDACTION S'EST TROMPÉE AUSSI, D'UNE FAÇON QUI VAUT D'ÊTRE
   ÉCRITE : elle comptait « fantôme dedans » comme « les deux images sont opaques
   ici », ce qui est vrai de TOUT LE RESTE DU BATEAU. Densité annoncée : 0,0 %,
   cinq fois. *Le banc mesurait la coque, la cale et les quatre autres pièces en
   croyant mesurer un damier.* La grandeur qui identifie vraiment un fantôme est sa
   COULEUR — elle n'appartient qu'à lui — et c'est elle qu'on lit. */
/* ⚠️⚠️⚠️ ET LA TROISIÈME RÉDACTION A TROUVÉ UN PIÈGE D'OUTIL QUI VAUT POUR TOUT
   BANC DE RENDU DU DÉPÔT : **LE FAUX CANEVAS DE `lib-canvas.mjs` PRÉMULTIPLIE
   L'ALPHA, UN VRAI NAVIGATEUR NON.** Un fantôme peint en `rgba(150,232,255,0.745)`
   sur du transparent ressort ici à `112,173,190` (chaque canal multiplié par
   l'alpha) et à `150,232,255` dans Chrome. Un contrôle écrit sur la couleur EXACTE
   passe donc au rouge sans qu'il y ait le moindre défaut — c'est le stub menteur
   du §10, dans sa forme la plus coûteuse : *il accuse un dessin juste.*
   ⚠️ LA PARADE EST DE MESURER CE QUI SURVIT AUX DEUX CONVENTIONS, c'est-à-dire la
   TEINTE et non la valeur : le fantôme est la seule chose bleu-cyan franche du
   navire (bois, voile, pierre et bronze sont chauds ou neutres). On garde une
   marge : le fantôme pur donne B−R = 105, le fantôme prémultiplié 78, et le
   pixel le plus bleu du reste du dessin (l'eau des sabords, l'étoile de la voile)
   plafonne à 32. */
{
  /* ⚠️⚠️ ZIP 454 — `ghosts: true` EST OBLIGATOIRE ICI, ET SON ABSENCE A FAIT
     ÉCHOUER CE BLOC À LA PREMIÈRE EXÉCUTION — ce qui est exactement ce qu'on
     attend d'un banc. Les fantômes ne se peignent plus que le plan déplié (demande
     de Guillaume) : un banc qui mesure des fantômes doit donc DIRE qu'il déplie le
     plan, sinon il mesure une image où il n'y en a aucun. */
  const A = shot(ALL, { t: 0, ghosts: true }), dA = px(A);
  const isGhost = (d, k) => d[k * 4 + 3] > 150
                         && d[k * 4 + 2] - d[k * 4] > 45 && d[k * 4 + 1] - d[k * 4] > 25;
  let checked = 0;
  for (let i = 0; i < N; i++) {
    /* ⚠️ « TOUT » CONTRE « TOUT SAUF i » : les deux images ont les mêmes
       occultants dessinés dans le même ordre, donc leur différence EST la pièce i.
       Et dans `B`, i est le SEUL fantôme — tout pixel de teinte fantôme lui
       appartient. */
    const B = shot(C.STAR_SHIP_ORDER.map((_, j) => j !== i), { t: 0, ghosts: true }), dB = px(B);
    let ghost = 0, ghostOutside = 0;
    for (let k = 0; k < A.width * A.height; k++)
      if (isGhost(dB, k)) { ghost++; if (dA[k * 4 + 3] <= 150) ghostOutside++; }
    const key = C.STAR_SHIP_ORDER[i];
    /* Un fantôme peint hors de sa pièce = une promesse fausse : l'enfant voit un
       creux là où rien ne viendra. Zéro, et c'est falsifiable — un décalage d'un
       seul pixel le fait monter. */
    ok(ghostOutside === 0, `le fantôme « ${key} » ne déborde jamais de sa pièce`,
       `${ghostOutside} px hors sur ${ghost} px de fantôme`);
    /* ╔══════════════════════════════════════════════════════════════════════════
       ║ LE DAMIER SE MESURE SUR L'ALPHA, ET C'EST LA TROISIÈME RÉDACTION.
       ╚══════════════════════════════════════════════════════════════════════════
       ⚠️⚠️ LES DEUX PREMIÈRES ONT COMPTÉ LA LUEUR. Elle est proportionnelle au
       nombre de morceaux posés (c'est sa raison d'être : l'avancement se lit de
       nuit), donc `A` et `B` n'ont PAS la même lueur, donc tout pixel du navire a
       une couleur différente dans les deux images. Le dénominateur passait de 290
       à 6 027 sans qu'une seule ligne du dessin ait bougé — *le banc mesurait un
       éclairage en croyant mesurer un damier.* C'est le sixième visage du défaut
       de banc, et il est le plus discret : il ne mesure pas la mauvaise CHOSE, il
       mesure la bonne chose PLUS quelque chose.
       ⚠️ LA PARADE : l'ALPHA est insensible à la lueur (elle est à ~0,1 d'alpha,
       donc elle ne franchit jamais le seuil de 150 sur du transparent, et elle
       laisse à 255 ce qui était opaque). `nA − nB` compte donc EXACTEMENT les
       pixels que le damier a retirés, et rien d'autre. Un fantôme devenu aplat
       donne 0 ; un fantôme réduit à trois pixels donne un rapport énorme. */
    const nA = count(A, 150), nB = count(B, 150);
    const dropped = nA - nB;
    const ratio = ghost ? dropped / ghost : 0;
    checked++;
    ok(ratio > 0.35 && ratio < 1.8, `le fantôme « ${key} » est un damier lisible`,
       `${dropped} px retirés pour ${ghost} px peints (rapport ${ratio.toFixed(2)})`);
  }
  console.log(`         (${checked} morceaux isolés par « tout » contre « tout sauf lui »)`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ⚠️⚠️ L'INVARIANT, BALAYÉ SUR LES 32 MASQUES — pas trois exemples (449).
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const ink = [];
  for (let m = 0; m < (1 << N); m++)
    ink.push({ m, n: (m.toString(2).match(/1/g) || []).length,
               px: count(shot(C.STAR_SHIP_ORDER.map((_, i) => !!(m & (1 << i))), { t: 0 }), 150) });
  /* ⚠️ LA PROPRIÉTÉ : poser un morceau de plus ne peut pas FAIRE DISPARAÎTRE de la
     matière. Le bordé recouvre le pied du mât, la coque recouvre les membrures :
     c'est exactement le cas où une pièce en efface une autre, et l'œil ne le voit
     pas sur une planche. On compare chaque masque à tous ses sous-masques d'un
     morceau de moins. */
  let pairs = 0, bad = 0, worstDrop = 0;
  for (const a of ink) for (let i = 0; i < N; i++) {
    if (!(a.m & (1 << i))) continue;
    const b = ink[a.m & ~(1 << i)];
    pairs++;
    const drop = (b.px - a.px) / Math.max(1, b.px);
    if (drop > worstDrop) worstDrop = drop;
    if (drop > 0.06) bad++;
  }
  ok(bad === 0, "poser un morceau n'en efface jamais un autre (invariant, 32 masques)",
     `${pairs} paires balayées, ${bad} en défaut, pire recul ${(worstDrop * 100).toFixed(1)} %`);
  const none = ink[0].px, all = ink[(1 << N) - 1].px;
  ok(all > none * 1.6, "le navire complet est franchement plus dessiné que la cale seule",
     `cale ${none} px → complet ${all} px (×${(all / none).toFixed(2)})`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LA CALE SEULE DIT DÉJÀ « CHANTIER », ET L'ÉCHELLE SE JUGE CONTRE LE FERMIER.
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const cale = count(shot(NONE, { t: 0 }), 150);
  ok(cale > 900, "à zéro morceau il y a un chantier, pas un terrain vague", `${cale} px de matière`);
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 454 — PAS DE PLAN, PAS DE FANTÔME. LE CONTRÔLE QUI MANQUAIT.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ CE BANC A REGARDÉ CE NAVIRE SOUS TRENTE-DEUX MASQUES PENDANT TROIS ZIPS
     SANS JAMAIS REMARQUER QUE LES FANTÔMES ÉTAIENT LÀ DÈS LE PREMIER JOUR. Il
     mesurait leur forme, leur damier, leur débordement, leur pulsation — jamais
     leur DROIT D'EXISTER. C'est le cinquième visage du défaut de banc (« il mesure
     ce qu'une chose EST et jamais QUAND elle est », 448) sur un autre dessin, et
     c'est Guillaume qui l'a vu, pas nous.
     ⚠️ ON MESURE DONC LA CONDITION : sans `ghosts`, aucun pixel de teinte fantôme,
     et le chantier reste franchement plus léger qu'avec. Deux nombres, et le second
     empêche le premier de passer au vert sur une image vide. */
  const ghostHue = (cv) => { const d = px(cv); let n = 0;
    for (let k = 0; k < cv.width * cv.height; k++)
      if (d[k * 4 + 3] > 150 && d[k * 4 + 2] - d[k * 4] > 45 && d[k * 4 + 1] - d[k * 4] > 25) n++;
    return n; };
  const sansPlan = ghostHue(shot(NONE, { t: 0 }));
  const avecPlan = ghostHue(shot(NONE, { t: 0, ghosts: true }));
  ok(sansPlan === 0, "⚠️⚠️ sans les plans, la cale ne montre AUCUN fantôme",
     `${sansPlan} px de teinte fantôme`);
  ok(avecPlan > 400, "…et le plan déplié les fait tous apparaître d'un coup",
     `${avecPlan} px de teinte fantôme`);
  const caleGhost = count(shot(NONE, { t: 0, ghosts: true }), 150);
  ok(caleGhost > cale * 1.5, "…ce qui se voit aussi à la quantité de dessin",
     `${cale} px sans plan → ${caleGhost} px avec (×${(caleGhost / cale).toFixed(2)})`);
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 453 — LA CALE VIDE : IL EST PARTI, ET ÇA DOIT SE LIRE COMME ÇA.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ TROIS ÉTATS SE RESSEMBLENT ASSEZ POUR QU'ON LES CONFONDE, et le banc
     doit tenir les trois séparés : « rien n'a commencé » (la carcasse + cinq
     fantômes), « il est fini » (les cinq morceaux), « il est en mer » (le ber et
     les tins, RIEN d'autre). Si la cale vide ressemblait au chantier de la
     première nuit, le joueur lirait « le bateau a été défait » — l'inverse exact
     de ce qui vient de se passer.
     ⚠️ ON MESURE DEUX CHOSES, PAS UNE : qu'il reste quelque chose (une cale, pas
     un trou dans le décor) et qu'il en reste FRANCHEMENT MOINS que le chantier
     (donc plus de quille, plus de membrures, plus de fantôme). */
  const parti = count(shot(NONE, { t: 0, gone: true }), 150);
  ok(parti > 200, "la cale vide reste un lieu, pas un trou dans le décor", `${parti} px de matière`);
  ok(parti < cale * 0.55, "…et elle ne se confond pas avec le chantier du début",
     `cale vide ${parti} px contre chantier ${cale} px (${((parti / cale) * 100).toFixed(0)} %)`);
  const partiFull = count(shot(ALL, { t: 0, gone: true }), 150);
  ok(partiFull === parti, "⚠️ …et elle ne dépend PAS des morceaux trouvés",
     `${partiFull} px avec les cinq morceaux, ${parti} px sans — le bateau est parti avec`);
  /* ⚠️ L'ÉCHELLE CONTRE LE FERMIER, ET PAS CONTRE D'AUTRES DÉCORS (429) : un objet
     deux fois trop grand au milieu d'objets deux fois trop grands a l'air juste.
     Un fermier fait 24 px de haut ; « un grand navire » doit faire au moins trois
     fois ça, et pas plus de six — au-delà il cesse d'être un bateau posé sur une
     grève pour devenir un décor de fond. */
  const H_FARMER = 24;
  const h = BOX_H;
  ok(h >= H_FARMER * 3 && h <= H_FARMER * 6, "l'échelle tient contre le fermier",
     `navire ${h} px de haut, fermier ${H_FARMER} px (×${(h / H_FARMER).toFixed(1)})`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. LA PLANCHE — ce qu'on regarde. Les six états, sur deux fonds.
   ═══════════════════════════════════════════════════════════════════════════ */
{
  /* ⚠️ DEUX FONDS, comme `render-etoile` : cette famille émet de la lumière (le
     fantôme et la lueur), et la juger sur un seul fond, c'est ne pas voir la
     moitié des défauts. Le fond CLAIR est celui qui a fait disparaître les
     cierges du chœur au 441. */
  /* ⚠️ ZIP 453 — UNE COLONNE DE PLUS : LA CALE VIDE. Un état qu'on ne peint
     jamais sur la planche est un état qu'on ne regarde jamais. */
  const cols = N + 2, W = cols * (BOX_W + 10) + 10, H = (BOX_H + 26) * 2 + 10;
  const sur = makeCanvas(W, H), g = sur.ctx;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const night = y < H / 2;
    const v = ((x * 7 + y * 13) % 23) / 23;
    g.fillStyle = night
      ? `rgb(${(26 + v * 8) | 0},${(38 + v * 10) | 0},${(48 + v * 8) | 0})`
      : `rgb(${(122 + v * 12) | 0},${(150 + v * 14) | 0},${(96 + v * 10) | 0})`;
    g.fillRect(x, y, 1, 1);
  }
  for (let n = 0; n <= N + 1; n++) {
    const gone = n > N;                        // la dernière colonne : il a pris la mer
    const parts = C.STAR_SHIP_ORDER.map((_, i) => i < Math.min(n, N));
    const cx = 10 + n * (BOX_W + 10) + BOX_W / 2;
    for (const [row, night] of [[0, true], [1, false]]) {
      const cy = 8 + row * (BOX_H + 26) + BOX_H - 11;
      S.drawStarShip(g, cx, cy, T, parts, 1500, { t: 1500, night, gone });
    }
  }
  /* Le repère d'échelle : un fermier, à côté du navire complet. */
  const ch = S.getChar ? S.getChar("f", 0, false, false, false, false, false, false, "") : null;
  if (ch) for (const row of [0, 1])
    g.drawImage(ch, 0, 0, 16, 24, 10 + N * (BOX_W + 10) + BOX_W - 8,
                8 + row * (BOX_H + 26) + BOX_H - 34, 16, 24);
  const z = scale(sur.px, W, H, 2);
  writePNG(path.join(OUT, "navire.png"), z.px, z.W, z.H);
  console.log(`\n  planche : tools/out/navire.png (${z.W}×${z.H}, ×2) — zéro à cinq morceaux PUIS la cale vide, nuit puis jour`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. ZIP 454 — LA FEUILLE DE PLAN. UN DESSIN NEUF A UN BANC LE JOUR DE SA
      NAISSANCE, PAS TROIS ZIPS PLUS TARD.
   ═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ C'EST LA LEÇON DU 445 PRISE À L'ENDROIT : la comète est restée huit lignes
   dans une closure pendant trois zips parce qu'aucun banc ne pouvait l'appeler,
   et Guillaume l'a résumée en « trop ridicule ». Le plan est un dessin de la même
   famille — il vit dans un panneau, l'endroit le plus facile du monde où laisser
   vieillir quelque chose. Il a donc trois contrôles et une planche dès aujourd'hui.
   ⚠️ ET IL MESURE CE QUI COMPTE VRAIMENT ICI : qu'un plan à trois pièces posées ne
   ressemble PAS à un plan vierge. C'est la seule promesse que cette feuille fait
   au joueur — « voilà où on en est » — et c'est la seule qu'on puisse casser sans
   s'en apercevoir. */
{
  console.log("\n7. LA FEUILLE DE PLAN (454)\n");
  const PW = 288, PH = 192;
  const sheet = (n) => {
    const sur = makeCanvas(PW, PH);
    S.drawStarPlan(sur.ctx, 0, 0, PW, PH, C.STAR_SHIP_ORDER.map((_, i) => i < n), 0);
    return sur;
  };
  /* ⚠️ « ENCRE » ET PAS « MATIÈRE » : sur une feuille opaque, tout est opaque. Ce
     qui distingue le bateau du papier est sa CLARTÉ — on compte donc les pixels
     franchement plus clairs que le fond, ce qui survit à un changement de bleu. */
  const inkOf = (cv) => { const d = cv.px; let n = 0;
    for (let i = 0; i < PW * PH; i++) {
      const l = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      if (l > 90) n++;
    }
    return n; };
  const vide = inkOf(sheet(0)), plein = inkOf(sheet(N));
  ok(vide > 600, "une feuille vierge montre déjà le bateau en fantôme", `${vide} px d'encre`);
  ok(plein > vide * 1.15, "⚠️ un bateau avancé se lit franchement plus dense qu'un plan vierge",
     `${vide} px → ${plein} px (×${(plein / vide).toFixed(2)})`);
  /* ⚠️ ET LA PROGRESSION EST MONOTONE : chaque pièce posée AJOUTE de l'encre. Sans
     ce balayage, une pièce qui en effacerait une autre passerait inaperçue — c'est
     l'invariant que ce banc mesure déjà sur le navire lui-même (32 masques), et il
     n'y a aucune raison que la feuille y échappe. */
  let mono = true, prev = -1;
  for (let n = 0; n <= N; n++) { const v = inkOf(sheet(n)); if (v < prev - 40) mono = false; prev = v; }
  ok(mono, "…et poser une pièce n'en efface jamais une autre sur le plan");
  /* La feuille ne doit pas déborder : elle est peinte dans un rectangle donné, et
     un panneau React la posera à des tailles variables. */
  {
    const sur = makeCanvas(PW + 40, PH + 40);
    S.drawStarPlan(sur.ctx, 20, 20, PW, PH, C.STAR_SHIP_ORDER.map(() => true), 0);
    const d = sur.px; let outside = 0;
    for (let y = 0; y < PH + 40; y++) for (let x = 0; x < PW + 40; x++)
      if ((x < 20 || y < 20 || x >= 20 + PW || y >= 20 + PH) && d[(y * (PW + 40) + x) * 4 + 3] > 8) outside++;
    ok(outside === 0, "⚠️ le plan tient dans le rectangle qu'on lui donne", `${outside} px dehors`);
  }
  const board = makeCanvas((PW + 12) * 3 + 12, PH + 24);
  board.ctx.fillStyle = "#20242c"; board.ctx.fillRect(0, 0, board.width, board.height);
  [0, 3, N].forEach((n, k) => S.drawStarPlan(board.ctx, 12 + k * (PW + 12), 12, PW, PH,
                                             C.STAR_SHIP_ORDER.map((_, i) => i < n), 0));
  const zp = scale(board.px, board.width, board.height, 2);
  writePNG(path.join(OUT, "navire-plan.png"), zp.px, zp.W, zp.H);
  console.log(`\n  planche : tools/out/navire-plan.png (${zp.W}×${zp.H}, ×2) — zéro, trois et cinq pièces`);
}

console.log(`\n${fails ? `❌ ${fails} contrôle(s) en échec` : "✅ tout est vert"}\n`);
process.exit(fails ? 1 : 0);
