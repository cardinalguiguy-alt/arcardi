/* =============================================================================
   verify-rig.mjs — LE SQUELETTE EN REPÈRE MONDE. Zip 396, neuf.
   -----------------------------------------------------------------------------
   Il répond à UNE question, celle que Guillaume a posée au 395 :

       « l'épée rentre dans le corps. Les bras semblent retournés, pas
         articulés dans le bon sens. »

   Aucun des huit outils du chantier ne pouvait s'en apercevoir, et la raison
   mérite d'être écrite : verify-anim.mjs relit des ANGLES. Or un angle n'a
   aucun sens tout seul — il faut le composer avec ceux de ses parents pour
   savoir où finit la pointe de la lame. Un contrôle qui relit un angle mesure
   la cohérence du fichier avec lui-même, pas son accord avec un corps humain.
   C'est très exactement le piège du 394 sous une troisième forme.

   ---------------------------------------------------------------------------
   CE QUE FAIT CELUI-CI, ET POURQUOI IL NE PEUT PAS SE TROMPER DE LA MÊME FAÇON
   ---------------------------------------------------------------------------
   Il construit le VRAI squelette, en appelant Rig.buildFarmer() contre un faux
   Three.js. Il applique la VRAIE pose, en appelant Rig.poseFarmer(). Puis il
   compose lui-même les matrices, sort les huit sommets de chaque boîte en
   repère MONDE, et pose des questions en français sur des POSITIONS :

     - la torche est-elle devant le fermier ? (z monde négatif)
     - le coude plie-t-il vers l'avant, et le genou vers l'arrière ?
     - la lame entre-t-elle dans le buste, les épaules ou la tête ?
     - un pied passe-t-il sous le sol ?

   ⚠️ IL NE PARTAGE AUCUNE CONVENTION AVEC rig.js. Il ne lit pas un signe de
   rotation, il regarde où sont les choses. Si quelqu'un inverse à nouveau un
   coude, l'outil le dira, quelle que soit la façon dont le code l'écrit.

   ⚠️ CE QU'IL NE PROUVE PAS : rien de la beauté, rien du rythme, rien du
   poids d'un coup. Un fermier peut passer les treize contrôles et rester raide
   comme un piquet. Ça, ça se juge à l'œil — et seulement à l'œil.

   Usage :  node tools/verify-rig.mjs
   ========================================================================== */

import { load } from "./lib-play.mjs";

/* ===========================================================================
   1. UN FAUX THREE.JS QUI RETIENT LA GÉOMÉTRIE
   ---------------------------------------------------------------------------
   Celui de smoke-render.mjs jette les dimensions (BoxGeometry() rend un objet
   vide) : il vérifie qu'on n'appelle pas n'importe quoi, pas ce qu'on
   construit. Ici il faut au contraire TOUT garder — largeur, hauteur,
   profondeur, position, rotation, échelle, et le lien parent/enfant.
   ========================================================================= */
function vec(x, y, z) {
  return { x: x || 0, y: y || 0, z: z || 0,
    set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } };
}
function obj3d(kind) {
  return {
    kind, parent: null, children: [], userData: {},
    position: vec(0, 0, 0), rotation: vec(0, 0, 0), scale: vec(1, 1, 1),
    visible: true, material: null, geometry: null,
    add(c) { c.parent = this; this.children.push(c); },
    lookAt() {},
  };
}
const FakeTHREE = {
  Group: function () { return obj3d("Group"); },
  Mesh: function (g, m) { const n = obj3d("Mesh"); n.geometry = g; n.material = m; return n; },
  BoxGeometry: function (w, h, d) { return { type: "Box", w, h, d }; },
  PlaneGeometry: function (w, h) { return { type: "Plane", w, h, d: 0.02 }; },
  SphereGeometry: function (r) { return { type: "Sphere", w: r * 2, h: r * 2, d: r * 2 }; },
  MeshLambertMaterial: function (o) { return Object.assign({ kind: "Lambert" }, o || {}); },
  MeshBasicMaterial: function (o) { return Object.assign({ kind: "Basic" }, o || {}); },
  CanvasTexture: function () { return {}; },
  AdditiveBlending: 4, DoubleSide: 5, NearestFilter: 1,
};

/* ===========================================================================
   2. LES MATRICES. Convention Three.js : Euler XYZ, soit R = Rx · Ry · Rz,
   et la matrice locale vaut Translation · Rotation · Échelle.
   ========================================================================= */
