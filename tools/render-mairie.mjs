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

/* ⚠️⚠️ ZIP 439 — LES SOLS NE SONT PLUS RECOPIÉS, ILS SONT APPELÉS. Le 438 les
   repeignait ici en aplats, avec ce commentaire : « ils vivent dans la closure
   de drawCourtFrame […] le jour où l'intérieur sortira de la closure, ces douze
   lignes disparaîtront ». C'est fait — `drawCourtWoodTile` & co. sont dans
   `fermeArt.js`, ce banc appelle EXACTEMENT ce que le jeu appelle, et un
   parquet qui se dégrade se verra désormais ici.
   ⚠️ Tant qu'un banc REPEINT au lieu d'appeler, il ne juge pas le jeu : il juge
   sa propre maquette, et il continue de la trouver bonne pendant que le jeu
   pourrit. C'est la moitié invisible du §4 de CLAUDE.md. */
const FLAT = {
  [C.CT_EXIT]: "#f0e6c4", [C.CT_DOOR]: "#a89880", [C.CT_WALL]: "#5f6068",
  [C.CT_WINDOW]: "#8fb6cf", [C.CT_BARS]: "#43444c", [C.CT_VOID]: "#23242a",
};
function shot(name, f, k) {
  const y0 = E.courtFloorY0(f), W = C.COURT_FLOOR_W, H = C.COURT_FLOOR_H;
  const sh = makeCanvas(W * T, H * T);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? C.CT_VOID : cw.tile[(y0 + y) * W + x]);
  /* ⚠️ `car` PREND UN y ABSOLU, parce que c'est ce que reçoit la fonction de
     dessin. Premier jet : elle prenait le y LOCAL de la vignette, donc chaque
     test de voisinage tombait hors du niveau, donc `isCarpet` répondait « non »
     partout — et la bordure dorée, qui ne doit cerner que le POURTOUR du tapis,
     se dessinait sur les quatre côtés de CHAQUE case. Un tapis en tartan.
     Le jeu, lui, était juste : il passe des coordonnées absolues des deux côtés.
     C'est le stub menteur du §10, dans l'outil censé nous en protéger. */
  const car = (x, ay) => { const t = at(x, ay - y0); return t === C.CT_CARPET || t === C.CT_DAIS; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y), px = x * T, py = y * T;
    // ⚠️ On passe les coordonnées ABSOLUES (y0 + y) aux fonctions de sol : les
    // lames, les dalles et le calepinage sont calés sur la carte, pas sur la
    // vignette. Passer y ferait un parquet juste ici et faux en jeu.
    if (t === C.CT_MARBLE) A.drawCourtMarbleTile(sh.ctx, x, y0 + y, px, py, T);
    else if (t === C.CT_WOOD || t === C.CT_DAIS) A.drawCourtWoodTile(sh.ctx, x, y0 + y, px, py, T);
    else if (t === C.CT_CARPET) A.drawCourtCarpetTile(sh.ctx, x, y0 + y, px, py, T, car);
    else if (t === C.CT_STONE) A.drawCourtStoneTile(sh.ctx, x, y0 + y, px, py, T);
    else if (t === C.CT_STAIR_UP || t === C.CT_STAIR_DOWN) {
      sh.ctx.fillStyle = "#b8b4ab"; sh.ctx.fillRect(px, py, T, T);
      for (let s = 0; s < 4; s++) {
        sh.ctx.fillStyle = "rgba(255,255,255,0.22)"; sh.ctx.fillRect(px, py + s * 4, T, 1);
        sh.ctx.fillStyle = "rgba(58,54,48,0.30)"; sh.ctx.fillRect(px, py + s * 4 + 3, T, 1);
      }
    } else { sh.ctx.fillStyle = FLAT[t] || "#ff00ff"; sh.ctx.fillRect(px, py, T, T); }
    if (t === C.CT_WALL) { sh.ctx.fillStyle = "#787a84"; sh.ctx.fillRect(px, py, T, 3); }
  }
  const q = [];
  for (const p of cw.props) {
    if (p.y < y0 || p.y >= y0 + H) continue;
    const img = S.courtProps[p.kind]; if (!img) continue;
    q.push({ by: (p.y - y0 + 1) * T, fn: () => sh.ctx.drawImage(img, p.x * T + T / 2 - img.width / 2, (p.y - y0 + 1) * T - img.height) });
  }
  /* ⚠️ 439 — LES PLAQUES DE PORTE SONT DESSINÉES, ET ELLES MANQUAIENT. Elles
     sont « le mode d'emploi du bâtiment » d'après le commentaire qui les pose ;
     un banc qui juge la lisibilité d'un intérieur sans elles juge un plan de
     masse. On ne peut pas écrire le libellé (le faux canvas n'a pas `fillText`,
     §4), donc on peint le CARTOUCHE : sa présence et sa place se vérifient,
     et c'est ce qui manquait. */
  for (const d of cw.doors) {
    if (d.floor !== f) continue;
    const px = d.x * T, py = (d.y - y0) * T;
    q.push({ by: (d.y - y0 + 0.6) * T, fn: () => {
      sh.ctx.fillStyle = "#5a4230"; sh.ctx.fillRect(px - 1, py - 14, T + 2, 14);
      sh.ctx.fillStyle = "#3a2a1c"; sh.ctx.fillRect(px + 1, py - 11, T - 2, 11);
      sh.ctx.fillStyle = "#f5eeda"; sh.ctx.fillRect(px - 6, py - 24, T + 12, 11);
      sh.ctx.fillStyle = "#6b4a2e"; sh.ctx.fillRect(px - 6, py - 24, T + 12, 1); sh.ctx.fillRect(px - 6, py - 14, T + 12, 1);
    } });
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
    /* ⚠️⚠️ ZIP 439 — ON MESURE UNE DENSITÉ, PLUS UN COMPTE. Le seuil du 438
       était `n < 6` : le bureau du géomètre, dix-sept cases sur treize, passait
       avec HUIT meubles — deux de marge — à côté des quatre-vingts des
       archives. Un rapport de dix à un entre la pièce la plus dense et la plus
       vide, et un contrôle au vert, pendant qu'une des huit pièces lisait comme
       une grange. *Un seuil absolu sur une grandeur qui dépend de la taille de
       la pièce est faux dès que les pièces n'ont pas la même taille* — c'est le
       seuil du taxi au 434, transposé au mobilier. */
    const area = (r.w - 2) * (r.h - 2);
    const dens = n / area * 100;
    counts.push(r.key + " " + n + " (" + dens.toFixed(0) + "%)");
    if (dens < 8) empty.push(r.key + " " + dens.toFixed(0) + "%");
  }
  console.log("        " + counts.join(" · "));
  ok(empty.length === 0, "⚠️ aucune pièce de la mairie n'est clairsemée (≥ 8 meubles / 100 cases)",
     empty.length ? empty.join(", ") : rooms.length + " pièces meublées");
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
  /* ⚠️⚠️⚠️ ZIP 439 — ON COMPTE LES REFUS DE TOUT LE BÂTIMENT, PLUS SEULEMENT
     CEUX DE LA MAIRIE, ET C'EST UNE CORRECTION DE BANC PAYÉE CHER. Le 438
     filtrait les refus sur les deux niveaux de l'hôtel de ville, puis imprimait
     fièrement « 0 refus (le tribunal en garde 10, ANTÉRIEURS) ». Ils ne
     l'étaient pas : cinq des dix venaient d'être créés par l'escalier d'honneur
     que le 438 ajoutait — dont la STATUE DE LA JUSTICE, le point de fuite du
     hall du tribunal, effacée en silence pendant tout un zip.
     ⚠️ La leçon n'est pas « le filtre était trop étroit ». C'est qu'un banc qui
     se donne un PÉRIMÈTRE finit par exclure de sa mesure les dégâts qu'il cause
     à côté — et qu'il les qualifie d'« antérieurs » sans jamais l'avoir
     vérifié. Un chiffre qu'on excuse dans son propre rapport est un chiffre
     qu'on ne regarde plus. */
  ok(seen.length === 0, "⚠️ aucun meuble refusé dans TOUT le bâtiment",
     seen.length ? seen.join(" | ") : "0 refus (tribunal ET mairie)");
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
  /* ⚠️⚠️⚠️ ZIP 439 — ON REJOUE `nearCourtExit`, ET C'EST LE CONTRÔLE QUI
     MANQUAIT. Le 438 vérifiait ici que la tuile du seuil est bien un CT_EXIT —
     et elle l'était, dans les deux bâtiments, 9 cases sur 9. Pendant ce temps
     la touche E ne proposait jamais de sortir de la mairie, parce que le
     prédicat du composant testait `courtFloorOf(y) === 0` avec le seuil du
     tribunal en dur. **Le banc mesurait la carte, le joueur se heurtait à
     l'interaction.** On balaie donc toutes les positions autour de chaque
     seuil, avec la formule EXACTE du jeu, et on exige qu'il en existe au moins
     une où l'invite se déclenche.
     ⚠️ C'est une recopie du prédicat, et elle est assumée : elle est écrite à
     partir de `E.courtExitPos`, qui est la source unique depuis ce zip. Ce que
     le banc vérifie, c'est qu'aucune des deux extrémités n'a de cas
     particulier — pas que la formule est jolie. */
  for (const [key, b] of Object.entries(C.COURT_BUILDINGS)) {
    const ex = E.courtExitPos(E.courtFloorY0(b.ground) + b.spawn.y);
    let hits = 0;
    for (let dx = -3; dx <= 3; dx += 0.25) for (let dy = -3; dy <= 1; dy += 0.25) {
      const x = ex.x + 0.5 + dx, y = ex.y + dy;
      if (E.courtFloorOf(y + 0.2) !== ex.floor) continue;
      if (Math.abs(x - (ex.x + 0.5)) <= 1.8 && Math.abs(y - ex.y) <= 2.2) hits++;
    }
    ok(hits > 0, `⚠️ on peut RESSORTIR de « ${key} » (touche E)`, hits + " position(s) où l'invite se déclenche");
  }
}

for (const f of C.COURT_BUILDINGS.hall.floors) {
  shot("mairie-" + C.COURT_FLOORS[f].key, f, 2);
}
shot("tribunal-plan-rdc", 0, 2);

console.log("\nImages : tools/out/mairie-hall.png, mairie-hallUp.png, tribunal-plan-rdc.png\n");
console.log(fail ? fail + " CONTRÔLE(S) EN ÉCHEC\n" : "Tout est bon.\n");
process.exit(fail ? 1 : 0);
