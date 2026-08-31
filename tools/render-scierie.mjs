/* =============================================================================
   render-scierie.mjs — TRISTAN À SA SCIE, REGARDÉ SANS GPU.
   -----------------------------------------------------------------------------
       node tools/render-scierie.mjs

   ⚠️⚠️⚠️ POURQUOI IL NAÎT, ET C'EST LA TREIZIÈME FORME DU « BANC QUI PASSE »
   PRISE À L'AVANCE. `verify-scierie` joue la mécanique et rend un beau chiffre
   pendant que le personnage peut se désassembler à l'écran : une manche est un
   jeu de nombres, et un jeu de nombres n'a pas de silhouette. Le maire l'a payé
   le 2026-08-31 (113/113 sur une posture debout qui se cassait à la taille) ;
   ici le banc de rendu est écrit AVANT que quiconque ait ouvert la scène, ce
   qui est la seule façon de ne pas repayer une leçon déjà écrite.

   ⚠️⚠️ ET IL BALAIE UN CARRÉ, PAS UNE LISTE DE POSES. C'est la différence avec
   `render-maire`, et elle est imposée par le geste : le maire a SEPT postures
   nommées, Tristan en a une infinité — sa posture est une fonction CONTINUE de
   deux variables (où est la lame, à quelle profondeur est le trait). Trois
   exemples au vert ne diraient rien ; on balaie donc les deux axes, et c'est
   l'application directe de la règle du 449 : *quand on peut énoncer une
   propriété, on la balaie ; on n'écrit pas trois exemples.*

   CE QU'IL MESURE — et chaque grandeur a été payée ailleurs :

     1. LA SILHOUETTE DE TRISTAN EST D'UN SEUL TENANT (connexité à huit), sur
        toute la course et toute la profondeur. C'est la mesure d'îlots de
        `render-etoile` §2 portée à un corps articulé.

     2. LES MAINS SONT SUR LES POIGNÉES. `solveArm` BORNE une cible hors de
        portée au lieu de jeter — il le fait exprès — donc une cible trop loin
        ne plante pas : elle MENT, et la main s'arrête à quinze centimètres du
        manche. On mesure l'écart entre la main RENDUE et la poignée RÉELLE, en
        centimètres, pour Tristan ET pour nous.

     3. LA POSTURE DEMANDÉE EST ATTEIGNABLE. `tristanLean` et `playerPost` sont
        pures : on les balaie et on vérifie que la distance épaule-main reste
        dans le disque du bras. C'est ce contrôle qui décide des nombres du §1
        de `scierieAtelier.js`, et pas l'inverse.

     4. LES PIEDS NE BOUGENT PAS ET LES JAMBES LES ATTEIGNENT, genou plié VERS
        L'AVANT. Un genou qui plie à l'envers est le défaut le plus violent
        qu'un personnage puisse avoir, et `solveArm` CHOISIT son plan de
        flexion — donc il peut le choisir de travers sans rien casser.

     5. LA LAME EST TENUE PAR SES DEUX BOUTS. `bladeFlex` doit s'annuler en
        u = ±1, sinon la lame sort des mains qui la tiennent — et elle en
        sortirait d'autant plus qu'on la fléchit, c'est-à-dire exactement quand
        on la regarde.

     6. RIEN DE TRISTAN NE TRAVERSE LE MADRIER NI SES CHEVALETS, en mètres
        (théorème des axes séparateurs). ⚠️ Corollaire connu et écrit avant de
        s'y fier : *ce qui déborde se compte en pixels, ce qui s'enfonce se
        compte en mètres* — une main dans une planche ne fait pas d'îlot.

     7. AUCUN PIXEL DE TRISTAN SUR LE BORD DU CADRE DU JOUEUR (§4 de
        `CLAUDE.md`, payé trois fois dans le seul zip 433).

   CE QU'IL NE MESURE PAS, ET IL FAUT LE DIRE AVANT DE S'Y FIER (§14.5) :
     · NI ombre portée, NI spéculaire, NI anticrénelage ; les textures sont
       réduites à leur couleur moyenne. Il ne juge donc PAS l'éclairage — le §8
       de `CLAUDE.md` (l'écart, jamais la moyenne) reste hors de sa portée, et
       le seul moyen de juger la lumière de cet atelier est de l'ouvrir dans un
       navigateur.
     · il ne joue AUCUNE transition : il pose des ARRIVÉES. Le lissage
       d'affichage d'`applySaw` est court-circuité en appelant la fonction deux
       fois avec un grand `dt`, ce qui la fait converger — c'est honnête pour
       une posture, ça ne dit rien d'un mouvement.
     · il ne voit NI la sciure, NI les rais de lumière, NI la secousse : ce sont
       des effets additifs et des particules, que ce rastériseur ignore.
   ============================================================================= */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writePNG } from "./lib-canvas.mjs";