const mul = (A, B) => {
  const C = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
    for (let k = 0; k < 4; k++) C[r * 4 + c] += A[r * 4 + k] * B[k * 4 + c];
  return C;
};
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function trs(p, r, s) {
  const cx = Math.cos(r.x), sx = Math.sin(r.x);
  const cy = Math.cos(r.y), sy = Math.sin(r.y);
  const cz = Math.cos(r.z), sz = Math.sin(r.z);
  const Rx = [1, 0, 0, 0, 0, cx, -sx, 0, 0, sx, cx, 0, 0, 0, 0, 1];
  const Ry = [cy, 0, sy, 0, 0, 1, 0, 0, -sy, 0, cy, 0, 0, 0, 0, 1];
  const Rz = [cz, -sz, 0, 0, sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const R = mul(Rx, mul(Ry, Rz));
  const S = [s.x, 0, 0, 0, 0, s.y, 0, 0, 0, 0, s.z, 0, 0, 0, 0, 1];
  const M = mul(R, S);
  M[3] = p.x; M[7] = p.y; M[11] = p.z;
  return M;
}
const apply = (M, v) => [
  M[0] * v[0] + M[1] * v[1] + M[2] * v[2] + M[3],
  M[4] * v[0] + M[5] * v[1] + M[6] * v[2] + M[7],
  M[8] * v[0] + M[9] * v[1] + M[10] * v[2] + M[11],
];

/* Parcourt la hiérarchie et rend, pour chaque maillage visible, sa matrice
   monde et ses demi-dimensions. Le nom du membre est hérité du joint dont il
   descend, ce qui permet de ne comparer que ce qui a un sens (la lame contre
   le buste, jamais l'avant-bras contre sa propre manche). */
function collect(root, tag) {
  const out = [];
  (function walk(n, M, name) {
    const L = mul(M, trs(n.position, n.rotation, n.scale));
    const nm = tag.get(n) || name;
    if (n.kind === "Mesh" && n.visible && n.geometry && n.geometry.type === "Box")
      out.push({ M: L, hw: n.geometry.w / 2, hh: n.geometry.h / 2, hd: n.geometry.d / 2, name: nm });
    for (const c of n.children) if (c.visible !== false) walk(c, L, nm);
  })(root, ident(), "?");
  return out;
}
const centre = (b) => apply(b.M, [0, 0, 0]);

/* Intersection de deux boîtes orientées, par ÉCHANTILLONNAGE de l'une dans le
   repère de l'autre. Le théorème des axes séparateurs serait exact, mais on
   veut ici mesurer la PROFONDEUR de pénétration (« la pointe traverse-t-elle
   franchement, ou effleure-t-elle ? »), et l'échantillonnage la donne
   directement. On échantillonne toujours la boîte la plus fine — une lame dans
   un torse, jamais l'inverse. */
function inverseOf(M) {
  // Rotation orthonormée à l'échelle près : on inverse à la main.
  const a = [M[0], M[1], M[2]], b = [M[4], M[5], M[6]], c = [M[8], M[9], M[10]];
  const sx = Math.hypot(a[0], b[0], c[0]) || 1;
  const sy = Math.hypot(a[1], b[1], c[1]) || 1;
  const sz = Math.hypot(a[2], b[2], c[2]) || 1;
  const R = [a[0] / sx, b[0] / sx, c[0] / sx,
             a[1] / sy, b[1] / sy, c[1] / sy,
             a[2] / sz, b[2] / sz, c[2] / sz];
  const t = [M[3], M[7], M[11]];
  return (p) => {
    const d = [p[0] - t[0], p[1] - t[1], p[2] - t[2]];
    return [(R[0] * d[0] + R[3] * d[1] + R[6] * d[2]) / sx,
            (R[1] * d[0] + R[4] * d[1] + R[7] * d[2]) / sy,
            (R[2] * d[0] + R[5] * d[1] + R[8] * d[2]) / sz];
  };
}
function penetration(thin, big, n) {
  const inv = inverseOf(big.M);
  let worst = 0;
  const N = n || 5;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) for (let k = 0; k <= N; k++) {
    const p = apply(thin.M, [(i / N * 2 - 1) * thin.hw, (j / N * 2 - 1) * thin.hh, (k / N * 2 - 1) * thin.hd]);
    const q = inv(p);
    const dx = big.hw - Math.abs(q[0]), dy = big.hh - Math.abs(q[1]), dz = big.hd - Math.abs(q[2]);
    if (dx > 0 && dy > 0 && dz > 0) worst = Math.max(worst, Math.min(dx, dy, dz));
  }
  return worst;
}

/* ===========================================================================
   3. LE MONTAGE
   ========================================================================= */
const G = load(["js/config.js", "js/rig.js"]);
const { CFG, Rig } = G;
Rig.init(FakeTHREE);

