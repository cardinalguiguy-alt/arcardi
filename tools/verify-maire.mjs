/* =============================================================================
   verify-maire.mjs — L'AUDIENCE CHEZ LE MAIRE TIENT-ELLE DEBOUT ? (zip 480)
   -----------------------------------------------------------------------------
   ⚠️⚠️⚠️ CE BANC JOUE DES ENTRETIENS ENTIERS, IL NE RELIT PAS UNE TABLE. C'est
   la seule chose qui vaille ici, et c'est la leçon la plus chère de CLAUDE.md
   sous une forme neuve : un banc qui vérifierait que « chaque nœud a trois
   réponses » et que « l'idéale rapporte plus que la tiède » serait vert sur une
   négociation IMPOSSIBLE à gagner, ou gagnable en martelant. Ce qu'il faut
   mesurer n'est pas la table, c'est la DIFFÉRENCE entre ce qu'on gagne et ce
   qui fuit — deux grandeurs qui s'opposent se mesurent ensemble ou pas du tout
   (458).

   ⚠️⚠️ ET ON BALAIE AU LIEU DE DONNER TROIS EXEMPLES (449). Chaque propriété est
   énoncée puis vérifiée sur les cinq maires × les deux mondes (plans / mains
   vides) × les quatre crans de confiance × une plage de temps de réflexion de
   0 à 9 secondes. Une négociation qui marche « chez Vasseur avec les plans »
   n'est pas une négociation qui marche.

   ⚠️ IL IMPRIME UNE TRANSCRIPTION COMPLÈTE À LA FIN. Un banc de dialogue qui ne
   montre jamais un dialogue mesure des nombres sur un texte que personne n'a
   relu ; c'est le §25 de `ferme/README.md` (regarder l'écran) appliqué à ce
   qu'on peut regarder dans un terminal.

   Usage : node tools/verify-maire.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "components", "ferme");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "maire-"));
const copied = new Set();
const copy = (n) => {
  if (copied.has(n)) return;
  copied.add(n);
  const src = fs.readFileSync(path.join(SRC, n + ".js"), "utf8");
  fs.writeFileSync(path.join(tmp, n + ".js"), src.replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.js"'));
  for (const m of src.matchAll(/from "\.\/([A-Za-z0-9_]+)"/g)) copy(m[1]);
};
copy("maire");
copy("fermeStrings");
copy("fermeEngine");

const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const M = await import(pathToFileURL(path.join(tmp, "maire.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);
const { FERME_STR } = await import(pathToFileURL(path.join(tmp, "fermeStrings.js")).href);

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);

const MAIRES = C.TOWN_CANDIDATES.map(c => c.key);
const WORLDS = [true, false];      // plans en main / mains vides

/* ── de quoi jouer un entretien complet ────────────────────────────────────
   `pick` reçoit les choix RÉELLEMENT proposés (donc filtrés par `when` et par
   les deux boutons conditionnels) : le banc ne peut pas jouer une réplique que
   le jeu n'offrirait pas. C'est la leçon 469 — un banc qui invente ses données
   mesure un jeu que personne ne joue. */
/* ⚠️⚠️ ON MESURE LE TERRAIN GAGNÉ, PAS LE SOMMET, DÈS QU'ON COMPARE DEUX
   ENTRETIENS. `peak` est borné à 100 : trois contrôles comparaient des maires,
   des échéances électorales et des répliques resservies en lisant un sommet que
   les cinq atteignaient, donc ils annonçaient « aucune différence » sur des
   entretiens franchement différents. C'est la forme la plus banale du défaut de
   banc de CLAUDE.md — mesurer une grandeur juste à un endroit où elle ne
   discrimine plus. La somme des gains, elle, ne sature jamais. */
const gained = (trail) => Math.round(trail.reduce((a, t) => a + Math.max(0, t.delta), 0) * 10) / 10;

function play(ctx, pick, dt = 3000) {
  const s = M.mayorOpen(ctx);
  const trail = [];
  let guard = 0;
  while (!s.over && guard++ < 60) {
    const choices = M.mayorChoices(s);
    if (!choices.length) break;
    const node = s.node;
    const key = pick(choices, s, node);
    if (!key) break;
    const before = s.adh;
    const r = M.mayorPlay(s, key, typeof dt === "function" ? dt(trail.length) : dt);
    trail.push({ node, key, from: before, to: s.adh, delta: r.delta, grade: r.grade, why: r.why });
  }
  return { s, trail };
}
const pickGrade = (g) => (choices) => {
  const a = choices.find(c => c.kind === "say" && c.grade === g);
  return a ? a.k : (choices.find(c => c.kind === "say") || {}).k;
};
/* Le joueur idéal : la meilleure réponse partout, et les plans posés au moment
   exact où il demande à voir (`m5`). Il empoche à la fin, jamais avant. */
const pickIdeal = (choices, s, node) => {
  if (node === "m5" && choices.some(c => c.kind === "plans")) return "__plans";
  return pickGrade("ideal")(choices);
};
const ctxOf = (o = {}) => ({
  mayorKey: o.mayorKey || "vasseur", day: o.day == null ? 12 : o.day,
  nextElection: o.nextElection == null ? 30 : o.nextElection,
  audience: !!o.audience, plans: o.plans !== false, trust: o.trust | 0,
  burnt: o.burnt || [],
});

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ §1 — LA TABLE : CE QUE GUILLAUME A DEMANDÉ, MOT POUR MOT
   ╚═════════════════════════════════════════════════════════════════════════════
   « 2 sur trois permettent de continuer la discussion (une de ces deux est la
   réponse idéale), une troisième est outrageusement vexante ou fout tout en
   l'air. » C'est une promesse de CONCEPTION, et une promesse de conception qui
   n'a pas de banc pour la faire échouer se périme sans bruit (leçon du 479). */
