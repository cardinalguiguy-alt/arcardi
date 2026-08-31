/* =============================================================================
   lib-3d.mjs — CHARGER THREE.JS SOUS NODE, ET RASTÉRISER UNE SCÈNE SANS GPU.
   -----------------------------------------------------------------------------
   ⚠️⚠️⚠️ POURQUOI CE FICHIER EXISTE, ET C'EST LA LEÇON DU 481 PAYÉE UNE
   SECONDE FOIS. `components/ferme/maireBureau.js` porte en tête, écrit noir sur
   blanc : *« il n'est relu par aucun tools/render-*.mjs »*. C'est exactement la
   phrase qui décrivait le glTF supprimé au 481 — un décor que rien ne sait
   REGARDER — et le défaut est arrivé par le même chemin : la posture DEBOUT du
   maire se désassemble à l'écran pendant que `verify-maire` rend 113/113.
   ⚠️ Ce que ce banc mesurait, c'est que les sept postures EXISTENT et sont
   dessinables. Ce qu'il ne pouvait pas mesurer, c'est qu'elles S'ASSEMBLENT :
   une pose est un jeu de nombres, et un jeu de nombres n'a pas de silhouette.
   *Un décor en trois dimensions n'est pas moins regardable qu'un sprite ; il
   demande seulement un rastériseur, et un rastériseur tient en trois cents
   lignes.*

   CE QU'IL FAIT :
     · `loadTHREE()` charge le r128 VENDORISÉ du dépôt (`public/vendor/`) dans
       Node. Aucune dépendance npm : c'est la MÊME bibliothèque que la page, à
       l'octet près, donc un défaut de matrice se reproduit ici tel quel.
     · `renderScene()` projette, découpe au plan proche, trie par tampon de
       profondeur et remplit les triangles à plat. Pas d'ombres portées, pas de
       spéculaire, pas d'anticrénelage — on juge une SILHOUETTE et des MASSES,
       ce qui est très précisément ce qu'une posture cassée montre.

   ⚠️ CE QU'IL NE MESURE PAS, ET IL FAUT LE SAVOIR AVANT DE L'ACCUSER : les
   dégradés de canevas (`createLinearGradient`) rendent un gris moyen, les
   textures sont réduites à leur COULEUR MOYENNE, et `fillText` ne peint rien.
   Une plaque de bureau y sera donc muette. C'est un rastériseur de GÉOMÉTRIE.
   ============================================================================= */
import fs from "node:fs";
import path from "node:path";
import { makeCanvas } from "./lib-canvas.mjs";

/* ---------------------------------------------------------------------------
   LE FAUX DOM, EN VERSION TOLÉRANTE.
   ⚠️ `installFakeDOM` de `lib-canvas.mjs` JETTE sur toute méthode non
   implémentée, et c'est une bonne règle POUR `fermeArt.js` : elle interdit d'y
   écrire un dessin que le banc ne saurait pas relire. Ici la règle s'inverse —
   `maireBureau.js` a le droit d'appeler `fillText` (il ne tourne que dans un
   navigateur, son en-tête le dit et le justifie), et un banc qui jetterait
   là-dessus ne pourrait REGARDER aucune texture ni, surtout, aucune géométrie.
   On tolère donc, et on l'écrit ici plutôt que de l'oublier : ce qui manque est
   IGNORÉ, jamais remplacé par une valeur inventée.
   ------------------------------------------------------------------------- */
const NOOP = () => {};
const GRAD = () => ({ addColorStop() {} });
function tolerantCtx(inner) {
  return new Proxy({}, {
    get(_t, k) {
      try { return inner[k]; } catch (e) {
        if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") return GRAD;
        if (k === "measureText") return () => ({ width: 0 });
        return NOOP;
      }
    },
    set(_t, k, v) { try { inner[k] = v; } catch (e) { /* refusée, comme un canvas réel */ } return true; },
  });
}
export function installTolerantDOM() {
  global.document = {
    createElement(tag) {
      if (tag !== "canvas") throw new Error("createElement(" + tag + ") non supporté");
      const el = { width: 0, height: 0, __surface: null, __px: null };
      el.getContext = () => {
        if (!el.__surface || el.__surface.width !== el.width || el.__surface.height !== el.height) {
          el.__surface = makeCanvas(el.width || 1, el.height || 1);
          el.__px = el.__surface.px;
        }
        return tolerantCtx(el.__surface.ctx);
      };
      return el;
    },
    createElementNS(_ns, tag) { return this.createElement(tag); },
  };
  if (!global.window) global.window = { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} };
  if (!global.self) global.self = global.window;
}

