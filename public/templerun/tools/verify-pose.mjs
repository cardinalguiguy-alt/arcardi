/* =============================================================================
   verify-pose.mjs — LE COUDE ET LE GENOU PLIENT DANS DES SENS OPPOSÉS.
   (zip 406)
   -----------------------------------------------------------------------------
       node public/templerun/tools/verify-pose.mjs

   Retour de Guillaume au 405 : « les bras du personnage semblent s'articuler à
   l'envers (avant-bras qui s'orientent dans le mauvais sens pendant la
   course) ».

   ⚠️ LE PIÈGE EXISTAIT DÉJÀ, ÉCRIT, DEPUIS LE ZIP 396 — POUR L'AUTRE JEU.
   « PIÈGE DE SIGNE D'ARTICULATION (396) : le genou plie en NÉGATIF et le coude
   en POSITIF, signes opposés. » Il avait été posé sur le gréement du
   labyrinthe (rig.js) et personne n'est venu vérifier le défi de fuite, dont le
   fermier a pourtant exactement la même construction à deux segments. Les trois
   angles de coude de updatePlayer étaient NÉGATIFS depuis le zip 374 : les
   avant-bras se repliaient comme des tibias.

   ⚠️ ET VOICI POURQUOI ÇA A TENU TRENTE ZIPS : LES DEUX BRAS ÉTAIENT FAUX DU
   MÊME CÔTÉ. Une asymétrie saute aux yeux ; une symétrie fausse se lit comme
   un parti pris. C'est le mode de panne le plus durable d'une animation, et il
   ne se corrige que le jour où quelqu'un regarde vraiment — Guillaume, au 405.

   LA GÉOMÉTRIE, POSÉE UNE FOIS POUR TOUTES. Dans limb2(), le segment inférieur
   pend vers -Y depuis son pivot. Une rotation de θ autour de +X envoie
   (0,-1,0) sur (0, -cos θ, -sin θ) : **θ positif pousse le segment vers -Z.**
   Le fermier court vers -Z, donc vers l'AVANT. Un genou replie le tibia vers
   l'arrière (négatif) ; un coude replie l'avant-bras vers l'avant (positif).

   ⚠️ ÉCRIT AVANT LA CORRECTION, ET ON A EXIGÉ QU'IL ÉCHOUE : sur le zip 405,
   **5 contrôles sur 8 sonnent** — les deux coudes, leur flexion, et le
   contraste — à toutes les phases de la foulée comme de la glissade.

   Ce qu'il NE prouve pas : que la course est belle, que la cadence est juste,
   que la glissade se lit. Ça se regarde — et smoke-render.js le fait tourner
   300 images sans jeter, ce qui est autre chose.
   ========================================================================== */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const SRC = fs.readFileSync(path.join(root, "js/world.js"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

let pass = 0, fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) { pass++; console.log(`  OK   ${label}${detail ? "  " + detail : ""}`); }
  else { fail++; console.log(`  ÉCHEC ${label}${detail ? "  " + detail : ""}`); }
};

console.log("\n=== verify-pose.mjs — le coude et le genou plient en sens opposés ===\n");

/* ---------------------------------------------------------------------------
   1. LES ANGLES, ÉVALUÉS — pas relus.
   ---------------------------------------------------------------------------
   On extrait les quatre expressions d'angle d'articulation de updatePlayer et
   on les ÉVALUE sur toute la foulée et sur toute la glissade. Un contrôle qui
   se contenterait de chercher un signe moins dans le texte raterait la moitié
   des formes possibles — c'est la leçon du 404, « un contrôle qui énumère des
   formes ne protège que des formes énumérées ».
   ------------------------------------------------------------------------ */
/* ⚠️ ON ÉCHAPPE UNE SEULE FOIS, et le premier jet échappait deux fois : le
   nom arrivait déjà avec ses antislashs, puis `grab` les rajoutait. Trois
   angles sur quatre devenaient introuvables — et le contrôle annonçait
   « introuvable » sur du code parfaitement présent, ce qui est la pire des
   sorties : un contrôle qui accuse le jeu de sa propre faute. */
const grab = (name) => {
  const re = new RegExp(name.replace(/[.]/g, "\\.") + "\\s*=\\s*([^;]+);");
  const m = re.exec(SRC);
  return m ? m[1].trim() : null;
};
const NAMES = ["armL.knee.rotation.x", "armR.knee.rotation.x",
               "legL.knee.rotation.x", "legR.knee.rotation.x"];
const exprs = {};
for (const n of NAMES) exprs[n] = grab(n);
let missing = false;
for (const n of NAMES) {
  if (!exprs[n]) { ok(false, `l'angle ${n} est introuvable dans updatePlayer`); missing = true; }
}
if (missing) {
  console.log("\nContrôle interrompu : sans les quatre angles, tout le reste mesurerait du vide.\n");
  process.exit(1);
}

