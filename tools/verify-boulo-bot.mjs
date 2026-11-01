/* =============================================================================
   verify-boulo-bot.mjs — LE BOULODROME, LOT 4 : LA TÊTE DES HABITANTS (2026-11-01)
   `components/ferme/bouloBot.js` (pur) au-dessus de `petanque.js` et `bouloJeu.js`. Ce que le banc tient :
   1. LA RÈGLE N°2 de `petanque.js` dans la décision : ni trigonométrie, ni `pow`, ni hasard du moteur, ni horloge — tous les
      écrans doivent décider le même geste (la posture de l'habitant qui réfléchit ne voyage pas).
   2. LE DÉTERMINISME : la même partie et le même habitant donnent la même décision, partie recopiée en JSON comprise ; le
      lancer suivant tire une autre graine.
   3. ⚠️ AUCUNE DÉCISION REFUSÉE par l'arbitre (`PT.verifier`), sur des parties entières, aux trois niveaux, sur les deux pistes
      et en doublette : un habitant qui propose un lancer que l'hôte refuse resterait planté au cercle.
   4. LE RYTHME : de 3 à 6 s avant de lancer (verdict « rythme »).
   5. LA LIGNE DE TIR : le but juste derrière la boule visée la rend sale ; de côté ou devant, elle est propre.
   6. LES NIVEAUX : le fort bat le moyen, le moyen bat le débutant, sur des parties en 7 — et ⚠️ SA NOTE : « le fort ne doit pas
      être invincible » — un JOUEUR PLAUSIBLE moyen (±35 ms, la ligne droite, le geste qu'il croit le bon) lui prend des parties.
   7. LE BUT SORTI en doublette, contre les 29 % du joueur simulé du lot 1 qui tirait sans regarder.
   8. LE RELIEF : sur la piste du platane, le but derrière les racines — le fort (qui essaie ses pointés dans la tête) finit plus
      près que le débutant (qui vise au plat).
   Usage : node tools/verify-boulo-bot.mjs   (≈ 1 min : des parties entières, chaque habitant fort essayant neuf pointés)
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["petanque", "boulodrome", "bouloJeu", "bouloBot", "boulistes"]);
const PT = mods.petanque, BJ = mods.bouloJeu, BB = mods.bouloBot, P = PT.PETANQUE;
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
const pc = (x) => Math.round(x * 100) + " %";
console.log("\n=== verify-boulo-bot ===\n");

/* ── 1. LA RÈGLE N°2 ── */
console.log("§1 la décision ne lit que des opérations exactes");
{
  const src = fs.readFileSync(path.join(ROOT, "components/ferme/bouloBot.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const bad = ["Math.sin", "Math.cos", "Math.tan", "Math.atan", "Math.pow", "Math.hypot", "Math.exp", "Math.log", "Math.random", "Date", "**", "performance"].filter((w) => src.includes(w));
  ok(bad.length === 0, "aucun nom interdit dans bouloBot.js", bad.join(", ") || "propre");
}

/* ── LE JEU : des parties entières entre décideurs ── */
// un décideur : (partie, pid) → entrée. Les habitants : `BB.decider`. Le JOUEUR PLAUSIBLE (§6) : la ligne droite, le geste
// qu'il croit le bon (la roulette, la plombée si le but est loin), le tir quand une boule adverse colle au but, ±35 ms.
const habitant = (niv) => (partie, pid) => { const d = BB.decider(partie, pid, niv); return d && d.input; };
function joueurPlausible(ms) {
  return (partie, pid) => {
    const s = PT.avancer(partie), q = PT.aQui(s), m = s.mene, r = BB.tirage(BB.graineDe(partie, pid) ^ 0x5bd1e995);
    if (!q) return null;
    if (q.phase === "placer") return { coup: s.coups, geste: "placer", donnee: BJ.donneeDefaut(m, "placer"), err: 0 };
    if (q.phase === "but") return { coup: s.coups, geste: "but", donnee: BJ.donneeDefaut(m, "but"), err: BB.errDe(r, ms, "but") };
    const camp = PT.campDe(s, pid), pt = PT.point(s);
    let adv = null, bd = Infinity;
    for (const b of m.boules) if (!b.mort && b.camp !== camp) { const d = (b.x - m.but.x) ** 2 + (b.y - m.but.y) ** 2; if (d < bd) { bd = d; adv = b; } }
    if (adv && pt.camp >= 0 && pt.camp !== camp && Math.sqrt(bd) < 300 && r() < 0.5)
      return { coup: s.coups, geste: "tir", donnee: BJ.horsCercle(m, BJ.borner({ x: adv.x, y: adv.y })), err: BB.errDe(r, ms, "tir") };
    const dBut = Math.sqrt((m.but.x - m.cercle.x) ** 2 + (m.but.y - m.cercle.y) ** 2) / 1000;
    const g = dBut > 8.5 ? "demi" : "roulette";
    return { coup: s.coups, geste: g, donnee: BJ.donneeDefaut(m, g), err: BB.errDe(r, ms, g) };
  };
}
let refus = 0, decisions = 0, penseMin = Infinity, penseMax = -Infinity, menes = 0, butsMorts = 0, tirsSales = 0;
function partie({ mode = "tat", camps, joueurs, piste = "a", graine = 1, cible = 7 }) {
  let s = PT.nouvellePartie({ mode, cible, camps, graine, piste });
  for (let n = 0; n < 400 && s.gagnant === null; n++) {
    const q = PT.aQui(s);
    if (!q) break;
    const pid = q.joueurs[0], dec = joueurs[pid];
    // pour les habitants, la décision complète (le rythme, la ligne de tir) ; pour tous, l'entrée passe à l'arbitre
    if (dec.niv) {
      const d = BB.decider(s, pid, dec.niv);
      if (d.pense < penseMin) penseMin = d.pense;
      if (d.pense > penseMax) penseMax = d.pense;
      if (d.quoi === "tire") { const m = PT.avancer(s).mene; let adv = null, bd = Infinity; for (const b of m.boules) if (!b.mort && b.camp !== PT.campDe(s, pid)) { const dd = (b.x - m.but.x) ** 2 + (b.y - m.but.y) ** 2; if (dd < bd) { bd = dd; adv = b; } } if (adv && BB.ligneSale(m, adv)) tirsSales++; }
    }
    const input = dec.fn(s, pid);
    if (input.geste === "but") input.lourd = 0;
    decisions++;
    const r = PT.jouer(s, pid, input);
    if (r.raison) { refus++; break; }
    const avant = PT.avancer(s).mene.n;
    s = r.s;
    const m = s.mene;
    if (m.fini && m.n === avant) { menes++; if (m.fini.raison === "but-mort") butsMorts++; }
  }
  return s;
}
const H = (niv) => ({ niv, fn: habitant(niv) });
function serie(nom, A, B, n, { piste, cible = 7 } = {}) {
  let va = 0, t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const p = piste || (i % 2 ? "b" : "a");
    // on alterne qui est « a » (la graine décide qui lance le but : on la fait varier aussi)
    const s = partie({ camps: [["a"], ["b"]], joueurs: { a: A, b: B }, piste: p, graine: 1000 + i * 7919, cible });
    if (s.gagnant === 0) va++;
  }
  const t = (Date.now() - t0) / n;
  console.log(`        ${nom} : ${va}/${n} (${pc(va / n)}), ${Math.round(t)} ms par partie`);
  return va / n;
}

/* ── 2. LE DÉTERMINISME ── */
console.log("§2 la même partie, le même habitant : la même décision");
{
  let s = PT.nouvellePartie({ mode: "tat", cible: 13, camps: [["pnj:a"], ["pnj:b"]], graine: 424242, piste: "b" });
  let same = true, differs = false, prev = null;
  for (let n = 0; n < 30 && s.gagnant === null; n++) {
    const q = PT.aQui(s), pid = q.joueurs[0];
    const d1 = BB.decider(s, pid, "fort"), d2 = BB.decider(JSON.parse(JSON.stringify(s)), pid, "fort");
    if (JSON.stringify(d1) !== JSON.stringify(d2)) same = false;
    if (prev && d1.pense !== prev.pense) differs = true;
    prev = d1;
    const input = d1.input; if (input.geste === "but") input.lourd = 0;
    s = PT.jouer(s, pid, input).s;
  }
  ok(same, "décision identique, partie recopiée en JSON comprise (30 lancers, piste du platane)");
  ok(differs, "chaque lancer tire une graine neuve (le temps de réflexion change)");
  ok(BB.decider(s, "personne", "fort") === null, "pas son tour : pas de décision");
}

/* ── 5. LA LIGNE DE TIR ── */
console.log("§5 la ligne de tir");
{
  const m = { cercle: { x: 2000, y: 1500 }, but: { x: 2000, y: 9400 } };
  ok(BB.ligneSale(m, { x: 2000, y: 9000 }), "le but 40 cm derrière la boule, dans l'axe : sale");
  ok(BB.ligneSale(m, { x: 2150, y: 8900 }), "le but 50 cm derrière, 15 cm de côté : sale");
  ok(!BB.ligneSale(m, { x: 2600, y: 9000 }), "le but à 60 cm de côté : propre");
  ok(!BB.ligneSale(m, { x: 2000, y: 9800 }), "le but DEVANT la boule visée : propre");
  ok(!BB.ligneSale(m, { x: 2000, y: 8200 }), "le but 1,2 m derrière : propre");
}

/* ── 6. LES NIVEAUX (et 3, 4 en passant : chaque décision passe à l'arbitre, le rythme) ── */
console.log("§6 les niveaux, en parties de 7 points (les deux pistes, en alternance)");
const N = 40;
const fM = serie("fort contre moyen", H("fort"), H("moyen"), N);
const mD = serie("moyen contre débutant", H("moyen"), H("debutant"), N);
const fD = serie("fort contre débutant", H("fort"), H("debutant"), N);
const jF = serie("joueur plausible moyen (±35 ms) contre le fort", { fn: joueurPlausible(35) }, H("fort"), N);
const hF = serie("joueur plausible habile (±20 ms) contre le fort", { fn: joueurPlausible(20) }, H("fort"), N);
const jM = serie("joueur plausible moyen contre le moyen", { fn: joueurPlausible(35) }, H("moyen"), N);
const jD = serie("joueur plausible moyen contre le débutant", { fn: joueurPlausible(35) }, H("debutant"), N);
ok(fM > 0.55, "le fort bat le moyen plus d'une fois sur deux", pc(fM));
ok(mD > 0.55, "le moyen bat le débutant plus d'une fois sur deux", pc(mD));
ok(fD > 0.7, "le fort bat le débutant nettement", pc(fD));
ok(jF >= 0.2 && jF <= 0.5, "⚠️ SA NOTE — le fort n'est pas invincible : un joueur plausible moyen lui prend de 20 à 50 % des parties", pc(jF));
ok(hF >= 0.35, "… et un joueur habile lui tient tête (35 % au moins)", pc(hF));
ok(jD >= 0.5, "le débutant se laisse battre par un joueur moyen une fois sur deux au moins", pc(jD));
ok(jM < jD, "l'échelle se sent du côté du joueur : le moyen est plus dur que le débutant", pc(jM) + " < " + pc(jD));

console.log("§3 et §4 — ce que toutes ces parties ont montré");
ok(refus === 0, "aucune décision refusée par l'arbitre", decisions + " lancers");
ok(penseMin >= 3000 && penseMax <= 6000, "le temps de réflexion reste entre 3 et 6 s", Math.round(penseMin) + "–" + Math.round(penseMax) + " ms");
ok(tirsSales === 0, "aucun habitant ne tire par une ligne sale", tirsSales + " tirs sales");

/* ── 7. LE BUT SORTI EN DOUBLETTE ── */
console.log("§7 le but sorti, en doublette d'habitants");
{
  menes = 0; butsMorts = 0;
  const niv = ["fort", "moyen", "debutant"];
  for (let i = 0; i < 16; i++) {
    const j = { a: H(niv[i % 3]), a2: H(niv[(i + 1) % 3]), b: H(niv[(i + 2) % 3]), b2: H(niv[i % 3]) };
    partie({ mode: "doublette", camps: [["a", "a2"], ["b", "b2"]], joueurs: j, piste: i % 2 ? "b" : "a", graine: 77 + i * 131, cible: 7 });
  }
  const t = butsMorts / Math.max(1, menes);
  ok(t < 0.15, "le but sort dans moins de 15 % des mènes (29 % au lot 1, joueur qui tirait sans regarder)", pc(t) + " sur " + menes + " mènes");
  ok(refus === 0, "… et toujours aucune décision refusée", decisions + " lancers au total");
}

/* ── 8. LE RELIEF ── */
console.log("§8 le relief : la piste du platane, le but derrière les racines");
{
  const tours = 30, res = {};
  for (const niv of ["fort", "debutant"]) {
    let tot = 0;
    for (let i = 0; i < tours; i++) {
      // le cercle au bout ouest, le but à ~8 m dans l'axe des racines (x 0,75 m, voir `PISTES.b`)
      const s = PT.nouvellePartie({ mode: "tat", cible: 13, camps: [["pnj:x"], ["autre"]], graine: 0, piste: "b" });
      s.mene.but = { x: 900 + ((i * 37) % 300), y: 9300 + ((i * 53) % 600) };
      s.graine = 5000 + i;
      const d = BB.decider(s, "pnj:x", niv), input = d.input;
      const r = PT.jouer(s, "pnj:x", input);
      const m = r.s.mene, b = m.boules[m.boules.length - 1];
      tot += Math.sqrt((b.x - m.but.x) ** 2 + (b.y - m.but.y) ** 2) / 1000;
    }
    res[niv] = tot / tours;
  }
  console.log(`        distance moyenne au but : fort ${Math.round(res.fort * 100)} cm, débutant ${Math.round(res.debutant * 100)} cm`);
  ok(res.fort < res.debutant, "le fort, qui lit le relief, finit plus près que le débutant, qui vise au plat");
}

/* ── 9. LES PARTIES AVEC HABITANTS (`bouloJeu.js`) ── */
console.log("§9 le défi, la doublette, le club");
{
  const CL = mods.boulistes.CLUB, H = CL.map((c) => ({ id: c.id, name: c.nom }));
  let ss = { a: null, b: null };
  ok(BJ.hoteDefi(ss, 1, "a", "p1", "Léa", [H[2]], "tat", 7, 99) === null && ss.a.etat === "jeu" && ss.a.ent.length === 2, "un tête-à-tête contre un habitant démarre aussitôt (le défi est l'invitation)");
  ok(BJ.hoteDefi(ss, 2, "b", "p1", "Léa", [H[0]], "tat", 7, 99) === "bouloAlready", "on ne joue pas deux parties à la fois");
  ss = { a: null, b: null };
  BJ.hoteDefi(ss, 3, "a", "p1", "Léa", H, "dbl", 7, 99);
  const s = ss.a;
  ok(s.etat === "salle" && s.ent.length === 4 && JSON.stringify(s.equipes) === JSON.stringify([["p1", H[0].id], [H[1].id, H[2].id]]), "la doublette attend en salle, au complet : toi et le défié contre les deux autres");
  ok(BJ.couleurDe(s, "p1") === BJ.couleurDe(s, H[0].id) && BJ.couleurDe(s, H[1].id) === BJ.couleurDe(s, H[2].id) && BJ.couleurDe(s, "p1") !== BJ.couleurDe(s, H[1].id), "en doublette, la couleur est celle de l'équipe");
  ok(BJ.hoteRejoindre(ss, "a", "p2", "Max") === null && s.equipes[0].includes("p2") && !s.ent.some((e) => e.id === H[0].id), "un deuxième joueur prend la place du partenaire habitant (« ensemble contre deux »)");
  ok(BJ.hoteRejoindre(ss, "a", "p3", "Zoé") === null && s.equipes[1].includes("p3"), "… un troisième, une place en face (« chacun avec un habitant »)");
  ok(BJ.hoteQuitter(ss, "a", "p3", H[0]) === null && s.equipes[1].includes(H[0].id) && s.ent.length === 4, "celui qui quitte la salle est remplacé par un habitant libre : la doublette reste au complet");
  ok(BJ.hoteLancerPartie(ss, "a", "p1", 4242) === null && s.etat === "jeu" && s.partie.mode === "doublette", "celui qui a défié lance la partie : une doublette de la règle");
  // le lanceur désigné : en doublette, les partenaires alternent (le plus de boules en main d'abord)
  let p = s.partie, seq = [], refus = 0;
  for (let n = 0; n < 30 && p.gagnant === null; n++) {
    const pid = BJ.lanceurDe(p);
    const q = PT.aQui(p);
    if (q.phase === "boule" && PT.avancer(p).mene.n === 1) seq.push(pid);
    const d = BB.decider(p, pid, "moyen");
    const inp = d.input; if (inp.geste === "but") inp.lourd = 0;
    const r = PT.jouer(p, pid, inp);
    if (r.raison) { refus++; break; }
    p = r.s;
    if (PT.avancer(p).mene.n > 1) break;
  }
  const alterne = seq.every((id, i) => i === 0 || seq[i - 1] !== id || !seq.slice(0, i).some((x) => x !== id && PT.campDe(p, x) === PT.campDe(p, id)));
  ok(refus === 0 && alterne, "en doublette, le lanceur désigné alterne entre partenaires, et chaque lancer passe (tout joueur du camp peut jouer pour l'arbitre)", seq.map((x) => x.replace("pnj:", "")).join(" "));
  ss = { a: null, b: null };
  ok(BJ.hoteClub(ss, 9, "b", H[0], H[1], 7, 5) === null && ss.b.club && ss.b.etat === "jeu" && BJ.habitantsOccupes(ss).size === 2 && BJ.habitantsOccupes(ss, false).size === 0, "la partie du club : deux habitants, aussitôt ; elle ne compte pas parmi les parties de joueurs");
  ss.b.etat = "fin";
  ok(BJ.habitantsOccupes(ss).size === 0, "une partie du club finie libère ses boulistes (celle d'un joueur les garde pour la revanche)");
}

/* ── 10. L'HORAIRE ET L'ENJEU (`boulistes.js`) ── */
console.log("§10 l'horaire, la prime, le plafond, le bilan");
{
  const BLm = mods.boulistes;
  ok(!BLm.deSortie(13 * 60 + 59, false) && BLm.deSortie(14 * 60, false) && BLm.deSortie(21 * 60 + 59, false) && !BLm.deSortie(22 * 60, false), "de sortie de 14 h à 22 h de jeu");
  ok(!BLm.deSortie(15 * 60, true), "pas sous la neige");
  const tat = (gagnant, hid) => ({ gagnant, camps: [{ joueurs: ["p1"], score: 0 }, { joueurs: [hid], score: 0 }] });
  const bil = {};
  let r = BLm.solder(bil, tat(0, "pnj:fernand"), 100);
  ok(r.length === 1 && r[0].prime === 400 && bil.p1["pnj:fernand"].v === 1, "battre le fort : 400 or, une victoire au bilan");
  r = BLm.solder(bil, tat(0, "pnj:fernand"), 100);
  ok(r.length === 0 && bil.p1["pnj:fernand"].v === 2, "le même jour, contre le même : la gloire seulement (le bilan compte quand même)");
  r = BLm.solder(bil, tat(0, "pnj:toinou"), 100);
  ok(r.length === 1 && r[0].prime === 100, "… contre un autre, la première victoire du jour paie (100 or contre le débutant)");
  r = BLm.solder(bil, tat(0, "pnj:fernand"), 101);
  ok(r.length === 1 && r[0].prime === 400, "le lendemain, contre le fort : la prime revient");
  r = BLm.solder(bil, tat(1, "pnj:mireille"), 101);
  ok(r.length === 0 && bil.p1["pnj:mireille"].d === 1, "perdre ne coûte rien, et se compte");
  const dbl = { gagnant: 0, camps: [{ joueurs: ["p1", "p2"], score: 7 }, { joueurs: ["pnj:mireille", "pnj:toinou"], score: 3 }] };
  r = BLm.solder(bil, dbl, 102);
  ok(r.length === 2 && r.every((x) => x.prime === 200 && x.hid === "pnj:mireille"), "en doublette, chaque joueur gagnant touche la prime du plus fort des battus (deux primes : l'or est commun)");
  const dblH = { gagnant: 0, camps: [{ joueurs: ["p1", "pnj:fernand"], score: 7 }, { joueurs: ["pnj:mireille", "pnj:toinou"], score: 3 }] };
  r = BLm.solder(bil, dblH, 103);
  ok(r.length === 1 && r[0].pid === "p1" && !("pnj:fernand" in bil), "un habitant partenaire ne touche rien et n'a pas de bilan");
  const t1 = BLm.tirageReplique(1234, 7, 43), t2 = BLm.tirageReplique(1234, 7, 43), t3 = BLm.tirageReplique(1234, 8, 43);
  ok(t1 === t2 && t1 !== t3, "le tirage des répliques : le même partout, un autre au lancer suivant");
}

/* ── 11. LA MESURE (lot 5, `bouloJeu.aMesurer`) ── */
console.log("§11 la mesure");
{
  const sc = (boules, but = { x: 2000, y: 9000 }) => { const s = PT.nouvellePartie({ mode: "tat", cible: 13, camps: [["a"], ["b"]], graine: 0, piste: "a" }); s.mene.but = but; for (const q of boules) s.mene.boules.push({ x: q.x, y: q.y, camp: q.camp, j: q.j, mort: false }); return s; };
  const bord = Math.round((P.BOULE_R + P.BUT_R) * 1000);
  let m = BJ.aMesurer(sc([{ x: 2000, y: 9000 - bord - 100, camp: 0, j: "a" }, { x: 2000 + bord + 120, y: 9000, camp: 1, j: "b" }]));
  ok(m && m.a.j === "a" && m.a.mm === 100 && m.b.mm === 120, "2 cm d'écart : on mesure ; la boule qui tient le point d'abord, les cotes de BORD À BORD", m && m.a.mm + " / " + m.b.mm + " mm");
  m = BJ.aMesurer(sc([{ x: 2000, y: 9000 - bord - 100, camp: 0, j: "a" }, { x: 2000 + bord + 200, y: 9000, camp: 1, j: "b" }]));
  ok(m === null, "10 cm d'écart : pas de mètre, ça se voit");
  m = BJ.aMesurer(sc([{ x: 2000, y: 9000 - bord - 100, camp: 0, j: "a" }, { x: 2000 - bord - 100, y: 9000, camp: 1, j: "b" }]));
  ok(m && m.a.mm === m.b.mm, "l'égalité se mesure aussi (deux cotes égales)");
  m = BJ.aMesurer(sc([{ x: 2000, y: 9000 - bord - 100, camp: 0, j: "a" }, { x: 2000 + bord + 120, y: 9000, camp: 0, j: "a" }]));
  ok(m === null, "deux boules du même camp : rien à départager");
  ok(BJ.cote(124, true) === "12,4 cm" && BJ.cote(124, false) === "12 cm" && BJ.cote(124, true, ".") === "12.4 cm", "les cotes : au centimètre, au millimètre quand elles tiennent dans le même, la virgule de la langue");
  // à quelle fréquence le mètre sort-il, dans des parties d'habitants ? (il coûte 2,6 s : il doit rester un moment)
  let lancers = 0, mesures = 0;
  for (let i = 0; i < 16; i++) {
    let s = PT.nouvellePartie({ mode: "tat", cible: 7, camps: [["pnj:a"], ["pnj:b"]], graine: 900 + i * 37, piste: i % 2 ? "b" : "a" });
    for (let n = 0; n < 300 && s.gagnant === null; n++) {
      const pid = BJ.lanceurDe(s), d = BB.decider(s, pid, ["fort", "moyen", "debutant"][i % 3]).input;
      if (d.geste === "but") d.lourd = 0;
      const r = PT.jouer(s, pid, d); if (r.raison) break;
      s = r.s; if (d.geste !== "but" && d.geste !== "placer") { lancers++; if (BJ.aMesurer(s)) mesures++; }
    }
  }
  const f = mesures / Math.max(1, lancers);
  console.log("        le mètre sort après " + pc(f) + " des boules (" + mesures + " sur " + lancers + ")");
  ok(f > 0.02 && f < 0.1, "le mètre sort, mais rarement (entre 2 et 10 % des boules) : un moment, pas une corvée", pc(f));
}

console.log(`\n${fail ? "ÉCHEC" : "OK"} — ${nOk} contrôles passés, ${fail} en échec\n`);
process.exit(fail ? 1 : 0);
