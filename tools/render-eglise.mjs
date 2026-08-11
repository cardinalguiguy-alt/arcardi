/* =============================================================================
   render-eglise.mjs — LA NEF ET LA TRIBUNE, EN PLAN. (zip 441)
   -----------------------------------------------------------------------------
       node tools/render-eglise.mjs

   ⚠️⚠️ IL EXISTE AVANT LE PREMIER `fillRect`, PAS APRÈS. C'est le corollaire du
   §4.2 de CLAUDE.md : « ce dessin est-il regardable par un banc ? » est une
   question de QUALITÉ, et elle se pose avant de dessiner. Les sols du tribunal
   ont vécu douze zips au niveau du 426 uniquement parce qu'aucun banc ne
   pouvait les appeler ; la dalle d'église et le vitrail sont donc nés dans
   `fermeArt.js`, et ce banc les APPELLE — il ne les repeint pas.

   Ce qu'il mesure, en plus de donner à regarder :

     1. LE VAISSEAU EST SYMÉTRIQUE, LES BAS-CÔTÉS NE LE SONT PAS. C'est la
        seule chose qu'on voit en remontant une allée, et un défaut de symétrie
        ne se voit jamais sur l'élément fautif (433, 439). ⚠️ Mais une église a
        UN clocher, UNE chaire, UN confessionnal : mesurer toute la largeur
        échoue à raison de son point de vue et à tort sur le fond. On compare
        donc la travée entre les deux colonnades, on ANNONCE ce qu'on exclut, et
        on vérifie séparément que les deux bas-côtés sont meublés — sinon
        « asymétrique » finirait par vouloir dire « vide d'un côté ».

     2. LE TABLEAU EST HABITÉ SANS ÊTRE ENCOMBRÉ. Le contrôle de DENSITÉ du 439
        (meubles pour cent cases), parce qu'un seuil absolu est faux dès que les
        pièces n'ont pas la même taille — et une nef n'a pas la taille d'un
        bureau.

     3. AUCUN DÉCOR N'A ÉTÉ REFUSÉ NI DÉCALÉ EN SILENCE. `addProp` crie, `place`
        décale sans rien dire : le 439 a perdu la statue de la Justice pendant
        un zip entier parce qu'un avertissement qu'aucun contrôle ne transforme
        en échec est un avertissement qu'on apprend à ne plus lire.

     4. LA TRIBUNE VOIT LA NEF. C'est la raison d'être du second niveau : si la
        bande de vide au nord du garde-corps ne recouvre pas des rangées de nef,
        la tribune est un couloir en bois et le plan a menti.

   ⚠️ CE QU'IL NE MESURE PAS, ET IL LE DIT :
     · IL NE JOUE PAS. L'orgue, les cierges et l'assise passent par la touche E,
       qui vit dans le composant — seuls `verify-vallee` (circulation) et une
       vraie session les voient.
     · IL NE DESSINE PAS LA VUE PLONGEANTE. La nef vue de la tribune est peinte
       par `drawCourtFrame`, c'est-à-dire dans la closure de la boucle de rendu :
       la redessiner ici serait « un banc qui repeint » (439), et il jugerait sa
       propre maquette sur précisément ce qu'on a construit pour être regardé.
       Le contrôle 4 mesure donc ce qui est mesurable — que le vide EXISTE et
       qu'aucun mur ne le bouche — et la planche de la tribune montre un
       plancher nu. ⚠️ CE TROU EST DÉCLARÉ PARCE QU'IL EST GÊNANT : c'est en
       jouant, et là seulement, qu'on voit si la tribune donne sur quelque
       chose. Un trou déclaré vaut mieux qu'un doublon silencieux (440).
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
const K = C.CHURCH, B = C.churchBands();

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

const FLOOR_OF = (key) => C.COURT_FLOORS.findIndex((f) => f.key === key);
const NAVE = FLOOR_OF("church"), LOFT = FLOOR_OF("churchLoft");

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  L'ÉGLISE DE VALLEY TOWN — zip 441                            ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`\nVaisseau x = ${K.x0}…${K.x1} (${K.x1 - K.x0 + 1} cases), axe ${B.axis}, allée ${B.aisle0}…${B.aisle1}.`);

/* ─────────────────────────────────────────────────────────────────────────────
   LES PLANCHES. ⚠️ ON APPELLE LES MÊMES FONCTIONS DE SOL QUE LE JEU, y compris
   la dalle d'église et le vitrail : un banc qui repeint juge sa propre maquette
   (439), et c'est précisément ce qu'on ne veut pas d'un dessin tout neuf.
   ─────────────────────────────────────────────────────────────────────────── */