section("§1 la table");
{
  let bad = [], grades = [], flav = new Set(), types = new Set();
  for (const n of M.MAYOR_NODES) for (const plans of WORLDS) {
    const p = M.mayorPlayable(n.id, plans);
    if (p.length !== 3) bad.push(`${n.id}/${plans ? "plans" : "nu"}=${p.length}`);
    const g = p.map(a => a.grade).sort().join(",");
    if (g !== "fault,ideal,warm") grades.push(`${n.id}/${plans ? "plans" : "nu"}:${g}`);
    for (const a of p) { types.add(a.type); if (a.flavour) flav.add(a.flavour); }
  }
  ok("⚠️⚠️ exactement TROIS réponses jouables par nœud, dans les deux mondes",
     bad.length === 0, bad.length ? bad.join(" ") : `${M.MAYOR_NODES.length} nœuds × 2 mondes`);
  ok("⚠️⚠️ et exactement une idéale, une tiède, une faute", grades.length === 0, grades.join(" "));

  const faults = M.MAYOR_NODES.flatMap(n => n.answers.filter(a => a.grade === "fault"));
  ok("chaque faute a une saveur nommée (`rude` / `tact` / `trap`)",
     faults.every(a => ["rude", "tact", "trap"].includes(a.flavour)),
     [...flav].join(", "));
  /* ⚠️ « le 3e mauvais choix doit pas toujours être aussi identifiable et
     caricatural même si c'est drôle d'en avoir des abusés » : une seule `rude`,
     et les deux autres saveurs doivent DOMINER, sinon la promesse est vide. */
  const nRude = faults.filter(a => a.flavour === "rude").length;
  ok("⚠️⚠️ UNE SEULE faute caricaturale dans tout l'arbre", nRude === 1, `${nRude} sur ${faults.length}`);
  ok("…et les fautes non évidentes sont la grande majorité",
     faults.length - nRude >= faults.length * 0.8,
     `${faults.filter(a => a.flavour === "trap").length} pièges logiques, ${faults.filter(a => a.flavour === "tact").length} fautes de tact`);
  const fatals = M.MAYOR_NODES.flatMap(n => n.answers.filter(a => a.fatal));
  ok("⚠️ UNE SEULE réponse met fin à l'entretien sur-le-champ, et c'est la caricaturale",
     fatals.length === 1 && fatals[0].flavour === "rude", fatals.map(a => a.k).join(","));
  ok("les cinq familles d'argument servent toutes", types.size === M.MAYOR_TYPES.length,
     [...types].sort().join(", "));

  /* ⚠️⚠️ AUCUNE FAMILLE NE DOIT ÊTRE UNE BONNE RÉPONSE PARTOUT : un levier qui
     marche toujours n'est pas un levier, c'est un bouton, et la négociation
     redevient un questionnaire à une seule case. */
  const idealTypes = M.MAYOR_NODES.map(n => n.answers.find(a => a.grade === "ideal" && !a.when || (a.grade === "ideal" && a.when === "plans"))).filter(Boolean).map(a => a.type);
  const top = Math.max(...M.MAYOR_TYPES.map(t => idealTypes.filter(x => x === t).length));
  ok("⚠️⚠️ aucune famille n'est la bonne réponse plus d'un tiers du temps",
     top <= Math.ceil(idealTypes.length / 3),
     M.MAYOR_TYPES.map(t => `${t}:${idealTypes.filter(x => x === t).length}`).join(" "));
  /* `self` est une faute presque partout et l'idéale à un seul endroit : c'est
     le cœur du réglage, et il doit rester vrai après n'importe quel remaniement. */
  const selfIdeal = M.MAYOR_NODES.filter(n => n.answers.some(a => a.grade === "ideal" && a.type === "self"));
  const selfFault = M.MAYOR_NODES.filter(n => n.answers.some(a => a.grade === "fault" && a.type === "self"));
  ok("⚠️ la flatterie n'est juste qu'à UN seul endroit, et fautive partout ailleurs",
     selfIdeal.length === 1 && selfFault.length >= 4,
     `idéale en ${selfIdeal.map(n => n.id)}, fautive en ${selfFault.map(n => n.id).join(",")}`);
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ §2 — LES TEXTES, DANS LES DEUX LANGUES, PAR JOINTURE
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️ UNE JOINTURE, JAMAIS DEUX LISTES (449) : une clé de la table sans texte
   échoue, ET un texte sans clé dans la table échoue aussi. Sans le second sens,
   une réplique supprimée laisse son texte pour toujours. */
section("§2 les textes");
for (const [lang, L] of [["fr", FERME_STR.fr.maire], ["en", FERME_STR.en.maire]]) {
  const missAsk = M.MAYOR_NODE_IDS.filter(id => !L.ask[id]);
  const missSay = M.MAYOR_SAY_KEYS.filter(k => !L.say[k]);
  const missTell = M.MAYOR_SAY_KEYS.filter(k => !L.tell[k]);
  ok(`[${lang}] chaque nœud a sa question`, missAsk.length === 0, missAsk.join(","));
  ok(`[${lang}] chaque réplique a son texte`, missSay.length === 0, missSay.join(","));
  /* ⚠️⚠️ « toujours avoir une justification de la réaction du maire » (Guillaume).
     C'est le contrôle qui empêche d'écrire une bonne vanne dont personne ne
     comprend pourquoi elle marche. */
  ok(`[${lang}] ⚠️⚠️ chaque réplique a sa JUSTIFICATION`, missTell.length === 0, missTell.join(","));
  const orphanSay = Object.keys(L.say).filter(k => !M.MAYOR_SAY_KEYS.includes(k));
  const orphanTell = Object.keys(L.tell).filter(k => !M.MAYOR_SAY_KEYS.includes(k));
  ok(`[${lang}] aucun texte orphelin (l'autre sens de la jointure)`,
     orphanSay.length === 0 && orphanTell.length === 0, [...orphanSay, ...orphanTell].join(","));
  const missTint = [];
  for (const id of M.MAYOR_TINT_NODES) for (const m of MAIRES) if (!(L.tint[id] || {})[m]) missTint.push(`${id}/${m}`);
  ok(`[${lang}] les nœuds teintés ont les CINQ maires`, missTint.length === 0, missTint.join(","));
  const orphanTint = Object.keys(L.tint).filter(k => !M.MAYOR_TINT_NODES.includes(k));
  ok(`[${lang}] …et aucune teinte pour un nœud qui n'en veut pas`, orphanTint.length === 0, orphanTint.join(","));
  ok(`[${lang}] chaque famille d'argument a un nom affichable`,
     M.MAYOR_TYPES.every(t => L.type[t]), M.MAYOR_TYPES.filter(t => !L.type[t]).join(","));
  ok(`[${lang}] chaque fin a son texte`,
     ["plain", "good", "full", "out", "walked", "thrown"].every(k => L.end[k]));
}
/* ⚠️ TOUTE RAISON QUE `mayorDelta` PEUT ÉMETTRE DOIT AVOIR UN TEXTE. On les
   RÉCOLTE en jouant, on ne les recopie pas : une raison ajoutée au calcul et
   oubliée dans les textes afficherait `undefined` au milieu d'une phrase. */
{
  const seen = new Set();
  for (const mk of MAIRES) for (const plans of WORLDS) for (const day of [1, 26, 28]) {
    for (const g of ["ideal", "warm", "fault"]) {
      const { trail } = play(ctxOf({ mayorKey: mk, plans, day, nextElection: 30, burnt: M.MAYOR_SAY_KEYS.slice(0, 6) }), pickGrade(g));
      for (const t of trail) for (const w of t.why) seen.add(w.why);
    }
    const { trail } = play(ctxOf({ mayorKey: mk, plans, day }), pickIdeal);
    for (const t of trail) for (const w of t.why) seen.add(w.why);
  }
  const missing = [...seen].filter(w => !FERME_STR.fr.maire.why[w] || !FERME_STR.en.maire.why[w]);
  ok("⚠️⚠️ chaque RAISON réellement émise par le calcul a un texte dans les deux langues",
     missing.length === 0, `${seen.size} raisons rencontrées en jouant : ${[...seen].sort().join(", ")}`);
  ok("⚠️ …et le banc publie combien il en a VUES (441 : un scanner qui ne scanne rien passe toujours)",
     seen.size >= 9, `${seen.size} sur ${Object.keys(FERME_STR.fr.maire.why).length} écrites`);
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ §3 — LA NÉGOCIATION, JOUÉE POUR DE VRAI. C'EST LE CŒUR DU BANC.
   ╚═════════════════════════════════════════════════════════════════════════════ */
section("§3 la négociation jouée");
{
  /* ⚠️⚠️⚠️ LE LIEN ENTRE DEUX NOMBRES RÉGLÉS À LA MAIN DE DEUX CÔTÉS DIFFÉRENTS
     (§8 de CLAUDE.md : un paramètre qui double un autre est une divergence en
     attente). `MAYOR_DRAIN_CAP` promet qu'aucune hésitation ne coûte plus
     qu'une bonne réponse ne rapporte ; cette promesse est FAUSSE dès que le
     plafond dépasse la plus faible des répliques idéales chez le maire le plus
     hostile. Personne ne s'en apercevrait en relisant : ça se croise en
     changeant un seul des deux. */
  {
    const worstIn = (plans) => {
      let worst = Infinity, at = "";
      for (const n of M.MAYOR_NODES) for (const a of M.mayorPlayable(n.id, plans)) {
        if (a.grade !== "ideal") continue;
        for (const mk of MAIRES) {
          const v = M.mayorDelta(M.mayorOpen(ctxOf({ mayorKey: mk, plans })), a).v;
          if (v < worst) { worst = v; at = `${a.k} chez ${mk}`; }
        }
      }
      return { worst, at };
    };
    const armed = worstIn(true), bare = worstIn(false);
    ok("⚠️⚠️ LE DOSSIER EN MAIN, le plafond de fuite reste sous la plus faible des répliques idéales",
       C.MAYOR_DRAIN_CAP <= armed.worst,
       `plafond ${C.MAYOR_DRAIN_CAP}, plus faible idéale ${armed.worst} (${armed.at})`);
    /* ⚠️ Les mains vides, les répliques de repli («
       quelque chose capable de sortir du lac ») descendent jusqu'au plafond
       lui-même : hésiter y coûte autant que sa meilleure phrase ne rapporte, et
       c'est très exactement ce que « très difficile » veut dire. On l'imprime
       plutôt que de le taire, mais on n'en fait pas un invariant : c'est un
       résultat d'équilibrage, pas une promesse. */
    ok("⚠️ …et les mains vides, le repli le plus faible descend AU niveau du plafond",
       bare.worst <= armed.worst,
       `plafond ${C.MAYOR_DRAIN_CAP}, plus faible repli ${bare.worst} (${bare.at})`);
  }

  /* ⚠️ BALAYÉ, PAS EXEMPLIFIÉ : cinq maires × deux mondes × quatre confiances ×
     dix vitesses de réflexion = 400 entretiens par propriété. */
  const sweep = (fn) => {
    const bad = [];
    for (const mk of MAIRES) for (const plans of WORLDS) for (const trust of [0, 1, 2, 3])
      for (const dt of [0, 500, 1000, 2000, 3000, 4000, 5000, 6500, 8000, 9000]) {
        const r = fn(ctxOf({ mayorKey: mk, plans, trust }), dt);
        if (r) bad.push(`${mk}/${plans ? "plans" : "nu"}/t${trust}/${dt}ms ${r}`);
      }
    return bad;
  };

  const badIdeal = sweep((ctx, dt) => {
    const { s } = play(ctx, pickIdeal, dt);
    return s.over === "signed" ? null : `→ ${s.over} (${s.adh})`;
  });
  ok("⚠️⚠️⚠️ LE JEU PARFAIT GAGNE TOUJOURS — cinq maires, avec ET sans les plans, 0 à 9 s de réflexion",
     badIdeal.length === 0, badIdeal.length ? badIdeal.slice(0, 4).join(" · ") : "400 entretiens");

  const badWarm = sweep((ctx, dt) => {
    const { s } = play(ctx, (c, st, n) => (n === "m5" && c.some(x => x.kind === "plans")) ? "__plans" : pickGrade("warm")(c), dt);
    return s.over === "signed" ? `→ signé (${s.peak})` : null;
  });
  /* ⚠️⚠️ « une réponse tiède peut faire STAGNER sa persuasion » (Guillaume). Le
     contrôle mesure donc l'inverse de la propriété précédente : un banc qui ne
     vérifie que « on peut gagner » est vert sur une négociation qu'on gagne en
     martelant. C'est ce trou qui a fait naître `MAYOR_BEAT_MS`. */
  ok("⚠️⚠️⚠️ …ET LE JEU TIÈDE NE GAGNE JAMAIS, même en martelant à zéro seconde et en posant les plans",
     badWarm.length === 0, badWarm.length ? badWarm.slice(0, 4).join(" · ") : "400 entretiens");

  const badFault = sweep((ctx, dt) => {
    const { s } = play(ctx, pickGrade("fault"), dt);
    return (s.over === "walked" || s.over === "thrown") ? null : `→ ${s.over} (${s.adh})`;
  });
  ok("⚠️ le jeu fautif se fait raccompagner, toujours", badFault.length === 0, badFault.slice(0, 3).join(" · "));

  /* ⚠️⚠️ UNE FAUTE DOIT ÊTRE RATTRAPABLE, DEUX NON. Sans ça, un dialogue à trois
     choix est un couloir : la première erreur ferme la partie et plus personne
     n'ose lire les réponses. */
  const oneSlip = (n) => (ctx, dt) => {
    const { s } = play(ctx, (c, st, node) => {
      const i = M.MAYOR_NODE_IDS.indexOf(node);
      if (i < n) return pickGrade("fault")(c);
      if (node === "m5" && c.some(x => x.kind === "plans")) return "__plans";
      return pickGrade("ideal")(c);
    }, dt);
    return s;
  };
  /* ⚠️⚠️ CETTE PROPRIÉTÉ EST VRAIE LE DOSSIER EN MAIN ET FAUSSE LES MAINS VIDES,
     et c'est très exactement là que vit la difficulté demandée par Guillaume :
     avec les plans on a une marge d'erreur, sans eux on n'en a aucune. Le banc
     mesure donc les DEUX moitiés au lieu de restreindre son périmètre à celle
     qui l'arrange — « se donner un périmètre et excuser ce qui déborde » est la
     deuxième forme connue du banc menteur (439). */
  const bad1 = sweep((ctx, dt) => {
    if (!ctx.plans) return null;
    const s = oneSlip(1)(ctx, dt);
    return s.over === "signed" ? null : `→ ${s.over} (${s.adh})`;
  });
  ok("⚠️⚠️ LES PLANS EN MAIN, une faute d'accueil se rattrape encore par un sans-faute",
     bad1.length === 0, bad1.length ? bad1.slice(0, 4).join(" · ") : "200 entretiens");
  /* ⚠️⚠️ ET LES MAINS VIDES, LA MARGE FOND — c'est ÇA, « très difficile », et
     c'est mesurable : la même bourde y coûte au moins un cran de confiance chez
     tout le monde, et carrément la signature chez le maire le plus dur. Un
     premier jet du banc exigeait qu'elle soit fatale PARTOUT ; c'était un
     accident d'équilibrage promu en invariant, et il a fallu deux réétalonnages
     pour s'en apercevoir. *Un contrôle qu'on écrit d'après ce que le code fait
     aujourd'hui mesure le code, pas l'intention.* */
  {
    let sameTier = [], noneLost = [];
    for (const mk of MAIRES) {
      const armed = oneSlip(1)(ctxOf({ mayorKey: mk, plans: true }), 3200);
      const bare = oneSlip(1)(ctxOf({ mayorKey: mk, plans: false }), 3200);
      const cleanBare = play(ctxOf({ mayorKey: mk, plans: false }), pickIdeal, 3200).s;
      if (M.mayorTrustGain(bare) >= M.mayorTrustGain(cleanBare)) sameTier.push(`${mk}`);
      if (armed.over !== "signed") noneLost.push(`${mk} perd la signature AVEC les plans`);
    }
    ok("⚠️⚠️ …ET LES MAINS VIDES LA MARGE FOND : la même bourde y coûte au moins un cran de confiance",
       sameTier.length === 0 && noneLost.length === 0,
       [...sameTier, ...noneLost].join(" · ") || "cinq maires, la même faute jouée dans les deux mondes");
    const lostSig = MAIRES.filter(mk => oneSlip(1)(ctxOf({ mayorKey: mk, plans: false }), 3200).over !== "signed");
    ok("⚠️ …et chez le maire le plus dur elle coûte carrément la signature",
       lostSig.length >= 1, lostSig.length ? lostSig.join(", ") : "aucun");
  }
  /* ⚠️ LE SEUIL EST À DEUX CRANS DE CONFIANCE, PAS À TROIS, et ce n'est pas une
     retouche de commodité : c'est là que la récompense de Guillaume commence à
     se sentir. En dessous, trois bourdes sont irrattrapables partout ; à partir
     de là, le maire vous en passe, et le contrôle suivant le mesure. */
  const bad3 = sweep((ctx, dt) => {
    if (ctx.trust >= 2) return null;
    const s = oneSlip(3)(ctx, dt);
    return s.over === "signed" ? `→ signé (${s.peak})` : null;
  });
  ok("⚠️⚠️ …TROIS fautes de suite, non : sans capital de confiance, on ne remonte pas de là", bad3.length === 0,
     bad3.length ? bad3.slice(0, 4).join(" · ") : "200 entretiens");
  /* ⚠️⚠️ SAUF À CONFIANCE PLEINE, ET C'EST LA RÉCOMPENSE, PAS UN TROU. Guillaume :
     « on gagne la confiance du maire dans les prochains projets : plus facile de
     le convaincre pour les futures missions ». Un capital qui ne se voit que sur
     un barème ne se sent pas ; celui-ci s'achète un droit à l'erreur, ce qui est
     la seule forme de facilité qu'un joueur perçoive vraiment. On l'énonce donc
     et on le mesure, au lieu de restreindre le périmètre du contrôle précédent
     et de laisser la propriété nulle part. ⚠️ La réplique FATALE, elle, reste
     fatale à confiance pleine : la confiance achète des maladresses, pas une
     insulte (contrôle ci-dessous). */
  {
    /* ⚠️ CE QUE LA CONFIANCE ACHÈTE SE MESURE LÀ OÙ IL N'Y A PLUS DE MARGE : les
       mains vides, une bourde d'accueil est fatale à froid (contrôle plus haut).
       À confiance pleine, elle ne l'est plus. C'est ça, le droit à l'erreur, et
       c'est la seule forme de facilité qu'un joueur perçoive. */
    const cold = MAIRES.map(mk => oneSlip(2)(ctxOf({ mayorKey: mk, plans: false, trust: 0 }), 3200).over === "signed");
    const warm = MAIRES.map(mk => oneSlip(2)(ctxOf({ mayorKey: mk, plans: false, trust: C.MAYOR_TRUST_MAX }), 3200).over === "signed");
    ok("⚠️⚠️ …mais la CONFIANCE rachète des bourdes que rien d'autre ne rachète",
       warm.filter(Boolean).length > cold.filter(Boolean).length,
       `deux bourdes, mains vides : ${cold.filter(Boolean).length}/5 à froid, ${warm.filter(Boolean).length}/5 avec la confiance`);
    const stillOut = MAIRES.every(mk => play(ctxOf({ mayorKey: mk, trust: C.MAYOR_TRUST_MAX }),
      (c, st, n) => n === "m11" ? "m11c" : (n === "m5" && c.some(x => x.kind === "plans")) ? "__plans" : pickGrade("ideal")(c)).s.over === "thrown");
    ok("⚠️⚠️ …et elle n'achète PAS l'insulte : « Dites votre prix » raccompagne même l'ami du maire", stillOut);
  }

  /* ⚠️⚠️ LE GLISSEMENT NE DOIT JAMAIS COÛTER PLUS QUE LA FAUTE QUI LE DÉCLENCHE.
     Sinon le joueur voit « −12 » et perd vingt-six points : une pénalité
     invisible plus grosse que la pénalité affichée n'est pas une pénalité, c'est
     un piège, et elle rend le barème illisible. Mesuré en jouant DEUX fois la
     même ouverture, avec et sans faute, et en comparant l'écart total. */
  {
    let bad = [];
    for (const mk of MAIRES) {
      const runFault = play(ctxOf({ mayorKey: mk }), (c, st, n) =>
        M.MAYOR_NODE_IDS.indexOf(n) === 0 ? pickGrade("fault")(c) : pickGrade("warm")(c), 3000);
      const runWarm = play(ctxOf({ mayorKey: mk }), pickGrade("warm"), 3000);
      const shownFault = Math.abs(runFault.trail[0].delta);
      const lostExtra = (runWarm.trail[2] ? runWarm.trail[2].to : 0) - (runFault.trail[2] ? runFault.trail[2].to : 0);
      const hidden = lostExtra - shownFault - Math.abs(runWarm.trail[0].delta);
      if (hidden > shownFault) bad.push(`${mk} : ${shownFault} affichés, ${Math.round(hidden * 10) / 10} de plus en douce`);
    }
    ok("⚠️⚠️ le glissement qui suit une faute ne coûte jamais PLUS que la faute affichée",
       bad.length === 0, bad.length ? bad.join(" · ") : "cinq maires, deux ouvertures comparées");
  }

  /* La réplique énorme : elle finit l'entretien, quel que soit l'état. */
  {
    let bad = [];
    for (const mk of MAIRES) {
      const { s } = play(ctxOf({ mayorKey: mk }), (c, st, node) => {
        if (node === "m11") return "m11c";
        if (node === "m5" && c.some(x => x.kind === "plans")) return "__plans";
        return pickGrade("ideal")(c);
      });
      if (s.over !== "thrown") bad.push(`${mk} → ${s.over} (${s.adh})`);
    }
    ok("⚠️⚠️ « Dites votre prix » met fin à l'entretien MÊME quand tout allait bien",
       bad.length === 0, bad.join(" · "));
  }

  /* ⚠️⚠️ L'ÉLAN. C'est la demande centrale de Guillaume (« d'où l'intérêt de
     trouver les bonnes réponses et de les ENCHAÎNER ») : elle doit être
     MESURABLE, pas seulement écrite. On compare deux joueurs qui donnent le
     MÊME NOMBRE de réponses idéales, l'un groupées, l'autre alternées. */
  {
    let bad = [];
    for (const mk of MAIRES) {
      const grouped = play(ctxOf({ mayorKey: mk }), (c, st, node) => {
        const i = M.MAYOR_NODE_IDS.indexOf(node);
        return pickGrade(i < 6 ? "ideal" : "warm")(c);
      }, 4000).s;
      const alternating = play(ctxOf({ mayorKey: mk }), (c, st, node) => {
        const i = M.MAYOR_NODE_IDS.indexOf(node);
        return pickGrade(i % 2 === 0 ? "ideal" : "warm")(c);
      }, 4000).s;
      if (!(grouped.peak > alternating.peak + 5)) bad.push(`${mk} groupé ${grouped.peak} vs alterné ${alternating.peak}`);
    }
    ok("⚠️⚠️⚠️ ENCHAÎNER PAIE : à nombre égal de bonnes réponses, les grouper vaut nettement mieux",
       bad.length === 0, bad.length ? bad.join(" · ") : "cinq maires, six idéales chacun");
  }

  /* Le bouton « je crois qu'on s'est compris » : il n'existe pas avant 75, et il
     signe tout de suite après. */
  {
    let early = 0, late = 0;
    for (const mk of MAIRES) {
      const { trail, s } = play(ctxOf({ mayorKey: mk }), pickIdeal);
      void trail;
      const s2 = M.mayorOpen(ctxOf({ mayorKey: mk }));
      if (M.mayorChoices(s2).some(c => c.kind === "settle")) early++;
      s2.adh = C.MAYOR_ADH_WIN;
      if (M.mayorChoices(s2).some(c => c.kind === "settle")) late++;
      void s;
    }
    ok("⚠️ la sortie anticipée n'existe pas avant 75, et existe à partir de 75",
       early === 0 && late === MAIRES.length, `avant ${early}/5, après ${late}/5`);
    const s3 = M.mayorOpen(ctxOf({}));
    s3.adh = 90;
    M.mayorPlay(s3, "__settle", 0);
    ok("…et elle signe sur-le-champ", s3.over === "signed" && M.mayorTrustGain(s3) === 2, `${s3.over}, confiance ${M.mayorTrustGain(s3)}`);
  }

  /* Les plans : une seule fois, et le moment décide de tout. */
  {
    const at = (node) => {
      const { s } = play(ctxOf({}), (c, st, n) => {
        if (n === node && c.some(x => x.kind === "plans")) return "__plans";
        return pickGrade("warm")(c);
      });
      return s;
    };
    void at;
    /* ⚠️ ON LIT LE GAIN DU GESTE, PAS L'ÉTAT D'ARRIVÉE : deux entretiens qui
       plafonnent tous les deux à 100 ne disent rien de ce que valait la carte. */
    const valueAt = (node) => {
      const s = M.mayorOpen(ctxOf({}));
      while (s.node && s.node !== node && !s.over) M.mayorPlay(s, pickGrade("warm")(M.mayorChoices(s)), 1000);
      return M.mayorPlay(s, "__plans", 0).delta;
    };
    const vGood = valueAt("m5"), vBad = valueAt("m9");
    ok("⚠️⚠️ poser les plans au bon moment vaut BEAUCOUP plus que les poser pour meubler",
       vGood >= vBad * 3, `au nœud des plans +${vGood}, ailleurs +${vBad}`);
    const s = M.mayorOpen(ctxOf({}));
    M.mayorPlay(s, "__plans", 0);
    const before = s.adh;
    M.mayorPlay(s, "__plans", 0);
    ok("…et ils ne se posent qu'une fois", s.adh <= before && s.plansLaid);
    const bare = M.mayorOpen(ctxOf({ plans: false }));
    ok("⚠️ les mains vides, le bouton n'existe pas", !M.mayorChoices(bare).some(c => c.kind === "plans"));
  }

  /* ⚠️⚠️ LES PLANS NE SONT PAS UNE SERRURE (décision de Guillaume) : les mains
     vides c'est « très difficile », pas impossible. Le banc mesure donc les
     DEUX moitiés de la phrase, parce qu'une seule laisserait passer aussi bien
     une porte fermée qu'une différence nulle. */
  {
    let bad = [];
    for (const mk of MAIRES) {
      const withP = play(ctxOf({ mayorKey: mk, plans: true }), pickIdeal, 4000);
      const bareP = play(ctxOf({ mayorKey: mk, plans: false }), pickIdeal, 4000);
      if (bareP.s.over !== "signed") bad.push(`${mk} : mains vides infaisable`);
      /* ⚠️ SUR LE TERRAIN GAGNÉ, PAS SUR LE SOMMET : les deux sans-fautes
         plafonnent à 100, donc un sommet ne dit rien de ce qui les sépare. */
      if (!(gained(withP.trail) > gained(bareP.trail) * 1.2))
        bad.push(`${mk} : trop peu d'écart (${gained(withP.trail)} vs ${gained(bareP.trail)})`);
    }
    ok("⚠️⚠️ sans les plans c'est très difficile ET gagnable — les deux moitiés",
       bad.length === 0, bad.length ? bad.join(" · ") : "cinq maires");
  }

  /* Le maire élu et l'échéance électorale changent vraiment quelque chose. */
  {
    /* ⚠️⚠️ CE QUI SE SENT N'EST PAS LE TOTAL, C'EST LA VALEUR D'UN ARGUMENT. Sur
       un sans-faute les affinités se compensent (l'arbre balaie les cinq
       familles exprès), donc le total varie peu et un banc qui ne lit que lui
       conclurait « le maire élu ne change rien » sur un système où le même
       argument vaut du simple au double. On mesure donc à l'endroit où le joueur
       le voit : sur la réplique. */
    const spread = [];
    for (const n of M.MAYOR_NODES) for (const a of M.mayorPlayable(n.id, true)) {
      const vs = MAIRES.map(mk => Math.abs(M.mayorDelta(M.mayorOpen(ctxOf({ mayorKey: mk })), a).v));
      spread.push(Math.max(...vs) / Math.max(0.01, Math.min(...vs)));
    }
    const felt = spread.filter(r => r >= 1.4).length;
    ok("⚠️⚠️ le maire ÉLU change la partie : le même argument ne vaut pas la même chose selon qui est en face",
       felt >= spread.length * 0.5, `${felt} répliques sur ${spread.length} varient d'au moins 40 % d'un maire à l'autre`);
    const g = MAIRES.map(mk => gained(play(ctxOf({ mayorKey: mk }), pickIdeal, 4000).trail));
    ok("…et deux entretiens parfaits chez deux maires ne se ressemblent pas",
       new Set(g).size >= 4, MAIRES.map((m, i) => `${m}:${g[i]}`).join(" "));
    const near = gained(play(ctxOf({ day: 28, nextElection: 30 }), pickIdeal, 4000).trail);
    const fresh = gained(play(ctxOf({ day: 2, nextElection: 30 }), pickIdeal, 4000).trail);
    ok("⚠️⚠️ l'échéance électorale aussi (premier effet de JEU d'une élection dans ce dépôt)",
       Math.abs(near - fresh) >= 5, `à 2 jours du scrutin ${near}, à 28 jours ${fresh}`);
  }

  /* La confiance : elle sert vraiment à la fois suivante. C'est la réponse de
     Guillaume sur la récompense, et elle doit être MESURABLE. */
  {
    let bad = [];
    for (const mk of MAIRES) {
      const cold = play(ctxOf({ mayorKey: mk, trust: 0, plans: false }), pickGrade("warm"), 4500).s;
      const warm = play(ctxOf({ mayorKey: mk, trust: 3, plans: false }), pickGrade("warm"), 4500).s;
      if (!(warm.peak > cold.peak + 10)) bad.push(`${mk} ${cold.peak} → ${warm.peak}`);
    }
    ok("⚠️⚠️⚠️ LA CONFIANCE SERT LA FOIS SUIVANTE (départ plus haut, il décroche moins vite)",
       bad.length === 0, bad.length ? bad.join(" · ") : "cinq maires, même jeu, sans et avec confiance");
    ok("…et un entretien parfait la donne en entier",
       M.mayorTrustGain(play(ctxOf({}), pickIdeal, 3000).s) === C.MAYOR_TRUST_MAX);
  }

  /* Il se souvient de ce qu'on lui a déjà dit. */
  {
    const fresh = gained(play(ctxOf({}), pickIdeal, 3000).trail);
    const again = gained(play(ctxOf({ burnt: M.MAYOR_SAY_KEYS.slice() }), pickIdeal, 3000).trail);
    ok("⚠️⚠️ resservir mot pour mot ce qu'il a déjà entendu ne vaut presque plus rien",
       again < fresh * 0.55, `neuf ${fresh} points gagnés, resservi ${again}`);
  }
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ §4 — LA REJOUABILITÉ CÔTÉ HÔTE
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ C'EST LE CONTRÔLE QUI PROTÈGE LE RÉSEAU, et il est de la famille du
   défaut « deux horloges » du §3 : le client joue, l'hôte REJOUE, et si les
   deux ne tombent pas sur le MÊME verdict au dixième de point près, c'est le
   client qui ferait autorité — c'est-à-dire personne. */
section("§4 la rejouabilité hôte = client");
{
  let bad = [];
  for (const mk of MAIRES) for (const plans of WORLDS) for (const trust of [0, 2]) {
    for (const [name, pick] of [["idéal", pickIdeal], ["tiède", pickGrade("warm")], ["fautif", pickGrade("fault")]]) {
      const ctx = ctxOf({ mayorKey: mk, plans, trust });
      const { s } = play(ctx, pick, (i) => 700 + i * 613 % 5000);   // des délais variés et reproductibles
      const host = M.mayorReplay(s.log, ctx);
      if (host.over !== s.over || Math.abs(host.adh - s.adh) > 0.001 || host.peak !== s.peak)
        bad.push(`${mk}/${plans}/${trust}/${name} client ${s.over}@${s.adh} vs hôte ${host.over}@${host.adh}`);
    }
  }
  ok("⚠️⚠️⚠️ l'hôte qui REJOUE la transcription tombe sur le même verdict, au dixième près",
     bad.length === 0, bad.length ? bad.slice(0, 3).join(" · ") : "60 entretiens rejoués");

  /* Une transcription tronquée n'est pas une victoire : c'est une fenêtre fermée. */
  const ctx = ctxOf({});
  const { s } = play(ctx, pickIdeal, 1000);
  ok("⚠️ une transcription tronquée ne signe pas", M.mayorReplay(s.log.slice(0, 4), ctx).over === "out");
  ok("⚠️ une transcription vide non plus", M.mayorReplay([], ctx).over === "out");
  ok("⚠️ des clés inventées ne font rien avancer",
     M.mayorReplay([{ k: "zzz", dt: 0 }, { k: "__settle", dt: 0 }], ctx).over === "out");
  /* ⚠️ ET UN `dt` NÉGATIF NE REND PAS DE POINTS. Un client modifié qui enverrait
     −60 000 remonterait la jauge en ne disant rien. */
  const cheat = M.mayorReplay(s.log.map(l => ({ ...l, dt: -60000 })), ctx);
  const honest = M.mayorReplay(s.log, ctx);
  ok("⚠️⚠️ un délai NÉGATIF ne rapporte rien de plus qu'un délai nul",
     cheat.peak <= honest.peak + 0.001, `triché ${cheat.peak}, honnête ${honest.peak}`);
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ §5 — CE QUI SE PERSISTE
   ╚═════════════════════════════════════════════════════════════════════════════ */
section("§5 l'état persisté");
{
  const e = {};
  M.migrateMayor(e);
  ok("`migrateMayor` accepte un état vierge", M.mayorSigned(e) === false && M.mayorTrust(e) === 0);
  const junk = { mayor: { ok: "oui", trust: 99, tries: -3, best: 1e9, burnt: ["m1a", "inconnue", 42], by: "x".repeat(80) } };
  M.migrateMayor(junk);
  ok("…et il nettoie n'importe quoi sans rien perdre d'utile",
     junk.mayor.trust === C.MAYOR_TRUST_MAX && junk.mayor.tries === 0 &&
     junk.mayor.best === C.MAYOR_ADH_MAX && junk.mayor.burnt.length === 1 && junk.mayor.by.length === 24);
  /* ⚠️⚠️ AUCUNE CLÉ N'EST TRONQUÉE — c'est le défaut du 469, payé 447 contrôles
     verts : une troncature qui fait tomber deux clés distinctes sur la même ne
     protège rien, elle corrompt. On borne le NOMBRE, jamais la longueur. */
  const flood = { mayor: { burnt: M.MAYOR_SAY_KEYS.concat(M.MAYOR_SAY_KEYS) } };
  M.migrateMayor(flood);
  ok("⚠️⚠️ `burnt` est borné en NOMBRE et jamais en longueur de clé",
     flood.mayor.burnt.length <= M.MAYOR_SAY_KEYS.length &&
     flood.mayor.burnt.every(k => M.MAYOR_SAY_KEYS.includes(k)),
     `${flood.mayor.burnt.length} entrées, la plus longue ${Math.max(...flood.mayor.burnt.map(k => k.length))} signes`);
  ok("…et il est idempotent", (() => {
    const a = JSON.stringify(M.migrateMayor(JSON.parse(JSON.stringify(junk))));
    const b = JSON.stringify(M.migrateMayor(JSON.parse(a)));
    return a === b;
  })());

  /* L'arbitrage. */
  const ctx = ctxOf({});
  const { s } = play(ctx, pickIdeal, 2000);
  const st = {};
  const r1 = M.resolveMayor(st, "j1", "Guillaume", s.log, ctx, 1000);
  ok("⚠️ l'hôte signe sur une transcription gagnante", r1 === "mayorSigned" && M.mayorSigned(st));
  ok("…et il inscrit qui a mené l'entretien (le second joueur le lira)", st.mayor.by === "Guillaume");
  const r2 = M.resolveMayor(st, "j2", "Autre", s.log, ctx, 2000);
  ok("⚠️⚠️ …et il est IDEMPOTENT : deux fois la même transcription ne signe pas deux fois",
     r2 === null && st.mayor.by === "Guillaume" && st.mayor.tries === 1);

  const st2 = {};
  const lost = play(ctxOf({}), pickGrade("warm"), 4000).s;
  const r3 = M.resolveMayor(st2, "j1", "Guillaume", lost.log, ctx, 1000);
  ok("un échec ne signe pas, compte une tentative, et retient ce qui a été dit",
     r3 === "mayorFailed" && !M.mayorSigned(st2) && st2.mayor.tries === 1 && st2.mayor.burnt.length > 0);
  ok("…et il garde la meilleure jauge atteinte", st2.mayor.best > 0, `${st2.mayor.best}`);
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ §6 — LE CORPS DU MAIRE EST LE SECOND AFFICHAGE
   ╚═════════════════════════════════════════════════════════════════════════════ */
section("§6 sa posture");
{
  const s = M.mayorOpen(ctxOf({}));
  const seen = new Set();
  for (let a = 0; a <= 100; a += 2) { s.adh = a; s.streak = 0; seen.add(M.mayorPose(s, null)); }
  s.streak = 9; seen.add(M.mayorPose(s, null));
  seen.add(M.mayorPose(s, "fault"));
  ok("⚠️⚠️ la posture BALAIE toute la jauge et distingue au moins cinq états",
     seen.size >= 5, [...seen].join(", "));
  ok("…et chaque posture rendue est une posture dessinable",
     [...seen].every(p => M.MAYOR_POSES.includes(p)), [...seen].join(", "));
  /* ⚠️ MONOTONE : une posture qui ferait un aller-retour au milieu de la jauge
     apprendrait au joueur à ne plus lire le corps du maire. */
  const rank = {}; M.MAYOR_POSES.forEach((p, i) => rank[p] = i);
  let mono = true, prev = -1;
  for (let a = 0; a <= 100; a++) { s.adh = a; s.streak = 0; const r = rank[M.mayorPose(s, null)]; if (r < prev) mono = false; prev = r; }
  ok("⚠️ elle ne fait jamais marche arrière quand la jauge monte", mono);
}

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ §7 — UNE TRANSCRIPTION, PARCE QU'UN BANC DE DIALOGUE DOIT MONTRER UN DIALOGUE
   ╚═════════════════════════════════════════════════════════════════════════════ */
section("§7 trois entretiens joués, en clair");
{
  const L = FERME_STR.fr.maire;
  const show = (titre, ctx, pick, dt) => {
    const { s, trail } = play(ctx, pick, dt);
    const cand = C.TOWN_CANDIDATES.find(c => c.key === ctx.mayorKey);
    console.log(`\n──── ${titre} · ${cand.emoji} ${ctx.mayorKey}${ctx.plans ? "" : " · MAINS VIDES"}${ctx.trust ? ` · confiance ${ctx.trust}` : ""} ────`);
    for (const t of trail) {
      const say = t.key === "__plans" ? "(il déroule les plans sur le bureau)"
                : t.key === "__settle" ? L.settle : L.say[t.key];
      const why = t.why.map(w => w.why).join("+");
      console.log(`  ${String(t.from).padStart(5)} → ${String(t.to).padStart(5)}  ${(t.delta >= 0 ? "+" : "") + t.delta}`.padEnd(28)
        + `${(t.grade || "").padEnd(6)} ${say.slice(0, 74)}${why ? "   [" + why + "]" : ""}`);
    }
    console.log(`  ═══ ${s.over.toUpperCase()} · sommet ${s.peak} · confiance gagnée ${M.mayorTrustGain(s)} · ${L.end[M.mayorGrade(s)] ? L.end[M.mayorGrade(s)].slice(0, 96) : ""}`);
    return s;
  };
  const a = show("le sans-faute", ctxOf({ mayorKey: "lantier" }), pickIdeal, 3200);
  const b = show("le tiède appliqué", ctxOf({ mayorKey: "bonnefoy" }), (c, st, n) =>
    (n === "m5" && c.some(x => x.kind === "plans")) ? "__plans" : pickGrade("warm")(c), 3200);
  const c2 = show("bien parti, puis « Dites votre prix »", ctxOf({ mayorKey: "delaunay" }), (c, st, n) => {
    if (n === "m11") return "m11c";
    if (n === "m5" && c.some(x => x.kind === "plans")) return "__plans";
    return pickGrade("ideal")(c);
  }, 3200);
  /* ⚠️⚠️ LE PREMIER ESSAI D'UN VRAI JOUEUR, ET C'EST CELUI-LÀ QU'IL FAUT RELIRE :
     il ne trouve pas la meilleure réponse à tous les coups, il commet une faute
     de tact au milieu, et il met quatre à six secondes à choisir. C'est le seul
     entretien de cette section qui ressemble à ce que la soirée produira. */
  const d = show("un premier essai ordinaire (une faute de tact au milieu)",
    ctxOf({ mayorKey: "toussaint" }), (c, st, n) => {
      const i = M.MAYOR_NODE_IDS.indexOf(n);
      if (n === "m5" && c.some(x => x.kind === "plans")) return "__plans";
      if (i === 6) return pickGrade("fault")(c);
      return pickGrade(i % 3 === 1 ? "warm" : "ideal")(c);
    }, (i) => 4200 + (i * 977) % 2600);
  /* ⚠️ ET LE MÊME JOUEUR SANS LES PLANS : c'est la moitié de la décision de
     Guillaume (« très difficile »), et elle ne se lit nulle part ailleurs. */
  const e2 = show("les mains vides, sans faute", ctxOf({ mayorKey: "bonnefoy", plans: false }), pickIdeal, 3600);
  console.log("");
  ok("les cinq entretiens lus ci-dessus finissent comme ils doivent",
     a.over === "signed" && b.over !== "signed" && c2.over === "thrown" && e2.over === "signed",
     `${a.over} / ${b.over} / ${c2.over} / ${d.over} / ${e2.over}`);
  /* ⚠️⚠️ UN PREMIER ESSAI ORDINAIRE NE DOIT NI GAGNER FACILEMENT NI HUMILIER :
     il doit finir PRÈS du seuil. C'est la seule mesure de « difficulté juste »
     que ce banc sache faire, et elle vaut mieux que rien — un entretien qu'un
     joueur moyen rate de quarante points est un mur, un qu'il passe sans y
     penser est un couloir. */
  ok("⚠️⚠️ …et le premier essai ordinaire se joue PRÈS du seuil, des deux côtés",
     Math.abs(d.peak - C.MAYOR_ADH_WIN) <= 25,
     `sommet ${d.peak} contre un seuil à ${C.MAYOR_ADH_WIN} (${d.over})`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
