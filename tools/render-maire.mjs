/* =============================================================================
   render-maire.mjs — LES SEPT POSTURES DU MAIRE, CÔTE À CÔTE. (2026-08-31)
   -----------------------------------------------------------------------------
       node tools/render-maire.mjs

   ⚠️⚠️⚠️ POURQUOI IL NAÎT, ET C'EST LA SEULE CHOSE À RETENIR : `verify-maire`
   REND 113/113 PENDANT QUE LA POSTURE DEBOUT SE DÉSASSEMBLE À L'ÉCRAN. Il
   vérifie que les sept postures EXISTENT et sont dessinables — c'est la
   jointure « sept clés de mécanique = sept clés de dessin » — et il ne peut
   pas, par construction, vérifier qu'elles S'ASSEMBLENT : une pose est un jeu
   de nombres, et un jeu de nombres n'a pas de silhouette.
   C'est la treizième forme du « un banc qui passe mesure autre chose » :
   ⚠️ **IL MESURE QU'UNE POSE EST DÉCLARÉE, JAMAIS QU'UN CORPS TIENT ENSEMBLE.**

   CE QU'IL MESURE — et chaque grandeur a été payée ailleurs :

     1. LA SILHOUETTE EST D'UN SEUL TENANT, en connexité à HUIT. C'est la mesure
        des îlots de `render-etoile` §2, portée d'un sprite à un corps articulé :
        un homme qui s'assemble rend UNE tache. Deux taches, c'est un membre
        détaché, et c'est la seule grandeur qui sépare « la pose existe » de
        « la pose tient ». ⚠️ Elle se mesure sur le MAIRE SEUL : mesurée dans la
        pièce, le bureau le coupe en deux légitimement, et le contrôle
        n'accuserait plus que le mobilier.

     2. LE BUSTE NE QUITTE PAS SON BASSIN. `rise` monte le TORSE ; les jambes,
        elles, sont filles de `man` et ne bougent jamais. Une pose qui écrit
        `rise: 0.13` sans lever les jambes fabrique un homme coupé à la taille,
        et aucun contrôle de table ne peut le voir — c'est le §4 de `CLAUDE.md`
        (« une grandeur de dessin ne doit pas entrer dans la collision ») pris
        par l'autre bout : ici une grandeur de MISE EN SCÈNE entre dans une
        chaîne d'os qui ne l'attendait pas.

     3. LA MAIN EST OÙ LA POSE L'ÉCRIT. `maireBureau.js` §6 promet en toutes
        lettres : *« une pose dit OÙ SONT SES MAINS »*, en mètres, en monde.
        `solveArm` BORNE la cible quand elle est hors de portée — il le fait
        exprès, un `acos` hors bornes ferait disparaître le bras entier — donc
        une cible trop loin ne plante pas : elle MENT, silencieusement, et la
        main s'arrête à quinze centimètres de là où le texte la place. On mesure
        donc l'écart entre la main RENDUE et la main ÉCRITE. *Une garde qui
        borne au lieu de jeter doit être mesurée, sinon elle cache ce qu'elle
        protège.*

     4. RIEN DU MAIRE NE TRAVERSE LE PLATEAU DU BUREAU. Une écharpe qui passe
        dans l'épaisseur du meuble se lit comme une écharpe DÉTACHÉE — c'est le
        même défaut que le z-fighting des revers, corrigé hors-zip, et il se
        mesure en mètres, pas en pixels.

     5. AUCUN PIXEL DU MAIRE SUR LE BORD DU CADRE, dans la vue du joueur. C'est
        le piège n°1 des sprites (§4 de `CLAUDE.md`, payé trois fois dans le
        seul zip 433) appliqué à un cadrage 3D : un crâne qui touche le haut de
        l'image est un crâne sur lequel la bulle de réplique va se rabattre —
        et `VIEWS.seat` porte déjà, en commentaire, la trace de ce réglage.

   CE QU'IL NE MESURE PAS, ET IL FAUT LE DIRE AVANT DE S'Y FIER (§14.5) :
     · il n'y a NI ombre portée, NI spéculaire, NI anticrénelage. Les textures
       sont réduites à leur couleur moyenne et `fillText` ne peint rien : la
       plaque du bureau y est muette, ce n'est pas un défaut du jeu.
     · il ne juge donc PAS l'éclairage. Le §8 de `CLAUDE.md` (l'écart, pas la
       moyenne) reste hors de portée de cet outil, et le seul moyen de juger la
       lumière de cette scène reste de l'ouvrir dans un navigateur.
     · il ne joue AUCUNE transition : `ease` glisse d'une pose à l'autre, et
       c'est en chemin qu'un bras peut traverser un torse. Ce banc regarde les
       sept ARRIVÉES.
   ============================================================================= */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writePNG } from "./lib-canvas.mjs";
