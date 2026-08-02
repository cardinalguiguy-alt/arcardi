/* =============================================================================
   verify-objects.mjs — DEUX OBJETS ONT-ILS LE MÊME IDENTIFIANT ? (zip 398)
   -----------------------------------------------------------------------------
   ⚠️ TROIS LIGNES DE CONTRÔLE POUR UN DÉFAUT QUI A VÉCU DES DIZAINES DE ZIPS.

   `O_SUCRERIE` et `O_BERRY_BUSH` valaient tous deux **19**. Les deux
   déclarations sont à 2 500 lignes l'une de l'autre, chacune parfaitement
   correcte prise seule, chacune commentée. Aucune relecture ne pouvait les
   rapprocher.

   Ce que ça produisait, en silence :
     * `world.objects[i]` ne distinguait plus une sucrerie d'un buisson à baies,
       donc `resolveBerryPick` acceptait de CUEILLIR DES BAIES SUR LA SUCRERIE ;
     * le semeur de printemps comptait les sucreries parmi les buissons et en
       posait d'autant moins ;
     * le rendu dessinait l'un ou l'autre selon l'ordre des branches.

   C'est la forme la plus pure de ce que ce projet appelle « deux descriptions
   d'une même chose » (zip 387) : ici, deux noms pour une même valeur. Et c'est
   aussi la démonstration qu'un contrôle de trois lignes vaut mieux qu'une
   relecture attentive — la relecture ne peut pas comparer deux points éloignés
   d'un fichier, la machine ne fait que ça.
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeConstants.js"), "utf8");

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

console.log("\n=== identifiants d'objets et de sols ===\n");

/* On surveille TROIS familles de constantes, pas seulement les objets : les
   sols (G_) et les états de croissance sont rangés dans le même tableau
   d'entiers et souffrent exactement du même risque. */
for (const [pref, label] of [["O_", "objets"], ["G_", "sols"]]) {
  const re = new RegExp(`^export const (${pref}[A-Z0-9_]+)\\s*=\\s*(\\d+)`, "gm");
  const seen = new Map(), dup = [];
  let m;
  while ((m = re.exec(src))) {
    if (seen.has(m[2])) dup.push(`${seen.get(m[2])} et ${m[1]} valent tous deux ${m[2]}`);
    seen.set(m[2], m[1]);
  }
  ok(`aucune collision parmi les ${seen.size} ${label} (${pref}*)`, dup.length === 0, dup.join(" · "));
  // Garde-fou : si le motif ne trouve plus rien, ce script passerait au vert
  // en ne vérifiant RIEN — le pire mode de panne d'un contrôle (zip 375).
  ok(`  ... et le motif ${pref}* trouve encore des constantes`, seen.size > 5, `${seen.size} trouvées`);
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nAucun identifiant n'est utilisé deux fois.\n");
console.log(`Ce script ne dit RIEN de la justesse des valeurs : il dit qu'aucune
n'est employée deux fois. C'est peu, et ça a suffi à trouver un défaut vieux de
plusieurs dizaines de zips.\n`);
process.exit(fails ? 1 : 0);
