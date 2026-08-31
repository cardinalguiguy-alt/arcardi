/* =============================================================================
   verify-scierie.mjs — LA SCIE DE TRISTAN, JOUÉE.
   -----------------------------------------------------------------------------
       node tools/verify-scierie.mjs

   ⚠️⚠️ IL JOUE, IL NE RELIT PAS UNE TABLE. C'est le troisième banc du dépôt à le
   faire (après `verify-maire` et `verify-ludo`), et pour la scie c'est la seule
   forme possible : la difficulté n'est écrite NULLE PART — elle ÉMERGE d'une
   lame qui a de l'inertie, d'un partenaire qui répond au lieu de mener, et d'un
   tempo qui dilate le temps. Aucune relecture ne peut dire si une manche est
   gagnable ; il faut la jouer, avec plusieurs joueurs, plusieurs latences et
   plusieurs graines.

   ⚠️⚠️⚠️ ET IL TIENT LA SEULE PROPRIÉTÉ DONT DÉPEND TOUT LE RÉSEAU : **le rejeu
   de l'hôte donne exactement la manche du client**. Le client fait tourner la
   simulation en direct, avec des images de durée variable ; l'hôte la rejoue à
   partir d'une liste d'entiers. Si les deux divergeaient d'un seul pas, le
   joueur verrait une manche gagnée à l'écran et refusée par le réseau — le pire
   symptôme possible, parce que rien ne l'expliquerait. Le §3 (« ne jamais
   comparer deux horloges ») est ce qui rend la chose faisable ; ce banc est ce
   qui rend la chose VRAIE.

   CE QU'IL MESURE :
     1. le déterminisme (deux rejeux du même journal sont identiques, champ par
        champ) et l'accord direct/rejeu, sur des cadences d'image irrégulières ;
     2. la manche est gagnable ET perdable — les deux, sinon ce n'est pas un jeu ;
     3. la difficulté est CONTINUE en la latence du joueur : un joueur plus lent
        doit avoir une note plus basse, pas une note au hasard ;
     4. marteler ne paie jamais (ni en note, ni en temps) — c'est la seule
        défense de la mécanique contre elle-même, et elle doit être mesurée ;
     5. toutes les grandeurs restent dans leurs bornes, sur des dizaines de
        milliers de pas (une lame hors de sa course est un dessin faux) ;
     6. `sawWould` dit exactement ce que `sawPull` fait — l'interface et
        l'arbitre lisent la même règle (défaut du 449 : deux réponses à la même
        question, les deux au vert, jamais comparées) ;
     7. un journal du réseau ne peut pas casser le résolveur (désordre,
        doublons, négatifs, longueur démesurée) ;
     8. les sept verdicts de la mécanique ont sept phrases, dans les DEUX
        langues — une jointure, jamais deux listes (444).

   CE QU'IL NE MESURE PAS, ET IL FAUT LE DIRE (§14.5) :
     · il ne dit RIEN de ce qu'on ressent. « Est-ce agréable ? » ne se mesure
       nulle part et ne le sera jamais ; c'est ce qui se juge en jouant.
     · il ne joue PAS à deux clients. La seconde poignée est écrite
       (`sawPull(s, -1)`) et jamais transportée : le §17.6 promet deux joueurs
       sur la même scie, et cette moitié-là reste à faire.
     · il ne regarde AUCUNE image. C'est `render-scierie.mjs` qui rastérise
       l'atelier, et il a trouvé quatre défauts qu'aucun chiffre d'ici ne
       pouvait voir.
   ============================================================================= */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ⚠️ COPIE DANS `os.tmpdir()` (motif de `render-maire`) : ce banc ne salit pas
   l'arbre de travail, donc `git status` reste un contrôle de propreté. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "scierie-"));
