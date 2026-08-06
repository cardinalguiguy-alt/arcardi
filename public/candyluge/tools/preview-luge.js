/* =============================================================================
   tools/preview-luge.js — RENDRE LA DESCENTE ET LA REGARDER.
   -----------------------------------------------------------------------------
       node public/candyluge/tools/preview-luge.js      (écrit tools/out/*.png)

   ⚠️ CE SCRIPT EXISTE PARCE QU'ON A DEMANDÉ « PRIORITÉ À L'EXPÉRIENCE
   VISUELLE » ET « ne considère la tâche comme complète qu'une fois que tout
   tient bien niveau visuel ». On ne peut pas tenir cette promesse en relisant
   du code : rien dans world.js ne dit à quoi RESSEMBLE une piste de barbe à
   papa vue depuis onze mètres en arrière. Il faut la voir.

   C'est le même geste qu'au zip 377 pour le fermier du défi de fuite
   (tools/render-runner.js), poussé d'un cran : là-bas on jugeait une
   silhouette en projection orthographique, ici on juge un PAYSAGE — donc il
   faut la perspective, le brouillard, le ciel et la vraie caméra du jeu.

   COMMENT. Un faux three.js qui retient les transformations et le TYPE de
   chaque géométrie, un calcul de matrices monde à la main, une découpe de
   chaque primitive en triangles, une projection perspective avec la focale de
   config.js, un tampon de profondeur, et l'éclairage à trois sources de
   world.js recopié à l'identique. Le fond n'est pas une couleur : c'est LA
   TEXTURE DE CIEL DU JEU, échantillonnée par la direction du rayon.

   ⚠️ CE QU'IL NE MONTRE PAS, et il faut le savoir avant de conclure :
     * LES PARTICULES (étoiles de dérapage, poudre, neige) sont absentes. Elles
       sont dans un THREE.Points, qui n'a pas de triangles à rasteriser. Une
       image sans étoiles ne veut donc PAS dire que le dérapage ne brille pas.
     * pas d'ombres portées, pas d'anticrénelage, pas de transparence — les
       halos de bonbons sont rendus opaques.
     * les textures des RUBANS (piste, neige) sont désormais VRAIMENT plaquées,
       avec leurs UV (zip 412) — c'est la seule façon de juger un sol texturé.
       Celles des primitives (barrières en sucre d'orge) restent rendues par la
       moyenne de leur image : elles n'ont pas d'UV dans ce faux three.js.

   Il montre : la composition du cadre, la place de l'horizon, la silhouette de
   la piste dans ses virages, la densité du décor, la lisibilité des gourmands
   sur la neige, et la couleur d'ensemble. C'est exactement ce qui ne se devine
   pas en lisant.

   Le rasteriseur 2D et l'encodeur PNG sont ceux du défi de fuite
   (public/templerun/tools/lib-canvas2d.js), requis TELS QUELS : deux copies du
   même encodeur PNG, c'est deux fois le même bogue à corriger.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { makeCanvas2D, avgColor, writePng } = require("../../templerun/tools/lib-canvas2d.js");

const root = path.join(__dirname, "..");
const outDir = path.join(__dirname, "out");
fs.mkdirSync(outDir, { recursive: true });

/* ===================================================== FAUX THREE.JS ====== */
class V3 {
  constructor(x, y, z) { this.set(x || 0, y || 0, z || 0); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(k) { return this.set(k, k, k); }
  copy(v) { return this.set(v.x, v.y, v.z); }
  multiplyScalar(k) { return this.set(this.x * k, this.y * k, this.z * k); }
  add(v) { return this.set(this.x + v.x, this.y + v.y, this.z + v.z); }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { const L = this.length() || 1; return this.set(this.x / L, this.y / L, this.z / L); }
}
class V2 { constructor(x, y) { this.x = x || 0; this.y = y || 0; } set(x, y) { this.x = x; this.y = y; return this; } }
/* ══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LA COULEUR EST DEVENUE UN TRIPLET FLOTTANT (422), ET CE N'EST PAS UN
   RAFFINEMENT : C'EST LA CONDITION POUR QUE CETTE PLANCHE NE MENTE PAS.
   ──────────────────────────────────────────────────────────────────────────────
   Le stub rangeait un entier hexadécimal. Ça suffisait tant que le jeu rendait
   en gamma et que toute couleur tenait dans [0,255]. Depuis le 422, deux choses
   sont vraies et aucune ne tient dans un octet :

     * les couleurs vivent en LINÉAIRE (`convertSRGBToLinear`), et le linéaire
       d'un rose soutenu n'est pas le rose qu'on écrit dans config.js ;
     * certaines DÉPASSENT 1,0 — le bonbon du checkpoint est à 2,6. C'est
       exactement ce qui doit déborder dans le bloom, donc exactement ce qu'un
       octet écrêterait à 255 en silence, en supprimant l'effet qu'on veut juger.

   `h` reste disponible, re-encodé et écrêté : il ne sert plus qu'à teinter la
   moyenne d'une texture, où l'écrêtage est sans conséquence. Tout le reste passe
   par `linRGB()`. */
function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function l2s(c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055; }
class Col {
  constructor(h) { this.setHex(typeof h === "number" ? h : 0); this.linear = false; }
  setHex(h) {
    this.r = ((h >> 16) & 255) / 255; this.g = ((h >> 8) & 255) / 255; this.b = (h & 255) / 255;
    this.linear = false; return this;
  }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  set(v) { return typeof v === "number" ? this.setHex(v) : this.copy(v); }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; this.linear = c.linear; return this; }
  clone() { const c = new Col(0); return c.copy(this); }
  lerp() { return this; }
  convertSRGBToLinear() {
    /* ⚠️ IDEMPOTENCE REFUSÉE VOLONTAIREMENT. On pourrait ignorer un second
       appel ; on préfère que le drapeau reste vrai et que la conversion se
       refasse, exactement comme three.js — sinon la planche pardonnerait une
       faute que le navigateur, lui, ne pardonne pas, et on livrerait un décor
       doublement assombri sans jamais l'avoir vu ici. */
    this.r = s2l(this.r); this.g = s2l(this.g); this.b = s2l(this.b);
    this.linear = true; return this;
  }
  multiplyScalar(k) { this.r *= k; this.g *= k; this.b *= k; return this; }
  get h() {
    const q = (v) => Math.max(0, Math.min(255, Math.round((this.linear ? l2s(v) : v) * 255)));
    return (q(this.r) << 16) | (q(this.g) << 8) | q(this.b);
  }
  set h(v) { this.setHex(v); }
}
/* La couleur d'un objet Col, EN LINÉAIRE, quel que soit l'espace où il vit. */
function linRGB(c) {
  if (!c) return [1, 1, 1];
  return c.linear ? [c.r, c.g, c.b] : [s2l(c.r), s2l(c.g), s2l(c.b)];
}
class Obj3 {
  constructor() {
    this.position = new V3(); this.rotation = new V3(); this.scale = new V3(1, 1, 1);
    this.children = []; this.userData = {}; this.visible = true; this.parent = null;
    this.renderOrder = 0;
    // ⚠️ 422 : lus par le rasteriseur pour savoir qui entre dans la carte d'ombre.
    this.castShadow = false; this.receiveShadow = false; this.frustumCulled = true;
  }
  add(o) { o.parent = this; this.children.push(o); }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
  lookAt(x, y, z) { this.__look = { x, y, z }; }
  rotateZ(a) { this.__roll = (this.__roll || 0) + a; return this; }
  updateProjectionMatrix() {}
  updateMatrixWorld() {}
  /* ⚠️ LE CLONE PROFOND (422). `models.js` pose un gabarit par accessoire et en
     clone une instance par sucette — c'est la règle 2 de world.js (« tout est
     mutualisé »), donc le clone PARTAGE géométrie et matériau et ne recopie
     que la transformation. Un clone qui dupliquerait la géométrie marcherait
     ici (node a de la mémoire) et mentirait sur la seule chose qui compte :
     le coût. */
  clone(deep) {
    const o = new this.constructor();
    o.position.copy(this.position);
    o.rotation.copy(this.rotation);
    o.scale.copy(this.scale);
    o.visible = this.visible;
    o.name = this.name;
    o.castShadow = this.castShadow;
    o.receiveShadow = this.receiveShadow;
    if (this.isMesh) { o.geometry = this.geometry; o.material = this.material; o.isMesh = true; }
    if (deep !== false) for (const c of this.children) o.add(c.clone(true));
    return o;
  }
}
class Mat {
  /* ⚠️⚠️ IL ACCEPTE UN OBJET Color DEPUIS LE 422, ET LE MANQUE A PRODUIT UNE
     PANNE PARFAITEMENT SILENCIEUSE : UN MONDE ENTIÈREMENT BLANC.
     Jusqu'au 421, `world.js` passait toujours `color: 0xff7aa8` — un nombre. Le
     stub ne testait donc que ce cas et retombait sur du blanc sinon. Depuis que
     les couleurs sont converties en linéaire à la construction (`sc()`), c'est
     un OBJET qui arrive : la condition devenait fausse pour TOUS les matériaux,
     et chacun recevait 0xffffff.
     Le résultat sur la planche était un paysage plausible — bien éclairé, bien
     ombré, correctement exposé — mais dont chaque objet était blanc. On l'a
     d'abord mis sur le compte du tone mapping, puis de la saturation, puis de
     l'exposition. Aucun de ces trois n'y était pour rien.
     ⚠️ LA LEÇON : un stub qui « retombe sur une valeur raisonnable » ment
     mieux qu'un stub qui plante. Quand un type inattendu arrive, il vaut mille
     fois mieux lever une exception. */
  constructor(o) {
    Object.assign(this, o || {});
    const c = o && o.color;
    if (c instanceof Col) this.color = c;
    else if (typeof c === "number") this.color = new Col(c);
    else if (c === undefined || c === null) this.color = new Col(0xffffff);
    else throw new Error("stub Mat : couleur de type inattendu (" + typeof c + ")");
  }
  /* ⚠️ AJOUTÉ AU 416, ET LE MANQUE ÉTAIT UN PLANTAGE SEC, PAS UNE OMISSION
     ESTHÉTIQUE. Les décalques de lisibilité (ombres, cernes, portes) clonent
     leur matériau à la création parce que leur opacité est par-objet ; le
     stub n'avait pas de `clone()`, et l'outil est tombé à la première image.
     C'est la bonne nouvelle : un stub incomplet se signale par une exception,
     jamais par une image subtilement fausse. Le clone recopie les champs et
     REFAIT une couleur — partager l'objet Col rendrait toutes les copies
     solidaires, ce qui est exactement le défaut qu'on clone pour éviter. */
  clone() { const m = new this.constructor({}); Object.assign(m, this); m.color = this.color.clone(); return m; }
}
function G(kind, p) { return Object.assign({ kind }, p, { dispose() {} }); }

