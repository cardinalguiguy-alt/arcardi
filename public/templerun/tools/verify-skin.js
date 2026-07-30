/* =============================================================================
   tools/verify-skin.js — La tenue du joueur voyage-t-elle VRAIMENT jusqu'au défi ?
   -----------------------------------------------------------------------------
       node tools/verify-skin.js

   Zip 377. Le seul endroit du projet où deux systèmes qui ne peuvent pas se
   lire l'un l'autre se parlent quand même : la ferme (React, fermeArt.js) et
   le défi (page autonome de public/, three.js). Entre les deux, un message
   postMessage et rien d'autre.

   C'est donc le seul endroit où une divergence ne lève AUCUNE erreur. Si
   charPalette se met à renvoyer "rgb(240,200,160)" au lieu de "#f0c8a0", ou si
   quelqu'un ajoute une neuvième tenue à OUTFITS sans toucher aux couleurs de
   cheveux, le défi affichera simplement un fermier par défaut — bleu, brun,
   masculin — et personne ne s'en apercevra avant d'avoir lancé une course avec
   un personnage féminin en rouge.

   Ce script fait donc le trajet complet, pour LES SEIZE combinaisons possibles
   (8 tenues × 2 genres) :

       fermeArt.charPalette()  ->  message vf-run-init  ->  Bridge.skin

   Il ne relit aucune des deux moitiés : il exécute la vraie fonction de la
   ferme et le vrai pont du défi, et compare ce qui ressort à ce qui est entré.

   (La suite du trajet — Bridge.skin -> matériaux three.js et pièces féminines —
   est vérifiée par tools/smoke-render.js, qui a déjà le faux three.js.)
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
// public/templerun/tools -> public/templerun -> public -> racine du projet
const projectRoot = path.join(root, "..", "..");
const artPath = path.join(projectRoot, "components", "ferme", "fermeArt.js");
const constPath = path.join(projectRoot, "components", "ferme", "fermeConstants.js");

const failures = [];

/* --------------------------------------------- CÔTÉ FERME : charPalette ---
   fermeArt.js est un module ES avec un import : on ne peut pas le charger tel
   quel dans un contexte vm. On en EXTRAIT la fonction par appariement
   d'accolades, exactement comme le fait le contrôle de syntaxe décrit au §4 du
   contexte — et on lui donne les vraies OUTFITS, relues de fermeConstants.js.
   Recopier les couleurs ici serait précisément le bug qu'on cherche. */
function loadFarmSide() {
  const art = fs.readFileSync(artPath, "utf8");
  const cst = fs.readFileSync(constPath, "utf8");

  const mOut = cst.match(/export const OUTFITS = \[([\s\S]*?)\n\];/);
  if (!mOut) { failures.push("OUTFITS introuvable dans fermeConstants.js"); return null; }
  const OUTFITS = vm.runInNewContext("[" + mOut[1] + "]");

  const grab = (name) => {
    const m = art.match(new RegExp("export const " + name + " = ([^;]+);"));
    if (!m) { failures.push(`${name} n'est plus exportée par fermeArt.js`); return null; }
    return vm.runInNewContext(m[1]);
  };
  const CHAR_HAIR_COLORS = grab("CHAR_HAIR_COLORS");
  const CHAR_SKIN = grab("CHAR_SKIN");
  if (!CHAR_HAIR_COLORS || !CHAR_SKIN) return null;

  const i = art.indexOf("export function charPalette(");
  if (i < 0) { failures.push("charPalette n'est plus exportée par fermeArt.js"); return null; }
  let j = art.indexOf("{", i), lvl = 0, k = j;
  for (; k < art.length; k++) {
    if (art[k] === "{") lvl++;
    else if (art[k] === "}") { lvl--; if (lvl === 0) break; }
  }
  const body = art.slice(i, k + 1).replace("export ", "");

  const c = vm.createContext({ C: { OUTFITS }, CHAR_HAIR_COLORS, CHAR_SKIN, Math });
  vm.runInContext(body + "\n", c, { filename: "fermeArt.charPalette" });
  return {
    charPalette: vm.runInContext("charPalette", c),
    OUTFITS, CHAR_HAIR_COLORS, CHAR_SKIN,
  };
}

/* ------------------------------------------------- CÔTÉ DÉFI : le pont ---
   On charge le VRAI bridge.js, avec un faux window juste assez complet pour
   qu'il s'installe, puis on lui livre le message comme le ferait la ferme. */
