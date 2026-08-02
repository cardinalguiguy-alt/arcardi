/* =============================================================================
   verify-orchards.mjs — LES VERGERS TIENNENT-ILS LEURS PROMESSES ? (zip 398)
   -----------------------------------------------------------------------------
   Un verger est un INVESTISSEMENT : cher, lent, et rentable seulement à la
   longue. Trois nombres décident de tout — le prix du plant, la durée de
   maturité, la période de production — et aucun des trois ne se juge à l'œil.

   ⚠️ CE SCRIPT NE RELIT PAS LES CONSTANTES, IL FAIT TOURNER LE MOTEUR. Il
   plante un verger, avance l'horloge sur plusieurs jours simulés en appelant
   `E.orchardTick` comme le fait l'hôte, cueille quand il y a à cueillir, et
   COMPTE. C'est la même discipline que `simulate-maze.mjs` au labyrinthe :
   l'outil ne simule pas le jeu, il le JOUE.

   La différence est concrète. Un contrôle qui recalculerait le rendement à
   partir de `yieldMin`/`yieldMax`/`cycleMs` vérifierait sa propre copie de la
   formule (leçon du zip 387, et corollaire du 394) ; celui-ci verrait, par
   exemple, qu'un myrtillier ne produit pas l'hiver — ce qu'aucune
   multiplication ne dit.
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine"]);
const C = mods.fermeConstants, E = mods.fermeEngine;

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

console.log("\n=== les vergers (zip 398) ===\n");

/* --------------------------------------------------------------------------
   1. LE RENDEMENT, MESURÉ SUR SEPT JOURS RÉELS.
   -------------------------------------------------------------------------- */
const H = 3600 * 1000;
console.log("espèce         plant   maturité  cycle   cueillettes/7j  fruits  or/7j   seuil");
console.log("-".repeat(84));

for (let k = 0; k < C.ORCHARDS.length; k++) {
  const spec = C.ORCHARDS[k];
  const fruit = C.fruitSpec(spec.fruit);
  const t0 = 1;                                  // instant de plantation
  const o = { k, plantedAt: t0, nextAt: 0, ripe: 0 };
  let picks = 0, fruits = 0;
  // On avance par pas de 15 minutes simulées, sur sept jours, EN SAISON.
  const season = spec.seasons[0];
  for (let t = t0; t < t0 + 7 * 24 * H; t += 15 * 60 * 1000) {
    E.orchardTick(o, t, season);
    if ((o.ripe | 0) > 0) { picks++; fruits += o.ripe; o.ripe = 0; o.nextAt = t + spec.cycleMs; }
  }
  const gold = fruits * fruit.sell;
  const payback = gold > 0 ? (spec.saplingCost / (gold / 7)).toFixed(1) : "∞";
  console.log(
    spec.id.padEnd(14) +
    String(spec.saplingCost).padStart(6) +
    String(Math.round(spec.matureMs / H) + " h").padStart(10) +
    String(Math.round(spec.cycleMs / H) + " h").padStart(8) +
    String(picks).padStart(15) +
    String(fruits).padStart(8) +
    String(gold).padStart(8) +
    (payback + " j").padStart(8));

  ok(`  ${spec.id} : il produit VRAIMENT en saison`, picks > 0, `${picks} cueillettes`);
  /* ⚠️ LE SEUIL DE RENTABILITÉ. Un plant doit se rembourser en un à quatre
     jours réels de production : moins, et personne ne plante plus rien
     d'autre (les neuf cultures existantes deviennent du décor) ; plus, et
     personne ne plante de verger du tout. */
  ok(`  ${spec.id} : il se rembourse entre 0,8 et 4 jours de production`,
    gold > 0 && spec.saplingCost / (gold / 7) >= 0.8 && spec.saplingCost / (gold / 7) <= 4,
    `${payback} jours`);
  /* ⚠️ LE CONTRÔLE QUI COMPTE, ET IL COMPARE À CE QUI EXISTE DÉJÀ (règle du
     zip 379 : « tout contrôle qui s'applique à de l'art préexistant doit
     comparer à l'état d'avant, jamais à un idéal »). Une case de verger doit
     rapporter plus qu'une case de culture — sans quoi personne n'investit —
     mais jamais plus du triple, sans quoi les neuf cultures du jeu deviennent
     du décor. La référence est LUE dans C.CROPS, pas recopiée. */
  const bestCrop = Math.max(...C.CROPS.filter(c => !c.unique).map(c => c.sell / (c.growMs / (24 * H))));
  const perDay = gold / 7;
  ok(`  ${spec.id} : entre 1 et 3 fois la meilleure culture (${Math.round(bestCrop)} or/jour/case)`,
    perDay > bestCrop && perDay < bestCrop * 3, `${Math.round(perDay)} or/jour/case`);
}

