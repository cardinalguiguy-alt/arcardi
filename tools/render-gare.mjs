/* =============================================================================
   render-gare.mjs — LA VOIE ET LES DEUX QUAIS. (2026-09-13)
   -----------------------------------------------------------------------------
   ⚠️⚠️ IL EXISTE PARCE QUE PERSONNE NE REGARDAIT LA GARE. Les rails et le quai
   étaient des tuiles de 16 px posées depuis le 232, et aucun des vingt-deux bancs
   de rendu ne les dessinait : la voie longe TOUT le bord ouest des deux cartes, et
   ses traverses tombaient tous les 8 px pile — la grille dessinée en bois.
   Le jour de la demande de Guillaume (« le quai en bois, ultra chic côté ville,
   plus élémentaire côté ferme ; les rails plus détaillés et texturés »), le banc
   naît avec le dessin, pas après.

   Ce qu'il mesure, et pourquoi ces grandeurs-là :
     1. TOUT EST OPAQUE. Un sol n'a pas de trou : un pixel transparent laisse voir
        l'herbe au travers d'une traverse ou d'une planche.
     2. LA VOIE BOUCLE. La couture entre le bas du pavé et son haut doit ressembler
        à n'importe quelle transition intérieure (DESSIN.md, 434).
     3. LES TRAVERSES N'EFFACENT PAS LA CASE, ELLES L'ÉVITENT. On repère les
        traverses dans les PIXELS (pas dans une liste recopiée) et on exige que
        leurs départs tombent à au moins trois hauteurs différentes de la case.
        Falsifié à l'écriture : au pas de 8 (le dessin du 232), il n'en trouve
        qu'une seule.
     4. AUCUNE CASE D'UN QUAI NE SE RÉPÈTE : un quai est un dessin, pas une tuile.
     5. LES DEUX QUAIS NE SONT PAS LE MÊME QUAI : le laiton n'existe que côté ville,
        et la ville est plus saturée que la ferme grisée par les saisons.
     6. LES QUAIS ONT UNE ÉPAISSEUR : une face avant au bout sud, à l'ombre de
        son arête (la vue est de trois quarts ; un quai sans face est peint à plat).

   ⚠️ IL APPELLE `A.drawStationTile`, la fonction que le jeu appelle aux deux gares
   — jamais une recopie du découpage (le stub menteur du §10).

   Usage :  node tools/render-gare.mjs     →  tools/out/gare.png
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt, C = mods.fermeConstants;
const S = A.buildSprites();
const T = C.TILE;

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "ÉCHEC  ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};
console.log("\n=== render-gare — la voie et les deux quais ===\n");

const pxOf = (img) => ({ px: img.__px, W: img.width, H: img.height });
const at = (im, x, y) => { const i = (y * im.W + x) * 4; return [im.px[i], im.px[i + 1], im.px[i + 2], im.px[i + 3]]; };
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
/* LE LAITON, NOMMÉ PAR CE QUI LE SÉPARE VRAIMENT (§8 : « nommer ce qui sépare les
   deux cas »). Le premier jet disait « rouge moins bleu > 90 » et il a rougi pour la
   mauvaise raison : il comptait la planche neuve de la ferme et l'arête vernie du
   teck, deux bruns chauds. Ce qui fait le laiton est un jaune SATURÉ dont le vert
   suit le rouge de près ; son éclat, plus pâle, garde un vert encore plus proche. */
const isBrassPx = ([r, g, b]) => r > 180 && g > 130 &&
  (((r - b) / r > 0.55 && g / r > 0.72) || ((r - b) / r > 0.45 && g / r > 0.84));

const rail = pxOf(S.railPatch), farm = pxOf(S.platformFarm), town = pxOf(S.platformTown);

/* ── 1. OPAQUE. */
for (const [name, im] of [["la voie", rail], ["le quai de la ferme", farm], ["le quai de la ville", town]]) {
  let holes = 0;
  for (let y = 0; y < im.H; y++) for (let x = 0; x < im.W; x++) if (at(im, x, y)[3] < 255) holes++;
  ok(holes === 0, `${name} est opaque`, `${holes} pixel(s) non opaque(s) sur ${im.W}×${im.H}`);
}

/* ── 2. LA VOIE BOUCLE. */
{
  const rowDiff = (y1, y2) => { let n = 0; for (let x = 0; x < rail.W; x++) { const a = at(rail, x, y1), b = at(rail, x, y2); if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) n++; } return n; };
  const inner = [];
  for (let y = 0; y < rail.H - 1; y++) inner.push(rowDiff(y, y + 1));
  inner.sort((p, q) => p - q);
  const p75 = inner[Math.floor(inner.length * 0.75)];
  const seam = rowDiff(rail.H - 1, 0);
  ok(rail.H === 4 * T && seam <= p75, "la voie boucle sans couture", `couture ${seam} px différents, 3ᵉ quartile intérieur ${p75}`);
}

