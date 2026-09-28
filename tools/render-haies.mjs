/* =============================================================================
   render-haies.mjs — LES CLÔTURES DE VALLEY TOWN. (2026-09-01, refait le 2026-09-28)
   -----------------------------------------------------------------------------
   ⚠️ IL EXISTE PARCE QUE LA HAIE N'AVAIT JAMAIS ÉTÉ REGARDÉE : elle était
   dessinée dans la closure du rendu depuis le 425 (le piège n°1 de `CLAUDE.md`,
   « il fait vieillir »), et le jour où on a pu la peindre hors du jeu, deux
   défauts sont tombés en une image (des haies verticales en chapelet, des
   rangées volées à la planche voisine).

   ⚠️ 2026-09-28 (phase 7b) — LA HAIE EST DEVENUE CINQ CLÔTURES EN VOLUMES
   (`components/ferme/clotures.js`) : haie de buis, muret et grille, palissade
   blanche, planches, piquets et fil, leurs portails et les potagers. Ce banc
   les appelle — `A.drawTownHedgeTile`, `A.drawTownGate`, `A.drawTownPlot`, les
   fonctions du jeu, jamais une recopie — et mesure :

     1. LA CONTINUITÉ D'UN AXE, pour chaque matière : sur un tronçon de dix
        cases, aucune colonne (resp. rangée, en nord-sud) entièrement vide à
        l'intérieur. Une claire-voie a des jours entre ses piquets ; ses lisses,
        elles, courent — une colonne vide est une clôture coupée.
     2. LA CLÔTURE EST POSÉE SUR SA CASE, AU MILIEU : son pied (le plus bas
        pixel de la matière, ombre exclue) tombe dans la moitié centrale de la
        case — la collision occupe la case entière, un dessin collé à un bord
        laisserait un vide d'un côté et une traversée de l'autre (la leçon de
        `verify-collision`). Et rien n'est peint sur la rangée du haut du
        cadre : un cadre trop court découpe en silence (§4 de `CLAUDE.md`).
     3. DU VOLUME : au moins quatre tons par matière.
     4. LES PORTAILS PIVOTENT : fermé, le milieu de l'ouverture est barré ;
        ouvert, la moitié centrale est LIBRE (on y passe) et les vantaux sont
        montés au nord (ils s'ouvrent vers le jardin).
     5. SUR LA VRAIE CARTE : les cinq matières existent ; aucune case de clôture
        n'a son axe sous l'image d'une maison (le défaut que Guillaume voulait
        voir corrigé : l'anneau passait sous le mur des standard et des larges) ;
        aucune rangée nord derrière le toit ; chaque jardin clos a la matière de
        son rang ; chaque portail est tenu par la clôture des deux côtés.
     6. LE CADRE : aucune cellule mise en cache par le rendu de toute la ville
        n'a un pixel sur sa rangée du haut.

   Planches : tools/out/haies-styles.png (les cinq matières, portails, poses,
   potagers), tools/out/haies-parcelle.png (des parcelles de la vraie carte).

   Usage :  node tools/render-haies.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme, paletteOf } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "clotures"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, K = mods.clotures;
const S = A.buildSprites();
const T = C.TILE, OV = K.FENCE_OV, F = C.TOWN_FENCE;
const NAMES = { [F.HEDGE]: "haie de buis", [F.IRON]: "muret et grille", [F.PICKET]: "palissade blanche", [F.BOARD]: "palissade de planches", [F.WIRE]: "piquets et fil" };
const STYLES = [F.HEDGE, F.IRON, F.PICKET, F.BOARD, F.WIRE];

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "ÉCHEC  ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};
console.log("\n=== render-haies — les clôtures de Valley Town ===\n");

/* Un monde de poche : `drawTownHedgeTile` ne lit que `w`, `h`, `hedge` et
   `gates`. On compose n'importe quelle figure sans passer par le générateur. */
function mini(w, h, cells, style, gates = []) {
  const hedge = new Uint8Array(w * h);
  for (const [x, y] of cells) if (x >= 0 && y >= 0 && x < w && y < h) hedge[y * w + x] = style;
  return { w, h, hedge, gates };
}
function paint(tw, pad = 1) {
  const W = (tw.w + pad * 2) * T, H = (tw.h + pad * 2) * T + OV;
  const sh = makeCanvas(W, H);
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) {
    if (tw.hedge[y * tw.w + x]) A.drawTownHedgeTile(sh.ctx, S, tw, x, y, (x + pad) * T, (y + pad) * T + OV);
  }
  return { px: sh.px, W, H, pad };
}
/* « Matière » : un pixel opaque qui n'est pas l'ombre de contact (celle-ci est
   semi-transparente, alpha < 0,4). */
