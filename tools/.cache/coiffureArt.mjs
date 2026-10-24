/* ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   ║ coiffureArt.js — LES COUPES, LES COULEURS ET LES BARBES DU SALON DE COIFFURE (2026-10-21).
   ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Catalogue : `C.HAIR_CUTS`, `C.HAIR_DYES`, `C.BEARDS` (fermeConstants.js). L'état d'un joueur voyage dans la chaîne `look` : `^` +
   coupe + couleur + barbe, base 36 (`C.hairLook` fabrique, `lookHair` ci-dessous relit — une seule de chaque).
   ⚠️ LA COUPE D'ORIGINE N'EST PAS ICI : « Longs lissés » et « Court » sont les rectangles de `drawCharFrame` (fermeArt.js), gardés au pixel
   près — un joueur qui ne passe pas au salon ne doit pas changer de tête. Seule leur COULEUR peut changer (la teinture).
   COMMENT C'EST PEINT : comme les vêtements (`garderobeArt.js`, DESSIN.md) — une lettre de ton par pixel (`o` creux, `d` ombre, `m` base,
   `l` lumière, `h` reflet), le reflet en haut à gauche (la lumière du projet), des motifs par paires de pixels (boucles, tresse), jamais au
   hasard. La rampe vient de la couleur (`wardrobeRamp`). Les mèches longues suivent le pas (`sway`).
   ⚠️ LE CADRE : 16 × 24, la tête en x 4..11, y 2..9 ; un seul pixel au-dessus. Les « Folies » s'étendent sur les CÔTÉS ou vers le BAS.
   ⚠️ CE QUI TOMBE SUR LES ÉPAULES (y ≥ 9) SE REPEINT APRÈS LES VÊTEMENTS (`minY`), sinon un col ou une écharpe couperait la tresse. */
import * as C from "./fermeConstants.mjs";
import { wardrobeRamp } from "./garderobeArt.mjs";