const THREE = {
  WebGLRenderer: class {
    constructor(o) {
      this.o = o; this.outputEncoding = 3000; this.toneMapping = 0; this.toneMappingExposure = 1;
      /* ⚠️ `shadowMap.enabled` EST LU PAR `world.js` (`shadowsLive()`) POUR
         DÉCIDER SI LES DÉCALQUES D'OMBRE S'EFFACENT. Le stub doit donc porter
         un état RÉEL, pas un objet vide : sinon la planche montrerait les
         décalques ET les vraies ombres, c'est-à-dire la double ombre que le
         422 a justement retirée, et on croirait à une régression. */
      this.shadowMap = { enabled: false, type: 0, autoUpdate: true };
      this.capabilities = { getMaxAnisotropy: () => 1 };
    }
    getPixelRatio() { return 1; }
    setPixelRatio() {} setSize() {} render() {}
  },
  Scene: class extends Obj3 { constructor() { super(); this.fog = null; } },
  Color: Col,
  FogExp2: class { constructor(c, d) { this.color = (c instanceof Col) ? c : new Col(c); this.density = d; } },
  PerspectiveCamera: class extends Obj3 {
    constructor(fov, asp, near, far) { super(); this.fov = fov; this.aspect = asp; this.near = near; this.far = far; }
  },
  AmbientLight: class extends Obj3 { constructor(c, i) { super(); this.color = (c instanceof Col) ? c : new Col(c); this.intensity = i; } },
  DirectionalLight: class extends Obj3 {
    constructor(c, i) {
      super();
      this.color = (c && c.isColLike) || (c instanceof Col) ? c : new Col(c);
      this.intensity = i;
      this.castShadow = false;
      this.target = new Obj3();
      this.target.updateMatrixWorld = function () {};
      this.shadow = {
        mapSize: { set() {}, x: 0, y: 0 },
        camera: { left: 0, right: 0, top: 0, bottom: 0, near: 0, far: 0, updateProjectionMatrix() {} },
        bias: 0, normalBias: 0, radius: 1,
      };
    }
  },
  BoxGeometry: class { constructor() { return G("box"); } },
  CylinderGeometry: class { constructor(rt, rb, h, seg) { return G("cyl", { rt, rb, h, seg: seg || 8 }); } },
  ConeGeometry: class { constructor(r, h, seg) { return G("cone", { r, h, seg: seg || 8 }); } },
  SphereGeometry: class { constructor(r, w, h) { return G("sphere", { r, w: w || 8, h: h || 6 }); } },
  TorusGeometry: class { constructor(r, t, rs, ts, arc) { return G("torus", { r, t, rs: rs || 6, ts: ts || 12, arc: arc || Math.PI * 2 }); } },
  PlaneGeometry: class { constructor() { return G("plane"); } },
  BufferGeometry: class {
    constructor() { this.kind = "buffer"; this.attributes = {}; this.index = null; }
    setAttribute(n, a) { this.attributes[n] = a; return this; }
    setIndex(i) { this.index = i; return this; }
    computeVertexNormals() {}
    dispose() {}
  },
  BufferAttribute: class { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; } },
  MeshLambertMaterial: Mat,
  /* ⚠️ BASIC ET LAMBERT NE PEUVENT PLUS ÊTRE LA MÊME CLASSE (414). Tant que la
     planche les confondait, elle ÉCLAIRAIT des matériaux qui, dans le jeu, ne
     le sont pas — la chaîne de montagnes lointaine, les halos de bonbons, les
     fanions de checkpoint. Ils apparaissaient donc plus contrastés sur l'image
     que dans le navigateur, ce qui est exactement le genre de mensonge qui fait
     régler une palette dans le vide. */
  MeshBasicMaterial: class extends Mat { constructor(o) { super(o); this.__basic = true; } },
  /* ⚠️ LES MATÉRIAUX PBR DU 422. Ils sont ÉCLAIRÉS comme le Lambert, plus une
     composante SPÉCULAIRE et un reflet d'environnement — c'est justement cette
     composante qui fait toute la différence visuelle du zip, donc la seule qu'il
     serait absurde de ne pas simuler ici. `__pbr` la déclenche ; sans le
     drapeau, la planche rendrait des bonbons mats et on conclurait que le
     clearcoat ne sert à rien. */
  MeshStandardMaterial: class extends Mat {
    constructor(o) { super(o); this.__pbr = true; if (this.roughness === undefined) this.roughness = 1; if (this.metalness === undefined) this.metalness = 0; }
  },
  MeshPhysicalMaterial: class extends Mat {
    constructor(o) { super(o); this.__pbr = true; if (this.roughness === undefined) this.roughness = 1; if (this.metalness === undefined) this.metalness = 0; }
  },
  PointsMaterial: Mat,
  /* ⚠️ LE STUB DE ShaderMaterial NE COMPILE RIEN, ET C'EST TOUT LE POINT : il
     retient les uniformes pour que la planche puisse LIRE ce que le shader
     ferait (la taille de base, l'opacité, le fondu) sans l'exécuter. Le vrai
     travail — la taille PAR GRAIN — est fait dans le rasteriseur, qui lit
     l'attribut `aSize` de la géométrie exactement comme la carte graphique. */
  ShaderMaterial: class extends Mat {
    constructor(o) { super(o); this.__shader = true; }
  },
  HemisphereLight: class extends Obj3 {
    constructor(sky, ground, i) {
      super();
      this.color = (sky instanceof Col) ? sky : new Col(sky);
      this.groundColor = (ground instanceof Col) ? ground : new Col(ground);
      this.intensity = i;
    }
  },
  CanvasTexture: class {
    constructor(cv) { this.image = cv; this.repeat = new V2(1, 1); this.offset = new V2(0, 0); this.encoding = 3000; }
    clone() { return new THREE.CanvasTexture(this.image); }
    dispose() {}
  },
  Mesh: class extends Obj3 { constructor(g, m) { super(); this.geometry = g || null; this.material = m || null; this.isMesh = true; } },
  Points: class extends Obj3 { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isPoints = true; } },
  Group: class extends Obj3 {},
  Vector3: V3,
  Vector2: V2,
  BackSide: 1, FrontSide: 0, DoubleSide: 2,
  RepeatWrapping: 1000, ClampToEdgeWrapping: 1001,
  AdditiveBlending: 2, NormalBlending: 1,
  /* ══════════════════════════════════════════════════════════════════════════
     LES CONSTANTES ET OBJETS DU 422. Ils ne FONT rien ici — ils existent pour
     que `world.js` s'exécute sans être modifié pour l'outil. C'est la règle du
     stub : il imite l'interface, jamais le comportement, et quand il doit
     imiter un comportement (l'éclairage, les ombres, le tone mapping) il le
     fait ailleurs, explicitement, là où on peut le relire.
     ⚠️ `EffectComposer` EST VOLONTAIREMENT ABSENT. `world.js` teste sa présence
     pour choisir entre « tone mapping dans le renderer » et « tone mapping dans
     la passe finale ». En le laissant indéfini, la planche emprunte le chemin
     SANS composer — et c'est ce qu'on veut, puisqu'elle applique elle-même ACES,
     le bloom et l'étalonnage, sur un tampon flottant qu'elle contrôle. */
  sRGBEncoding: 3001, LinearEncoding: 3000,
  NoToneMapping: 0, ACESFilmicToneMapping: 4,
  PCFSoftShadowMap: 2, BasicShadowMap: 0,
  RGBAFormat: 1023, HalfFloatType: 1016, FloatType: 1015,
  LinearFilter: 1006, LinearMipmapLinearFilter: 1008, NearestFilter: 1003,
  EquirectangularReflectionMapping: 303,
  WebGLRenderTarget: class { constructor(w, h, o) { this.width = w; this.height = h; Object.assign(this, o || {}); this.texture = { isTexture: true }; } setSize() {} dispose() {} },
  PMREMGenerator: class {
    constructor(r) { this.r = r; }
    compileEquirectangularShader() {}
    fromEquirectangular() { return { texture: { isTexture: true, __env: true } }; }
    dispose() {}
  },
};

/* ══════════════════════════════════════════════════════════════════════════════
   LE LECTEUR DE .glb DE LA PLANCHE (422) — SYNCHRONE, ET IL LE FAUT.
   ──────────────────────────────────────────────────────────────────────────────
   ⚠️ POURQUOI NE PAS RÉUTILISER LE VRAI GLTFLoader ICI : parce qu'il est
   asynchrone et que ce script est une suite d'appels bloquants qui montent une
   scène, la rendent et écrivent un PNG. Le rendre asynchrone contaminerait les
   onze planches et la simulation qui les précède, pour un gain nul.

   Ce lecteur ne gère QUE ce que le pipeline du 422 produit, et c'est
   volontaire : pas de compression Draco, pas de textures, pas de matériaux, pas
   d'animation, pas de hiérarchie profonde. Tout ce qui sort de
   `candyluge_props.py`, et rien d'autre.
   ⚠️ SI UN JOUR UN MODÈLE ARRIVE D'AILLEURS (Sketchfab, PolyHaven), CE LECTEUR
   LE REFUSERA — et il le refusera bruyamment, ce qui est le comportement voulu.
   Un stub qui accepterait à moitié rendrait une planche à moitié fausse.

   ⚠️ LA CONVERSION Y-UP EST DÉJÀ FAITE PAR BLENDER (`export_yup=True`). On ne
   retouche donc AUCUNE coordonnée ici. C'est le genre de correction qu'on est
   tenté d'ajouter « au cas où » et qui fait tourner tout le décor d'un quart de
   tour sans qu'aucune erreur ne le dise. */
function readGLB(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error("pas un GLB : " + file);
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(data.toString("utf8"));
    else if (type === 0x004E4942) bin = data;
    off += 8 + len + ((4 - (len % 4)) % 4) % 4;
    if (len % 4) off += (4 - (len % 4)) % 4;
  }
  if (!json || !bin) throw new Error("GLB incomplet : " + file);

  const CTOR = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
                 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

  function accessor(i) {
    const a = json.accessors[i];
    const bv = json.bufferViews[a.bufferView];
    const C = CTOR[a.componentType];
    const n = NCOMP[a.type];
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    /* ⚠️ ON RECOPIE PLUTÔT QUE DE POINTER DANS LE TAMPON. Un Buffer node
       n'est pas garanti aligné sur 4 octets à l'intérieur d'un fichier, et
       `new Float32Array(buffer, offset)` lève alors une exception d'alignement
       — sur certains fichiers seulement, ce qui en fait un bogue intermittent
       parfait. La copie coûte 300 Ko une fois au démarrage. */
    const out = new C(a.count * n);
    const bpe = C.BYTES_PER_ELEMENT;
    const stride = bv.byteStride || (bpe * n);
    for (let k = 0; k < a.count; k++) {
      for (let c = 0; c < n; c++) {
        const p = base + k * stride + c * bpe;
        out[k * n + c] = C === Float32Array ? bin.readFloatLE(p)
          : C === Uint16Array ? bin.readUInt16LE(p)
          : C === Uint32Array ? bin.readUInt32LE(p)
          : C === Uint8Array ? bin.readUInt8(p)
          : bin.readInt16LE(p);
      }
    }
    return out;
  }

  const root = new THREE.Group();
  const nodes = json.nodes || [];
  for (const nd of nodes) {
    if (nd.mesh === undefined) continue;
    const mesh = json.meshes[nd.mesh];
    for (const prim of mesh.primitives) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(accessor(prim.attributes.POSITION), 3));
      if (prim.attributes.NORMAL !== undefined) {
        g.setAttribute("normal", new THREE.BufferAttribute(accessor(prim.attributes.NORMAL), 3));
      }
      if (prim.indices !== undefined) g.setIndex(Array.from(accessor(prim.indices)));
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({}));
      m.name = nd.name || mesh.name || "part_white";
      if (nd.translation) m.position.set(nd.translation[0], nd.translation[1], nd.translation[2]);
      if (nd.scale) m.scale.set(nd.scale[0], nd.scale[1], nd.scale[2]);
      root.add(m);
    }
  }
  return { scene: root };
}

/* Le faux GLTFLoader : il rend le résultat IMMÉDIATEMENT (le rappel est appelé
   dans la foulée). `models.js` ne s'en aperçoit pas — il compte simplement ses
   fichiers et trouve zéro en attente au retour de `load()`. */
THREE.GLTFLoader = class {
  load(url, ok, prog, err) {
    try {
      ok(readGLB(path.join(root, url)));
    } catch (e) {
      console.log("      ⚠️ modèle illisible : " + url + " — " + e.message);
      if (err) err(e);
    }
  }
};

/* Un canvas 2D RÉEL (celui du défi de fuite) : les textures sont vraiment
   peintes, ce qui permet d'en prendre la moyenne — et le ciel, lui, est
   échantillonné pixel par pixel pour le fond de l'image. */
function makeCanvasEl(w, h) {
  const el = { width: w || 1, height: h || 1 };
  let ctx = null;
  el.getContext = () => {
    if (!ctx || ctx.__w !== el.width || ctx.__h !== el.height) {
      ctx = makeCanvas2D(el.width, el.height);
      ctx.__w = el.width; ctx.__h = el.height;
      el.ctx = ctx;
    }
    return ctx;
  };
  return el;
}

const ctxVm = vm.createContext({
  Math, console, JSON, THREE, Float32Array, Uint8ClampedArray, Array,
  performance: { now: () => 0 },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener: () => {}, devicePixelRatio: 1 },
  document: { getElementById: () => ({ classList: { toggle() {}, add() {} }, style: {}, addEventListener() {} }), createElement: (t) => (t === "canvas" ? makeCanvasEl() : {}) },
  localStorage: { getItem: () => null, setItem() {} },
});
for (const f of ["js/strings.js", "js/config.js", "js/slope.js", "js/sled.js",
                 "js/critters.js", "js/camera.js", "js/models.js", "js/world.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctxVm, { filename: f });
}
const { CFG, World, Slope, Sled, Critters, ChaseCamera } = vm.runInContext(
  "({ CFG, World, Slope, Sled, Critters, ChaseCamera })", ctxVm);

/* ⚠️ `window` DOIT PORTER `THREE` ET `Models`, et le manque est une panne
   MUETTE : `models.js` teste `window.THREE`, `world.js` teste `window.Models`.
   Dans un navigateur ces deux tests sont vrais parce que tout global l'est ;
   dans un `vm` node, `window` est un objet ordinaire qu'on a fabriqué à la
   main. Sans ces deux lignes, la planche rend le décor en PRIMITIVES et
   l'annonce nulle part — on croirait juger les modèles Blender alors qu'on
   regarde exactement l'image d'avant. */
ctxVm.window.THREE = THREE;
ctxVm.window.Models = vm.runInContext("Models", ctxVm);

/* Le faux Input : la luge doit pouvoir tourner pour qu'on voie un dérapage. */
var steerValue = 0;
var brakeValue = false;
ctxVm.Input = {
  axis: () => steerValue, jumpPressed: () => false,
  sliding: () => brakeValue, tucking: () => false, clear() {},
};
vm.runInContext("var Input = Input;", ctxVm);

/* ================================================= MATRICES ET TRIANGLES == */
function mul(a, b) {
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j];
    r[i * 4 + j] = s;
  }
  return r;
}
const ident = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function localMatrix(o) {
  const { x: rx, y: ry, z: rz } = o.rotation;
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const Rx = [1,0,0,0, 0,cx,-sx,0, 0,sx,cx,0, 0,0,0,1];
  const Ry = [cy,0,sy,0, 0,1,0,0, -sy,0,cy,0, 0,0,0,1];
  const Rz = [cz,-sz,0,0, sz,cz,0,0, 0,0,1,0, 0,0,0,1];
  const R = mul(mul(Rx, Ry), Rz);
  const S = [o.scale.x,0,0,0, 0,o.scale.y,0,0, 0,0,o.scale.z,0, 0,0,0,1];
  const T = [1,0,0,o.position.x, 0,1,0,o.position.y, 0,0,1,o.position.z, 0,0,0,1];
  return mul(T, mul(R, S));
}
const apply = (m, p) => ({
  x: m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
  y: m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
  z: m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
});

/* Découpe des primitives en triangles, en coordonnées LOCALES (la matrice les
   emmène ensuite dans le monde). Une primitive absente d'ici serait invisible
   dans la planche sans qu'aucune erreur ne le signale — d'où la liste
   exhaustive et le `default` bruyant en bas. */