import { loadTHREE, renderScene, collectTriangles, islands, worldBox, obbOf, obbDepth, boxObb } from "./lib-3d.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

/* ⚠️ LA COPIE PART DANS `os.tmpdir()`, PAS DANS `tools/.cache/`. Sept des
   dix-huit bancs salissent l'arbre de travail en tournant (dette datée du
   2026-08-31) : `git status` cesse alors d'être un contrôle de propreté, et un
   agent en bac à sable rend « 0 exécuté » sans que rien ne soit cassé. Celui-ci
   ne laisse derrière lui que ses PNG. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "maire3d-"));
const copied = new Set();
const copy = (n) => {
  if (copied.has(n)) return;
  copied.add(n);
  const src = fs.readFileSync(path.join(ROOT, "components", "ferme", n + ".js"), "utf8");
  fs.writeFileSync(path.join(tmp, n + ".js"), src.replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.js"'));
  for (const m of src.matchAll(/from "\.\/([A-Za-z0-9_]+)"/g)) copy(m[1]);
};
copy("maireBureau");
copy("maire");

const THREE = loadTHREE(ROOT);
const B = await import(pathToFileURL(path.join(tmp, "maireBureau.js")).href);
const M = await import(pathToFileURL(path.join(tmp, "maire.js")).href);

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
const cm = (m) => (m * 100).toFixed(1) + " cm";

/* ═══ UNE POLICE DE TROIS PIXELS SUR CINQ ═══════════════════════════════════
   ⚠️ Une planche de contact sans étiquettes oblige à compter les colonnes pour
   savoir laquelle est `window`, et on se trompe une fois sur deux. `fillText`
   n'existe pas ici (§ en-tête) : on peint les lettres. */
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
function hline(px, W, H, y, x0, x1, rgb, dash) {
  if (y < 0 || y >= H) return;
  for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
    if (dash && ((x >> 2) & 1)) continue;
    const i = (y * W + x) * 4;
    px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
  }
}

/* ═══ LA SCÈNE ══════════════════════════════════════════════════════════════ */
const rig = B.buildOffice(THREE, { plateLabel: "MAIRE", mayorName: "DELAUNAY" });
const scene = new THREE.Scene();
scene.add(rig.root);

/* qui appartient au maire : c'est ce marquage, et lui seul, qui permet de
   mesurer une silhouette sans que le mobilier ne s'en mêle */
const MAYOR = new Set();
rig.mayor.man.traverse((o) => MAYOR.add(o));
const tagOf = (o) => (MAYOR.has(o) ? 1 : 2);

function camera(pos, look, fov, aspect) {
  const c = new THREE.PerspectiveCamera(fov, aspect, 0.04, 40);
  c.position.set(pos[0], pos[1], pos[2]);
  c.lookAt(look[0], look[1], look[2]);
  c.updateMatrixWorld(true);
  return c;
}
function project(cam, x, y, z, W, H) {
  const v = new THREE.Vector3(x, y, z).project(cam);
  return [(v.x * 0.5 + 0.5) * W, (1 - (v.y * 0.5 + 0.5)) * H];
}

/* ⚠️ LA POSE EST POSÉE À SON ARRIVÉE, PAS GLISSÉE. `ease` met une seconde à
   converger ; ce banc regarde les sept CIBLES, et il le dit en tête. */
