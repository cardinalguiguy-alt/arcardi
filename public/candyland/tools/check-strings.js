/* =============================================================================
   tools/check-strings.js — Parité FR/EN du mini-jeu, et couverture du HTML.
   -----------------------------------------------------------------------------
       node tools/check-strings.js

   Calqué sur public/templerun/tools/check-strings.js (zip 377), pour les mêmes
   raisons, apprises au même prix :

     1. Les deux blocs de CANDY_STR ont exactement les mêmes clés.
     2. Tout identifiant de index.html est déclaré dans la liste IDS de ui.js.
        Un oubli ne provoque AUCUNE erreur — il laisse un libellé vide, dans la
        langue qu'on ne teste jamais.
     3. ui.js est EXÉCUTÉ contre un faux DOM, dans les deux langues, sur tous
        ses chemins : titre, victoire, défaite, récompenses. La symétrie des
        clés ne suffit pas. Une clé FONCTION (wonSub, prizeGold, resumeAt)
        appelée alors qu'elle n'existe pas ne laisse pas un libellé vide : elle
        jette une exception en pleine partie, sur l'écran de victoire, c'est-à-
        dire exactement au moment où le joueur vient de gagner 10 000 pièces.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, "js/strings.js"), "utf8"), ctx, { filename: "strings.js" });
const S = vm.runInContext("CANDY_STR", ctx);

const failures = [];

/* ------------------------------------------------------ 1. parité des clés */
const fr = Object.keys(S.fr), en = Object.keys(S.en);
const A = new Set(fr), B = new Set(en);
const missEn = fr.filter(k => !B.has(k));
const missFr = en.filter(k => !A.has(k));
console.log(`Clés : fr=${fr.length}  en=${en.length}`);
if (missEn.length) failures.push("absentes du bloc en : " + missEn.join(", "));
if (missFr.length) failures.push("absentes du bloc fr : " + missFr.join(", "));

// Types identiques : une clé texte d'un côté et fonction de l'autre passerait
// le contrôle de parité et casserait à l'appel.
const typeMismatch = fr.filter(k => B.has(k) && typeof S.fr[k] !== typeof S.en[k]);
if (typeMismatch.length) failures.push("types différents entre fr et en : " + typeMismatch.join(", "));

const same = fr.filter(k => B.has(k) && S.fr[k] === S.en[k] && String(S.fr[k]).length > 3);
if (same.length) console.log("Identiques dans les deux langues (à vérifier à l'œil) : " + same.join(", "));

