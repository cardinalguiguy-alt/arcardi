/* =============================================================================
   tools/render-candy.mjs — Le sol du Pays des Bonbons, en PNG (zip 385).
   -----------------------------------------------------------------------------
       node tools/render-candy.mjs

   Rejoue la VRAIE génération du monde (E.generatePassageWorld) et le VRAI
   dessin du sol (ART.drawCandyGroundTile), et écrit deux planches à l'échelle
   du jeu. Quatrième membre de la famille render-* du monde sombre, et il
   existe pour la raison donnée au §4 du contexte : huit défauts graphiques ont
   été trouvés avec ces outils, aucun n'était détectable autrement.

   Il a servi tout de suite. La première version du sol tirait un parfum par
   case avec des probabilités égales : à l'écran, une case sur quatre en sucre
   d'orge donnait une carte en damier rouge et blanc, sur laquelle on ne
   distinguait plus ni le joueur ni les breloques. La répartition actuelle
   (50 % guimauve, 28 % sprinkles, 16 % barbe à papa, 6 % rayures) vient de
   cette planche, pas d'une intuition.

   Le contexte 2D est le même que celui de render-jetty.mjs : fillRect SEUL,
   et il JETTE sur tout le reste. Ce n'est pas une limitation subie, c'est le
   contrôle — si quelqu'un glisse un arc dans drawCandyGroundTile, l'outil
   casse au lieu de dessiner autre chose que le jeu.
   ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fermeDir = path.resolve(here, "../../../components/ferme");
const outDir = path.join(here, "out");

/* Même contournement que render-jetty.mjs : les modules du jeu importent
   "./fermeConstants" sans extension, ce que Next résout et Node non. Copie
   temporaire plutôt que de tordre le code du jeu pour faire plaisir à un
   script. fermeArt.js ne touche à `document` que DANS buildSprites, jamais à
   l'import : on peut donc le charger tel quel. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-candy-"));
for (const f of ["fermeConstants.js", "fermeEngine.js", "fermeArt.js"]) {
  fs.writeFileSync(path.join(tmp, f), fs.readFileSync(path.join(fermeDir, f), "utf8")
    .replace(/from\s+"\.\/(ferme[A-Za-z]+)"/g, 'from "./$1.js"'));
}
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);
const ART = await import(pathToFileURL(path.join(tmp, "fermeArt.js")).href);

/* ===================================================== CONTEXTE 2D MAISON == */
function makeCtx(W, H, bg) {
  const px = new Float64Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { px[i * 3] = bg[0]; px[i * 3 + 1] = bg[1]; px[i * 3 + 2] = bg[2]; }
  const parse = (s) => {
    if (typeof s !== "string") throw new Error("fillStyle non textuel : " + s);
    if (s[0] === "#") {
      const v = parseInt(s.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1];
    }
    const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.-]+)\s*)?\)$/);
    if (!m) throw new Error("fillStyle non reconnu : " + s);
    return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  };
  const ctx = {
    fillStyle: "#000000",
    fillRect(x, y, w, h) {
      const c = parse(this.fillStyle);
      const a = Math.max(0, Math.min(1, c[3]));
      if (!(a > 0)) return;
      const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const k = (yy * W + xx) * 3;
        px[k] += (c[0] - px[k]) * a;
        px[k + 1] += (c[1] - px[k + 1]) * a;
        px[k + 2] += (c[2] - px[k + 2]) * a;
      }
    },
    beginPath() { throw new Error("le sol du Pays des Bonbons doit se limiter à fillRect"); },
    arc() { throw new Error("le sol du Pays des Bonbons doit se limiter à fillRect"); },
    drawImage() { throw new Error("le sol du Pays des Bonbons doit se limiter à fillRect"); },
  };
  ctx.pixels = px;
  return ctx;
}

