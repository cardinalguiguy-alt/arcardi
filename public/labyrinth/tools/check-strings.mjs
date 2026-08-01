/* =============================================================================
   check-strings.mjs — parité FR/EN, identifiants du HTML, et ui.js EXÉCUTÉ.
   -----------------------------------------------------------------------------
   Calque de public/templerun/tools/check-strings.js et de son homologue du
   Gourmandin. Trois contrôles, et c'est le troisième qui vaut le déplacement :

   1. PARITÉ. Les deux blocs doivent avoir exactement les mêmes clés.

   2. IDENTIFIANTS. Chaque getElementById() d'ui.js doit exister dans
      index.html. Un id absent ne lève rien : le libellé reste simplement vide,
      et personne ne s'en aperçoit avant une capture d'écran.

   3. ⚠️ ui.js EXÉCUTÉ contre un faux DOM. C'est le seul contrôle qui attrape
      une clé de texte APPELÉE et manquante. La symétrie ne suffit pas : une
      clé FONCTION appelée alors qu'elle n'existe pas ne laisse pas un libellé
      vide, elle jette une exception EN PLEINE PARTIE (leçon du zip 387). On
      appelle donc applyLang() dans les deux langues, puis over() dans les
      quatre causes de fin, et on regarde si ça tient.
   ========================================================================== */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

// --- 1. parité
const sctx = vm.createContext({});
vm.runInContext(read("js/strings.js"), sctx);
const S = vm.runInContext("LAB_STR", sctx);
const fr = Object.keys(S.fr).sort(), en = Object.keys(S.en).sort();
const missEn = fr.filter(k => !en.includes(k)), missFr = en.filter(k => !fr.includes(k));
ok("parité FR/EN", missEn.length === 0 && missFr.length === 0,
  `${fr.length} = ${en.length}` + (missEn.length ? ` | absentes de EN : ${missEn}` : "") + (missFr.length ? ` | absentes de FR : ${missFr}` : ""));

// --- 2. identifiants
const html = read("index.html");
const uiSrc = read("js/ui.js");
const ids = new Set();
for (const m of html.matchAll(/id="([^"]+)"/g)) ids.add(m[1]);
const wanted = new Set();
for (const m of uiSrc.matchAll(/\$\("([^"]+)"\)/g)) wanted.add(m[1]);
for (const m of read("js/game.js").matchAll(/\$\("([^"]+)"\)/g)) wanted.add(m[1]);
const orphans = [...wanted].filter(i => !ids.has(i));
ok("tout id demandé par ui.js/game.js existe dans index.html",
  orphans.length === 0, `${wanted.size} demandés, ${ids.size} présents` + (orphans.length ? ` | MANQUANTS : ${orphans}` : ""));

// --- 3. ui.js exécuté
const els = new Map();
function fakeEl(id) {
  return {
    id, textContent: "", innerHTML: "", style: {}, className: "",
    classList: { toggle() {}, add() {}, remove() {} },
    appendChild() {},
  };
}
for (const i of ids) els.set(i, fakeEl(i));

const ctx = vm.createContext({
  console, Math, Object, Set, Map, JSON, performance: { now: () => 0 },
  document: {
    getElementById: (i) => els.get(i) || null,
    createElement: () => fakeEl("tmp"),
  },
  // Faux pont et faux moteur : ui.js les appelle, ils doivent répondre.
  Bridge: { embedded: true },
  Rules: { dread: () => 0.2 },
});
vm.runInContext(read("js/strings.js"), ctx);
vm.runInContext(read("js/ui.js"), ctx);

let threw = null;
try {
  vm.runInContext(`
    for (const lg of ["fr", "en"]) {
      UI.applyLang(lg);
      UI.setBest(1234);
      const cfg = { FLAME_LOW: .35, FLAME_CRITICAL: .12, HEARTS: 5 };
      const st = { cfg, score: 10, shardsTaken: 2, flame: .5, hearts: 3, hasSword: true,
                   hurtFlash: 0, seen: new Set([1,2,3]), events: [], endCause: null };
      UI.hud(st);
      // les cinq évènements que le moteur peut émettre vers l'interface
      for (const t of ["sword","revive","crack","potion","stalkerWake"]) { st.events = [{type:t}]; UI.events(st); }
      UI.flameWarnings(st);
      // les quatre causes de fin, plus la victoire
      for (const c of ["fall","stalker","roamer","quit"]) { st.endCause = c; UI.over(st, false); }
      UI.over(st, true);
      UI.toast("x"); UI.toastTick(9e9);
    }
  `, ctx);
} catch (e) { threw = e; }
ok("applyLang + hud + events + over exécutés dans les deux langues", !threw, threw ? String(threw.message) : `${fr.length} clés`);

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
process.exit(fails ? 1 : 0);
