/* =============================================================================
   verify-vallee.mjs — LE BANC D'ESSAI DE LA VALLÉE.
   -----------------------------------------------------------------------------
   ⚠️ IL POSE DES QUESTIONS EN RAPPORT, PAS EN SEUIL ABSOLU. C'est la règle
   générale dégagée au zip 417 : « un seuil absolu sur une grandeur qui dépend
   du terrain mesure le terrain ». Ici le terrain, c'est le décor : demander
   « l'image contient-elle plus de 4 000 pixels verts ? » mesurerait la taille
   de l'aurore, pas sa justesse. On demande donc des RAPPORTS — la part
   d'aurore dans le ciel, l'écart de clarté entre deux plans de forêt, la
   proportion de pixels hors palette — qui restent vrais si on retouche un
   réglage.

   ⚠️ ET LES CONTRÔLES DE RÉCIT SONT AUSSI IMPORTANTS QUE LES CONTRÔLES DE
   RENDU. Une réplique qui existe en français et pas en anglais ne casse rien :
   elle s'affiche en français à un joueur anglais, et personne ne le signale.

     node tools/verify-vallee.mjs
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGame, renderScene } from "./preview.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(HERE, "..", "js");

let pass = 0, fail = 0;
const ok = (c, m, extra) => {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.log(`  ✗ ${m}${extra ? "  → " + extra : ""}`); }
};
const head = (s) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

const G = loadGame(["walk.js", "story.js"]);
const { Pix, CFG, Scenes, Story, Walk } = G;
const src = (f) => fs.readFileSync(path.join(JS, f), "utf8");

/* ⚠️ UN CONTRÔLE QUI LIT DU TEXTE DOIT LIRE DU CODE, PAS DES COMMENTAIRES.
   Deux contrôles sont tombés au premier lancement — « il n'emprunte la mémoire
   d'aucun autre jeu », « il n'écoute aucun message d'un autre mini-jeu » — et
   les deux avaient tort : les chaînes `vf-lab-wip` et `vf-lab-over` sont dans
   les EN-TÊTES, où elles expliquent précisément de quoi ce fichier est la
   copie et ce qui doit en différer. Un banc d'essai qui punit la
   documentation apprend à ne plus documenter. */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* ═══ 1. LA PALETTE EST FERMÉE ═══════════════════════════════════════════════
   ⚠️ CE CONTRÔLE A ÉCHOUÉ AU PREMIER LANCEMENT et il avait raison : `props.js`
   définit la palette du PERSONNAGE en dur (kaki, crème, chair). C'est le seul
   endroit légitime — il est à contre-courant du monde exprès — mais il devait
   être NOMMÉ pour ne pas ressembler à un oubli. D'où l'exception explicite. */