/* ---------------------------------------------------------------------------
   THREE.JS r128, CELUI DU DÉPÔT.
   ⚠️ ON NE PREND PAS `three` DEPUIS npm, ET C'EST LA LEÇON DU §11 DE
   `CLAUDE.md` : le jeu tourne sur le miroir vendorisé r128, une version moderne
   n'a pas la même atténuation de lumière ni les mêmes conventions de couleur.
   Un banc qui chargerait une autre révision mesurerait un autre programme.
   ------------------------------------------------------------------------- */
export function loadTHREE(root) {
  installTolerantDOM();
  const file = path.join(root, "public/vendor/three-r128/three.min.js");
  const src = fs.readFileSync(file, "utf8");
  const mod = { exports: {} };
  const fn = new Function("window", "self", "document", "module", "exports",
    src + '\n;return (typeof THREE !== "undefined") ? THREE : module.exports;');
  const T = fn.call(globalThis, globalThis, globalThis, globalThis.document, mod, mod.exports);
  if (!T || !T.Object3D) throw new Error("three.min.js n'a pas rendu THREE");
  return T;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE RASTÉRISEUR — TAMPON DE PROFONDEUR, OMBRAGE PLAT, DÉCOUPE AU PLAN PROCHE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ LA DÉCOUPE AU PLAN PROCHE N'EST PAS UN LUXE ICI, C'EST LA CONDITION
   D'EXISTENCE DE L'IMAGE : la caméra de cette scène est DEDANS la pièce, donc
   le mur derrière elle et le sol sous elle traversent le plan de la caméra à
   chaque image. Un triangle non découpé se projette alors DERRIÈRE l'œil, avec
   un w négatif — et il se peint à l'envers, en travers de tout l'écran. C'est
   le défaut classique, et il ressemble trait pour trait à un décor cassé.
   ═══════════════════════════════════════════════════════════════════════════ */

/* La couleur d'un matériau, ramenée à trois octets. Une texture est réduite à
   sa MOYENNE PONDÉRÉE PAR L'ALPHA : on ne juge pas un motif de parquet dans ce
   banc, on juge où s'arrête le parquet. */
const _avg = new Map();
function matRGB(mat) {
  const key = mat.uuid;
  if (_avg.has(key)) return _avg.get(key);
  let r = (mat.color ? mat.color.r : 1), g = (mat.color ? mat.color.g : 1), b = (mat.color ? mat.color.b : 1);
  const img = mat.map && mat.map.image;
  const px = img && (img.__px || img.px);
  if (px && px.length >= 4) {
    let sr = 0, sg = 0, sb = 0, sa = 0;
    for (let i = 0; i < px.length; i += 4) { const a = px[i + 3] / 255; sr += px[i] * a; sg += px[i + 1] * a; sb += px[i + 2] * a; sa += a; }
    if (sa > 0) { r *= (sr / sa) / 255; g *= (sg / sa) / 255; b *= (sb / sa) / 255; }
  }
  const out = [r, g, b];
  _avg.set(key, out);
  return out;
}

/* Les lampes, relevées UNE fois dans l'arbre. ⚠️ On recopie l'atténuation r128
   `max(0, 1 − d/portée)` plutôt qu'une inverse-carré moderne : c'est la formule
   que la page applique, et le §11 de `CLAUDE.md` dit ce que coûte de recopier
   l'autre. */
function gatherLights(THREE, root) {
  const L = { hemi: null, dir: [], pt: [] };
  const v = new THREE.Vector3(), v2 = new THREE.Vector3();
  root.traverse((o) => {
    if (o.isHemisphereLight) L.hemi = { sky: o.color, ground: o.groundColor, i: o.intensity };
    else if (o.isDirectionalLight) {
      o.updateMatrixWorld(true); o.target.updateMatrixWorld(true);
      v.setFromMatrixPosition(o.matrixWorld); v2.setFromMatrixPosition(o.target.matrixWorld);
      const d = v.clone().sub(v2).normalize();
      L.dir.push({ x: d.x, y: d.y, z: d.z, c: o.color, i: o.intensity });
    } else if (o.isPointLight) {
      o.updateMatrixWorld(true); v.setFromMatrixPosition(o.matrixWorld);
      L.pt.push({ x: v.x, y: v.y, z: v.z, c: o.color, i: o.intensity, dist: o.distance });
    }
  });
  return L;
}

/* Le relevé des triangles du monde. Rendu à part de la peinture pour que le
   banc puisse MESURER la géométrie (une boîte qui traverse le plateau) sans
   avoir à relire des pixels. */
export function collectTriangles(THREE, root, tagOf) {
  root.updateMatrixWorld(true);
  const out = [];
  const p = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    /* un parent invisible masque tout son sous-arbre, et `traverse` ne le sait
       pas : on remonte. Sans ça, cacher la pièce pour ne garder que l'homme ne
       cacherait que le groupe et pas ses meubles. */
    for (let q = o.parent; q; q = q.parent) if (!q.visible) return;
    const g = o.geometry, pos = g.attributes && g.attributes.position;
    if (!pos) return;
    const idx = g.index ? g.index.array : null;
    const n = idx ? idx.length : pos.count;
    const rgb = matRGB(o.material);
    const em = o.material.emissive ? [o.material.emissive.r, o.material.emissive.g, o.material.emissive.b] : null;
    const tag = tagOf ? tagOf(o) : 1;
    const V = [];
    for (let i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(o.matrixWorld);
      V.push([p.x, p.y, p.z]);
    }
    for (let i = 0; i + 2 < n; i += 3) {
      const a = V[idx ? idx[i] : i], b = V[idx ? idx[i + 1] : i + 1], c = V[idx ? idx[i + 2] : i + 2];
      out.push({ a, b, c, rgb, em, tag, obj: o });
    }
  });
  return out;
}