import { loadTHREE, renderScene, collectTriangles, islands, worldBox, obbOf, obbDepth } from "./lib-3d.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

/* ⚠️ LA COPIE PART DANS `os.tmpdir()`, PAS DANS `tools/.cache/` : sept des
   dix-huit bancs salissent l'arbre de travail en tournant, et `git status`
   cesse alors d'être un contrôle de propreté utilisable. C'est le motif de
   `render-maire`, repris tel quel. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "scierie3d-"));
const copied = new Set();
const copy = (n) => {
  if (copied.has(n)) return;
  copied.add(n);
  const src = fs.readFileSync(path.join(ROOT, "components", "ferme", n + ".js"), "utf8");
  fs.writeFileSync(path.join(tmp, n + ".js"), src.replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.js"'));
  for (const m of src.matchAll(/from "\.\/([A-Za-z0-9_]+)"/g)) copy(m[1]);
};
copy("scierieAtelier");
copy("scierie");

const THREE = loadTHREE(ROOT);
const A = await import(pathToFileURL(path.join(tmp, "scierieAtelier.js")).href);
const SC = await import(pathToFileURL(path.join(tmp, "scierie.js")).href);
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
const cm = (m) => (m * 100).toFixed(1) + " cm";

/* ═══ UNE POLICE DE TROIS PIXELS SUR CINQ. `fillText` n'existe pas ici. ═══ */
const FONT = {
  A: "111101111101101", B: "110101110101110", C: "111100100100111", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "111100101101111", H: "101101111101101",
  I: "111010010010111", J: "001001001101111", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "111101101101111", P: "111101111100100",
  Q: "111101101111011", R: "111101110101101", S: "111100111001111", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111",
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111",
  4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001001001001",
  8: "111101111101111", 9: "111101111001111",
  " ": "000000000000000", "-": "000000111000000", ".": "000000000000010", ",": "000000000010100",
  ":": "000010000010000", "/": "001001010100100", "(": "011100100100011", ")": "110001001001110",
  "+": "000010111010000", "?": "111001010000010", "!": "010010010000010", "=": "000111000111000",
  "%": "101001010100101", "*": "101010111010101",
};
function text(px, W, H, s, x0, y0, k, rgb) {
  let x = x0;
  for (const ch of String(s).toUpperCase()) {
    const g = FONT[ch] || FONT["?"];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      if (g[r * 3 + c] !== "1") continue;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        const X = x + c * k + dx, Y = y0 + r * k + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const i = (Y * W + X) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
      }
    }
    x += 4 * k;
  }
}
function blit(dst, DW, DH, src, SW, SH, ox, oy) {
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const X = ox + x, Y = oy + y;
    if (X < 0 || Y < 0 || X >= DW || Y >= DH) continue;
    const s = (y * SW + x) * 4, d = (Y * DW + X) * 4;
    dst[d] = src[s]; dst[d + 1] = src[s + 1]; dst[d + 2] = src[s + 2]; dst[d + 3] = 255;
  }
}

/* ═══ LA SCÈNE ══════════════════════════════════════════════════════════════ */
const shop = A.buildShop(THREE, {});
const scene = new THREE.Scene();
scene.add(shop.root);

/* qui appartient à Tristan : c'est ce marquage, et lui seul, qui permet de
   mesurer une silhouette sans que l'atelier ne s'en mêle */
/* ⚠️⚠️ LES RAIS DE LUMIÈRE SORTENT DE LA SCÈNE AVANT TOUTE MESURE. Ce
   rastériseur n'a NI transparence NI mélange additif (son en-tête le dit) : il
   peint donc trois plans additifs à 5 % d'opacité comme trois panneaux OPAQUES
   gris clair, qui recouvrent la moitié de l'atelier. Ce n'est pas un défaut du
   jeu, c'est une limite de l'outil — et un banc qui laisserait ça en place
   jugerait sa propre incapacité. */
shop.root.remove(shop.shafts);

const MAN = new Set();
shop.man.man.traverse((o) => MAN.add(o));
const tagOf = (o) => (MAN.has(o) ? 1 : 2);

function camera(pos, look, fov, aspect) {
  const c = new THREE.PerspectiveCamera(fov, aspect, 0.04, 40);
  c.position.set(pos[0], pos[1], pos[2]);
  c.lookAt(look[0], look[1], look[2]);
  c.updateMatrixWorld(true);
  return c;
}

