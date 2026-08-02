/* =============================================================================
   verify-palette.mjs — LES DEUX JEUX SONT-ILS DE LA MÊME CARRIÈRE ?
   -----------------------------------------------------------------------------
   Demande de Guillaume, mot pour mot : « des textures similaires au jeu de
   fuite (evil world), même environnement sombre ». La palette du labyrinthe
   n'a donc pas été choisie, elle a été RECOPIÉE de
   public/templerun/js/config.js.

   ⚠️ UNE COPIE EST UNE SECONDE DESCRIPTION, ET DEUX DESCRIPTIONS D'UNE MÊME
   CHOSE FINISSENT TOUJOURS PAR DIVERGER (leçon du zip 387 : render.js
   dessinait la corde avec sa flèche, physics.js la testait tendue). Ici la
   fusion est impossible — deux pages autonomes servies depuis public/ ne
   peuvent pas s'importer l'une l'autre, c'est la même contrainte qui a imposé
   trois tables de textes séparées. Le seul garde-fou possible est donc un
   CONTRÔLE, et le voici.

   Le jour où quelqu'un éclaircira la pierre du défi de fuite sans toucher au
   labyrinthe, ce script échouera. C'est exactement ce qu'on lui demande : il
   n'existe aucune autre façon de s'en apercevoir avant de le voir à l'écran,
   et à l'écran on ne le verrait pas non plus, puisqu'on ne regarde jamais les
   deux jeux côte à côte.

   CE QU'IL NE PROUVE PAS : rien de la ressemblance RÉELLE. Deux jeux peuvent
   partager trente couleurs et ne pas se ressembler du tout — la maçonnerie du
   labyrinthe est peinte par paint.js, celle du défi par world.js, et ces
   deux-là ne sont pas comparés (ils ne dessinent pas les mêmes objets). Il
   prouve que la CARRIÈRE est la même, pas que les murs le sont.
   ========================================================================== */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB = path.join(HERE, "..", "js", "config.js");
const RUN = path.join(HERE, "..", "..", "templerun", "js", "config.js");

function loadCFG(file) {
  const ctx = vm.createContext({ Math, console, module: {} });
  vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  return vm.runInContext("CFG", ctx);
}

const lab = loadCFG(LAB);
const run = loadCFG(RUN);

/* Les clés PROPRES au labyrinthe, déclarées comme telles dans config.js et
   donc exclues : l'acier de l'épée, l'os du traqueur, et le ciel (le défi a
   un cycle jour/nuit complet, le labyrinthe un ciel fixe qu'on n'aperçoit
   qu'en levant les yeux entre deux murs). */
const OWN = new Set([
  "COL_STEEL", "COL_STEEL_EDGE", "COL_STALKER", "COL_STALKER_EYE",
  "SKY_TOP", "SKY_HORIZON",
  /* Zip 394 — les teintes relevées sur les images de Guillaume. Elles sont
     PROPRES au labyrinthe et il ne faut surtout pas les imposer au défi de
     fuite : sa chaussée est sous un orage, la nôtre est éclairée aux torches.
     Les y recopier éclaircirait un jeu que personne n'a demandé d'éclaircir. */
  "COL_BRICK", "COL_BRICK_LIT", "COL_BRICK_DARK",
  "COL_FLOOR", "COL_FLOOR_LIT", "COL_FLOOR_DARK",
  "COL_PYRAMID", "COL_DEADTREE", "COL_LAKE_BRIGHT",
  "COL_TORCH_OUT", "COL_TORCH_CORE",
  /* ZIP 397 — les huit teintes de la refonte des textures et de la vue
     subjective. Elles décrivent des phénomènes que le défi de fuite N'A PAS,
     et c'est le critère : la suie suppose des torches murales (il n'en a
     aucune), le parchemin suppose une carte (il n'en a pas), la craie suppose
     que quelqu'un soit passé avant (personne ne passe deux fois dans un défi
     de fuite). Les lui recopier ferait dériver sa palette pour une raison qui
     ne le concerne pas — l'inverse exact de ce que ce contrôle protège. */
  "COL_SAND", "COL_SOOT", "COL_OCHRE", "COL_CHALK",
  "COL_PARCH", "COL_PARCH_DARK", "COL_PARCH_INK", "COL_MAPGLOW",
]);

const shared = [];
const diverged = [];
for (const k of Object.keys(lab)) {
  if (!/^COL_/.test(k)) continue;
  if (OWN.has(k)) continue;
  if (!(k in run)) { diverged.push(`${k} : absente du défi de fuite`); continue; }
  shared.push(k);
  if (lab[k] !== run[k]) {
    diverged.push(`${k} : labyrinthe 0x${lab[k].toString(16)} ≠ défi 0x${run[k].toString(16)}`);
  }
}

console.log(`\n=== palette : ${shared.length} couleurs communes contrôlées ===\n`);
if (diverged.length) {
  console.log("⚠️  DIVERGENCES :");
  for (const d of diverged) console.log("   " + d);
  console.log("\nCorriger DANS LES DEUX FICHIERS, ou déclarer la clé dans OWN si\nelle est volontairement propre au labyrinthe.\n");
  process.exit(1);
}
console.log(`Les ${shared.length} couleurs communes sont identiques au bit près.`);
console.log(`${OWN.size} couleurs sont déclarées propres au labyrinthe : ${[...OWN].join(", ")}.\n`);
console.log(`Ce script ne prouve PAS que les deux jeux se ressemblent : il prouve
que la carrière est la même. La maçonnerie, elle, est peinte par paint.js ici
et par world.js là-bas, et ces deux-là ne dessinent pas les mêmes objets.\n`);
