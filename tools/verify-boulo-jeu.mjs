/* =============================================================================
   verify-boulo-jeu.mjs — LE BOULODROME, LOT 3 : JOUER (2026-10-31)
   `components/ferme/bouloJeu.js` (pur) au-dessus de `petanque.js`. Ce que le banc tient :
   1. L'ENTRAÎNEMENT (mode "solo") : un seul joueur joue tout, mène après mène, et la partie ne finit jamais.
   2. LA SALLE : ouvrir, rejoindre (pas deux fois, pas au-delà du format), quitter, lancer (celui qui a ouvert, au complet), la
      revanche ; deux pistes, deux parties ; on ne joue pas deux parties à la fois.
   3. ⚠️ LE RÉSEAU : chaque lancer de parties entières, ANIMÉ comme à l'écran (`animer` puis `animPas` à 60 images/s), conclut
      exactement l'état de l'hôte (`hoteLancer` → `PT.jouer`) — l'empreinte, au bit près. C'est la promesse de `petanque.js`
      (« chaque client rejoue le lancer reçu ») vérifiée sur le chemin d'affichage, pas seulement sur `simFinir`.
   4. LA PAUSE : un joueur absent met la partie en pause, son retour la lève ; un lancer est refusé pendant la pause.
   5. LE PLACEMENT : le lanceur au cercle, les autres derrière, au bord, tous sur le sable ; le sens de la mène.
   6. LE GUIDE : sur une piste PLATE, un lancer sans erreur de jauge s'arrête là où le guide pose la boule fantôme.
   7. LE POINT : l'anneau entoure la boule du camp qui tient le point ; le « +n » compte ce que `compter` compte.
   Usage : node tools/verify-boulo-jeu.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["petanque", "boulodrome", "bouloJeu"]);
const PT = mods.petanque, BD = mods.boulodrome, BJ = mods.bouloJeu, P = PT.PETANQUE;
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); c ? nOk++ : fail++; };
console.log("\n=== verify-boulo-jeu ===\n");

// un joueur plausible : il vise le but (ou le milieu), lâche à ±err de la marque
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
function choix(sess, pid) {
  const s = PT.avancer(sess.partie), q = PT.aQui(s), m = s.mene;
  if (!q) return null;
  const err = Math.round((rnd() * 2 - 1) * 350);
  if (q.phase === "but") return { coup: s.coups, geste: "but", donnee: BJ.donneeDefaut(m, "but"), err, lourd: 0 };
  if (q.phase === "placer") return { coup: s.coups, geste: "placer", donnee: BJ.donneeDefaut(m, "placer"), err: 0 };
  const g = rnd() < 0.2 ? "tir" : PT.GESTES_BOULE[(rnd() * 3) | 0];
  return { coup: s.coups, geste: g, donnee: BJ.donneeDefaut(m, g), err };
}
// l'écran : animer puis avancer à 60 images/s jusqu'au repos
function rejoueEcran(partie, pid, input) {
  const a = BJ.animer(partie, pid, input);
  if (a.raison) return { raison: a.raison };
  let t = 0, st;
  for (let n = 0; n < 60 * 120; n++) { st = BJ.animPas(a, t); if (st.fini) break; t += 1 / 60; }
  return { s: BJ.conclusion(partie, a), fini: st.fini };
}

// 1. L'entraînement
{
  const ss = { a: null, b: null };
  ok(BJ.hoteOuvrir(ss, 1, "a", "moi", "Moi", "solo", 13) === null && ss.a.etat === "jeu" && ss.a.partie.mode === "solo", "l'entraînement se lance à l'ouverture, seul");
  let menes = 0, lancers = 0, fini = false, autre = false;
  for (let i = 0; i < 400 && menes < 12; i++) {
    const q = BJ.tour(ss.a);
    if (!q) { fini = true; break; }
    if (!q.joueurs.includes("moi")) { autre = true; break; }
    const inp = choix(ss.a, "moi");
    const r = BJ.hoteLancer(ss, "a", "moi", inp, 0);
    if (r.raison) { autre = true; break; }
    lancers++;
    if (ss.a.partie.mene.fini) menes++;
  }
  ok(!fini && !autre && menes >= 12 && ss.a.etat === "jeu" && ss.a.partie.gagnant === null, "douze mènes d'entraînement : toujours mon tour, jamais de fin", lancers + " lancers");
}

// 2. La salle
{
  const ss = { a: null, b: null };
  ok(BJ.hoteOuvrir(ss, 1, "a", "A", "Ana", "tat", 13) === null && ss.a.etat === "salle", "ouvrir une partie en tête-à-tête");
  ok(BJ.hoteOuvrir(ss, 2, "a", "B", "Ben", "tat", 13) === "bouloBusy", "la piste prise refuse une seconde partie");
  ok(BJ.hoteOuvrir(ss, 3, "b", "A", "Ana", "tat", 13) === "bouloAlready", "on ne joue pas deux parties à la fois");
  ok(BJ.hoteLancerPartie(ss, "a", "A", 7) === "bouloWaiting", "on ne lance pas une partie incomplète");
  ok(BJ.hoteRejoindre(ss, "a", "B", "Ben") === null && ss.a.ent.length === 2, "rejoindre");
  ok(BJ.hoteRejoindre(ss, "a", "B", "Ben") === null && ss.a.ent.length === 2, "rejoindre deux fois ne compte qu'une fois");
  ok(BJ.hoteRejoindre(ss, "a", "C", "Cy") === "bouloFull", "pas au-delà du format");
  ok(BJ.hoteLancerPartie(ss, "a", "B", 7) === "bouloNotOwner", "seul celui qui a ouvert lance la partie");
  ok(BJ.hoteLancerPartie(ss, "a", "A", 7) === null && ss.a.etat === "jeu" && ss.a.partie.camps.length === 2, "lancer la partie");
  ok(BJ.piece(ss.a) === ss.a.partie.camps[7 % 2].joueurs[0], "la pièce : la graine désigne qui lance le but", BJ.piece(ss.a));
  ok(BJ.couleurDe(ss.a, "A") === BJ.BJ.COULEURS[0] && BJ.couleurDe(ss.a, "B") === BJ.BJ.COULEURS[1], "les couleurs dans l'ordre d'arrivée");
  ok(BJ.hoteOuvrir(ss, 4, "b", "C", "Cy", "trois", 13) === null && ss.b.cible === 13 && BJ.hoteOuvrir({ a: null, b: null }, 5, "a", "D", "Di", "trois", 0) === null, "une seconde partie sur l'autre piste");
  const s3 = { a: null, b: null }; BJ.hoteOuvrir(s3, 6, "a", "D", "Di", "trois", 0);
  ok(s3.a.cible === 7, "à trois, 7 points par défaut");
  ok(BJ.hoteQuitter(ss, "b", "C") === null && ss.b === null, "celui qui a ouvert annule sa salle");
  ok(BJ.hoteQuitter(ss, "a", "B") === null && ss.a === null, "abandonner une partie lancée la clôt, sans vainqueur");
}

// 3. Le réseau : l'écran rejoue exactement l'hôte, parties entières
{
  let lancers = 0, diff = [], partiesFinies = 0, nonFini = 0;
  for (const [mode, n] of [["tat", 2], ["trois", 3]]) for (let g = 0; g < 4; g++) {
    const ss = { a: null, b: null }, ids = ["J1", "J2", "J3"].slice(0, n);
    BJ.hoteOuvrir(ss, 1, g % 2 ? "a" : "b", ids[0], "j1", mode, 7);
    const k = g % 2 ? "a" : "b";
    for (const id of ids.slice(1)) BJ.hoteRejoindre(ss, k, id, id);
    BJ.hoteLancerPartie(ss, k, ids[0], 1000 + g);
    for (let i = 0; i < 600 && ss[k].etat === "jeu"; i++) {
      const q = BJ.tour(ss[k]); if (!q) break;
      const pid = q.joueurs[0], inp = choix(ss[k], pid), avant = JSON.parse(JSON.stringify(ss[k].partie));
      const r = BJ.hoteLancer(ss, k, pid, inp, 0);
      if (r.raison) { diff.push("refus " + r.detail); break; }
      const e = rejoueEcran(avant, pid, r.input);
      lancers++;
      if (!e.fini) nonFini++;
      if (e.raison || PT.empreinte(e.s) !== r.emp) diff.push(mode + " g" + g + " coup " + inp.coup);
    }
    if (ss[k].etat === "fin") partiesFinies++;
  }
  ok(!diff.length && lancers > 200, "chaque lancer animé à l'écran (60 images/s) conclut l'état de l'hôte, au bit près", lancers + " lancers" + (diff.length ? " ; " + diff.slice(0, 3).join(", ") : ""));
  ok(!nonFini, "chaque animation finit (aucun lancer ne roule sans fin)");
  ok(partiesFinies === 8, "huit parties jouées jusqu'au bout (tête-à-tête et à trois, en 7)", partiesFinies + "/8");
}

// 4. La pause
{
  const ss = { a: null, b: null };
  BJ.hoteOuvrir(ss, 1, "a", "A", "Ana", "tat", 13); BJ.hoteRejoindre(ss, "a", "B", "Ben"); BJ.hoteLancerPartie(ss, "a", "A", 3);
  let ici = new Set(["A", "B"]);
  ok(!BJ.hotePresence(ss.a, (id) => ici.has(id)) && !ss.a.pause, "tout le monde est là : pas de pause");
  ici.delete("B");
  ok(BJ.hotePresence(ss.a, (id) => ici.has(id)) && ss.a.pause && ss.a.pause.qui.join() === "B", "un joueur part : la partie se met en pause");
  const q = BJ.tour(ss.a), r = BJ.hoteLancer(ss, "a", q.joueurs[0], choix(ss.a, q.joueurs[0]), 0);
  ok(r.raison === "bouloPaused", "aucun lancer pendant la pause");
  ok(!BJ.monTour(ss.a, q.joueurs[0]), "personne n'a la main pendant la pause");
  ici.add("B");
  ok(BJ.hotePresence(ss.a, (id) => ici.has(id)) && !ss.a.pause, "il revient : la pause se lève");
}

// 5. Le placement
{
  const ss = { a: null, b: null };
  BJ.hoteOuvrir(ss, 1, "b", "A", "Ana", "trois", 7); BJ.hoteRejoindre(ss, "b", "B", "Ben"); BJ.hoteRejoindre(ss, "b", "C", "Cy"); BJ.hoteLancerPartie(ss, "b", "A", 4);
  const se = ss.b, m = PT.avancer(se.partie).mene, q = BJ.tour(se), c = BJ.mmVersMonde("b", m.cercle.x, m.cercle.y);
  const lan = BJ.placeDe(se, se.partie, q.joueurs[0]);
  ok(Math.abs(lan.wx - c[0]) < 0.01 && Math.abs(lan.wy - c[1]) < 0.01, "le lanceur se tient au cercle");
  const p = BD.pisteDe("b"), autres = se.ent.map((e) => e.id).filter((id) => id !== q.joueurs[0]).map((id) => BJ.placeDe(se, se.partie, id));
  ok(autres.every((pl) => pl.wx >= p.sx && pl.wx <= p.sx + BD.BOULO.LP && pl.wy >= p.sy && pl.wy <= p.sy + BD.BOULO.WP), "les autres attendent sur le sable de la piste");
  ok(autres.every((pl) => (pl.wx - c[0]) * (BJ.sensMene(m)[1]) < 0), "… derrière le cercle (à l'opposé du jeu)");
  ok(autres[0].wy !== autres[1].wy, "… l'un au nord, l'autre au sud");
  ok(BJ.sensMene(m)[1] > 0 && lan.dir === 2, "la première mène se joue vers l'est (le cercle est à l'ouest) ; on regarde à droite");
}

// 6. Le guide, sur une piste plate
{
  let pire = 0;
  for (const geste of ["roulette", "demi", "plombee", "tir"]) for (const d of [5000, 7000, 9000]) {
    const s = PT.nouvellePartie({ mode: "solo", cible: 13, camps: [["A"]], graine: 0, piste: "plat" });
    s.mene.but = { x: 3600, y: 14000 };   // un but posé au fond, à l'écart de la ligne visée
    // la donnée qui, d'après le guide, arrête la boule à `d` du cercle (une roulette se donne court : elle file sur le plat)
    const input = { coup: 0, geste, donnee: PT.donneePour(geste, s.mene.cercle, { x: 1700, y: 1500 + d }, 0), err: 0 };
    const g = BJ.guide(s.mene, geste, input.donnee, 0);
    const r = PT.jouer(s, "A", input);
    if (r.raison) { pire = 99; continue; }
    const q = r.s.mene.boules[r.s.mene.boules.length - 1];
    const e = Math.hypot(q.x / 1000 - g.arret[0], q.y / 1000 - g.arret[1]);
    if (e > pire) pire = e;
  }
  ok(pire < 0.03, "sur le plat, sans erreur de jauge, la boule s'arrête sur la boule fantôme du guide", "écart max " + (pire * 100).toFixed(1) + " cm");
}

// 7. Le point et le « +n »
{
  let bad = 0, vus = 0;
  for (let g = 0; g < 6; g++) {
    const ss = { a: null, b: null };
    BJ.hoteOuvrir(ss, 1, "a", "A", "Ana", "tat", 13); BJ.hoteRejoindre(ss, "a", "B", "Ben"); BJ.hoteLancerPartie(ss, "a", "A", 50 + g);
    for (let i = 0; i < 300 && ss.a.etat === "jeu"; i++) {
      const q = BJ.tour(ss.a); if (!q) break;
      BJ.hoteLancer(ss, "a", q.joueurs[0], choix(ss.a, q.joueurs[0]), 0);
      const pt = PT.point(ss.a.partie), b = BJ.bouleDuPoint(ss.a.partie);
      if (!ss.a.partie.mene.fini && pt.camp >= 0) { vus++; if (!b || b.camp !== pt.camp) bad++; }
      if (ss.a.partie.mene.fini) { const mq = BJ.quiMarque(ss.a.partie), f = ss.a.partie.mene.fini; if (!f.nulle && mq.points !== f.points) bad++; if (!f.nulle && f.raison === "point" && mq.boules.length !== f.points) bad++; }
    }
  }
  ok(!bad && vus > 50, "l'anneau du point est sur une boule du bon camp ; le « +n » compte comme `compter`", vus + " positions, " + bad + " écarts");
}

console.log("\n" + nOk + "/" + (nOk + fail) + (fail ? "  — " + fail + " ÉCHEC(S)" : "  — tout est vert") + "\n");
process.exit(fail ? 1 : 0);