// [y, rangée] par direction (0 face, 1 dos, 2 profil droit) ; `sway` : à partir de quelle rangée la mèche suit le pas
const CUTS = {
  bob: {
    0: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhmmmmmmdd..."], [4, "...lm......do..."], [5, "...lm......do..."],
        [6, "...lm......do..."], [7, "...mm......dd..."], [8, "...mdd....ddo..."]],
    1: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhllmmmdd..."], [4, "...lhllmmmmdd..."], [5, "...lhllmmmmdd..."],
        [6, "...llmmmmmmdd..."], [7, "...lmmmmmmmdd..."], [8, "...ddddddddoo..."]],
    2: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhllmmmdd..."], [4, "...lhhlmd......."], [5, "...lhllmd......."],
        [6, "...lllmmd......."], [7, "...lmmmdd......."], [8, "...ddddoo......."]],
  },
  ponytail: {
    0: [[1, "....lhhhllmd...."], [2, "...lhhllllmdd..."], [3, "...lm......ddm.."], [4, "...l........dm.."], [5, ".............d.."],
        [6, ".............d.."], [7, ".............o.."]],
    1: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhllmmmdd..."], [4, "...llhlrRmmdd..."], [5, "...llhlmmmmdd..."],
        [6, "...lllmmmmmdd..."], [7, "....lmmmmmmd...."], [8, "....dddlmddd...."], [9, ".......lm......."], [10, ".......lm......."],
        [11, ".......md......."], [12, ".......d........"]],
    2: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "..mRlhhlmmd....."], [4, ".lmrlhlmmd......"], [5, ".lm.lllmd......."],
        [6, ".lm..lmmd......."], [7, ".md..ddd........"], [8, ".md............."], [9, "..d............."]],
    sway: { 1: 9, 2: 6 },
  },
  bun: {
    0: [[0, "......lhhd......"], [1, "....lhhlllmd...."], [2, "...lhhllllmmd..."], [3, "...lm......dd..."], [4, "...l........d..."]],
    1: [[1, "....lhhhllmd...."], [2, "...lhhlhhlmdd..."], [3, "...lhlhhllmdd..."], [4, "...lmlllmmmdd..."], [5, "...lmmddmmddd..."],
        [6, "....lmmmmmdd...."], [7, "....ddddddoo...."]],
    // de profil, le chignon est une boule à l'arrière du crâne (x 0..3), pas une visière
    2: [[1, ".lh.lhhhllmd...."], [2, "lhhmlhhllmmd...."], [3, "lmmdlhllmmd....."], [4, ".dd.lllmd......."], [5, "....llmd........"],
        [6, "....lmmd........"], [7, "....ddd........."]],
  },
  buzz: {
    0: [[1, "....lllmmmmd...."], [2, "...dmmmmmmmdo..."], [3, "...d........o..."]],
    1: [[1, "....lllmmmmd...."], [2, "...dlmmmmmmdo..."], [3, "...dlmmmmmmdo..."], [4, "...dlmmmmmmdo..."], [5, "...dlmmmmmmdo..."],
        [6, "....dmmmmmdo...."]],
    2: [[1, "....lllmmmd....."], [2, "...dlmmmmmd....."], [3, "...dlmmmd......."], [4, "...dmmmd........"], [5, "...dmmmd........"],
        [6, "....ddo........."]],
  },
  curly: {
    0: [[0, ".....lh.lh......"], [1, "...lhhlhhllmd..."], [2, "..lhllhllmmmdd.."], [3, "..lml.mm.mmddo.."], [4, "..lm........do.."],
        [5, "..ld........do.."], [6, "...d........d..."]],
    1: [[0, ".....lh.lh.md..."], [1, "...lhhlhhllmd..."], [2, "..lhllhllmmmdd.."], [3, "..lhlmmlmmmddo.."], [4, "..lmllmmlmmddo.."],
        [5, "..lmmmmmmmddo..."], [6, "...dmddmddddo..."]],
    2: [[0, "....lh.lh......."], [1, "..lhhlhhllmd...."], [2, ".lhllhllmmmdd..."], [3, ".lmllmlmmdd....."], [4, ".lmlmmmdd......."],
        [5, "..lmmmddd......."], [6, "...dmddd........"]],
  },
  side: {
    // la raie est un creux sombre (o), pas un trou : la silhouette reste pleine
    0: [[1, "....mdolhhhllm.."], [2, "...lmdllhhhlmd.."], [3, "...lm....llmdd.."], [4, "...l........d..."]],
    1: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhllmmmdd..."], [4, "...lllmmmmmdd..."], [5, "....dddddddd...."]],
    2: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhlmmddd...."], [4, "...lhlmd........"], [5, "...dddd........."]],
  },
  macarons: {
    0: [[1, "....lhhdlhmd...."], [2, ".lhlhhhdlmmddlm."], [3, "lhhmm......ddmmd"], [4, "lhlm........dmdo"], [5, "lhmd........mmdo"],
        [6, "lmmd........mddo"], [7, "mmdd........ddoo"], [8, ".dd..........oo."]],
    1: [[1, "....lhhdlhmd...."], [2, ".lhlhhhdlmmddlm."], [3, "lhhmlhhdlmmddmmd"], [4, "lhlmlhldlmmddmdo"], [5, "lhmdllmdmmmddmdo"],
        [6, "lmmdlmmdmmddmddo"], [7, "mmdd.dddddd.ddoo"], [8, ".dd..........oo."]],
    2: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhlhhmmd....."], [4, "..lhhhhlmmd....."], [5, "..lhhllmmdd....."],
        [6, "..lhlmmmddd....."], [7, "..lmmmddddo....."], [8, "...ddddoo......."]],
  },
  braids: {
    0: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lm......dd..."], [4, "...lm......dd..."], [5, "...lm......dd..."],
        [6, "...lm......dd..."], [7, "...lm......dd..."], [8, "..lm........do.."]],
    1: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhllmmmdd..."], [4, "...lhhllmmmdd..."], [5, "...lhllmmmmdd..."],
        [6, "...llmmmmmmdd..."], [7, "....lmm..mmd...."], [8, ".....lm..md....."]],
    2: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhllmmd....."], [4, "...lhllmd......."], [5, "...lhlmd........"],
        [6, "...lmmd........."], [7, "...lmd.........."]],
    // les deux tresses : un motif de deux pixels qui croise d'une rangée à l'autre, un ruban, une houppe
    braid: { 0: [2, 12], 1: [5, 9], 2: [3] }, sway: { 0: 14, 1: 14, 2: 12 },
  },
  mullet: {
    0: [[1, "...lhhhllmmd...."], [2, "...lhhhllmmdd..."], [3, "...lhm.....ddd.."], [4, "...l........d..."], [5, "...l........d..."],
        [8, "...m........d..."], [9, "..lm........do.."], [10, "..lm........do.."], [11, "...m........d..."]],
    1: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhllmmmdd..."], [4, "...lhhllmmmdd..."], [5, "...lhhllmmmdd..."],
        [6, "...lhlllmmmdd..."], [7, "...lmmlmmmmdd..."], [8, "...lmlmmmmmdd..."], [9, "..lhmlmmmmmddo.."], [10, "..lmmmmmmmmddo.."],
        [11, "..lmmdmmdmmddo.."], [12, "...dd..dd..do..."]],
    2: [[1, "....lhhhllmd...."], [2, "...lhhhllmmdd..."], [3, "...lhhlmmdd....."], [4, "...lhlmmd......."], [5, "..lhlmmd........"],
        [6, "..lhlmd........."], [7, "..lmlmd........."], [8, "..lmmdd........."], [9, ".lmmdd.........."], [10, ".lmdd..........."],
        [11, ".ddo............"]],
    sway: { 1: 10, 2: 9 },
  },
};
// les barbes : face et profil (de dos, on ne les voit pas)
const BEARD_ROWS = {
  moustache: { 0: [[7, ".....dmmmmd....."]], 2: [[7, "..........dd...."]] },
  goatee: { 0: [[7, "......mmmm......"], [9, "......dmmd......"], [10, ".......dd......."]],
            2: [[8, "...........d...."], [9, "..........dd...."], [10, "..........d....."]] },
  short: { 0: [[6, "....d......d...."], [7, "....dmmmmmmd...."], [8, "....dd....dd...."], [9, "....dmmmmmmd...."]],
           2: [[6, "........d......."], [7, "........dm......"], [8, "........dmmd...."], [9, ".........dmd...."]] },
  full: { 0: [[5, "....d......d...."], [6, "....md....dm...."], [7, "....mmmmmmmm...."], [8, "....mm....mm...."], [9, "....lmmmmmmd...."],
              [10, ".....dmmmmd....."], [11, "......dddd......"]],
          2: [[5, "........d......."], [6, "........dd......"], [7, "........dmmd...."], [8, "........dmmmd..."], [9, "........dmmmd..."],
              [10, ".........ddd...."]] },
};

