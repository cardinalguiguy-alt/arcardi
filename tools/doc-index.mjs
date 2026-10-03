#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// doc-index.mjs — LIRE UNE PLAGE EXACTE AU LIEU DE « LARGEMENT AUTOUR » (2026-10-03).
// ─────────────────────────────────────────────────────────────────────────────
// Pourquoi : FermeGame.js fait ~41 000 lignes, fermeArt.js ~20 000, le README de
// la ferme ~5 600. Aucun agent (Claude, Codex) ne les lit en entier ; ce qui
// coûtait cher était de grep un symbole puis de lire large autour, faute de
// connaître où il finit. Cet outil donne, pour chaque section ou fonction,
// `début-fin` : on lit alors UNE plage (Read offset/limit, ou sed -n 'a,bp').
//
//   node tools/doc-index.mjs <fichier.md|.js> [motif] [--all]
//
//   .md : titres (niveaux 1-3, `--all` pour 1-6) avec leur plage et leur taille.
//   .js : fonctions (déclarations et flèches, indentation ≤ 6), tables de haut
//         niveau (`const X = {` / `[`) et bandeaux `// ====`, avec leur plage.
//   motif (facultatif) : sous-chaîne, insensible à la casse, sur le nom/titre.
//
// ⚠️ Rien n'est généré dans le dépôt : l'index se recalcule à la demande (~50 ms),
// donc il ne peut pas vieillir — c'est la leçon n°2 du §14.2 de CLAUDE.md
// (un chiffre recopié a deux endroits où mentir).
// ⚠️ La fin d'une fonction est trouvée par l'indentation (première accolade
// fermante à la même colonne) : exacte pour ce code, qui est indenté
// régulièrement ; une fonction écrite sur une ligne a début = fin.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";

const args = process.argv.slice(2);
const all = args.includes("--all");
const rest = args.filter((a) => a !== "--all");
const file = rest[0];
const motif = (rest[1] || "").toLowerCase();
if (!file) {
  console.error("usage : node tools/doc-index.mjs <fichier.md|.js> [motif] [--all]");
  process.exit(1);
}
const lines = fs.readFileSync(file, "utf8").split("\n");
const rows = []; // { start, end, label }

if (file.endsWith(".md")) {
  const maxLevel = all ? 6 : 3;
  let inFence = false;
  const heads = [];
  lines.forEach((l, i) => {
    if (/^```/.test(l)) inFence = !inFence;
    if (inFence) return;
    const m = l.match(/^(#{1,6}) +(.*)$/);
    if (m && m[1].length <= maxLevel) heads.push({ i: i + 1, level: m[1].length, text: m[2].trim() });
  });
  heads.forEach((h, k) => {
    let end = lines.length;
    for (let j = k + 1; j < heads.length; j++) {
      if (heads[j].level <= h.level) { end = heads[j].i - 1; break; }
    }
    rows.push({ start: h.i, end, label: `${"  ".repeat(h.level - 1)}${"#".repeat(h.level)} ${h.text}` });
  });
} else {
  const reFn = /^(\s{0,6})(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)/;
  const reArrow = /^(\s{0,6})(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\(|function\b|\w+\s*=>)/;
  const reTable = /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*[[{]\s*(?:\/\/.*)?$/;
  const reBanner = /^\s*\/\/\s*[=═─-]{6,}\s*(.*?)\s*[=═─-]*\s*$/;
  const endOf = (i, indent) => {
    const t = lines[i].trimEnd();
    const open = (t.match(/[{[(]/g) || []).length;
    const close = (t.match(/[}\])]/g) || []).length;
    if (open === close && /[;}]\s*(\/\/.*)?$/.test(t)) return i + 1;
    const closer = new RegExp(`^ {${indent}}[}\\])]`);
    for (let j = i + 1; j < Math.min(lines.length, i + 4000); j++) if (closer.test(lines[j])) return j + 1;
    return i + 1;
  };
  lines.forEach((l, i) => {
    let m;
    if ((m = l.match(reFn)) || (m = l.match(reArrow))) {
      rows.push({ start: i + 1, end: endOf(i, m[1].length), label: `${" ".repeat(m[1].length)}${m[2]}()` });
    } else if ((m = l.match(reTable))) {
      rows.push({ start: i + 1, end: endOf(i, 0), label: `${m[1]}  (table)` });
    } else if ((m = l.match(reBanner)) && m[1]) {
      rows.push({ start: i + 1, end: i + 1, label: `── ${m[1]}` });
    }
  });
}

const shown = rows.filter((r) => !motif || r.label.toLowerCase().includes(motif));
for (const r of shown) {
  const range = r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`;
  console.log(`${range.padEnd(12)} ${String(r.end - r.start + 1).padStart(5)} l  ${r.label}`);
}
if (!shown.length) console.error(`(aucune entrée pour « ${motif} » — ${rows.length} entrées au total)`);