const copied = new Set();
const copy = (n) => {
  if (copied.has(n)) return;
  copied.add(n);
  const src = fs.readFileSync(path.join(ROOT, "components", "ferme", n + ".js"), "utf8");
  fs.writeFileSync(path.join(tmp, n + ".js"), src.replace(/from "\.\/([A-Za-z0-9_]+)"/g, 'from "./$1.js"'));
  for (const m of src.matchAll(/from "\.\/([A-Za-z0-9_]+)"/g)) copy(m[1]);
};
copy("scierie");
copy("fermeStrings");
const S = await import(pathToFileURL(path.join(tmp, "scierie.js")).href);
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const STR = await import(pathToFileURL(path.join(tmp, "fermeStrings.js")).href);

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
const PARTS = ["hull", "rudder", "mast", "sail", "bell"];

/* ═══════════════════════════════════════════════════════════════════════════
   LES JOUEURS — trois façons de tenir une poignée
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ ILS JOUENT AVEC `sawWould`, C'EST-À-DIRE AVEC CE QUE LE HUD MONTRE, et
   pas avec une copie des conditions. Un banc qui recoderait le verdict jouerait
   un autre jeu que celui qu'on affiche — c'est le banc qui repeint au lieu
   d'appeler (439), transposé à une décision.
   `lag` est la latence du joueur, en pas de simulation : c'est la seule grandeur
   qui sépare un bon joueur d'un mauvais, et elle correspond à quelque chose de
   réel (8,3 ms par pas, donc 24 pas = 200 ms, le temps de réaction d'un humain
   moyen sur un signal visuel attendu).
   ═══════════════════════════════════════════════════════════════════════════ */
function playRhythm(part, lag, opts) {
  const o = opts || {};
  const s = S.sawInit({ part, planks: o.planks });
  const log = [];
  let armed = -1, idle = 0;
  const seen = { bx: [9, -9], stress: [9, -9], stam: [9, -9], tempo: [9, -9], cut: [9, -9], bind: [9, -9] };
  while (!s.over) {
    /* il voit la fenêtre s'ouvrir, puis il réagit `lag` pas plus tard */
    if (armed < 0 && S.sawWould(s) === "perfect") armed = s.tick + lag;
    /* ⚠️⚠️ ET S'IL RATE LA FENÊTRE, IL TIRE QUAND MÊME. Sans cette ligne le
       modèle se FIGE : une fois le mou installé, `sawWould` ne rend plus jamais
       « parfait », donc un joueur qui n'attend que ça ne tire plus, donc la lame
       ne repart pas — un blocage du BANC, pas du jeu. Un vrai joueur relance ;
       il relance mal, ce qui est très exactement ce qu'on veut mesurer.
       *Un modèle de joueur qui peut se bloquer mesure sa propre naïveté.*
       ⚠️ ET LA CONDITION EST UN VRAI ARRÊT, PAS UN DÉLAI : posée sur le seul
       temps écoulé (1,4 s), elle se déclenchait à CHAQUE cycle — un aller-retour
       en dure 1,4 — et le joueur « parfait » tombait de 1,00 à 0,57 de note.
       C'est le banc qui se mesure lui-même : *un secours qui se déclenche en
       régime normal n'est pas un secours, c'est une seconde stratégie.* */
    if (armed < 0 && idle > C.SAW_HZ * 2.2 && s.pull <= 0 && s.mate <= 0 && s.hold === 0
        && Math.abs(s.bv) < 0.2) armed = s.tick;
    if (armed >= 0 && s.tick >= armed && (!log.length || log[log.length - 1] !== s.tick)) {
      S.sawPull(s, 1); log.push(s.tick); armed = -1; idle = 0;
    } else idle++;
    S.sawTick(s);
    for (const k of Object.keys(seen)) {
      const v = s[k];
      if (v < seen[k][0]) seen[k][0] = v;
      if (v > seen[k][1]) seen[k][1] = v;
    }
  }
  if (!s.over) s.over = "timeout";
  return { s, log, seen, r: S.sawResult(s) };
}
function playMash(part, every) {
  const s = S.sawInit({ part });
  const log = [];
  while (!s.over) {
    if (s.tick % every === 0) { S.sawPull(s, 1); log.push(s.tick); }
    S.sawTick(s);
  }
  if (!s.over) s.over = "timeout";
  return { s, log, r: S.sawResult(s) };
}
/* ⚠️ LE CLIENT « EN DIRECT » : il ne fait PAS un pas par tour de boucle, il
   accumule du temps réel de durée VARIABLE et rattrape. C'est ce que fait la
   scène, et c'est la seule façon de prendre en défaut un accord direct/rejeu qui
   ne tiendrait qu'à cadence régulière. */