const solidAt = (im, x, y) => x >= 0 && y >= 0 && x < im.W && y < im.H && im.px[(y * im.W + x) * 4 + 3] > 200;

/* ═══════════════════════════════════════════════ 1-3. CHAQUE MATIÈRE */
const RUN = 10;
for (const st of STYLES) {
  const nm = NAMES[st];
  const hz = mini(RUN + 2, 3, Array.from({ length: RUN }, (_, k) => [k + 1, 1]), st);
  const im = paint(hz);
  let holes = 0;
  for (let x = (1 + 2) * T; x < (1 + RUN) * T; x++) {
    let any = false;
    for (let y = 0; y < im.H; y++) if (solidAt(im, x, y)) { any = true; break; }
    if (!any) holes++;
  }
  ok(holes === 0, `${nm} : tronçon est-ouest de ${RUN} cases, aucune colonne vide`, `${holes} colonne(s)`);

  const vt = mini(3, RUN + 2, Array.from({ length: RUN }, (_, k) => [1, k + 1]), st);
  const iv = paint(vt);
  let vholes = 0;
  for (let y = OV + (1 + 2) * T; y < OV + (1 + RUN) * T; y++) {
    let any = false;
    for (let x = 0; x < iv.W; x++) if (solidAt(iv, x, y)) { any = true; break; }
    if (!any) vholes++;
  }
  ok(vholes === 0, `${nm} : tronçon nord-sud de ${RUN} cases, aucune rangée vide`, `${vholes} rangée(s)`);

  /* Le pied : sur quatre cases du milieu du tronçon est-ouest (un poteau y
     tombe toujours — le fil de fer ne touche le sol que par ses piquets), la
     plus basse rangée de matière, rapportée à la case. */
  const cx0 = (1 + 4) * T, cy0 = OV + (1 + 1) * T;
  let foot = -1;
  for (let y = cy0; y < cy0 + T; y++) for (let x = cx0; x < cx0 + 4 * T; x++) if (solidAt(im, x, y)) foot = Math.max(foot, y - cy0);
  ok(foot >= 6 && foot <= 12, `${nm} : posée au milieu de sa case`, `pied à la rangée ${foot} sur 16`);
  const P = paletteOf(im.px, im.W, im.H);
  ok(P.colors >= 4, `${nm} : du volume`, `${P.colors} tons`);
}

/* ═══════════════════════════════════════════════ 4. LES PORTAILS */
for (const st of STYLES) {
  const nm = NAMES[st];
  // Le portail est posé en x = 0 (son ouverture couvre [0, 32[) et assez bas pour que son cadre tienne entier.
  const shot = (open) => {
    const W = 2 * T + 8, H = 4 * T + 8;
    const sh = makeCanvas(W, H);
    A.drawTownGate(sh.ctx, S, { x: 0, y: 3, w: 2, style: st, e: 0 }, open);
    return { px: sh.px, W, H };
  };
  const closed = shot(0), open = shot(1);
  const midCols = (im) => { let n = 0; for (let x = 10; x < 22; x++) for (let y = 0; y < im.H; y++) if (solidAt(im, x, y)) { n++; break; } return n; };
  ok(midCols(closed) >= 10, `${nm} : portail fermé, le milieu est barré`, `${midCols(closed)}/12 colonnes`);
  ok(midCols(open) === 0, `${nm} : portail ouvert, le milieu est libre`, `${midCols(open)}/12 colonnes peintes`);
  const topRow = (im) => { for (let y = 0; y < im.H; y++) for (let x = 0; x < im.W; x++) if (solidAt(im, x, y)) return y; return im.H; };
  ok(topRow(open) < topRow(closed), `${nm} : les vantaux s'ouvrent vers le jardin (le nord)`, `sommet ${topRow(closed)} → ${topRow(open)}`);
}

