/* =============================================================================
   tools/verify-petplay.mjs — les familiers jouent-ils VRAIMENT ensemble ?
   -----------------------------------------------------------------------------
       node public/templerun/tools/verify-petplay.mjs

   Ne relit aucune constante : il FAIT TOURNER petPlayAt sur 200 000 instants,
   pour huit joueurs et de une à huit bêtes, et mesure ce qu'on a promis.

   La promesse est « ils jouent entre eux, ils tournent sur eux-mêmes, c'est
   vivant, et ça ne coûte aucun message réseau ». Aucune constante ne dit ça.
   Ce que ce script vérifie, dans l'ordre d'importance :

     1. DEUX CLIENTS VOIENT LA MÊME CHOSE. C'est le seul point qui, s'il
        lâchait, se verrait en jeu à deux et jamais en solo : le familier de
        mon ami jouerait une figure et le mien une autre. Comme rien ne
        voyage, la seule garantie est la pureté de la fonction.
     2. LES DEUX D'UNE PAIRE JOUENT LA MÊME FIGURE. Une poursuite où l'un
        court et l'autre reste planté n'est pas une poursuite.
     3. UN FAMILIER SEUL NE POURSUIT PERSONNE. Sans ce contrôle, un joueur qui
        ne promène qu'une bête la verrait tourner autour du vide.
     4. AUCUNE FIGURE N'EST INJOUABLE. Une branche jamais atteinte est du code
        mort qui a l'air vivant — c'est le corollaire du zip 375.
     5. LA PART DE TEMPS JOUÉE est celle qu'on croit. Des familiers qui
        s'agitent en permanence sont fatigants ; on veut des respirations.

   ⚠️ CE QU'IL NE PROUVE PAS : rien de l'ALLURE. Il dit qu'une poursuite est
   déclenchée, pas qu'elle est jolie ni que PET_CHASE_RADIUS est le bon rayon.
   Il ne touche pas non plus au rendu (drawPetsFor), qui traduit ces figures en
   pixels. Ces deux points-là se jugent manette en main.
   ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fermeDir = path.resolve(here, "../../../components/ferme");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-petplay-"));
for (const f of ["fermeConstants.js", "fermeEngine.js", "fermeArt.js"]) {
  fs.writeFileSync(path.join(tmp, f), fs.readFileSync(path.join(fermeDir, f), "utf8")
    .replace(/from\s+"\.\/(ferme[A-Za-z]+)"/g, 'from "./$1.js"'));
}
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);

const OWNERS = ["a1b2c3", "zz", "9f8e7d6c", "player-two", "hôte", "0", "long-identifier-1234", "é"];
const STEP = 37;                      // ms : premier nombre non diviseur de la période
const SPAN = 200000;                  // instants examinés
let bad = 0;

console.log(`petPlayAt — ${OWNERS.length} joueurs, 1 à ${C.MAX_PETS_WALKING} familiers, ${SPAN} instants de ${STEP} ms`);
console.log(`période ${C.PET_PLAY_PERIOD_MS} ms, part active ${C.PET_PLAY_ACTIVE}`);
console.log("");

/* --- 1. pureté : deux évaluations identiques donnent le même résultat ------ */
{
  let mism = 0;
  for (let k = 0; k < 20000; k++) {
    const o = OWNERS[k % OWNERS.length], n = 1 + (k % C.MAX_PETS_WALKING), i = k % n;
    const t = k * STEP * 7.3;
    const a = E.petPlayAt(o, i, n, t), b = E.petPlayAt(o, i, n, t);
    if (a.figure !== b.figure || a.t !== b.t || a.partner !== b.partner || a.lead !== b.lead) mism++;
  }
  console.log(`  ${mism ? "✗" : "✓"} 1. fonction pure : 20 000 doubles évaluations, ${mism} divergence(s)`);
  bad += mism;
}

/* --- 2. les deux d'une paire jouent la même figure ------------------------- */
{
  let mism = 0, pairs = 0;
  for (const o of OWNERS) for (let n = 2; n <= C.MAX_PETS_WALKING; n++) {
    for (let s = 0; s < 3000; s++) {
      const t = s * C.PET_PLAY_PERIOD_MS + 100;
      for (let i = 0; i + 1 < n; i += 2) {
        pairs++;
        const a = E.petPlayAt(o, i, n, t), b = E.petPlayAt(o, i + 1, n, t);
        if (a.figure !== b.figure) mism++;
        if (a.figure !== "idle" && a.lead === b.lead) mism++;   // il faut un meneur ET un suiveur
      }
    }
  }
  console.log(`  ${mism ? "✗" : "✓"} 2. ${pairs} paires examinées, ${mism} désaccord(s) de figure ou de meneur`);
  bad += mism;
}