/* ⚠️⚠️ ON POSE UNE ARRIVÉE, PAS UNE TRANSITION. `applySaw` lisse tout ce qu'il
   affiche : appelé une fois avec un `dt` d'image il rendrait la position de
   DÉPART, et le banc mesurerait un homme qui n'a pas encore bougé. On l'appelle
   donc plusieurs fois avec un grand pas, ce qui le fait converger sur sa cible.
   *Un banc qui mesure un état lissé doit d'abord attendre que le lissage ait
   fini* — sinon il mesure sa propre impatience. */
function pose(bx, cut, extra) {
  const s = SC.sawInit({ part: "hull" });
  s.bx = bx; s.cut = cut;
  Object.assign(s, extra || {});
  let out = null;
  for (let i = 0; i < 14; i++) out = A.applySaw(shop, s, 3.0, 0.05);
  shop.root.updateMatrixWorld(true);
  return { s, out };
}
function worldOf(o) {
  o.updateMatrixWorld(true);
  return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
}

const R = A.REACH, S = A.SHOP;
/* ⚠️ LE BALAYAGE EST LE MÊME PARTOUT DANS CE FICHIER : neuf positions de lame ×
   cinq profondeurs de trait. Écrire deux grilles différentes ferait passer un
   contrôle sur des cas que l'autre ne voit pas — le défaut « il se donne un
   périmètre et excuse ce qui déborde » (439). */
const BXS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
const CUTS = [0, 0.25, 0.5, 0.75, 0.99];

/* ─────────────────────────────────────────────────────────────────────────
   1. LA POSTURE DEMANDÉE EST ATTEIGNABLE — le calcul avant le dessin
   ───────────────────────────────────────────────────────────────────────── */
section("1. LA POSTURE EST ATTEIGNABLE — balayage course × profondeur");
{
  let worstT = 0, worstTat = "", worstU = 0, worstUat = "", nT = 0;
  let minT = 9, minU = 9;
  for (const bx of BXS) for (const cut of CUTS) {
    /* la poignée, exactement là où le dessin la mettra */
    const teeth = S.beamTop - cut * S.beamH;
    const hy = teeth + S.bladeW / 2 + 0.008 + S.gripUp;
    const hzT = -S.bladeSpan + bx * S.bladeTravel;
    const hzU = S.bladeSpan + bx * S.bladeTravel;
    const lt = A.tristanLean(hzT, hy), pu = A.playerPost(hzU, hy);
    nT++;
    if (lt.d > worstT) { worstT = lt.d; worstTat = `bx ${bx} cut ${cut}`; }
    if (pu.d > worstU) { worstU = pu.d; worstUat = `bx ${bx} cut ${cut}`; }
    minT = Math.min(minT, lt.d); minU = Math.min(minU, pu.d);
  }
  ok(`la main de Tristan reste dans la portée du bras (${nT} cas balayés)`,
     worstT <= R.arm, `pire ${cm(worstT)} pour ${cm(R.arm)} — ${worstTat}`);
  ok("…et jamais plus près que le repli minimal du coude",
     minT >= R.armMin, `au plus près ${cm(minT)} pour ${cm(R.armMin)}`);
  ok("notre main reste dans la portée de notre bras",
     worstU <= R.arm, `pire ${cm(worstU)} pour ${cm(R.arm)} — ${worstUat}`);
  ok("…et jamais plus près que notre repli minimal", minU >= R.armMin, `au plus près ${cm(minU)}`);

  /* ⚠️ LA MARGE EST MESURÉE ET AFFICHÉE : un contrôle qui passe à un millimètre
     près passe par chance, et il faut le savoir AVANT qu'un réglage le fasse
     tomber. C'est le pendant du « publier combien on en a lu » du 441. */
  ok("il reste de la marge (au moins 2 cm) sur les deux",
     R.arm - Math.max(worstT, worstU) >= 0.02, `marge ${cm(R.arm - Math.max(worstT, worstU))}`);
}

/* ─────────────────────────────────────────────────────────────────────────
   2. LES JAMBES ATTEIGNENT DES PIEDS QUI NE BOUGENT PAS
   ───────────────────────────────────────────────────────────────────────── */