/* --------------------------------------------------------------------------
   2. LA PROMESSE CENTRALE : « ne nécessitent pas de replanter ».
   -------------------------------------------------------------------------- */
{
  const world = {
    ground: new Array(C.MAP_W * C.MAP_H).fill(C.G_GRASS),
    objects: new Array(C.MAP_W * C.MAP_H).fill(C.O_NONE),
    objHp: new Map(), crops: new Map(), orchards: new Map(),
  };
  const f = { inv: { saplings: { lemon: 1 }, fruits: {} }, pets: [] };
  const x = 10, y = 10, i = y * C.MAP_W + x;
  const r = E.resolvePlantOrchard(f, world, x, y, 0);
  ok("planter consomme le plant et occupe la case", r.ok && world.objects[i] === C.O_ORCHARD && (f.inv.saplings.lemon | 0) === 0);

  const o = world.orchards.get(i);
  o.plantedAt = Date.now() - C.ORCHARDS[0].matureMs - 1;   // on le fait vieillir d'un coup
  o.ripe = 4;
  const p1 = E.resolveOrchardPick(f, world, x, y);
  ok("cueillir rend des fruits", p1.ok && (f.inv.fruits.lemon | 0) === 4, `${f.inv.fruits.lemon} citrons`);
  /* ⚠️ LE CONTRÔLE QUI JUSTIFIE TOUT LE CHANTIER. C'est la demande de
     Guillaume mot pour mot : « produisent périodiquement des fruits mais ne
     nécessitent pas de replanter ». Si un jour quelqu'un « range » la
     cueillette en la faisant passer par resolveHarvest, ce contrôle échoue. */
  ok("⚠️ L'ARBRE RESTE APRÈS LA CUEILLETTE (c'est toute la demande)",
    world.objects[i] === C.O_ORCHARD && world.orchards.has(i));
  ok("... et il repart pour un cycle", (world.orchards.get(i).nextAt || 0) > Date.now());

  const p2 = E.resolveOrchardPick(f, world, x, y);
  ok("on ne cueille pas deux fois le même lot", !p2.ok);

  // l'abattage rend le sol ET efface l'état
  world.objHp.set(i, 1);
  const c2 = E.resolveOrchardChop(f, world, x, y);
  ok("la hache abat le verger et rend du bois", c2.ok && c2.done && (f.inv.wood | 0) === C.ORCHARD_WOOD);
  ok("⚠️ ... et n'oublie AUCUN état derrière lui", !world.orchards.has(i) && world.objects[i] === C.O_NONE);
}

/* --------------------------------------------------------------------------
   3. LA SAISON. Hors saison, un verger ATTEND — il n'accumule pas.
   -------------------------------------------------------------------------- */
{
  const k = C.ORCHARDS.findIndex(o => !o.seasons.includes("winter"));
  const spec = C.ORCHARDS[k];
  const t0 = 1;
  const o = { k, plantedAt: t0, nextAt: 0, ripe: 0 };
  let picks = 0;
  for (let t = t0 + spec.matureMs; t < t0 + spec.matureMs + 5 * 24 * H; t += 15 * 60 * 1000) {
    E.orchardTick(o, t, "winter");
    if ((o.ripe | 0) > 0) { picks++; o.ripe = 0; }
  }
  ok(`hors saison, ${spec.id} ne produit rien`, picks === 0, `${picks} cueillettes en 5 jours d'hiver`);
  /* ⚠️ ET SURTOUT : IL N'A PAS ACCUMULÉ D'ÉCHÉANCES. Sans le report de
     `nextAt` dans orchardTick, l'arbre sortirait de l'hiver avec vingt
     récoltes en retard et les rendrait toutes d'un coup — ce qui viderait la
     saisonnalité de son sens et transformerait l'attente en simple retard. */
  let burst = 0;
  const t1 = t0 + spec.matureMs + 5 * 24 * H;
  for (let t = t1; t < t1 + 2 * 60 * 60 * 1000; t += 15 * 60 * 1000) {
    E.orchardTick(o, t, spec.seasons[0]);
    if ((o.ripe | 0) > 0) { burst++; o.ripe = 0; }
  }
  ok("⚠️ ... et il ne rattrape PAS son retard au retour de la saison", burst <= 1, `${burst} récoltes dans les 2 premières heures`);
}

/* --------------------------------------------------------------------------
   4. LES PRODUITS : transformer doit TOUJOURS rapporter plus que vendre brut.
   -------------------------------------------------------------------------- */
console.log("");
for (const p of C.FRUIT_PRODUCTS) {
  const fr = C.fruitSpec(p.fruit);
  const brut = fr.sell * p.fruitN;
  ok(`${p.id} : transformer rapporte plus que vendre les fruits bruts`,
    p.sell > brut, `${p.sell} contre ${brut} or`);
}

/* La barquette doit rapporter plus que six ventes à l'unité, sans quoi elle
   n'est qu'un bouton de plus. */
for (const f of C.FRUITS) {
  ok(`${f.id} : la barquette vaut mieux que ${C.PUNNET_SIZE} ventes à l'unité`,
    C.punnetPrice(f.id) > f.sell * C.PUNNET_SIZE,
    `${C.punnetPrice(f.id)} contre ${f.sell * C.PUNNET_SIZE}`);
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nLes vergers tiennent leurs promesses.\n");
console.log(`Ce script ne dit RIEN du PLAISIR de planter un verger, ni de sa place
dans l'économie réelle d'une partie à plusieurs : il dit qu'un arbre reste après
la cueillette, qu'il respecte ses saisons sans rattraper son retard, et que
chaque nombre écrit dans les constantes produit l'effet annoncé. Le reste se
joue.\n`);
process.exit(fails ? 1 : 0);
