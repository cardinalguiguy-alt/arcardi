/* =============================================================================
   verify-cycle.mjs — LES ARBUSTES TRAVERSABLES, ET LE CYCLE QUI DIT VRAI.
                                                            (NEUF AU ZIP 401)
   -----------------------------------------------------------------------------
   Deux demandes de Guillaume au 400, et deux défauts de nature très
   différente — d'où un outil qui les couvre ensemble : ils touchent la même
   chose, la jouabilité de ce qu'on a sous la main.

   1. « Audit jouabilité des arbustes fruitiers. ils sont en dur, provoquent
      une collision or je veux pas cela. » Retirer deux identifiants de deux
      listes prend dix secondes ; ce qui prend du temps, c'est de savoir ce que
      ça CASSE. Ce script le demande au moteur plutôt qu'à la relecture :
      cueille-t-on encore un verger quand on est DEBOUT DESSUS ? L'abat-on
      encore à la hache ? Un rocher bloque-t-il toujours ?

   2. « Le 6 doit créer une rotation entre les ressources dont on dispose. »
      Elle EXISTAIT, depuis juillet, et il ne l'avait jamais trouvée. Le zip
      401 la rend visible — et la rendre visible crée aussitôt le risque
      classique : que la liste AFFICHÉE et la liste qui TOURNE deviennent deux
      descriptions d'une même chose (zip 387). Le jour où quelqu'un ajoute une
      variante à l'une, l'autre mentira, et personne ne le verra.

   ⚠️ CE QU'IL PEUT ET NE PEUT PAS FAIRE. FermeGame.js est du JSX : aucun
   parseur ici ne sait l'exécuter (registre npm bloqué, §4 du contexte). Le
   contrôle n° 2 est donc TEXTUEL, et il faut le savoir : il vérifie qu'il
   n'existe qu'UNE seule liste littérale de variantes dans le fichier, et que
   chaque cran du cycle a un nom court dans les deux langues. Il ne prouve pas
   que l'affichage est joli, ni que la rotation tourne dans le bon sens — ça,
   seul le fait de jouer le dira.

   Usage :  node tools/verify-cycle.mjs
   ========================================================================== */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "fermeStrings"]);
const C = mods.fermeConstants, E = mods.fermeEngine;
const S = mods.fermeStrings.FERME_STR;

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

console.log("\n=== arbustes traversables, et cycle honnête ===\n");

/* --------------------------------------------------------------------------
   1. LA COLLISION. On interroge le VRAI blockedTile, jamais une relecture de
      sa liste : c'est la seule façon de ne pas écrire un contrôle qui partage
      la convention du code qu'il vérifie (leçon du zip 394).
   -------------------------------------------------------------------------- */
const W = C.MAP_W, H = C.MAP_H;
const world = {
  w: W, h: H,
  ground: new Uint8Array(W * H).fill(C.G_GRASS),
  objects: new Uint8Array(W * H).fill(C.O_NONE),
  objHp: new Map(), orchards: new Map(), buildings: [],
};
const at = (x, y) => y * W + x;
const put = (x, y, o) => { world.objects[at(x, y)] = o; };

// Une case de chaque, côte à côte, loin des bords.
const X0 = 20, Y0 = 20;
const CASES = [
  ["verger",            C.O_ORCHARD,     false],
  ["buisson à baies",   C.O_BERRY_BUSH,  false],
  ["arbre",             C.O_TREE,        true],
  ["rocher",            C.O_ROCK,        true],
  ["clôture",           C.O_FENCE,       true],
  ["mur",               C.O_WALL,        true],
];
CASES.forEach(([, o], k) => put(X0 + k, Y0, o));

for (let k = 0; k < CASES.length; k++) {
  const [label, , shouldBlock] = CASES[k];
  const blocked = E.blockedTile(world, X0 + k + 0.5, Y0 + 0.5);
  ok(`${label.padEnd(18)} ${shouldBlock ? "bloque" : "se traverse"} à pied`,
     blocked === shouldBlock, blocked ? "bloqué" : "passant");
}
/* ⚠️ À CHEVAL AUSSI, et ce n'est pas redondant : blockedTileMounted est une
   SECONDE liste, écrite à la main à côté de la première depuis le chantier de
   juillet. Deux listes qui doivent rester égales finissent toujours par
   diverger — ici on le vérifie au lieu de l'espérer. */