function tessellate(g) {
  const T = [];
  const quad = (a, b, c, d) => { T.push([a, b, c]); T.push([a, c, d]); };
  if (g.kind === "box") {
    const c = [];
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) c.push([x, y, z]);
    // bits : 4=x, 2=y, 1=z
    quad(c[4], c[5], c[7], c[6]); quad(c[0], c[2], c[3], c[1]);
    quad(c[2], c[6], c[7], c[3]); quad(c[0], c[1], c[5], c[4]);
    quad(c[1], c[3], c[7], c[5]); quad(c[0], c[4], c[6], c[2]);
  } else if (g.kind === "cyl" || g.kind === "cone") {
    const n = Math.min(14, g.seg || 10);
    const rt = g.kind === "cone" ? 0 : 0.5, rb = 0.5, h = 0.5;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const p0 = [Math.cos(a0) * rb, -h, Math.sin(a0) * rb], p1 = [Math.cos(a1) * rb, -h, Math.sin(a1) * rb];
      const q0 = [Math.cos(a0) * rt, h, Math.sin(a0) * rt], q1 = [Math.cos(a1) * rt, h, Math.sin(a1) * rt];
      if (rt > 0) quad(p0, p1, q1, q0); else T.push([p0, p1, [0, h, 0]]);
      T.push([[0, -h, 0], p1, p0]);
      if (rt > 0) T.push([[0, h, 0], q0, q1]);
    }
  } else if (g.kind === "sphere") {
    const W = Math.min(12, g.w), H = Math.min(9, g.h);
    for (let j = 0; j < H; j++) {
      const t0 = (j / H) * Math.PI, t1 = ((j + 1) / H) * Math.PI;
      for (let i = 0; i < W; i++) {
        const p0 = (i / W) * Math.PI * 2, p1 = ((i + 1) / W) * Math.PI * 2;
        const P = (t, p) => [Math.sin(t) * Math.cos(p) * 0.5, Math.cos(t) * 0.5, Math.sin(t) * Math.sin(p) * 0.5];
        quad(P(t0, p0), P(t1, p0), P(t1, p1), P(t0, p1));
      }
    }
  } else if (g.kind === "torus") {
    const R = g.r, r = g.t, TS = Math.min(20, g.ts), RS = Math.min(8, g.rs);
    for (let i = 0; i < TS; i++) {
      const a0 = (i / TS) * g.arc, a1 = ((i + 1) / TS) * g.arc;
      for (let j = 0; j < RS; j++) {
        const b0 = (j / RS) * Math.PI * 2, b1 = ((j + 1) / RS) * Math.PI * 2;
        const P = (a, b) => [(R + r * Math.cos(b)) * Math.cos(a), (R + r * Math.cos(b)) * Math.sin(a), r * Math.sin(b)];
        quad(P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1));
      }
    }
  } else if (g.kind === "plane") {
    /* ⚠️ LE PLAN EST LA SEULE PRIMITIVE QUI AIT BESOIN DE SES UV (416), et il
       les lui fallait dès qu'on a posé des décalques dessus : ombres, cernes
       d'alerte et portes au sol sont TOUS des plans texturés dont l'information
       est entièrement dans la texture. Sans UV, la planche les rendait en aplat
       — un carré plein à la place d'un dégradé rond, c'est-à-dire précisément
       l'image qui aurait fait croire à un bogue du jeu.
       Les autres primitives s'en passent : elles portent des matériaux unis. */
    const a = [-0.5, -0.5, 0], b = [0.5, -0.5, 0], c = [0.5, 0.5, 0], d = [-0.5, 0.5, 0];
    // three.js met l'origine des UV en BAS À GAUCHE du plan.
    const ua = [0, 0], ub = [1, 0], uc = [1, 1], ud = [0, 1];
    const t1 = [a, b, c]; t1.uv = [ua, ub, uc]; T.push(t1);
    const t2 = [a, c, d]; t2.uv = [ua, uc, ud]; T.push(t2);
  } else if (g.kind === "buffer") {
    const pos = g.attributes.position && g.attributes.position.array;
    if (!pos) return T;
    const idx = g.index;
    const P = (k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
    const uvA = g.attributes.uv && g.attributes.uv.array;
    const U = (k) => (uvA ? [uvA[k * 2], uvA[k * 2 + 1]] : null);
    /* LES COULEURS PAR SOMMET (414) : c'est par elles que vit le sillon gravé,
       dont toute l'information — carre sombre contre bavure pâle, et
       l'effacement progressif — est portée par la couleur et par rien d'autre.
       Sans cette lecture, la trace apparaîtrait d'un blanc uniforme sur la
       planche, c'est-à-dire exactement le contraire de ce qu'on veut juger.
       ⚠️ Un triangle dont les trois sommets sont noirs est un segment JAMAIS
       ÉCRIT (tampon circulaire au repos) : on le jette, sans quoi trois cents
       quadrilatères repliés à l'origine barreraient le bas du cadre. */
    const colA = g.attributes.color && g.attributes.color.array;
    /* ⚠️ 422 : LES NORMALES DE SOMMET, quand la géométrie en porte. Elles ne
       servaient à rien tant que tout le décor était fait de primitives à
       facettes ; elles deviennent indispensables avec les modèles glTF, qui
       sont lissés. Voir le calcul de `N` dans `collect`. */
    const nrmA = g.attributes.normal && g.attributes.normal.array;
    const NN = (k) => [nrmA[k * 3], nrmA[k * 3 + 1], nrmA[k * 3 + 2]];
    const push3 = (a, b, c) => {
      if (colA) {
        const sum = colA[a * 3] + colA[a * 3 + 1] + colA[a * 3 + 2]
                  + colA[b * 3] + colA[b * 3 + 1] + colA[b * 3 + 2]
                  + colA[c * 3] + colA[c * 3 + 1] + colA[c * 3 + 2];
        if (sum < 0.02) return;
      }
      const tri = [P(a), P(b), P(c)];
      if (uvA) tri.uv = [U(a), U(b), U(c)];
      if (nrmA) tri.nrm = [NN(a), NN(b), NN(c)];
      if (colA) {
        const m3 = (k) => [colA[k * 3], colA[k * 3 + 1], colA[k * 3 + 2]];
        const q = [m3(a), m3(b), m3(c)];
        tri.vcol = [(q[0][0] + q[1][0] + q[2][0]) / 3,
                    (q[0][1] + q[1][1] + q[2][1]) / 3,
                    (q[0][2] + q[1][2] + q[2][2]) / 3];
      }
      T.push(tri);
    };
    if (idx) for (let i = 0; i < idx.length; i += 3) push3(idx[i], idx[i + 1], idx[i + 2]);
    else for (let i = 0; i < pos.length / 3; i += 3) push3(i, i + 1, i + 2);
  } else {
    console.log("  ⚠️ géométrie non tessellée : " + g.kind + " — elle sera INVISIBLE dans la planche");
  }
  return T;
}

/* La couleur d'un matériau : sa teinte, ou la MOYENNE de sa texture. */
const matColor = (m) => {
  if (!m) return 0xff00ff;
  if (m.map && m.map.image) return avgColor(m.map.image, m.color.h || 0xffffff);
  return m.color.h;
};

/* ⚠️ 422 — LA MÊME CHOSE, MAIS EN LINÉAIRE ET SANS ÉCRÊTAGE. C'est celle-ci
   que le rasteriseur utilise ; `matColor` ne sert plus qu'à l'échantillonnage
   de texture, où l'on travaille en octets de toute façon.
   La moyenne d'une texture est rendue en OCTETS sRGB par `avgColor` : elle est
   donc décodée ici, puis multipliée par la couleur du matériau — c'est
   exactement l'ordre de three.js (`map.rgb × color.rgb`, tous deux en linéaire
   au moment de la multiplication). */
function matColorL(m) {
  if (!m) return [1, 0, 1];
  const c = linRGB(m.color);
  if (m.map && m.map.image) {
    const avg = avgColor(m.map.image, 0xffffff);
    return [s2l(((avg >> 16) & 255) / 255) * c[0],
            s2l(((avg >> 8) & 255) / 255) * c[1],
            s2l((avg & 255) / 255) * c[2]];
  }
  return c;
}

/* ══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LA TRANSPARENCE ET LES PARTICULES (416) — LE POINT 3 DES « EN SUSPENS »
   DU 414, ET IL BLOQUAIT TOUT LE RESTE.
   ──────────────────────────────────────────────────────────────────────────────
   Le 414 notait, en dernière ligne de sa passation : « LES PARTICULES NE SONT
   SUR AUCUNE PLANCHE — la gerbe et les étoiles n'ont donc JAMAIS été regardées.
   C'est le premier chantier du 415 si l'on veut juger le rendu. » C'était vrai
   et c'est resté vrai un zip de plus. Le 416 le fait, et pas par acquit de
   conscience : il ajoute au jeu quatre choses qui sont TOUTES transparentes ou
   faites de points — les ombres portées, les cernes d'alerte, les portes au
   sol, et la pluie de bonbons de l'arrivée. Sans cette passe, on les aurait
   livrées sans les avoir vues une seule fois, ce qui est exactement ce que ces
   deux outils existent pour empêcher.

   ⚠️ POURQUOI ÇA NE MARCHAIT PAS TOUT SEUL. Le rasteriseur est un z-buffer
   opaque : chaque pixel garde le triangle le plus proche et écrase le reste. Un
   triangle à moitié transparent y devient donc soit totalement opaque, soit
   absent — il n'y a pas de troisième possibilité dans ce schéma. Il faut une
   SECONDE PASSE, et elle obéit à trois règles qui sont celles de toutes les
   cartes graphiques depuis toujours :

     1. LES OPAQUES D'ABORD, avec écriture de profondeur. Ils construisent le
        décor et le tampon de profondeur qui servira de masque.
     2. LES TRANSPARENTS ENSUITE, TRIÉS DU PLUS LOIN AU PLUS PROCHE. Le tri est
        obligatoire : le fondu n'est pas commutatif, deux voiles mélangés dans
        le mauvais ordre ne donnent pas la même couleur.
     3. ILS TESTENT LA PROFONDEUR MAIS NE L'ÉCRIVENT PAS. Écrire masquerait les
        transparents situés derrière eux — un rideau de gerbe effacerait la
        gerbe qu'il y a derrière au lieu de s'y ajouter. C'est exactement ce que
        dit `depthWrite: false` dans world.js, et c'est pour ça que tous les
        matériaux de particules le portent.

   ⚠️ ET LE FONDU ADDITIF N'EST PAS LE FONDU NORMAL. Le 414 insiste là-dessus
   pour la gerbe (« c'est de la matière, elle doit cacher, pas illuminer ») ;
   une planche qui les confondrait rendrait le jugement impossible sur
   précisément le point qu'on a passé un zip à régler. Les deux sont donc
   implémentés séparément : `dst + src·a` d'un côté, `dst·(1−a) + src·a` de
   l'autre.
   ══════════════════════════════════════════════════════════════════════════ */

/* L'alpha d'un texel, s'il y en a un. ⚠️ NÉCESSAIRE ET PAS OPTIONNEL : toutes
   les textures d'effet du jeu (étoile, poudre, gerbe, ombre, cerne, porte)
   sont des dégradés qui vont à alpha 0 sur leurs bords. Ignorer ce canal
   donnerait des CARRÉS pleins à la place de chaque particule — ce qui aurait
   l'air d'un bogue de rendu du jeu, alors que ce serait un bogue de l'outil. */
function texel(im, tu, tv) {
  const ip = im.ctx.pixels;
  const sx = ((Math.floor(tu * im.width) % im.width) + im.width) % im.width;
  const sy = ((Math.floor(tv * im.height) % im.height) + im.height) % im.height;
  const si = (sy * im.width + sx) * 4;
  return [ip[si], ip[si + 1], ip[si + 2], ip[si + 3]];
}

function collect(rootObj) {
  const faces = [];
  (function walk(o, parentM) {
    if (!o.visible) return;
    const m = mul(parentM, localMatrix(o));
    if (o.isPoints && o.geometry && o.geometry.attributes.position) {
      /* Les PARTICULES. three.js les rend comme des carrés toujours face à la
         caméra, dont la taille à l'écran vaut `size · f / z` quand
         `sizeAttenuation` est vrai. On ne peut pas le faire ici (on ne connaît
         pas encore la caméra), donc on ne fabrique pas de triangles : on
         collecte les points bruts et le rasteriseur les projettera lui-même.
         C'est aussi ce qui permet de les trier avec les triangles transparents,
         dans un seul et même tri — les particules et les voiles se croisent. */
      const M = o.material || {};
      const pos = o.geometry.attributes.position.array;
      const colA = o.geometry.attributes.color && o.geometry.attributes.color.array;
      const map = (M.map && M.map.image && M.map.image.ctx) ? M.map.image : null;
      /* ⚠️ 422 : LA TAILLE PAR GRAIN. Sans cette lecture, la planche rendrait
         tous les grains à la taille de base et la variance introduite au 422
         — le seul changement de particules qui se voie vraiment — serait
         INVISIBLE ici. Un outil qui ne montre pas ce qu'on vient d'ajouter
         est un outil qui valide à l'aveugle. */
      const sizeA = o.geometry.attributes.aSize && o.geometry.attributes.aSize.array;
      for (let i = 0; i < pos.length; i += 3) {
        // Une particule morte est parquée à l'origine (voir world.js) : on ne
        // la rend pas, sinon toute la réserve inutilisée s'empilerait au
        // point (0,0,0), c'est-à-dire à la ligne de départ.
        if (pos[i] === 0 && pos[i + 1] === 0 && pos[i + 2] === 0) continue;
        // ⚠️ `apply` prend un TABLEAU, pas un objet {x,y,z} — les deux formes
        // coexistent dans ce fichier (les sommets sont des tableaux, les
        // positions du monde des objets) et les confondre donne des NaN
        // silencieux : tout disparaît sans qu'une seule erreur soit levée.
        const p = apply(m, [pos[i], pos[i + 1], pos[i + 2]]);
        const c = colA ? [colA[i], colA[i + 1], colA[i + 2]] : [1, 1, 1];
        // Une particule tout à fait noire est éteinte : les systèmes du jeu
        // remettent la couleur à zéro pour recycler un grain (voir updateFx).
        if (c[0] + c[1] + c[2] < 0.004 && colA) continue;
        faces.push({
          point: p, size: (sizeA ? sizeA[i / 3] : 0) || M.size || 1, map, vcol: c,
          alpha: M.opacity === undefined ? 1 : M.opacity,
          additive: M.blending === THREE.AdditiveBlending,
          /* ⚠️ 422 : `vcol` EST DÉJÀ EN LINÉAIRE. `emit()` convertit à la
             naissance de la particule (voir world.js) ; le reconvertir ici
             l'écraserait une seconde fois et éteindrait toutes les étincelles
             d'un cran — la faute exacte contre laquelle `sc()` met en garde. */
          blend: true, tint: M.color ? M.color.h : 0xffffff,
          tintL: M.color ? linRGB(M.color) : [1, 1, 1],
        });
      }
    }
    if (o.isMesh && o.geometry) {
      const col = matColor(o.material);
      /* ⚠️ LA TEXTURE EST ÉCHANTILLONNÉE POUR DE VRAI DEPUIS LE 412, et il a
         fallu ça pour pouvoir répondre à « y a pas de texture au sol ». Tant
         que la planche rendait chaque matériau par la MOYENNE de sa texture,
         un sol correctement texturé et un sol uni donnaient exactement la même
         image — l'outil ne pouvait pas voir le défaut qu'on lui demandait de
         juger. Un outil qui ne montre pas ce qu'on juge est pire qu'un outil
         absent : il rassure. */
      const map = (o.material && o.material.map && o.material.map.image
        && o.material.map.image.ctx) ? o.material.map.image : null;
      const isSky = !!(o.material && o.material.fog === false && o.material.side === 1);
      // Un matériau Basic n'est PAS éclairé — dans le jeu comme ici.
      const flat = !!(o.material && o.material.__basic);
      /* ⚠️ 422 : LES PARAMÈTRES PBR SONT LUS SUR LE MATÉRIAU, JAMAIS DEVINÉS.
         Une table de correspondance « ce matériau est verni » aurait divergé au
         premier ajout — c'est le reproche que ce fichier se fait déjà à lui-même
         à propos de l'éclairage écrit en double. */
      const MM = o.material || {};
      const colL = matColorL(o.material);
      const pbr = MM.__pbr ? {
        rough: MM.clearcoat ? Math.min(MM.roughness, MM.clearcoatRoughness || 0.1) : (MM.roughness === undefined ? 1 : MM.roughness),
        metal: MM.metalness || 0,
        envI: MM.envMapIntensity === undefined ? 1 : MM.envMapIntensity,
        // L'émission : c'est elle qui pousse un bonbon au-dessus du seuil de bloom.
        emis: MM.emissive ? linRGB(MM.emissive).map((v) => v * (MM.emissiveIntensity === undefined ? 1 : MM.emissiveIntensity)) : null,
      } : null;
      const cast = !!o.castShadow;
      if (!isSky) {
        for (const tri of tessellate(o.geometry)) {
          const p = tri.map((v) => apply(m, v));
          const ux = p[1].x - p[0].x, uy = p[1].y - p[0].y, uz = p[1].z - p[0].z;
          const vx = p[2].x - p[0].x, vy = p[2].y - p[0].y, vz = p[2].z - p[0].z;
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const L = Math.hypot(nx, ny, nz) || 1;
          const M = o.material || {};
          /* ⚠️ LES NORMALES DE SOMMET SONT MOYENNÉES QUAND ELLES EXISTENT (422),
             ET C'EST DEVENU NÉCESSAIRE AVEC LES MODÈLES glTF. Une facette plate
             est une approximation acceptable pour une boîte ; sur une forme
             lissée sortie de Blender, elle transforme un galbe en polyèdre et
             fait conclure que le modèle importé est raté alors qu'il ne l'est
             que sur la planche. On garde un ombrage PAR FACE (l'interpolation
             par pixel serait une réécriture du rasteriseur pour un gain qui ne
             change rien au jugement) mais avec la BONNE normale moyenne. */
          let N = { x: nx / L, y: ny / L, z: nz / L };
          if (tri.nrm) {
            const ax = (tri.nrm[0][0] + tri.nrm[1][0] + tri.nrm[2][0]) / 3;
            const ay = (tri.nrm[0][1] + tri.nrm[1][1] + tri.nrm[2][1]) / 3;
            const az = (tri.nrm[0][2] + tri.nrm[1][2] + tri.nrm[2][2]) / 3;
            // La normale locale doit être TOURNÉE, pas translatée : on applique
            // la matrice sans sa colonne de translation.
            const wx = m[0] * ax + m[1] * ay + m[2] * az;
            const wy = m[4] * ax + m[5] * ay + m[6] * az;
            const wz = m[8] * ax + m[9] * ay + m[10] * az;
            const wl = Math.hypot(wx, wy, wz);
            if (wl > 1e-6) N = { x: wx / wl, y: wy / wl, z: wz / wl };
          }
          faces.push({
            p, n: N, col, colL, pbr, cast, map, uv: tri.uv, flat, vcol: tri.vcol,
            /* ⚠️ `tint` EST LA COULEUR DU MATÉRIAU, `col` EST LA MOYENNE DE SA
               TEXTURE. Les deux existent et ne servent pas à la même chose : la
               passe opaque n'a besoin que d'une teinte représentative pour
               calculer un rapport d'éclairage, la passe transparente doit
               MULTIPLIER le texel par la couleur, comme le fait three.js
               (`final = map.rgb × color.rgb`). Les confondre teinterait deux
               fois — un cerne d'alerte rose sur une texture rose donnerait du
               rouge sombre. */
            tint: M.color ? M.color.h : 0xffffff,
            tintL: M.color ? linRGB(M.color) : [1, 1, 1],
            /* ⚠️ `blend` EST DÉDUIT DU MATÉRIAU, PAS DÉCIDÉ ICI. C'est le même
               drapeau que lit three.js : si le jeu change d'avis sur
               l'opacité d'un objet, la planche suit sans qu'on y touche. Toute
               autre solution (une liste de noms, une convention) diverge au
               premier ajout — et c'est précisément ce qu'on reproche aux deux
               écritures de l'éclairage plus bas. */
            blend: !!M.transparent && (M.opacity === undefined || M.opacity < 1),
            alpha: M.opacity === undefined ? 1 : M.opacity,
            additive: M.blending === THREE.AdditiveBlending,
          });
        }
      }
    }
    for (const c of o.children) walk(c, m);
  })(rootObj, ident());
  return faces;
}

