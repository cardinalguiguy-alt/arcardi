/* =============================================================================
   verify-portee.mjs — UN NOM LIBRE DANS DU JSX EST UNE BOMBE À RETARDEMENT (443)
   -----------------------------------------------------------------------------
       node tools/verify-portee.mjs

   ⚠️⚠️ CE BANC EXISTE PARCE QUE LE TABLEAU DES COURS DE LA MAIRIE N'A JAMAIS PU
   S'OUVRIR, DU 438 AU 443, ET QUE RIEN NE POUVAIT LE DIRE. Ses quatre colonnes
   lisaient un `day` NU : aucune déclaration de ce nom n'existe au niveau du
   composant, les quatre autres `const day` du fichier vivent dans des fonctions
   voisines. Le premier rendu levait `ReferenceError: day is not defined`, le
   GameErrorBoundary avalait le jeu entier, et le joueur voyait l'écran 🧯.

   ⚠️ POURQUOI RIEN NE LE VOYAIT, ET C'EST TOUT LE SUJET :
     - `npx next build` COMPILE ce fichier sans broncher : `day` est une
       référence parfaitement légale, elle se résout À L'EXÉCUTION ;
     - il n'y a pas d'ESLint dans le dépôt (et `no-undef` n'aurait rien dit non
       plus si l'on s'était contenté de chercher des globaux inconnus : `day`
       EST déclaré dans le fichier, ailleurs) ;
     - les trente-et-un autres bancs mesurent des données et des dessins ; aucun
       ne rend un panneau React ;
     - et le seul chemin qui l'exerce — E devant le tableau, à la mairie —
       n'était joué par personne, jusqu'à ce que l'enquête du 442 y envoie le
       joueur chercher son deuxième indice.
   C'est la question de l'en-tête de `CLAUDE.md` reprise telle quelle : la
   réponse n'était pas « où est le bogue », elle était « quelle grandeur ne
   mesure-t-on pas ». La grandeur est celle-ci : LE NOMBRE DE RÉFÉRENCES QUI NE
   SE RÉSOLVENT NULLE PART.

   Le banc parse chaque module avec le parseur de Babel et son greffon JSX, tous
   deux LIVRÉS PAR NEXT (`next/dist/compiled/babel`) — aucune dépendance à
   installer, ce qui est la condition pour qu'il tourne encore dans six mois. Il
   demande ensuite à `@babel/traverse` la table des portées et relève les
   références libres du programme. Tout ce qui n'est pas un vrai global de
   navigateur est un `ReferenceError` en attente.

   ⚠️⚠️ IL SE PROUVE LUI-MÊME AVANT DE JUGER QUOI QUE CE SOIT (leçon du 441, où
   le garde-fou de source de `verify-pont` annonçait « 0 appel fautif » avec un
   motif qui ne pouvait matcher aucun appel). Le chapitre 0 lui donne à lire du
   code FAUTIF et exige qu'il le refuse ; s'il l'accepte, le banc s'arrête là et
   ne rend aucun verdict sur le dépôt. Et il publie toujours COMBIEN de fichiers
   et COMBIEN de références il a lus : un scanner qui ne scanne rien passe au
   vert en silence.

   ⚠️ CE QU'IL NE FAIT PAS, ET IL FAUT LE LIRE AVANT DE LUI FAIRE CONFIANCE :
     - il ne couvre PAS `public/` (templerun, labyrinth, candyluge, crystal).
       Ces jeux-là sont des `<script>` qui se parlent par le global (`THREE`,
       `Slope`, `Pix`, `dirForward`…) : chez eux un nom libre est la NORME, pas
       un défaut. Les y passer demanderait de construire la liste de ce que
       chaque fichier publie — un autre banc, pour des jeux en pause ;
     - il ne dit RIEN de ce qu'un panneau AFFICHE. Un panneau qui s'ouvre sur
       un tableau vide ou faux lui paraît parfait. Il dit seulement qu'aucun
       rendu ne peut plus mourir sur un nom qui n'existe pas ;
     - il ne voit pas les propriétés (`obj.jour` mal orthographié reste
       invisible) : une portée n'est pas un typage.
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);
const parser = require_("next/dist/compiled/babel/parser");
const traverse = require_("next/dist/compiled/babel/traverse").default;

let fails = 0;
const ok = (cond, name, extra) => {
  console.log(`  ${cond ? "OK   " : "ÉCHEC"}   ${name}${extra ? "  —  " + extra : ""}`);
  if (!cond) fails++;
};
const title = (s) => console.log(`\n=== ${s} ===\n`);

/* ⚠️ LA LISTE EST BLANCHE, PAS NOIRE, et c'est la leçon du 440 (`plantTree` et
   sa liste noire à laquelle il manquait `G_BRIDGE`) appliquée ici : on énumère
   ce qui est PERMIS. Le jour où quelqu'un tape `windwo`, le banc le refuse tout
   seul ; avec une liste noire il aurait fallu l'avoir prévu. Ajouter une entrée
   ici est un geste conscient, et c'est exactement ce qu'on veut. */