function shadeTri(L, nx, ny, nz, px, py, pz, rgb, em) {
  let r = 0, g = 0, b = 0;
  if (L.hemi) {
    const t = ny * 0.5 + 0.5, h = L.hemi;
    r += (h.ground.r + (h.sky.r - h.ground.r) * t) * h.i;
    g += (h.ground.g + (h.sky.g - h.ground.g) * t) * h.i;
    b += (h.ground.b + (h.sky.b - h.ground.b) * t) * h.i;
  }
  for (const d of L.dir) {
    const nl = nx * d.x + ny * d.y + nz * d.z;
    if (nl <= 0) continue;
    r += d.c.r * d.i * nl; g += d.c.g * d.i * nl; b += d.c.b * d.i * nl;
  }
  for (const q of L.pt) {
    const lx = q.x - px, ly = q.y - py, lz = q.z - pz;
    const dd = Math.hypot(lx, ly, lz) || 1e-6;
    const att = q.dist > 0 ? Math.max(0, 1 - dd / q.dist) : 1;
    if (att <= 0) continue;
    const nl = (nx * lx + ny * ly + nz * lz) / dd;
    if (nl <= 0) continue;
    const k = q.i * att * nl;
    r += q.c.r * k; g += q.c.g * k; b += q.c.b * k;
  }
  let R = rgb[0] * r, G = rgb[1] * g, B = rgb[2] * b;
  if (em) { R += em[0]; G += em[1]; B += em[2]; }
  return [Math.min(255, R * 255), Math.min(255, G * 255), Math.min(255, B * 255)];
}

/* Découpe d'un polygone en espace CAMÉRA contre le plan proche (z < −near). */
function clipNear(poly, near) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    const inA = A[2] <= -near, inB = B[2] <= -near;
    if (inA) out.push(A);
    if (inA !== inB) {
      const t = (-near - A[2]) / (B[2] - A[2]);
      out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, -near,
                A[3] + (B[3] - A[3]) * t, A[4] + (B[4] - A[4]) * t, A[5] + (B[5] - A[5]) * t]);
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   `renderScene(THREE, root, cam, W, H, opts)` → { px, id, depth }
     · `px`    : RGBA, prêt pour `writePNG`
     · `id`    : un octet par pixel, la valeur rendue par `tagOf` — c'est LUI
                 qui permet de mesurer une silhouette sans relire des couleurs
     · `depth` : la profondeur caméra, utile pour un contrôle d'occultation
   ------------------------------------------------------------------------- */