section("2. LES APPUIS — les pieds sont plantés, les jambes suivent");
{
  let worst = 0, at = "", moved = 0, backKnee = 0;
  const first = {};
  for (const bx of BXS) for (const cut of CUTS) {
    const { s } = pose(bx, cut);
    const ln = A.tristanLean(worldOf(shop.saw.gripHim.hold).z, worldOf(shop.saw.gripHim.hold).y);
    for (const [k, foot] of [["L", shop.feet.L], ["R", shop.feet.R]]) {
      const hipY = ln.hipY, hipZ = ln.hipZ;
      const d = Math.hypot(S.manX + (k === "L" ? -S.footDX : S.footDX) - foot[0],
                           hipY - foot[1], hipZ - foot[2]);
      if (d > worst) { worst = d; at = `${k} bx ${bx} cut ${cut}`; }
      /* le pied RENDU : il ne doit pas avoir bougé d'un millimètre */
      const w = worldOf(k === "L" ? shop.man.legL.ankle : shop.man.legR.ankle);
      const off = Math.hypot(w.x - foot[0], w.y - foot[1], w.z - foot[2]);
      moved = Math.max(moved, off);
      /* ⚠️ LE GENOU DOIT ÊTRE DEVANT LA DROITE HANCHE→CHEVILLE, pas devant la
         hanche : l'appui arrière est légitimement derrière elle. On projette
         donc le genou sur le segment et on regarde de quel côté il s'en écarte
         en Z — c'est la seule mesure qui vaille pour les deux jambes. */
      const kn = worldOf(k === "L" ? shop.man.legL.knee : shop.man.legR.knee);
      const hp = worldOf(k === "L" ? shop.man.legL.hip : shop.man.legR.hip);
      const ax = foot[1] - hp.y, az = foot[2] - hp.z;
      const L2 = ax * ax + az * az || 1e-9;
      const tt = ((kn.y - hp.y) * ax + (kn.z - hp.z) * az) / L2;
      const outZ = kn.z - (hp.z + az * tt);
      if (outZ < 0.004) backKnee++;
    }
  }
  ok(`la hanche reste dans la portée de la jambe (${BXS.length * CUTS.length * 2} appuis)`,
     worst <= R.leg, `pire ${cm(worst)} pour ${cm(R.leg)} — ${at}`);
  ok("le pied rendu est exactement sur son appui", moved < 0.006, `écart max ${cm(moved)}`);
  /* ⚠️ CE CONTRÔLE EST LE SEUL QUI NE SE DISCUTE PAS : un genou derrière la
     hanche est un genou qui plie à l'envers, et aucune considération de style
     ne l'excuse. Il vaut la peine d'exister parce que `solveArm` CHOISIT son
     plan de flexion — il peut donc le choisir de travers sans rien casser. */
  ok("aucun genou ne plie vers l'arrière", backKnee === 0, `${backKnee} cas`);
}

/* ─────────────────────────────────────────────────────────────────────────
   3. LES MAINS SONT SUR LES POIGNÉES — la garde qui borne, prise en flagrant
   ───────────────────────────────────────────────────────────────────────── */
section("3. LES QUATRE MAINS TIENNENT L'OUTIL");
{
  let worst = 0, at = "", n = 0;
  for (const bx of BXS) for (const cut of CUTS) {
    pose(bx, cut);
    const hT = worldOf(shop.saw.gripHim.hold), hU = worldOf(shop.saw.gripUs.hold);
    const cases = [
      ["Tristan haut", shop.man.armR.hd, [hT.x + 0.010, hT.y + S.handGap, hT.z - 0.045]],
      ["Tristan bas", shop.man.armL.hd, [hT.x - 0.010, hT.y - S.handGap, hT.z - 0.045]],
      ["nous haut", shop.hands.armR.hd, [hU.x + 0.010, hU.y + S.handGap, hU.z + 0.045]],
      ["nous bas", shop.hands.armL.hd, [hU.x - 0.010, hU.y - S.handGap, hU.z + 0.045]],
    ];
    for (const [name, hd, tgt] of cases) {
      const w = worldOf(hd);
      const d = Math.hypot(w.x - tgt[0], w.y - tgt[1], w.z - tgt[2]);
      n++;
      if (d > worst) { worst = d; at = `${name} — bx ${bx} cut ${cut}`; }
    }
  }
  ok(`chaque main est là où la pose l'écrit (${n} mains)`, worst < 0.012,
     `écart max ${cm(worst)} — ${at}`);
  /* la paume est sur la surface du manche, pas sur son axe : la distance de la
     main à l'AXE doit donc valoir l'épaisseur de la poigne, jamais zéro */
  pose(0, 0.5);
  const hT = worldOf(shop.saw.gripHim.hold), w = worldOf(shop.man.armR.hd);
  ok("la paume est posée sur le manche, pas dedans",
     Math.abs(w.z - hT.z) > 0.030 && Math.abs(w.z - hT.z) < 0.070, cm(Math.abs(w.z - hT.z)));
}

/* ─────────────────────────────────────────────────────────────────────────
   4. LA LAME EST TENUE PAR SES DEUX BOUTS
   ───────────────────────────────────────────────────────────────────────── */
