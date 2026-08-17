/* =============================================================================
   verify-strings.mjs — PARITÉ FR/EN DE fermeStrings.js. (zip 398)
   -----------------------------------------------------------------------------
   La contrainte de bilinguisme du projet : chaque clé française a sa jumelle
   anglaise, et réciproquement. Une clé manquante ne casse rien — elle affiche
   `undefined` au milieu d'une phrase, chez l'autre joueur, et seulement pour
   lui. C'est le défaut le plus discret qu'un jeu bilingue puisse avoir.

   ⚠️ IL COMPTE AUSSI QUE LES CLÉS-FONCTIONS PRENNENT LE MÊME NOMBRE
   D'ARGUMENTS dans les deux langues. Une traduction qui oublie un paramètre
   affiche « undefined or » au lieu du prix, et personne ne s'en aperçoit tant
   qu'un anglophone ne joue pas.
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeStrings.js"), "utf8");

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

/* On découpe sur les deux en-têtes de table. Elles sont repérées par le motif
   `  fr: {` / `  en: {` — s'il changeait, ce script trouverait zéro clé et le
   dirait (voir le garde-fou plus bas), au lieu de passer au vert sans rien
   vérifier. C'est le pire mode de panne d'un contrôle. */
const iFr = src.indexOf("\n  fr: {"), iEn = src.indexOf("\n  en: {");
const bodyFr = src.slice(iFr, iEn), bodyEn = src.slice(iEn);

function keysOf(body) {
  const m = new Map();
  const re = /^\s{4}([A-Za-z][A-Za-z0-9_]*)\s*:\s*(\([^)]*\)\s*=>)?/gm;
  let x;
  while ((x = re.exec(body))) {
    const args = x[2] ? (x[2].replace(/[()=>]/g, "").trim() ? x[2].replace(/[()=>\s]/g, "").split(",").filter(Boolean).length : 0) : -1;
    m.set(x[1], args);
  }
  return m;
}
const FR = keysOf(bodyFr), EN = keysOf(bodyEn);

console.log(`\n=== parité des textes de la ferme ===\n`);

const missEn = [...FR.keys()].filter(k => !EN.has(k));
const missFr = [...EN.keys()].filter(k => !FR.has(k));
ok("chaque clé française a sa jumelle anglaise", missEn.length === 0, missEn.slice(0, 8).join(", "));
ok("chaque clé anglaise a sa jumelle française", missFr.length === 0, missFr.slice(0, 8).join(", "));
ok("les deux tables ont le même nombre de clés", FR.size === EN.size, `${FR.size} = ${EN.size}`);

const arity = [...FR.keys()].filter(k => EN.has(k) && FR.get(k) !== EN.get(k));
ok("les clés-fonctions prennent les mêmes paramètres dans les deux langues",
  arity.length === 0, arity.slice(0, 8).map(k => `${k} (fr ${FR.get(k)} / en ${EN.get(k)})`).join(", "));

// Garde-fou du garde-fou (leçon du zip 375 : un contrôle qui ne teste plus
// rien est pire qu'un contrôle absent, parce qu'il rassure).
ok("le découpage des deux tables marche encore", FR.size > 500 && EN.size > 500, `${FR.size} / ${EN.size}`);

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 450 — UNE CLÉ APPARIÉE N'EST PAS UNE CLÉ TRADUITE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ CE BANC A ÉTÉ VERT PENDANT SIX ZIPS PENDANT QUE LA QUÊTE ÉTAIT EN ANGLAIS
   DES DEUX CÔTÉS. Le bloc `fr` contenait littéralement `star: STAR_EN` : les clés
   étaient appariées — parfaitement, puisque c'était le MÊME OBJET — et les cinq
   contrôles ci-dessus n'avaient rien à redire. *Un banc qui mesure la bonne chose
   ne voit pas ce qu'on ne lui a pas demandé de mesurer* (§ CLAUDE.md, deuxième
   visage). La grandeur qui manquait n'est pas la clé, c'est la VALEUR.
   ⚠️ ON NE PEUT PAS EXIGER QUE CHAQUE PHRASE DIFFÈRE, et ce serait faux de le
   faire : « Valley Town », « OK », un emoji, un nom propre sont identiques dans les
   deux langues, et il y en a des dizaines. Ce qui n'est jamais légitime, c'est
   qu'une SECTION ENTIÈRE le soit — c'est la signature exacte du défaut qu'on
   corrige, et elle ne peut pas arriver par hasard sur huit phrases.
   ⚠️ `star.dev` est déclaré identique EXPRÈS (le menu développeur est un outil,
   pointé et non recopié) : il est nommé ici, ce qui est la seule façon honnête de
   l'excuser — une exception écrite se relit, une exception implicite se subit. */
{
  const { FERME_STR } = await import(path.join(ROOT, "components", "ferme", "fermeStrings.js")
    .replace(/^/, "file://"));
  const SHARED_ON_PURPOSE = new Set(["star.dev"]);
  const groups = new Map();     // chemin de section -> { same, total }
  (function walk(fr, en, at) {
    if (!fr || !en || typeof fr !== "object" || typeof en !== "object") return;
    for (const k of Object.keys(fr)) {
      const a = fr[k], b = en[k], p = at ? at + "." + k : k;
      if (a && typeof a === "object" && !Array.isArray(a)) { walk(a, b, p); continue; }
      if (typeof a !== "string" || typeof b !== "string") continue;
      const g = groups.get(at) || { same: 0, total: 0 };
      g.total++; if (a === b) g.same++;
      groups.set(at, g);
    }
  })(FERME_STR.fr, FERME_STR.en, "");
  let leaves = 0, twins = 0;
  const untranslated = [];
  for (const [at, g] of groups) {
    leaves += g.total; twins += g.same;
    if (!at || SHARED_ON_PURPOSE.has(at)) continue;
    /* Huit phrases : en dessous, une section peut légitimement être faite de noms
       propres. Au-dessus, l'identité complète n'est pas un hasard. */
    if (g.total >= 8 && g.same === g.total) untranslated.push(`${at} (${g.total} phrases)`);
  }
  ok("aucune SECTION n'est identique mot pour mot dans les deux langues",
     untranslated.length === 0, untranslated.join(", ") || `${groups.size} sections, ${leaves} phrases lues, ${twins} jumelles légitimes`);
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : `\nLes ${FR.size} clés sont appariées.\n`);
console.log(`Ce script ne dit RIEN de la QUALITÉ des traductions : il dit qu'aucune
clé ne manque et qu'aucune fonction n'a perdu un paramètre en route.\n`);
process.exit(fails ? 1 : 0);
