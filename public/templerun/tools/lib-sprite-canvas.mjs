/* =============================================================================
   tools/lib-sprite-canvas.mjs — un faux `document.createElement("canvas")`,
   juste assez complet pour les sprites de fermeArt.js (zip 388).
   -----------------------------------------------------------------------------
   Cinquième outil de la famille render-*. Il existe parce que le zip 388 ajoute
   seize fleurs et 540 frames de familiers, et que la seule chose qui ait jamais
   trouvé un défaut graphique dans ce projet, c'est de REGARDER (§4 du contexte :
   douze défauts trouvés en regardant, zéro en relisant).

   CE QU'IL SAIT FAIRE, ET RIEN DE PLUS :
       fillStyle, fillRect, globalCompositeOperation ("source-over" /
       "source-atop"), getImageData, putImageData, imageSmoothingEnabled.

   CE QU'IL REFUSE, EXPRÈS :
       beginPath, arc, moveTo, lineTo, stroke, drawImage, les dégradés, les
       transformations.

   Ce refus est le contrôle, pas une limitation subie — c'est le même principe
   que le contexte fillRect-seul de render-jetty/render-candy. `petSprite` et
   `flowerPotSprite` sont écrits en fillRect pur ; si quelqu'un y glisse un arc
   un jour, l'outil CASSE au lieu de dessiner autre chose que le jeu. Un outil
   qui montre autre chose que le jeu est pire qu'un outil absent : il rassure.

   ⚠️ CE QU'IL NE PROUVE PAS (corollaire n°4 du zip 385, un contrôle doit dire
   ce qu'il ne prouve pas) :
     - il ne dit rien de `decorSprite` pour le gnome, la fontaine et la roue
       solaire, qui emploient arc/stroke : ces trois-là sont SAUTÉS, et les
       outils le disent dans leur sortie ;
     - il ne dit rien de la façon dont le jeu POSE le sprite (échelle
       PET_DRAW_SCALE, ancrage par le bas, ombre, voile d'ambiance du monde
       sombre). Il juge le dessin, pas la mise en scène.

   ⚠️ ALPHA NON PRÉMULTIPLIÉ en interne, converti à la demande dans
   getImageData. C'est important : `outlineSprite` teste `data[i+3] > 0` pour
   savoir ce qui est plein. Une prémultiplication perdrait la couleur des
   pixels semi-transparents (le contour aminci du zip 251 est à 0,45) et le
   contour du contour serait faux — un défaut qui ne se voit qu'à la loupe et
   qui ferait exactement ce que ces outils sont censés empêcher.
   ========================================================================== */

const REFUSE = (name) => () => {
  throw new Error(`lib-sprite-canvas : ${name}() n'est pas disponible. ` +
    `Les sprites de familiers et de fleurs doivent se limiter à fillRect ` +
    `(voir l'en-tête de fermeArt.js).`);
};

function parseColor(s) {
  if (typeof s !== "string") throw new Error("fillStyle non textuel : " + s);
  if (s[0] === "#") {
    if (s.length === 7) {
      const v = parseInt(s.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1];
    }
    if (s.length === 4) {
      const r = parseInt(s[1], 16), g = parseInt(s[2], 16), b = parseInt(s[3], 16);
      return [r * 17, g * 17, b * 17, 1];
    }
    throw new Error("couleur hexadécimale non reconnue : " + s);
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (!m) throw new Error("fillStyle non reconnu : " + s);
  return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
}

class Ctx {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = "#000000";
    this.strokeStyle = "#000000";
    this.lineWidth = 1;
    this.globalCompositeOperation = "source-over";
    this.imageSmoothingEnabled = false;
    // r, g, b, a en 0..255 / 0..1, NON prémultipliés.
    this._px = new Float64Array(canvas.width * canvas.height * 4);
    this.beginPath = REFUSE("beginPath"); this.arc = REFUSE("arc");
    this.moveTo = REFUSE("moveTo"); this.lineTo = REFUSE("lineTo");
    this.closePath = REFUSE("closePath"); this.fill = REFUSE("fill");
    this.stroke = REFUSE("stroke"); this.drawImage = REFUSE("drawImage");
    this.save = REFUSE("save"); this.restore = REFUSE("restore");
    this.translate = REFUSE("translate"); this.scale = REFUSE("scale");
    this.rotate = REFUSE("rotate"); this.createLinearGradient = REFUSE("createLinearGradient");
    this.createRadialGradient = REFUSE("createRadialGradient");
    this.fillText = REFUSE("fillText"); this.clearRect = REFUSE("clearRect");
  }
  fillRect(x, y, w, h) {
    const W = this.canvas.width, H = this.canvas.height, px = this._px;
    const [r, g, b, a] = parseColor(this.fillStyle);
    if (!(a > 0)) return;
    const atop = this.globalCompositeOperation === "source-atop";
    if (!atop && this.globalCompositeOperation !== "source-over")
      throw new Error("globalCompositeOperation non gérée : " + this.globalCompositeOperation);
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const k = (yy * W + xx) * 4;
      const da = px[k + 3];
      if (atop && !(da > 0)) continue;               // source-atop : rien hors de la silhouette
      const ea = atop ? a : a;                        // fraction de recouvrement
      const na = atop ? da : ea + da * (1 - ea);      // alpha résultant
      if (!(na > 0)) continue;
      // Mélange en couleur droite, pondéré par les alphas (équivalent au
      // mélange prémultiplié une fois redivisé par na).
      const wS = atop ? ea : ea / na, wD = 1 - wS;
      px[k]     = r * wS + px[k]     * wD;
      px[k + 1] = g * wS + px[k + 1] * wD;
      px[k + 2] = b * wS + px[k + 2] * wD;
      px[k + 3] = na;
    }
  }
  getImageData(x, y, w, h) {
    const W = this.canvas.width, px = this._px;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const k = ((y + yy) * W + (x + xx)) * 4, o = (yy * w + xx) * 4;
      data[o] = Math.round(px[k]); data[o + 1] = Math.round(px[k + 1]);
      data[o + 2] = Math.round(px[k + 2]); data[o + 3] = Math.round(px[k + 3] * 255);
    }
    return { data, width: w, height: h };
  }
  putImageData(im, x, y) {
    const W = this.canvas.width, px = this._px, d = im.data;
    for (let yy = 0; yy < im.height; yy++) for (let xx = 0; xx < im.width; xx++) {
      const k = ((y + yy) * W + (x + xx)) * 4, o = (yy * im.width + xx) * 4;
      px[k] = d[o]; px[k + 1] = d[o + 1]; px[k + 2] = d[o + 2]; px[k + 3] = d[o + 3] / 255;
    }
  }
}