const tex = { wood: {} };
const skin = { shirt: 0x3f7fd4, pants: 0x454f66, hair: 0x5a3a1e, skin: 0xf0c8a0, gender: "m" };
const r = Rig.buildFarmer(CFG, tex, skin);
r.sword.visible = true;                       // on contrôle le cas ARMÉ : le pire

/* Étiquetage des membres. On le fait UNE fois, sur les joints, et collect()
   propage l'étiquette aux volumes qui en descendent. */
const tag = new Map();
tag.set(r.torso, "buste"); tag.set(r.chest, "buste");
tag.set(r.neck, "cou"); tag.set(r.head, "tête"); tag.set(r.cape, "cape");
tag.set(r.armL.sh, "brasG"); tag.set(r.armR.sh, "brasD");
tag.set(r.legL.hip, "jambeG"); tag.set(r.legR.hip, "jambeD");
tag.set(r.torchJ, "torche"); tag.set(r.grip, "épée"); tag.set(r.sword, "épée");
tag.set(r.hips, "bassin");

const BODY = new Set(["buste", "tête", "cou", "bassin"]);

let fails = 0;
function check(q, ok, extra) {
  console.log(`${ok ? "  OUI " : "ÉCHEC"}  ${q}${extra ? "   " + extra : ""}`);
  if (!ok) fails++;
}

/* Une pose, et ce qu'on en retient. `phase` va de 0 à 1 sur le cycle de
   marche ; `swingK` de 0 à 1 sur le coup d'épée (ou null s'il n'y en a pas). */
function pose(phase, swingK, opts) {
  const o = opts || {};
  const swingDur = CFG.SWING_MS / 1000;
  Rig.poseFarmer(r, {
    gait: phase,
    gaitSpeed: o.speed === undefined ? CFG.WALK_SPEED : o.speed,
    runAmt: o.run || 0, strafeAmt: 0, backAmt: 0,
    swingT: swingK === null ? 0 : (1 - swingK) * swingDur,
    hurt: 0, falling: false,
  }, CFG, phase * 3.1);
  return collect(r.root, tag);
}

/* Le pire chevauchement lame/corps et torche/corps sur toute une famille de
   poses. C'est le contrôle central de ce fichier. */
function worstOverlap(poses, who) {
  let worst = { d: 0, at: "", body: "" };
  for (const p of poses) {
    const parts = p.parts;
    const thin = parts.filter(b => b.name === who);
    const body = parts.filter(b => BODY.has(b.name));
    for (const t of thin) for (const b of body) {
      const d = penetration(t, b, 4);
      if (d > worst.d) worst = { d, at: p.label, body: b.name };
    }
  }
  return worst;
}

const POSES = [];
for (let i = 0; i < 24; i++)
  POSES.push({ label: `marche ${(i / 24).toFixed(2)}`, parts: pose(i / 24, null, {}) });
for (let i = 0; i < 16; i++)
  POSES.push({ label: `course ${(i / 16).toFixed(2)}`, parts: pose(i / 16, null, { speed: CFG.RUN_SPEED, run: 1 }) });
POSES.push({ label: "arrêt", parts: pose(0, null, { speed: 0 }) });
for (let i = 0; i <= 24; i++)
  POSES.push({ label: `coup ${(i / 24).toFixed(2)}`, parts: pose((i * 7 % 24) / 24, i / 24, {}) });

console.log("\n=== LE SQUELETTE DU FERMIER, EN REPÈRE MONDE ===");
console.log(`${POSES.length} poses : cycle de marche, course, arrêt, et le coup d'épée entier.\n`);

/* -- 1. L'ÉPÉE ------------------------------------------------------------ */
const sw = worstOverlap(POSES, "épée");
check("la lame reste-t-elle HORS du corps, sur toutes les poses ?",
  sw.d < 0.02, sw.d > 0.02 ? `pénètre de ${sw.d.toFixed(3)} dans le ${sw.body} (${sw.at})` : "aucun contact");

/* -- 2. LA TORCHE --------------------------------------------------------- */
const to = worstOverlap(POSES, "torche");
check("le flambeau reste-t-il HORS du corps ?",
  to.d < 0.02, to.d > 0.02 ? `pénètre de ${to.d.toFixed(3)} dans le ${to.body} (${to.at})` : "aucun contact");