export function renderScene(THREE, root, cam, W, H, opts) {
  const o = opts || {};
  const near = cam.near;
  const L = o.lights || gatherLights(THREE, root);
  const tris = o.tris || collectTriangles(THREE, root, o.tagOf);

  cam.updateMatrixWorld(true);
  const view = new THREE.Matrix4().copy(cam.matrixWorld).invert();
  const proj = cam.projectionMatrix;

  const px = new Uint8ClampedArray(W * H * 4);
  const id = new Uint8Array(W * H);
  const depth = new Float32Array(W * H).fill(Infinity);
  const bg = o.bg || [22, 24, 28];
  for (let i = 0; i < W * H; i++) { px[i * 4] = bg[0]; px[i * 4 + 1] = bg[1]; px[i * 4 + 2] = bg[2]; px[i * 4 + 3] = 255; }

  const v = new THREE.Vector3();
  for (const t of tris) {
    /* la normale, en MONDE : elle sert à l'éclairage, jamais au tri */
    const ux = t.b[0] - t.a[0], uy = t.b[1] - t.a[1], uz = t.b[2] - t.a[2];
    const wx = t.c[0] - t.a[0], wy = t.c[1] - t.a[1], wz = t.c[2] - t.a[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const nl = Math.hypot(nx, ny, nz) || 1e-9;
    nx /= nl; ny /= nl; nz /= nl;
    const cxw = (t.a[0] + t.b[0] + t.c[0]) / 3, cyw = (t.a[1] + t.b[1] + t.c[1]) / 3, czw = (t.a[2] + t.b[2] + t.c[2]) / 3;

    /* en espace caméra, avec la position monde traînée pour l'éclairage */
    const poly = [];
    for (const p3 of [t.a, t.b, t.c]) {
      v.set(p3[0], p3[1], p3[2]).applyMatrix4(view);
      poly.push([v.x, v.y, v.z, p3[0], p3[1], p3[2]]);
    }
    const cl = clipNear(poly, near);
    if (cl.length < 3) continue;

    /* ⚠️ L'OMBRAGE EST PLAT ET IL EST DOUBLE-FACE : une boîte vue de l'intérieur
       (les murs de la pièce le sont tous, puisqu'on est dedans) rendrait sinon
       du noir. On prend la normale qui regarde la caméra. */
    let sn = [nx, ny, nz];
    const toCam = [cam.position.x - cxw, cam.position.y - cyw, cam.position.z - czw];
    if (nx * toCam[0] + ny * toCam[1] + nz * toCam[2] < 0) sn = [-nx, -ny, -nz];
    const col = shadeTri(L, sn[0], sn[1], sn[2], cxw, cyw, czw, t.rgb, t.em);

    /* projection */
    const S = cl.map((q) => {
      v.set(q[0], q[1], q[2]).applyMatrix4(proj);   // applyMatrix4 divise par w
      return [(v.x * 0.5 + 0.5) * W, (1 - (v.y * 0.5 + 0.5)) * H, -q[2]];
    });
    for (let k = 1; k + 1 < S.length; k++) fillTri(px, id, depth, W, H, S[0], S[k], S[k + 1], col, t.tag);
  }
  return { px, id, depth, lights: L, tris };
}

function fillTri(px, id, depth, W, H, A, B, C, col, tag) {
  const minX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
  const minY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
  if (minX > maxX || minY > maxY) return;
  const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
  if (Math.abs(d) < 1e-9) return;
  /* ⚠️ ON INTERPOLE 1/z, PAS z : interpoler la profondeur linéairement en
     écran est faux en perspective, et le symptôme est une face qui traverse
     l'autre au milieu du triangle — c'est-à-dire exactement le défaut qu'on
     cherche, mais produit par l'outil. */
  const iA = 1 / A[2], iB = 1 / B[2], iC = 1 / C[2];
  for (let y = minY; y <= maxY; y++) {
    const yc = y + 0.5;
    for (let x = minX; x <= maxX; x++) {
      const xc = x + 0.5;
      const l0 = ((B[1] - C[1]) * (xc - C[0]) + (C[0] - B[0]) * (yc - C[1])) / d;
      const l1 = ((C[1] - A[1]) * (xc - C[0]) + (A[0] - C[0]) * (yc - C[1])) / d;
      const l2 = 1 - l0 - l1;
      if (l0 < 0 || l1 < 0 || l2 < 0) continue;
      const z = 1 / (l0 * iA + l1 * iB + l2 * iC);
      const i = y * W + x;
      if (z >= depth[i]) continue;
      depth[i] = z; id[i] = tag;
      const j = i * 4;
      px[j] = col[0]; px[j + 1] = col[1]; px[j + 2] = col[2]; px[j + 3] = 255;
    }
  }
}

/* ---------------------------------------------------------------------------
   LES ÎLOTS D'UN MASQUE, EN CONNEXITÉ À HUIT.
   ⚠️ C'est la mesure de `render-etoile` §2, appliquée à une silhouette entière
   au lieu d'un sprite : un personnage articulé qui s'assemble rend UNE tache.
   Deux taches, c'est un membre détaché — et c'est la seule grandeur qui
   distingue « la pose existe » de « la pose tient ».
   ------------------------------------------------------------------------- */
export function islands(mask, W, H, want) {
  const seen = new Uint8Array(W * H), out = [];
  const st = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || mask[i] !== want) continue;
    let n = 0, top = 0, minX = W, maxX = -1, minY = H, maxY = -1;
    st[top++] = i; seen[i] = 1;
    while (top) {
      const p = st[--top], x = p % W, y = (p / W) | 0;
      n++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (seen[q] || mask[q] !== want) continue;
        seen[q] = 1; st[top++] = q;
      }
    }
    out.push({ n, minX, maxX, minY, maxY });
  }
  out.sort((a, b) => b.n - a.n);
  return out;
}

