#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// verify-docs.mjs — LE NOYAU DE CLAUDE.md RESTE COURT, SON ROUTEUR RESTE VRAI (2026-10-03).
// ─────────────────────────────────────────────────────────────────────────────
// Le 2026-10-03, CLAUDE.md (1 661 lignes, ~47 k tokens relus à chaque session) a été
// découpé : un NOYAU court + `docs/*.md` à la demande + un ROUTEUR (tâche → fichiers).
// Ce découpage ne vaut que s'il ne pourrit pas. Trois façons de pourrir, trois contrôles :
//   1. le noyau regrossit (chaque livraison y ajoute un paragraphe) → plafond de lignes ;
//   2. le routeur désigne un fichier ou un banc qui n'existe plus (le stub menteur de la
//      doc : l'agent lit une plage qui n'existe pas et conclut « rien ») → existence ;
//   3. un titre de piège (le DÉCLENCHEUR du noyau) et son récit (`docs/PIEGES.md`)
//      divergent → les deux ensembles de titres doivent être égaux.
// ⚠️ Il publie ce qu'il a LU (§10 de CLAUDE.md) : un banc qui ne compte pas ses lectures
// peut annoncer « 0 fautif » sans avoir pu en voir un.
// ⚠️ Branché par hook-bancs.sh (tout `verify-*.mjs`) : il tourne donc à chaque session.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const MAX_NOYAU = 350;

let fails = 0;
function ok(nom, cond, detail = "") {
  if (!cond) fails++;
  console.log(`${cond ? "OK  " : "FAIL"} ${nom}${detail ? " — " + detail : ""}`);
}
const norm = (s) => s.replace(/[*`]/g, "").replace(/⚠️/g, "").replace(/\s+/g, " ").trim();
const between = (txt, a, b) => {
  const i = txt.indexOf(a), j = txt.indexOf(b);
  return i < 0 || j < 0 || j < i ? null : txt.slice(i + a.length, j);
};

const core = read("CLAUDE.md");
const coreLines = core.split("\n").length;
ok("le noyau de CLAUDE.md tient dans son plafond", coreLines <= MAX_NOYAU,
  `${coreLines} lignes / ${MAX_NOYAU} — au-dessus : passe d'élagage (docs/ENTRETIEN.md), pas un seuil relevé`);

// ── 2. le routeur ─────────────────────────────────────────────────────────────
const routeur = between(core, "<!-- routeur:début -->", "<!-- routeur:fin -->");
ok("le routeur est délimité dans CLAUDE.md", routeur !== null);
const tokens = new Set();
for (const src of [routeur || "", core]) {
  for (const m of src.matchAll(/`([^`\s]+)`/g)) {
    const t = m[1];
    // dans le routeur : tout chemin ou nom de banc ; ailleurs : seulement docs/*.md
    if (src === core && !/^docs\/[\w.-]+\.md$/.test(t)) continue;
    if (/^[\w@./-]+\.(js|mjs|md|sh|json)$/.test(t) || /^[\w./-]+\/$/.test(t) || /^(verify|render)-[\w-]+$/.test(t)) tokens.add(t);
  }
}
const SEARCH = ["", "components/ferme/", "tools/", "lib/", "components/"];
const missing = [];
for (const t of tokens) {
  const cands = /^(verify|render)-[\w-]+$/.test(t) ? [`tools/${t}.mjs`] : SEARCH.map((d) => d + t);
  if (!cands.some((c) => fs.existsSync(path.join(ROOT, c)))) missing.push(t);
}
ok("tout fichier, dossier ou banc cité par le routeur existe", missing.length === 0,
  missing.length ? "introuvables : " + missing.join(", ") : `${tokens.size} références lues`);

const docs = fs.readdirSync(path.join(ROOT, "docs")).filter((f) => f.endsWith(".md"));
const unlisted = docs.filter((f) => !core.includes(`docs/${f}`));
ok("chaque docs/*.md est désigné par le noyau", unlisted.length === 0, unlisted.join(", ") || `${docs.length} fichiers`);

// ── 3. titres de pièges ↔ récits ──────────────────────────────────────────────
const headBlock = between(core, "<!-- pieges:début -->", "<!-- pieges:fin -->");
ok("la liste des titres de pièges est délimitée", headBlock !== null);
const heads = new Set();
for (const l of (headBlock || "").split("\n")) {
  const m = l.match(/^- (.+)$/) || l.match(/^\*\*(.+)\*\*$/);
  if (m) heads.add(norm(m[1]));
}
const pieges = read("docs/PIEGES.md");
const piegesNorm = norm(pieges);
const noRecit = [...heads].filter((h) => !piegesNorm.includes(h));
ok("chaque titre du noyau a son récit dans docs/PIEGES.md", noRecit.length === 0 && heads.size > 0,
  noRecit.length ? "sans récit : " + noRecit.map((s) => s.slice(0, 50)).join(" | ") : `${heads.size} titres lus`);

// Les titres du récit sont extraits comme à la découpe : première partie en gras d'une puce.
const blocks = []; let cur = null;
for (const l of pieges.split("\n")) {
  if (/^- /.test(l) || /^\*\*[^*]+\*\*$/.test(l)) { cur = [l]; blocks.push(cur); }
  else if (cur && l.trim() !== "") cur.push(l); else cur = null;
}
const titresRecit = new Set();
for (const b of blocks) { const m = b.join(" ").replace(/\s+/g, " ").match(/\*\*(.+?)\*\*/); if (m) titresRecit.add(norm(m[1])); }
const orphelins = [...titresRecit].filter((t) => !heads.has(t));
ok("chaque piège de docs/PIEGES.md a son titre dans le noyau", orphelins.length === 0,
  orphelins.length ? "sans titre : " + orphelins.map((s) => s.slice(0, 50)).join(" | ") : `${titresRecit.size} récits lus`);

// ── AGENTS.md : point d'entrée de Codex, jamais étoffé (§2) ───────────────────
const agents = read("AGENTS.md");
ok("AGENTS.md reste un simple renvoi vers CLAUDE.md", agents.length < 1200 && agents.includes("CLAUDE.md"), `${agents.length} car.`);

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nNoyau, routeur et titres de pièges sont cohérents.\n");
process.exit(fails ? 1 : 0);