/* La chaîne `look` → { c, d, b } (indices des trois catalogues), ou null. Tout indice hors catalogue vaut 0 : une coupe retirée un
   jour ne doit pas faire planter le dessin d'un joueur qui la portait. */
export function lookHair(look) {
  const i = typeof look === "string" ? look.indexOf("^") : -1;
  if (i < 0) return null;
  const n = (k, max) => { const v = parseInt(look.charAt(i + 1 + k) || "0", 36); return v > 0 && v < max ? v : 0; };
  const h = { c: n(0, C.HAIR_CUTS.length), d: n(1, C.HAIR_DYES.length), b: n(2, C.BEARDS.length) };
  return h.c || h.d || h.b ? h : null;
}

function paintRows(g, P, x, rows, pal, bob, minY, dx = 0, swayY = 99) {
  for (const [y, s] of rows) {
    if (y < minY) continue;
    const yy = y + bob;
    if (yy > 23) continue;
    const sh = y >= swayY ? dx : 0;
    for (let k = 0; k < 16; k++) {
      const c = s[k];
      if (c === "." || !pal[c]) continue;
      const xx = k + sh;
      if (xx >= 0 && xx < 16) P(g, x + xx, yy, 1, 1, pal[c]);
    }
  }
}

/* Une coupe du catalogue (pas celles d'origine). `o` : { cut (id), col, dir, bob, step, minY } — `minY` 9 : la seule part qui retombe
   sur les épaules, repeinte après les vêtements. */
export function paintHair(g, P, x, o) {
  const cut = CUTS[o.cut];
  if (!cut) return;
  const R = wardrobeRamp(o.col), pal = { ...R, r: "#d94f6e", R: "#9a2a44" };
  const dir = o.dir, minY = o.minY | 0, bob = o.bob | 0;
  const dx = dir === 2 ? -(o.step | 0) : (o.step | 0);
  const swayY = cut.sway && cut.sway[dir] != null ? cut.sway[dir] : 99;
  paintRows(g, P, x, cut[dir] || [], pal, bob, minY, dx, swayY);
  if (cut.braid) {
    // les tresses : de y 8 (face) / 7 (dos) / 6 (profil) jusqu'au sol ; un croisement tous les deux pixels, le ruban, la houppe
    const y0 = dir === 0 ? 8 : dir === 1 ? 7 : 6;
    for (const bx of cut.braid[dir] || []) {
      for (let y = y0; y <= 23; y++) {
        if (y < minY) continue;
        const yy = y + bob;
        if (yy > 23) continue;
        const sh = y >= swayY ? dx : 0, cross = (y - y0) % 2 === 0;
        const tie = y === 20, tuft = y >= 21;
        const a = tie ? pal.r : tuft ? R.m : cross ? R.l : R.m, b = tie ? pal.R : tuft ? R.d : cross ? R.d : R.o;
        P(g, x + bx + sh, yy, 1, 1, a); P(g, x + bx + 1 + sh, yy, 1, 1, b);
      }
    }
  }
}

// La barbe, dans la couleur des cheveux (un cran plus sombre pour la lire sur la peau).
export function paintBeard(g, P, x, o) {
  const B = C.BEARDS[o.beard];
  const rows = B && BEARD_ROWS[B.id] && BEARD_ROWS[B.id][o.dir];
  if (!rows) return;
  const R = wardrobeRamp(o.col);
  paintRows(g, P, x, rows, { l: R.m, m: R.d, d: R.o, o: R.o }, o.bob | 0, o.minY | 0);
}

/* 2026-10-23 — LES RANGÉES SEULES, pour le 32 × 48 (`persoHdArt.js`) : il les agrandit (Scale2x) au lieu de recopier le dessin. Une coupe :
   { rows, sway, braid } dans une direction ; une barbe : ses rangées (null de dos). Une seule source pour les deux définitions. */
export function hairCutRows(id, dir) {
  const cut = CUTS[id];
  if (!cut) return null;
  return { rows: cut[dir] || [], sway: cut.sway && cut.sway[dir] != null ? cut.sway[dir] : null, braid: cut.braid ? cut.braid[dir] || [] : null };
}
export function beardRows(id, dir) { return (BEARD_ROWS[id] && BEARD_ROWS[id][dir]) || null; }