function playLive(part, lag, seed) {
  const s = S.sawInit({ part });
  const log = [];
  let acc = 0, armed = -1, r = (seed | 0) || 7;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  for (let frame = 0; frame < 20000 && !s.over; frame++) {
    /* des images de 6 à 40 ms, comme un vrai navigateur qui hoquette */
    acc += 0.006 + rnd() * 0.034;
    let guard = 0;
    while (acc >= C.SAW_DT && guard++ < 400) {
      if (armed < 0 && S.sawWould(s) === "perfect") armed = s.tick + lag;
      if (armed >= 0 && s.tick >= armed && (!log.length || log[log.length - 1] !== s.tick)) {
        S.sawPull(s, 1); log.push(s.tick); armed = -1;
      }
      S.sawTick(s);
      acc -= C.SAW_DT;
    }
  }
  if (!s.over) s.over = "timeout";
  return { s, log };
}
const FIELDS = ["tick", "plank", "bx", "bv", "cut", "stress", "bind", "stam", "slack", "tempo",
                "pull", "mate", "mateWait", "mateN", "hold", "perfect", "good", "weak", "binds",
                "dead", "strokes", "broken", "combo", "bestCombo", "over"];
const diff = (a, b) => FIELDS.filter((k) => a[k] !== b[k]);

/* ─────────────────────────────────────────────────────────────────────────
   1. LE DÉTERMINISME ET L'ACCORD DIRECT / REJEU
   ───────────────────────────────────────────────────────────────────────── */
section("1. LE REJEU DE L'HÔTE EST LA MANCHE DU CLIENT");
{
  let bad = 0, worst = "", n = 0;
  for (const part of PARTS) for (const lag of [0, 6, 14, 24, 38]) {
    const a = S.sawRun(playRhythm(part, lag).log, { part });
    const b = S.sawRun(playRhythm(part, lag).log, { part });
    n++;
    const d = diff(a, b);
    if (d.length) { bad++; worst = `${part}/${lag} : ${d.join(", ")}`; }
  }
  ok(`deux rejeux du même journal sont identiques (${n} manches, ${FIELDS.length} champs)`,
     bad === 0, worst);

  bad = 0; worst = ""; n = 0;
  for (const part of PARTS) for (const lag of [0, 8, 18, 30]) for (const seed of [3, 91, 4242]) {
    const live = playLive(part, lag, seed);
    const host = S.sawRun(live.log, { part });
    n++;
    const d = diff(live.s, host);
    if (d.length) { bad++; worst = `${part}/${lag}/${seed} : ${d.map((k) => `${k} ${live.s[k]}≠${host[k]}`).join(", ")}`; }
  }
  /* ⚠️ C'EST LE CONTRÔLE LE PLUS IMPORTANT DU FICHIER. S'il tombe, le jeu paraît
     marcher en solo et refuse les commandes dès qu'il y a un hôte distant. */
  ok(`le direct (images irrégulières) et le rejeu tombent d'accord au bit près (${n} manches)`,
     bad === 0, worst);
}

/* ─────────────────────────────────────────────────────────────────────────
   2. LA MANCHE EST GAGNABLE ET PERDABLE
   ───────────────────────────────────────────────────────────────────────── */
