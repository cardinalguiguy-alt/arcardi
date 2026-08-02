/* =============================================================================
   verify-strings.mjs — PARITÉ FR/EN DE fermeStrings.js. (zip 398)
   -----------------------------------------------------------------------------
   La contrainte de bilinguisme du projet : chaque clé française a sa jumelle
   anglaise, et réciproquement. Une clé manquante ne casse rien — elle affiche
   `undefined` au milieu d'une phrase, chez l'autre joueur, et seulement pour
   lui. C'est le défaut le plus discret qu'un jeu bilingue puisse avoir.

   ⚠️ IL COMPTE AUSSI QUE LES CLÉS-FONCTIONS PRENNENT LE MÊME NOMBRE
   D'ARGUMENTS dans les deux langues. Une traduction qui oublie un paramètre
   affiche « undefined or » au lieu du prix, et personne ne s'en aperçoit tant
   qu'un anglophone ne joue pas.
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeStrings.js"), "utf8");

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

/* On découpe sur les deux en-têtes de table. Elles sont repérées par le motif
   `  fr: {` / `  en: {` — s'il changeait, ce script trouverait zéro clé et le
   dirait (voir le garde-fou plus bas), au lieu de passer au vert sans rien
   vérifier. C'est le pire mode de panne d'un contrôle. */
const iFr = src.indexOf("\n  fr: {"), iEn = src.indexOf("\n  en: {");
const bodyFr = src.slice(iFr, iEn), bodyEn = src.slice(iEn);

function keysOf(body) {
  const m = new Map();
  const re = /^\s{4}([A-Za-z][A-Za-z0-9_]*)\s*:\s*(\([^)]*\)\s*=>)?/gm;
  let x;
  while ((x = re.exec(body))) {
    const args = x[2] ? (x[2].replace(/[()=>]/g, "").trim() ? x[2].replace(/[()=>\s]/g, "").split(",").filter(Boolean).length : 0) : -1;
    m.set(x[1], args);
  }
  return m;
}
const FR = keysOf(bodyFr), EN = keysOf(bodyEn);

console.log(`\n=== parité des textes de la ferme ===\n`);

const missEn = [...FR.keys()].filter(k => !EN.has(k));
const missFr = [...EN.keys()].filter(k => !FR.has(k));
ok("chaque clé française a sa jumelle anglaise", missEn.length === 0, missEn.slice(0, 8).join(", "));
ok("chaque clé anglaise a sa jumelle française", missFr.length === 0, missFr.slice(0, 8).join(", "));
ok("les deux tables ont le même nombre de clés", FR.size === EN.size, `${FR.size} = ${EN.size}`);

const arity = [...FR.keys()].filter(k => EN.has(k) && FR.get(k) !== EN.get(k));
ok("les clés-fonctions prennent les mêmes paramètres dans les deux langues",
  arity.length === 0, arity.slice(0, 8).map(k => `${k} (fr ${FR.get(k)} / en ${EN.get(k)})`).join(", "));

// Garde-fou du garde-fou (leçon du zip 375 : un contrôle qui ne teste plus
// rien est pire qu'un contrôle absent, parce qu'il rassure).
ok("le découpage des deux tables marche encore", FR.size > 500 && EN.size > 500, `${FR.size} / ${EN.size}`);

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : `\nLes ${FR.size} clés sont appariées.\n`);
console.log(`Ce script ne dit RIEN de la QUALITÉ des traductions : il dit qu'aucune
clé ne manque et qu'aucune fonction n'a perdu un paramètre en route.\n`);
process.exit(fails ? 1 : 0);