/* -- 3. LA TORCHE EST-ELLE DEVANT ? --------------------------------------- */
/* C'est LE contrôle qui aurait trouvé le défaut du 395 : la main gauche était
   à z = +0,85, c'est-à-dire derrière le dos. On regarde la tête du flambeau,
   pas la main : c'est elle qui éclaire. */
{
  let worstZ = -99, at = "";
  for (const p of POSES) {
    for (const b of p.parts) if (b.name === "torche") {
      const c = centre(b);
      if (c[2] > worstZ) { worstZ = c[2]; at = p.label; }
    }
  }
  check("le flambeau est-il DEVANT le fermier, toujours ?",
    worstZ < -0.10, `le point le plus en arrière est à z = ${worstZ.toFixed(2)} (${at}) — négatif = devant`);
}

/* -- 4. LE FLAMBEAU EST-IL LEVÉ ? ----------------------------------------- */
{
  let lowest = 99;
  for (const p of POSES) for (const b of p.parts)
    if (b.name === "torche") lowest = Math.min(lowest, centre(b)[1]);
  check("le flambeau est-il porté au-dessus de la ceinture ?",
    lowest > 1.05, `point le plus bas à y = ${lowest.toFixed(2)} (ceinture ≈ 1,08)`);
}

/* -- 5 et 6. LE SENS DES ARTICULATIONS ------------------------------------ */
/* Le test ne lit AUCUN angle. Il prend les trois points de l'articulation en
   repère monde et regarde de quel côté le membre se plie, dans le plan
   sagittal. Pour un être qui regarde vers -Z :
       coude replié vers l'AVANT  → produit vectoriel en x POSITIF
       genou replié vers l'ARRIÈRE → produit vectoriel en x NÉGATIF
   Les deux signes sont donc OPPOSÉS, et c'est ça qu'on vérifie. */
function bendSign(a, b, c) {
  const u = [b[1] - a[1], b[2] - a[2]];      // (y, z) de l'os amont
  const v = [c[1] - b[1], c[2] - b[2]];      // ... de l'os aval
  return u[0] * v[1] - u[1] * v[0];
}
function jointPts(node) { return apply(worldOf(node), [0, 0, 0]); }
/* Matrice monde d'un joint : on la recalcule en remontant les parents. */
function worldOf(n) {
  const stack = [];
  for (let k = n; k; k = k.parent) stack.push(k);
  let M = ident();
  for (let i = stack.length - 1; i >= 0; i--) M = mul(M, trs(stack[i].position, stack[i].rotation, stack[i].scale));
  return M;
}
{
  let elbowBad = 0, kneeBad = 0, elbowMax = 0, kneeMax = 0;
  for (let i = 0; i < 24; i++) {
    pose(i / 24, null, {});
    for (const a of [r.armL, r.armR]) {
      const s = jointPts(a.sh), e = jointPts(a.el), w = jointPts(a.wr);
      const g = bendSign(s, e, w);
      if (g < -0.004) elbowBad++;
      elbowMax = Math.min(elbowMax, g);
    }
    for (const l of [r.legL, r.legR]) {
      const h = jointPts(l.hip), k = jointPts(l.kn), an = jointPts(l.an);
      const g = bendSign(h, k, an);
      if (g > 0.004) kneeBad++;
      kneeMax = Math.max(kneeMax, g);
    }
  }
  check("le COUDE plie-t-il vers l'AVANT, sur les 48 mesures ?",
    elbowBad === 0, elbowBad ? `${elbowBad} mesures à l'envers (pire ${elbowMax.toFixed(3)})` : "aucune flexion inverse");
  check("le GENOU plie-t-il vers l'ARRIÈRE, sur les 48 mesures ?",
    kneeBad === 0, kneeBad ? `${kneeBad} mesures à l'envers (pire ${kneeMax.toFixed(3)})` : "aucune flexion inverse");
}

/* -- 7. LE COUP PART-IL EN ARRIÈRE PUIS EN AVANT ? ------------------------ */
/* ⚠️ ON S'ARRÊTE À 23/24. À i = 24 le geste est TERMINÉ (swingT tombe à zéro)
   et poseFarmer rend la garde, pas la fin du coup. Mesurer la garde en croyant
   mesurer le geste, c'est le genre de décalage d'un cran qui fait conclure
   l'inverse de la vérité — l'outil disait « main la plus en avant à 100 % »
   alors qu'elle l'est à 55 %. */
{
  let backZ = 99, frontZ = -99, kBack = 0, kFront = 0;
  for (let i = 0; i < 24; i++) {
    pose(0, i / 24, {});
    const w = jointPts(r.armR.wr);
    if (w[2] > frontZ) { frontZ = w[2]; kBack = i / 24; }
    if (w[2] < backZ) { backZ = w[2]; kFront = i / 24; }
  }
  check("le coup a-t-il un ARMÉ (la main part en arrière) puis un ABATTAGE (elle passe devant) ?",
    frontZ > 0.15 && backZ < -0.25 && kBack < kFront,
    `main la plus en arrière z=${frontZ.toFixed(2)} à ${(kBack * 100) | 0} %, la plus en avant z=${backZ.toFixed(2)} à ${(kFront * 100) | 0} %`);
}

