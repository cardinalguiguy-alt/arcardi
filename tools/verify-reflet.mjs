/* =============================================================================
   verify-reflet.mjs — LES PERSONNAGES SE REFLÈTENT DANS LES FLAQUES (2026-11-21, `components/ferme/reflet.js`).
   Ce que le banc tient (sur une feuille d'essai : tête, corps, souliers de trois couleurs) :
   1. LA FIGURE : le sprite posé à sa place, en miroir pour le profil ouest ; le dôme du parapluie au-dessus de la tête quand il est
      ouvert, rien sinon.
   2. LE REFLET : retourné autour des PIEDS (les souliers en haut du reflet, la tête au fond) ; plus sombre et bleuté que la source ;
      de plus en plus transparent en s'éloignant des pieds ; rien hors de la flaque (le masque, au pixel) ; rien du tout sans flaque.
   3. L'ONDULATION : sans pluie, le reflet est immobile ; sous la pluie, il bouge, d'un pixel fin au plus par rangée.
   4. LE TAMIS : `anyPuddle` voit une flaque sous les pieds ou devant, et rien quand il n'y en a pas.
   Usage : node tools/verify-reflet.mjs        FALSIFY=endroit (pas retourné) | debord (le masque ignoré)
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { reflet: RF } = await loadFerme(ROOT, ["reflet"]);
const FALSIFY = process.env.FALSIFY || "";
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
console.log("\n=== verify-reflet ===\n");
const { W, H, SX, SY } = RF.REFLET;
// une feuille d'essai : une case 32 × 48 — tête (rouge) rangées 0-15, corps (vert) 16-39, souliers (bleu) 40-47 ; la moitié gauche plus claire
const SW = 64, src = new Uint8ClampedArray(SW * 48 * 4);
const HEAD = [200, 60, 60], BODY = [60, 200, 60], SHOE = [60, 60, 200];
for (let y = 0; y < 48; y++) for (let x = 6; x < 26; x++) {
  const c = y < 16 ? HEAD : y < 40 ? BODY : SHOE, k = (y * SW + x) * 4, lite = x < 16 ? 30 : 0;
  src[k] = c[0] + lite; src[k + 1] = c[1] + lite; src[k + 2] = c[2] + lite; src[k + 3] = 255;
}
const fig = new Uint8ClampedArray(W * H * 4), out = new Uint8ClampedArray(W * H * 4);
const at = (buf, x, y) => [...buf.slice((y * W + x) * 4, (y * W + x) * 4 + 4)];

// 1. La figure
{
  RF.buildFigure(fig, src, SW, 0, 0, false, null, "down");
  ok(at(fig, SX + 10, SY + 2)[0] === HEAD[0] + 30 && at(fig, SX + 10, SY + 44)[2] === SHOE[2] + 30 && at(fig, SX + 2, SY + 20)[3] === 0, "le sprite posé à sa place dans la figure");
  let domeN = 0; for (let y = 0; y < SY; y++) for (let x = 0; x < W; x++) if (at(fig, x, y)[3]) domeN++;
  ok(domeN === 0, "sans parapluie, rien au-dessus de la tête");
  RF.buildFigure(fig, src, SW, 0, 0, true, null, "left");
  ok(at(fig, SX + 21, SY + 20)[1] === BODY[1] + 30 && at(fig, SX + 10, SY + 20)[1] === BODY[1], "le profil ouest est en miroir (la moitié claire passe à droite)");
  RF.buildFigure(fig, src, SW, 0, 0, false, { col: "#c8323c", dark: "#aa141e", side: 1 }, "down");
  domeN = 0; for (let y = 0; y < SY; y++) for (let x = 0; x < W; x++) if (at(fig, x, y)[3]) domeN++;
  ok(domeN > 100, "parapluie ouvert : son dôme au-dessus de la tête, dans la figure", domeN + " px");
}
// 2. Le reflet
{
  RF.buildFigure(fig, src, SW, 0, 0, false, null, "down");
  const flipFig = FALSIFY === "endroit" ? (() => { const f2 = new Uint8ClampedArray(fig.length); for (let y = 0; y < H; y++) f2.set(fig.slice((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); return f2; })() : fig;
  const all = () => true;
  const n = RF.reflectInto(out, flipFig, all, 100, 200, 0, 0);
  const top = at(out, SX + 16, 1), deep = at(out, SX + 16, H - 1 - (SY + 6));   // la rangée qui reflète le milieu de la tête
  ok(n > 500 && top[2] > top[0] && deep[0] > deep[2], "retourné autour des pieds : les souliers en haut du reflet, la tête au fond", "haut " + top.slice(0, 3) + ", fond " + deep.slice(0, 3));
  ok(top[2] < SHOE[2] && top[0] > 0 && top[2] - top[0] > 0, "plus sombre que la source, et bleuté", top.slice(0, 3).join(","));
  ok(at(out, SX + 16, 1)[3] > at(out, SX + 16, 40)[3] + 60, "de plus en plus transparent en s'éloignant des pieds", at(out, SX + 16, 1)[3] + " → " + at(out, SX + 16, 40)[3]);
  const half = FALSIFY === "debord" ? all : (wx) => wx < 100 + 4;   // la flaque ne couvre que la moitié gauche
  RF.reflectInto(out, fig, half, 100, 200, 0, 0);
  let leak = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(out, x, y)[3] && Math.floor(100 - SX / 2 + x / 2) >= 104) leak++;
  ok(leak === 0, "rien hors de la flaque (le masque au pixel d'art)", leak + " px de trop");
  ok(RF.reflectInto(out, fig, () => false, 100, 200, 0, 0) === 0, "sans flaque, rien du tout");
}
// 3. L'ondulation
{
  RF.buildFigure(fig, src, SW, 0, 0, false, null, "down");
  const a = new Uint8ClampedArray(out.length), b = new Uint8ClampedArray(out.length);
  RF.reflectInto(a, fig, () => true, 0, 0, 0, 1.0); RF.reflectInto(b, fig, () => true, 0, 0, 0, 2.7);
  ok(a.every((v, i) => v === b[i]), "sans pluie, le reflet est immobile");
  RF.reflectInto(a, fig, () => true, 0, 0, 1, 1.0); RF.reflectInto(b, fig, () => true, 0, 0, 1, 1.37);
  let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  // l'écart d'une rangée : le bord gauche du corps ne bouge pas de plus d'un pixel fin
  let maxShift = 0;
  for (let y = 0; y < H; y++) { const e = (buf) => { for (let x = 0; x < W; x++) if (buf[(y * W + x) * 4 + 3]) return x; return -1; }; const ea = e(a), eb = e(b); if (ea >= 0 && eb >= 0) maxShift = Math.max(maxShift, Math.abs(ea - eb)); }
  ok(diff > 0 && maxShift <= 2, "sous la pluie, il ondule — d'un pixel fin au plus par rangée de chaque côté", "écart max " + maxShift + " (deux instants)");
}
// 4. Le tamis
{
  ok(RF.anyPuddle((x, y) => x >= 106 && x <= 108 && y >= 214 && y <= 216, 100, 200) && !RF.anyPuddle(() => false, 100, 200), "voit une flaque sous les pieds ou devant ; rien quand il n'y en a pas");
}
console.log("\n" + nOk + "/" + (nOk + fail) + (fail ? "  — " + fail + " ÉCHEC(S)" : "  — tout est vert") + "\n");
process.exit(fail ? 1 : 0);