const GLOBALS = new Set([
  // ES
  "Array", "Boolean", "Date", "Error", "Infinity", "JSON", "Map", "Math", "NaN",
  "Number", "Object", "Promise", "Proxy", "Reflect", "RegExp", "Set", "String",
  "Symbol", "WeakMap", "WeakSet", "BigInt", "Function", "globalThis", "undefined",
  "isFinite", "isNaN", "parseFloat", "parseInt", "decodeURIComponent", "encodeURIComponent",
  "Float32Array", "Float64Array", "Int8Array", "Int16Array", "Int32Array",
  "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "ArrayBuffer", "DataView",
  "structuredClone", "queueMicrotask",
  // Navigateur
  "window", "document", "navigator", "location", "history", "screen", "console",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback",
  "localStorage", "sessionStorage", "fetch", "Headers", "Request", "Response",
  "URL", "URLSearchParams", "Blob", "File", "FileReader", "FormData", "Image",
  "Audio", "AudioContext", "webkitAudioContext", "Path2D", "ImageData",
  "MessageChannel", "MutationObserver", "ResizeObserver", "IntersectionObserver",
  "WebSocket", "AbortController", "CustomEvent", "Event", "KeyboardEvent",
  "MouseEvent", "PointerEvent", "TouchEvent", "DOMParser", "crypto", "matchMedia",
  "alert", "confirm", "prompt", "atob", "btoa", "getComputedStyle", "devicePixelRatio",
  "performance",
  // Node / bundler (les modules partagés entre serveur et client en lisent)
  "process", "Buffer", "require", "module", "exports", "__dirname", "__filename",
]);

/* Les racines couvertes. ⚠️ `public/` EN EST ABSENT EXPRÈS — voir l'en-tête. */
const ROOTS = ["components", "lib", "app"];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.next|vendor/.test(p)) walk(p, out); }
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

/* Rend { free, refs } : les noms libres NON autorisés (avec leur première
   ligne), et le nombre de références lues — c'est ce second chiffre qui prouve
   que le banc a vraiment regardé quelque chose. */
function scanSource(src, label) {
  const ast = parser.parse(src, {
    sourceType: "module",
    plugins: ["jsx"],
    errorRecovery: false,
  });
  let globals = {}, refs = 0;
  traverse(ast, {
    Program(p) { globals = p.scope.globals; },
    Identifier(p) { if (p.isReferencedIdentifier()) refs++; },
  });
  const free = Object.keys(globals)
    .filter(n => !GLOBALS.has(n))
    .map(n => ({ name: n, line: globals[n].loc ? globals[n].loc.start.line : 0, file: label }));
  return { free, refs };
}

/* ═══════════════════════════════════════════════════════════════════════════
   0. LE BANC SAIT-IL ÉCHOUER ? (441 — un banc qui n'a jamais pu échouer ne
   mesure rien, et il applaudit d'autant plus fort.)
   ═══════════════════════════════════════════════════════════════════════════ */
title("0. le banc se prouve avant de juger");

