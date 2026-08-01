/* =============================================================================
   report-maze.mjs — agrège les lots de batch-maze.mjs.
   -----------------------------------------------------------------------------
   La question à laquelle il répond est celle de Guillaume : le labyrinthe
   est-il « passionnant, stressant, à surprises et dangers » ? On ne sait pas
   mesurer « passionnant ». On sait mesurer trois choses qui, réunies, en sont
   la condition nécessaire :

     1. LE TAUX DE RÉUSSITE. Trop haut, le jeu est une promenade ; trop bas,
        c'est une loterie. Cible : 35 à 60 % pour un oracle qui ne panique
        jamais — donc nettement moins pour un humain.

     2. LA RÉPARTITION DES CAUSES DE MORT. C'est le chiffre le plus important
        du fichier. Trois dangers ont été demandés (trous, traqueur, rôdeurs) :
        s'ils ne tuent pas à peu près autant les uns que les autres, il n'y a
        pas trois dangers, il y en a un et deux décors.

     3. LA DURÉE. Un mini-jeu qui se joue entre deux tâches de ferme. Le
        Gourmandin fait 2 à 4 minutes par niveau, le défi de fuite 1 à 3.
        Cible : 3 à 6 minutes.

   Usage : node tools/report-maze.mjs parties.jsonl
   ========================================================================== */

import fs from "fs";

const rows = fs.readFileSync(process.argv[2] || "parties.jsonl", "utf8")
  .split("\n").filter(Boolean).map(JSON.parse).filter(r => r.status);

function stats(a) {
  if (!a.length) return "(aucune)";
  const s = a.slice().sort((x, y) => x - y);
  const q = (p) => +s[Math.min(s.length - 1, (s.length * p) | 0)].toFixed(1);
  return `min ${q(0)} · p25 ${q(0.25)} · méd ${q(0.5)} · p75 ${q(0.75)} · max ${q(0.999)} · moy ${+(s.reduce((x, y) => x + y, 0) / s.length).toFixed(1)}`;
}

const N = rows.length;
const causes = {};
for (const r of rows) {
  const k = r.status === "won" ? "SORTIE"
    : r.cause === "stuck" ? "BLOCAGE (panne)"
    : r.status === "falling" || r.cause === "fall" ? "chute (trou)"
    : r.cause === "roamer" ? "rôdeur"
    : r.cause === "stalker" ? "LE TRAQUEUR"
    : r.cause === "creature" ? "créature"
    : r.cause === "stuck" ? "BLOCAGE (panne)"
    : r.status === "play" ? "temps écoulé" : (r.cause || r.status);
  causes[k] = (causes[k] || 0) + 1;
}
const won = rows.filter(r => r.status === "won");
const pc = (n) => ((n / N) * 100).toFixed(1).padStart(5) + " %";

console.log(`\n=== ${N} parties jouées, image par image, par Rules.step() ===\n`);
console.log("Issues :");
for (const k of Object.keys(causes).sort((a, b) => causes[b] - causes[a])) {
  console.log(`  ${k.padEnd(14)} ${String(causes[k]).padStart(4)}  ${pc(causes[k])}`);
}
console.log(`\nRÉUSSITE : ${pc(won.length)}`);
console.log("\nDurée des parties gagnées (s)  :", stats(won.map(r => r.t)));
console.log("Score des parties gagnées     :", stats(won.map(r => r.score)));
console.log("Éclats ramassés (toutes)      :", stats(rows.map(r => r.shards)));
console.log("Créatures tuées (toutes)      :", stats(rows.map(r => r.kills)));
console.log("Brasiers rallumés (toutes)    :", stats(rows.map(r => r.torches)));
console.log("Dédale visité, %  (toutes)    :", stats(rows.map(r => +(r.seen / r.cells * 100).toFixed(1))));
console.log("Épée trouvée                  :", pc(rows.filter(r => r.sword).length));
console.log("Morts SANS épée               :", pc(rows.filter(r => !r.sword && r.status !== "won" && r.status !== "play").length));
console.log(`
Ce que ce rapport NE prouve PAS : rien de la lisibilité à l'écran, rien du
confort des commandes, rien de la peur — et la peur est l'objet du chantier.
L'oracle n'oublie jamais un brasier et ne panique pas : le taux de mort d'un
humain sera plus haut, jamais plus bas.
`);
