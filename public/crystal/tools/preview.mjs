/* =============================================================================
   preview.mjs — REND UNE SCÈNE ET ÉCRIT UN PNG.
   -----------------------------------------------------------------------------
   ⚠️ C'EST L'OUTIL LE PLUS IMPORTANT DU JEU, ET IL EXISTE À CAUSE D'UNE DETTE
   NOMMÉE TROIS FOIS DANS LE CONTEXTE DU 417 :

     - « le sillage de sortie du labyrinthe n'a été vu sur aucune image »
     - « la gerbe du 414 : un effet correct sur le papier, jamais regardé »
     - « le mur du 417 n'a été vu sur aucune image non plus »

   Un décor qui n'a jamais été REGARDÉ n'est pas un décor vérifié, quel que
   soit le nombre de contrôles qui passent. Ici, `pix.js` n'ayant aucune
   dépendance au DOM, le jeu se rend à l'identique dans node — et on peut
   ouvrir le PNG.

   USAGE
     node tools/preview.mjs                       toutes les scènes
     node tools/preview.mjs corniche 3.2 40       scène, temps, caméra
     node tools/preview.mjs walk 12               le segment jouable à 12 s

   ⚠️ AUCUNE DÉPENDANCE. L'encodeur PNG est écrit ici (zlib est dans node) :
   installer `canvas` ou `pngjs` ferait dépendre la seule preuve visuelle du
   projet d'un paquet natif qui casse à chaque version de node.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(HERE, "..", "js");
const OUT = path.join(HERE, "out");

/* ── LE CONTEXTE PARTAGÉ ────────────────────────────────────────────────────
   Les fichiers du jeu sont des scripts classiques qui déposent des `const` au
   niveau global — exactement comme dans le navigateur, où index.html les
   charge par <script src>. `vm.createContext` reproduit ce partage : un
   `const` de premier niveau va dans l'environnement lexical global du realm,
   visible par les scripts suivants. C'est pour ça qu'on ne transforme rien.  */
export function loadGame(extra = []) {
  const ctx = vm.createContext({ console, Math, Date, JSON, module: undefined });
  const files = ["pix.js", "config.js", "sky.js", "land.js", "flora.js",
                 "props.js", "scenes.js", "shots.js", ...extra];
  for (const f of files) {
    const src = fs.readFileSync(path.join(JS, f), "utf8")
      // la ligne d'export CommonJS de fin de fichier n'a pas de sens ici
      .replace(/if \(typeof module[\s\S]*$/m, "");
    new vm.Script(src, { filename: f }).runInContext(ctx);
  }
  /* ⚠️ UN `const` DE PREMIER NIVEAU N'EST PAS UNE PROPRIÉTÉ DU GLOBAL. Il vit
     dans l'environnement lexical du realm : les scripts suivants le voient
     (c'est ce qui fait marcher le chargement par <script> dans le navigateur),
     mais `ctx.Pix` reste indéfini vu de l'extérieur. On récupère donc les
     liaisons en évaluant une expression DANS le contexte. Le détail a coûté
     cinq minutes et mérite d'être écrit : c'est la même surprise qui attend
     quiconque voudra écrire un banc d'essai pour ce jeu. */
  const names = ["Pix", "CFG", "Sky", "Land", "Flora", "Props", "Scenes", "Shots", "Walk", "Story"];
  const expr = "({" + names.map(n => `${n}: typeof ${n} !== "undefined" ? ${n} : null`).join(",") + "})";
  return vm.runInContext(expr, ctx);
}

/* ── ENCODEUR PNG (couleur vraie, 8 bits, non entrelacé) ──────────────────── */
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
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function writePNG(file, w, h, rgba, scale = 1) {
  const W = w * scale, H = h * scale;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  let p = 0;
  for (let y = 0; y < H; y++) {
    raw[p++] = 0;                                   // filtre : aucun
    const sy = (y / scale) | 0;
    for (let x = 0; x < W; x++) {
      const i = (sy * w + ((x / scale) | 0)) * 4;
      raw[p++] = rgba[i]; raw[p++] = rgba[i + 1]; raw[p++] = rgba[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

/* ── RENDU ─────────────────────────────────────────────────────────────────── */
export function renderScene(ctx, id, t = 0, camX = 0, st = {}) {
  const { Pix, CFG, Scenes } = ctx;
  const fb = new Pix.Buffer(CFG.W, CFG.H);
  Scenes.get(id).render(fb, { x: camX }, t, st);
  return fb;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.mkdirSync(OUT, { recursive: true });
  const wantWalk = process.argv[2] === "walk";
  const ctx = loadGame(wantWalk ? ["walk.js"] : []);
  const scale = 2;

  if (wantWalk) {
    /* ⚠️ SANS ARGUMENT DE TEMPS, ON REND LA COURSE D'OUVERTURE EN ENTIER
       (421) — départ, milieu, entrée du freinage, arrivée au bord. La falaise
       n'apparaît qu'aux deux dernières ; une planche unique prise « au milieu »
       ne l'aurait jamais montrée, et c'est exactement le genre d'oubli qui a
       fait exister cet outil. Les instants sont déduits de `CFG.WALK` pour
       qu'ils suivent le réglage au lieu de le doubler. */
    const mode = process.argv[4] === "walk" ? "walk" : "run";
    const K = ctx.CFG.WALK;
    let times;
    if (process.argv[3]) times = [parseFloat(process.argv[3])];
    else if (mode === "run") {
      const tCruise = (K.MODES.run.endM / 3.1 - K.EDGE_GAP - K.BRAKE_M / 3.1) / K.SPEED;
      times = [1.5, tCruise * 0.5, tCruise - 0.3, tCruise + 2.4, tCruise + 9];
    } else times = [6, 14, 26];
    for (const t of times) {
      const tt = Math.round(t * 10) / 10;
      const fb = new ctx.Pix.Buffer(ctx.CFG.W, ctx.CFG.H);
      ctx.Walk.debugRender(fb, tt, mode);
      const name = `${mode}-t${tt}.png`;
      writePNG(path.join(OUT, name), ctx.CFG.W, ctx.CFG.H, fb.d, scale);
      console.log(`${name}   z=${ctx.Walk.S.z.toFixed(1)}  ${ctx.Walk.metres()} m`);
    }
  } else if (process.argv[2]) {
    const id = process.argv[2];
    const t = parseFloat(process.argv[3] || "0");
    const cam = parseFloat(process.argv[4] || "0");
    const fb = renderScene(ctx, id, t, cam);
    writePNG(path.join(OUT, `${id}-t${t}-c${cam}.png`), ctx.CFG.W, ctx.CFG.H, fb.d, scale);
    console.log(`${id}-t${t}-c${cam}.png`);
  } else {
    for (const id of Object.keys(ctx.Scenes.all)) {
      for (const [t, cam] of [[0, 0], [4.5, 60], [9, 130]]) {
        const fb = renderScene(ctx, id, t, cam);
        writePNG(path.join(OUT, `${id}-t${t}-c${cam}.png`), ctx.CFG.W, ctx.CFG.H, fb.d, scale);
        console.log(`${id}-t${t}-c${cam}.png`);
      }
    }
  }
}