section("2. ON PEUT GAGNER, ET ON PEUT PERDRE");
{
  let won = 0, secs = [];
  for (const part of PARTS) {
    const { r } = playRhythm(part, 0);
    if (r.ok) won++;
    secs.push(r.ticks / C.SAW_HZ);
  }
  ok("un joueur parfait finit les cinq pièces", won === PARTS.length, `${won}/${PARTS.length}`);
  const lo = Math.min(...secs), hi = Math.max(...secs);
  /* ⚠️ LA DURÉE EST UNE GRANDEUR DE CONCEPTION, PAS UN EFFET DE BORD : un
     mini-jeu de ce dépôt dure de trente secondes à une minute (le marteau de la
     grange, la pêche). Au-delà, ce n'est plus un geste, c'est une épreuve — et
     `STAR_TIMBER` fait déjà attendre de trois à huit minutes après. */
  ok("et il y met entre 25 et 70 secondes", lo > 25 && hi < 70,
     `${lo.toFixed(1)} s → ${hi.toFixed(1)} s`);
  ok("un joueur parfait ne fend aucune planche",
     PARTS.every((p) => playRhythm(p, 0).r.broken === 0), "");
  ok("un joueur parfait obtient trois étoiles",
     PARTS.every((p) => playRhythm(p, 0).r.stars === 3), "");

  /* ⚠️ PERDRE DOIT EXISTER, SINON LA RUPTURE DE PLANCHE EST UN DÉCOR. Guillaume
     a demandé « la possibilité de casser la planche » : il faut donc au moins une
     façon de jouer qui la casse trois fois. */
  const fast = playMash("hull", 6);
  ok("marteler casse les trois planches et perd la manche", fast.r.over === "broken",
     `${fast.r.broken} planches, ${(fast.r.ticks / C.SAW_HZ).toFixed(1)} s`);
  ok("…et ne prélève donc rien (la manche rend `broken`, pas `done`)", !fast.r.ok, fast.r.over);
  ok("ne rien faire du tout ne finit jamais la pièce",
     S.sawRun([], { part: "hull" }).over === "timeout", "");
}

/* ─────────────────────────────────────────────────────────────────────────
   3. LA DIFFICULTÉ EST CONTINUE EN LA LATENCE
   ───────────────────────────────────────────────────────────────────────── */
section("3. UN JOUEUR PLUS LENT A UNE NOTE PLUS BASSE");
{
  const LAGS = [0, 6, 12, 18, 24, 32, 40, 52, 66];
  const rows = LAGS.map((lag) => {
    const g = PARTS.map((p) => playRhythm(p, lag).r.grade);
    return { lag, ms: Math.round((lag * 1000) / C.SAW_HZ), g: g.reduce((a, b) => a + b, 0) / g.length };
  });
  for (const r of rows) console.log(`       latence ${String(r.ms).padStart(4)} ms  →  note ${r.g.toFixed(3)}`);
  /* ⚠️⚠️ ON EXIGE LA MONOTONIE, PAS UN SEUIL. Un seuil (« à 200 ms on doit avoir
     0,6 ») serait un réglage recopié dans un banc, donc une divergence en attente
     (§8). La MONOTONIE, elle, est la propriété qu'on veut vraiment : que le jeu
     récompense la précision, quelle que soit l'échelle. C'est la règle du 449 —
     *quand on peut énoncer une propriété, on la balaie.* */
  let breaks = 0;
  for (let i = 1; i < rows.length; i++) if (rows[i].g > rows[i - 1].g + 0.02) breaks++;
  ok("la note ne remonte jamais quand la latence augmente", breaks === 0, `${breaks} remontées`);
  ok("un joueur très précis et un joueur très lent ne sont pas notés pareil",
     rows[0].g - rows[rows.length - 1].g > 0.3,
     `${rows[0].g.toFixed(2)} contre ${rows[rows.length - 1].g.toFixed(2)}`);
  /* ⚠️ DEUX PROPRIÉTÉS, ET AUCUNE N'EST UN SEUIL RECOPIÉ. La première : un
     joueur humain FINIT — c'est la condition pour que le chantier naval ne
     dépende pas de réflexes. La seconde : la perfection se mérite, donc un
     joueur approximatif (un demi-tempo de retard) ne doit pas avoir trois
     étoiles. Un seuil chiffré (« à 200 ms il faut 0,6 ») aurait été un réglage
     recopié dans un banc, donc une divergence en attente (§8). */
  const human = PARTS.map((p) => playRhythm(p, 24).r);
  ok("un joueur à 200 ms de réaction finit quand même la manche",
     human.every((r) => r.ok), human.map((r) => r.over).join(","));
  const sloppy = PARTS.map((p) => playRhythm(p, 52).r);
  ok("un joueur à un demi-tempo de retard finit aussi, sans trois étoiles",
     sloppy.every((r) => r.ok) && sloppy.every((r) => r.stars < 3),
     sloppy.map((r) => `${r.over}/${r.stars}★`).join(" "));
}

