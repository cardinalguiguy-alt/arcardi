/* =============================================================================
   verify-crevasse.mjs — LE TROU QU'ON VOIT EST LE TROU QUI TUE.  (zip 405)
   -----------------------------------------------------------------------------
   Retour de Guillaume au 404 : « je suis mort en tombant dans le lac alors que
   je ne suis pas allé dans la crevasse. »

   Il avait raison deux fois, pour deux causes indépendantes :

     1. LE TROU DESSINÉ ET LE TROU MORTEL N'AVAIENT PAS LA MÊME FORME.
        world.js/buildFloor découpait un disque déchiqueté de 0,26 à 0,46 de
        cellule ; rules.js/handleFloor faisait tomber sur `gaps.has(j)`,
        c'est-à-dire la CELLULE ENTIÈRE. Entre les deux, 2,8 unités de pierre
        dessinée, praticable à l'œil, et mortelle. Dans les coins de cellule,
        jusqu'à 5,1.

     2. UNE DALLE EFFONDRÉE RESTAIT DESSINÉE POUR TOUJOURS.
        `buildFloor(cfg, m, st);` était appelé sans que son résultat soit
        gardé : plus personne ne pouvait toucher une dalle après la
        construction. Une dalle fêlée ne tremblait donc pas (CRACK_SHAKE était
        déclaré et lu par personne), et une dalle tombée continuait de se
        présenter comme de la pierre saine jusqu'à la fin de la partie. On
        pouvait y revenir vingt minutes plus tard et mourir dessus.

   ⚠️ CE SCRIPT A ÉTÉ ÉCRIT AVANT LA CORRECTION, ET ON A EXIGÉ QU'IL ÉCHOUE.
   C'est la leçon du 404, et elle a coûté cher : « un contrôle qui passe du
   premier coup sur du code non corrigé est un contrôle FAUX ». Premier
   lancement sur le code du 404 : 13 échecs sur 17 contrôles. Ce sont ces 13
   échecs-là, et rien d'autre, qui autorisent à faire confiance aux 17 quand
   ils passent.

   Ce qu'il NE prouve pas : que le bord déchiqueté est joli, qu'on comprend en
   jouant où poser le pied, ni que le tremblement d'une dalle qui cède fait
   peur. Ça se regarde et ça se joue.
   ========================================================================== */

import fs from "fs";
import path from "path";
import { load, ROOT } from "./lib-play.mjs";

const { CFG, Maze, Rules } = load(["js/config.js", "js/maze.js", "js/rules.js"]);
const W = fs.readFileSync(path.join(ROOT, "js/world.js"), "utf8");

/* ⚠️ LE CODE SANS SES COMMENTAIRES, ET C'EST UNE LEÇON DU PREMIER LANCEMENT.
   Le contrôle « world.js ne contient plus RAG_MIN » a échoué sur le code
   CORRIGÉ — parce que la correction laisse, exprès, un commentaire qui explique
   d'où venaient ces deux noms et pourquoi ils sont partis. Le contrôle avait
   raison de sonner (il cherchait bien ce qu'on lui demandait) et tort sur le
   fond : ce qu'on veut interdire, c'est que le DESSIN redécrive la forme, pas
   qu'on raconte l'histoire du défaut. Or ces commentaires-là sont la mémoire du
   chantier ; un contrôle qui pousse à les effacer coûte plus cher que ce qu'il
   protège. On juge donc le code, et on laisse le texte tranquille. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
const Wcode = strip(W);

/* ⚠️ LE REPLI SUR L'ANCIEN CODE, ET C'EST CE QUI FAIT DE CET OUTIL UNE MESURE
   PLUTÔT QU'UN INTERRUPTEUR. Lancé tel quel sur le zip 404, il jetait à son
   quatrième contrôle (`Rules.holeR is not a function`) : il échouait donc bien,
   mais il ne DISAIT rien — or ce qu'on veut savoir, c'est de combien le décor
   mentait. On rejoue donc ici les deux anciennes descriptions, mot pour mot :
   le trou DESSINÉ de world.js (rayon 0,26–0,46 bruité par l'angle) et le trou
   MORTEL de handleFloor (la cellule entière). Sur une version corrigée, ces
   deux lignes ne servent jamais.
   Règle générale : un contrôle qui plante ne compare rien, et on écrit ces
   contrôles-là pour comparer un avant et un après. */
