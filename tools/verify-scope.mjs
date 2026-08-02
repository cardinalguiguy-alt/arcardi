/* =============================================================================
   verify-scope.mjs — UN ACCUMULATEUR EST-IL BIEN DANS LA PORTÉE DE QUI L'ÉCRIT ?
   -----------------------------------------------------------------------------
   ⚠️ CE SCRIPT EXISTE À CAUSE D'UN DÉFAUT PRÉCIS, TROUVÉ AU ZIP 398 EN
   CHERCHANT POURQUOI LES BOUTONS DU SAC « NE RÉAGISSENT PAS ».

   `hostHandleStationReq()` traitait ONZE requêtes qui écrivaient dans un objet
   `out` — familiers (`petWalk`, `releasePet`), butin du passage, prix du
   labyrinthe (`labWon`/`labFailed`), niveaux du Gourmandin, cueillettes — et
   **cet objet n'était déclaré nulle part dans sa portée**. Il n'appartenait
   qu'à `hostHandleReqUnsafe`.

   Chacune de ces onze requêtes levait donc une `ReferenceError`, rattrapée en
   silence par le `try/catch` de `hostHandleReq`. Et le défaut était PERVERS :
   la résolution moteur s'exécutait AVANT la ligne fautive, donc l'état
   autoritaire changeait pour de bon — seul le broadcast qui l'annonce
   manquait. Le familier sortait vraiment du sac ; l'écran, lui, ne l'apprenait
   qu'au prochain évènement sans rapport.

   POURQUOI AUCUNE RELECTURE NE POUVAIT LE VOIR : chaque ligne prise séparément
   est juste. `out.farmer = { … }` est correct dans son fichier, dans son style,
   et identique à quinze autres lignes du même fichier. **Ce qui est faux, c'est
   l'ENDROIT.** Un endroit ne se relit pas, il se mesure — d'où ce script.

   CE QU'IL FAIT : il découpe `FermeGame.js` en fonctions de premier niveau du
   composant (celles à deux espaces d'indentation), et vérifie, pour chaque
   accumulateur surveillé, que toute fonction qui l'ÉCRIT le DÉCLARE ou le
   REÇOIT en paramètre.

   ⚠️ CE QU'IL NE PROUVE PAS : ce n'est pas une analyse de portée générale. Il
   ne connaît ni les fermetures imbriquées, ni les portées de bloc, ni les
   variables du composant. Il surveille une LISTE NOMMÉE d'accumulateurs, ceux
   dont l'écriture hors portée est silencieuse et coûteuse. Un vrai analyseur
   demanderait un parseur ; celui-ci demande dix lignes et aurait trouvé le
   défaut du 398 — c'est le bon rapport pour un garde-fou.

   Usage :  node tools/verify-scope.mjs
   ========================================================================== */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "components", "ferme", "FermeGame.js");

/* Les accumulateurs surveillés. `out` est celui du 398 ; les autres sont ses
   voisins de même nature — des objets qu'on remplit dans une fonction et qu'un
   APPELANT émet ensuite. C'est cette séparation remplir/émettre qui rend
   l'erreur possible, donc c'est elle qui définit la liste. */
const WATCHED = ["out", "payload"];

const src = fs.readFileSync(FILE, "utf8");
const lines = src.split("\n");

/* Découpage en fonctions de premier niveau du composant : `  function nom(` à
   deux espaces, jusqu'à la prochaine ligne `  }` au même niveau. C'est le style
   du fichier, tenu sur 16 000 lignes ; s'il changeait, ce script trouverait
   zéro fonction et le dirait (voir le garde-fou en fin de script). */
const fns = [];
for (let i = 0; i < lines.length; i++) {
  const m = /^ {2}function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)/.exec(lines[i]);
  if (!m) continue;
  let end = lines.length - 1;
  for (let j = i + 1; j < lines.length; j++) {
    if (lines[j] === "  }") { end = j; break; }
    if (/^ {2}function\s/.test(lines[j])) { end = j - 1; break; }
  }
  fns.push({ name: m[1], params: m[2], from: i + 1, to: end + 1, body: lines.slice(i, end + 1).join("\n") });
}

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

console.log(`\n=== portée des accumulateurs — ${fns.length} fonctions de FermeGame.js ===\n`);

let checked = 0, flagged = [];
for (const fn of fns) {
  for (const v of WATCHED) {
    // écrit-il dedans ?  (`out.x = …`, `out.x.push(`, `out.x ||= …`)
    const writes = new RegExp(`\\b${v}\\.[A-Za-z0-9_$]+\\s*(=[^=]|\\.push\\(|\\|\\|=|\\+=)`).test(fn.body);
    if (!writes) continue;
    checked++;
    const declares = new RegExp(`\\b(const|let|var)\\s+${v}\\b`).test(fn.body);
    const receives = new RegExp(`(^|,)\\s*${v}\\s*(,|$|=)`).test(fn.params);
    if (!declares && !receives) flagged.push(`${fn.name}() ligne ${fn.from} écrit dans « ${v} » sans le déclarer ni le recevoir`);
  }
}

ok(`aucun accumulateur écrit hors de sa portée`, flagged.length === 0,
  `${checked} fonction(s) surveillée(s)`);
for (const f of flagged) console.log("        → " + f);

/* Garde-fou du garde-fou : si le découpage ne trouve plus de fonctions, ce
   script passerait « au vert » en ne vérifiant RIEN. C'est le pire mode de
   panne d'un contrôle, et il est arrivé assez souvent dans ce projet pour
   mériter sa propre assertion (leçon du zip 375 : un outil qu'on saute n'est
   pas un filet de sécurité, c'est un fichier mort — et un outil qui ne teste
   plus rien est pire, car il rassure). */
ok("le découpage en fonctions marche encore", fns.length > 200, `${fns.length} fonctions`);
ok("les accumulateurs surveillés existent bien dans le fichier", checked > 0, `${checked} écritures`);

/* Contrôle jumeau, et il découle du même défaut : une fonction qui REÇOIT
   l'accumulateur ne doit pas en redéclarer un second du même nom. Ce serait
   une seconde description de « la sortie d'une requête », et le zip 387 a
   documenté ce que deviennent deux descriptions d'une même chose. */
const shadow = fns.filter(fn => WATCHED.some(v =>
  new RegExp(`(^|,)\\s*${v}\\s*(,|$|=)`).test(fn.params) &&
  new RegExp(`\\b(const|let|var)\\s+${v}\\b`).test(fn.body)));
ok("aucune fonction ne masque l'accumulateur qu'elle reçoit", shadow.length === 0,
  shadow.map(f => f.name).join(", ") || "");

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTous les accumulateurs sont dans la portée de qui les écrit.\n");
console.log(`Ce script ne prouve RIEN d'autre : ce n'est pas une analyse de portée
générale, et il ne connaît ni les fermetures imbriquées ni les portées de bloc.
Il surveille une liste nommée d'accumulateurs — ceux qu'une fonction remplit et
qu'une AUTRE émet, c'est-à-dire exactement la configuration où l'erreur est
silencieuse. Il aurait trouvé le défaut du 398 ; c'est tout ce qu'on lui
demande.\n`);
process.exit(fails ? 1 : 0);
