/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-garderobe-hd — LOT B : GARFIELD ET LE SALON EN 32 × 48, À CÔTÉ DE LEUR 16 × 24 (2026-10-23)
   ╚══════════════════════════════════════════════════════════════════════════
   Une ligne par article (coupes, barbes, chapeaux, écharpes, tenues des deux genres, quelques teintes) : à gauche l'ancien agrandi ×2
   (face, dos, profil), à droite le fin (`S.getCharHD`, le chemin du jeu) dans les mêmes vues, puis deux images de marche (face, profil).
   Sorties : tools/out/garderobe-hd-coupes.png, garderobe-hd-vetements.png (×3). Usage : node tools/render-garderobe-hd.mjs [filtre] */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const { fermeArt: A, fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const S = A.buildSprites();
const idx = (tab, id) => tab.findIndex((t) => t && t.id === id);
const hl = (c, d, b) => C.hairLook({ c: c ? idx(C.HAIR_CUTS, c) : 0, d: d ? idx(C.HAIR_DYES, d) : 0, b: b ? idx(C.BEARDS, b) : 0 });
const wl = (hat, scarf, outfit, tint) => C.wardrobeLook({ hat: hat ? idx(C.WARDROBE_HATS, hat) + 1 : 0, scarf: scarf ? idx(C.WARDROBE_SCARVES, scarf) + 1 : 0,
  outfit: outfit ? idx(C.WARDROBE_OUTFITS, outfit) + 1 : 0, tint: tint ? idx(C.WARDROBE_TINTS, tint) + 1 : 0 }) || "";
// [nom, genre, tenue, look]
const COUPES = [];
for (const c of C.HAIR_CUTS) if (c) COUPES.push([c.id, c.cat === "m" ? "m" : "f", c.cat === "m" ? 0 : 1, hl(c.id, null, null)]);
COUPES.push(["long (lui)", "m", 0, hl("long")], ["court (elle)", "f", 1, hl("short")], ["teinture menthe", "f", 1, hl("bob", "mint")], ["platine boucles", "m", 0, hl("curly", "platinum")]);
for (const b of C.BEARDS) if (b) COUPES.push([b.id, "m", 0, hl(null, null, b.id)]);
COUPES.push(["fournie + mulet", "m", 2, hl("mullet", "ginger", "full")]);
const VETEMENTS = [];
for (const h of C.WARDROBE_HATS) VETEMENTS.push([h.id, h.id === "capeline" ? "m" : "f", h.id === "capeline" ? 0 : 1, wl(h.id)]);
for (const s of C.WARDROBE_SCARVES) VETEMENTS.push([s.id, s.id === "silk" || s.id === "fur" ? "f" : "m", s.id === "silk" || s.id === "fur" ? 1 : 0, wl(null, s.id)]);
for (const o of C.WARDROBE_OUTFITS) for (const g of ["f", "m"]) VETEMENTS.push([o.id + " " + g, g, g === "f" ? 1 : 0, wl(null, null, o.id)]);
VETEMENTS.push(["teinte encre", "f", 1, wl(null, null, null, "ink")], ["or : tout", "f", 1, wl("tophat", "silk", "gown", "gold") + hl("bun")],
  ["prune : tout", "m", 0, wl("beret", "knit", "suit", "plum") + hl("side", null, "moustache")]);

function board(file, rows) {
  const filt = process.argv[2];
  if (filt) rows = rows.filter((r) => r[0].includes(filt));
  const CW = 34, CH = 50, P = 3, NC = 8, GAP = 6;
  const W = NC * (CW + P) + P + GAP, H = rows.length * (CH + P) + P;
  const sh = makeCanvas(W, H), g = sh.ctx;
  g.fillStyle = "#d9d2c3"; g.fillRect(0, 0, W, H);
  rows.forEach(([, gender, outfit, look], ri) => {
    const hd = S.getCharHD(gender, outfit, look || null, false, "neutre", null);
    const y0 = P + ri * (CH + P);
    for (let ci = 0; ci < NC; ci++) {
      const x0 = P + ci * (CW + P) + (ci >= 3 ? GAP : 0);
      const dir = ci < 6 ? ci % 3 : ci === 6 ? 0 : 2, fr = ci < 6 ? 0 : 1;
      g.fillStyle = ci < 3 ? "#cbc3b2" : (ri + ci) % 2 ? "#ece6d8" : "#e4ddcd"; g.fillRect(x0, y0, CW, CH);
      if (ci < 3) g.drawImage(S.charFrame(gender, outfit, dir, 0, look || null), 0, 0, 16, 24, x0 + 1, y0 + 1, 32, 48);
      else if (hd) g.drawImage(hd, fr * 32, dir * 48, 32, 48, x0 + 1, y0 + 1, 32, 48);
      else { g.fillStyle = "#c03030"; g.fillRect(x0 + 10, y0 + 20, 14, 10); }
    }
  });
  const up = scale(sh.px, W, H, 3);
  writePNG(path.join(ROOT, "tools", "out", file), up.px, up.W, up.H);
  console.log("planche : tools/out/" + file + " —", rows.map((r) => r[0]).join(", "));
}
board("garderobe-hd-coupes.png", COUPES);
board("garderobe-hd-vetements.png", VETEMENTS);