const LEGACY = typeof Rules.holeR !== "function";
const hnoise = (i) => {
  let t = (i + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const R_MIN = CFG.HOLE_R_MIN === undefined ? 0.26 : CFG.HOLE_R_MIN;
const R_MAX = CFG.HOLE_R_MAX === undefined ? 0.46 : CFG.HOLE_R_MAX;
const SUB_N = CFG.HOLE_SUB === undefined ? 6 : CFG.HOLE_SUB;
const GRIP = CFG.HOLE_GRIP === undefined ? 0 : CFG.HOLE_GRIP;
const holeR = LEGACY
  ? (cfg, j, ang) => R_MIN + hnoise(j * 31 + ((ang * 3) | 0) * 7) * (R_MAX - R_MIN)
  : Rules.holeR;
/* ⚠️ DEUX QUESTIONS DISTINCTES, ET C'EST TOUT LE SUJET DU CHANTIER : « y a-t-il
   une dalle dessinée ici ? » et « est-ce que ça tue ici ? ». Sur le 405 elles
   ont la même réponse à la margelle près, et c'est justement ce qu'on contrôle.
   Sur le 404 elles n'avaient rien à voir, et les distinguer par un simple
   paramètre `margin` ne suffisait pas : `margin = 0` et `GRIP = 0` étant
   indiscernables dans l'ancien monde, le contrôle « aucune sous-dalle dessinée
   ne tue » passait à vide sur le code fautif — un contrôle muet, exactement ce
   que le 404 a appris à ne plus tolérer. Deux fonctions nommées, donc. */
const drawnHole = (j, fx, fz) => LEGACY
  ? Math.hypot(fx, fz) < holeR(CFG, j, Math.atan2(fz, fx))
  : Rules.inHole(CFG, j, fx, fz, 0);
const killsHole = (j, fx, fz) => LEGACY
  ? true                                       // ancien moteur : toute la cellule tue
  : Rules.inHole(CFG, j, fx, fz, GRIP);

let pass = 0, fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) { pass++; console.log(`  OK   ${label}${detail ? "  " + detail : ""}`); }
  else { fail++; console.log(`  ÉCHEC ${label}${detail ? "  " + detail : ""}`); }
};

console.log("\n=== verify-crevasse.mjs — le trou qu'on voit est le trou qui tue ===\n");

/* -------------------------------------------------------------------------
   1. UNE SEULE DESCRIPTION. Le dessin ne doit plus contenir la forme.
   ---------------------------------------------------------------------- */
ok(!/RAG_MIN|RAG_MAX/.test(Wcode),
  "world.js ne redécrit plus la forme du trou (RAG_MIN / RAG_MAX)");
ok(/Rules\.inHole\s*\(/.test(Wcode),
  "world.js DEMANDE la forme au moteur (Rules.inHole)");
ok(typeof Rules.inHole === "function" && typeof Rules.holeR === "function",
  "rules.js exporte holeR et inHole");
ok(/HOLE_R_MIN/.test(String(CFG.HOLE_R_MIN)) === false && R_MIN > 0 && R_MAX < 0.5 && CFG.HOLE_R_MIN !== undefined,
  "la forme vit dans config.js et ne touche pas le bord de cellule",
  `${CFG.HOLE_R_MIN} .. ${CFG.HOLE_R_MAX} (plafond 0.5)`);

/* -------------------------------------------------------------------------
   2. LA ZONE MORTELLE ÉPOUSE LE DESSIN.
   ----------------------------------------------------------------------
   On rejoue exactement la boucle de world.js/buildFloor : pour chaque
   sous-dalle POSÉE, le moteur doit dire « on ne tombe pas » ; pour chaque
   sous-dalle RETIRÉE au-delà de la margelle, il doit dire « on tombe ».
   ---------------------------------------------------------------------- */
{
  const m = Maze.generate(CFG, 4242);
  const st = Rules.create(CFG, m, 3);
  const SUB = SUB_N;
  let solidButDeadly = 0, voidButSafe = 0, samples = 0, deadly = 0;
  for (const j of st.gaps) {
    for (let sj = 0; sj < SUB; sj++) for (let si = 0; si < SUB; si++) {
      const fx = (si + 0.5) / SUB - 0.5, fz = (sj + 0.5) / SUB - 0.5;
      const drawn = !drawnHole(j, fx, fz);        // une dalle est posée ici
      const kills = killsHole(j, fx, fz);
      samples++;
      if (kills) deadly++;
      // Sur une dalle posée, on ne doit JAMAIS tomber. C'est le défaut signalé.
      if (drawn && kills) solidButDeadly++;
      // Au centre exact du vide, on doit tomber. (Le bord, lui, a le droit de
      // porter : c'est HOLE_GRIP, et c'est délibéré.)
      if (!drawn && !kills && Math.hypot(fx, fz) < R_MIN - GRIP) voidButSafe++;
    }
  }
  ok(solidButDeadly === 0,
    "aucune sous-dalle DESSINÉE ne tue", `${solidButDeadly} trouvée(s) sur ${samples}`);
  ok(voidButSafe === 0,
    "aucun vide franc ne porte", `${voidButSafe} trouvé(s)`);
  ok(deadly > 0 && deadly < samples * 0.55,
    "le vide occupe une part crédible de la cellule trouée",
    `${(100 * deadly / samples).toFixed(1)} %`);
}

/* -------------------------------------------------------------------------
   3. ON PEUT LONGER UN TROU. C'est la moitié utile de la correction : si le
      contournement reste impossible, on a corrigé un mensonge par un autre.
   ---------------------------------------------------------------------- */
{
  const m = Maze.generate(CFG, 4242);
  const st = Rules.create(CFG, m, 3);
  let worst = 1e9;
  for (const j of st.gaps) {
    // le point de la cellule le plus éloigné du vide, le long du mur
    let best = 0;
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const rHole = holeR(CFG, j, ang) - GRIP;
      // distance du bord du trou au bord de la cellule, dans cette direction
      const rCell = Math.min(0.5 / Math.abs(Math.cos(ang) || 1e-9),
                             0.5 / Math.abs(Math.sin(ang) || 1e-9));
      best = Math.max(best, (rCell - rHole) * CFG.CELL);
    }
    worst = Math.min(worst, best);
  }
  ok(worst > CFG.BODY_R * 2,
    "il reste partout de quoi passer à côté d'un trou",
    `passage le plus étroit ${worst.toFixed(2)} u pour un fermier de ${(CFG.BODY_R * 2).toFixed(2)}`);
}

