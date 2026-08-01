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

     1. « bridge » — le pont arc-en-ciel et guimauve (zip 386), du pied jusqu'à
        la porte. C'est l'endroit où trois habillages se touchent : le sol en
        bonbons, le tablier, et le sirop en dessous. Si quelque chose doit se
        battre, c'est là.
     2. « ground » — le sol en bonbons à l'intérieur des terres, avec les cases
        d'ARBRES marquées. Depuis le 386 il n'y a plus un seul rocher : la
        planche doit le montrer, pas seulement le compter.

   ⚠️ Ce que cette planche ne montre PAS : les arbres de barbe à papa, les
   licornes et le Gourmandin sont des SPRITES construits par buildSprites(),
   qui a besoin de `document`. Ils sont hors de portée d'un rasteriseur sans
   navigateur, et il faut le savoir avant de conclure quoi que ce soit de ces
   images — l'outil juge le SOL et le PONT, pas le peuplement.

   Le voile d'ambiance clair de drawEvilFrame est appliqué à la fin, sinon la
   planche montre des couleurs plus vives que le jeu — un outil qui rassure au
   lieu de montrer, exactement le défaut relevé au zip 379b.
   ========================================================================= */
const T = C.TILE, ZOOM = 3;
const CANDY_IDX = C.PASSAGE_WORLDS.findIndex(w => w.key === "candy");
const CANDY_SPEC = C.PASSAGE_WORLDS[CANDY_IDX];
const DECK_TOP_Y = C.RUN_JETTY_BASE.y - C.RUN_JETTY_HALF_W;

function renderPatch(w, label, cx, cy, tw, th, now, markTrees) {
  const x0 = Math.max(0, cx - (tw >> 1)), y0 = Math.max(0, cy - (th >> 1));
  const TW = tw * T, TH = th * T;
  const ctx = makeCtx(TW, TH, [244, 219, 232]);
  const PX = (x) => (x - x0) * T, PY = (y) => (y - y0) * T;
  const over = [];

  for (let y = y0; y < y0 + th; y++) for (let x = x0; x < x0 + tw; x++) {
    const i = y * w.w + x, g = w.ground[i];
    const isDeck = g === C.G_RUN_JETTY || g === C.G_RUN_GATE;
    const isKerb = g === C.G_RUN_KERB;
    if (isDeck || isKerb) {
      const side = isKerb ? (y < C.RUN_JETTY_BASE.y ? -1 : 1) : 0;
      ART.drawBridgeTile(ctx, PX(x), PY(y), T, x, y, side, CANDY_SPEC.bridge, DECK_TOP_Y);
      if (side !== 0) over.push({ x, y, side });
    } else if (g === C.G_WATER) {
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
      ctx.fillStyle = "#3a2a55";     // passage de retour
      ctx.fillRect(PX(x), PY(y), T, T);
    }
    // Les cases OCCUPÉES : le sol seul ne les montre pas, et depuis le 386 il
    // ne doit plus y avoir QUE des arbres ici.
    if (markTrees && w.objects[i] !== C.O_NONE) {
      ctx.fillStyle = w.objects[i] === C.O_ROCK ? "rgba(255,0,0,0.75)" : "rgba(120,60,110,0.45)";
      ctx.fillRect(PX(x) + 4, PY(y) + 4, T - 8, T - 8);
    }
  }
  // Seconde passe : les coulures de guimauve qui pendent au-dessus du sirop.
  for (const d of over) {
    ART.drawBridgeOverlay(ctx, PX(d.x), PY(d.y), T, d.x, d.y, d.side, now, C.RUN_JETTY_BASE.x, CANDY_SPEC.bridge);
  }
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
  return { file, W, H };
}

fs.mkdirSync(outDir, { recursive: true });
const world = E.generatePassageWorld(CANDY_IDX);

const shots = [
  renderPatch(world, "bridge", C.RUN_GATE.x - 2, C.RUN_JETTY_BASE.y, 26, 18, 2400, false),
  renderPatch(world, "ground", 26, 22, 26, 20, 0, true),
];

/* ================================================== CONTRÔLES CHIFFRÉS ====
   Une planche se regarde ; ces trois-là se COMPTENT, et aucun ne se voit sur
   une image (un rocher peut être hors cadre, une licorne peut ne mettre le
   sabot dans le sirop qu'une fois toutes les vingt secondes). */
const failures = [];

// 1. Plus un seul caillou (zip 386).
let rocks = 0;
for (let i = 0; i < world.objects.length; i++) if (world.objects[i] === C.O_ROCK) rocks++;
console.log(`Rochers au Pays des Bonbons : ${rocks} (attendu 0)`);
if (rocks !== 0) failures.push(`${rocks} rocher(s) subsistent au Pays des Bonbons`);

// 2. Il reste bien des ARBRES : retirer la pierre ne doit pas avoir vidé la
//    carte. Sans ce contre-contrôle, un `put` cassé passerait pour un succès.
let trees = 0;
for (let i = 0; i < world.objects.length; i++) {
  if (world.objects[i] === C.O_TREE || world.objects[i] === C.O_TREE2) trees++;
}
console.log(`Arbres de barbe à papa : ${trees}`);
if (trees < 150) failures.push(`seulement ${trees} arbres — le retrait des rochers a mangé autre chose`);

// 3. LES LICORNES RESTENT-ELLES SUR LA TERRE FERME ? Balayage d'un tour de
//    promenade complet, par pas de 250 ms, pour les sept. C'est exactement le
//    genre de défaut qu'on ne voit jamais en jouant cinq minutes et que tout
//    le monde voit au bout d'une heure.
let wet = 0, onDeck = 0, total = 0;
for (let i = 0; i < C.CANDY_UNICORNS; i++) {
  for (let t = 0; t < C.CANDY_UNICORN_PERIOD_MS; t += 250) {
    const u = E.unicornAt(i, t);
    const gx = Math.floor(u.x), gy = Math.floor(u.y);
    total++;
    if (gx < 1 || gy < 1 || gx >= world.w - 1 || gy >= world.h - 1) { wet++; continue; }
    const g = world.ground[gy * world.w + gx];
    if (g === C.G_WATER) wet++;
    else if (g === C.G_RUN_JETTY || g === C.G_RUN_KERB || g === C.G_RUN_GATE) onDeck++;
  }
}
console.log(`Licornes : ${total} positions balayées, ${wet} dans le sirop ou hors carte, ${onDeck} sur le pont.`);
console.log(`   (le rendu les masque dans ces cas — ce compte dit COMBIEN DE TEMPS elles disparaissent)`);
if (wet / total > 0.25) failures.push(`les licornes passent ${(wet / total * 100).toFixed(0)} % du temps hors de l'herbe : elles clignotent`);

console.log("\nPlanches écrites — À REGARDER, pas seulement à générer :");
for (const s of shots) console.log(`  ${path.relative(here, s.file)} (${s.W}×${s.H})`);
console.log("\nÀ vérifier à l'œil :");
console.log("  - le tablier arc-en-ciel se lit comme un RUBAN CONTINU, pas comme une grille de sept couleurs ;");
console.log("  - la bordure en guimauve se lit comme un COUSSIN, pas comme une quatrième voie praticable ;");
console.log("  - les coulures pendent bien au-dessus du sirop, du bon côté du pont ;");
console.log("  - aucune case de sucre d'orge collée à une autre (les rayures ne tiennent que par leur rareté).");

if (failures.length) {
  console.log("\nÉCHECS :");
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