/* ─────────────────────────────────────────────────────────────────────────
   4. MARTELER NE PAIE JAMAIS
   ───────────────────────────────────────────────────────────────────────── */
section("4. MARTELER NE PAIE NI EN NOTE NI EN TEMPS");
{
  const best = playRhythm("hull", 0).r;
  let worstGrade = 0, fastest = 1e9, anyThree = 0;
  for (const every of [4, 6, 8, 12, 16, 20, 26, 34, 45, 60, 80, 110]) {
    const { r } = playMash("hull", every);
    worstGrade = Math.max(worstGrade, r.grade);
    if (r.ok) fastest = Math.min(fastest, r.ticks);
    if (r.stars >= 3) anyThree++;
  }
  ok("aucune cadence de martèlement n'obtient trois étoiles", anyThree === 0, `${anyThree} cas`);
  ok("la meilleure note obtenue en martelant reste médiocre", worstGrade < 0.35, worstGrade.toFixed(3));
  ok("et marteler est toujours PLUS LENT que jouer le rythme",
     fastest > best.ticks, `${(fastest / C.SAW_HZ).toFixed(1)} s contre ${(best.ticks / C.SAW_HZ).toFixed(1)} s`);
  /* ⚠️ LE PIÈGE QUE LE BANC A DÉJÀ ATTRAPÉ UNE FOIS, ET QU'IL DOIT GARDER : sans
     la garde `s.pull > 0`, deux appuis dans le même trait ADDITIONNENT leur
     poussée, et l'on obtenait trois « parfaits » par aller-retour avec une lame à
     trois fois la force prévue. C'est la seule triche que la mécanique pouvait
     offrir, et elle passait tous les autres contrôles. */
  const stack = (() => {
    const s = S.sawInit({ part: "hull" });
    while (!s.over) {
      if (S.sawWould(s) === "perfect") { S.sawPull(s, 1); S.sawPull(s, 1); S.sawPull(s, 1); }
      S.sawTick(s);
    }
    return S.sawResult(s);
  })();
  ok("empiler trois traits dans le même geste ne va pas plus vite",
     !stack.ok || stack.ticks >= best.ticks, `${(stack.ticks / C.SAW_HZ).toFixed(1)} s`);
  ok("…et coûte la note", stack.grade < best.grade, `${stack.grade.toFixed(2)} contre ${best.grade.toFixed(2)}`);
}

/* ─────────────────────────────────────────────────────────────────────────
   5. LES BORNES
   ───────────────────────────────────────────────────────────────────────── */
section("5. AUCUNE GRANDEUR NE SORT DE SES BORNES");
{
  const lim = {
    bx: [-1.0001, 1.0001], stress: [-0.0001, 2.0001], stam: [-0.0001, 1.0001],
    tempo: [C.SAW_TEMPO_MIN - 1e-9, C.SAW_TEMPO_MAX + 1e-9],
    cut: [-0.0001, 1.4], bind: [-0.0001, 1.6001],
  };
  let bad = [], ticks = 0;
  for (const part of PARTS) for (const lag of [0, 10, 22, 40, 70]) {
    const { seen, s } = playRhythm(part, lag);
    ticks += s.tick;
    for (const k in lim) {
      if (seen[k][0] < lim[k][0] || seen[k][1] > lim[k][1])
        bad.push(`${k} ${seen[k][0].toFixed(3)}…${seen[k][1].toFixed(3)} (${part}/${lag})`);
    }
  }
  ok(`toutes les grandeurs restent bornées (${ticks} pas simulés)`, bad.length === 0, bad.slice(0, 3).join(" · "));
  /* la lame ne sort JAMAIS de sa course, même en martelant */
  let mx = 0;
  for (const every of [4, 9, 17, 33]) {
    const s = S.sawInit({ part: "hull" });
    while (!s.over) {
      if (s.tick % every === 0) S.sawPull(s, 1);
      S.sawTick(s);
      mx = Math.max(mx, Math.abs(s.bx));
    }
  }
  ok("la lame ne sort pas de son cadre même en martelant", mx <= 1.0001, mx.toFixed(4));
  /* l'échelle de temps rendue à la quête est bornée des deux côtés */
  let sLo = 9, sHi = -9;
  for (const part of PARTS) for (const lag of [0, 12, 26, 48, 80]) {
    const r = playRhythm(part, lag).r;
    sLo = Math.min(sLo, r.msScale); sHi = Math.max(sHi, r.msScale);
  }
  ok("le facteur de durée reste entre les deux bornes annoncées",
     sLo >= C.SAW_MS_BEST - 1e-9 && sHi <= C.SAW_MS_WORST + 1e-9,
     `×${sLo.toFixed(2)} → ×${sHi.toFixed(2)}`);
}

