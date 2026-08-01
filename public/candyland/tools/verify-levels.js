/* =============================================================================
   tools/verify-levels.js — Les quinze niveaux sont-ils GAGNABLES ? (zip 385)
   -----------------------------------------------------------------------------
       node tools/verify-levels.js
       node tools/verify-levels.js 7          (un seul niveau, verbeux)

   Charge la VRAIE physique (js/physics.js) et les VRAIES données (js/levels.js)
   dans un contexte sans navigateur, puis cherche par tirages aléatoires une
   suite d'actions — instants de coupe des cordes, instants d'éclatement des
   bulles — qui amène le bonbon dans la bouche.

   Pourquoi ça vaut le coup : un niveau de Cut the Rope se conçoit à l'œil, et
   l'œil se trompe. Une corde 15 px trop courte, et l'arche ne passe plus
   au-dessus des acidulés — le niveau reste beau, joli à l'écran, et
   définitivement impossible. Aucune relecture ne trouve ça ; une machine qui
   essaie dix mille fois le trouve en trois secondes. C'est la même logique que
   verify-fairness.js pour la piste du défi de fuite.

   CE QUE L'OUTIL NE PROUVE PAS : il coupe les cordes directement, sans simuler
   le geste de souris. Il affirme donc qu'une TRAJECTOIRE gagnante existe, pas
   qu'elle est humainement atteignable. La difficulté reste un jugement — celui
   de Guillaume, sur captures. L'outil ne tranche que la question binaire :
   possible / impossible.

   Il imprime aussi la MARGE de chaque solution (nombre d'instants de coupe
   distincts qui gagnent, sur ceux essayés). Une marge très faible signale un
   niveau « au pixel près », qui sera vécu comme injuste même s'il est possible.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = vm.createContext({ Math, JSON, console });
for (const f of ["js/config.js", "js/physics.js", "js/levels.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const CFG = vm.runInContext("CFG", ctx);
const Phys = vm.runInContext("Phys", ctx);
const LEVELS = vm.runInContext("LEVELS", ctx);

const STEP_MS = 1000 / 60;   // le mini-jeu tourne à la cadence de l'écran
const MAX_MS = 9000;        // au-delà, le niveau est de toute façon perdu (immobilité)
const TRIALS = 3000;

/* Rejoue une partie complète à partir d'un plan d'actions.
   plan = { cuts: [ms|null], pops: [ms|null], blows: [{at, ang, len}] }

   ⚠️ ZIP 387 — LE SOUFFLE FAIT PARTIE DU PLAN. Sans lui, l'outil aurait
   déclaré le niveau 13 injouable alors qu'il est simplement conçu autour d'un
   mécanisme que le solveur ignorait. Un contrôle qui ne connaît pas toutes les
   commandes du jeu ne mesure pas la difficulté : il mesure sa propre ignorance.
   C'est le corollaire du périmètre trop étroit (zip 377, verify-fairness). */
function play(level, plan) {
  const st = Phys.makeState(level);
  let t = 0;
  const doneCut = new Array(st.ropes.length).fill(false);
  const donePop = new Array(st.bubbles.length).fill(false);
  const doneBlow = new Array((plan.blows || []).length).fill(false);
  while (st.status === "run" && t < MAX_MS) {
    for (let i = 0; i < st.ropes.length; i++) {
      const at = plan.cuts[i];
      /* ⚠️ ZIP 387 — `st.ropes[i].attached` N'EST PAS UNE PRÉCAUTION, C'EST LA
         RÈGLE DU JEU. `Phys.cut` refuse déjà les cordes non accrochées : une
         corde automatique qui n'a encore rien happé n'existe pas pour le
         joueur, il ne peut pas la trancher.

         Le solveur, lui, écrivait `cut = true` directement et pouvait donc
         DÉTRUIRE une corde automatique avant qu'elle serve — ce qu'aucun
         joueur ne peut faire. Résultat : les niveaux 7, 10 et 15 sortaient à
         moins de 0,1 % et paraissaient injustes alors qu'ils ne l'étaient pas.
         L'outil ne mesurait pas le niveau, il mesurait son propre écart avec
         le moteur.

         La coupe est donc simplement REPORTÉE tant que la corde n'est pas
         accrochée, ce qui est exactement ce que fait un joueur qui attend. */
      if (at !== null && !doneCut[i] && t >= at && st.ropes[i].attached) {
        st.ropes[i].cut = true; st.acted = true; st.cuts++; doneCut[i] = true;
      }
    }
    for (let i = 0; i < st.bubbles.length; i++) {
      const at = plan.pops[i];
      if (at !== null && !donePop[i] && t >= at) {
        const b = st.bubbles[i];
        b.popped = true; st.acted = true;
        if (st.inBubble === i) st.inBubble = -1;
        donePop[i] = true;
      }
    }
    for (let i = 0; i < doneBlow.length; i++) {
      const b = plan.blows[i];
      if (!doneBlow[i] && t >= b.at) {
        // Le souffle passe par la VRAIE fonction du moteur, avec ses seuils :
        // le solveur ne peut donc pas gagner par un geste qu'un joueur ne
        // pourrait pas faire.
        const c = st.candy;
        const x0 = c.x - Math.cos(b.ang) * b.len * 0.5, y0 = c.y - Math.sin(b.ang) * b.len * 0.5;
        Phys.blow(st, x0, y0, x0 + Math.cos(b.ang) * b.len, y0 + Math.sin(b.ang) * b.len);
        doneBlow[i] = true;
      }
    }
    Phys.step(st, STEP_MS);
    t += STEP_MS;
  }
  return st;
}