/* ============================================================ RASTERISEUR = */
const skyCanvas = (function () {
  // On rejoue la peinture de ciel du jeu, dans le même contexte : c'est LA
  // texture du jeu, pas une approximation.
  return vm.runInContext("(function(){ return null; })()", ctxVm);
})();

/* ══════════════════════════════════════════════════════════════════════════
   L'ÉCLAIRAGE DE LA PLANCHE — ⚠️ REFAIT AU 422 EN MÊME TEMPS QUE CELUI DU JEU.
   ──────────────────────────────────────────────────────────────────────────
   ⚠️ CES DEUX ÉCRITURES DOIVENT RESTER D'ACCORD, ET C'EST LA SEULE DETTE QUE
   CET OUTIL FAIT PORTER AU PROJET. Le jeu éclaire avec three.js, la planche
   réimplémente le même modèle à la main : si world.js change de lumière et
   qu'on oublie ici, l'outil continue de rendre de belles images qui ne
   ressemblent plus à rien de ce que le joueur voit. Un outil de contrôle qui
   ment est pire qu'un outil absent, parce qu'il rassure.

   ⚠️⚠️ CE QUI A CHANGÉ AU 422, ET POURQUOI ON NE POUVAIT PAS S'EN DISPENSER :
   le jeu ne rend plus en gamma. Toute la chaîne est linéaire, avec un tone
   mapping ACES en sortie et un bloom sur les valeurs qui dépassent 1. Une
   planche restée en octets 0-255 n'aurait rien pu montrer de tout ça — elle
   aurait rendu des images plus claires que le jeu, sans hautes lumières et sans
   halos, c'est-à-dire précisément l'inverse de ce qu'on doit juger. Le tampon
   est donc devenu FLOTTANT et NON BORNÉ, et la conversion vers l'écran est la
   toute dernière opération (`resolve`).

   Le modèle, recopié terme à terme sur World.init() :
     * une AMBIANTE faible et uniforme ;
     * une lumière d'HÉMISPHÈRE : three.js l'interpole du sol vers le ciel selon
       `0,5·n.y + 0,5`, donc par l'ORIENTATION VERTICALE de la face ;
     * le SOLEIL, chaud et rasant, qui domine et creuse le relief ;
     * un CONTRE-JOUR froid (422 : il est passé de « sous l'horizon » à
       « derrière », voir le commentaire de world.js) ;
     * un ENVIRONNEMENT — la couleur du ciel réfléchie, approximée par la même
       interpolation ciel/sol que l'hémisphère. Grossier, mais c'est le terme
       qui empêche les surfaces vernies d'être noires, donc le pire à omettre.

   ⚠️ ET UNE COMPOSANTE SPÉCULAIRE, nouvelle. Elle n'est pas décorative : c'est
   elle qui distingue un bonbon d'un plot de plastique, et c'est tout l'objet du
   passage en PBR. Modèle de Blinn-Phong avec un exposant tiré de la rugosité —
   ce n'est pas GGX, mais l'écart entre les deux est invisible sur des sphères
   de deux mètres, alors que l'écart entre « avec » et « sans » saute aux yeux.
   ══════════════════════════════════════════════════════════════════════════ */
const SUN_C = [s2l(((CFG.COL_LIGHT_SUN >> 16) & 255) / 255), s2l(((CFG.COL_LIGHT_SUN >> 8) & 255) / 255), s2l((CFG.COL_LIGHT_SUN & 255) / 255)];
const SKY_C = [s2l(((CFG.COL_LIGHT_SKY >> 16) & 255) / 255), s2l(((CFG.COL_LIGHT_SKY >> 8) & 255) / 255), s2l((CFG.COL_LIGHT_SKY & 255) / 255)];
const GND_C = [s2l(((CFG.COL_LIGHT_GROUND >> 16) & 255) / 255), s2l(((CFG.COL_LIGHT_GROUND >> 8) & 255) / 255), s2l((CFG.COL_LIGHT_GROUND & 255) / 255)];
const FIL_C = [s2l(((CFG.COL_LIGHT_FILL >> 16) & 255) / 255), s2l(((CFG.COL_LIGHT_FILL >> 8) & 255) / 255), s2l((CFG.COL_LIGHT_FILL & 255) / 255)];
const FOG_L = [s2l(((CFG.COL_FOG >> 16) & 255) / 255), s2l(((CFG.COL_FOG >> 8) & 255) / 255), s2l((CFG.COL_FOG & 255) / 255)];

/* Le facteur d'éclairage DIFFUS, par canal, en linéaire. Par canal, et il le
   faut : tout l'intérêt du modèle est que le rouge et le bleu ne sont PAS
   éclairés pareil selon qu'une face regarde le ciel ou la neige. */
/* ⚠️⚠️ L'ENVIRONNEMENT ÉCLAIRE AUSSI EN DIFFUS, ET L'OUBLIER EST LE PIÈGE N°1
   DE CE GENRE DE PORTAGE. Dans r128, `scene.environment` alimente à la fois
   `RE_IndirectSpecular` (le reflet, celui auquel on pense) ET
   `RE_IndirectDiffuse` (une lumière ambiante COLORÉE par le ciel, à laquelle on
   ne pense pas). Une planche qui ne modéliserait que le reflet rendrait donc le
   décor systématiquement plus sombre que le jeu — et on remonterait l'ambiante
   dans config.js pour compenser, ce qui brûlerait le jeu.
   L'irradiance d'environnement est ici approximée par les deux extrémités de la
   palette de ciel : le bleu du zénith au-dessus, la crème de l'horizon en
   dessous. C'est grossier et c'est du bon grossier — c'est littéralement la
   texture dont le PMREM du jeu est tiré. */
function skyStop(k) {
  const hexs = CFG.COL_SKY[k][1];
  const v = parseInt(hexs.slice(1), 16);
  return [s2l(((v >> 16) & 255) / 255), s2l(((v >> 8) & 255) / 255), s2l((v & 255) / 255)];
}
const ENV_UP = skyStop(0);
const ENV_DOWN = skyStop(CFG.COL_SKY.length - 1);

function lightK(n, sun, fillL, shade) {
  const cs = Math.max(0, n.x * sun.x + n.y * sun.y + n.z * sun.z) * (shade === undefined ? 1 : shade);
  const cf = Math.max(0, n.x * fillL.x + n.y * fillL.y + n.z * fillL.z);
  const hemiT = 0.5 * n.y + 0.5;          // 1 = face au ciel, 0 = face au sol
  const A = CFG.LIGHT_AMBIENT, Hh = CFG.LIGHT_SKY, S = CFG.LIGHT_SUN, F = CFG.LIGHT_FILL;
  /* ⚠️⚠️ 423 : LE DIFFUS D'ENVIRONNEMENT SE DÉRIVE DE `ENV_INTENSITY`, COMME
     DANS r128 — ET C'EST LA CORRECTION QUI COMPTE LE PLUS DANS CE FICHIER.
     Au 422 il était une constante indépendante (`ENV_DIFFUSE: 0.18`), réglée
     pour que la planche soit belle. Le jeu, lui, applique `envMapIntensity` aux
     DEUX termes indirects : la planche sous-estimait donc l'ambiante d'environ
     0,3 sur chaque surface, et personne ne pouvait le voir ici. C'est comme ça
     qu'un rendu « trop réfléchissant, on ne voit plus la piste » a pu être
     livré avec des planches qui semblaient justes.
     ⚠️ RÈGLE GÉNÉRALE : un paramètre de l'outil qui DOUBLE un paramètre du jeu
     est une divergence en attente. Il doit toujours être DÉRIVÉ, jamais réglé. */
  const E = CFG.ENV_INTENSITY * CFG.ENV_DIFFUSE;
  const k = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    k[i] = A
      + Hh * (GND_C[i] + (SKY_C[i] - GND_C[i]) * hemiT)
      + E * (ENV_DOWN[i] + (ENV_UP[i] - ENV_DOWN[i]) * hemiT)
      + S * SUN_C[i] * cs
      + F * FIL_C[i] * cf;
  }
  return k;
}

/* La composante SPÉCULAIRE (422) : l'éclat du soleil, plus le reflet du ciel.
   ⚠️ `env` n'est pas une constante mais dépend de l'orientation, comme
   l'hémisphère : une face tournée vers le haut réfléchit du bleu, une face
   tournée vers le bas réfléchit le rose de la neige. C'est faux au sens strict
   (un vrai reflet dépend de la direction de vue) et juste au sens qui compte :
   ça donne aux surfaces vernies une couleur d'éclat qui varie avec la forme,
   ce qui est ce qu'on regarde. */
function specK(n, sun, view, rough, metal, envI, albedo) {
  const r = Math.max(0.03, rough);
  const shin = 2 / (r * r * r * r) - 2;          // rugosité → exposant de Blinn
  const hx = sun.x - view.x, hy = sun.y - view.y, hz = sun.z - view.z;
  const hl = Math.hypot(hx, hy, hz) || 1;
  const nh = Math.max(0, (n.x * hx + n.y * hy + n.z * hz) / hl);
  const spec = Math.pow(nh, Math.min(2048, shin)) * (shin + 8) / (8 * Math.PI);
  const hemiT = 0.5 * n.y + 0.5;
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    // Le F0 d'un diélectrique vaut 4 % ; un métal réfléchit sa propre couleur.
    const f0 = 0.04 * (1 - metal) + albedo[i] * metal;
    const env = (ENV_DOWN[i] + (ENV_UP[i] - ENV_DOWN[i]) * hemiT) * envI;
    /* ⚠️ AUCUN FACTEUR D'AMPLIFICATION ICI, ET C'EST UNE CORRECTION DU 422.
       Premier jet : `spec × 3` et `env × 8`, « pour que ça se voie ». Résultat,
       les patins de la luge et les bonbons sortaient à plus de 2,5 en linéaire,
       débordaient dans le bloom et noyaient le cadre — l'image entière était
       blanche. La normalisation de Blinn `(shin+8)/8π` FAIT DÉJÀ le travail de
       conservation d'énergie ; la doubler à la main est la façon la plus
       courante de casser un rendu PBR, et elle ne ressemble pas à une erreur
       quand on l'écrit. */
    out[i] = CFG.LIGHT_SUN * SUN_C[i] * spec * f0 + env * f0;
  }
  return out;
}

/* Le brouillard, en linéaire. ⚠️ MÉLANGER EN LINÉAIRE ET NON EN GAMMA : c'est
   ce que fait three.js, et l'écart n'est pas subtil — un brouillard mélangé en
   gamma est nettement plus clair à mi-distance, ce qui « mange » les montagnes
   exactement là où on les regarde. */
function fogMixL(c, dist) {
  const f = 1 - Math.exp(-Math.pow(dist * CFG.FOG_DENSITY, 2));
  return [c[0] * (1 - f) + FOG_L[0] * f, c[1] * (1 - f) + FOG_L[1] * f, c[2] * (1 - f) + FOG_L[2] * f];
}