/* ═══════════════════════════════════════════════ 5. LA VRAIE CARTE */
const tw = E.generateTownWorld();
{
  const counts = {};
  for (let i = 0; i < tw.hedge.length; i++) if (tw.hedge[i]) counts[tw.hedge[i]] = (counts[tw.hedge[i]] || 0) + 1;
  for (const st of STYLES) ok((counts[st] || 0) > 0, `la ville a des cases de ${NAMES[st]}`, `${counts[st] || 0}`);
  /* ⚠️ Une PART, pas un compte : un nombre exact vieillit à la première parcelle
     ajoutée (§10). Certains jardins clos n'ont pas de portail parce que leur
     devant est une rue (le seuil donne directement dessus) — pas davantage. */
  const fenced = C.townFenceLayout().filter((l) => l.style).length;
  ok(tw.gates.length >= 0.7 * fenced, "les jardins clos ont leurs portails", `${tw.gates.length} portails pour ${fenced} jardins clos`);
  ok(tw.plots.length >= 1, "les jardins ouverts des plus modestes ont leur potager", `${tw.plots.length} carrés`);
  const open = C.townFenceLayout().filter((l) => !l.style).length;
  ok(open > 0 && open < fenced, "tous les jardins ne sont pas clos (Guillaume, 2026-09-28)", `${open} ouverts, ${fenced} clos`);

  let under = [], north = [], wrong = [], lone = [];
  const layout = C.townFenceLayout();
  for (const L of layout) {
    const h = L.hsn;
    // Aucune case de clôture n'a son axe sous l'image de SA maison, sur les rangées du mur et du jardin.
    for (let y = h.y; y <= h.y + C.TOWN_HOUSE_H + 2; y++) for (let x = Math.floor(L.imgL) - 1; x <= Math.ceil(L.imgR); x++) {
      if (!tw.hedge[y * tw.w + x]) continue;
      if (x + 0.5 > L.imgL && x + 0.5 < L.imgR && y < h.y + C.TOWN_HOUSE_H) under.push(`${x},${y}`);
    }
    // Plus de rangée nord : rien derrière le toit.
    for (let x = Math.ceil(L.imgL); x < Math.floor(L.imgR); x++) if (tw.hedge[(h.y - 1) * tw.w + x] && x !== L.westCol && x !== L.eastCol) north.push(`${x},${h.y - 1}`);
    // La matière du devant est celle du rang (hors portail et angles partagés).
    if (L.style) for (let x = L.westCol + 1; x < L.eastCol; x++) for (let y = h.y + C.TOWN_HOUSE_H + 1; y <= L.front; y++) {
      const v = tw.hedge[y * tw.w + x];
      if (v && v !== L.style) wrong.push(`${x},${y}`);
    }
  }
  for (const g of tw.gates) if (!tw.hedge[g.y * tw.w + g.x - 1] || !tw.hedge[g.y * tw.w + g.x + g.w]) lone.push(`${g.x},${g.y}`);
  ok(under.length === 0, "aucune clôture ne passe sous une maison", under.slice(0, 6).join(" ") || "0");
  ok(north.length === 0, "aucune rangée nord derrière un toit", north.slice(0, 6).join(" ") || "0");
  ok(wrong.length === 0, "chaque jardin clos a la matière de son rang", wrong.slice(0, 6).join(" ") || "0");
  ok(lone.length === 0, "chaque portail est tenu des deux côtés", lone.join(" ") || "0");
  const byRank = {};
  for (const L of layout) { const k = L.rank + ":" + (C.TOWN_FENCE_KEYS[L.style] || "ouvert"); byRank[k] = (byRank[k] || 0) + 1; }
  console.log("         jardins par rang et matière :", Object.entries(byRank).sort().map(([k, n]) => `${k} ${n}`).join(", "));
}

/* ═══════════════════════════════════════════════ 6. LE CADRE, SUR TOUTE LA VILLE
   On dessine chaque case de clôture de la carte (donc on remplit le cache
   comme le jeu le fait), puis on relit chaque cellule : sa rangée du haut
   doit être vide. */
{
  const sh = makeCanvas(T, T + OV);
  let n = 0;
  for (let y = 0; y < tw.h; y++) for (let x = 0; x < tw.w; x++) if (tw.hedge[y * tw.w + x]) { A.drawTownHedgeTile(sh.ctx, S, tw, x, y, 0, OV); n++; }
  for (const g of tw.gates) for (let f = 0; f <= 5; f++) A.drawTownGate(sh.ctx, S, g, f / 5);
  for (const p of tw.plots) for (const se of ["spring", "summer", "autumn", "winter"]) A.drawTownPlot(sh.ctx, S, p, se);
  const cache = S.townEnclos;
  let clipped = [];
  for (const [key, c] of cache.map) {
    const px = c.img.__px, W = c.img.width;
    for (let x = 0; x < c.w; x++) if (px[(c.sy * W + c.sx + x) * 4 + 3] > 0) { clipped.push(key); break; }
  }
  ok(clipped.length === 0, "aucune cellule découpée par le haut de son cadre", `${cache.map.size} cellules, ${cache.pages.length} page(s) d'atlas, ${n} cases lues` + (clipped.length ? ` — ${clipped.slice(0, 4).join(" ")}` : ""));
}