/* ── 3. LES TRAVERSES ÉVITENT LA GRILLE. Repérées entre les deux files de rails,
   là où il n'y a que du ballast ou du bois. */
{
  const dark = [];
  for (let y = 0; y < rail.H; y++) {
    let s = 0, n = 0;
    for (let x = 11; x <= 20; x++) { s += lum(at(rail, x, y)); n++; }
    dark.push(s / n < 100);
  }
  const starts = [];
  for (let y = 0; y < rail.H; y++) if (dark[y] && !dark[(y - 1 + rail.H) % rail.H]) starts.push(y);
  const residues = new Set(starts.map(y => y % T));
  ok(starts.length >= 5 && residues.size >= 3, "les traverses ne redessinent pas la case",
     `${starts.length} traverses lues, départs à ${[...residues].sort((p, q) => p - q).join("/")} px de la case`);
}

/* ── 4. AUCUNE CASE D'UN QUAI NE SE RÉPÈTE. */
for (const [name, im] of [["ferme", farm], ["ville", town]]) {
  const seen = new Map();
  let dup = 0, cells = 0;
  for (let cy = 0; cy < im.H / T; cy++) for (let cx = 0; cx < im.W / T; cx++) {
    let h = "";
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) h += at(im, cx * T + x, cy * T + y).slice(0, 3).join(",") + ";";
    cells++;
    if (seen.has(h)) dup++; else seen.set(h, 1);
  }
  ok(dup === 0, `quai de la ${name} : aucune case ne se répète`, `${cells} cases, ${dup} doublon(s)`);
}

/* ── 5. DEUX QUAIS, DEUX MONDES. Le laiton se reconnaît au jaune franc (rouge
   saturé — voir `isBrassPx`, en tête de fichier). */
{
  const brass = (im) => { let n = 0; for (let y = 0; y < im.H; y++) for (let x = 0; x < im.W; x++) if (isBrassPx(at(im, x, y))) n++; return n; };
  /* ⚠️ SUR LE PLANCHER SEUL (le milieu du quai) : les margelles de pierre claire de la
     ville pèseraient dans une moyenne de tout le sprite et la rendraient plus terne que
     la ferme — une mesure qui confond le bois et la pierre (§8). */
  const sat = (im) => { let s = 0, n = 0; for (let y = 16; y < im.H - 24; y++) for (let x = 10; x <= 21; x++) { const [r, g, b] = at(im, x, y); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); s += mx ? (mx - mn) / mx : 0; n++; } return s / n; };
  const bT = brass(town), bF = brass(farm), sT = sat(town), sF = sat(farm);
  ok(bT >= 60 && bF === 0, "le laiton n'existe que côté ville", `ville ${bT} px, ferme ${bF} px`);
  ok(sT > sF + 0.08, "le teck verni de la ville est plus riche que le bois grisé de la ferme",
     `saturation ville ${sT.toFixed(2)}, ferme ${sF.toFixed(2)}`);
}

/* ── 6. LES DEUX QUAIS ONT UNE ÉPAISSEUR. La vue est de trois quarts : le bout sud d'un
   quai surélevé montre sa FACE AVANT, plus sombre que le plancher. Sans elle, le quai
   est peint à plat sur le sol (le défaut du premier jet, « pas beau comme ça »). */
for (const [name, im] of [["ferme", farm], ["ville", town]]) {
  const band = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 8; x < im.W - 8; x++) { s += lum(at(im, x, y)); n++; } return s / n; };
  /* ⚠️ ON COMPARE LA FACE À CE QUI EST JUSTE AU-DESSUS D'ELLE (la poutre ou la margelle
     du bout, au soleil), PAS AU PLANCHER : la face de pierre de la ville est plus claire
     que son acajou, et le premier jet de ce contrôle l'a déclarée absente pour ça. Ce
     qui fait une face, c'est d'être à l'ombre de sa propre arête. */
  const face = band(im.H - 5, im.H - 1), top = band(im.H - 7, im.H - 5);
  ok(face < top - 12, `quai de la ${name} : une face avant au bout sud, à l'ombre de son arête`,
     `face ${face.toFixed(0)}, arête ${top.toFixed(0)}`);
}

/* ── LA PLANCHE : voie + quai de la ferme | voie + quai de la ville, douze cases
   de haut (la voie boucle trois fois, le quai tient huit cases). */
{
  const ROWS = 12, COLS = 5, gap = T;
  const W = COLS * T * 2 + gap, H = ROWS * T;
  const sh = makeCanvas(W, H);
  for (const [side, kind] of [[0, "platformFarm"], [1, "platformTown"]]) {
    const ox = side * (COLS * T + gap);
    sh.ctx.fillStyle = "#6f9a4a"; sh.ctx.fillRect(ox, 0, COLS * T, H);
    for (let y = 0; y < ROWS; y++) {
      A.drawStationTile(sh.ctx, S, "rail", 0, y, ox, y * T);
      A.drawStationTile(sh.ctx, S, "rail", 1, y, ox + T, y * T);
    }
    for (let y = 0; y < 8; y++) for (let x = 0; x < 2; x++) A.drawStationTile(sh.ctx, S, kind, x, y, ox + (2 + x) * T, (2 + y) * T);
  }
  const big = scale(sh.px, W, H, 4);
  writePNG(path.join(OUT, "gare.png"), big.px, big.W, big.H);
  console.log(`\n  planche : tools/out/gare.png (${big.W}×${big.H}, ×4) — ferme à gauche, ville à droite\n`);
}

console.log(fail === 0 ? "✅ tout passe." : `❌ ${fail} échec(s).`);
process.exit(fail === 0 ? 0 : 1);