for (let k = 0; k < CASES.length; k++) {
  const [label, , shouldBlock] = CASES[k];
  const blocked = E.blockedTileMounted(world, X0 + k + 0.5, Y0 + 0.5);
  ok(`${label.padEnd(18)} ${shouldBlock ? "bloque" : "se traverse"} à cheval`,
     blocked === shouldBlock, blocked ? "bloqué" : "passant");
}

/* --------------------------------------------------------------------------
   2. CE QUE LA TRAVERSABILITÉ AURAIT PU CASSER. On se met DEBOUT SUR le
      verger — la case que targetTile() vise à distance nulle — et on cueille.
   -------------------------------------------------------------------------- */
const f = { inv: { saplings: {}, berries: 0, wood: 0 }, tools: { axe: 1 } };
const ox = X0, oy = Y0;
/* ⚠️ LA FORME DE L'ENTRÉE EST RECOPIÉE DE resolveOrchardPick, PAS DEVINÉE.
   La première version de ce contrôle écrivait `{ kind: "lemon", ... }` alors
   que le moteur lit `o.k` (un INDICE) et `o.ripe`. Le contrôle échouait donc
   en accusant le jeu d'un défaut qui était le sien — le cas le plus coûteux
   qui soit, parce qu'on commence par corriger le mauvais fichier. */
world.orchards.set(at(ox, oy), {
  k: 0, plantedAt: Date.now() - C.ORCHARDS[0].matureMs - 1,
  ripe: 3, nextAt: 0,
});
const pick = E.resolveOrchardPick(f, world, ox, oy);
ok("debout SUR le verger, on le cueille encore", pick.ok === true,
   pick.ok ? `${pick.n} ${pick.fruit}` : "refusé : " + (pick.toast || "?"));

put(X0 + 1, Y0, C.O_BERRY_BUSH);
const bp = E.resolveBerryPick(f, world, X0 + 1, Y0, () => 0.5);
ok("debout SUR le buisson, on le cueille encore", bp.ok === true, `${bp.n || 0} baie(s)`);

/* --------------------------------------------------------------------------
   3. LE CYCLE. Contrôle TEXTUEL, et il dit ce qu'il ne prouve pas (voir
      l'en-tête).
   -------------------------------------------------------------------------- */
const game = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");

/* Une seule liste littérale de variantes dans tout le fichier. C'est LE
   contrôle du chantier : si l'affichage s'en recopiait une deuxième, ce
   compte passerait à deux et l'outil casserait avant que le mensonge
   n'atteigne l'écran. */