/* Un plan au hasard. Deux biais volontaires, tous deux tirés de la façon dont
   un humain joue réellement :
     - GROUPER : une chance sur trois que plusieurs cordes partagent le MÊME
       instant. Un joueur tranche souvent deux cordes d'un seul geste, et le
       niveau 15 ne se gagne même que comme ça. Un tirage strictement
       indépendant ne trouverait jamais ces solutions.
     - ATTENDRE : une bulle se crève rarement à l'instant zéro. */
function randomPlan(nRopes, nBubbles, rnd, blowAllowed) {
  const group = rnd() < 0.34 ? Math.round(rnd() * 4000) : null;
  const cuts = [];
  for (let i = 0; i < nRopes; i++) {
    if (group !== null && rnd() < 0.7) cuts.push(group);
    else cuts.push(rnd() < 0.08 ? null : Math.round(rnd() * 5000));
  }
  const pops = [];
  for (let i = 0; i < nBubbles; i++) pops.push(rnd() < 0.12 ? null : Math.round(300 + rnd() * 6000));
  const blows = [];
  if (blowAllowed) {
    const nb = rnd() < 0.35 ? 1 : 2;
    for (let i = 0; i < nb; i++) {
      blows.push({
        at: Math.round(rnd() * 5000),
        ang: rnd() * Math.PI * 2,
        len: CFG.BLOW_MIN_SWIPE + rnd() * (CFG.BLOW_MAX - CFG.BLOW_MIN_SWIPE),
      });
    }
    blows.sort((a, b) => a.at - b.at);
  }
  return { cuts, pops, blows };
}

// Générateur reproductible : un échec doit pouvoir être rejoué à l'identique.
function makeRng(seed) {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const only = process.argv[2] ? parseInt(process.argv[2], 10) : null;
let failures = [];

console.log(`Niveaux : ${LEVELS.length}   (attendu ${CFG.LEVELS})`);
if (LEVELS.length !== CFG.LEVELS) failures.push(`levels.js a ${LEVELS.length} niveaux, CFG.LEVELS en annonce ${CFG.LEVELS}`);

for (const lv of LEVELS) {
  if (only && lv.n !== only) continue;
  const rnd = makeRng(0x5EED + lv.n * 7919);
  const nR = (lv.ropes || []).length, nB = (lv.bubbles || []).length;
  // Une corde automatique ne se coupe pas tant qu'elle n'a rien happé : le
  // plan lui réserve quand même une case, le moteur ignore la coupe si elle
  // n'est pas accrochée.

  let wins = 0, best = null, bestStars = -1;
  for (let k = 0; k < TRIALS; k++) {
    const plan = randomPlan(nR, nB, rnd, !!lv.blow);
    const st = play(lv, plan);
    if (st.status === "won") {
      wins++;
      const s = Phys.starsGot(st);
      if (s > bestStars) { bestStars = s; best = plan; }
    }
  }
  const rate = (wins / TRIALS * 100).toFixed(2);
  const tot = (lv.stars || []).length;
  if (wins === 0) {
    failures.push(`niveau ${lv.n} : AUCUNE solution trouvée sur ${TRIALS} essais`);
    console.log(`  ${String(lv.n).padStart(2)} — INJOUABLE (0 / ${TRIALS})`);
  } else {
    const flag = wins < TRIALS * 0.002 ? "  ⚠ marge très faible" : "";
    console.log(`  ${String(lv.n).padStart(2)} — gagnable : ${wins}/${TRIALS} (${rate} %), sprinkles max ${bestStars}/${tot}${flag}`);
    if (only) console.log("       plan gagnant :", JSON.stringify(best));
    if (wins < TRIALS * 0.002) failures.push(`niveau ${lv.n} : marge très faible (${wins}/${TRIALS}) — probablement injuste`);
  }
}

if (failures.length) {
  console.log("\nÉCHECS :");
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
console.log("\nTous les niveaux sont gagnables.");