/* ══════════════════════════════════════════════════════════════════════════
   LA CARTE D'OMBRE LOGICIELLE (422).
   ──────────────────────────────────────────────────────────────────────────
   ⚠️ ELLE EXISTE PARCE QU'ON NE PEUT PAS JUGER DES OMBRES QU'ON NE VOIT PAS, ET
   QUE C'EST LE POINT 2 DU CHANTIER. Le README notait jusqu'ici « hors planche :
   les ombres calculées — le jeu n'en a pas non plus ». La seconde moitié de la
   phrase est devenue fausse au 422 ; la première le serait restée, et l'outil
   aurait alors caché la moitié du travail du zip.

   C'est le même algorithme que le matériel : un rendu de profondeur depuis le
   soleil, en projection ORTHOGRAPHIQUE, sur le même volume que le jeu (une
   boîte de SHADOW_RADIUS autour de la luge) ; puis, pour chaque pixel du rendu
   caméra, on reprojette sa position monde dans ce rendu et on compare.

   ⚠️ LE BIAIS EST INDISPENSABLE ET IL EST GRAND (0,08 unité). Sans lui, une
   surface s'ombre elle-même en rayures — l'« acné d'ombre ». Il est plus grand
   ici que dans le jeu parce que cette carte est bien plus basse en résolution,
   et parce qu'on n'a pas de `normalBias`. Une planche un peu trop indulgente
   sur les ombres de contact vaut mieux qu'une planche rayée dont on ne peut
   rien conclure. */
function buildShadowMap(faces, sunDir, center, size, res) {
  // Un repère orthonormé aligné sur la direction du soleil.
  const n = (v) => { const L = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / L, y: v.y / L, z: v.z / L }; };
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const d = n({ x: -sunDir.x, y: -sunDir.y, z: -sunDir.z });     // du soleil vers la scène
  const upRef = Math.abs(d.y) > 0.95 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const rr = n(cross(d, upRef));
  const uu = n(cross(rr, d));
  const depth = new Float32Array(res * res).fill(1e18);
  const half = size;
  const proj = (p) => {
    const q = { x: p.x - center.x, y: p.y - center.y, z: p.z - center.z };
    const a = q.x * d.x + q.y * d.y + q.z * d.z;          // profondeur le long du rayon
    const rx = q.x * rr.x + q.y * rr.y + q.z * rr.z;
    const ry = q.x * uu.x + q.y * uu.y + q.z * uu.z;
    return { x: (rx / half * 0.5 + 0.5) * res, y: (ry / half * 0.5 + 0.5) * res, z: a };
  };
  for (const fc of faces) {
    if (!fc.p || !fc.cast) continue;
    const P = fc.p.map(proj);
    const minY = Math.max(0, Math.floor(Math.min(P[0].y, P[1].y, P[2].y)));
    const maxY = Math.min(res - 1, Math.ceil(Math.max(P[0].y, P[1].y, P[2].y)));
    const minX = Math.max(0, Math.floor(Math.min(P[0].x, P[1].x, P[2].x)));
    const maxX = Math.min(res - 1, Math.ceil(Math.max(P[0].x, P[1].x, P[2].x)));
    if (maxX < minX || maxY < minY) continue;
    const det = (P[1].x - P[0].x) * (P[2].y - P[0].y) - (P[2].x - P[0].x) * (P[1].y - P[0].y);
    if (Math.abs(det) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const pxc = x + 0.5, pyc = y + 0.5;
      const w0 = ((P[1].x - pxc) * (P[2].y - pyc) - (P[2].x - pxc) * (P[1].y - pyc)) / det;
      const w1 = ((P[2].x - pxc) * (P[0].y - pyc) - (P[0].x - pxc) * (P[2].y - pyc)) / det;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * P[0].z + w1 * P[1].z + w2 * P[2].z;
      const i = y * res + x;
      if (z < depth[i]) depth[i] = z;
    }
  }
  const BIAS = 0.08;
  return {
    filledTexels() { let n = 0; for (let i = 0; i < depth.length; i++) if (depth[i] < 1e17) n++; return n; },
    /* Un PCF 2×2 : c'est le minimum pour que le bord d'ombre ne soit pas un
       escalier de texels, et c'est ce que fait `PCFSoftShadowMap`. */
    sample(p) {
      const q = proj(p);
      if (q.x < 1 || q.y < 1 || q.x >= res - 1 || q.y >= res - 1) return 1;
      let lit = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const i = ((q.y + dy) | 0) * res + ((q.x + dx) | 0);
        lit += (q.z - BIAS <= depth[i]) ? 1 : 0; cnt++;
      }
      return lit / cnt;
    },
  };
}

