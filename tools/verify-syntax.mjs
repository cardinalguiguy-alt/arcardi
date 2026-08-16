/* =============================================================================
   verify-syntax.mjs — LE JSX SE PARSE-T-IL ? (zip 398)
   -----------------------------------------------------------------------------
   Le projet ne peut pas lancer `next build` dans l'environnement de travail
   (contrainte documentée dans le texte de contexte), et `node --check` refuse
   le JSX. `FermeGame.js` — 16 000 lignes — n'avait donc AUCUN contrôle de
   syntaxe : une virgule oubliée dans une modale ne se voyait qu'à l'écran de
   Guillaume.

   Ce script essaie `esbuild` (téléchargé à la demande par npx, quelques
   centaines de kilo-octets) et, à défaut de réseau, retombe sur `node --check`
   pour les fichiers SANS JSX. Il dit toujours LEQUEL des deux il a fait :
   un contrôle qui ne précise pas ce qu'il a vérifié laisse croire qu'il a tout
   vérifié.
   ========================================================================== */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSX = ["components/ferme/FermeGame.js"];
const PLAIN = ["components/ferme/fermeConstants.js", "components/ferme/fermeEngine.js",
               "components/ferme/fermeArt.js", "components/ferme/fermeStrings.js",
               // zip 442 — la table et les règles de l'enquête.
               "components/ferme/quete.js"];

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

console.log("\n=== syntaxe des fichiers de la ferme ===\n");

for (const f of PLAIN) {
  try { execSync(`node --check "${path.join(ROOT, f)}"`, { stdio: "pipe" }); ok(`${f} (node --check)`, true); }
  catch (e) { ok(`${f} (node --check)`, false, String(e.stderr || e).split("\n").slice(0, 3).join(" ")); }
}

let haveEsbuild = true;
for (const f of JSX) {
  try {
    execSync(`npx --yes esbuild@0.21.5 --loader:.js=jsx --format=esm "${path.join(ROOT, f)}" --outfile=/dev/null`,
      { stdio: "pipe", timeout: 120000, cwd: ROOT });
    ok(`${f} (esbuild, JSX compris)`, true);
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e);
    if (/npm|network|ENOTFOUND|EAI_AGAIN|404/i.test(msg) && !/ERROR/.test(msg)) {
      haveEsbuild = false;
      console.log(`  ⚠️   ${f} : esbuild indisponible (pas de réseau). NON VÉRIFIÉ.`);
    } else ok(`${f} (esbuild, JSX compris)`, false, msg.split("\n").filter(l => l.includes("ERROR") || l.includes("│")).slice(0, 4).join(" "));
  }
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout se parse.\n");
console.log(haveEsbuild
  ? `Le JSX a réellement été analysé. Ce script ne dit RIEN des types, des hooks
ni du rendu : il dit que le fichier est du JavaScript valide, ce qui est le
minimum qu'on ne pouvait pas vérifier jusqu'ici.\n`
  : `⚠️ FermeGame.js N'A PAS ÉTÉ VÉRIFIÉ (esbuild n'a pas pu être téléchargé).
Le dire est plus utile que de passer au vert : un contrôle silencieusement
sauté est pire qu'un contrôle absent.\n`);
process.exit(fails ? 1 : 0);