const FLAT = {
  [C.CT_EXIT]: "#f0e6c4", [C.CT_DOOR]: "#a89880", [C.CT_WALL]: "#5f6068",
  [C.CT_BARS]: "#43444c", [C.CT_VOID]: "#1a1b20",
};
function shot(name, f, k) {
  const y0 = E.courtFloorY0(f), W = C.COURT_FLOOR_W, H = C.COURT_FLOOR_H;
  const sh = makeCanvas(W * T, H * T);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? C.CT_VOID : cw.tile[(y0 + y) * W + x]);
  const car = (x, ay) => { const t = at(x, ay - y0); return t === C.CT_CARPET || t === C.CT_DAIS; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y), px = x * T, py = y * T;
    // ⚠️ Coordonnées ABSOLUES (y0 + y), comme le jeu : le calepinage des dalles
    // est calé sur la carte, pas sur la vignette. Passer `y` donnerait un
    // appareillage juste ici et faux en jeu — le tapis en tartan du 439.
    if (t === C.CT_STONE) A.drawChurchFlagTile(sh.ctx, x, y0 + y, px, py, T, x + 0.5 - B.axis);
    else if (t === C.CT_DAIS) A.drawCourtMarbleTile(sh.ctx, x, y0 + y, px, py, T);
    else if (t === C.CT_WOOD) A.drawCourtWoodTile(sh.ctx, x, y0 + y, px, py, T);
    else if (t === C.CT_CARPET) A.drawCourtCarpetTile(sh.ctx, x, y0 + y, px, py, T, car);
    else if (t === C.CT_MARBLE) A.drawCourtMarbleTile(sh.ctx, x, y0 + y, px, py, T);
    else if (t === C.CT_STAIR_UP || t === C.CT_STAIR_DOWN) {
      sh.ctx.fillStyle = "#b8b4ab"; sh.ctx.fillRect(px, py, T, T);
      for (let s2 = 0; s2 < 4; s2++) {
        sh.ctx.fillStyle = "rgba(255,255,255,0.22)"; sh.ctx.fillRect(px, py + s2 * 4, T, 1);
        sh.ctx.fillStyle = "rgba(58,54,48,0.30)"; sh.ctx.fillRect(px, py + s2 * 4 + 3, T, 1);
      }
    } else { sh.ctx.fillStyle = FLAT[t] || "#ff00ff"; sh.ctx.fillRect(px, py, T, T); }
  }
  // Les murs et les vitraux, après les sols : ils débordent vers le nord.
  const WALL_H = 10;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y); if (t !== C.CT_WALL && t !== C.CT_WINDOW) continue;
    const px = x * T, py = y * T;
    sh.ctx.fillStyle = "#8e8a80"; sh.ctx.fillRect(px, py - WALL_H, T, T + WALL_H);
    sh.ctx.fillStyle = "#a5a196"; sh.ctx.fillRect(px, py - WALL_H, T, 4);
    if (t === C.CT_WINDOW) A.drawChurchGlass(sh.ctx, px, py, WALL_H, T, (x * 3 + (y0 + y)) & 3);
  }
  const q = [];
  for (const p of cw.props) {
    if (p.y < y0 || p.y >= y0 + H) continue;
    const img = S.courtProps[p.kind];
    if (!img) { console.warn(`  ⚠️  sprite manquant : « ${p.kind} »`); continue; }
    q.push({ by: (p.y - y0 + 1) * T, fn: () => sh.ctx.drawImage(img, p.x * T + T / 2 - img.width / 2, (p.y - y0 + 1) * T - img.height) });
  }
  q.sort((a, b) => a.by - b.by);
  for (const e of q) e.fn();
  const up = scale(sh.px, W * T, H * T, k);
  writePNG(path.join(OUT, name + ".png"), up.px, up.W, up.H);
}
shot("eglise-nef", NAVE, 2);
shot("eglise-tribune", LOFT, 2);
console.log("\n→ tools/out/eglise-nef.png · tools/out/eglise-tribune.png\n");

/* ─────────────────────────────────────────────────────────────────────────────
   1. LE VAISSEAU EST SYMÉTRIQUE.
   ⚠️ C'EST LE CONTRÔLE QUI COMPTE LE PLUS ICI, et il ne peut pas se faire à
   l'œil : la rangée fautive est toujours impeccable, c'est son RAPPORT à l'axe
   qui est faux (433, puis 439 sur la maquette de la mairie). L'axe tombe entre
   deux cases, donc le miroir de `x` est `2·axe − 1 − x`.
   ─────────────────────────────────────────────────────────────────────────── */