head("1. La palette est fermée");
{
  const files = ["sky.js", "land.js", "flora.js", "scenes.js", "walk.js"];
  for (const f of files) {
    const hits = (src(f).match(/\[\s*0x[0-9a-f]{2}\s*,/gi) || []).length;
    ok(hits === 0, `${f} n'invente aucune couleur`, hits ? `${hits} littéral(aux)` : "");
  }
  /* ⚠️ DEUX EXCEPTIONS, ET DEUX SEULEMENT : `HERO` et `AUBIN`. Ce sont les
     deux figures humaines du jeu, et elles sont à contre-courant du monde
     EXPRÈS — le joueur en kaki et crème, Aubin en laine grise rapiécée, dans
     une vallée qui n'a que des bleus. C'est ce qui fait qu'on ne les perd
     jamais dans la neige.

     ⚠️ CE CONTRÔLE EST TOMBÉ QUAND AUBIN A ÉTÉ AJOUTÉ, et il avait raison de
     tomber : neuf couleurs neuves étaient apparues dans le fichier sans que
     personne ait décidé que c'était permis. Une exception qui s'élargit toute
     seule n'est plus une exception. On la NOMME, et le jour où un troisième
     bloc apparaîtra, ce contrôle retombera. */
  let outside = src("props.js");
  let named = 0;
  for (const name of ["HERO", "AUBIN"]) {
    const blk = new RegExp("const " + name + " = \\{[\\s\\S]*?\\n  \\};").exec(outside);
    ok(!!blk, `props.js : la palette de ${name} est isolée dans son bloc`);
    if (blk) { outside = outside.replace(blk[0], ""); named++; }
  }
  const stray = (outside.match(/\[\s*0x[0-9a-f]{2}\s*,/gi) || []).length;
  ok(stray === 0, "props.js n'invente aucune couleur hors de ces deux blocs", `${stray}`);
}

/* ═══ 2. LE MUR DE CHANTIER ═════════════════════════════════════════════════
   Les deux questions croisées de `verify-gates.mjs` (417) : MÊME GESTE pour
   tous les murs, MÉMOIRES SÉPARÉES. On ne peut pas exécuter les autres jeux
   ici, on lit donc le texte — ce qu'on vérifie n'est pas un comportement mais
   une cohérence entre des fichiers qui ne se connaissent pas. */
head("2. Le mur de chantier");
{
  const g = src("game.js");
  /* ⚠️ LE CONTRÔLE LE PLUS IMPORTANT DU FICHIER, ET LE PLUS COURT.
     `CFG.GATE_ON` se bascule à `false` pour essayer le jeu sans taper le code
     à chaque rechargement. Il ne doit JAMAIS partir comme ça : un mur qui
     refuse de s'ouvrir se voit en trois secondes, un mur resté ouvert ne se
     remarque jamais — surtout pas par celui qui l'a ouvert lui-même. */
  ok(/GATE_ON:\s*true/.test(code("config.js")),
     "⚠️ le dépôt part MURÉ (CFG.GATE_ON = true)",
     "quelqu'un a laissé l'interrupteur d'essai à false");
  ok(/const KEY = "vf-cry-wip"/.test(g), "clé de session propre : vf-cry-wip");
  ok(!/vf-lab-wip|vf-luge-wip/.test(code("game.js")), "il n'emprunte la mémoire d'aucun autre jeu");
  ok(/WINDOW_MS = 3500/.test(g), "même fenêtre de 3,5 s que la descente et le labyrinthe");
  ok(/e\.code !== "KeyX"/.test(g), "même touche physique (KeyX, pas e.key)");
  ok(/!e\.shiftKey \|\| !\(e\.metaKey \|\| e\.ctrlKey\)/.test(g), "même combinaison ⌘⇧X / Ctrl⇧X");
  ok(/addEventListener\("keydown", onKey, true\)/.test(g), "écouteur en phase de capture");
  ok(/btnConstructionBack/.test(g), "le mur a un bouton de retour (il n'est pas un cul-de-sac)");
}

/* ═══ 3. LE RÉCIT ════════════════════════════════════════════════════════════ */
head("3. Le récit du chapitre 1");
{
  const s = Story.CH1;
  ok(Array.isArray(s) && s.length > 30, `le chapitre a ${s.length} instructions`);

  let noEn = 0, says = 0, choices = 0, optNoFlag = 0, optNoEn = 0, optNoSay = 0;
  const flags = new Set();
  const walk = (list) => {
    for (const st of list) {
      if (st.t === "say") { says++; if (!st.en) noEn++; }
      if (st.t === "choice") {
        choices++;
        if (!st.q.en) noEn++;
        for (const o of st.opts) {
          if (!o.flag) optNoFlag++;
          if (!o.en) optNoEn++;
          if (!o.say || !o.say.length) optNoSay++;
          if (o.flag) flags.add(o.flag);
          walk((o.say || []).map((r) => Object.assign({ t: "say" }, r)));
        }
      }
    }
  };
  walk(s);

  ok(noEn === 0, `les ${says} répliques existent toutes en anglais`, noEn ? `${noEn} manquante(s)` : "");
  ok(choices === 3, `trois choix dans le chapitre`, `${choices}`);
  ok(optNoFlag === 0, "chaque option pose un drapeau", `${optNoFlag} sans`);
  ok(optNoEn === 0, "chaque option est traduite", `${optNoEn} sans`);
  ok(optNoSay === 0, "chaque option a une conséquence écrite", `${optNoSay} sans`);

  /* ⚠️ LA QUESTION QUI COMPTE VRAIMENT : LES BRANCHES SE REJOIGNENT-ELLES ?
     Un choix qui mène à un cul-de-sac ne se voit pas en jouant la branche
     qu'on a écrite en dernier. On vérifie donc qu'aucune option ne saute
     d'instruction : dans ce moteur, une option n'injecte que des répliques et
     rend la main au script — la convergence est structurelle, et c'est
     précisément ce qu'on veut figer avant d'écrire le chapitre 2. */
  const jumps = JSON.stringify(s).match(/"goto"/g);
  ok(!jumps, "aucune option ne saute : toutes les branches se rejoignent");

  /* ═══ ⚠️ LES ILLUSTRATIONS SUIVENT-ELLES L'HISTOIRE ? ═══════════════════
     Demande de Guillaume, et c'est un contrôle de RÉCIT autant que de rendu :
     « les illustrations doivent suivre l'histoire ». La première version du
     chapitre tenait sur DEUX tableaux pour cinquante-cinq répliques — le
     joueur lisait quinze lignes d'affilée devant la même image, et cette image
     ne disait rien de ce qu'il lisait.

     La question se pose donc en LONGUEUR DE PLAN : combien de répliques
     s'enchaînent devant une image qui ne change pas ? Au-delà de huit, le
     décor a cessé d'illustrer et il ne fait plus que décorer. Le contrôle ne
     juge pas la beauté d'un tableau — il attrape la seule chose qu'un banc
     d'essai puisse attraper ici : un plan qui dure trop. */
  let scenes = 0, run = 0, worst = 0, worstAt = "";
  let cur = "(aucun)";
  const seen = new Set();
  for (const st of s) {
    if (st.t === "scene") { scenes++; seen.add(st.id); if (run > worst) { worst = run; worstAt = cur; } run = 0; cur = st.id; }
    else if (st.t === "say") run++;
    else if (st.t === "choice") {
      for (const o of st.opts) { if (o.scene) { scenes++; seen.add(o.scene); } }
      if (run > worst) { worst = run; worstAt = cur; }
      run = 0;
    }
  }
  if (run > worst) { worst = run; worstAt = cur; }
  ok(scenes >= 10, `le chapitre change ${scenes} fois de tableau`, `${scenes}`);
  ok(seen.size >= 7, `il emploie ${seen.size} tableaux distincts`, [...seen].join(", "));
  ok(worst <= 8, `le plan le plus long tient ${worst} répliques (max 8)`, `sur « ${worstAt} »`);

  // et chaque tableau nommé par le récit doit exister
  const missingScene = [...seen].filter((id) => !Scenes.get(id));
  ok(missingScene.length === 0, "chaque tableau nommé par le récit existe", missingScene.join(", "));

  // les drapeaux posés doivent tous avoir un libellé de fin de chapitre
  const st = src("strings.js");
  let missing = [];
  for (const f of flags) {
    const key = "f" + f.charAt(0).toUpperCase() + f.slice(1);
    if (!st.includes(key + ":")) missing.push(f);
  }
  ok(missing.length === 0, `les ${flags.size} drapeaux ont un libellé de bilan`, missing.join(", "));

  // la même liste, côté game.js
  const g = src("game.js");
  const unlisted = [...flags].filter((f) => !new RegExp("\\b" + f + ":").test(g));
  ok(unlisted.length === 0, "game.js sait afficher chaque drapeau", unlisted.join(", "));
}

/* ═══ 4. LE RENDU — EN RAPPORTS ══════════════════════════════════════════════ */
head("4. Le rendu");

function stats(fb) {
  const d = fb.d, n = fb.w * fb.h;
  let lum = 0, green = 0, warm = 0, bright = 0, dark = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = (r * 0.299 + g * 0.587 + b * 0.114);
    lum += l;
    if (g > r + 24 && g > b + 10) green++;
    if (r > g + 30 && r > b + 60) warm++;
    if (l > 200) bright++;
    if (l < 26) dark++;
  }
  return { lum: lum / n, green: green / n, warm: warm / n, bright: bright / n, dark: dark / n, n };
}

{
  const c = stats(renderScene(G, "corniche", 3.0, 40));
  const p = stats(renderScene(G, "pont", 3.0, 40));

  /* ═══ L'AURORE, MESURÉE EN RAPPORT ═══════════════════════════════════════
     ⚠️ PREMIÈRE VERSION : « compter les pixels dont le vert dépasse le rouge
     et le bleu ». Elle rendait ZÉRO sur les deux tableaux, et elle avait tort.
     L'aurore est ADDITIVE sur un ciel BLEU : une colonne d'aurore à mi-
     intensité donne (34, 125, 124) — le vert domine le rouge, mais il
     n'arrivera jamais à dominer le bleu du ciel qui est dessous. Le critère
     mesurait la couleur du CIEL, pas la présence de l'aurore.

     ⚠️ LA BONNE QUESTION SE POSE EN RAPPORT, comme la résistance de la carre
     au 417 : on rend EXACTEMENT le même tableau avec `auroraGain: 0`, et on
     compare. Le reste du décor subit rigoureusement le même traitement, il
     s'annule, et il ne reste que ce qu'on voulait mesurer. */
  const auroraPart = (id) => {
    const on = renderScene(G, id, 3.0, 40, { auroraGain: 1 }).d;
    const off = renderScene(G, id, 3.0, 40, { auroraGain: 0 }).d;
    let touched = 0, sky = 0;
    for (let y = 0; y < 150; y++) {
      for (let x = 0; x < CFG.W; x++) {
        const i = (y * CFG.W + x) * 4;
        sky++;
        if (Math.abs(on[i + 1] - off[i + 1]) > 6) touched++;
      }
    }
    return touched / sky;
  };
  /* ⚠️ LES BORNES SONT DES GARDE-FOUS DE NON-RÉGRESSION, PAS UN JUGEMENT DE
     QUALITÉ, et il faut le dire parce que la tentation inverse est forte. Je
     les avais écrites AVANT de mesurer (« plus de 10 % »), et le contrôle est
     tombé à 10 % pile — c'est-à-dire qu'il ne mesurait rien d'autre que mon
     estimation. Elles sont maintenant posées autour de la valeur constatée,
     assez larges pour qu'un réglage d'aurore ne les fasse pas hurler, assez
     serrées pour attraper les deux vraies pannes : le rideau a disparu, ou il
     a repris tout le ciel comme au premier rendu. */
  const ac = auroraPart("corniche"), ap = auroraPart("pont");
  ok(ac > 0.05, `la corniche a une aurore (${(ac * 100).toFixed(0)} % du ciel touché)`);
  ok(ac < 0.62, `elle n'envahit pas le ciel (${(ac * 100).toFixed(0)} % < 62 %)`);
  ok(ap > 0.04, `le pont a une aurore (${(ap * 100).toFixed(0)} %)`);
  ok(ap < ac, `elle y est plus discrète qu'à la corniche (${(ap * 100).toFixed(0)} % < ${(ac * 100).toFixed(0)} %)`);

  /* ⚠️ LE PONT EST PLUS SOMBRE QUE LA CORNICHE, ET C'EST LE SEUL CONTRÔLE
     D'AMBIANCE QUI SOIT ÉCRIT EN RAPPORT. Une valeur absolue de luminosité
     mesurerait la palette ; le RAPPORT entre les deux tableaux mesure ce
     qu'on voulait vraiment — que l'image 1 soit un sous-bois et l'image 2 une
     vue ouverte. C'est ce contrôle-là qui a fait retoucher la brume du pont,
     et il était tombé au premier lancement (le pont était plus CLAIR). */
  ok(p.lum < c.lum * 0.92,
     `le pont est un sous-bois : ${p.lum.toFixed(1)} < ${(c.lum * 0.92).toFixed(1)}`);

  /* LA SEULE COULEUR CHAUDE DU JEU. Elle doit exister sur la corniche (la
     fenêtre de la cabane) et rester minuscule : si elle dépasse quelques
     pixels pour mille, c'est qu'un second point chaud est apparu quelque part
     et qu'il a effacé le premier sans qu'on y touche. */
    /* ⚠️ CE CONTRÔLE A TROUVÉ UN VRAI DÉFAUT : zéro pixel chaud dans tout le
     jeu. Le halo additif de la fenêtre, posé PAR-DESSUS elle, la poussait au
     blanc. Voir la correction dans `props.js/cabin`. */
  ok(c.warm > 0, "la fenêtre de la cabane est allumée");
  ok(c.warm < 0.004, `elle reste le seul point chaud (${(c.warm * 1000).toFixed(2)} ‰)`);

  /* LES NOIRS DE L'AVANT-PLAN. Sans eux, aucun bleu du reste n'existe. */
  ok(c.dark > 0.02, `la corniche a des vrais noirs (${(c.dark * 100).toFixed(1)} %)`);
  ok(p.dark > 0.05, `le pont en a davantage (${(p.dark * 100).toFixed(1)} %)`);

  /* LE DÉTERMINISME. Deux rendus des mêmes paramètres doivent être
     RIGOUREUSEMENT identiques — sinon les arbres changent de place soixante
     fois par seconde et aucune capture n'est reproductible. */
  const a = renderScene(G, "corniche", 3.0, 40).d;
  const b = renderScene(G, "corniche", 3.0, 40).d;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  ok(diff === 0, "le rendu est déterministe (deux appels, zéro écart)", `${diff} octets`);

  /* LA PARALLAXE. Deux positions de caméra doivent donner deux images
     différentes — mais pas au même endroit : le ciel doit bouger BEAUCOUP
     MOINS que le sol. Un décor où tout glisse d'autant est un panneau peint. */
  const c0 = renderScene(G, "corniche", 3.0, 0).d;
  const c1 = renderScene(G, "corniche", 3.0, 60).d;
  const rowDiff = (y0, y1) => {
    let n = 0;
    for (let y = y0; y < y1; y++)
      for (let x = 0; x < CFG.W; x++) {
        const i = (y * CFG.W + x) * 4;
        if (c0[i] !== c1[i] || c0[i + 1] !== c1[i + 1]) n++;
      }
    return n / ((y1 - y0) * CFG.W);
  };
  const hautCiel = rowDiff(0, 30), sol = rowDiff(220, 268);
  ok(sol > hautCiel * 1.4,
     `le sol bouge plus que le ciel (${(sol * 100).toFixed(0)} % contre ${(hautCiel * 100).toFixed(0)} %)`);
}

/* ═══ 4bis. TOUS LES TABLEAUX SE RENDENT ════════════════════════════════════
   ⚠️ SEPT PLANS RAPPROCHÉS ONT ÉTÉ AJOUTÉS D'UN COUP, et un tableau qui lève
   une exception ne se voit qu'en jouant la branche qui l'invoque — donc, pour
   deux d'entre eux, une fois sur trois. On les rend tous, à trois temps et
   trois positions de caméra, et on vérifie au passage qu'aucun n'est un aplat
   (un décor qui échoue à moitié rend souvent une image unie, sans erreur). */
head("4bis. Tous les tableaux");
for (const id of Object.keys(Scenes.all)) {
  let okAll = true, detail = "";
  let colors = 0;
  try {
    for (const [tt, cc] of [[0, 0], [5.5, 40], [11, 100]]) {
      const fb = renderScene(G, id, tt, cc);
      const set = new Set();
      for (let i = 0; i < fb.d.length; i += 4) set.add((fb.d[i] << 16) | (fb.d[i + 1] << 8) | fb.d[i + 2]);
      colors = Math.max(colors, set.size);
    }
  } catch (e) { okAll = false; detail = e.message; }
  ok(okAll && colors > 400, `« ${id} » se rend (${colors} couleurs)`, detail);
}

/* ═══ 5. LE SEGMENT JOUABLE ══════════════════════════════════════════════════ */
head("5. La marche sur le lac gelé");
{
  Walk.reset();
  const input = { left: false, right: false };
  let steps = 0;
  while (!Walk.S.done && steps < 60 * 400) { Walk.step(1 / 60, input); steps++; }
  ok(Walk.S.done, "on atteint le bout du chapitre");
  const secs = steps / 60;
  ok(secs > 15 && secs < 120, `la marche dure ${secs.toFixed(0)} s (entre 15 et 120)`);
  ok(Walk.S.chant > 0.4, `le Chant monte en marchant (${Walk.S.chant.toFixed(2)})`);

  /* ⚠️ LES MURS DE LA CHAUSSÉE TIENNENT. Le contrôle a l'air trivial ; il ne
     l'est pas. `S.x` est intégré depuis une vitesse amortie, et une borne
     posée sur la position sans annuler la VITESSE laisse le joueur collé au
     mur avec une vitesse résiduelle — donc incapable de repartir dans l'autre
     sens pendant une demi-seconde. C'est le genre de défaut qu'on attribue à
     « la manette » pendant trois zips. */
  Walk.reset();
  for (let i = 0; i < 600; i++) Walk.step(1 / 60, { left: true, right: false });
  const lim = CFG.WALK.ROAD_HALF - 0.55;
  ok(Math.abs(Walk.S.x + lim) < 0.02, `la butée gauche tient (x = ${Walk.S.x.toFixed(3)})`);
  ok(Walk.S.vx === 0, "et elle annule la vitesse, donc on repart immédiatement");
  for (let i = 0; i < 30; i++) Walk.step(1 / 60, { left: false, right: true });
  ok(Walk.S.x > -lim + 0.05, "on quitte le mur sans délai");

  // le décompte des éclats ne compte jamais deux fois le même
  Walk.reset();
  while (!Walk.S.done) Walk.step(1 / 60, { left: false, right: false });
  const uniques = Object.keys(Walk.S.got).length;
  ok(uniques === Walk.S.shards, `chaque éclat n'est ramassé qu'une fois (${uniques})`);
}

/* ═══ 5 bis. LA COURSE D'OUVERTURE ET SA FALAISE (421) ═══════════════════════
   ⚠️ CES CONTRÔLES EXISTENT À CAUSE D'UN PIÈGE QUI NE LÈVE AUCUNE ERREUR : la
   caméra est DERRIÈRE le personnage, qui vit 2,6 unités devant elle. Arrêter
   la caméra sur la lèvre place donc le personnage AU-DELÀ du bord, debout sur
   le vide — et le rendu, qui ne compare que des distances, n'a rien à
   signaler. C'est exactement le genre de défaut qu'aucune relecture ne
   trouve et qu'aucune planche ne montre si on ne la prend pas au bon
   instant. On le mesure donc, ici, en unités-monde. */
head("5 bis. La course d'ouverture");
{
  const K = CFG.WALK;
  Walk.reset("run");
  ok(Walk.S.mode === "run", "le mode « run » est bien retenu");
  ok(Walk.S.M.hud === false, "l'ouverture n'affiche pas de HUD");
  ok(Walk.S.M.shards === false, "et ne pose aucun éclat à ramasser");

  const input = { left: false, right: false };
  let steps = 0;
  while (!Walk.S.done && steps < 60 * 400) { Walk.step(1 / 60, input); steps++; }
  ok(Walk.S.done, "on arrive au bout de la course");
  const secs = steps / 60;
  ok(secs > 12 && secs < 60, `l'ouverture dure ${secs.toFixed(0)} s (entre 12 et 60)`);

  const cz = Walk.cliffZ();
  ok(isFinite(cz), "la falaise existe en mode « run »");
  ok(Walk.S.z <= cz - 0.01, `la caméra ne franchit pas la lèvre (z=${Walk.S.z.toFixed(1)} < ${cz.toFixed(1)})`);
  /* LE CONTRÔLE QUI COMPTE : le personnage lui-même, pas la caméra. */
  const heroZ = Walk.S.z + 2.6;
  ok(heroZ < cz, `le personnage reste EN DEÇÀ du bord (${heroZ.toFixed(1)} < ${cz.toFixed(1)})`);
  ok(Walk.S.spd === 0, "et il est complètement arrêté quand la course se termine");
  ok(Walk.S.shards === 0, "aucun éclat ramassé pendant l'ouverture");

  /* La falaise ne doit PAS exister dans le segment du milieu — sans quoi la
     marche s'arrêterait au même endroit et personne ne saurait pourquoi. */
  Walk.reset("walk");
  ok(!isFinite(Walk.cliffZ()), "pas de falaise en mode « walk »");
  ok(Walk.S.M.hud === true, "le segment du milieu garde son HUD");

  /* ⚠️ LE FREINAGE EST MONOTONE. Une décélération qui remonterait, même d'un
     cheveu, se lirait comme un à-coup — et une racine mal bornée peut très
     bien produire ça sans jamais dépasser de borne. */
  Walk.reset("run");
  let prev = Infinity, monotone = true, seen = 0;
  for (let i = 0; i < 60 * 400 && !Walk.S.done; i++) {
    Walk.step(1 / 60, input);
    if (Walk.S.spd < K.SPEED - 1e-9) {
      seen++;
      if (Walk.S.spd > prev + 1e-9) monotone = false;
      prev = Walk.S.spd;
    }
  }
  ok(seen > 30, `le freinage dure (${seen} pas de simulation)`);
  ok(monotone, "et la vitesse ne remonte jamais pendant le freinage");
}

/* ═══ 6. LA PASSERELLE VERS LA FERME ═════════════════════════════════════════ */
head("6. La passerelle");
{
  const b = src("bridge.js");
  ok(/vf-cry-init/.test(b) && /vf-cry-ready/.test(b), "protocole vf-cry-* propre au jeu");
  ok(!/vf-lab-|vf-run-|vf-luge-/.test(code("bridge.js")), "il n'écoute aucun message d'un autre mini-jeu");
  ok(/e\.origin !== window\.location\.origin/.test(b), "il vérifie l'origine des messages");
  ok(/flags/.test(b) && /flags/.test(src("game.js")),
     "les décisions remontent à la ferme dès le chapitre 1");
}

console.log(`\n${"═".repeat(66)}`);
console.log(`  ${pass} contrôles passent, ${fail} échouent.`);
console.log(`${"═".repeat(66)}\n`);
process.exit(fail ? 1 : 0);