section("4. LA LAME — souple au milieu, tenue aux poignées");
{
  const f = { bow: 0.05, whip: 0.05, phase: 1.3, sag: 0.05 };
  const e0 = A.bladeFlex(-1, f), e1 = A.bladeFlex(1, f);
  ok("la déformée s'annule aux deux poignées",
     Math.hypot(e0.x, e0.y) < 1e-9 && Math.hypot(e1.x, e1.y) < 1e-9,
     `${cm(Math.hypot(e0.x, e0.y))} / ${cm(Math.hypot(e1.x, e1.y))}`);
  let mx = 0;
  for (let i = 0; i <= 200; i++) {
    const u = -1 + (i / 100);
    const g = A.bladeFlex(u, f);
    mx = Math.max(mx, Math.hypot(g.x, g.y));
  }
  /* ⚠️ UNE BORNE HAUTE, ET C'EST ELLE QUI COMPTE : une lame qui prend dix
     centimètres de ventre ne se lit plus comme de l'acier, elle se lit comme un
     ruban. Le fuseau doit rester crédible même au pire coincement. */
  ok("le ventre reste crédible pour de l'acier (< 12 cm)", mx < 0.12, `max ${cm(mx)}`);
  /* la lame reste dans son trait : elle ne peut jamais monter au-dessus du
     madrier ni descendre sous lui */
  /* ⚠️⚠️ ON MESURE L'ACIER, PAS L'OUTIL : le premier jet prenait la boîte de
     `blade`, qui contient les deux POIGNÉES — 34 cm de manche au-dessus de la
     lame — et il annonçait donc une lame « qui monte à 1,41 m » pour un madrier
     qui s'arrête à 0,86. Le contrôle était rouge et il avait tort. *Un banc qui
     mesure un groupe mesure aussi tout ce qu'on y a rangé.* */
  let hi = -9, lo = 9;
  for (const cut of CUTS) {
    pose(0, cut);
    for (const g of shop.saw.segs) { const b = worldBox(THREE, g); hi = Math.max(hi, b.max.y); lo = Math.min(lo, b.min.y); }
  }
  ok("les dents restent dans l'épaisseur du madrier",
     lo >= S.beamTop - S.beamH - 0.05 && hi <= S.beamTop + S.bladeW + 0.06,
     `de ${cm(lo)} à ${cm(hi)} pour un madrier ${cm(S.beamTop - S.beamH)}→${cm(S.beamTop)}`);
  /* et elle ne sort jamais de la course annoncée */
  let zmin = 9, zmax = -9;
  for (const bx of [-1, 1]) { pose(bx, 0.5); for (const g of shop.saw.segs) { const b = worldBox(THREE, g); zmin = Math.min(zmin, b.min.z); zmax = Math.max(zmax, b.max.z); } }
  ok("la lame reste dans sa course",
     zmin > -(S.bladeSpan + S.bladeTravel) - 0.12 && zmax < (S.bladeSpan + S.bladeTravel) + 0.12,
     `${cm(zmin)} → ${cm(zmax)}`);
}

/* ─────────────────────────────────────────────────────────────────────────
   5. RIEN DE TRISTAN NE TRAVERSE LE BOIS
   ───────────────────────────────────────────────────────────────────────── */
section("5. LES INTERPÉNÉTRATIONS — ce qui s'enfonce se compte en mètres");
{
  /* le madrier et ses deux chevalets, en boîtes orientées */
  const solids = [];
  shop.beam.beam.traverse((o) => { if (o.isMesh) solids.push(["madrier", obbOf(THREE, o)]); });
  const parts = [];
  for (const k of ["chest", "head", "legL", "legR", "armL", "armR"]) {
    const node = shop.man[k];
    const obj = node.sh || node.hip || node;
    (obj.parent === shop.man.man || true) && obj.traverse((o) => { if (o.isMesh) parts.push([k, o]); });
  }
  let worst = 0, at = "", n = 0;
  for (const cut of [0, 0.5, 0.99]) for (const bx of [-1, -0.5, 0, 0.5, 1]) {
    pose(bx, cut);
    for (const [pk, mesh] of parts) {
      const P = obbOf(THREE, mesh);
      for (const [sk, So] of solids) {
        const d = obbDepth(THREE, P, So);
        n++;
        if (d > worst) { worst = d; at = `${pk} dans ${sk} — bx ${bx} cut ${cut}`; }
      }
    }
  }
  /* ⚠️ UN CENTIMÈTRE DE TOLÉRANCE, PAS ZÉRO : les boîtes orientées d'un cylindre
     débordent légitimement du cylindre, et une tolérance nulle accuserait la
     géométrie de l'outil plutôt que celle du personnage. */
  ok(`aucun morceau de Tristan dans le bois (${n} paires)`, worst < 0.012,
     `enfoncement max ${cm(worst)} — ${at}`);
}

/* ─────────────────────────────────────────────────────────────────────────
   6. LA SILHOUETTE + LA PLANCHE DE CONTACT
   ───────────────────────────────────────────────────────────────────────── */