{
  /* Le cas exact du 443, réduit : un `const day` dans une fonction voisine, et
     une lecture nue dans le JSX du composant. C'est la forme la plus sournoise,
     parce que le nom EXISTE dans le fichier — un simple `grep` le trouve, et
     conclut à tort qu'il est déclaré. */
  const fautif = `
    function ailleurs() { const day = 1; return day; }
    export default function Panneau({ open }) {
      return <div>{open && <span>{day + 1}</span>}</div>;
    }`;
  const r1 = scanSource(fautif, "(injecté)");
  ok(r1.free.some(f => f.name === "day"), "⚠️ il REFUSE un `day` nu lu depuis du JSX",
     r1.free.map(f => f.name).join(" ") || "il ne l'a pas vu");

  /* …et il ne crie pas sur le même code une fois réparé : un banc qui refuse
     tout est aussi inutile qu'un banc qui accepte tout. */
  const sain = `
    function ailleurs() { const day = 1; return day; }
    export default function Panneau({ open }) {
      const day = 2;
      return <div>{open && <span>{day + 1}</span>}</div>;
    }`;
  const r2 = scanSource(sain, "(injecté)");
  ok(r2.free.length === 0, "…et il accepte le même panneau une fois réparé",
     r2.free.map(f => f.name).join(" ") || "aucun nom libre");

  ok(r1.refs > 0 && r2.refs > 0, "…et il a bien LU des références dans les deux cas",
     `${r1.refs} puis ${r2.refs}`);

  if (fails) {
    console.log(`\n❌ LE BANC NE SAIT PAS ÉCHOUER — aucun verdict n'est rendu sur le dépôt.\n`);
    process.exit(1);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. LE DÉPÔT
   ═══════════════════════════════════════════════════════════════════════════ */
title("1. les modules du jeu");

const offenders = [];
let nFiles = 0, nRefs = 0, nUnparsed = [];

for (const root of ROOTS) {
  const dir = path.join(ROOT, root);
  if (!fs.existsSync(dir)) continue;
  for (const f of walk(dir)) {
    const rel = path.relative(ROOT, f);
    let src;
    try { src = fs.readFileSync(f, "utf8"); } catch { nUnparsed.push(rel); continue; }
    try {
      const { free, refs } = scanSource(src, rel);
      nFiles++; nRefs += refs;
      offenders.push(...free);
    } catch (e) {
      /* ⚠️ UN FICHIER QU'ON N'A PAS PU LIRE N'EST PAS UN FICHIER PROPRE. On le
         compte à part et on ÉCHOUE dessus : sans ça, une syntaxe que le parseur
         ne connaît pas encore ferait silencieusement rétrécir le périmètre, et
         le banc annoncerait « tout va bien » sur ce qu'il reste. */
      nUnparsed.push(`${rel} (${String(e.message).split("\n")[0]})`);
    }
  }
}

ok(nFiles > 0, "⚠️ le banc a bien lu quelque chose", `${nFiles} fichiers, ${nRefs} références`);
ok(nUnparsed.length === 0, "…et aucun fichier n'a résisté au parseur",
   nUnparsed.length ? nUnparsed.join(" · ") : `${ROOTS.join(" · ")}`);
ok(offenders.length === 0,
   "⚠️⚠️ aucune référence ne se résout dans le vide (le défaut du 443)",
   offenders.length
     ? offenders.map(o => `${o.name} — ${o.file}:${o.line}`).join(" · ")
     : "0 nom libre hors globaux connus");

console.log(fails ? `\n❌ ${fails} ÉCHEC(S)\n` : `\n✅ Tous les contrôles passent.\n`);
console.log(`Lu : ${nFiles} fichiers, ${nRefs} références d'identifiant, sous ${ROOTS.join(" · ")}.
Ce banc ne rend AUCUN panneau : il ne dit pas qu'un écran est juste, il dit
qu'aucun ne peut plus mourir sur un nom qui n'existe pas. Le dossier public/
n'est pas couvert, et c'est délibéré (voir l'en-tête).`);
process.exit(fails ? 1 : 0);