/* ---------------------------------------------------------------------------
   L'INTERPÉNÉTRATION EXACTE D'UNE BOÎTE TOURNÉE ET D'UN VOLUME DROIT.
   ⚠️⚠️ POURQUOI PAS UNE BOÎTE ENGLOBANTE : une boîte de 0,46 × 0,62 penchée de
   douze degrés a une englobante quinze centimètres plus large qu'elle. Un
   contrôle d'interpénétration fondé sur des englobantes accuse donc TOUTES les
   poses penchées, et le jour où il accuse tout le monde on cesse de le lire —
   c'est le banc qui « se donne un périmètre et excuse ce qui déborde » (439),
   par l'autre bout. On fait donc le théorème des axes séparateurs, qui est
   EXACT pour deux boîtes : quinze axes, et la réponse est la profondeur de
   pénétration en mètres, pas un booléen.
   ------------------------------------------------------------------------- */
export function obbOf(THREE, mesh) {
  const g = mesh.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  const bb = g.boundingBox;
  const c = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5).applyMatrix4(mesh.matrixWorld);
  const e = new THREE.Vector3().subVectors(bb.max, bb.min).multiplyScalar(0.5);
  const m = mesh.matrixWorld.elements;
  /* les colonnes de la matrice portent l'échelle : on la sort dans les
     demi-dimensions, sinon un objet mis à l'échelle (l'abat-jour, la feuille)
     serait mesuré à sa taille d'origine */
  const ax = [];
  for (let i = 0; i < 3; i++) {
    const v = new THREE.Vector3(m[i * 4], m[i * 4 + 1], m[i * 4 + 2]);
    const len = v.length() || 1;
    ax.push(v.multiplyScalar(1 / len));
    e.setComponent(i, e.getComponent(i) * len);
  }
  return { c, e, ax };
}
/* Un volume droit `{ min, max }` vu comme une boîte tournée : ça évite deux
   fonctions qui feraient la même chose à un repère près. */
export function boxObb(THREE, box) {
  return {
    c: new THREE.Vector3().addVectors(box.min, box.max).multiplyScalar(0.5),
    e: new THREE.Vector3().subVectors(box.max, box.min).multiplyScalar(0.5),
    ax: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)],
  };
}
/* Rend la profondeur de pénétration de DEUX boîtes tournées (0 = pas de
   contact) : quinze axes séparateurs, et on garde le plus petit recouvrement,
   qui est la distance dont il faudrait pousser l'une pour dégager l'autre. */
export function obbDepth(THREE, A, Bo) {
  const d = new THREE.Vector3().subVectors(A.c, Bo.c);
  const axes = [...Bo.ax, ...A.ax];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const cr = new THREE.Vector3().crossVectors(Bo.ax[i], A.ax[j]);
    if (cr.lengthSq() > 1e-8) axes.push(cr.normalize());
  }
  let best = Infinity;
  for (const a of axes) {
    const rA = A.e.x * Math.abs(a.dot(A.ax[0])) + A.e.y * Math.abs(a.dot(A.ax[1])) + A.e.z * Math.abs(a.dot(A.ax[2]));
    const rB = Bo.e.x * Math.abs(a.dot(Bo.ax[0])) + Bo.e.y * Math.abs(a.dot(Bo.ax[1])) + Bo.e.z * Math.abs(a.dot(Bo.ax[2]));
    const gap = (rA + rB) - Math.abs(d.dot(a));
    if (gap <= 0) return 0;
    if (gap < best) best = gap;
  }
  return best;
}

/* La boîte englobante MONDE d'un objet et de son sous-arbre. Sert aux contrôles
   qui n'ont pas besoin de pixels — « l'écharpe traverse-t-elle le plateau ? »
   est une question de géométrie, et une question de géométrie se mesure en
   mètres, pas en pixels (leçon du §4 : une grandeur de dessin n'entre pas dans
   la collision, et réciproquement). */
export function worldBox(THREE, obj) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3();
  const p = new THREE.Vector3();
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) b.expandByPoint(p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(o.matrixWorld));
  });
  return b;
}