/* -------------------------------------------- 2. identifiants du HTML */
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ui = fs.readFileSync(path.join(root, "js/ui.js"), "utf8");
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]).filter(i => i !== "gl");
const listed = (ui.match(/const IDS = \[([\s\S]*?)\];/) || [])[1] || "";
const known = new Set([...listed.matchAll(/"([^"]+)"/g)].map(m => m[1]));
const unknown = ids.filter(i => !known.has(i));
console.log(`Identifiants du HTML : ${ids.length}, tous déclarés dans ui.js : ${unknown.length === 0}`);
if (unknown.length) failures.push("identifiants absents de IDS (libellés qui resteront vides) : " + unknown.join(", "));
const orphans = [...known].filter(i => !ids.includes(i));
if (orphans.length) console.log("Déclarés dans IDS mais absents du HTML (sans effet, à nettoyer) : " + orphans.join(", "));

/* ------------------------------------------------- 3. ui.js EXÉCUTÉ */
function fakeDom(list) {
  const nodes = {};
  for (const id of list) {
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
    document: { getElementById: (id) => nodes[id] || null, documentElement: {} },
  });
  vm.runInContext(fs.readFileSync(path.join(root, "js/strings.js"), "utf8"), uiCtx, { filename: "strings.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "js/config.js"), "utf8"), uiCtx, { filename: "config.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "js/ui.js"), "utf8"), uiCtx, { filename: "ui.js" });
  const UI = vm.runInContext("UI", uiCtx);
  const CFG = vm.runInContext("CFG", uiCtx);

  try {
    UI.bind();
    UI.applyLang(lang);
    UI.startButton(1);

    // Aucun libellé fixe ne doit rester vide. RUNTIME = ceux qui sont remplis
    // en jeu (compteurs) ou volontairement vides (erreur de chargement), plus
    // les conteneurs qui n'ont jamais de texte propre.
    const RUNTIME = new Set(["loadError", "level", "stars", "best",
      "wSub", "wStars", "wPrize", "xReason",
      "hud", "title", "pause", "won", "lost", "ending"]);
    const empties = ids.filter(id => !RUNTIME.has(id) && nodes[id]
      && !nodes[id].textContent && !nodes[id].innerHTML);
    if (empties.length) failures.push(`[${lang}] libellés restés vides après applyLang : ${empties.join(", ")}`);

    // Le bouton de départ doit CHANGER quand on reprend en cours de série.
    UI.startButton(1); const b1 = nodes.btnStart.textContent;
    UI.startButton(12); const b12 = nodes.btnStart.textContent;
    if (!b1 || !b12) failures.push(`[${lang}] bouton de départ vide`);
    if (b1 === b12) failures.push(`[${lang}] le bouton de départ ne dit pas où l'on reprend`);
    if (!/12/.test(b12)) failures.push(`[${lang}] le bouton de reprise n'affiche pas le numéro de niveau : "${b12}"`);

    // HUD.
    UI.hud(7, 2, 3, 6);
    if (!/7/.test(nodes.level.textContent)) failures.push(`[${lang}] le HUD n'affiche pas le niveau`);
    if (!/2/.test(nodes.stars.textContent)) failures.push(`[${lang}] le HUD n'affiche pas les sprinkles`);

    // Victoire ordinaire : pas d'encart de récompense.
    UI.won(3, 2, 3, "");
    if (!nodes.won.classList.contains("visible")) failures.push(`[${lang}] l'écran de victoire ne s'affiche pas`);
    if (nodes.wPrize.classList.contains("visible")) failures.push(`[${lang}] l'encart de récompense s'affiche sans récompense`);
    if (nodes.btnNext.style.display === "none") failures.push(`[${lang}] le bouton « suivant » est masqué au niveau 3`);

    // Victoire du dernier niveau : plus de « suivant » à proposer.
    UI.won(CFG.LEVELS, 3, 3, "test");
    if (nodes.btnNext.style.display !== "none") failures.push(`[${lang}] le bouton « suivant » reste affiché au dernier niveau`);
    if (!nodes.wPrize.classList.contains("visible")) failures.push(`[${lang}] l'encart de récompense ne s'affiche pas`);

    // Les trois causes de défaite ont chacune leur texte : afficher « tombé à
    // côté » après un acidulé ferait chercher au joueur une erreur qu'il n'a
    // pas commise.
    const seen = {};
    for (const r of ["fell", "spike", "rest"]) { UI.lost(r); seen[r] = nodes.xReason.textContent; }
    if (!seen.fell || !seen.spike || !seen.rest) failures.push(`[${lang}] une cause de défaite n'a pas de texte`);
    if (seen.fell === seen.spike || seen.fell === seen.rest || seen.spike === seen.rest) {
      failures.push(`[${lang}] deux causes de défaite partagent le même texte`);
    }

    // Les clés FONCTION de récompense, appelées pour de vrai.
    const L = UI.strings();
    for (const k of ["prizeGold", "wonSub", "wonStars", "resumeAt"]) {
      if (typeof L[k] !== "function") failures.push(`[${lang}] ${k} n'est pas une fonction`);
    }
    if (!/10000|10 000/.test(String(L.prizeGold(10000)).replace(/\u202f|\u00a0/g, " "))) {
      failures.push(`[${lang}] prizeGold n'insère pas le montant`);
    }
  } catch (e) {
    failures.push(`[${lang}] exception dans ui.js : ${e && e.message}`);
  }
}

if (failures.length) {
  console.log("\nÉCHECS :");
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
console.log("\nOK — parité, couverture du HTML et exécution de ui.js dans les deux langues.");
