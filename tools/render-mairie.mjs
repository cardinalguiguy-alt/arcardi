/* =============================================================================
   render-mairie.mjs — L'INTÉRIEUR DE L'HÔTEL DE VILLE, EN PLAN. (438)
   -----------------------------------------------------------------------------
   ⚠️ IL EXISTE PARCE QU'UN INTÉRIEUR NE SE VÉRIFIE PAS EN LE LISANT. Le
   tribunal du 426 a livré SIX PIÈCES INACCESSIBLES sur dix-sept — une colonne
   posée devant une porte, écrites à cent lignes l'une de l'autre — et personne
   ne l'avait vu à la relecture. `verify-vallee.mjs` mesure la circulation ;
   celui-ci DESSINE le plan, parce que « la salle des mariages a-t-elle l'air
   d'une salle des mariages ? » n'est pas une question de connexité.

   Ce qu'il contrôle en plus du dessin :

     1. CHAQUE PIÈCE EST MEUBLÉE. Une pièce vide dans un bâtiment public se lit
        comme une pièce oubliée. On compte les meubles par pièce.

     2. AUCUN MEUBLE NE BOUCHE UNE PORTE NI UN ESCALIER. Le générateur refuse
        et le DIT (voir doorGuard), mais un refus est une pièce appauvrie : on
        veut zéro refus, pas des refus bien signalés.

     3. LES DEUX BÂTIMENTS NE SE RESSEMBLENT PAS. C'est la demande de fond :
        « le même degré de détail que le courthouse », pas le même bâtiment. On
        mesure donc la part de meubles que la mairie NE partage PAS avec le
        tribunal — à zéro, on a dessiné deux fois le même couloir.

   Usage :  node tools/render-mairie.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine;
const S = A.buildSprites();
const T = 16;
const cw = E.generateCourtWorld();

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

/* ⚠️ LES SOLS SONT PEINTS ICI ET NON APPELÉS : ils vivent dans la closure de
   `drawCourtFrame`, comme tout le rendu d'intérieur. C'est une recopie, elle
   est assumée et elle est SIGNALÉE — ce banc juge le PLAN et le MOBILIER, qui
   eux sont de vraies données (`cw.tile`, `cw.props`) et de vrais sprites. Le
   jour où l'intérieur sortira de la closure, ces douze lignes disparaîtront. */
const FLOOR_COL = {
  [C.CT_MARBLE]: "#cdc9bd", [C.CT_WOOD]: "#9b7448", [C.CT_CARPET]: "#7a3f46",
  [C.CT_STONE]: "#8d8981", [C.CT_DAIS]: "#a3794c", [C.CT_EXIT]: "#f0e6c4",
  [C.CT_DOOR]: "#a89880", [C.CT_WALL]: "#5f6068", [C.CT_WINDOW]: "#8fb6cf",
  [C.CT_BARS]: "#43444c", [C.CT_STAIR_UP]: "#b8b4ab", [C.CT_STAIR_DOWN]: "#9a968e",
  [C.CT_VOID]: "#23242a",
};
function shot(name, f, k) {
  const y0 = E.courtFloorY0(f), W = C.COURT_FLOOR_W, H = C.COURT_FLOOR_H;
  const sh = makeCanvas(W * T, H * T);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = cw.tile[(y0 + y) * W + x];
    sh.ctx.fillStyle = FLOOR_COL[t] || "#ff00ff";
    sh.ctx.fillRect(x * T, y * T, T, T);
    if (t === C.CT_WALL) { sh.ctx.fillStyle = "#787a84"; sh.ctx.fillRect(x * T, y * T, T, 3); }
    if (t === C.CT_WOOD) { sh.ctx.fillStyle = "rgba(60,40,24,0.22)"; sh.ctx.fillRect(x * T, y * T + T - 2, T, 2); }
  }
  const q = [];
  for (const p of cw.props) {
    if (p.y < y0 || p.y >= y0 + H) continue;
    const img = S.courtProps[p.kind]; if (!img) continue;
    q.push({ by: (p.y - y0 + 1) * T, fn: () => sh.ctx.drawImage(img, p.x * T + T / 2 - img.width / 2, (p.y - y0 + 1) * T - img.height) });
  }
  q.sort((a, b) => a.by - b.by);
  for (const e of q) e.fn();
  const up = scale(sh.px, W * T, H * T, k);
  writePNG(path.join(OUT, name + ".png"), up.px, up.W, up.H);
}