/* On rejoue les mêmes valeurs que updatePlayer, et on balaie :
     - la foulée entière (phase de 0 à 2π) ;
     - la glissade entière (k de 0 à 1).
   RUN_SWING et ARM_SWING sont relus dans la source pour ne pas devenir une
   seconde description de la cadence. */
const num = (name, dflt) => {
  const m = new RegExp("const\\s+" + name + "\\s*=\\s*([0-9.]+)").exec(SRC);
  return m ? parseFloat(m[1]) : dflt;
};
const RUN_SWING = num("RUN_SWING", 0.95);

function evalAngle(expr, phase, k) {
  const s = 1 - k;
  const mix = (run, slide) => run * s + slide * k;
  const swing = Math.sin(phase) * RUN_SWING;
  const kneeRun = (a) => -Math.max(0, -a) * 1.5 - 0.12;
  const dragArm = 0;                      // vibration : elle ne change pas le signe
  const fn = new Function("mix", "swing", "kneeRun", "dragArm", "Math", "return (" + expr + ");");
  return fn(mix, swing, kneeRun, dragArm, Math);
}

const SAMPLES = [];
for (let i = 0; i < 48; i++) SAMPLES.push({ phase: (i / 48) * Math.PI * 2, k: 0 });
for (let i = 0; i <= 10; i++) SAMPLES.push({ phase: 1.1, k: i / 10 });

const scan = (name) => {
  let min = 1e9, max = -1e9, worst = null;
  for (const s of SAMPLES) {
    const v = evalAngle(exprs[name], s.phase, s.k);
    if (!isFinite(v)) return { bad: "valeur non finie" };
    if (v < min) { min = v; }
    if (v > max) { max = v; worst = s; }
  }
  void worst;
  return { min, max };
};

for (const arm of ["armL.knee.rotation.x", "armR.knee.rotation.x"]) {
  const r = scan(arm);
  ok(r.min > 0,
    `⚠️ ${arm} : le COUDE plie vers l'AVANT (positif) à TOUTE la foulée et à toute la glissade`,
    `min ${r.min.toFixed(2)}  max ${r.max.toFixed(2)}`);
  /* Et il reste un coude : un bras parfaitement tendu à la course fait
     pantin (c'est le commentaire d'origine du 374, et il avait raison). */
  ok(r.max > 0.1, `... et il reste FLÉCHI (jamais tendu comme un bâton)`,
    `max ${r.max.toFixed(2)}`);
}
for (const leg of ["legL.knee.rotation.x", "legR.knee.rotation.x"]) {
  const r = scan(leg);
  ok(r.max <= 0.001,
    `⚠️ ${leg} : le GENOU plie vers l'ARRIÈRE (négatif), talon vers la fesse`,
    `min ${r.min.toFixed(2)}  max ${r.max.toFixed(2)}`);
}

/* ---------------------------------------------------------------------------
   2. LE CONTRASTE, et c'est lui qui rend le contrôle utile plus tard.
   ---------------------------------------------------------------------------
   Contrôler chaque angle séparément protège de la faute d'aujourd'hui. Ce qui
   protège de la faute de DEMAIN, c'est d'exiger que les deux familles restent
   de signes opposés : le jour où quelqu'un recopie une ligne de jambe dans un
   bras — l'origine exacte du défaut — le signe suit et le contrôle sonne.
   ------------------------------------------------------------------------ */
{
  const armMin = Math.min(scan("armL.knee.rotation.x").min, scan("armR.knee.rotation.x").min);
  const legMax = Math.max(scan("legL.knee.rotation.x").max, scan("legR.knee.rotation.x").max);
  ok(armMin > 0 && legMax <= 0.001,
    "⚠️ COUDES ET GENOUX SONT DE SIGNES OPPOSÉS (piège du 396, jamais appliqué ici avant le 406)",
    `coudes ≥ ${armMin.toFixed(2)}, genoux ≤ ${legMax.toFixed(2)}`);
}

/* Non-régression : le membre à deux segments existe toujours, et le segment
   inférieur pend bien vers -Y. Tout le raisonnement de signe repose là-dessus,
   et c'est la seule ligne de limb2() dont ce fichier dépend. */
ok(/const\s+lower\s*=\s*box\([^)]*,\s*-lowerLen\s*\/\s*2\s*,/.test(SRC),
  "le segment inférieur d'un membre pend toujours vers -Y (base du raisonnement)");

console.log(`\n${fail === 0 ? "Tout est passé." : `${fail} contrôle(s) en échec.`}  (${pass}/${pass + fail})\n`);
console.log(`Ce script ne dit RIEN de la beauté de la course : il dit que les
avant-bras ne se replient plus comme des tibias, et que les deux familles
d'articulations resteront de signes opposés. Le reste se regarde.\n`);
process.exit(fail === 0 ? 0 : 1);