/* ═══════════════════════════════════════════════ PLANCHES */
{
  const MW = 14, MH = 10, W = MW * T * 5, H = MH * T + 6 * T + OV;
  const sh = makeCanvas(W, H);
  sh.ctx.fillStyle = "#5f9a48"; sh.ctx.fillRect(0, 0, W, H);
  STYLES.forEach((st, k) => {
    const cells = [];
    for (let y = 2; y <= 8; y++) cells.push([1, y], [12, y]);
    for (let x = 2; x <= 11; x++) if (x !== 6 && x !== 7) cells.push([x, 8]);
    cells.push([4, 4], [5, 4], [4, 5]);
    const t2 = mini(MW, MH, cells, st, [{ x: 6, y: 8, w: 2, style: st, e: 0 }]);
    const ox = k * MW * T;
    sh.ctx.fillStyle = "#8a7a66"; sh.ctx.fillRect(ox + 2.5 * T, OV, 9 * T, 2 * T + 8);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (t2.hedge[y * MW + x]) A.drawTownHedgeTile(sh.ctx, S, t2, x, y, ox + x * T, y * T + OV);
    A.drawTownGate(sh.ctx, S, { x: 6 + k * MW, y: 8 + OV / T, w: 2, style: st, e: 0 }, [0, 0.2, 0.6, 1, 0.4][k]);
    for (let f = 0; f < 6; f++) A.drawTownGate(sh.ctx, S, { x: k * MW + f * 2 + 1, y: MH + 2 + OV / T, w: 2, style: st, e: 0 }, f / 5);
  });
  ["spring", "summer", "autumn", "winter"].forEach((se, k) => A.drawTownPlot(sh.ctx, S, { x: 2 + k * 4, y: MH + 3 + Math.ceil(OV / T), w: 3, h: 2 }, se));
  const big = scale(sh.px, W, H, 3);
  writePNG(path.join(OUT, "haies-styles.png"), big.px, big.W, big.H);
}
{
  /* Trois parcelles de la vraie carte, une par rang, avec leur voisinage. La
     maison n'est pas peinte (un bitmap, hors banc) : son IMAGE est un aplat
     brun, pour juger la clôture contre la place qu'elle occupe vraiment. */
  const picks = [[163, 43], [46, 28], [14, 28]];
  const PW = 16, PH = 10;
  const sh = makeCanvas(picks.length * PW * T, PH * T + OV);
  sh.ctx.fillStyle = "#5f9a48"; sh.ctx.fillRect(0, 0, picks.length * PW * T, PH * T + OV);
  picks.forEach(([hx, hy], k) => {
    const x0 = hx - 4, y0 = hy - 2, ox = k * PW * T;
    const L = C.townFenceLayout().find((l) => l.hsn.x === hx && l.hsn.y === hy);
    sh.ctx.fillStyle = "#8a7a66";
    sh.ctx.fillRect(ox + (L.imgL - x0) * T, OV + (hy - 3 - y0) * T, (L.imgR - L.imgL) * T, (C.TOWN_HOUSE_H + 3) * T);
    for (let y = y0; y < y0 + PH; y++) for (let x = x0; x < x0 + PW; x++) {
      const i = y * tw.w + x;
      if (tw.ground[i] === C.G_PATH) { sh.ctx.fillStyle = "#9a938a"; sh.ctx.fillRect(ox + (x - x0) * T, OV + (y - y0) * T, T, T); }
    }
    for (let y = y0; y < y0 + PH; y++) for (let x = x0; x < x0 + PW; x++) if (tw.hedge[y * tw.w + x]) A.drawTownHedgeTile(sh.ctx, S, tw, x, y, ox + (x - x0) * T, OV + (y - y0) * T);
    for (const g of tw.gates) if (g.x >= x0 && g.x < x0 + PW && g.y >= y0 && g.y < y0 + PH) A.drawTownGate(sh.ctx, { townEnclos: S.townEnclos }, { ...g, x: g.x - x0 + k * PW, y: g.y - y0 + OV / T }, 0);
  });
  const big = scale(sh.px, picks.length * PW * T, PH * T + OV, 3);
  writePNG(path.join(OUT, "haies-parcelle.png"), big.px, big.W, big.H);
  console.log("         planches : tools/out/haies-styles.png, tools/out/haies-parcelle.png");
}

console.log(fail ? `\n${fail} ÉCHEC(S)\n` : "\nTOUT PASSE\n");
process.exit(fail ? 1 : 0);