section("6. LA SILHOUETTE DE TRISTAN EST D'UN SEUL TENANT");
const TW = 280, TH = 400, PAD = 8, HEAD = 20;
/* ⚠️⚠️ LES TROIS CAMÉRAS ONT ÉTÉ RECULÉES APRÈS MESURE, ET LE DÉFAUT QU'ELLES
   ONT PRODUIT VAUT D'ÊTRE ÉCRIT : à la première distance, l'épaule de Tristan
   SORTAIT du cadre sur deux poses, et le contrôle d'îlots annonçait « 2 îlots,
   6 px » — c'est-à-dire un membre détaché. Il n'y avait aucun membre détaché :
   c'était le CADRE qui coupait la silhouette en deux, six pixels dans un coin.
   *Un contrôle de silhouette mesuré dans un cadre trop serré accuse le
   personnage de ce que fait le cadrage.* D'où le contrôle de bord ci-dessous,
   qui nomme le vrai coupable au lieu de laisser accuser l'autre. */
/* ╔═══════════════════════════════════════════════════════════════════════════
   ║ ⚠️⚠️⚠️ LES CAMÉRAS DE LA PLANCHE SUIVENT LE PERSONNAGE — ET IL A FALLU CINQ
   ║ RECADRAGES RATÉS POUR COMPRENDRE POURQUOI.
   ╚═══════════════════════════════════════════════════════════════════════════
   Tristan ne pose pas : il TRAVAILLE. Entre le trait haut au bout de sa course
   et le trait profond bras tendus, son bassin se déplace de 31 cm et descend de
   37 — sa boîte englobante change donc de taille ET de place d'une vignette à
   l'autre. Un jeu de trois caméras fixes ne peut pas cadrer les quinze : on en
   recule une, la suivante déborde, et on recommence. C'est le même piège que la
   « position réglée à la main » de `DESSIN.md`.
   ⚠️ La parade est de DÉRIVER la distance de ce qu'il y a à cadrer : on prend sa
   boîte, on calcule le recul qui la fait tenir avec 18 % de marge, et on vise
   son centre. La planche devient du même coup COMPARABLE — quinze vignettes à
   la même échelle apparente, ce qu'un jeu de caméras fixes ne donne jamais. */
const ANGLES = [
  { name: "de face", dir: [0.00, 0.10, 1.00], fov: 36 },
  { name: "3/4", dir: [0.86, 0.16, 0.62], fov: 36 },
  { name: "profil", dir: [1.00, 0.06, 0.02], fov: 34 },
];
function fitCam(A, aspect) {
  const b = worldBox(THREE, shop.man.man);
  const c = [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2];
  const ext = Math.max(b.max.y - b.min.y, (b.max.x - b.min.x) / aspect, (b.max.z - b.min.z) / aspect);
  const d = (ext / 2) / Math.tan((A.fov * Math.PI) / 360) * 1.18;
  const n = Math.hypot(A.dir[0], A.dir[1], A.dir[2]);
  return camera([c[0] + (A.dir[0] / n) * d, c[1] + (A.dir[1] / n) * d, c[2] + (A.dir[2] / n) * d],
                c, A.fov, aspect);
}
const COLS = [[-1, 0], [-0.5, 0.25], [0, 0.5], [0.5, 0.75], [1, 0.99]];
const SW = COLS.length * (TW + PAD) + PAD;
const SH = HEAD + ANGLES.length * (TH + HEAD + PAD) + PAD;
const sheet = new Uint8ClampedArray(SW * SH * 4);
for (let i = 0; i < SW * SH; i++) { sheet[i * 4] = 26; sheet[i * 4 + 1] = 28; sheet[i * 4 + 2] = 32; sheet[i * 4 + 3] = 255; }
text(sheet, SW, SH, "TRISTAN A LA SCIE - COURSE DE LAME X PROFONDEUR DE TRAIT", PAD, 6, 3, [230, 226, 214]);
for (let ai = 0; ai < ANGLES.length; ai++) {
  const An = ANGLES[ai];
  const y0 = HEAD + ai * (TH + HEAD + PAD) + HEAD;
  text(sheet, SW, SH, An.name, PAD, y0 - HEAD + 4, 2, [180, 190, 205]);
  for (let ci = 0; ci < COLS.length; ci++) {
    const [bx, cut] = COLS[ci];
    pose(bx, cut);
    const cam = fitCam(An, TW / TH);
    const tris = collectTriangles(THREE, shop.root, tagOf).filter((t) => t.tag === 1);
    const r = renderScene(THREE, shop.root, cam, TW, TH, { tris, tagOf, bg: [198, 200, 206] });
    const isl = islands(r.id, TW, TH, 1).filter((c) => c.n >= 6);
    const x0 = PAD + ci * (TW + PAD);
    blit(sheet, SW, SH, r.px, TW, TH, x0, y0);
    /* ⚠️ LE BORD D'ABORD : sans lui, un cadrage trop serré se lit comme un
       membre détaché (mesuré, et le contrôle a menti pendant trois passes). */
    let edge = 0;
    for (let x = 0; x < TW; x++) { if (r.id[x] === 1) edge++; if (r.id[(TH - 1) * TW + x] === 1) edge++; }
    for (let y = 0; y < TH; y++) { if (r.id[y * TW] === 1) edge++; if (r.id[y * TW + TW - 1] === 1) edge++; }
    const bad = isl.length !== 1 || edge > 0;
    text(sheet, SW, SH, `BX ${bx} CUT ${cut}` + (bad ? (edge ? "  HORS CADRE" : `  ${isl.length} ILOTS`) : ""),
         x0 + 4, y0 - 15, 2, bad ? [235, 110, 96] : [200, 208, 220]);
    ok(`bx ${String(bx).padStart(5)} cut ${cut} ${An.name} : entier dans le cadre`, edge === 0, `${edge} px au bord`);
    ok(`bx ${String(bx).padStart(5)} cut ${cut} ${An.name} : une seule masse`, isl.length === 1,
       isl.length === 1 ? `${isl[0].n} px` : isl.map((c) => c.n + " px").join(" + "));
  }
}
fs.mkdirSync(OUT, { recursive: true });
writePNG(path.join(OUT, "scierie-tristan.png"), sheet, SW, SH);

