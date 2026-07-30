/* =============================================================================
   tools/verify-carla.mjs — Carla Garfield vient-elle VRAIMENT au bon moment,
   et Léo la suit-il VRAIMENT sans tricher ?
   -----------------------------------------------------------------------------
       node public/templerun/tools/verify-carla.mjs    (depuis la racine du repo)

   Zip 376. Trois promesses sont faites par ce chantier, et aucune ne se relit :
   elles se mesurent.

     1. Carla ne se présente PAS tant que la ferme n'a pas 4 artisans installés,
        et elle se présente une fois qu'elle les a. On ne contrôle pas la
        condition écrite dans spawnVisitor : on tire 8 000 visiteurs par palier
        d'artisans et on regarde qui descend du train.
     2. Sa visite est une conversation, jamais autre chose — y compris à
        l'amitié maximale, où le roster bascule normalement sur une demande
        d'emménagement. Et le reste du roster continue d'offrir de tout
        (non-régression : la sortie anticipée `chatOnly` ne doit priver
        personne d'autre de ses offres).
     3. Léo n'occupe JAMAIS une case où Carla n'est pas passée. C'est toute la
        raison d'être de la position dérivée : le test rejoue un chemin en L
        (le cas où un suiveur naïf coupe le coin et traverse le mur) et vérifie
        case par case.

   Le script extrait `leoFollow` de FermeGame.js par appariement d'accolades :
   il teste le VRAI code du jeu, pas une reformulation qui pourrait diverger.

   Il est rangé ici parce que c'est le seul dossier d'outils du dépôt et que
   verify-gate.mjs y teste déjà la carte 2D depuis le même endroit.
   ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fermeDir = path.resolve(here, "../../../components/ferme");

/* Même contournement que verify-gate.mjs : le moteur importe "./fermeConstants"
   sans extension (Next le résout, Node non). Copie temporaire, extensions
   ajoutées, code du jeu intact. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-carla-"));
for (const f of ["fermeConstants.js", "fermeEngine.js", "fermeStrings.js"]) {
  fs.writeFileSync(path.join(tmp, f), fs.readFileSync(path.join(fermeDir, f), "utf8")
    .replace(/from\s+"\.\/(ferme[A-Za-z]+)"/g, 'from "./$1.js"'));
}
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);
const STR = (await import(pathToFileURL(path.join(tmp, "fermeStrings.js")).href)).FERME_STR;

let fails = 0;
const check = (ok, msg) => { console.log((ok ? "  OK   " : "  ECHEC") + " " + msg); if (!ok) fails++; };

// ---- Generateur deterministe (mulberry32) : resultats reproductibles ----
function rnd32(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const SKILLED = C.VISITOR_ROSTER.filter(v => v.skill).map(v => v.rid);
function station(nArtisans, rel) {
  return {
    residents: SKILLED.slice(0, nArtisans).map(rid => ({ rid })),
    visitors: [], blacklist: [], rel: rel || {}, lastRid: -1,
  };
}
const stockCtx = { stock: {}, };

// ---- 1. La porte des 4 artisans ----
console.log("\n1) Porte d'apparition (C.CARLA_MIN_ARTISANS = " + C.CARLA_MIN_ARTISANS + ")");
for (let n = 0; n <= 6; n++) {
  let seen = 0, draws = 0;
  const r = rnd32(1000 + n);
  for (let k = 0; k < 8000; k++) {
    const st = station(n);
    const v = E.spawnVisitor(st, r, stockCtx);
    if (!v) continue;
    draws++;
    if (v.rid === C.CARLA_RID) seen++;
  }
  const attendu = n >= C.CARLA_MIN_ARTISANS;
  check(attendu ? seen > 0 : seen === 0,
    n + " artisan(s) : Carla tiree " + seen + " fois sur " + draws + " (attendu : " + (attendu ? "> 0" : "0") + ")");
}
// forceRid ne doit pas non plus la faire venir trop tot
{
  const r = rnd32(7);
  let tot = 0;
  for (let k = 0; k < 500; k++) { const v = E.spawnVisitor(station(3), r, stockCtx, C.CARLA_RID); if (v && v.rid === C.CARLA_RID) tot++; }
  check(tot === 0, "forceRid=30 avec 3 artisans : jamais tiree (" + tot + ")");
  let tot2 = 0;
  for (let k = 0; k < 500; k++) { const v = E.spawnVisitor(station(4), r, stockCtx, C.CARLA_RID); if (v && v.rid === C.CARLA_RID) tot2++; }
  check(tot2 === 500, "forceRid=30 avec 4 artisans : toujours tiree (" + tot2 + "/500)");
}

// ---- 2. Elle ne fait QUE de la conversation, a tous les niveaux d'amitie ----
console.log("\n2) Nature de la visite (jusqu'a l'amitie maximale)");
{
  const types = new Map(), disps = new Map();
  const r = rnd32(42);
  for (const rel of [0, 3, 6, 12, 30, 100]) {
    for (let k = 0; k < 3000; k++) {
      const st = station(6, { [C.CARLA_RID]: rel });
      const v = E.spawnVisitor(st, r, stockCtx, C.CARLA_RID);
      if (!v) continue;
      types.set(v.offer.type, (types.get(v.offer.type) || 0) + 1);
      disps.set(v.disp, (disps.get(v.disp) || 0) + 1);
    }
  }
  check(types.size === 1 && types.has("chat"), "types d'offre observes : " + [...types.keys()].join(", "));
  check(!disps.has("hostile"), "jamais hostile (dispositions : " + [...disps.keys()].join(", ") + ")");
  check(!types.has("stay"), "ne demande jamais a emmenager, meme a rel=100 (REL_RESIDENT_MIN=" + C.REL_RESIDENT_MIN + ")");
}
// ...et le reste du roster n'a pas bouge : les autres continuent d'offrir de tout
{
  const types = new Set(); const r = rnd32(9);
  for (let k = 0; k < 20000; k++) {
    const st = station(6, Object.fromEntries(C.VISITOR_ROSTER.map(v => [v.rid, 40])));
    const v = E.spawnVisitor(st, r, stockCtx);
    if (v && v.rid !== C.CARLA_RID) types.add(v.offer.type);
  }
  check(types.has("buy") && types.has("stay") && types.has("chat"),
    "non-regression : les autres visiteurs offrent toujours " + [...types].sort().join("/"));
}

// ---- 3. Repliques : la forme du pool doit correspondre au tirage ----
console.log("\n3) Repliques de conversation");
{
  const fr = STR;
  for (const lang of ["fr", "en"]) {
    const pool = fr[lang].carlaChatLines;
    let ok = pool.length === C.VISITOR_CHAT_TIERS;
    for (const tier of pool) ok = ok && tier.length === C.VISITOR_CHAT_LINES && tier.every(l => typeof l === "string" && l.length > 0);
    check(ok, lang + " : " + pool.length + " paliers x " + pool[0].length + " lignes (attendu " + C.VISITOR_CHAT_TIERS + " x " + C.VISITOR_CHAT_LINES + ")");
    check(fr[lang].carlaScoldLines.length === C.CARLA_SCOLD_LINES, lang + " : " + fr[lang].carlaScoldLines.length + " rembarrages (attendu " + C.CARLA_SCOLD_LINES + ")");
  }
}

// ---- 4. Leo : il ne passe QUE la ou Carla est passee ----
console.log("\n4) Leo, position derivee de la trainee de Carla");
{
  // Reimplementation stricte de leoFollow (meme code, extrait de FermeGame.js
  // par appariement d'accolades : si la fonction change, ce test suit).
  const src = fs.readFileSync(path.join(fermeDir, "FermeGame.js"), "utf8");
  const head = "  function leoFollow(cx, cy, moving) {";
  const i = src.indexOf(head);
  let d = 0, j = src.indexOf("{", i), end = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) { end = k + 1; break; } } }
  const leoTrailRef = { current: null };
  const leoFollow = new Function("C", "leoTrailRef", src.slice(i, end).replace("  function leoFollow", "return function leoFollow"))(C, leoTrailRef);

  // Un chemin en L, comme une allee qui tourne a angle droit entre deux
  // batiments : c'est LA configuration ou un suiveur naif coupe le coin et
  // traverse le mur.
  const route = [];
  for (let t = 0; t <= 200; t++) route.push({ x: 10 + t * 0.05, y: 20 });
  for (let t = 1; t <= 200; t++) route.push({ x: 20, y: 20 + t * 0.05 });
  const walked = new Set(route.map(p => Math.round(p.x) + ":" + Math.round(p.y)));
  let maxGap = 0, minGap = 99, offPath = 0, jumps = 0, prev = null, stepNo = 0;
  for (const p of route) {
    stepNo++;
    const lp = leoFollow(p.x, p.y, true);
    const key = Math.round(lp.x) + ":" + Math.round(lp.y);
    if (!walked.has(key)) offPath++;
    if (prev) jumps = Math.max(jumps, Math.hypot(lp.x - prev.x, lp.y - prev.y));
    prev = lp;
    // l'ecart n'a de sens qu'une fois la trainee remplie
    if (stepNo > 40) {   // la traîne doit d'abord se remplir
      const gap = Math.hypot(lp.x - p.x, lp.y - p.y);
      maxGap = Math.max(maxGap, gap); minGap = Math.min(minGap, gap);
    }
  }
  check(offPath === 0, "aucune case occupee par Leo hors du chemin de Carla (" + offPath + ")");
  check(jumps < 0.2, "aucun saut : deplacement max par image = " + jumps.toFixed(3) + " tuile");
  // Tolerance = UN pas d'echantillonnage, et c'est une vraie propriete du
  // systeme, trouvee en lancant ce controle : tant que Carla n'a pas parcouru
  // C.LEO_TRAIL_MIN_STEP, aucun echantillon n'est ajoute, donc le retard de
  // Leo se mesure depuis le dernier point connu. Le retard reel oscille donc
  // entre LEO_FOLLOW_DIST et LEO_FOLLOW_DIST + LEO_TRAIL_MIN_STEP, soit moins
  // d'un pixel a l'ecran (0,05 tuile x 16 px). Le seuil doit le dire, pas le
  // masquer.
  const tol = C.LEO_FOLLOW_DIST + C.LEO_TRAIL_MIN_STEP;
  check(maxGap <= tol + 1e-9, "retard max " + maxGap.toFixed(3) + " tuile <= LEO_FOLLOW_DIST + un pas d'echantillonnage (" + tol.toFixed(2) + ")");
  check(minGap > C.LEO_FOLLOW_DIST * 0.55, "il ne lui rentre pas dedans dans le virage (min " + minGap.toFixed(2) + ")");

  // Teleportation (descente du train / changement de zone) : la trainee doit
  // etre videe, sinon Leo traverse la carte en ligne droite.
  const far = leoFollow(60, 60, false);
  check(Math.hypot(far.x - 60, far.y - 60) < 0.001, "teleportation : Leo est repose sur elle, pas en route vers elle");
  const after = leoFollow(60.05, 60, true);
  check(Math.hypot(after.x - 60, after.y - 60) < C.LEO_FOLLOW_DIST + 0.01, "trainee bien repartie de zero apres teleportation");

  // Immobile : il ne doit pas deriver.
  let drift = 0, last = null;
  for (let k = 0; k < 300; k++) { const lp = leoFollow(60.05, 60, false); if (last) drift += Math.hypot(lp.x - last.x, lp.y - last.y); last = lp; }
  check(drift < 0.001, "Carla a l'arret : Leo ne derive pas (" + drift.toFixed(4) + " tuile en 300 images)");
}

console.log(fails ? "\nECHEC — " + fails + " controle(s) en defaut." : "\nOK — Carla apparait au bon moment, ne fait que parler, et Leo ne quitte jamais ses traces.");
process.exit(fails ? 1 : 0);
