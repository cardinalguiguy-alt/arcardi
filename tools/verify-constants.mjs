/* =============================================================================
   verify-constants.mjs — QUELLES CONSTANTES DE CONFIG NE SONT LUES PAR PERSONNE ?
   (zip 416)
   -----------------------------------------------------------------------------
       node tools/verify-constants.mjs

   ⚠️ CE SCRIPT EXISTE À CAUSE D'UNE SEULE LIGNE, ET ELLE VAUT D'ÊTRE RACONTÉE.

   `CFG.MOUSE_SENS = 0.0022;  // rad par pixel de souris` vit dans
   `public/labyrinth/js/config.js` depuis le zip 397. Elle est documentée dans le
   README. Elle est VÉRIFIÉE par `verify-controls.mjs`. Et pendant VINGT ZIPS,
   elle n'a été LUE nulle part : `js/input.js` initialisait sa sensibilité à 1 et
   n'appelait jamais `setSens()`. La souris tournait donc à un radian par pixel,
   soit 57° pour un frémissement du doigt, et le jeu était injouable à la main.

   ⚠️ AUCUN DES DIX BANCS D'ESSAI DU LABYRINTHE NE POUVAIT LE VOIR, et la raison
   est générale : `verify-controls.mjs` teste que le MOTEUR applique
   correctement l'angle qu'on lui donne, en lui donnant lui-même
   `200 × CFG.MOUSE_SENS`. Il suppose donc que l'entrée a déjà converti.

     UN TEST QUI FABRIQUE SES PROPRES ENTRÉES NE TESTE PAS LEUR PROVENANCE.

   Chaque fois qu'un banc d'essai remplace un module par une valeur écrite à la
   main, il crée exactement là un angle mort — et c'est là que se logent les
   défauts, parce que c'est la seule partie du code que personne ne regarde.

   D'où ce script, qui pose la question la plus bête possible : POUR CHAQUE
   CONSTANTE DÉCLARÉE, QUELQU'UN LA LIT-IL ?

   ─────────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QU'IL NE DIT PAS, ET IL FAUT LE LIRE AVANT DE « CORRIGER » SA SORTIE :

     * UNE CONSTANTE NON LUE N'EST PAS FORCÉMENT UN DÉFAUT. Beaucoup sont des
       couleurs de décor abandonnées, ou des réglages d'une mécanique remplacée
       (le modèle de dérapage du 412, remplacé par la carre au 413, a laissé
       DRIFT_ENTER et DRIFT_FULL derrière lui). Les supprimer est du ménage, pas
       une correction.
     * IL FAUT REGARDER CE QUE LE NOM PROMET. `MOUSE_SENS` promettait une
       conversion d'unité : non lue, elle voulait dire que la conversion
       n'existait pas. `COL_VINE` ne promet qu'une teinte : non lue, elle veut
       dire qu'il n'y a plus de lierre. La première est un bogue, la seconde un
       souvenir. ⚠️ MÉFIANCE PARTICULIÈRE POUR TOUT CE QUI PORTE UNE UNITÉ
       (_MS, _S, _SENS, _RATE, _SPEED) : une unité déclarée et non lue signale
       presque toujours une conversion manquante quelque part.
     * IL CHERCHE PAR TEXTE, PAS PAR ANALYSE. Une constante lue via
       `CFG[nomCalculé]` lui échappera. C'est grossier ; c'est au bon endroit,
       et c'est ce qui compte (voir plus haut).

   ⚠️ IL NE FAIT DONC PAS ÉCHOUER LE BUILD. Il RAPPORTE. Un contrôle qui crie au
   loup sur trente couleurs oubliées serait désactivé dans la semaine, et le
   jour où il trouverait un vrai MOUSE_SENS, personne ne le lirait.
   ========================================================================== */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

/* Les trois jeux 3D. Chacun a UN config.js qui possède tous ses nombres —
   c'est la règle du projet, et c'est elle qui rend ce script possible. */
const GAMES = ["candyluge", "labyrinth", "templerun"];

/* ⚠️ CE QUI SENT LA CONVERSION D'UNITÉ. Un nombre qui annonce une unité et que
   personne ne lit est un candidat sérieux ; une couleur non lue est du ménage.
   La liste vient de l'observation du projet, pas d'une théorie. */
const UNIT = /_(MS|S|SENS|RATE|SPEED|HZ|PER_SEC|DEG|RAD|PX)$/;