function render(faces, cam, W, H, skyPx, skyW, skyH, sledPos) {
  /* ⚠️⚠️ LE TAMPON EST FLOTTANT ET NON BORNÉ (422). Voir l'en-tête de
     l'éclairage : c'est la seule façon de laisser exister des valeurs
     supérieures à 1, donc de rendre le bloom et le tone mapping visibles ici
     comme dans le jeu. La conversion vers des octets est faite une seule fois,
     tout à la fin, par `resolve`. */
  const px = new Float32Array(W * H * 3);
  const zbuf = new Float64Array(W * H).fill(1e18);

  const norm = (v) => { const L = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / L, y: v.y / L, z: v.z / L }; };
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const dd = norm({ x: cam.look.x - cam.pos.x, y: cam.look.y - cam.pos.y, z: cam.look.z - cam.pos.z });
  let rr = norm(cross(dd, { x: 0, y: 1, z: 0 }));
  let uu = norm(cross(rr, dd));
  // Le roulis de la caméra du jeu, appliqué au repère (et non à l'image) :
  // c'est ce que fait camera.rotateZ après le lookAt.
  if (cam.roll) {
    const c = Math.cos(cam.roll), s = Math.sin(cam.roll);
    const r2 = { x: rr.x * c + uu.x * s, y: rr.y * c + uu.y * s, z: rr.z * c + uu.z * s };
    const u2 = { x: uu.x * c - rr.x * s, y: uu.y * c - rr.y * s, z: uu.z * c - rr.z * s };
    rr = r2; uu = u2;
  }
  const f = (H / 2) / Math.tan((cam.fov * Math.PI / 180) / 2);

  /* LE FOND : la texture de ciel du jeu, échantillonnée par la direction du
     rayon (mappage sphérique, celui d'une SphereGeometry). Un fond uni
     mentirait sur la moitié haute du cadre — c'est-à-dire sur la moitié qu'on
     a justement dégagée pour le paysage. */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = (x + 0.5 - W / 2) / f, sy = -(y + 0.5 - H / 2) / f;
    const d = norm({ x: dd.x + rr.x * sx + uu.x * sy, y: dd.y + rr.y * sx + uu.y * sy, z: dd.z + rr.z * sx + uu.z * sy });
    const u = (Math.atan2(d.z, d.x) / (Math.PI * 2) + 0.5) % 1;
    const v = Math.min(0.999, Math.max(0, 0.5 - Math.asin(Math.max(-1, Math.min(1, d.y))) / Math.PI));
    const si = ((Math.min(skyH - 1, (v * skyH) | 0)) * skyW + Math.min(skyW - 1, (u * skyW) | 0)) * 4;
    const i = (y * W + x) * 3;
    /* ⚠️ LE CIEL AUSSI EST DÉCODÉ. Il est peint au canvas, donc en sRGB. Le
       laisser en l'état le rendrait beaucoup trop clair par rapport au décor
       qui, lui, est éclairé en linéaire — et le premier réflexe serait
       d'assombrir la texture de ciel, ce qui casserait aussi l'environnement
       qui en est tiré. */
    px[i] = s2l(skyPx[si] / 255);
    px[i + 1] = s2l(skyPx[si + 1] / 255);
    px[i + 2] = s2l(skyPx[si + 2] / 255);
  }

  /* ⚠️ LA DIRECTION DU SOLEIL EST CELLE DE world.js, ET LES DEUX DOIVENT LE
     RESTER (422 : abaissée de 0,52 à 0,42, comme dans le jeu). Un soleil de
     planche plus haut que celui du jeu donne des ombres plus courtes ici que
     là-bas, et on règle alors la longueur des ombres dans le vide. */
  /* ⚠️⚠️ CE SONT LES VECTEURS DE `world.js`, RECOPIÉS AU SIGNE PRÈS, et le
     signe est tout le sujet. Une DirectionalLight de three.js éclaire DEPUIS sa
     `position` VERS sa cible : `sun.position` est donc la direction VERS le
     soleil, celle qu'on met dans un produit scalaire avec la normale. La
     recopier en l'inversant donne une image parfaitement plausible, éclairée
     de l'autre côté — et des ombres qui tombent à l'opposé de celles du jeu,
     ce qui est exactement le genre d'écart qu'on ne remarque jamais sur une
     planche isolée.
     (Le 421 avait d'ailleurs ici (−0,55 ; 1 ; 0,35) là où le jeu avait
     (−0,8 ; 0,52 ; 0,3) : le bon côté, mais un soleil beaucoup trop haut. Les
     ombres de la planche étaient donc plus courtes que celles du jeu.) */
  const sun = norm({ x: -0.8, y: 0.42, z: 0.3 });
  const fillL = norm({ x: 0.75, y: 0.30, z: -0.85 });
  const viewDir = dd;   // la direction de vue, pour le terme spéculaire

  /* LA CARTE D'OMBRE. Centrée sur la luge, comme dans le jeu — c'est le même
     raisonnement (voir `setupSunShadow`) et il faut que ce soit le même volume,
     sinon la planche montre des ombres là où le jeu n'en a pas. */
  const DBGSH = { tested: 0, shadowed: 0, full: 0, half: 0 };
  const shadowOn = !!(CFG.SHADOW_ON && sledPos);
  const shadowMap = shadowOn
    ? buildShadowMap(faces, sun, sledPos, CFG.SHADOW_RADIUS, 1024)
    : null;
  if (process.env.DBG) {
    let nc = 0; for (const fc of faces) if (fc.cast) nc++;
    let filled = shadowMap ? shadowMap.filledTexels() : -1;
    console.log("      DBG faces projetant une ombre :", nc, "/", faces.length, " texels ecrits:", filled);
  }

  /* La projection d'un point du monde vers l'écran. Sortie en fonction plutôt
     qu'en ligne : la passe transparente et les particules en ont besoin aussi,
     et trois copies de la même formule sont trois occasions de diverger. */
  const project = (p) => {
    const q = { x: p.x - cam.pos.x, y: p.y - cam.pos.y, z: p.z - cam.pos.z };
    const along = q.x * dd.x + q.y * dd.y + q.z * dd.z;
    const right = q.x * rr.x + q.y * rr.y + q.z * rr.z;
    const up = q.x * uu.x + q.y * uu.y + q.z * uu.z;
    return {
      sx: W / 2 + (right / Math.max(0.05, along)) * f,
      sy: H / 2 - (up / Math.max(0.05, along)) * f,
      z: along,
    };
  };

  /* ⚠️ LA SÉPARATION SE FAIT AVANT LE RENDU ET PAS PENDANT. Une seule boucle
     avec un `if` ne suffirait pas : les transparents doivent être TRIÉS entre
     eux, ce qui suppose de tous les connaître d'abord. */
  const solid = [], veils = [];
  for (const fc of faces) (fc.blend ? veils : solid).push(fc);

  for (const face of solid) {
    const P = face.p.map((p) => {
      const q = { x: p.x - cam.pos.x, y: p.y - cam.pos.y, z: p.z - cam.pos.z };
      const along = q.x * dd.x + q.y * dd.y + q.z * dd.z;
      const right = q.x * rr.x + q.y * rr.y + q.z * rr.z;
      const up = q.x * uu.x + q.y * uu.y + q.z * uu.z;
      return { sx: W / 2 + (right / Math.max(0.05, along)) * f, sy: H / 2 - (up / Math.max(0.05, along)) * f, z: along };
    });
    if (P.some((p) => p.z < 0.4)) continue;                 // derrière l'œil : on saute plutôt que de découper
    const zAvg = (P[0].z + P[1].z + P[2].z) / 3;
    if (zAvg > CFG.DRAW_DISTANCE) continue;
    const fogF = 1 - Math.exp(-Math.pow(zAvg * CFG.FOG_DENSITY, 2));
    const alb = face.colL || [1, 0, 1];
    const pbr = face.pbr;
    /* ⚠️ L'ÉCLAIRAGE EST CALCULÉ UNE FOIS PAR FACE, MAIS L'OMBRE PAR PIXEL. Les
       deux ne peuvent pas être au même endroit : une facette de piste fait
       plusieurs mètres, et une ombre calculée en son centre serait soit
       entièrement dedans soit entièrement dehors — on verrait la piste s'ombrer
       par gros carreaux, ce qui est pire que pas d'ombre du tout. */
    const kDiffNoShade = face.flat ? null : lightK(face.n, sun, fillL, 1);
    const kDiffShaded = face.flat ? null : lightK(face.n, sun, fillL, 0);
    const spec = (!face.flat && pbr)
      ? specK(face.n, sun, viewDir, pbr.rough, pbr.metal, pbr.envI, alb)
      : null;

    const minY = Math.max(0, Math.floor(Math.min(P[0].sy, P[1].sy, P[2].sy)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(P[0].sy, P[1].sy, P[2].sy)));
    const minX = Math.max(0, Math.floor(Math.min(P[0].sx, P[1].sx, P[2].sx)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(P[0].sx, P[1].sx, P[2].sx)));
    if (maxX < minX || maxY < minY) continue;
    const d1 = (P[1].sx - P[0].sx) * (P[2].sy - P[0].sy) - (P[2].sx - P[0].sx) * (P[1].sy - P[0].sy);
    if (Math.abs(d1) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const pxc = x + 0.5, pyc = y + 0.5;
      const w0 = ((P[1].sx - pxc) * (P[2].sy - pyc) - (P[2].sx - pxc) * (P[1].sy - pyc)) / d1;
      const w1 = ((P[2].sx - pxc) * (P[0].sy - pyc) - (P[0].sx - pxc) * (P[2].sy - pyc)) / d1;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * P[0].z + w1 * P[1].z + w2 * P[2].z;
      const idx = y * W + x;
      if (z >= zbuf[idx]) continue;
      zbuf[idx] = z;
      const i = idx * 3;
      /* La position monde du pixel : `z` est la distance LE LONG de l'axe de
         vue, donc le rayon non normalisé (dd + rr·sx + uu·sy) multiplié par z
         redonne exactement le point. Aucune racine carrée, et c'est exact. */
      let shade01 = 1;
      if (shadowMap && !face.flat) {
        DBGSH.tested++;
        const sxn = (pxc - W / 2) / f, syn = -(pyc - H / 2) / f;
        shade01 = shadowMap.sample({
          x: cam.pos.x + (dd.x + rr.x * sxn + uu.x * syn) * z,
          y: cam.pos.y + (dd.y + rr.y * sxn + uu.y * syn) * z,
          z: cam.pos.z + (dd.z + rr.z * sxn + uu.z * syn) * z,
        });
        if (shade01 < 0.99) DBGSH.shadowed++;
        if (shade01 < 0.02) DBGSH.full++;
        if (shade01 < 0.5) DBGSH.half++;
      }
      /* Le mélange entre « au soleil » et « à l'ombre » : on interpole les DEUX
         facteurs d'éclairage plutôt que de multiplier le résultat par un
         facteur d'ombre. La différence compte — multiplier éteindrait aussi
         l'ambiante et l'hémisphère, et une ombre portée deviendrait un trou
         noir au lieu d'une zone bleutée. C'est le défaut le plus courant des
         ombres « faites à la main », et il est visible du premier coup d'œil. */
      let er = 0, eg = 0, eb = 0;
      if (!face.flat) {
        er = kDiffShaded[0] + (kDiffNoShade[0] - kDiffShaded[0]) * shade01;
        eg = kDiffShaded[1] + (kDiffNoShade[1] - kDiffShaded[1]) * shade01;
        eb = kDiffShaded[2] + (kDiffNoShade[2] - kDiffShaded[2]) * shade01;
      }
      if (process.env.SHDBG) { px[i] = px[i+1] = px[i+2] = shade01 * 0.5; continue; }
      let cr, cg, cb;
      if (face.map && face.uv) {
        // UV barycentriques, puis répétition (les UV du jeu sont en unités du
        // monde et sortent donc largement de [0,1] — c'est le principe).
        /* ⚠️⚠️ INTERPOLATION PERSPECTIVE-CORRECTE — CORRECTION DU 414, ET ELLE A
           FAILLI COÛTER TRÈS CHER.

           Cette ligne interpolait les UV directement par les poids
           barycentriques calculés À L'ÉCRAN. C'est du placage AFFINE, exactement
           celui de la PlayStation 1, et il a un défaut caractéristique : sur une
           grande surface vue sous un angle rasant, la texture se TORD en chevrons
           en zigzag de part et d'autre de la diagonale de chaque quadrilatère.

           ⚠️ ON A DONC PASSÉ TROIS ITÉRATIONS À CORRIGER, DANS LE JEU, UN DÉFAUT
           QUI N'EXISTAIT QUE DANS CET OUTIL. Les grands chevrons roses en travers
           de la piste — accusés d'être du moiré, puis mis sur le compte des
           sillons, puis des tourbillons — étaient produits ici, à cette ligne.
           (Les corrections de texture faites entre-temps restent bonnes et
           nécessaires par ailleurs : les motifs étaient réellement trop fins, et
           ça, ça se serait vu dans le navigateur. Mais ce n'était pas la cause
           des chevrons.)

           ⚠️ LA LEÇON, ET ELLE VAUT POUR TOUT OUTIL DE CONTRÔLE : quand une
           planche montre un défaut, la première question est « le jeu a-t-il ce
           défaut, ou seulement la planche ? ». Un rasteriseur logiciel écrit à la
           main ne fait PAS ce que fait une carte graphique, et chaque écart entre
           les deux est un faux positif en puissance.

           La correction est celle de tous les rasteriseurs depuis 1996 : ce qui
           s'interpole linéairement à l'écran n'est pas u, mais u/z — on
           interpole donc u/z et 1/z, puis on divise l'un par l'autre. */
        const u0 = face.uv[0], u1 = face.uv[1], u2 = face.uv[2];
        const iz0 = 1 / P[0].z, iz1 = 1 / P[1].z, iz2 = 1 / P[2].z;
        const iz = w0 * iz0 + w1 * iz1 + w2 * iz2;
        const tu = (w0 * u0[0] * iz0 + w1 * u1[0] * iz1 + w2 * u2[0] * iz2) / iz;
        const tv = (w0 * u0[1] * iz0 + w1 * u1[1] * iz1 + w2 * u2[1] * iz2) / iz;
        const im = face.map, ip = im.ctx.pixels;
        const sx2 = ((Math.floor(tu * im.width) % im.width) + im.width) % im.width;
        const sy2 = ((Math.floor(tv * im.height) % im.height) + im.height) % im.height;
        const si = (sy2 * im.width + sx2) * 4;
        // Le texel est en sRGB : on le décode, on le multiplie par la teinte du
        // matériau (elle aussi linéaire) et on éclaire. C'est l'ordre du shader.
        cr = s2l(ip[si] / 255) * (face.tintL ? face.tintL[0] : 1);
        cg = s2l(ip[si + 1] / 255) * (face.tintL ? face.tintL[1] : 1);
        cb = s2l(ip[si + 2] / 255) * (face.tintL ? face.tintL[2] : 1);
      } else {
        cr = alb[0]; cg = alb[1]; cb = alb[2];
      }
      if (face.flat) {
        // Basic : pas d'éclairage, seulement le brouillard.
        px[i] = cr * (1 - fogF) + FOG_L[0] * fogF;
        px[i + 1] = cg * (1 - fogF) + FOG_L[1] * fogF;
        px[i + 2] = cb * (1 - fogF) + FOG_L[2] * fogF;
      } else {
        /* ⚠️ UN MÉTAL N'A PAS DE DIFFUS. C'est la définition même du modèle
         métal/rugosité : ce que le métal ne réfléchit pas, il l'absorbe. Sans
         cette ligne, les patins en caramel cumulaient un diffus plein ET un
         reflet plein, et ils sortaient deux fois trop clairs — ce qui donnait
         cette impression de luge « en néon » sur la première planche du 422. */
      const kd = pbr ? (1 - pbr.metal) : 1;
      let lr = cr * er * kd, lg = cg * eg * kd, lb = cb * eb * kd;
        if (spec) {
          /* ⚠️ LE SPÉCULAIRE EST OMBRÉ LUI AUSSI, mais seulement sa part
             solaire — le reflet du ciel, lui, existe encore à l'ombre. Les
             confondre ferait disparaître tout éclat dans les zones ombrées, et
             une surface vernie à l'ombre deviendrait mate, ce qui est faux et
             se voit sur les bonbons du bord de piste. */
          lr += spec[0] * (0.35 + 0.65 * shade01);
          lg += spec[1] * (0.35 + 0.65 * shade01);
          lb += spec[2] * (0.35 + 0.65 * shade01);
        }
        if (pbr && pbr.emis) { lr += pbr.emis[0]; lg += pbr.emis[1]; lb += pbr.emis[2]; }
        px[i] = lr * (1 - fogF) + FOG_L[0] * fogF;
        px[i + 1] = lg * (1 - fogF) + FOG_L[1] * fogF;
        px[i + 2] = lb * (1 - fogF) + FOG_L[2] * fogF;
      }
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     SECONDE PASSE — LES VOILES ET LES PARTICULES, DU PLUS LOIN AU PLUS PRÈS.
     ════════════════════════════════════════════════════════════════════════ */
  const drawn = [];
  for (const fc of veils) {
    if (fc.point) {
      const P = project(fc.point);
      if (P.z < 0.4 || P.z > CFG.DRAW_DISTANCE) continue;
      drawn.push({ fc, P, z: P.z });
    } else {
      const P = fc.p.map(project);
      if (P.some((p) => p.z < 0.4)) continue;
      const z = (P[0].z + P[1].z + P[2].z) / 3;
      if (z > CFG.DRAW_DISTANCE) continue;
      drawn.push({ fc, P, z });
    }
  }
  // ⚠️ DÉCROISSANT : on peint le plus lointain en premier, et chaque voile plus
  // proche vient par-dessus. L'ordre inverse donnerait des particules qui
  // s'effacent les unes les autres au lieu de s'empiler.
  drawn.sort((a, b) => b.z - a.z);

  /* Le mélange d'un pixel. `add` distingue les deux fondus du jeu : additif
     pour les étoiles (de la lumière, ça s'ajoute), normal pour la gerbe, les
     ombres et les portes (de la matière et des repères, ça recouvre).

     ⚠️⚠️ LA SOURCE EST DÉJÀ PRÉMULTIPLIÉE PAR SON ALPHA, ET C'EST UNE
     PROPRIÉTÉ DU CANVAS DE lib-canvas2d.js, PAS UNE CONVENTION QU'ON CHOISIT.
     Son `_put` compose en partant d'un tampon NOIR : `px = px·(1−a) + c·a`
     avec px = 0 au départ donne px = c·a. La couleur rangée dans la texture
     est donc déjà la couleur multipliée par la couverture, et l'alpha est rangé
     à part dans le quatrième canal.
     Si l'on remultipliait ici, chaque dégradé serait élevé au carré : les
     particules deviendraient des points minuscules et durs, les ombres
     quasiment invisibles, et on passerait la journée à remonter des opacités
     dans config.js pour compenser un défaut d'outil. C'est exactement le piège
     des chevrons roses du 414 sous une autre forme. */
  /* ⚠️⚠️ 422 — TOUT SE FAIT MAINTENANT EN FLOTTANTS LINÉAIRES, ET LES DEUX
     PIÈGES DE 2016 ONT DISPARU AVEC LE Uint8Array : plus de modulo 256 (le
     « gros nuage noir » du 416), plus d'écrêtage à 255. En contrepartie il faut
     se souvenir que `sr/sg/sb` arrivent en 0-255 sRGB prémultipliés : c'est la
     convention du canvas de lib-canvas2d.js, qu'on ne change pas. La conversion
     se fait donc ici, au seul endroit qui écrit dans le tampon.
     ⚠️ ET ON NE DÉCODE PAS L'ALPHA. L'alpha n'est pas une couleur : c'est une
     couverture. Le passer dans la courbe sRGB durcirait tous les bords de
     particules, ce qui est la moitié oubliée de la règle du linéaire. */
  /* ⚠️⚠️ 422 — TOUT SE FAIT MAINTENANT EN FLOTTANTS LINÉAIRES, ET LES DEUX
     PIÈGES HISTORIQUES ONT DISPARU AVEC LE Uint8Array. Ils valent d'être gardés
     en mémoire, parce qu'ils reviendront le jour où quelqu'un « optimisera » ce
     tampon en octets :

       * un Uint8Array NE SATURE PAS, il prend le reste modulo 256. Une gerbe
         blanche à 209 posée sur une piste à 51 donnait 4, c'est-à-dire du noir
         presque pur exactement là où l'on attendait le blanc le plus vif. C'est
         le « gros nuage noir » du 416, et le fondu additif d'à côté, qui avait
         son écrêtage, rendait le défaut incompréhensible ;
       * l'écrêtage à 255 tuait toute valeur supérieure au blanc, c'est-à-dire
         tout ce que le bloom doit voir.

     ⚠️ `sr/sg/sb` ARRIVENT EN 0-255 sRGB PRÉMULTIPLIÉS PAR LEUR ALPHA. C'est la
     convention du canvas de lib-canvas2d.js (son `_put` compose depuis un
     tampon noir), on ne la change pas, et remultiplier ici élèverait chaque
     dégradé au carré.
     ⚠️ ET ON NE DÉCODE PAS L'ALPHA. L'alpha n'est pas une couleur, c'est une
     couverture : le passer dans la courbe sRGB durcirait tous les bords de
     particules. C'est la moitié de la règle du linéaire que tout le monde
     oublie. */
  const blendPx = (i, sr, sg, sb, a, add) => {
    if (a <= 0.002) return;
    const lr = s2l(Math.max(0, sr) / 255), lg = s2l(Math.max(0, sg) / 255), lb = s2l(Math.max(0, sb) / 255);
    if (add) {
      px[i] += lr; px[i + 1] += lg; px[i + 2] += lb;
    } else {
      px[i] = px[i] * (1 - a) + lr;
      px[i + 1] = px[i + 1] * (1 - a) + lg;
      px[i + 2] = px[i + 2] * (1 - a) + lb;
    }
  };

  for (const item of drawn) {
    const fc = item.fc;

    /* ---------------------------------------------------- UNE PARTICULE ---
       Un carré face à la caméra. ⚠️ SA TAILLE À L'ÉCRAN VAUT `size·f/z`, ce
       qui est la formule exacte de `sizeAttenuation` dans three.js — et il
       faut la respecter au facteur près, sinon on juge des particules deux
       fois trop grosses ou trop fines et on règle FX_*_SIZE dans le vide. */
    if (fc.point) {
      const P = item.P;
      const half = (fc.size * f) / (2 * P.z);
      if (half < 0.35) continue;                     // sous le pixel : invisible
      const x0 = Math.max(0, Math.floor(P.sx - half)), x1 = Math.min(W - 1, Math.ceil(P.sx + half));
      const y0 = Math.max(0, Math.floor(P.sy - half)), y1 = Math.min(H - 1, Math.ceil(P.sy + half));
      // La teinte finale : couleur du matériau × couleur du sommet, comme
      // three.js. Les particules du jeu portent leur couleur au sommet (c'est
      // ce qui leur fait tirer toute la palette des bonbons) et laissent le
      // matériau en blanc — mais on n'en fait pas l'hypothèse.
      const kr = ((fc.tint >> 16) & 255) / 255 * fc.vcol[0];
      const kg = ((fc.tint >> 8) & 255) / 255 * fc.vcol[1];
      const kb = (fc.tint & 255) / 255 * fc.vcol[2];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const idx = y * W + x;
        // Test de profondeur SANS écriture : une particule derrière une
        // montagne disparaît, mais elle ne masque pas celles de derrière.
        if (P.z >= zbuf[idx]) continue;
        const tu = (x + 0.5 - (P.sx - half)) / (2 * half);
        const tv = (y + 0.5 - (P.sy - half)) / (2 * half);
        if (tu < 0 || tu > 1 || tv < 0 || tv > 1) continue;
        let a = fc.alpha;
        let sr = 255 * kr, sg2 = 255 * kg, sb2 = 255 * kb;
        if (fc.map) {
          const t = texel(fc.map, tu * 0.999, tv * 0.999);
          a *= t[3];
          sr = t[0] * kr; sg2 = t[1] * kg; sb2 = t[2] * kb;
        }
        // La source prémultipliée doit l'être aussi par l'opacité du matériau,
        // qui ne fait pas partie de la texture.
        blendPx(idx * 3, sr * fc.alpha, sg2 * fc.alpha, sb2 * fc.alpha, a, fc.additive);
      }
      continue;
    }

    /* ------------------------------------------------------- UN TRIANGLE --
       Même rasterisation que la passe opaque, au fondu et à l'absence
       d'écriture de profondeur près. On ne factorise pas les deux : la passe
       opaque est le chemin chaud (deux cent mille triangles), et l'alourdir de
       tests qui ne la concernent pas coûterait plus que la duplication. */
    const P = item.P;
    /* Un voile est presque toujours en matériau Basic (les repères le sont
       tous, par principe : voir mat.cpFlag dans world.js). On garde quand même
       la branche éclairée pour le cas où un objet de décor deviendrait
       translucide — mais on l'applique à la TEINTE du matériau, jamais à la
       moyenne de sa texture. */
    /* ⚠️ ON RESTE EN 0-1 sRGB DANS CETTE PASSE, parce que `blendPx` attend des
       octets sRGB — c'est la convention de la texture. Le facteur d'éclairage,
       lui, est linéaire ; l'appliquer tel quel à une valeur sRGB est une
       approximation, et elle est ACCEPTABLE ICI et nulle part ailleurs : les
       voiles du jeu sont presque tous en matériau Basic (donc non éclairés,
       donc facteur 1) et les deux ou trois qui ne le sont pas sont des
       décalques presque transparents. Le jour où un objet de décor opaque
       deviendra translucide, c'est cette ligne qu'il faudra reprendre. */
    const tr = (fc.tint >> 16) & 255, tg = (fc.tint >> 8) & 255, tb = fc.tint & 255;
    let kr = tr / 255, kg = tg / 255, kb = tb / 255;
    if (!fc.flat) {
      const k = lightK(fc.n, sun, fillL, 1);
      kr *= k[0]; kg *= k[1]; kb *= k[2];
    }
    const minY = Math.max(0, Math.floor(Math.min(P[0].sy, P[1].sy, P[2].sy)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(P[0].sy, P[1].sy, P[2].sy)));
    const minX = Math.max(0, Math.floor(Math.min(P[0].sx, P[1].sx, P[2].sx)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(P[0].sx, P[1].sx, P[2].sx)));
    if (maxX < minX || maxY < minY) continue;
    const d1 = (P[1].sx - P[0].sx) * (P[2].sy - P[0].sy) - (P[2].sx - P[0].sx) * (P[1].sy - P[0].sy);
    if (Math.abs(d1) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const pxc = x + 0.5, pyc = y + 0.5;
      const w0 = ((P[1].sx - pxc) * (P[2].sy - pyc) - (P[2].sx - pxc) * (P[1].sy - pyc)) / d1;
      const w1 = ((P[2].sx - pxc) * (P[0].sy - pyc) - (P[0].sx - pxc) * (P[2].sy - pyc)) / d1;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * P[0].z + w1 * P[1].z + w2 * P[2].z;
      const idx = y * W + x;
      /* ⚠️ LA TOLÉRANCE DE PROFONDEUR REMPLACE LE `polygonOffset` DU JEU. Les
         ombres et les portes sont posées à cinq centimètres du sol : sans
         marge, la moitié des pixels d'un décalque passe le test et l'autre
         non, ce qui donne un damier scintillant — le z-fighting, exactement
         celui que `polygonOffset` évite dans le navigateur. Vingt centimètres
         suffisent et ne laissent rien traverser de ce qui compte. */
      if (z >= zbuf[idx] + 0.2) continue;
      let a = fc.alpha;
      let sr = 255 * kr, sg2 = 255 * kg, sb2 = 255 * kb;
      if (fc.map && fc.uv) {
        const iz0 = 1 / P[0].z, iz1 = 1 / P[1].z, iz2 = 1 / P[2].z;
        const iz = w0 * iz0 + w1 * iz1 + w2 * iz2;
        const tu = (w0 * fc.uv[0][0] * iz0 + w1 * fc.uv[1][0] * iz1 + w2 * fc.uv[2][0] * iz2) / iz;
        const tv = (w0 * fc.uv[0][1] * iz0 + w1 * fc.uv[1][1] * iz1 + w2 * fc.uv[2][1] * iz2) / iz;
        const t = texel(fc.map, tu, tv);
        a *= t[3];
        sr = t[0] * kr; sg2 = t[1] * kg; sb2 = t[2] * kb;
      }
      blendPx(idx * 3, sr * fc.alpha, sg2 * fc.alpha, sb2 * fc.alpha, a, fc.additive);
    }
  }

  if (process.env.DBG) console.log("      DBG pixels testes:", DBGSH.tested, "partielles:", DBGSH.shadowed, "≥50%:", DBGSH.half, "pleines:", DBGSH.full);
  return px;
}