function loadBridge() {
  const listeners = {};
  const ORIGIN = "https://arcardi.test";
  const c = vm.createContext({
    Math, console, JSON,
    window: {
      location: { origin: ORIGIN },
      parent: {},                       // != window => embedded
      addEventListener: (n, f) => { listeners[n] = f; },
    },
    setInterval: () => 0, clearInterval: () => {},
  });
  vm.runInContext(fs.readFileSync(path.join(root, "js/config.js"), "utf8"), c, { filename: "config.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "js/bridge.js"), "utf8"), c, { filename: "bridge.js" });
  const Bridge = vm.runInContext("Bridge", c);
  Bridge.init(() => {});
  const CFG = vm.runInContext("CFG", c);
  return {
    CFG,
    send: (msg, origin) => listeners.message({ origin: origin || ORIGIN, data: msg }),
    get skin() { return Bridge.skin; },
    ORIGIN,
  };
}

const farm = loadFarmSide();
const bridge = loadBridge();

if (farm) {
  const hex = (s) => parseInt(String(s).slice(1), 16);
  let checked = 0;
  const seenHair = new Set();

  for (let outfit = 0; outfit < farm.OUTFITS.length; outfit++) {
    for (const gender of ["m", "f"]) {
      const pal = farm.charPalette(gender, outfit);
      bridge.send({ type: "vf-run-init", lang: "fr", best: 0, skin: pal });
      const got = bridge.skin;
      checked++;
      seenHair.add(pal.hair);

      if (!got) { failures.push(`tenue ${outfit}/${gender} : le pont n'a rien retenu`); continue; }
      if (got.gender !== gender) failures.push(`tenue ${outfit}/${gender} : genre reçu "${got.gender}"`);
      for (const key of ["shirt", "pants", "hair", "skin"]) {
        if (got[key] !== hex(pal[key])) {
          failures.push(`tenue ${outfit}/${gender} : ${key} = ${pal[key]} côté ferme, 0x${got[key].toString(16)} côté défi`);
        }
      }
      // Le repli ne doit JAMAIS servir sur une tenue valide : s'il sert, la
      // couleur est silencieusement remplacée par celle du fermier par défaut
      // et rien ne le signale.
      if (outfit !== 0 && got.shirt === bridge.CFG.COL_SHIRT) {
        failures.push(`tenue ${outfit} : le pont est retombé sur la couleur de repli`);
      }
    }
  }

  console.log(`Chaîne ferme -> défi : ${checked} combinaisons (${farm.OUTFITS.length} tenues × 2 genres) transmises et comparées.`);
  console.log(`  couleurs de cheveux distinctes traversées : ${seenHair.size}/${farm.CHAR_HAIR_COLORS.length}`);

  /* Une tenue sans couleur de cheveux propre passerait tous les contrôles
     ci-dessus (l'index reboucle) tout en donnant deux fermiers identiques.
     On exige donc autant de couleurs de cheveux que de tenues. */
  if (farm.CHAR_HAIR_COLORS.length < farm.OUTFITS.length) {
    failures.push(`${farm.OUTFITS.length} tenues pour seulement ${farm.CHAR_HAIR_COLORS.length} couleurs de cheveux : deux joueurs auront la même tête`);
  }

  /* --- Robustesse : ce qui ne doit PAS passer. ---------------------------- */
  const before = JSON.stringify(bridge.skin);
  bridge.send({ type: "vf-run-init", lang: "fr", skin: { gender: "f", shirt: "rouge", pants: 12, hair: null } });
  const after = bridge.skin;
  if (after.shirt !== bridge.CFG.COL_SHIRT || after.pants !== bridge.CFG.COL_PANTS || after.hair !== bridge.CFG.COL_HAIR) {
    failures.push("une couleur malformée n'est pas remplacée par la valeur de repli");
  }
  if (after.gender !== "f") failures.push("le genre est perdu quand une couleur est malformée");
  void before;

  // Message d'une autre origine : intégralement ignoré.
  const kept = JSON.stringify(bridge.skin);
  bridge.send({ type: "vf-run-init", lang: "en", skin: { gender: "m", shirt: "#000000", pants: "#000000", hair: "#000000", skin: "#000000" } }, "https://ailleurs.example");
  if (JSON.stringify(bridge.skin) !== kept) failures.push("un message d'une AUTRE origine a modifié la tenue");

  console.log(`  couleurs malformées remplacées par le repli, message d'origine étrangère rejeté.`);
}

if (failures.length) {
  console.log("\nÉCHEC :");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("\nOK — la tenue du fermier arrive intacte dans le défi, et rien d'autre n'y arrive.");