/* ─────────────────────────────────────────────────────────────────────────
   7. LA VUE DU JOUEUR — l'atelier tel qu'il s'ouvre
   ───────────────────────────────────────────────────────────────────────── */
section("7. LES TROIS VUES DU JOUEUR");
{
  const VW = 640, VH = 360;
  const keys = A.VIEW_KEYS;
  const gw = VW + PAD * 2, gh = HEAD + keys.length * (VH + HEAD + PAD) + PAD;
  const shot = new Uint8ClampedArray(gw * gh * 4);
  for (let i = 0; i < gw * gh; i++) { shot[i * 4] = 20; shot[i * 4 + 1] = 22; shot[i * 4 + 2] = 26; shot[i * 4 + 3] = 255; }
  text(shot, gw, gh, "L ATELIER DE TRISTAN - LES TROIS VUES", PAD, 6, 3, [230, 226, 214]);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const { out } = pose(-0.35, 0.55);
    /* ⚠️ LE POSTE EST LA VUE **DÉRIVÉE**, pas celle de la table : c'est la seule
       façon de regarder ce que le joueur verra vraiment (`applySaw` rend son
       cadrage). Prendre `VIEWS.poste` ici aurait mesuré un cadrage nominal que
       personne ne voit — le banc qui juge sa propre maquette (439). */
    /* ⚠️ NOS BRAS N'EXISTENT QU'AU POSTE, et le banc doit le jouer aussi : deux
       avant-bras flottants vus de trois quarts depuis le fond de l'atelier
       seraient pires que rien (ils se posaient sur les chevalets, mesuré). */
    shop.hands.us.visible = k === "poste";
    const V = k === "poste" ? out.cam : A.VIEWS[k];
    const cam = camera(V.pos, V.look, 47, VW / VH);
    const r = renderScene(THREE, shop.root, cam, VW, VH, { tagOf });
    const y0 = HEAD + i * (VH + HEAD + PAD) + HEAD;
    blit(shot, gw, gh, r.px, VW, VH, PAD, y0);
    text(shot, gw, gh, k, PAD, y0 - 15, 2, [200, 208, 220]);
    /* ⚠️ AUCUN PIXEL DE TRISTAN SUR LE BORD (§4 de CLAUDE.md, payé trois fois
       dans le seul zip 433). Il ne s'applique qu'aux vues où il doit tenir
       entier : au poste, on est TRÈS près de la scie et il est légitime que
       l'image le coupe — c'est un cadrage, pas un sprite. */
    if (k !== "poste") {
      let edge = 0;
      for (let x = 0; x < VW; x++) { if (r.id[x] === 1) edge++; if (r.id[(VH - 1) * VW + x] === 1) edge++; }
      for (let y = 0; y < VH; y++) { if (r.id[y * VW] === 1) edge++; if (r.id[y * VW + VW - 1] === 1) edge++; }
      ok(`vue « ${k} » : Tristan ne touche pas le bord du cadre`, edge === 0, `${edge} px`);
    }
    let seen = 0;
    for (let p = 0; p < VW * VH; p++) if (r.id[p] === 1) seen++;
    ok(`vue « ${k} » : on voit Tristan`, seen > 900, `${seen} px`);
  }
  writePNG(path.join(OUT, "scierie-vues.png"), shot, gw, gh);
}