class Canvas {
  constructor() { this.width = 0; this.height = 0; this._ctx = null; }
  getContext(kind) {
    if (kind !== "2d") throw new Error("seul le contexte 2d existe ici : " + kind);
    if (!this._ctx) this._ctx = new Ctx(this);
    return this._ctx;
  }
}

/* Installe le faux document AVANT d'importer fermeArt.js : `sprCv` appelle
   document.createElement au premier sprite construit, jamais à l'import. */
export function installFakeDocument() {
  if (globalThis.document) return;
  globalThis.document = {
    createElement(tag) {
      if (tag !== "canvas") throw new Error("createElement inattendu : " + tag);
      return new Canvas();
    },
  };
}

/* Lit un canevas produit par fermeArt et le recopie, à l'échelle entière `sc`,
   dans un tampon RGB de planche, sur un fond damier qui rend l'alpha visible.
   Le damier n'est pas décoratif : sans lui, un pixel manquant au milieu d'une
   fleur blanche est invisible sur fond blanc. */
export function blitTo(rgb, PW, PH, canvas, dx, dy, sc, checker) {
  const g = canvas.getContext("2d");
  const im = g.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height * sc; y++) for (let x = 0; x < canvas.width * sc; x++) {
    const px = dx + x, py = dy + y;
    if (px < 0 || py < 0 || px >= PW || py >= PH) continue;
    const o = ((y / sc | 0) * canvas.width + (x / sc | 0)) * 4;
    const a = im.data[o + 3] / 255;
    const k = (py * PW + px) * 3;
    const bg = checker
      ? (((x / sc | 0) + (y / sc | 0)) % 2 ? [206, 206, 214] : [232, 232, 238])
      : [rgb[k], rgb[k + 1], rgb[k + 2]];
    rgb[k]     = Math.round(im.data[o]     * a + bg[0] * (1 - a));
    rgb[k + 1] = Math.round(im.data[o + 1] * a + bg[1] * (1 - a));
    rgb[k + 2] = Math.round(im.data[o + 2] * a + bg[2] * (1 - a));
  }
}

/* Nombre de pixels réellement peints (alpha > 0) — sert aux contrôles chiffrés
   quand l'affichage d'images est indisponible (corollaire n°3 du zip 386). */
export function coverage(canvas) {
  const g = canvas.getContext("2d");
  const im = g.getImageData(0, 0, canvas.width, canvas.height);
  let n = 0; for (let i = 3; i < im.data.length; i += 4) if (im.data[i] > 0) n++;
  return n;
}

/* Signature d'un canevas : somme pondérée des pixels. Deux sprites qui se
   ressemblent à l'œil peuvent différer ; deux sprites IDENTIQUES ont la même
   signature. C'est ce qui permet d'affirmer « les seize fleurs sont
   distinctes » sans se contenter de compter les entrées du catalogue. */
export function signature(canvas) {
  const g = canvas.getContext("2d");
  const im = g.getImageData(0, 0, canvas.width, canvas.height);
  let h = 2166136261;
  for (let i = 0; i < im.data.length; i++) { h ^= im.data[i]; h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, "0");
}