/* ─────────────────────────────────────────────────────────────────────────
   6. L'INTERFACE ET L'ARBITRE LISENT LA MÊME RÈGLE
   ───────────────────────────────────────────────────────────────────────── */
section("6. `sawWould` DIT EXACTEMENT CE QUE `sawPull` FAIT");
{
  /* ⚠️⚠️ C'EST LA PARADE DU 449 MESURÉE : le HUD colore la piste avec
     `sawWould`, l'arbitre tranche avec `sawPull`. S'ils divergeaient d'un seul
     cas, le joueur verrait « parfait » et récolterait « mou » — et il
     conclurait que le jeu triche. On les compare sur chaque pas d'une manche
     entière, pour toutes les pièces. */
  let bad = 0, n = 0, seenAll = new Set();
  for (const part of PARTS) {
    const s = S.sawInit({ part });
    while (!s.over && s.tick < C.SAW_HZ * 40) {
      const w = S.sawWould(s);
      /* on tire sur une COPIE, pour ne pas changer la manche qu'on observe */
      const probe = S.sawCopy(s);
      const got = S.sawPull(probe, 1);
      n++; seenAll.add(w);
      if (w !== got) bad++;
      /* on avance en jouant correctement, pour visiter tous les états */
      if (w === "perfect") S.sawPull(s, 1);
      S.sawTick(s);
    }
  }
  ok(`les deux répondent la même chose sur chaque pas (${n} comparaisons)`, bad === 0, `${bad} écarts`);
  /* ⚠️ ET ON PUBLIE CE QU'ON A VU (règle du 441 : un banc qui compte doit dire
     combien il a lu) : un contrôle qui ne visiterait que « mou » serait vert
     sans avoir rien vérifié. */
  ok("…et la manche est passée par au moins quatre verdicts différents",
     seenAll.size >= 4, [...seenAll].join(", "));
}

/* ─────────────────────────────────────────────────────────────────────────
   7. UN JOURNAL VENU DU RÉSEAU NE CASSE RIEN
   ───────────────────────────────────────────────────────────────────────── */
