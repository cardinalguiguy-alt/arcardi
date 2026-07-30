/* =============================================================================
   tools/check-strings.js — Parité FR/EN du défi, et couverture du HTML.
   -----------------------------------------------------------------------------
       node tools/check-strings.js

   Deux contrôles, le second au moins aussi utile que le premier :

     1. Les deux blocs de RUN_STR ont exactement les mêmes clés. C'est la règle
        appliquée à fermeStrings.js dans la ferme ; le défi n'y échappe pas.
     2. Tout élément de texte de index.html est déclaré dans la liste IDS de
        ui.js. Un identifiant oublié là ne provoque AUCUNE erreur : il laisse
        simplement un libellé vide à l'écran, et on ne le voit que dans la
        langue qu'on ne teste jamais.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, "js/strings.js"), "utf8"), ctx, { filename: "strings.js" });
const S = vm.runInContext("RUN_STR", ctx);

const failures = [];

const fr = Object.keys(S.fr), en = Object.keys(S.en);
const A = new Set(fr), B = new Set(en);
const missEn = fr.filter(k => !B.has(k));
const missFr = en.filter(k => !A.has(k));
console.log(`Clés : fr=${fr.length}  en=${en.length}`);
if (missEn.length) failures.push("absentes du bloc en : " + missEn.join(", "));
if (missFr.length) failures.push("absentes du bloc fr : " + missFr.join(", "));

// Valeurs identiques : suspectes, mais pas fautives (« Score », « Distance »
// s'écrivent pareil). On les liste sans faire échouer.
const same = fr.filter(k => B.has(k) && S.fr[k] === S.en[k] && String(S.fr[k]).length > 3);
if (same.length) console.log("Identiques dans les deux langues (à vérifier à l'œil) : " + same.join(", "));

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ui = fs.readFileSync(path.join(root, "js/ui.js"), "utf8");
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]).filter(i => i !== "gl");
const listed = (ui.match(/const IDS = \[([\s\S]*?)\];/) || [])[1] || "";
const known = new Set([...listed.matchAll(/"([^"]+)"/g)].map(m => m[1]));
const unknown = ids.filter(i => !known.has(i));
console.log(`Identifiants du HTML : ${ids.length}, tous déclarés dans ui.js : ${unknown.length === 0}`);
if (unknown.length) failures.push("identifiants absents de IDS (libellés qui resteront vides) : " + unknown.join(", "));

if (failures.length) {
  console.log("\nÉCHEC :");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("\nOK — parité FR/EN et couverture du HTML.");