function setPose(key, t) {
  const p = B.poseTarget(key);
  const cur = {};
  for (const k in p) cur[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
  B.applyPose(rig, cur, t || 0);
  const f = B.faceTarget("cold");
  const fc = {}; for (const k in f) fc[k] = f[k];
  B.applyFace(rig, fc, t || 0, 0, 0);
  rig.root.updateMatrixWorld(true);
  return cur;
}

const KEYS = B.POSE_KEYS;
const R = B.ROOM;

/* ─────────────────────────────────────────────────────────────────────────
   PLANCHE 1 — LE MAIRE SEUL, TROIS ANGLES, SEPT COLONNES.
   C'est LA planche que la reprise réclame : « peindre les sept poses côte à
   côte ». Fond clair volontairement : le costume est presque noir, et une
   silhouette sombre sur fond sombre ne montre pas ses trous.
   ───────────────────────────────────────────────────────────────────────── */
const TW = 300, TH = 430, PAD = 8, HEAD = 22;
const ANGLES = [
  { name: "de face",   pos: [0.00, 1.05, -0.62], look: [0.00, 1.00, -3.02], fov: 44 },
  { name: "3/4 droite", pos: [1.85, 1.42, -1.30], look: [-0.05, 1.00, -3.02], fov: 40 },
  { name: "de profil",  pos: [2.30, 1.05, -3.02], look: [0.00, 1.00, -3.02], fov: 44 },
];
const SW = KEYS.length * (TW + PAD) + PAD;
const SH = HEAD + ANGLES.length * (TH + HEAD + PAD) + PAD;
const sheet = new Uint8ClampedArray(SW * SH * 4).fill(255);
for (let i = 0; i < SW * SH; i++) { sheet[i * 4] = 28; sheet[i * 4 + 1] = 30; sheet[i * 4 + 2] = 34; sheet[i * 4 + 3] = 255; }
text(sheet, SW, SH, "LES SEPT POSTURES DU MAIRE - LE MAIRE SEUL", PAD, 6, 3, [230, 226, 214]);

section("1. LA SILHOUETTE EST D'UN SEUL TENANT — le corps s'assemble");

const solo = {};      // par pose : le relevé d'îlots, pour le résumé
for (let ai = 0; ai < ANGLES.length; ai++) {
  const A = ANGLES[ai];
  const cam = camera(A.pos, A.look, A.fov, TW / TH);
  const y0 = HEAD + ai * (TH + HEAD + PAD) + HEAD;
  text(sheet, SW, SH, A.name, PAD, y0 - HEAD + 4, 2, [180, 190, 205]);
  for (let ki = 0; ki < KEYS.length; ki++) {
    const key = KEYS[ki];
    setPose(key);
    const tris = collectTriangles(THREE, rig.root, tagOf).filter((t) => t.tag === 1);
    const r = renderScene(THREE, rig.root, cam, TW, TH, { tris, tagOf, bg: [198, 200, 206] });
    /* le trait du plateau : c'est lui qui dit si l'écharpe passe dedans */
    const [, yDesk] = project(cam, 0, R.deskTop, R.deskC, TW, TH);
    hline(r.px, TW, TH, Math.round(yDesk), 0, TW, [190, 120, 110], true);
    const isl = islands(r.id, TW, TH, 1).filter((c) => c.n >= 6);
    const x0 = PAD + ki * (TW + PAD);
    blit(sheet, SW, SH, r.px, TW, TH, x0, y0);
    const bad = isl.length > 1;
    text(sheet, SW, SH, key + (bad ? "  " + isl.length + " ILOTS" : ""), x0 + 4, y0 - 16, 2,
         bad ? [235, 110, 96] : [200, 208, 220]);
    if (ai === 0) solo[key] = {};
    solo[key][A.name] = isl;
    ok(`« ${key} » ${A.name} : une seule masse`, isl.length === 1,
       isl.length === 1 ? `${isl[0].n} px`
                        : `${isl.length} morceaux : ${isl.map((c) => c.n + " px").join(" + ")}`);
  }
}
fs.mkdirSync(OUT, { recursive: true });
writePNG(path.join(OUT, "maire-postures.png"), sheet, SW, SH);

/* ─────────────────────────────────────────────────────────────────────────
   PLANCHE 2 — LA VUE DU JOUEUR, celle de `VIEWS.seat`, au format 16/9 du jeu.
   ⚠️ ELLE EST INDISPENSABLE ET ELLE NE REMPLACE PAS LA PREMIÈRE : la pièce
   cache légitimement la moitié basse de l'homme, donc elle ne peut RIEN dire
   de l'assemblage — mais c'est la seule qui montre ce que le joueur voit.
   ───────────────────────────────────────────────────────────────────────── */
section("5. LE CADRE DU JOUEUR — rien du maire ne touche le bord");
/* ⚠️ LES VIGNETTES SONT À LEUR TAILLE NATIVE, PAS RÉDUITES : c'est la seule
   planche qui montre ce que le joueur voit, et une vue du joueur réduite de
   moitié ne dit plus rien du cadrage — or le cadrage est ce qu'elle mesure. */
const VW = 512, VH = 288;
const VSW = KEYS.length * (VW + PAD) + PAD;
const VSH = HEAD + (VH + HEAD) * B.VIEW_KEYS.length + PAD;
const vsheet = new Uint8ClampedArray(VSW * VSH * 4);
for (let i = 0; i < VSW * VSH; i++) { vsheet[i * 4] = 28; vsheet[i * 4 + 1] = 30; vsheet[i * 4 + 2] = 34; vsheet[i * 4 + 3] = 255; }
text(vsheet, VSW, VSH, "LE BUREAU VU DU JEU - " + B.VIEW_KEYS.join(" / "), PAD, 6, 3, [230, 226, 214]);
for (let vi = 0; vi < B.VIEW_KEYS.length; vi++) {
  const vk = B.VIEW_KEYS[vi], V = B.VIEWS[vk];
  const cam = camera(V.pos, V.look, 45, 16 / 9);
  const y0 = HEAD + vi * (VH + HEAD) + HEAD;
  text(vsheet, VSW, VSH, "vue " + vk, PAD, y0 - HEAD + 4, 2, [180, 190, 205]);
  for (let ki = 0; ki < KEYS.length; ki++) {
    const key = KEYS[ki];
    setPose(key);
    const r = renderScene(THREE, rig.root, cam, VW, VH, { tagOf });
    const x0 = PAD + ki * (VW + PAD);
    blit(vsheet, VSW, VSH, r.px, VW, VH, x0, y0);
    text(vsheet, VSW, VSH, key, x0 + 4, y0 - 16, 2, [200, 208, 220]);
    if (vk !== "seat") continue;
    let edge = 0;
    for (let x = 0; x < VW; x++) { if (r.id[x] === 1) edge++; if (r.id[(VH - 1) * VW + x] === 1) edge++; }
    for (let y = 0; y < VH; y++) { if (r.id[y * VW] === 1) edge++; if (r.id[y * VW + VW - 1] === 1) edge++; }
    ok(`« ${key} » : le maire ne touche pas le bord du cadre`, edge === 0, edge ? edge + " px sur le bord" : "");
  }
}
writePNG(path.join(OUT, "maire-bureau.png"), vsheet, VSW, VSH);

/* ─────────────────────────────────────────────────────────────────────────
   2. LE BUSTE ET SON BASSIN
   ───────────────────────────────────────────────────────────────────────── */
section("2. LE BUSTE NE QUITTE PAS SON BASSIN — `rise` monte le torse, pas l'homme");
const legs = rig.mayor.man.children.filter((c) => c.isMesh);   // cuisses, tibias, souliers
for (const key of KEYS) {
  setPose(key);
  const bT = worldBox(THREE, rig.mayor.torso);
  let hipTop = -Infinity;
  for (const l of legs) hipTop = Math.max(hipTop, worldBox(THREE, l).max.y);
  const gap = bT.min.y - hipTop;
  ok(`« ${key} » : le bas du buste rejoint le haut des cuisses`, gap <= 0.01,
     `écart ${cm(gap)} (buste à y=${bT.min.y.toFixed(3)}, cuisses à y=${hipTop.toFixed(3)})`);
}

/* ─────────────────────────────────────────────────────────────────────────
   3. LA MAIN EST OÙ LA POSE L'ÉCRIT
   ───────────────────────────────────────────────────────────────────────── */
section("3. LA MAIN EST OÙ LA POSE L'ÉCRIT — `solveArm` borne en silence");
/* ⚠️⚠️ HORS-ZIP 2026-09-02 — LA PORTÉE VIENT DU CORPS, ELLE N'EST PLUS ÉCRITE
   ICI. Ce banc portait `0.59` en dur : une SEPTIÈME copie des deux longueurs
   d'os, dans le fichier même dont l'en-tête raconte comment `ARM_FORE` a menti
   d'un centimètre le jour où elle en était séparée. Elle est devenue fausse à
   l'instant où les cinq maires ont eu cinq tailles — et le banc aurait annoncé
   « 59 cm de bras » pour une femme de 1,68 m qui en a 55,8. */
const REACH = (rig.mayor.bones.up + rig.mayor.bones.fore) * 0.995;
for (const key of KEYS) {
  const cur = setPose(key);
  for (const [side, arm, tgt] of [["gauche", rig.mayor.armL, cur.hL], ["droite", rig.mayor.armR, cur.hR]]) {
    const sh = new THREE.Vector3().setFromMatrixPosition(arm.sh.matrixWorld);
    const hd = new THREE.Vector3().setFromMatrixPosition(arm.hd.matrixWorld);
    const want = new THREE.Vector3(tgt[0], tgt[1], tgt[2]);
    const need = want.distanceTo(sh), miss = hd.distanceTo(want);
    ok(`« ${key} » main ${side} : arrivée à la cible`, miss <= 0.02,
       `écart ${cm(miss)} · épaule→cible ${cm(need)} sur ${cm(REACH)} de bras`);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   4. RIEN NE TRAVERSE LE PLATEAU
   ───────────────────────────────────────────────────────────────────────── */
section("4. RIEN DU MAIRE NE TRAVERSE LE PLATEAU DU BUREAU");
/* le plateau, tel que `buildDesk` le pose : 7,5 cm de bois sous la surface,
   dérivés des mêmes constantes que le meuble — jamais recopiés (§8) */
const SLAB = boxObb(THREE, {
  min: new THREE.Vector3(-R.deskW / 2, R.deskTop - 0.075, R.deskC - R.deskD / 2),
  max: new THREE.Vector3(R.deskW / 2, R.deskTop, R.deskC + R.deskD / 2),
});
/* ⚠️ LA TOLÉRANCE EST DE DEUX CENTIMÈTRES, ET ELLE EST ÉCRITE PLUTÔT QUE
   CACHÉE : un homme assis à un bureau touche le chant du plateau avec sa veste,
   c'est ce que fait tout le monde et ce n'est pas un défaut. Au-delà, c'est de
   la matière qui traverse du bois, et ça se voit dès qu'on tourne autour. */
const SLAB_TOL = 0.02;
const parts = [];
rig.mayor.man.traverse((o) => { if (o.isMesh) parts.push(o); });
for (const key of KEYS) {
  setPose(key);
  let worst = 0, who = null;
  for (const p of parts) {
    const d = obbDepth(THREE, obbOf(THREE, p), SLAB);
    if (d > worst) { worst = d; who = p; }
  }
  ok(`« ${key} » : rien ne traverse le plateau de plus de ${cm(SLAB_TOL)}`, worst <= SLAB_TOL,
     worst ? `${cm(worst)} de pénétration` + (who ? ` (boîte en ${who.position.toArray().map((v) => v.toFixed(2)).join(" ")})` : "") : "");
}

/* ─────────────────────────────────────────────────────────────────────────
   6. UN BRAS NE RENTRE PAS DANS LE CORPS
   ⚠️⚠️ C'est l'angle mort EXACT du contrôle de silhouette : une main enfoncée
   dans la poitrine ne fait pas d'îlot, elle DISPARAÎT — la masse reste d'un
   seul tenant et le banc est vert. C'est la même famille que le §1 vu par
   l'autre bout : *ce qui déborde se compte en pixels, ce qui s'enfonce se
   compte en mètres.* Trouvé le 2026-08-31 sur « closed », dont les deux mains
   étaient écrites à z −2,86 pour un torse dont la face avant est à −2,845 :
   des bras croisés DANS le buste, avec les doigts qui ressortaient au niveau
   du menton.
   ───────────────────────────────────────────────────────────────────────── */
section("6. UN BRAS NE RENTRE PAS DANS LE CORPS");
/* ⚠️ LE « CORPS » EST LE TRONC ET LE VENTRE, PAS LA GARNITURE. Les revers, le
   col, la cravate et l'écharpe sont des surfaces de trois centimètres posées
   SUR la veste : des bras croisés s'y appuient, c'est ce que font des bras
   croisés, et un contrôle qui les compte accuse le geste qu'on voulait. On
   garde donc les deux grandes masses (0,465 et 0,435 de large) et rien d'autre
   — la règle est écrite, pas devinée. */
const BODY = [];
rig.mayor.torso.children.forEach((o) => {
  if (o.isMesh && o.geometry.type === "BoxGeometry" && o.geometry.parameters.width >= 0.40) BODY.push(o);
});
/* ⚠️ ON NE MESURE QUE LES MAINS, ET C'EST LA BONNE GRANDEUR. Le haut du bras
   pend à x ±0,208 pour un buste large de ±0,2325 : il est DANS la veste par
   construction, c'est ce qui fait une épaule, et un contrôle qui l'accuse
   accuse les sept poses — donc plus personne ne le lit (439, « il se donne un
   périmètre et excuse ce qui déborde », par l'autre bout). L'avant-bras, lui,
   a le droit de reposer sur la poitrine : c'est ce que font des bras croisés.
   Une MAIN dans un torse, jamais. */
const ARMS = [];
for (const a of [rig.mayor.armL, rig.mayor.armR]) a.hd.traverse((o) => { if (o.isMesh) ARMS.push(o); });
const HEADM = [];
rig.mayor.head.traverse((o) => { if (o.isMesh) HEADM.push(o); });
/* ⚠️ UN CENTIMÈTRE : le dos de la main frôle la veste dans les bras croisés, et
   c'est juste. Au-delà, c'est de la main dans du torse. */
const BODY_TOL = 0.010;
for (const key of KEYS) {
  setPose(key);
  const targets = [...BODY, ...HEADM].map((o) => obbOf(THREE, o));
  let worst = 0, who = null;
  for (const a of ARMS) {
    const ao = obbOf(THREE, a);
    for (const t of targets) { const d = obbDepth(THREE, ao, t); if (d > worst) { worst = d; who = a; } }
  }
  ok(`« ${key} » : les mains restent hors du buste et de la tête`, worst <= BODY_TOL,
     worst ? `${cm(worst)} d'enfoncement` + (who ? ` (${who.geometry.type})` : "") : "");
}

/* ─────────────────────────────────────────────────────────────────────────
   7. LA TABLE DES POSTURES SURVIT À UNE AUDIENCE
   ⚠️⚠️ Trouvé le 2026-08-31 : la vue partait de `{ ...poseTarget("closed") }`,
   et un étalement recopie la RÉFÉRENCE des tableaux `hL`/`hR`. `ease` écrit
   dedans à chaque image — donc dans `POSE.closed` lui-même. La table se
   corrompait à la première image, et la SECONDE audience de la session partait
   d'une pose que personne n'avait écrite. Aucun symptôme sur le moment : les
   nombres restaient plausibles. *Une table de référence qu'on étale à plat est
   une table qu'on modifie ; on la rejoue, on ne la relit pas.*
   ───────────────────────────────────────────────────────────────────────── */
section("7. LA TABLE DES POSTURES SURVIT À UNE AUDIENCE");
{
  const before = JSON.stringify(B.POSE);
  const pose = B.poseState("closed");
  for (let i = 0; i < 200; i++) B.ease(pose, B.poseTarget(KEYS[i % KEYS.length]), 1 / 60, 2.6);
  ok("deux cents images de glissement ne touchent pas `POSE`", JSON.stringify(B.POSE) === before);
  ok("`poseState` rend bien une COPIE des mains",
     B.poseState("flat").hL !== B.POSE.flat.hL && B.poseState("flat").hL[0] === B.POSE.flat.hL[0]);
}

/* ─────────────────────────────────────────────────────────────────────────
   PLANCHE 3 ET §8 — LES CINQ MAIRES, CÔTE À CÔTE ET MESURÉS.
   ⚠️⚠️ ELLE NAÎT LE 2026-09-02, AVEC LES CINQ CORPS, ET ELLE MESURE LA SEULE
   GRANDEUR QUI A RENDU LE MAIRE FAUX PENDANT DEUX ZIPS : le RAPPORT entre deux
   morceaux. `verify-maire` compte les postures, §1 compte les îlots, §3 mesure
   les mains — et aucun des trois n'aurait vu une tête de 25 cm de large sur des
   épaules de 55. *Un banc qui mesure des pièces ne voit pas des proportions.*
   ⚠️ Ce qu'elle contrôle, et pourquoi :
     · la stature RENDUE égale la stature ÉCRITE. Sans elle, `H` serait un nom
       poli pour un nombre qui ne décrit rien — c'est le §14.6 appliqué à une
       table de ratios ;
     · les pieds touchent le parquet quand il est DEBOUT. `lift` est dérivé des
       trois os de la jambe : s'il ment, le maire flotte ou s'enfonce, et
       seulement dans la pose `window` (une sur sept) ;
     · la tête tient entre 32 et 44 % de la carrure. C'est la fourchette humaine
       élargie d'un cran pour le style trapu du jeu (Tristan est à 32 %) ;
     · les mains atteignent les quatorze cibles POUR LES CINQ CORPS. Le plus
       petit bras fait 55,8 cm, le plus long 62,8 : une cible juste pour l'un
       peut être hors de portée pour l'autre, et `solveArm` borne EN SILENCE.
   ───────────────────────────────────────────────────────────────────────── */
section("8. LES CINQ MAIRES — un corps par élu, et tous tiennent debout");
{
  const CW = 260, CH = 430;
  const CANG = [
    { name: "de face",   pos: [0.00, 1.05, -0.62], look: [0.00, 1.00, -3.02], fov: 44 },
    { name: "3/4 droite", pos: [1.85, 1.42, -1.30], look: [-0.05, 1.00, -3.02], fov: 40 },
  ];
  const keys = B.MAYOR_LOOK_KEYS;
  const CSW = keys.length * (CW + PAD) + PAD;
  const CSH = HEAD + CANG.length * (CH + HEAD + PAD) + PAD;
  const csheet = new Uint8ClampedArray(CSW * CSH * 4);
  for (let i = 0; i < CSW * CSH; i++) { csheet[i * 4] = 28; csheet[i * 4 + 1] = 30; csheet[i * 4 + 2] = 34; csheet[i * 4 + 3] = 255; }
  text(csheet, CSW, CSH, "LES CINQ MAIRES - POSE « FLAT »", PAD, 6, 3, [230, 226, 214]);
  for (let ki = 0; ki < keys.length; ki++) {
    const key = keys[ki];
    /* ⚠️ UN BUREAU PAR MAIRE, ET ON LE LIBÈRE : cinq scènes gardées en mémoire,
       ce sont cinq jeux de textures que `dispose()` seul rend. */
    const r5 = B.buildOffice(THREE, { plateLabel: "MAIRE", mayorName: key.toUpperCase(), mayorKey: key });
    const sc5 = new THREE.Scene(); sc5.add(r5.root);
    const own = new Set(); r5.mayor.man.traverse((o) => own.add(o));
    const tag5 = (o) => (own.has(o) ? 1 : 2);
    const mens = r5.mayor.mens;
    const poseOf = (k) => { const pp = B.poseTarget(k), cc = {};
      for (const q in pp) cc[q] = Array.isArray(pp[q]) ? pp[q].slice() : pp[q];
      B.applyPose(r5, cc, 0); r5.root.updateMatrixWorld(true); return cc; };
    /* la stature et les pieds se mesurent DEBOUT — c'est la seule pose où le
       corps est déplié, donc la seule où ces deux nombres veulent dire quelque
       chose */
    poseOf("window");
    const wb = worldBox(THREE, r5.mayor.man);
    ok(`${key} : la stature rendue est celle qui est écrite`,
       Math.abs((wb.max.y - wb.min.y) - mens.H) <= 0.012,
       `${(wb.max.y - wb.min.y).toFixed(3)} m pour ${mens.H.toFixed(2)} écrit`);
    ok(`${key} : debout, il touche le parquet`, Math.abs(wb.min.y) <= 0.012, `semelle à y=${wb.min.y.toFixed(3)}`);
    const hw = 0.250 * mens.headK[0];
    const ratio = hw / mens.bidelt;
    ok(`${key} : la tête tient dans la carrure`, ratio >= 0.32 && ratio <= 0.44,
       `${(ratio * 100).toFixed(0)} % (tête ${cm(hw)} · carrure ${cm(mens.bidelt)})`);
    /* les quatorze cibles, pour CE corps-là */
    const reach5 = (r5.mayor.bones.up + r5.mayor.bones.fore) * 0.995;
    let worstMiss = 0, worstKey = "";
    for (const k of KEYS) {
      const cc = poseOf(k);
      for (const [arm, tgt] of [[r5.mayor.armL, cc.hL], [r5.mayor.armR, cc.hR]]) {
        const hd = new THREE.Vector3().setFromMatrixPosition(arm.hd.matrixWorld);
        const miss = hd.distanceTo(new THREE.Vector3(tgt[0], tgt[1], tgt[2]));
        if (miss > worstMiss) { worstMiss = miss; worstKey = k; }
      }
    }
    ok(`${key} : les 14 mains arrivent à leur cible`, worstMiss <= 0.02,
       `pire ${cm(worstMiss)}${worstKey ? " sur « " + worstKey + " »" : ""} · bras ${cm(reach5)}`);
    /* et la planche */
    for (let ai = 0; ai < CANG.length; ai++) {
      const A = CANG[ai];
      poseOf(ai === 0 ? "flat" : "window");
      const cam = camera(A.pos, A.look, A.fov, CW / CH);
      const tris = collectTriangles(THREE, r5.root, tag5).filter((t) => t.tag === 1);
      const rr = renderScene(THREE, r5.root, cam, CW, CH, { tris, tagOf: tag5, bg: [198, 200, 206] });
      const y0 = HEAD + ai * (CH + HEAD + PAD) + HEAD;
      const x0 = PAD + ki * (CW + PAD);
      blit(csheet, CSW, CSH, rr.px, CW, CH, x0, y0);
      text(csheet, CSW, CSH, key + " " + mens.H.toFixed(2) + "m" + (mens.fem ? " F" : " H"), x0 + 4, y0 - 16, 2, [200, 208, 220]);
    }
    r5.dispose();
  }
  writePNG(path.join(OUT, "maire-cinq.png"), csheet, CSW, CSH);
}

/* ─────────────────────────────────────────────────────────────────────────
   LA JOINTURE, RAPPELÉE ICI : sept poses de mécanique, sept poses dessinées.
   ⚠️ `verify-maire` la tient déjà ; on la redit d'une ligne parce qu'un banc de
   RENDU qui balaie `POSE_KEYS` doit dire s'il a balayé les bonnes clés — sinon
   il peindrait sept images parfaites d'une liste qui n'est plus celle du jeu.
   ───────────────────────────────────────────────────────────────────────── */
section("0. LA LISTE BALAYÉE EST BIEN CELLE DE LA MÉCANIQUE");
ok("les clés peintes sont celles de MAYOR_POSES",
   JSON.stringify([...KEYS].sort()) === JSON.stringify([...M.MAYOR_POSES].sort()),
   KEYS.join(", "));

console.log(`\nPNG : ${path.relative(ROOT, path.join(OUT, "maire-postures.png"))} · ${path.relative(ROOT, path.join(OUT, "maire-bureau.png"))} · ${path.relative(ROOT, path.join(OUT, "maire-cinq.png"))}`);
console.log(`\n${total - fails}/${total}`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fails ? 1 : 0);
