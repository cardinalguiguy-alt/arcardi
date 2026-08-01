/* =============================================================================
   tools/check-strings.js — Parité FR/EN du défi, et couverture du HTML.
   -----------------------------------------------------------------------------
       node tools/check-strings.js

   Trois contrôles, et aucun des deux derniers n'est accessoire :

     1. Les deux blocs de RUN_STR ont exactement les mêmes clés. C'est la règle
        appliquée à fermeStrings.js dans la ferme ; le défi n'y échappe pas.
     2. Tout élément de texte de index.html est déclaré dans la liste IDS de
        ui.js. Un identifiant oublié là ne provoque AUCUNE erreur : il laisse
        simplement un libellé vide à l'écran, et on ne le voit que dans la
        langue qu'on ne teste jamais.
     3. ZIP 377 — ui.js est EXÉCUTÉ contre un faux DOM, dans les deux langues,
        y compris ses chemins neufs. La symétrie des clés ne suffit pas :
        l'audit du zip 370 l'avait déjà montré côté ferme. Et une clé
        FONCTION (exitIn) appelée alors qu'elle n'existe pas ne donne pas un
        libellé vide, elle jette une exception en pleine course.
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

/* ============================================ 3. ui.js EXÉCUTÉ (zip 377) ===
   Faux DOM minuscule : chaque élément retient son texte, ses classes et son
   style. On rejoue ensuite tout ce que l'interface fait en jeu, dans les deux
   langues, et on regarde ce qui est écrit — au lieu de croire que ça l'est. */
function fakeDom(ids) {
  const nodes = {};
  for (const id of ids) {
    nodes[id] = {
      id, textContent: "", innerHTML: "", style: {},
      _cls: new Set(),
      classList: {
        toggle(c, on) { const has = nodes[id]._cls.has(c); const want = on === undefined ? !has : !!on; if (want) nodes[id]._cls.add(c); else nodes[id]._cls.delete(c); },
        add(c) { nodes[id]._cls.add(c); },
        remove(c) { nodes[id]._cls.delete(c); },
        contains(c) { return nodes[id]._cls.has(c); },
      },
    };
  }
  return nodes;
}

for (const lang of ["fr", "en"]) {
  const nodes = fakeDom(ids);
  const uiCtx = vm.createContext({
    Math, console, JSON,
    document: { getElementById: (id) => nodes[id] || null },
    localStorage: { getItem: () => "0", setItem: () => {} },
    Bridge: { embedded: true, lang, externalBest: 1234, skin: null },
    alert: () => {},
  });
  vm.runInContext(fs.readFileSync(path.join(root, "js/strings.js"), "utf8"), uiCtx, { filename: "strings.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "js/config.js"), "utf8"), uiCtx, { filename: "config.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "js/ui.js"), "utf8"), uiCtx, { filename: "ui.js" });
  const UI = vm.runInContext("UI", uiCtx);
  const CFG = vm.runInContext("CFG", uiCtx);

  try {
    UI.init();
    // Aucun libellé fixe ne doit rester vide (sauf ceux qui le sont exprès :
    // le message d'erreur de chargement et les compteurs, remplis en jeu).
    const RUNTIME = new Set(["loadError", "score", "coins", "distance", "best",
      "finalScore", "finalCoins", "finalDistance", "finalBest", "deathReason",
      "exitHint", "fadeVeil", "escape", "title", "hud", "pause", "gameover",
      // Zip 385 : "revive" est le conteneur (comme "escape"), "rCountdown" un
      // chiffre posé par Game/UI à l'exécution, pas par applyLang.
      "revive", "rCountdown",
      "dangerFill"]);   // barre de remplissage : une largeur, pas un texte
    const empties = ids.filter(id => !RUNTIME.has(id) && nodes[id]
      && !nodes[id].textContent && !nodes[id].innerHTML);
    if (empties.length) failures.push(`[${lang}] libellés restés vides après applyLang : ${empties.join(", ")}`);

    // HUD : hors de portée, en approche, puis dans la fenêtre d'armement.
    UI.updateHud(1234.5, 7, 890, 0.4, null);
    if (nodes.exitHint.classList.contains("on")) failures.push(`[${lang}] le compte à rebours s'affiche sans sortie en vue`);
    UI.updateHud(1234.5, 7, 890, 0.4, 253);
    if (!nodes.exitHint.classList.contains("on")) failures.push(`[${lang}] le compte à rebours ne s'affiche pas à 253 u`);
    if (!/250/.test(nodes.exitHint.textContent)) failures.push(`[${lang}] distance mal arrondie : "${nodes.exitHint.textContent}"`);
    UI.updateHud(1234.5, 7, 890, 0.4, CFG.TURN_INPUT_WINDOW - 1);
    if (!nodes.exitHint.classList.contains("now")) failures.push(`[${lang}] la fenêtre d'armement n'est pas signalée`);
    UI.updateHud(1234.5, 7, 890, 0.4, null);
    if (nodes.exitHint.classList.contains("now")) failures.push(`[${lang}] le signal d'armement reste allumé après la sortie`);

    // Séquence de sortie.
    UI.showEscape(true);
    if (!nodes.escape.classList.contains("visible")) failures.push(`[${lang}] le bandeau de sortie ne s'affiche pas`);
    UI.setFade(0.5);
    if (nodes.fadeVeil.style.opacity !== "0.5") failures.push(`[${lang}] le voile de fondu ne suit pas`);
    UI.setFade(4); if (nodes.fadeVeil.style.opacity !== "1") failures.push(`[${lang}] le voile n'est pas borné à 1`);
    UI.showEscape(false);

    // Écrans de fin : la sortie offroad ne doit PAS s'intituler « Rattrapé ».
    UI.showGameOver(999, 3, 4050, "escape");
    const escTitle = nodes.oTitle.textContent, escReason = nodes.deathReason.textContent;
    UI.showGameOver(999, 3, 4050, "wolves");
    if (escTitle === nodes.oTitle.textContent) failures.push(`[${lang}] l'écran de fin affiche le même titre après une fuite et après une capture ("${escTitle}")`);
    if (!escReason || escReason === nodes.deathReason.textContent) failures.push(`[${lang}] la cause "escape" n'a pas son propre texte`);
    if (nodes.gameover && !nodes.gameover.classList.contains("visible")) failures.push(`[${lang}] l'écran de fin ne s'affiche pas`);
  } catch (e) {
    failures.push(`[${lang}] exception dans ui.js : ${e && e.message}`);
  }
}
console.log(`ui.js exécuté contre un faux DOM en fr et en en : HUD, compte à rebours, bandeau de sortie, fondu, écrans de fin.`);

if (failures.length) {
  console.log("\nÉCHEC :");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("\nOK — parité FR/EN, couverture du HTML, et interface réellement exercée.");