/* ══════════════════════════════════════════════════════════════════════════════
   LA PASSE FINALE DE LA PLANCHE (422) — LE MÊME TRAITEMENT QUE LE JEU.
   ──────────────────────────────────────────────────────────────────────────────
   ⚠️ ELLE EXISTE PARCE QUE SANS ELLE LA PLANCHE NE MONTRE PAS LE JEU. Le jeu
   rend en HDR puis fait passer l'image par un EffectComposer : bloom sur les
   valeurs supérieures à 1, tone mapping ACES, étalonnage chaud/froid, vignette,
   grain, encodage sRGB. Une planche qui s'arrêterait au HDR rendrait une image
   délavée et sans halos — c'est-à-dire une image sur laquelle on ne pourrait
   juger AUCUN des points 1, 4 et 6 du chantier.

   ⚠️ CE N'EST PAS LE MÊME CODE QUE LE SHADER, ET C'EST LA DETTE ASSUMÉE DE CET
   OUTIL — la même que pour l'éclairage, et pour les mêmes raisons. Les deux
   doivent rester d'accord ; les constantes viennent toutes de config.js pour
   que la moitié du travail soit faite automatiquement.

   ⚠️ LE BLOOM EST UN VRAI BRIGHT-PASS + FLOU SÉPARABLE, pas un halo peint. Un
   halo peint aurait montré un joli effet quelles que soient les valeurs de la
   scène, donc aurait été incapable de dire si le SEUIL est bien réglé — or le
   seuil est tout le sujet (voir BLOOM_THRESHOLD dans config.js). Ici, si rien
   ne dépasse 0,92, rien ne brille : la planche répond à la question posée. */
function resolve(lin, W, H) {
  const out = new Uint8Array(W * H * 3);

  /* ---- 1. LE BLOOM. Bright-pass à demi-résolution, deux flous séparables. --- */
  let bloom = null;
  if (CFG.BLOOM_ON && CFG.BLOOM_STRENGTH > 0) {
    const bw = Math.max(1, W >> 1), bh = Math.max(1, H >> 1);
    let a = new Float32Array(bw * bh * 3);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = (y * bw + x) * 3, j = ((y * 2) * W + x * 2) * 3;
      for (let c = 0; c < 3; c++) {
        const v = lin[j + c];
        // Le bright-pass de UnrealBloomPass : on soustrait le seuil, on garde
        // ce qui dépasse. Un seuil « dur » (0 ou v) produirait un bord net sur
        // les dégradés ; le genou de three.js est adouci, on l'imite.
        a[i + c] = Math.max(0, v - CFG.BLOOM_THRESHOLD);
      }
    }
    const R = Math.max(1, Math.round(CFG.BLOOM_RADIUS * 12));
    const w = [];
    let ws = 0;
    for (let k = -R; k <= R; k++) { const g = Math.exp(-(k * k) / (2 * (R / 2.2) * (R / 2.2))); w.push(g); ws += g; }
    for (let k = 0; k < w.length; k++) w[k] /= ws;
    const blur = (src, horiz) => {
      const dst = new Float32Array(src.length);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = -R; k <= R; k++) {
          const sx = horiz ? Math.min(bw - 1, Math.max(0, x + k)) : x;
          const sy = horiz ? y : Math.min(bh - 1, Math.max(0, y + k));
          const j = (sy * bw + sx) * 3, q = w[k + R];
          r += src[j] * q; g += src[j + 1] * q; b += src[j + 2] * q;
        }
        const i = (y * bw + x) * 3;
        dst[i] = r; dst[i + 1] = g; dst[i + 2] = b;
      }
      return dst;
    };
    a = blur(blur(a, true), false);
    bloom = { data: a, w: bw, h: bh };
  }

  /* ---- 2. ACES, étalonnage, vignette, grain, sRGB — dans CET ordre. -------- */
  const aces = (x) => {
    const A = 2.51, B = 0.03, C = 2.43, D = 0.59, E = 0.14;
    return Math.max(0, Math.min(1, (x * (A * x + B)) / (x * (C * x + D) + E)));
  };
  /* Un bruit déterministe : une planche doit être REPRODUCTIBLE. Deux rendus du
     même instant qui diffèrent d'un grain aléatoire rendraient toute comparaison
     avant/après impossible, ce qui est justement la méthode de travail du zip. */
  const hash12 = (x, y) => {
    let h = (x * 374761393 + y * 668265263) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
  };
  const asp = Math.max(1, W / H);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    let r = lin[i], g = lin[i + 1], b = lin[i + 2];
    if (bloom) {
      const bx = Math.min(bloom.w - 1, x >> 1), by = Math.min(bloom.h - 1, y >> 1);
      const j = (by * bloom.w + bx) * 3, k = CFG.BLOOM_STRENGTH;
      r += bloom.data[j] * k; g += bloom.data[j + 1] * k; b += bloom.data[j + 2] * k;
    }
    r *= CFG.TONE_EXPOSURE; g *= CFG.TONE_EXPOSURE; b *= CFG.TONE_EXPOSURE;
    r = aces(r); g = aces(g); b = aces(b);

    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const hi = Math.max(0, Math.min(1, (l - 0.55) / 0.45));
    const lo = 1 - Math.max(0, Math.min(1, l / 0.42));
    r += CFG.GRADE_WARM * 1.00 * hi * hi * (3 - 2 * hi) + CFG.GRADE_COOL * 0.28 * lo;
    g += CFG.GRADE_WARM * 0.62 * hi * hi * (3 - 2 * hi) + CFG.GRADE_COOL * 0.20 * lo;
    b += CFG.GRADE_WARM * 0.10 * hi * hi * (3 - 2 * hi) + CFG.GRADE_COOL * 1.00 * lo;
    r = l + (r - l) * CFG.GRADE_SAT;
    g = l + (g - l) * CFG.GRADE_SAT;
    b = l + (b - l) * CFG.GRADE_SAT;
    // Le contraste, pivot 0,42 — voir GRADE_CONTRAST dans config.js.
    r = (r - 0.42) * CFG.GRADE_CONTRAST + 0.42;
    g = (g - 0.42) * CFG.GRADE_CONTRAST + 0.42;
    b = (b - 0.42) * CFG.GRADE_CONTRAST + 0.42;

    const dx = (x / W - 0.5) * asp, dy = (y / H - 0.5);
    const d = Math.hypot(dx, dy) * 1.42;
    const v = Math.max(0, Math.min(1, (d - CFG.VIGNETTE_SOFT) / (1.15 - CFG.VIGNETTE_SOFT)));
    const vg = 1 - CFG.VIGNETTE * v * v * (3 - 2 * v);
    r *= vg; g *= vg; b *= vg;

    const gr = hash12(x, y) * CFG.GRAIN * (1 - l * 0.7);
    r += gr; g += gr; b += gr;

    out[i] = Math.max(0, Math.min(255, Math.round(l2s(Math.max(0, r)) * 255)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round(l2s(Math.max(0, g)) * 255)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round(l2s(Math.max(0, b)) * 255)));
  }
  return out;
}

/* ================================================================ SCÈNES == */
const W = 1200, H = 720;
/* ⚠️ LE SURÉCHANTILLONNAGE (414), ET IL EST DEVENU INDISPENSABLE.
   Ce rasteriseur prend UN texel par pixel, au plus proche. Il n'a ni mipmaps ni
   filtrage anisotrope — c'est-à-dire précisément les deux choses qui, dans le
   navigateur, empêchent une texture de sol de scintiller sous un angle rasant.
   Conséquence : la planche montrait un moiré BEAUCOUP PLUS VIOLENT que le jeu,
   et l'écart n'allait pas dans le sens qu'on croit. On risquait donc de courir
   après un défaut déjà corrigé, ou pire, de le juger insoluble.

   En rendant à 2×2 puis en moyennant, chaque pixel final agrège quatre
   échantillons : c'est un filtrage grossier, mais c'est le même GENRE de
   filtrage que celui du matériel, et la planche redevient représentative. On y
   gagne en prime un anticrénelage des silhouettes, qui manquait aussi.
   Quatre fois plus de pixels à rasteriser — quelques secondes de plus, pour
   des images sur lesquelles on peut enfin conclure. */
const SS = 2;

