/* =============================================================================
   tools/render-jetty.mjs — RENDRE LA CHAUSSÉE 2D ET LA REGARDER.
   -----------------------------------------------------------------------------
       node public/templerun/tools/render-jetty.mjs   (depuis la racine du repo)

   Zip 378. Guillaume a jugé la jetée sur une capture d'écran, et il avait
   raison sur les trois points. On ne peut pas corriger un décor qu'on ne
   regarde pas — et jusqu'ici RIEN dans le projet ne permettait de voir la rive
   est du monde sombre sans lancer le jeu, ouvrir la ferme, traverser le
   passage sombre et marcher jusque là-bas.

   Ce script rejoue la VRAIE génération (E.generatePassageWorld) et le VRAI
   dessin (drawRunDeckTile / drawRunDeckOverlay, fermeArt.js) contre un
   contexte 2D maison, puis écrit un PNG à la même échelle que le jeu. Il ne
   prouve rien : il donne à regarder, exactement comme render-runner.js pour
   le fermier 3D.

   POURQUOI UN CONTEXTE 2D MAISON. Le registre npm est bloqué (§3 du
   contexte), donc pas de paquet `canvas`. Mais le rendu de la chaussée
   n'emploie que `fillStyle` et `fillRect` — c'est une contrainte qu'on s'est
   donnée pour cette raison précise. Une centaine de lignes suffisent, alpha
   compris, et si quelqu'un y glisse un jour un dégradé ou un arc, le contexte
   le signale au lieu de dessiner faux en silence.
   ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fermeDir = path.resolve(here, "../../../components/ferme");
const outDir = path.join(here, "out");

/* Même contournement que verify-gate.mjs : les modules du jeu importent
   "./fermeConstants" sans extension, ce que Next résout et Node non. On en
   fait une copie temporaire plutôt que de toucher au code du jeu pour faire
   plaisir à un script. fermeArt.js ne touche à `document` que DANS
   buildSprites, jamais à l'import — on peut donc le charger tel quel. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-jetty-"));
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
    beginPath() { throw new Error("le rendu de la chaussée doit se limiter à fillRect"); },
    arc() { throw new Error("le rendu de la chaussée doit se limiter à fillRect"); },
    drawImage() { throw new Error("le rendu de la chaussée doit se limiter à fillRect"); },
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
   On cadre la rive est autour de la chaussée, à l'échelle du jeu (T = 16 px,
   ZOOM ×3) — pas un gros plan flatteur : ce qu'on juge, c'est ce que le
   joueur voit. */
const T = 16, ZOOM = 3, BG = [11, 18, 12];

function renderWorld(w, label, now) {
  const base = C.RUN_JETTY_BASE;
  const x0 = base.x - 6, x1 = C.RUN_DECK_END_X;
  const y0 = base.y - 7, y1 = base.y + 7;
  const TW = (x1 - x0 + 1) * T, TH = (y1 - y0 + 1) * T;
  const ctx = makeCtx(TW, TH, BG);
  const PX = (x) => (x - x0) * T, PY = (y) => (y - y0) * T;

  const deckOver = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x < 0 || y < 0 || x >= w.w || y >= w.h) continue;
    const i = y * w.w + x, g = w.ground[i];
    const isDeck = g === C.G_RUN_JETTY || g === C.G_RUN_GATE;
    const isKerb = g === C.G_RUN_KERB;
    ctx.fillStyle = g === C.G_DARK_PASSAGE ? "#3a2a55"
      : (isDeck || isKerb) ? "#3c372f"
      : g === C.G_LAKE_SHORE ? "#1d2119"
      : g === C.G_WATER ? "#241246" : "#182417";
    ctx.fillRect(PX(x), PY(y), T, T);

    if (isDeck || isKerb) {
      const side = isKerb ? Math.sign(y - base.y) : 0;
      ART.drawRunDeckTile(ctx, PX(x), PY(y), T, x, y, side);
      if (side !== 0) deckOver.push({ x, y, side });
      continue;
    }
    /* Lac et berge : transcription de drawEvilFrame réduite à ce qui compte
       pour juger le RACCORD chaussée/eau. Recopier ces quelques lignes est
       assumé — ce script ne prétend pas rendre la carte, seulement son bord. */
    if (g === C.G_WATER) {
      const dp = (w.depth ? w.depth[i] : 255) / 255, shallow = 1 - dp;
      ctx.fillStyle = `rgb(${Math.round(36 + shallow * 34)}, ${Math.round(18 + shallow * 26)}, ${Math.round(70 + shallow * 30)})`;
      ctx.fillRect(PX(x), PY(y), T, T);
      const glow = (0.5 + Math.sin(now / 1100 + (x + y) * 0.35) * 0.22) * (0.3 + dp * 0.7);
      ctx.fillStyle = `rgba(160, 70, 220, ${glow})`;
      ctx.fillRect(PX(x), PY(y), T, T);
    } else if (g === C.G_LAKE_SHORE) {
      const h = (i * 40503 * 2654435761) >>> 0;
      ctx.fillStyle = "rgba(39,53,26,0.55)";
      ctx.fillRect(PX(x) + (h & 7), PY(y) + (h >> 3 & 7), 6, 4);
      for (let p = 0; p < 3 + (h >> 6 & 3); p++) {
        const hh = (h >> (p * 3)) ^ (h << p);
        ctx.fillStyle = (hh & 1) ? "#3c372f" : "#565046";
        ctx.fillRect(PX(x) + ((hh >>> 0) % (T - 3)), PY(y) + ((hh >>> 4) % (T - 3)), 2, 2);
      }
    }
  }
  for (const d of deckOver) {
    ART.drawRunDeckOverlay(ctx, PX(d.x), PY(d.y), T, d.x, d.y, d.side, now, base.x);
  }

  const W = TW * ZOOM, H = TH * ZOOM;
  const out = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = (Math.floor(y / ZOOM) * TW + Math.floor(x / ZOOM)) * 3;
    const d = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) out[d + k] = Math.max(0, Math.min(255, Math.round(ctx.pixels[s + k])));
  }
  const file = path.join(outDir, `jetty-${label}.png`);
  writePng(file, W, H, out);
  return { file, W, H, x0, x1 };
}

fs.mkdirSync(outDir, { recursive: true });
const shots = [
  renderWorld(E.generatePassageWorld(0), C.PASSAGE_WORLDS[0].key, 0),
  renderWorld(E.generatePassageWorld(2), C.PASSAGE_WORLDS[2].key, 2400),
];

console.log("Planches écrites — À REGARDER, pas seulement à générer :");
for (const s of shots) console.log(`  ${path.relative(here, s.file)} (${s.W}×${s.H}) — colonnes ${s.x0} à ${s.x1}`);
console.log(`\nÀ vérifier à l'œil : la chaussée court jusqu'au BORD DROIT de l'image`);
console.log(`(colonne ${C.RUN_DECK_END_X} = bord de carte), elle porte une ombre sur l'eau au sud`);
console.log(`et un liseré violet au nord, et la case de déclenchement (${C.RUN_GATE.x}, ${C.RUN_GATE.y})`);
console.log(`ne se distingue en RIEN des autres dalles.`);