console.log("\n=== 1. chaque pièce de la mairie est meublée ===\n");
{
  const hallFloors = C.COURT_BUILDINGS.hall.floors;
  const rooms = C.COURT_ROOMS.filter(r => hallFloors.includes(r.floor));
  const empty = [];
  const counts = [];
  for (const r of rooms) {
    const y0 = E.courtFloorY0(r.floor);
    const n = cw.props.filter(p => p.x > r.x && p.x < r.x + r.w - 1 && p.y > y0 + r.y && p.y < y0 + r.y + r.h - 1).length;
    counts.push(r.key + " " + n);
    if (n < 6) empty.push(r.key + " (" + n + ")");
  }
  console.log("        " + counts.join(" · "));
  ok(empty.length === 0, "aucune pièce de la mairie n'est nue", empty.length ? empty.join(", ") : rooms.length + " pièces meublées");
}

console.log("\n=== 2. aucun meuble refusé (porte, escalier, seuil) ===\n");
{
  /* Le générateur crie sur la console quand il refuse : on le rejoue en
     interceptant `console.warn`, ce qui est la seule façon de compter des
     refus sans dupliquer la règle. */
  const seen = [];
  const orig = console.warn;
  console.warn = (msg) => { if (String(msg).includes("TRIBUNAL")) seen.push(String(msg)); };
  E.generateCourtWorld();
  console.warn = orig;
  const hallFloors = C.COURT_BUILDINGS.hall.floors;
  const y0 = E.courtFloorY0(hallFloors[0]), y1 = E.courtFloorY0(hallFloors[hallFloors.length - 1]) + C.COURT_FLOOR_H;
  const mine = seen.filter(m => {
    const g = /\((\d+),(\d+)\)/.exec(m);
    return g && +g[2] >= y0 && +g[2] < y1;
  });
  ok(mine.length === 0, "aucun meuble de la mairie n'a été refusé", mine.length ? mine.join(" | ") : "0 refus (le tribunal en garde " + (seen.length) + ", antérieurs)");
}

console.log("\n=== 3. la mairie ne ressemble pas au tribunal ===\n");
{
  const kindsOf = (floors) => {
    const set = new Set();
    for (const p of cw.props) {
      const f = E.courtFloorOf(p.y);
      if (floors.includes(f)) set.add(p.kind);
    }
    return set;
  };
  const hall = kindsOf(C.COURT_BUILDINGS.hall.floors);
  const court = kindsOf(C.COURT_BUILDINGS.court.floors);
  const own = [...hall].filter(k => !court.has(k));
  console.log("        mairie : " + [...hall].join(", "));
  console.log("        propres à la mairie : " + own.join(", "));
  ok(own.length >= 6, "la mairie a son propre mobilier", own.length + " meuble(s) qu'on ne voit pas au tribunal");
  ok(hall.size >= 12, "et de quoi meubler huit pièces", hall.size + " types");
}

console.log("\n=== 4. on entre et on ressort ===\n");
{
  for (const [k, b] of Object.entries(C.COURT_BUILDINGS)) {
    const y0 = E.courtFloorY0(b.ground);
    const t1 = cw.tile[(y0 + b.entry.y) * C.COURT_FLOOR_W + b.entry.x];
    const t2 = cw.tile[(y0 + b.entry.y) * C.COURT_FLOOR_W + b.entry.x + 1];
    ok(t1 === C.CT_EXIT && t2 === C.CT_EXIT, "le seuil de « " + k + " » est bien une sortie", "cases " + t1 + "/" + t2);
    const sy = Math.floor(y0 + b.spawn.y), sx = Math.floor(b.spawn.x);
    ok(!cw.solid[sy * C.COURT_FLOOR_W + sx], "on n'arrive pas dans un mur en entrant à « " + k + " »", "(" + sx + "," + sy + ")");
  }
  const boards = cw.props.filter(p => p.kind === "priceBoard").length;
  ok(boards >= 2, "le tableau des cours est affiché", boards + " tableau(x)");
}

for (const f of C.COURT_BUILDINGS.hall.floors) {
  shot("mairie-" + C.COURT_FLOORS[f].key, f, 2);
}
shot("tribunal-plan-rdc", 0, 2);

console.log("\nImages : tools/out/mairie-hall.png, mairie-hallUp.png, tribunal-plan-rdc.png\n");
console.log(fail ? fail + " CONTRÔLE(S) EN ÉCHEC\n" : "Tout est bon.\n");
process.exit(fail ? 1 : 0);