/* ─────────────────────────────────────────────────────────────────────────
   8. LE DÉCOR TIENT DANS SON HANGAR
   ───────────────────────────────────────────────────────────────────────── */
section("8. LE DÉCOR — rien ne sort du hangar");
{
  pose(0, 0.5);
  const b = worldBox(THREE, shop.props.props);
  ok("le mobilier est à l'intérieur des murs",
     b.min.x > S.x0 - 0.15 && b.max.x < S.x1 + 0.15 && b.min.z > S.z0 - 0.15 && b.max.z < S.z1 + 0.15,
     `x ${cm(b.min.x)}→${cm(b.max.x)} · z ${cm(b.min.z)}→${cm(b.max.z)}`);
  ok("…et sous la charpente", b.max.y < S.ridge, cm(b.max.y));
  const mb = worldBox(THREE, shop.man.man);
  ok("Tristan a une taille d'homme", mb.max.y > 1.62 && mb.max.y < 1.95, `${cm(mb.max.y)} de haut`);
  ok("il a les pieds au sol", Math.abs(mb.min.y) < 0.02, cm(mb.min.y));
  /* la caméra bornée ne sort jamais du hangar, quoi qu'on lui demande */
  const p = new THREE.Vector3(99, 99, 99); A.clampCam(p);
  const q = new THREE.Vector3(-99, -99, -99); A.clampCam(q);
  ok("la caméra est bornée dans les deux sens",
     p.x < S.x1 && p.z < S.z1 && p.y < S.ridge && q.x > S.x0 && q.z > S.z0 && q.y > 0,
     `${cm(q.x)}→${cm(p.x)}`);
}

/* ─────────────────────────────────────────────────────────────────────────
   9. LES DEUX ARRÊTS — la planche qui tombe, la planche qui se fend
   ⚠️ ILS N'ONT AUCUN AUTRE ENDROIT OÙ SE VOIR. Ce sont les deux seuls instants
   de la manche où le décor CHANGE, et ce sont ceux que le joueur regarde le
   plus (l'un récompense, l'autre punit). Un banc qui ne peint que la posture
   les manquerait tous les deux — c'est la cinquième forme du « banc qui
   passe » : *il mesure ce qu'une chose EST et jamais QUAND elle est.*
   ───────────────────────────────────────────────────────────────────────── */
section("9. LA CHUTE ET LA RUPTURE");
{
  const VW = 560, VH = 315;
  const CASES = [
    ["en cours", { holdKind: "", hold: 0 }, 0.62],
    ["la planche tombe", { holdKind: "plank", hold: 50 }, 0.99],
    ["la planche se fend", { holdKind: "break", hold: 100, last: "break", lastAt: 0 }, 0.55],
  ];
  const gw = VW + PAD * 2, gh = HEAD + CASES.length * (VH + HEAD + PAD) + PAD;
  const im = new Uint8ClampedArray(gw * gh * 4);
  for (let i = 0; i < gw * gh; i++) { im[i * 4] = 20; im[i * 4 + 1] = 22; im[i * 4 + 2] = 26; im[i * 4 + 3] = 255; }
  text(im, gw, gh, "LES DEUX ARRETS", PAD, 6, 3, [230, 226, 214]);
  shop.hands.us.visible = true;
  const angles = [];
  for (let i = 0; i < CASES.length; i++) {
    const [name, extra, cut] = CASES[i];
    const { out } = pose(0.2, cut, extra);
    const cam = camera(out.cam.pos, out.cam.look, 47, VW / VH);
    const r = renderScene(THREE, shop.root, cam, VW, VH, { tagOf });
    const y0 = HEAD + i * (VH + HEAD + PAD) + HEAD;
    blit(im, gw, gh, r.px, VW, VH, PAD, y0);
    text(im, gw, gh, name, PAD, y0 - 15, 2, [200, 208, 220]);
    angles.push(shop.beam.drop.rotation.z);
  }
  writePNG(path.join(OUT, "scierie-arrets.png"), im, gw, gh);
  ok("la chute bascule pour de bon quand la planche est finie", angles[1] < -0.9, `${angles[1].toFixed(2)} rad`);
  ok("elle ne fait que craquer quand la planche se fend", angles[2] < -0.15 && angles[2] > -0.5, `${angles[2].toFixed(2)} rad`);
  ok("et elle est droite le reste du temps", Math.abs(angles[0]) < 0.02, `${angles[0].toFixed(3)} rad`);
}

console.log(`\nPNG : tools/out/scierie-tristan.png · tools/out/scierie-vues.png · tools/out/scierie-arrets.png`);
console.log(`\n${total - fails}/${total}`);
shop.dispose();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fails ? 1 : 0);