function shot(name, sAt, uAt, steer, driftFake, label, sim, runup) {
  // On monte la scène une fois par planche : les tronçons construits dépendent
  // de la position, et on veut voir exactement ce que le joueur verrait là.
  World.init(makeCanvasEl(W * SS, H * SS));
  const slope = new Slope.SlopeGen();
  const sled = new Sled();
  const field = new Critters.Field();
  const cam = new ChaseCamera(World.camera);

  /* ══════════════════════════════════════════════════════════════════════
     ⚠️ ON SIMULE VRAIMENT LA DESCENTE (414), ON NE POSE PLUS LA LUGE.
     ══════════════════════════════════════════════════════════════════════
     Jusqu'au 413, la planche PLAÇAIT la luge à une abscisse et lui affectait
     un `drift` à la main. Ça suffisait tant qu'on ne jugeait qu'un décor. Ça ne
     suffit plus du tout, pour deux raisons qui sont tout l'objet de ce zip :

       1. LE SILLON GRAVÉ N'EXISTE QUE SI L'ON A ROULÉ. C'est une trace : sans
          plusieurs secondes de trajectoire derrière soi, il n'y a rien à
          montrer. Une luge téléportée ne laisse aucune trace, et on ne pourrait
          donc jamais regarder l'effet principal du 414.
       2. LES ÉTATS DE CONDUITE NE SE FABRIQUENT PAS À LA MAIN. `edge`, `skid`,
          `load`, `deep`, la suspension : ce sont des états à INERTIE, liés
          entre eux. Les poser arbitrairement produit des combinaisons que la
          physique ne peut pas atteindre — on jugerait alors une image du jeu
          qui n'arrive jamais.

     On fait donc rouler la vraie physique, avec les vraies touches, jusqu'à
     l'abscisse voulue. Ce qu'on voit sur la planche est ce que le joueur voit. */
  /* ⚠️ LA LONGUEUR D'ÉLAN EST RÉGLABLE DEPUIS LE 416, ET IL LE FALLAIT.
     Deux cent quarante unités d'élan sont parfaites au milieu de la piste :
     assez pour graver un sillon, assez pour que les états de conduite
     s'établissent. Elles sont FATALES près de l'arrivée — le pilote « tout
     droit » percute les dernières vagues, retourne au fanion, recommence, et
     la simulation épuise ses 1 500 images sans jamais franchir la ligne. La
     planche de l'arrivée montrait donc l'avant-dernier kilomètre, sans un seul
     bonbon dans le ciel, et l'effet paraissait ne pas exister.
     ⚠️ Une planche qui ne va pas là où on l'envoie est pire qu'une planche
     absente : on croit avoir regardé. */
  const RUNUP = runup === undefined ? 240 : runup;
  const nodeIndex0 = Math.floor(Math.max(0, sAt - RUNUP - 20) / CFG.NODE_LEN);
  slope.ensureAhead(nodeIndex0);
  for (const n of slope.nodes) World.buildNode(n);

  if (sim) {
    sled.s = Math.max(0, sAt - RUNUP);
    sled.v = 30;
    let t = 0;
    // 25 secondes au plus : la luge atteint toujours la cible avant.
    for (let i = 0; i < 1500 && sled.s < sAt; i++) {
      t += 1 / 60;
      /* Une manière de conduire rend soit un axe, soit { steer, brake } : le
         frein à main est le VRAI outil du dérapage volontaire (il fait chuter
         l'adhérence, voir BRAKE_GRIP_MUL), et sans lui on ne peut pas montrer
         le second régime de conduite du jeu. */
      const cmd = sim(t, sled);
      if (typeof cmd === "number") { steerValue = cmd; brakeValue = false; }
      else { steerValue = cmd.steer; brakeValue = !!cmd.brake; }
      const wasReset = sled.reset;
      sled.update(1 / 60, t * 1000, slope.finishK(sled.s));
      const ni = Math.floor(sled.s / CFG.NODE_LEN);
      /* ⚠️ ON REJOUE LE RECUL DE FENÊTRE DU JEU (voir SlopeGen.rewind). Sans
         cette branche, la planche ne montrerait pas le bogue de piste vide
         après une chute — et c'est ELLE qui l'a trouvé. Un outil de contrôle
         qui simplifie le cas d'erreur ne contrôle plus rien. */
      if (!wasReset && sled.reset > 0) {
        for (const n of slope.rewind(ni)) World.dropNode(n);
        field.rewind(sled.s);
      } else {
        for (const n of slope.ensureAhead(ni)) World.dropNode(n);
      }
      for (const n of slope.nodes) if (!n.group) World.buildNode(n);
      field.update(1 / 60, t * 1000, sled);
      World.updateFx(sled, 1 / 60, t * 1000);      // c'est lui qui grave le sillon
      cam.update(1 / 60, sled, t * 1000);
    }
    /* On compte les segments de sillon RÉELLEMENT écrits. C'est le seul moyen
       de distinguer « la trace ne se voit pas sur l'image » de « la trace n'a
       jamais été gravée » — deux pannes très différentes qui produisent
       exactement la même planche. */
    let segs = 0;
    const tc = World.trailColors && World.trailColors();
    if (tc) for (let i = 0; i < tc.length; i += 3) if (tc[i] + tc[i + 1] + tc[i + 2] > 0.02) segs++;
    console.log(`      simulé : v=${sled.v.toFixed(1)} u/s, carre=${sled.edge.toFixed(2)},`
      + ` dérapage=${sled.skid.toFixed(2)}, charge=${sled.load.toFixed(2)}, profond=${sled.deep.toFixed(2)},`
      + ` chutes=${sled.wipes}, sillon=${segs} sommets`);
  } else {
    sled.s = sAt; sled.u = uAt; sled.v = 34;
    sled.heading = steer * 0.5;
    sled.drift = driftFake;
    sled.roll = -sled.heading * 0.55;
    sled.pitchVis = -Slope.pitchAt(sAt) * 0.5;
    const ni = Math.floor(sled.s / CFG.NODE_LEN);
    slope.ensureAhead(ni);
    for (const n of slope.nodes) if (!n.group) World.buildNode(n);
    field.update(0.016, 1000, sled);
  }

  World.updateSled(sled, 1000);
  World.updateCritters(field, 1000, sled);
  // Trois appels : la caméra est amortie, une seule image la laisserait à
  // l'origine et la planche montrerait le fond de la vallée depuis nulle part.
  for (let i = 0; i < 40; i++) cam.update(0.016, sled, 1000 + i * 16);
  World.updateAmbient(1000, sled);

  if (process.env.DBG) {
    let np=0,nv=0,npt=0;
    World.scene.traverse(o=>{ if(o.visible&&o.isMesh&&o.material&&o.material.transparent) nv++; if(o.visible&&o.isPoints) npt++; if(o.isMesh) np++; });
    console.log("      DBG meshes",np,"visibles transparents",nv,"points",npt,"gates",field.gates?field.gates.length:"?","critters",field.list.length);
  }
  const faces = collect(World.scene);
  const sky = World.scene.children.find((o) => o.isMesh && o.material && o.material.side === 1);
  const skyImg = sky.material.map.image;
  const sp = skyImg.ctx.pixels;
  const skyPx = new Uint8Array(skyImg.width * skyImg.height * 4);
  for (let i = 0; i < skyImg.width * skyImg.height; i++) {
    skyPx[i * 4] = sp[i * 4] | 0; skyPx[i * 4 + 1] = sp[i * 4 + 1] | 0;
    skyPx[i * 4 + 2] = sp[i * 4 + 2] | 0; skyPx[i * 4 + 3] = 255;
  }

  const big = render(faces, cam, W * SS, H * SS, skyPx, skyImg.width, skyImg.height, sled.worldPos());
  /* ⚠️⚠️ LA RÉDUCTION SE FAIT EN LINÉAIRE, AVANT LE TONE MAPPING (422), ET
     L'ORDRE N'EST PAS INTERCHANGEABLE. Moyenner après compression donne des
     bords de silhouette trop clairs — c'est l'erreur classique de
     l'anticrénelage « en gamma », et elle se voit précisément sur ce qui compte
     ici : le liseré de contre-jour au bord de la luge et des bonbons.
     Le jeu, lui, résout son MSAA dans une cible linéaire pour exactement la
     même raison. */
  const lin = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) {
      const j = (((y * SS + dy) * W * SS) + (x * SS + dx)) * 3;
      r += big[j]; g += big[j + 1]; b += big[j + 2];
    }
    const i = (y * W + x) * 3, k = SS * SS;
    lin[i] = r / k; lin[i + 1] = g / k; lin[i + 2] = b / k;
  }
  const px = resolve(lin, W, H);
  const file = path.join(outDir, name + ".png");
  writePng(file, W, H, px);
  console.log(`  ${name}.png  — ${label}  (${faces.length} triangles, s=${sAt})`);
}

/* Les manières de conduire qu'on veut REGARDER. Ce sont des fonctions du temps
   qui rendent l'axe de direction, exactement comme le ferait un joueur — et
   elles sont choisies pour montrer chacune un régime différent de la conduite
   du 414, puisque c'est ce régime qu'on juge. */
/* ⚠️ UN PILOTE QUI TIENT UNE LIGNE, ET NON UN BRAQUAGE CONSTANT. Le premier
   jeu de manières de conduire braquait à fond sans jamais corriger : la luge
   partait donc en spirale jusqu'à la barrière, se vautrait, et on mesurait la
   chute d'un pilote absurde au lieu de mesurer la conduite. Aucun joueur ne
   tient une carre pleine pendant huit secondes sans regarder où il va.
   Toutes les manières ci-dessous VISENT une position latérale et la tiennent ;
   ce qui les distingue est l'AGRESSIVITÉ avec laquelle elles la rejoignent,
   c'est-à-dire exactement ce qu'on veut comparer. */
/* ⚠️ MÊME CORRECTIF QUE LE PILOTE DE verify-luge.mjs (voir la longue note sur
   l'oscillation là-bas) : gain modéré et amortissement sur la vitesse de
   travers RÉELLE. Sans ça, ces manières de conduire plaquaient la luge contre
   la barrière — les planches montraient alors un enfoncement de 1,00 et une
   vitesse de 13 u/s, c'est-à-dire une luge à l'agonie au lieu du beau geste
   qu'on voulait précisément photographier. */
function hold(sled, target, gain) {
  const v = Math.max(8, sled.v);
  const wantLat = Math.max(-0.45 * v, Math.min(0.45 * v, (target - sled.u) * (gain || 1.0)));
  const wantHead = Math.asin(Math.max(-0.6, Math.min(0.6, wantLat / v)));
  return Math.max(-1, Math.min(1, (wantHead - sled.heading) * 3.0 - (sled.lat / v) * 0.8));
}
const DRIVE = {
  // Une carre franche tenue : on traverse la piste d'un bord à l'autre, une
  // fois, et on tient. C'est le geste qu'on veut réussir — deux sillons fins.
  /* ⚠️ UN BALAYAGE LENT ET CONTINU, ET NON UNE POSITION À REJOINDRE. Un pilote
     qui ATTEINT sa cible cesse de braquer : la planche montrait alors une luge
     parfaitement droite, carre à 0,02 — c'est-à-dire tout sauf le geste qu'on
     voulait photographier. Pour voir une carre, il faut être EN TRAIN d'en
     tenir une au moment du déclenchement. */
  /* ⚠️ LA CIBLE CHANGE SELON L'ABSCISSE, PAS SELON LE TEMPS. La simulation
     s'arrête à une POSITION donnée, jamais à un instant donné : une consigne
     pilotée par le temps tombe donc à une phase quelconque, et les deux
     premières tentatives ont photographié une luge parfaitement droite (carre
     0,02) sur la planche censée montrer une carre. En changeant de bord tous
     les 120 unités, on est certain qu'un appui a commencé au plus 120 unités
     avant le déclenchement — donc qu'on est EN TRAIN de carver. */
  /* ⚠️ UNE CARRE FRANCHE ET TENUE, ET NON UN ASSERVISSEMENT. `hold` est un
     correcteur : il ANNULE le braquage dès que la trajectoire est bonne, ce qui
     est exactement ce qu'on veut d'un pilote et exactement ce qu'on ne veut pas
     d'une photo. Pour montrer une carre, il faut en TENIR une — donc commander
     l'angle directement, et ne rendre la main que près de la barrière. */
  carve: (t, sled) => (Math.abs(sled.u) > 5
    ? hold(sled, 0, 1.5)
    : (Math.floor(sled.s / 105) % 2 ? 0.95 : -0.95)),
  // Un appui, puis l'autre : montre le coût du changement de carre.
  slalom: (t, sled) => hold(sled, (Math.floor(sled.s / 85) % 2 ? 7 : -7), 1.6),
  /* Le décrochage : on demande beaucoup PLUS que l'adhérence ne peut donner.
     ⚠️ C'est le seul cas où l'on braque volontairement à fond — c'est le
     propos : montrer ce que ça fait quand on en demande trop. */
  // Le frein à main en plein virage : l'adhérence chute, ça part en travers.
  skid: (t, sled) => (sled.s % 160 < 90 ? { steer: hold(sled, -7, 1.5), brake: false }
                                        : { steer: 1, brake: true }),
  straight: (t, sled) => hold(sled, 0, 1.0),
};

console.log("\n=== preview-luge — on regarde la descente ===\n");
shot("luge-depart", 60, 0, 0, 0, "le départ, vue d'ensemble");
shot("luge-carve", 520, 0, 0, 0, "⭐ LA CARRE TENUE — deux sillons fins", DRIVE.carve);
shot("luge-derapage", 760, 0, 0, 0, "⭐ LE DÉCROCHAGE — une bavure large", DRIVE.skid);
shot("luge-slalom", 1180, 0, 0, 0, "⭐ deux appuis enchaînés", DRIVE.slalom);
shot("luge-village", 1000, 2, 0.2, 0.1, "le hameau de pain d'épices", DRIVE.straight);
shot("luge-gourmands", 700, 0, 0, 0, "une vague de gourmands");
/* ⚠️ LA PLANCHE DE L'ÉVITEMENT (416). Elle est cadrée juste AVANT une vague et
   non dessus, et c'est tout son intérêt : ce qu'on juge ici n'est pas à quoi
   ressemble un gourmand, c'est si l'on comprend OÙ PASSER en le voyant de
   loin. Une planche prise au moment du croisement montrerait une image que le
   joueur n'a plus le temps de lire.
   ⚠️ Une nouveauté sans sa planche est une nouveauté qu'on livre sans l'avoir
   regardée — c'est précisément ce qui est arrivé à la gerbe du 414. */
shot("luge-evitement", 575, 0, 0, 0, "⭐ LA PORTE ET LES OMBRES — lit-on où passer ?", DRIVE.straight);
shot("luge-checkpoint", 380, 0, 0, 0, "⭐ une porte de checkpoint", DRIVE.straight);
shot("luge-hauteurs", 3400, 0, 0.4, 0.3, "les hauteurs, palier 4", DRIVE.slalom);
/* ⚠️ UNE PLANCHE EN BAS DE PISTE, AJOUTÉE AU 414. Toutes les précédentes étaient
   prises dans le premier tiers de la descente, où la caméra n'est descendue que
   d'une centaine d'unités. C'est ce trou dans la couverture qui a laissé passer
   la chaîne de montagnes flottant dans le ciel : le défaut ne commençait qu'à
   mi-parcours, et aucune planche ne regardait aussi loin. Un jeu de descente se
   contrôle aussi EN BAS. */
shot("luge-bas", 4700, 0, 0.2, 0.1, "⭐ le bas de la piste, 700 unités plus bas", DRIVE.slalom);
/* ⚠️ LA PLANCHE DE L'ARRIVÉE (416). La zone d'arrivée commence à 4 940 ; on
   cadre à 5 010, soit soixante-dix unités après la ligne — le moment où la
   salve de bonbons est à pleine puissance et où la luge roule encore.
   Sans cette planche, la pluie serait livrée sans avoir été regardée une seule
   fois, ce qui est exactement le sort qu'a connu la gerbe du 414 : elle
   existait, elle était noire, et personne ne pouvait le savoir. */
shot("luge-arrivee", 5040, 0, 0, 0, "⭐ LA PLUIE DE BONBONS À L'ARRIVÉE", DRIVE.straight, 110);
console.log("\nPlanches écrites dans public/candyluge/tools/out/.\n"
  /* ⚠️ CETTE LIGNE EST UN CONTRAT AVEC LE LECTEUR : elle dit ce que la planche
     montre ET ce qu'elle ne montre pas. La laisser périmée est pire que ne rien
     écrire — au 421 elle annonçait encore « le jeu n'a pas d'ombres », ce qui
     est devenu faux au 422 et aurait fait conclure que les ombres du zip ne
     marchaient pas. La mettre à jour fait partie du zip, pas de la finition. */
  + "Rendus : textures, transparence, particules (416), OMBRES PORTÉES, tone mapping ACES,\n"
  + "bloom, étalonnage et modèles glTF (422).\n"
  + "⚠️ NON rendus, et c'est tout ce qui manque : l'anticrénelage matériel, le filtrage\n"
  + "anisotrope, et LE COÛT — un rastériseur logiciel ne dit RIEN d'un GPU. Pour la\n"
  + "performance, il faut `__lugePerf()` dans la console de l'iframe, la ferme derrière.\n");
