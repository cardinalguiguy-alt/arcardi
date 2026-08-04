/* =============================================================================
   verify-gates.mjs — LES MURS DE CHANTIER ONT-ILS TOUS LE MÊME CODE ?
   (zip 417)
   -----------------------------------------------------------------------------
       node tools/verify-gates.mjs

   Deux mini-jeux sont désormais fermés au public derrière un « jeu en
   construction » : la descente (415) et le labyrinthe (417). Guillaume a posé
   une contrainte explicite en demandant le second : **« toujours même commande
   pour bypass »**.

   ⚠️ CETTE CONTRAINTE EST EXACTEMENT LE GENRE QUI SE PERD. Chaque mur vit dans
   le `game.js` de SA page — les trois mini-jeux sont des pages autonomes qui ne
   partagent aucun fichier JavaScript (voir le commentaire de `LabGate`). Rien,
   dans le code, ne relie les deux raccourcis : le jour où l'on retouche l'un
   des deux, l'autre ne bronchera pas, et l'on se retrouvera avec deux codes
   secrets dont un seul sera dans la tête de celui qui doit entrer. Un secret
   qu'on doit chercher dans le code n'est plus un secret utile.

   Ce script relie les deux, faute de pouvoir les fusionner. Il pose trois
   questions :

     1. LES DEUX MURS EXISTENT-ILS ENCORE ? (panneau, textes, code)
     2. RÉPONDENT-ILS AU MÊME RACCOURCI, avec la même fenêtre de temps ?
     3. ⚠️ ET SURTOUT : ONT-ILS DES CLÉS DE SESSION DIFFÉRENTES ? C'est
        l'inverse de la question 2, et il faut les deux. Même geste, mémoires
        séparées : ouvrir le labyrinthe pour le tester ne doit PAS rouvrir la
        descente au passage, sans quoi un seul code déverrouillerait tout le
        site et l'on ne saurait plus ce qui est montré au public.

   ⚠️ IL LIT DU TEXTE, il n'exécute rien. C'est assumé : ce qu'on vérifie ici
   n'est pas un comportement (`labyrinth/tools/verify-boot.mjs` le fait déjà, en
   tapant le vrai code sur les vrais écouteurs) mais une COHÉRENCE ENTRE DEUX
   FICHIERS QUI NE SE CONNAISSENT PAS. Aucune exécution ne peut la voir.

   ⚠️ ET IL DEVIENDRA INUTILE. Le jour où les deux jeux ouvrent, on retire les
   deux murs et ce script avec eux. Il est écrit pour la durée du chantier, et
   c'est pour ça qu'il tient en cinquante lignes.
   ========================================================================== */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

/* Les jeux actuellement derrière un mur. ⚠️ AJOUTER UNE LIGNE ICI quand un
   troisième passe en chantier — c'est le seul endroit à toucher. */
const WALLED = [
  { game: "candyluge", label: "la descente" },
  { game: "labyrinth", label: "le labyrinthe" },
];

const read = (p) => { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } };

console.log("\n=== verify-gates — les murs de chantier ===\n");

const keys = [];
for (const { game, label } of WALLED) {
  const js = read(`public/${game}/js/game.js`);
  const html = read(`public/${game}/index.html`);
  const str = read(`public/${game}/js/strings.js`);

  ok(`${label} : le panneau de chantier est dans la page`,
    /id="construction"/.test(html));
  ok(`${label} : ses textes existent en FR et en EN`,
    (str.match(/wipTitle:/g) || []).length === 2 &&
    (str.match(/wipSub:/g) || []).length === 2,
    `${(str.match(/wipTitle:/g) || []).length} titre(s)`);
  /* ⚠️ LE BOUTON DE RETOUR EST UNE QUESTION DE JEU, PAS DE MISE EN PAGE. Sans
     lui, un joueur qui ouvre le mini-jeu depuis la ferme est ENFERMÉ dans
     l'iframe : pas de barre d'adresse, aucune échappatoire. Un mur n'est pas
     un cul-de-sac. */
  ok(`${label} : on peut ressortir du mur vers la ferme`,
    /btnConstructionBack/.test(html) && /btnConstructionBack/.test(js));

  // Le raccourci, lu tel qu'il est écrit dans le code.
  const shortcut = /e\.code\s*!==\s*"KeyX"\s*\|\|\s*!e\.shiftKey\s*\|\|\s*!\(e\.metaKey\s*\|\|\s*e\.ctrlKey\)/.test(js);
  ok(`${label} : le raccourci est bien ⌘⇧X (ou Ctrl+Maj+X)`, shortcut);

  const win = (js.match(/WINDOW_MS\s*=\s*(\d+)/) || [])[1];
  ok(`${label} : la double pression a une fenêtre de temps`, !!win, win ? `${win} ms` : "aucune");

  const key = (js.match(/const KEY\s*=\s*"([^"]+)"/) || [])[1];
  ok(`${label} : le déverrouillage tient pour la SESSION, pas pour toujours`,
    !!key && /sessionStorage/.test(js) && !/localStorage\.setItem\([^)]*wip/.test(js),
    key ? `clé « ${key} »` : "aucune clé");
  keys.push({ label, key, win });
  console.log("");
}

/* ═══════════════════ LES DEUX QUESTIONS CROISÉES, ET ELLES S'OPPOSENT ══════ */
const wins = new Set(keys.map((k) => k.win));
ok("⚠️⚠️ TOUS LES MURS S'OUVRENT AVEC LE MÊME GESTE (demande explicite)",
  wins.size === 1, `fenêtre${wins.size > 1 ? "s" : ""} : ${[...wins].join(", ")} ms`);

const ks = keys.map((k) => k.key);
ok("⚠️⚠️ … MAIS CHACUN A SA PROPRE MÉMOIRE : ouvrir l'un n'ouvre pas l'autre",
  new Set(ks).size === ks.length, ks.join(" / "));

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nMêmes commandes, mémoires séparées.\n");
console.log(`Ce script ne dit RIEN de ce que le joueur voit : il dit que les deux
murs répondent au même geste et ne se déverrouillent pas l'un l'autre. Pour le
comportement réel — le mur qui tient, le halo, la double pression — c'est
public/labyrinth/tools/verify-boot.mjs, qui tape le vrai code sur les vrais
écouteurs.\n`);
process.exit(fails ? 1 : 0);