/* ================================================================== PNG === */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function writePng(file, W, H, rgb) {
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = rgb[y * W * 3 + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

/* ============================================================== SCÉNARIO ===
   Deux cadrages, choisis pour ce qu'ils permettent de JUGER :

     1. « lair » — autour du Gourmandin. On y vérifie que ses cases sont bien
        dégagées (generatePassageWorld) et qu'il reste de la place pour
        l'approcher : c'est le seul endroit de la carte où une case bloquée
        casserait tout le chantier.
     2. « shore » — la berge du lac de sirop. On y juge le raccord entre le sol
        rose et l'eau, c'est-à-dire l'endroit où deux teintes voisines peuvent
        se battre.

   Le voile d'ambiance clair de drawEvilFrame est appliqué à la fin, sinon la
   planche montre des couleurs plus vives que le jeu — un outil qui rassure au
   lieu de montrer, exactement le défaut relevé au zip 379b. */
const T = C.TILE, ZOOM = 3;
const CANDY_IDX = C.PASSAGE_WORLDS.findIndex(w => w.key === "candy");

function renderPatch(w, label, cx, cy, tw, th, now) {
  const x0 = Math.max(0, cx - (tw >> 1)), y0 = Math.max(0, cy - (th >> 1));
  const TW = tw * T, TH = th * T;
  const ctx = makeCtx(TW, TH, [244, 219, 232]);
  const PX = (x) => (x - x0) * T, PY = (y) => (y - y0) * T;

  for (let y = y0; y < y0 + th; y++) for (let x = x0; x < x0 + tw; x++) {
    const i = y * w.w + x, g = w.ground[i];
    if (g === C.G_WATER) {
      const dp = (w.depth ? w.depth[i] : 255) / 255;
      ctx.fillStyle = ART.candySyrupColor(dp);
      ctx.fillRect(PX(x), PY(y), T, T);
      const glow = (0.5 + Math.sin(now / 1100 + (x + y) * 0.35) * 0.22) * (0.3 + dp * 0.7);
      ctx.fillStyle = `rgba(255, 190, 230, ${glow * 0.55})`;
      ctx.fillRect(PX(x), PY(y), T, T);
    } else if (g === C.G_LAKE_SHORE) {
      ctx.fillStyle = "#f0cfe0";
      ctx.fillRect(PX(x), PY(y), T, T);
    } else if (g === C.G_GRASS) {
      ctx.fillStyle = "#f4dbe8";
      ctx.fillRect(PX(x), PY(y), T, T);
      ART.drawCandyGroundTile(ctx, PX(x), PY(y), T, x, y);
    } else {
      // Chaussée du défi, passage de retour : ils gardent leur teinte propre,
      // et c'est voulu (la porte se présente pareil sur les six cartes).
      ctx.fillStyle = g === C.G_DARK_PASSAGE ? "#3a2a55" : "#3c372f";
      ctx.fillRect(PX(x), PY(y), T, T);
    }
    // Marque des cases OCCUPÉES par un arbre/rocher : le sol seul ne les
    // montre pas, et c'est précisément ce qu'on vient vérifier au repaire.
    if (w.objects[i] !== C.O_NONE) {
      ctx.fillStyle = "rgba(60,30,50,0.55)";
      ctx.fillRect(PX(x) + 4, PY(y) + 4, T - 8, T - 8);
    }
  }
  // Voile d'ambiance clair, comme drawEvilFrame au Pays des Bonbons.
  ctx.fillStyle = "rgba(255,215,235,0.16)";
  ctx.fillRect(0, 0, TW, TH);

  const W = TW * ZOOM, H = TH * ZOOM;
  const out = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = (Math.floor(y / ZOOM) * TW + Math.floor(x / ZOOM)) * 3;
    const d = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) out[d + k] = Math.max(0, Math.min(255, Math.round(ctx.pixels[s + k])));
  }
  const file = path.join(outDir, `candy-${label}.png`);
  writePng(file, W, H, out);
  return { file, W, H, x0, y0 };
}

fs.mkdirSync(outDir, { recursive: true });
const world = E.generatePassageWorld(CANDY_IDX);

const lair = C.CANDY_MONSTER_SPAWN;
const shots = [
  renderPatch(world, "lair", lair.x, lair.y, 26, 20, 0),
  renderPatch(world, "shore", C.EAST_LAKE_X, C.RUN_JETTY_BASE.y, 26, 20, 2400),
];

/* Contrôle chiffré, en plus des planches : les cases du repaire DOIVENT être
   libres. Une planche se regarde, mais un rayon de dégagement se compte — et
   c'est le genre de chose qu'on ne voit pas sur une image si l'arbre est
   juste au bord du cadrage. */
let blocked = 0;
for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
  const i = (lair.y + dy) * world.w + (lair.x + dx);
  if (world.objects[i] !== C.O_NONE || world.ground[i] === C.G_WATER) blocked++;
}

console.log("Planches écrites — À REGARDER, pas seulement à générer :");
for (const s of shots) console.log(`  ${path.relative(here, s.file)} (${s.W}×${s.H})`);
console.log(`\nRepaire du Gourmandin (${lair.x}, ${lair.y}) : ${blocked} case(s) bloquée(s) sur 25 dans le rayon dégagé.`);
console.log("À vérifier à l'œil : aucune case de sucre d'orge collée à une autre");
console.log("(les rayures ne tiennent que par leur rareté), et la berge du lac de");
console.log("sirop se lit comme une berge, pas comme une frontière.");
if (blocked > 0) { console.log("\nÉCHEC : le repaire n'est pas dégagé."); process.exit(1); }
