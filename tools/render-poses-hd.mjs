/* ╔══════════════════════════════════════════════════════════════════════════
   ║ render-poses-hd — LES POSES EN 32 × 48, À CÔTÉ DE LEUR 16 × 24 (2026-10-24)
   ╚══════════════════════════════════════════════════════════════════════════
   Les poses (`fermeArt.js` : assis, glissade, arc-boutement, grimpe, fouille, lancer, halage, patin ; `chantierArt.js` : les
   gestes des ouvriers) DÉCOUPENT la feuille du personnage avec les repères du gabarit 16 × 24. En jeu, `drawPoseHD`
   (FermeGame.js) les rejoue sur une toile ×2 avec la feuille fine NUE, en doublant les seuls rectangles SOURCE, puis pose le
   contour sur la pose finie. Ce banc fait EXACTEMENT la même chose sous Node (le faux canevas ignore `translate`/`scale` : ni
   miroir ni rotation ici, les poses en miroir se regardent en jeu) — c'est lui qui dit si une retouche du gabarit 32 × 48
   (les épaules de la variante C, 2026-10-24) casse une découpe.
   Une ligne par (pose, personnage) : à gauche l'ancien (16 × 24, ×2), à droite le fin. Hors banc : bateau, cheval, dormeur,
   riders du park (leur code vit dans FermeGame.js / montureArt.js, à regarder en jeu — `app/audit-riders`).
   Sortie : tools/out/poses-hd.png (×3, ou K=6 dans l'environnement). Usage : node tools/render-poses-hd.mjs [filtre] */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const { fermeArt: A, chantierArt: CA, montureArt: MA, fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "chantierArt", "montureArt"]);
const S = A.buildSprites();
const CHARS = { m: ["m", 0, null], f: ["f", 1, null] };
const PX = 12, PY = 14, CW = 40, CH = 48;   // la case (unités du monde), le coin haut-gauche du personnage debout
// [nom, personnage, rangée, pose(ctx, sheet, row)]
const POSES = [
  ["assis face", "m", 0, (c, s, r) => A.drawSeated(c, s, r, PX, PY + 6)], ["assis face", "f", 0, (c, s, r) => A.drawSeated(c, s, r, PX, PY + 6)],
  ["assis profil", "m", 2, (c, s, r) => A.drawSeated(c, s, r, PX, PY + 6)],
  ["glissade", "m", 0, (c, s, r) => A.drawStarSlide(c, s, r, PX, PY + 8, 1, 0)],
  ["arc-boutement", "m", 0, (c, s, r) => A.drawStarBrace(c, s, r, PX, PY + 8)],
  ["grimpe 0", "m", 1, (c, s, r) => A.drawStarClimb(c, s, r, PX, PY + 8, 0)], ["grimpe 2", "f", 1, (c, s, r) => A.drawStarClimb(c, s, r, PX, PY + 8, 2)],
  ["fouille", "m", 0, (c, s, r) => A.drawStarDig(c, s, r, PX, PY + 8, 0.3, 1)],
  ["lancer", "m", 2, (c, s, r) => A.drawStarCast(c, s, r, PX, PY + 8, 0.4, 1)],
  ["halage", "m", 2, (c, s, r) => A.drawStarHaul(c, s, r, PX, PY + 8, 0.6, true, 1, 0)],
  ["patin debout", "m", 0, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "stand", 0, false)],
  ["patin glisse", "f", 2, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "glide", 0.3, true)],
  ["patin freine", "m", 0, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "brake", 0, false)],
  ["patin vrille", "f", 0, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "spin", 0.2, true)],
  ["patin cygne", "m", 2, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "swan", 0, false)],
  ["patin axel", "m", 0, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "axel", 0.5, false)],
  ["patin moulinet", "m", 0, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "slip", 0.25, false)],
  ["patin chute", "f", 0, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "fall", 0.1, true)],
  ["main tendue", "m", 0, (c, s, r) => A.drawSkate(c, s, r, PX, PY, "glide", 0.3, false, { hand: { x: PX + 24, y: PY + 13 } })],
  // les riders du park (`MA.drawRide`) : de face (le cap qui met la poitrine vers nous) — un profil se dessinerait en miroir
  ["skate", "m", 0, (c, s) => MA.drawRide(c, s, PX, PY, rider("skate", 0, {}), false)],
  ["skate accroupi", "f", 0, (c, s) => MA.drawRide(c, s, PX, PY, rider("skate", 0, { bend: 3 }), true)],
  ["bmx", "m", 0, (c, s) => MA.drawRide(c, s, PX, PY, rider("bmx", Math.PI / 2, { pose: "glide", ph: 0.2 }), false)],
  ["trottinette", "f", 0, (c, s) => MA.drawRide(c, s, PX, PY, rider("scooter", Math.PI / 2, { pose: "push", ph: 0.25 }), true)],
  ["rollers", "m", 0, (c, s) => MA.drawRide(c, s, PX, PY, rider("roller", Math.PI / 2, { pose: "glide", ph: 0.2 }), false)],
  ["rider chute", "m", 0, (c, s) => MA.drawRide(c, s, PX, PY, rider("skate", 0, { mode: "bail" }), false)],
  ["ouvrier porte", "m", 0, (c, s, r) => CA.drawWorkerAct(c, s, r, PX, PY, "carry", 0.3, 0)],
  ["ouvrier montre", "m", 2, (c, s, r) => CA.drawWorkerAct(c, s, r, PX, PY, "point", 0.3, 0)],
  ["ouvrier soude", "m", 0, (c, s, r) => CA.drawWorkerAct(c, s, r, PX, PY, "weld", 0.3, 0)],
];
// Un rider posé comme le personnage debout (`p.x`, `p.y` en cases, le coin du sprite : `C.footX`/`footY` en tirent les pieds).
function rider(kind, th, o) {
  return { x: PX / C.TILE, y: PY / C.TILE, ride: { kind, th, air: 0, mode: o.mode || "ground", pose: o.pose || "stand", ph: o.ph || 0, color: 0, bend: o.bend || 0, lean: 0 } };
}
/* Le contexte de la pose, à l'échelle `k` du monde : comme `hdCtxProxy` (rectangles source × `__hdK`), plus la mise à l'échelle
   du monde que le jeu fait par `setTransform(2, …)` — ici à la main, le faux canevas n'en ayant pas. */