section("7. LE JOURNAL EST UNE DONNÉE DU RÉSEAU, PAS UNE PROMESSE");
{
  const good = playRhythm("hull", 0).log;
  const cases = [
    ["vide", []],
    ["nul", null],
    ["pas un tableau", "1,2,3"],
    ["désordonné", good.slice().reverse()],
    ["avec des doublons", good.flatMap((t) => [t, t, t])],
    ["avec des négatifs", good.map((t, i) => (i % 3 ? t : -t))],
    ["avec des flottants", good.map((t) => t + 0.5)],
    ["avec des NaN", good.map((t, i) => (i % 5 ? t : NaN))],
    ["démesuré", Array.from({ length: 5000 }, (_, i) => i)],
    ["énorme", good.map((t) => t + 1e12)],
  ];
  let bad = [];
  for (const [name, log] of cases) {
    try {
      const s = S.sawRun(log, { part: "hull" });
      const r = S.sawResult(s);
      if (!(r.msScale >= C.SAW_MS_BEST - 1e-9 && r.msScale <= C.SAW_MS_WORST + 1e-9)) bad.push(name + " (facteur)");
      if (!["done", "broken", "timeout"].includes(r.over)) bad.push(name + " (issue " + r.over + ")");
    } catch (e) { bad.push(name + " (" + e.message + ")"); }
  }
  ok(`aucun journal malformé ne lève ni ne sort des bornes (${cases.length} cas)`, bad.length === 0, bad.join(" · "));
  ok("un journal démesuré est borné à SAW_LOG_MAX",
     S.sawNormalizeLog(Array.from({ length: 9000 }, (_, i) => i)).length === C.SAW_LOG_MAX,
     String(C.SAW_LOG_MAX));
  /* ⚠️⚠️ ET LA VRAIE QUESTION DE SÉCURITÉ : est-ce qu'un journal FABRIQUÉ peut
     gagner sans jouer ? Le seul moyen de gagner est de tirer aux bons instants,
     donc de simuler la manche — c'est-à-dire de jouer. On vérifie que les
     tentatives naïves échouent. */
  const cheats = [
    ["tout tirer", Array.from({ length: C.SAW_LOG_MAX }, (_, i) => i)],
    ["un pas sur deux", Array.from({ length: C.SAW_LOG_MAX }, (_, i) => i * 2)],
    ["un pas sur dix", Array.from({ length: C.SAW_LOG_MAX }, (_, i) => i * 10)],
    ["cent traits groupés", Array.from({ length: 100 }, (_, i) => 200 + i)],
  ];
  const won = cheats.filter(([, l]) => S.sawResult(S.sawRun(l, { part: "hull" })).stars >= 3);
  ok("aucun journal fabriqué naïvement n'obtient trois étoiles", won.length === 0,
     won.map(([n]) => n).join(", "));
}

/* ─────────────────────────────────────────────────────────────────────────
   8. LA JOINTURE AVEC LES TEXTES
   ───────────────────────────────────────────────────────────────────────── */
section("8. CHAQUE VERDICT A SA PHRASE, DANS LES DEUX LANGUES");
{
  /* ⚠️⚠️ UNE JOINTURE, JAMAIS DEUX LISTES (444). `scierie.js` porte les clés,
     `fermeStrings.js` porte les mots, et c'est ce contrôle qui les tient
     ensemble — sans lui, ajouter un verdict afficherait `undefined` au milieu de
     l'écran, chez l'autre joueur seulement, et seulement dans sa langue. */
  const KEYS = [...S.SAW_VERDICTS, "plank", "break"];
  for (const lang of ["fr", "en"]) {
    const V = STR.FERME_STR[lang].star.saw.verdict;
    const missing = KEYS.filter((k) => typeof V[k] !== "string");
    const extra = Object.keys(V).filter((k) => !KEYS.includes(k));
    ok(`[${lang}] les ${KEYS.length} verdicts de la mécanique ont une phrase`, missing.length === 0, missing.join(", "));
    ok(`[${lang}] et aucune phrase ne décrit un verdict qui n'existe pas`, extra.length === 0, extra.join(", "));
  }
  /* les trois attitudes de la scène ont un libellé — même jointure, autre liste */
  const A3 = ["poste", "face", "atelier"];
  for (const lang of ["fr", "en"]) {
    const V = STR.FERME_STR[lang].star.saw.view;
    ok(`[${lang}] les trois attitudes ont un libellé`,
       A3.every((k) => typeof V[k] === "string" && V[k]), Object.keys(V).join(", "));
  }
  /* la note se traduit en quatre mots, un par palier d'étoiles */
  for (const lang of ["fr", "en"]) {
    const g = STR.FERME_STR[lang].star.saw.grade;
    ok(`[${lang}] les quatre paliers d'étoiles ont un mot`,
       [0, 1, 2, 3].every((n) => typeof g(n) === "string" && g(n).length > 3), "");
  }
}

console.log(`\n${total - fails}/${total}`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fails ? 1 : 0);