const literals = game.match(/\["fence",\s*"wall",\s*"path"/g) || [];
ok("une seule description du cycle de construction dans FermeGame.js",
   literals.length === 1, `${literals.length} liste(s) littérale(s)`);

// Et l'affichage doit bien appeler les fonctions, pas se débrouiller seul.
ok("l'affichage lit buildCycle() et toolCycle()",
   /const cyc = isTools \? toolCycle\(\) : isFence \? buildCycle\(\)/.test(game));

/* Chaque cran du cycle a-t-il un nom court, dans les DEUX langues ? Un cran
   sans nom afficherait une étiquette vide, et une étiquette vide sur la case
   qu'on tient est pire que pas d'étiquette du tout. */
const KINDS = ["fence", "wall", "path", "lamp", "scarecrow", "grass", "mill",
               "cauldron", "bridgeWood", "bridgeStone", "bridgeRenovate"];
for (const lang of ["fr", "en"]) {
  const missing = KINDS.filter(k => !(S[lang].buildNames && S[lang].buildNames[k]));
  ok(`toutes les variantes ont un nom court en ${lang}`, missing.length === 0,
     missing.length ? "MANQUANTES : " + missing.join(", ") : `${KINDS.length} noms`);
}
for (const lang of ["fr", "en"]) {
  const key = lang === "en" ? "saplingNameEn" : "saplingName";
  const missing = C.ORCHARDS.filter(o => !o[key]);
  ok(`tous les plants de verger ont un nom en ${lang}`, missing.length === 0);
}

/* La boutique annonçait « touche 8 » pour la case construction, qui est la 6
   depuis la réorganisation de la barre. Un texte d'aide qui donne la mauvaise
   touche est la pire affordance possible : il ne manque pas l'information, il
   la contredit. */
const strSrc = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeStrings.js"), "utf8");
ok("aucun texte n'annonce plus la mauvaise touche pour la construction",
   !/\(touche 8\)|\(key 8\)/.test(strSrc));

/* --------------------------------------------------------------------------
   4. LE MOULIN NE REFUSE PLUS EN SILENCE — zip 402.
      Guillaume : « j'en pose ils disparaissent aussitôt. Et après on me dit
      que le nombre max est atteint. » Le moteur, interrogé, refusait de poser
      sur quinze sols SANS RIEN DIRE, reprenait le moulin au deuxième clic SANS
      RIEN DIRE, et sortait en silence quand on déposait du blé sans moulin
      construit. Aucune règle n'a changé au 402 : ce sont les phrases qui
      manquaient. Ce contrôle vérifie qu'aucun chemin ne redevient muet.
   -------------------------------------------------------------------------- */
const mw = () => ({ w: W, h: H,
  ground: new Uint8Array(W * H).fill(C.G_GRASS), objects: new Uint8Array(W * H).fill(C.O_NONE),
  objHp: new Map(), crops: new Map(), mills: new Map(), sucreries: new Map(), orchards: new Map(),
  buildings: [], bridgeSites: [], bridgeLeverPos: [], riverCenter: [], monsters: [] });
const mf = () => ({ x: 30, y: 30, energy: 100, inv: { mill: 3, crops: {} }, tools: {} });

{
  const w = mw(), f = mf(), i = at(30, 30);
  const r1 = E.resolveAct(w, f, { action: "mill", x: 30, y: 30 });
  ok("poser un moulin le DIT", !!r1.toast, r1.toast || "MUET");
  ok("poser un moulin le pose", w.objects[i] === C.O_MILL);
  const r2 = E.resolveAct(w, f, { action: "mill", x: 30, y: 30 });
  ok("⚠️ le 2e clic reprend le moulin et le DIT", !!r2.toast, r2.toast || "MUET — c'est le bug du 402");
}
{
  /* Les quinze sols qui refusaient sans un mot. On les balaie TOUS plutôt que
     d'en citer trois : un sol ajouté demain doit hériter du message, et c'est
     un balayage qui le garantit, pas une liste écrite à la main. */
  let mute = [];
  for (const gk of Object.keys(C).filter(k => k.startsWith("G_"))) {
    const w = mw(), f = mf(), i = at(30, 30);
    w.ground[i] = C[gk];
    const r = E.resolveAct(w, f, { action: "mill", x: 30, y: 30 });
    if (w.objects[i] !== C.O_MILL && !r.toast) mute.push(gk);
  }
  ok("aucun sol ne refuse le moulin en silence", mute.length === 0,
     mute.length ? "MUETS : " + mute.join(", ") : "tous les sols répondent");
}
{
  const w = mw(), f = mf(), i = at(30, 30);
  w.ground[i] = C.G_TILLED; w.crops.set(i, { t: 0, n: 1 });
  const r = E.resolveAct(w, f, { action: "mill", x: 30, y: 30 });
  ok("une culture sur la case le DIT", !!r.toast, r.toast || "MUET");
}
{
  /* ⚠️ LE SCÉNARIO RÉEL, ET LA PREMIÈRE VERSION DE CE CONTRÔLE AVAIT TORT.
     Elle cliquait sur de l'HERBE : millDeposit sort alors bien plus haut, et
     se taire est la bonne réponse — on n'a pas cliqué un moulin. Le cas de
     Guillaume est autre : le moulin EXISTE mais son chantier d'une heure n'est
     pas fini. Il n'entre donc pas dans millIdx, et le joueur n'apprenait rien.
     Un contrôle qui se trompe de scénario accuse le jeu d'un défaut qui est le
     sien — le plus cher de tous, parce qu'on corrige le mauvais fichier. */
  const w = mw(), f = mf(), i = at(30, 30);
  E.resolveAct(w, f, { action: "mill", x: 30, y: 30 });      // pose : chantier d'1 h
  f.inv.crops[C.MILL_WHEAT_CROP] = 20;
  const r = E.resolveAct(w, f, { action: "millDeposit", x: 30, y: 30 });
  ok("déposer du blé dans un moulin EN CHANTIER le DIT", !!r.toast, r.toast || "MUET");
  ok("… et ce n'est PAS « le moulin est plein »", r.toast !== "millFull", r.toast || "-");
  void i;
}
{
  /* Le message doit exister dans les deux langues, sinon le moteur parle et
     l'interface affiche « undefined ». */
  const KEYS = ["toastMillPlaced", "toastMillTaken", "toastMillGround",
                "toastMillOccupied", "toastMillOnCrop", "toastNoMillBuilt"];
  for (const lang of ["fr", "en"]) {
    const missing = KEYS.filter(k => !S[lang][k]);
    ok(`les messages du moulin existent en ${lang}`, missing.length === 0, missing.join(", "));
  }
}
const gameSrc = game;
ok("les nouveaux messages sont BRANCHÉS dans la table de FermeGame.js",
   /millPlaced: L\.toastMillPlaced/.test(gameSrc) && /noMillBuilt: L\.toastNoMillBuilt/.test(gameSrc));

/* --------------------------------------------------------------------------
   5. LA BARRE D'INVENTAIRE — zip 403.
      Guillaume a demandé de fusionner des cases et d'en supprimer deux. La
      position d'une case était comparée EN CHIFFRE à trente endroits de
      FermeGame.js : réordonner la barre, c'était retrouver trente comparaisons
      dans seize mille lignes, et **une seule oubliée donne une touche qui fait
      silencieusement autre chose**.

      ⚠️ CE CONTRÔLE A ÉTÉ ÉCRIT AVANT LA CORRECTION, ET IL A ÉCHOUÉ — c'est
      comme ça qu'on sait qu'il mesure quelque chose. Il interdit désormais
      qu'un seul indice en chiffre revienne : le jour où quelqu'un réécrit
      `slotRef.current === 3` par réflexe, l'outil casse avant le jeu.
   -------------------------------------------------------------------------- */
{
  /* On enlève d'abord les commentaires : un exemple cité dans une explication
     n'est pas du code, et un contrôle qui ne sait pas les distinguer oblige à
     écrire des commentaires évasifs — donc à moins bien documenter. */
  const code = game.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const hard = code.match(/slotRef\.current [=!<>]==? \d|\bsl [=!]== \d|selectSlot\(\d|\bslot === \d/g) || [];
  ok("⚠️ aucun indice de case n'est écrit en chiffre", hard.length === 0,
     hard.length ? "EN DUR : " + hard.join(" · ") : "tout passe par SLOT.*");

  ok("l'ordre de la barre n'est décrit qu'une fois",
     (game.match(/const SLOT_ORDER = /g) || []).length === 1);

  /* La barre attendue, telle que Guillaume l'a arrêtée : cinq cases, la canne
     et les snacks descendus dans le sac. */
  const m = game.match(/const SLOT_ORDER = \[([^\]]*)\]/);
  const order = m ? m[1].split(",").map(x => x.trim().replace(/["']/g, "")).filter(Boolean) : [];
  ok("la barre a bien cinq cases", order.length === 5, order.join(" · "));
  ok("ni la nourriture ni la canne n'ont plus de case",
     !order.includes("food") && !order.includes("rod"));
  ok("troupeau et main sont fusionnés en une case", order.includes("carry"));

  /* ⚠️ LA TOUCHE ANNONCÉE DANS LES TEXTES DOIT ÊTRE LA VRAIE.
     Au 401 on avait corrigé « touche 8 » en « touche 6 » ; le 403 déplace la
     construction en 4. Un contrôle qui cherchait « touche 8 » aurait laissé
     passer « touche 6 ». Il compare donc à la POSITION RÉELLE, calculée. */
  const buildKey = order.indexOf("build") + 1;
  ok("la position de la case construction est connue", buildKey > 0, "touche " + buildKey);
  const wrongFr = (strSrc.match(/\(touche (\d)\)/g) || []).filter(t => t !== `(touche ${buildKey})`);
  const wrongEn = (strSrc.match(/\(key (\d)\)/g) || []).filter(t => t !== `(key ${buildKey})`);
  ok("tous les textes annoncent la BONNE touche de construction",
     wrongFr.length === 0 && wrongEn.length === 0,
     [...wrongFr, ...wrongEn].join(", ") || `touche ${buildKey} partout`);
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nTout est passé.\n");
console.log(`Ce script ne dit RIEN de l'apparence de la barre : ni le chevron, ni
l'étiquette de variante ne sont vérifiables sans navigateur. Il dit que les
arbustes se traversent VRAIMENT, que les cueillir marche encore quand on est
dessus, et que ce qui est affiché ne peut pas diverger de ce qui tourne.\n`);
process.exit(fails ? 1 : 0);