let suspects = 0, dead = 0;

function scan(game) {
  const dir = path.join(root, "public", game);
  const cfgPath = path.join(dir, "js", "config.js");
  if (!fs.existsSync(cfgPath)) return;
  const cfgSrc = fs.readFileSync(cfgPath, "utf8");

  /* Les deux façons de déclarer dans ce projet : membre de l'objet littéral
     (`  NOM: valeur,`) et affectation tardive (`CFG.NOM = valeur;`). */
  const names = new Set();
  for (const m of cfgSrc.matchAll(/^\s{0,4}([A-Z][A-Z0-9_]{2,}):/gm)) names.add(m[1]);
  for (const m of cfgSrc.matchAll(/^CFG\.([A-Z][A-Z0-9_]{2,})\s*=/gm)) names.add(m[1]);

  /* Tout le reste du jeu : les modules, les outils, la page. ⚠️ LES OUTILS
     COMPTENT — une constante que seul un banc d'essai lit est justement le cas
     de MOUSE_SENS, et c'est bien un défaut : elle était mesurée sans être
     employée. Le rapport le signale à part. */
  const read = { game: "", tools: "" };
  const push = (p, into) => { try { read[into] += fs.readFileSync(p, "utf8"); } catch { /* illisible : tant pis */ } };
  for (const f of fs.readdirSync(path.join(dir, "js"))) {
    if (f !== "config.js") push(path.join(dir, "js", f), "game");
  }
  if (fs.existsSync(path.join(dir, "index.html"))) push(path.join(dir, "index.html"), "game");
  const toolsDir = path.join(dir, "tools");
  if (fs.existsSync(toolsDir)) {
    for (const f of fs.readdirSync(toolsDir)) {
      const p = path.join(toolsDir, f);
      if (fs.statSync(p).isFile()) push(p, "tools");
    }
  }

  const uses = (src, n) => src.includes(`CFG.${n}`) || src.includes(`cfg.${n}`) || src.includes(`"${n}"`);

  const onlyTools = [], nobody = [];
  for (const n of [...names].sort()) {
    if (uses(read.game, n)) continue;
    (uses(read.tools, n) ? onlyTools : nobody).push(n);
  }

  console.log(`\n── ${game} — ${names.size} constantes déclarées`);

  /* ⚠️ LE CAS LE PLUS GRAVE EN PREMIER : lue PAR UN OUTIL et par personne
     d'autre. C'est la signature exacte de MOUSE_SENS — une valeur qu'on mesure
     sans l'employer, donc un contrôle qui rassure sur du vide. */
  if (onlyTools.length) {
    console.log(`   ⚠️⚠️ ${onlyTools.length} lue(s) SEULEMENT PAR UN OUTIL — le jeu, lui, les ignore :`);
    for (const n of onlyTools) console.log(`        ${n}`);
    suspects += onlyTools.length;
  }

  const withUnit = nobody.filter((n) => UNIT.test(n));
  const rest = nobody.filter((n) => !UNIT.test(n));
  if (withUnit.length) {
    console.log(`   ⚠️ ${withUnit.length} jamais lue(s) ET porteuse(s) d'une unité (conversion manquante ?) :`);
    for (const n of withUnit) console.log(`        ${n}`);
    suspects += withUnit.length;
  }
  if (rest.length) {
    console.log(`   · ${rest.length} jamais lue(s), sans unité — probablement du ménage :`);
    console.log(`        ${rest.join(", ")}`);
    dead += rest.length;
  }
  if (!onlyTools.length && !nobody.length) console.log("   toutes sont lues.");
}

console.log("\n=== verify-constants — qui lit quoi ? (zip 416) ===");
for (const g of GAMES) scan(g);

console.log(`\n${suspects} constante(s) à REGARDER, ${dead} probablement à jeter.\n`);
console.log(`⚠️ Ce script NE FAIT PAS ÉCHOUER LE BUILD, et c'est délibéré : un
contrôle qui crie au loup sur trente couleurs oubliées serait désactivé dans la
semaine, et le jour où il trouverait un vrai MOUSE_SENS, personne ne le lirait.
Il ne dit pas non plus qu'une constante non lue est un défaut — il dit qu'elle
n'est lue par personne, ce qui est une question, pas une réponse. La question
utile est toujours : QUE PROMET SON NOM ? Une unité promise et non lue est une
conversion qui manque ; une couleur promise et non lue est un souvenir.\n`);