/* --- 3. un familier seul ne poursuit personne ------------------------------ */
{
  let solo = 0, duoLeak = 0;
  for (const o of OWNERS) for (let s = 0; s < 20000; s++) {
    const r = E.petPlayAt(o, 0, 1, s * STEP);
    solo++;
    if (r.partner >= 0 || r.figure === "chase" || r.figure === "face") duoLeak++;
  }
  console.log(`  ${duoLeak ? "✗" : "✓"} 3. ${solo} évaluations d'un familier SEUL, ${duoLeak} figure(s) à deux échappée(s)`);
  bad += duoLeak;
  // Le dernier d'un nombre IMPAIR est dans le même cas : il n'a pas de voisin.
  let oddLeak = 0;
  for (const o of OWNERS) for (const n of [3, 5, 7]) for (let s = 0; s < 6000; s++) {
    const r = E.petPlayAt(o, n - 1, n, s * STEP);
    if (r.partner >= 0) oddLeak++;
  }
  console.log(`  ${oddLeak ? "✗" : "✓"} 3 bis. le dernier d'un effectif impair n'a jamais de partenaire (${oddLeak} fuite)`);
  bad += oddLeak;
}

/* --- 4. toutes les figures sont atteignables ------------------------------- */
{
  const seenSolo = new Map(), seenDuo = new Map();
  for (const o of OWNERS) for (let s = 0; s < 40000; s++) {
    const t = s * STEP;
    const a = E.petPlayAt(o, 0, 1, t);
    if (a.figure !== "idle") seenSolo.set(a.figure, (seenSolo.get(a.figure) | 0) + 1);
    const b = E.petPlayAt(o, 0, 4, t);
    if (b.figure !== "idle") seenDuo.set(b.figure, (seenDuo.get(b.figure) | 0) + 1);
  }
  const missSolo = C.PET_PLAY_SOLO.filter(f => !seenSolo.has(f));
  const missDuo = C.PET_PLAY_DUO.filter(f => !seenDuo.has(f));
  for (const f of missSolo) console.log(`  ✗ figure solo JAMAIS tirée : ${f}`);
  for (const f of missDuo) console.log(`  ✗ figure à deux JAMAIS tirée : ${f}`);
  const fmt = (m) => [...m.entries()].sort().map(([k, v]) => `${k} ${(v / [...m.values()].reduce((a, b) => a + b) * 100).toFixed(0)}%`).join(", ");
  console.log(`  ${missSolo.length + missDuo.length ? "✗" : "✓"} 4. solo : ${fmt(seenSolo)}`);
  console.log(`      à deux : ${fmt(seenDuo)}`);
  bad += missSolo.length + missDuo.length;
}

/* --- 5. la part de temps réellement jouée --------------------------------- */
{
  let play = 0, tot = 0;
  for (const o of OWNERS) for (let s = 0; s < 25000; s++) {
    tot++; if (E.petPlayAt(o, 0, 4, s * STEP).figure !== "idle") play++;
  }
  const got = play / tot;
  // Attendu : part active × (2 paires sur 3 qui jouent) = 0.62 × 2/3 ≈ 0.413
  const want = C.PET_PLAY_ACTIVE * 2 / 3;
  const off = Math.abs(got - want);
  console.log(`  ${off > 0.03 ? "✗" : "✓"} 5. temps passé à jouer : ${(got * 100).toFixed(1)} % (attendu ${(want * 100).toFixed(1)} %)`);
  if (off > 0.03) bad++;
  // Durée moyenne d'une figure, en secondes — le chiffre qui décide si c'est
  // agréable ou frénétique. À confronter à l'écran.
  console.log(`  · une figure dure ${(C.PET_PLAY_PERIOD_MS * C.PET_PLAY_ACTIVE / 1000).toFixed(1)} s, suivie de ${(C.PET_PLAY_PERIOD_MS * (1 - C.PET_PLAY_ACTIVE) / 1000).toFixed(1)} s de calme.`);
  console.log(`  · un tour sur soi-même dure ${(C.PET_SPIN_MS / 1000).toFixed(1)} s et défile ${C.PET_DIRS} orientations.`);
}

/* --- 6. coût réseau : la fonction ne lit et n'écrit RIEN ------------------- */
{
  // Contrôle par la signature, faute de mieux : petPlayAt ne reçoit que des
  // valeurs simples et ne renvoie que des valeurs simples. Si un jour
  // quelqu'un lui passe l'état de la ferme, c'est ici que ça se verra.
  const arity = E.petPlayAt.length;
  const r = E.petPlayAt("x", 0, 2, 1234);
  const shape = Object.keys(r).sort().join(",");
  const okShape = shape === "figure,lead,partner,t";
  console.log(`  ${arity === 4 && okShape ? "✓" : "✗"} 6. signature (${arity} arguments simples) et retour {${shape}} : aucun état de jeu ne transite`);
  if (!(arity === 4 && okShape)) bad++;
}

console.log("");
console.log(bad ? `✗ ${bad} problème(s).` : "✓ tout est vert. L'ALLURE, elle, reste à juger manette en main.");
process.exit(bad ? 1 : 0);