function poseCtx(g, k) {
  const o = {
    drawImage(img, ...a) {
      const K = (img && img.__hdK) || 1;
      if (a.length === 8) return g.drawImage(img, a[0] * K, a[1] * K, a[2] * K, a[3] * K, a[4] * k, a[5] * k, a[6] * k, a[7] * k);
      if (a.length === 4) return g.drawImage(img, a[0] * k, a[1] * k, a[2] * k, a[3] * k);
      return g.drawImage(img, a[0] * k, a[1] * k, (img.width / K) * k, (img.height / K) * k);
    },
    fillRect(x, y, w, h) { g.fillRect(x * k, y * k, w * k, h * k); },
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, beginPath() {}, closePath() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {},
  };
  for (const p of ["fillStyle", "globalAlpha", "strokeStyle", "lineWidth", "globalCompositeOperation", "imageSmoothingEnabled"])
    Object.defineProperty(o, p, { get: () => g[p], set: (v) => { try { g[p] = v; } catch (e) { /* le faux canevas peut refuser */ } } });
  return o;
}
// Le contour posé sur la pose finie (la règle de `outlineHD` : un pixel plein en appelle un, un pixel vide le reçoit).
function outline(px, W, H) {
  const src = px.slice(), at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : (y * W + x) * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = at(x, y); if (src[i + 3]) continue;
    const n = [at(x, y + 1), at(x - 1, y), at(x + 1, y), at(x, y - 1)].find((j) => j >= 0 && src[j + 3] >= 200);
    if (n == null) continue;
    for (let c = 0; c < 3; c++) px[i + c] = Math.round(src[n + c] + ([28, 14, 30][c] - src[n + c]) * 0.74);
    px[i + 3] = 255;
  }
}
const filt = process.argv[2];
const rows = POSES.filter((p) => !filt || p[0].includes(filt));
const K2 = 2, P = 2, GAP = 4, W = 2 * (CW * K2 + P) + P + GAP, H = rows.length * (CH * K2 + P) + P;
const board = makeCanvas(W, H), bg = board.ctx;
bg.fillStyle = "#cfc8b8"; bg.fillRect(0, 0, W, H);
rows.forEach(([, who, row, fn], ri) => {
  const [gender, outfit, look] = CHARS[who];
  // ⚠️ L'ancienne feuille se recompose image par image (`S.charFrame`) : `charSheet` range ses rangées par `translate`, que le faux
  // canevas ignore — elle n'aurait ici que sa rangée de face.
  const old = makeCanvas(64, 72); old.width = 64; old.height = 72; old.__px = old.px;
  for (let d = 0; d < 3; d++) for (let f = 0; f < 4; f++) old.ctx.drawImage(S.charFrame(gender, outfit, d, f, look), 0, 0, 16, 24, f * 16, d * 24, 16, 24);
  const naked = S.getCharHD(gender, outfit, look, true, "neutre", null);
  [[old, false], [naked, true]].forEach(([sheet, hd], ci) => {
    const cell = makeCanvas(CW * K2, CH * K2);
    fn(poseCtx(cell.ctx, K2), sheet, row);
    if (hd) outline(cell.px, CW * K2, CH * K2);
    const x0 = P + ci * (CW * K2 + P) + (ci ? GAP : 0), y0 = P + ri * (CH * K2 + P);
    bg.fillStyle = ci ? "#ece6d8" : "#dcd5c6"; bg.fillRect(x0, y0, CW * K2, CH * K2);
    for (let y = 0; y < CH * K2; y++) for (let x = 0; x < CW * K2; x++) {
      const i = (y * CW * K2 + x) * 4; if (!cell.px[i + 3]) continue;
      bg.fillStyle = `rgb(${cell.px[i]},${cell.px[i + 1]},${cell.px[i + 2]})`; bg.fillRect(x0 + x, y0 + y, 1, 1);
    }
  });
});
const up = scale(board.px, W, H, +(process.env.K || 3));   // K=6 node … : pour regarder une pose de près
writePNG(path.join(ROOT, "tools", "out", "poses-hd.png"), up.px, up.W, up.H);
console.log("planche : tools/out/poses-hd.png —", rows.map((r) => r[0] + " " + r[1]).join(", "));