/* -------------------------------------------------------------------------
   4. LE JOUEUR SUR LE BORD NE TOMBE PAS, CELUI DU CENTRE TOMBE.
      Contrôle DYNAMIQUE : on pose le fermier et on fait tourner le moteur.
      Un contrôle statique sur inHole prouverait la fonction, pas le jeu.
   ---------------------------------------------------------------------- */
{
  const m = Maze.generate(CFG, 4242);
  const j = [...Rules.create(CFG, m, 3).gaps][0];
  const cx = j % m.G, cy = (j / m.G) | 0;
  const [wx, wz] = Rules.centerOf(CFG, cx, cy);
  const run = (dx, dz) => {
    const st = Rules.create(CFG, m, 3);
    st.px = wx + dx; st.pz = wz + dz;
    Rules.step(st, 1 / 30, { fwd: 0, strafe: 0, turn: 0, turnDelta: 0, pitchDelta: 0 });
    return st.status;
  };
  ok(run(0, 0) === "falling", "au centre du trou, on tombe", run(0, 0));
  // le coin de la cellule : la pire position de l'ancien code
  const c = CFG.CELL * 0.5 - CFG.BODY_R - 0.1;
  ok(run(c, c) !== "falling", "dans le coin de la cellule, on ne tombe PLUS", run(c, c));
  ok(run(CFG.CELL * 0.47, 0) !== "falling", "contre le mur, on ne tombe pas", run(CFG.CELL * 0.47, 0));
}

/* -------------------------------------------------------------------------
   5. LA DALLE QUI CÈDE EST VISIBLE, ET ELLE DISPARAÎT.
   ---------------------------------------------------------------------- */
ok(/function\s+syncFloor/.test(Wcode),
  "world.js a une syncFloor : le rendu lit enfin l'état des dalles");
ok(/syncFloor\(st, cfg, t\);/.test(Wcode),
  "syncFloor est APPELÉE à chaque image (une fonction écrite et jamais appelée est un fichier mort)");
ok(/CRACK_SHAKE/.test(Wcode),
  "CRACK_SHAKE est enfin LU par le rendu (il ne l'était par personne)");
ok(/floorTiles/.test(Wcode) && /floorTiles\.set\(/.test(Wcode),
  "les dalles sont retenues par indice, donc retirables");
ok(/tile\.visible\s*=\s*false/.test(Wcode),
  "une dalle effondrée est RETIRÉE de la scène");
/* La cellule effondrée doit rester mortelle EN ENTIER — elle a cédé sous nos
   yeux, il n'y a plus rien. C'est le seul cas où « cellule = vide » est vrai,
   et il faut vérifier que la correction ne l'a pas emporté avec elle. */
{
  const m = Maze.generate(CFG, 4242);
  const st = Rules.create(CFG, m, 3);
  const c = [...st.cracks.values()][0];
  const jj = m.idx(c.x, c.y);
  st.fallen.add(jj);
  const [wx, wz] = Rules.centerOf(CFG, c.x, c.y);
  st.px = wx + CFG.CELL * 0.42; st.pz = wz + CFG.CELL * 0.42;   // dans un coin
  Rules.step(st, 1 / 30, { fwd: 0, strafe: 0, turn: 0, turnDelta: 0, pitchDelta: 0 });
  ok(st.status === "falling",
    "une dalle EFFONDRÉE reste mortelle sur toute sa surface", st.status);
}

console.log(`\n${fail === 0 ? "Tout est passé." : `${fail} contrôle(s) en échec.`}` +
  `  (${pass}/${pass + fail})\n`);
console.log(`Ce script ne dit RIEN de ce qu'on comprend en jouant : ni si le bord
déchiqueté se lit dans le noir, ni si le tremblement d'une dalle qui cède laisse
le temps de réagir. Il dit que le décor ne ment plus. Le reste se joue.\n`);
process.exit(fail === 0 ? 0 : 1);