console.log("=== 1. le VAISSEAU est symétrique, les BAS-CÔTÉS ne le sont pas ===\n");
{
  /* ⚠️⚠️ PREMIÈRE ÉCRITURE DE CE CONTRÔLE : IL COMPARAIT TOUTE LA LARGEUR, ET
     IL ÉCHOUAIT — À RAISON DE SON POINT DE VUE, ET À TORT SUR LE FOND. Il
     signalait la vis du clocher (ouest), la chapelle des cierges (ouest), le
     confessionnal (ouest), la chaire et la niche (est). Or *une église n'est
     pas symétrique* : elle a UN clocher, UNE chaire, UN confessionnal. Ce qui
     doit l'être, c'est son VAISSEAU — la travée entre les deux colonnades,
     celle qu'on remonte et qui porte la perspective.

     ⚠️ ET CE N'EST PAS « SE DONNER UN PÉRIMÈTRE POUR EXCUSER CE QUI DÉBORDE »
     (le défaut nommé au 439). La différence tient en deux points, et ils sont
     tous les deux mesurés plus bas : le périmètre exclu est ANNONCÉ avec son
     étendue, et on vérifie séparément que les deux bas-côtés sont MEUBLÉS —
     sans quoi « asymétrique » finirait par vouloir dire « il n'y a rien d'un
     côté ». Un trou déclaré vaut mieux qu'un doublon silencieux (440). */
  const y0 = E.courtFloorY0(NAVE);
  const mirror = (x) => 2 * B.axis - 1 - x;
  const tileBad = [], propBad = [];
  const propAt = new Map();
  for (const p of cw.props) if (p.y >= y0 && p.y < y0 + C.COURT_FLOOR_H) propAt.set(p.x + "," + p.y, p.kind);
  /* Les moitiés d'un décor à deux cases portent des noms différents
     (`altar` / `altar2`) : c'est leur PAIRE qui est symétrique, pas leur nom.
     On les apparie explicitement plutôt que de les exclure — exclure, c'est ne
     pas mesurer. Idem pour l'ambon et le cierge pascal, qui se répondent. */
  /* ⚠️ ET LE MIROIR D'UN BOUT DE BANC EST L'AUTRE BOUT. Ce contrôle l'a trouvé
     tout seul à la première exécution des variantes `pewL`/`pewR` : c'est
     exactement le service qu'on lui demande, et c'est la preuve qu'il regarde
     le mobilier et pas seulement les cases. */
  const PAIR = {
    altar: "altar2", altar2: "altar", lectern: "paschal", paschal: "lectern",
    pewL: "pewR", pewR: "pewL",
  };
  for (let y = y0; y < y0 + C.COURT_FLOOR_H; y++) {
    for (let x = B.colW; x <= B.axis - 1; x++) {     // colonnade ouest → axe
      const mx = mirror(x);
      if (cw.tile[y * cw.w + x] !== cw.tile[y * cw.w + mx]) tileBad.push(`(${x},${y - y0})`);
      const a = propAt.get(x + "," + y) || "", b = propAt.get(mx + "," + y) || "";
      if (a !== b && PAIR[a] !== b) propBad.push(`(${x},${y - y0}) ${a || "—"} / ${b || "—"}`);
    }
  }
  ok(tileBad.length === 0, "⚠️ le vaisseau est symétrique, case par case",
    tileBad.length ? tileBad.slice(0, 8).join(" ") : `0 case dissymétrique sur ${(B.axis - B.colW) * C.COURT_FLOOR_H} comparées`);
  ok(propBad.length === 0, "⚠️ …et son mobilier aussi",
    propBad.length ? propBad.slice(0, 6).join(" | ") : "0 décor dissymétrique");

  /* CE QUE CE CONTRÔLE NE REGARDE PAS, ET POURQUOI LES DEUX BAS-CÔTÉS SONT
     QUAND MÊME MESURÉS. */
  const side = (x0, x1) => cw.props.filter((p) => p.y >= y0 && p.y < y0 + C.COURT_FLOOR_H && p.x >= x0 && p.x <= x1);
  const w = side(B.sideW0, B.sideW1), e = side(B.sideE0, B.sideE1);
  console.log(`\n  ····   hors mesure : les deux bas-côtés (x ${B.sideW0}…${B.sideW1} et ${B.sideE0}…${B.sideE1}),`);
  console.log(`         parce qu'une église a UN clocher, UNE chaire, UN confessionnal.`);
  ok(w.length >= 3 && e.length >= 3, "⚠️ …mais les DEUX bas-côtés sont meublés",
    `ouest ${w.length} (${[...new Set(w.map((p) => p.kind))].join(" ")}) · est ${e.length} (${[...new Set(e.map((p) => p.kind))].join(" ")})`);
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. LA DENSITÉ (contrôle du 439, transposé).
   ─────────────────────────────────────────────────────────────────────────── */
console.log("\n=== 2. la nef est habitée sans être encombrée ===\n");
{
  for (const [nm, f] of [["nef", NAVE], ["tribune", LOFT]]) {
    const y0 = E.courtFloorY0(f);
    let free = 0;
    for (let y = y0; y < y0 + C.COURT_FLOOR_H; y++) for (let x = 0; x < cw.w; x++) if (!cw.solid[y * cw.w + x]) free++;
    const n = cw.props.filter((p) => p.y >= y0 && p.y < y0 + C.COURT_FLOOR_H).length;
    const d = free ? (100 * n) / (free + n) : 0;
    ok(d >= 8 && d <= 55, `${nm} : densité de mobilier`, `${d.toFixed(1)} meubles / 100 cases (${n} décors, ${free} libres)`);
  }
  const kinds = new Set(cw.props.filter((p) => E.courtFloorOf(p.y) === NAVE || E.courtFloorOf(p.y) === LOFT).map((p) => p.kind));
  ok(kinds.size >= 12, "l'église a son propre vocabulaire de décors", kinds.size + " familles : " + [...kinds].sort().join(" "));
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. AUCUN SPRITE MANQUANT, AUCUN DÉCOR HORS DU VAISSEAU.
   ⚠️ Un `kind` sans sprite sort en ROSE CRIARD dans le jeu (voir le `default`
   de courtPropSprite) — mais seulement si quelqu'un regarde. Ici il échoue.
   ─────────────────────────────────────────────────────────────────────────── */
console.log("\n=== 3. tout ce qui est posé est dessinable et dans le vaisseau ===\n");
{
  const miss = [], out2 = [];
  for (const p of cw.props) {
    const f = E.courtFloorOf(p.y);
    if (f !== NAVE && f !== LOFT) continue;
    if (!S.courtProps[p.kind]) miss.push(p.kind);
    if (p.x < K.x0 || p.x > K.x1) out2.push(`${p.kind}(${p.x},${p.y})`);
  }
  ok(miss.length === 0, "⚠️ chaque décor de l'église a un sprite", miss.length ? [...new Set(miss)].join(" ") : "0 manquant");
  ok(out2.length === 0, "aucun décor hors du vaisseau", out2.length ? out2.join(" ") : "0 hors murs");
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. LA TRIBUNE VOIT LA NEF.
   ⚠️ SANS CE CONTRÔLE, LE SECOND NIVEAU N'A PLUS DE RAISON D'ÊTRE et personne
   ne s'en apercevrait : une tribune fermée par un mur reste parfaitement
   praticable, parfaitement connexe, et parfaitement vide de sens. C'est la
   forme la plus pure du « un banc qui passe mesure autre chose ».
   ─────────────────────────────────────────────────────────────────────────── */
console.log("\n=== 4. la tribune donne bien sur le vide de la nef ===\n");
{
  const ly0 = E.courtFloorY0(LOFT);
  let rail = 0, voidN = 0, wallN = 0;
  for (let x = B.pewW0; x <= B.pewE1; x++) {
    if (cw.props.some((p) => p.kind === "railing" && p.x === x && p.y === ly0 + K.loftY0)) rail++;
    const t = cw.tile[(ly0 + K.loftY0 - 1) * cw.w + x];
    if (t === C.CT_VOID) voidN++;
    if (t === C.CT_WALL) wallN++;
  }
  const span = B.pewE1 - B.pewW0 + 1;
  ok(rail === span, "le garde-corps court sur toute la tribune", `${rail} / ${span} cases`);
  ok(wallN === 0 && voidN === span, "⚠️ …et rien ne bouche la vue au nord",
    `${voidN} case(s) de vide, ${wallN} de mur`);
  const organ = cw.props.filter((p) => (p.kind === "organ" || p.kind === "organWing") && E.courtFloorOf(p.y) === LOFT);
  ok(organ.length === 4, "le buffet d'orgue fait bien quatre cases", organ.length + " case(s)");
  const bench = cw.props.find((p) => p.kind === "organBench" && E.courtFloorOf(p.y) === LOFT);
  ok(!!bench, "il y a un banc d'orgue", bench ? `(${bench.x},${bench.y - ly0})` : "aucun");
  /* ⚠️ ET LE BANC NE DOIT PAS BLOQUER : on monte dessus pour s'y asseoir, comme
     sur les bancs de la ville depuis le 428. Un banc solide est un banc qu'on
     regarde — et rien, à la lecture, ne distingue les deux. */
  ok(bench && !cw.solid[bench.y * cw.w + bench.x], "⚠️ …et on peut monter dessus",
    bench ? (cw.solid[bench.y * cw.w + bench.x] ? "solide (on ne peut pas s'y asseoir)" : "praticable") : "—");
}

console.log(fail === 0 ? "\n✅ Tous les contrôles passent.\n" : `\n❌ ${fail} contrôle(s) en échec.\n`);
process.exit(fail === 0 ? 0 : 1);