/* -- 8. LA LAME PASSE-T-ELLE DEVANT AU MOMENT DU COUP ? ------------------- */
{
  let best = 99, at = 0;
  for (let i = 0; i <= 24; i++) {
    const parts = pose(0, i / 24, {});
    for (const b of parts) if (b.name === "épée") {
      const c = centre(b);
      if (c[2] < best) { best = c[2]; at = i / 24; }
    }
  }
  check("la lame passe-t-elle franchement DEVANT le fermier pendant le coup ?",
    best < -1.4, `pointe la plus avancée à z = ${best.toFixed(2)} (à ${(at * 100) | 0} % du geste)`);
}

/* -- 9. LES PIEDS ---------------------------------------------------------- */
{
  let deepest = 99, high = -99;
  for (const p of POSES) for (const b of p.parts) {
    if (b.name !== "jambeG" && b.name !== "jambeD") continue;
    // sommet le plus bas de la boîte, en repère monde
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) for (let k = -1; k <= 1; k += 2) {
      const y = apply(b.M, [i * b.hw, j * b.hh, k * b.hd])[1];
      deepest = Math.min(deepest, y); high = Math.max(high, y);
    }
  }
  check("aucun pied ne s'enfonce sous le sol ?", deepest > -0.16,
    `point le plus bas y = ${deepest.toFixed(3)}`);
  /* ⚠️ SEUIL RELATIF, PAS ABSOLU. Corollaire n°3 du 379 : un contrôle en
     valeur absolue sur de l'art existant est toujours faux. On demande que la
     cuisse ne remonte pas dans le buste, ce qui se dit « à moins de 0,25 unité
     au-dessus du bassin » — et se relit encore juste le jour où quelqu'un
     grandit le fermier. */
  check("les jambes restent-elles sous le buste ?", high < CFG.FARMER_HIP_Y + 0.25,
    `point le plus haut y = ${high.toFixed(2)} (bassin à ${CFG.FARMER_HIP_Y})`);
}

/* -- 10. RIEN NE PART À L'INFINI ------------------------------------------ */
{
  let bad = 0, far = 0;
  for (const p of POSES) for (const b of p.parts) {
    const c = centre(b);
    if (!isFinite(c[0]) || !isFinite(c[1]) || !isFinite(c[2])) bad++;
    far = Math.max(far, Math.hypot(c[0], c[1] - 1, c[2]));
  }
  check("toutes les positions sont-elles finies et bornées ?", bad === 0 && far < 6,
    `${bad} non finies, éloignement max ${far.toFixed(2)}`);
}

/* -- 11. LE FERMIER A-T-IL VRAIMENT GAGNÉ EN DÉTAIL ? --------------------- */
{
  const n = POSES[0].parts.length;
  check("le fermier compte-t-il plus de volumes qu'au 395 (45) ?", n > 60, `${n} volumes`);
}

/* -- 12. LA CRÉATURE SE DÉSINTÈGRE-T-ELLE VERS LE HAUT ? ------------------ */
{
  const rr = Rig.buildRoamer(CFG);
  const t0 = new Map();
  Rig.poseRoamer(rr, { gait: 0, gaitSpeed: 0, chasing: false, stagger: 0, dead: false, deadT: 0 }, CFG, 0);
  const before = apply(worldOf(rr.skull), [0, 0, 0])[1];
  Rig.poseRoamer(rr, { gait: 0, gaitSpeed: 0, chasing: false, stagger: 0, dead: true,
    deadT: CFG.KILL_VANISH_MS / 1000 }, CFG, 0);
  const after = apply(worldOf(rr.skull), [0, 0, 0])[1];
  const op = rr.mats[0].opacity;
  check("le monstre vaincu monte-t-il, et finit-il par disparaître ?",
    after - before > 3 && op < 0.02,
    `le crâne monte de ${(after - before).toFixed(1)} unités, opacité finale ${op.toFixed(2)}`);
  void t0;
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
console.log(`Ce script ne dit RIEN de la beauté du personnage ni du rythme de son
coup d'épée : il dit que rien ne traverse rien, que la torche est devant, que
les coudes et les genoux plient dans des sens opposés, et que le monstre vaincu
part vers le haut. Le reste se juge à l'œil, et seulement à l'œil.\n`);
process.exit(fails ? 1 : 0);
