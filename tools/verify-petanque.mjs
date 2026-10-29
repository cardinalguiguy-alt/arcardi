/* =============================================================================
   verify-petanque.mjs — LE BOULODROME SE JOUE-T-IL, SANS BUG ET SANS LATENCE ? (2026-10-28, lot 1)
   -----------------------------------------------------------------------------
   `components/ferme/petanque.js` (pur, n'importe rien). On JOUE :
     §1  le déterminisme : aucun nom interdit dans le fichier (sin, atan2, pow, hypot, **, random, Date…) ; le même
         lancer deux fois donne le même état au bit près ; le pas à pas de l'écran = l'arbitre ; une partie entière
         rejouée depuis son journal, ou recopiée en JSON entre chaque lancer (un changement d'hôte), finit pareil ;
     §2  les portées sur sol plat : la roulette touche le sol tôt, la demi-portée au milieu, la plombée tout près ; le
         guide de visée (`arretPlat`, `donneePour`) dit ce que la simulation fait ; le terrain lourd retient ;
     §3  le terrain se lit : le relief dévie la roulette plus que la plombée ; la pente raccourcit la montée ; aucune
         boule ne s'arrête sur une pente que le roulement ne retient pas ;
     §4  les chocs : le tir parfait fait carreau, le tir court touche devant, le tir long passe ; jamais deux boules
         l'une dans l'autre ; le cochonnet part plus loin qu'une boule ;
     §5  le comptage, sur des positions construites : points, égalité, but mort, boules mortes, à trois, Fanny ;
     §6  l'ordre de jeu et l'arbitre (`verifier`) : qui n'a pas le point joue, égalité, à trois, demandes parallèles ;
     §7  le but : 6 à 10 m, trois essais puis posé par l'adversaire, le cercle suivant, le terrain lourd par mène ;
     §8  des parties entières (trois formats, 13 et 7 points, deux pistes) entre joueurs simulés : elles finissent,
         et les invariants tiennent à chaque lancer ; leur durée estimée ;
     §9  la difficulté contre un JOUEUR PLAUSIBLE (sa précision au lâcher, en ms : habile 20, moyen 35, débutant 60).
   Usage : node tools/verify-petanque.mjs
     FALSIFY=sin    : un `Math.sin` dans la simulation — §1 doit rougir ;
     FALSIFY=tour   : le camp qui tient le point rejoue — §6 doit rougir ;
     FALSIFY=points : une boule à égalité avec la meilleure adverse marque — §5 doit rougir.
   ⚠️ Ce qu'il ne voit pas : l'écran, le réseau à deux clients (le lot 3), ni si c'est agréable — ça se juge en jouant.
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "components", "ferme", "petanque.js");
let src = fs.readFileSync(FILE, "utf8");
const F = process.env.FALSIFY || "";
const falsify = (from, to) => { if (!src.includes(from)) throw new Error("FALSIFY : motif introuvable " + from); src = src.replace(from, to); };
if (F === "sin") falsify("b.x += b.vx * dt;", "b.x += b.vx * dt + Math.sin(b.y) * 1e-9;");
if (F === "tour") falsify("const pt = point(s).camp, pool = cand.filter((c) => c !== pt);", "const pt = point(s).camp, pool = cand.filter((c) => c === pt || pt < 0);");
if (F === "points") falsify("q.camp === pt.camp && d2But(m, q) < second", "q.camp === pt.camp && d2But(m, q) <= second");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "petanque-"));
fs.writeFileSync(path.join(tmp, "petanque.mjs"), src);
const PT = await import(pathToFileURL(path.join(tmp, "petanque.mjs")).href);
const P = PT.PETANQUE;

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
/* Une section qui plante (une règle falsifiée refuse un lancer, un état manque) ROUGIT au lieu d'arrêter le banc. */
const run = (t, fn) => { section(t); try { fn(); } catch (e) { ok("la section se joue jusqu'au bout", false, String(e.message).split("\n")[0]); } };
const cm = (v) => (v * 100).toFixed(0) + " cm";

/* Un hasard de banc, entier et graine fixe (le banc lui-même doit être rejouable). */
function rng(seed) {
  let s = seed >>> 0;
  const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  r.gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) * Math.sqrt(2); };
  return r;
}
const PROFILS = { habile: 20, moyen: 35, debutant: 60 };
/* L'erreur de jauge d'un joueur qui lâche à ±σ ms de la marque : l'aiguille parcourt 4 unités par période. */
const errDe = (r, ms, geste) => { const e = Math.round(r.gauss() * ms * 4 / PT.GESTES[geste].jauge * 1000); return e > 1000 ? 1000 : e < -1000 ? -1000 : e; };
const dist = (a, b) => Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)) / 1000;

/* Une mène toute faite : le but posé, des boules posées, au lancer du camp `qui`. */
function scene({ piste = "plat", mode = "tat", but = { x: 2000, y: 9000 }, boules = [], dernier = -1, camps } = {}) {
  const cs = camps || (mode === "trois" ? [["a"], ["b"], ["c"]] : mode === "doublette" ? [["a", "a2"], ["b", "b2"]] : [["a"], ["b"]]);
  const s = PT.nouvellePartie({ mode, camps: cs, graine: 0, piste });
  s.mene.but = but ? { ...but } : null;
  for (const q of boules) { s.mene.boules.push({ x: q.x, y: q.y, camp: q.camp, j: q.j, mort: !!q.mort }); s.mene.reste[q.j]--; }
  s.mene.dernier = dernier;
  return s;
}
/* Pointer devant le but : la donnée qui, sur sol plat, arrête la boule à `devant` m en deçà du contact. */
function pointer(s, geste, devant = 0.1) {
  const m = PT.avancer(s).mene, c = m.cercle, b = m.but;
  const dx = b.x - c.x, dy = b.y - c.y, dd = Math.sqrt(dx * dx + dy * dy), dv = (P.BOULE_R + P.BUT_R + devant) * 1000;
  return PT.donneePour(geste, c, { x: Math.round(b.x - dx / dd * dv), y: Math.round(b.y - dy / dd * dv) }, m.lourd);
}

/* ─────────────────────────────────────────────────────────────────────────── */
run("§1 — le déterminisme", () => {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const interdits = code.match(/Math\.(sin|cos|tan|asin|acos|atan2?|sinh|cosh|tanh|exp|expm1|log1?p?|log2|log10|pow|hypot|cbrt|random|fround)\b|\*\*|\bDate\b|performance\.now/g);
  ok("aucune fonction laissée aux moteurs dans le fichier (seulement + − × ÷ et Math.sqrt)", !interdits, interdits ? interdits.join(", ") : "");

  const s = scene({ piste: "a", boules: [{ x: 1900, y: 8700, camp: 1, j: "b" }] });
  const inp = { coup: 0, geste: "demi", donnee: pointer(s, "demi"), err: 137 };
  const r1 = PT.jouer(s, "a", inp), r2 = PT.jouer(s, "a", inp);
  if (r1.raison) throw new Error("le lancer d'essai est refusé : " + r1.raison);
  ok("le même lancer, deux fois : même état, mêmes événements", PT.empreinte(r1.s) === PT.empreinte(r2.s) && JSON.stringify(r1.sim.ev) === JSON.stringify(r2.sim.ev));
  ok("jouer ne touche pas l'état reçu (pur)", PT.empreinte(s) === PT.empreinte(scene({ piste: "a", boules: [{ x: 1900, y: 8700, camp: 1, j: "b" }] })));
  const p = PT.preparer(s, "a", inp);
  let pas = 0;
  while (!PT.simPas(p.sim)) pas++;
  const s3 = PT.conclure(s, "a", inp, p.sim);
  ok("le pas à pas de l'écran (`simPas`) finit où l'arbitre finit", PT.empreinte(s3) === PT.empreinte(r1.s), `${pas + 1} pas`);
  ok("les positions de l'état sont des millimètres entiers", r1.s.mene.boules.every((q) => Number.isInteger(q.x) && Number.isInteger(q.y)) && Number.isInteger(r1.s.mene.but.x));
});

/* ─────────────────────────────────────────────────────────────────────────── */
run("§2 — les portées, sur sol plat", () => {
  // Le but est posé à l'écart (au fond, sur le côté) : on vise un point de la piste, pas le but.
  const frac = {};
  let pire = 0;
  for (const g of ["roulette", "demi", "plombee"]) {
    for (const y of [7500, 9000, 11000]) {
      const s = scene({ but: { x: 3500, y: 14500 } }), c = s.mene.cercle, cible = { x: 1700, y };
      const D = PT.donneePour(g, c, cible, 0), r = PT.jouer(s, "a", { coup: 0, geste: g, donnee: D, err: 0 });
      if (y === 9000) frac[g] = dist(D, c) / dist(cible, c);
      pire = Math.max(pire, dist(r.s.mene.boules[0], cible));
    }
  }
  ok("la roulette touche le sol dans le premier tiers et demi (≤ 45 % du chemin)", frac.roulette <= 0.45, (frac.roulette * 100).toFixed(0) + " %");
  ok("la demi-portée, au milieu (45 à 70 %)", frac.demi >= 0.45 && frac.demi <= 0.7, (frac.demi * 100).toFixed(0) + " %");
  ok("la plombée, tout près du but (≥ 85 %)", frac.plombee >= 0.85, (frac.plombee * 100).toFixed(0) + " %");
  let ecart = 0;
  const DS = { roulette: [1.2, 1.8, 2.4], demi: [2.5, 3.5, 4.5], plombee: [5, 6.5, 8] };   // des lancers qui restent sur la piste
  for (const g of ["roulette", "demi", "plombee"]) for (const d of DS[g]) {
    const s = scene({ but: { x: 3500, y: 14500 } }), c = s.mene.cercle;
    const D = { x: c.x, y: c.y + Math.round((P.BRAS + d) * 1000) };
    const r = PT.jouer(s, "a", { coup: 0, geste: g, donnee: D, err: 0 }), q = r.s.mene.boules[0];
    ecart = Math.max(ecart, Math.abs((q.y - c.y) / 1000 - P.BRAS - PT.arretPlat(g, d, 0)));
  }
  ok("le guide de visée (`arretPlat`) dit l'arrêt de la simulation à 2 cm près", ecart <= 0.02, "pire " + cm(ecart));
  ok("`donneePour` arrête la boule sur le point visé, à 3 cm près (6 à 10 m)", pire <= 0.03, "pire " + cm(pire));
  const sec = PT.arretPlat("roulette", 2.5, 0) - 2.5, lourd = PT.arretPlat("roulette", 2.5, 3) - 2.5;
  ok("après la pluie (terrain détrempé), la roulette roule au moins un quart de moins", lourd <= 0.75 * sec, `${cm(sec)} → ${cm(lourd)}`);
  const court = PT.arretPlat("plombee", P.DONNEE_MIN - P.BRAS + 0.01, 0);
  ok("la plombée la plus courte s'arrête à moins d'un mètre : on peut pointer un but tout proche", court < 1, cm(court));
});

/* ─────────────────────────────────────────────────────────────────────────── */
run("§3 — le terrain se lit", () => {
  const dev = { roulette: 0, plombee: 0 };
  let n = 0;
  for (const piste of ["a", "b"]) for (let x = 900; x <= 3100; x += 550) for (const y of [7600, 9400, 11200]) {
    n++;
    for (const g of ["roulette", "plombee"]) {
      const sp = scene({ piste: "plat", but: { x, y } }), sr = scene({ piste, but: { x, y } });
      const D = pointer(sp, g);
      const qp = PT.jouer(sp, "a", { coup: 0, geste: g, donnee: D, err: 0 }).s.mene.boules[0];
      const qr = PT.jouer(sr, "a", { coup: 0, geste: g, donnee: D, err: 0 }).s.mene.boules[0];
      dev[g] += dist(qp, qr);
    }
  }
  dev.roulette /= n; dev.plombee /= n;
  ok("le relief dévie la roulette d'au moins 10 cm en moyenne", dev.roulette >= 0.1, cm(dev.roulette));
  ok("la plombée est la réponse au relief : il la dévie deux fois moins", dev.plombee <= dev.roulette / 2, cm(dev.plombee));
  /* 2026-10-29 — SA NOTE : « discret sauf quand il y a des lancers longs et forts ; pas systématique ». Décidé avec lui : une roulette
     sur deux passe sans être déviée (de plus de 15 cm, contre la même sur le plat) sur la piste du platane ; la piste de la mairie en
     dévie davantage (son ornière est faite pour être suivie) mais pas toutes. Pointer à 6, 8, 10 m, 14 lignes de 0,7 à 3,3 m, sans erreur. */
  const part = {};
  for (const piste of ["a", "b"]) for (const D of [6, 8, 10]) {
    let n = 0, dv = 0;
    for (let x = 700; x <= 3300; x += 200) {
      const but = { x, y: Math.round((P.CERCLE_Y0 + D) * 1000) };
      const sp = scene({ piste: "plat", but }), sr = scene({ piste, but }), Dn = pointer(sp, "roulette");
      const qp = PT.jouer(sp, "a", { coup: 0, geste: "roulette", donnee: Dn, err: 0 }).s.mene.boules[0];
      const qr = PT.jouer(sr, "a", { coup: 0, geste: "roulette", donnee: Dn, err: 0 }).s.mene.boules[0];
      n++; if (dist(qp, qr) > 0.15) dv++;
    }
    part[piste + D] = dv / n;
  }
  const pcs = (k) => ["6", "8", "10"].map((D) => Math.round(part[k + D] * 100) + " %").join(" / ");
  ok("pas systématique : sur la piste du platane, une roulette sur deux au plus est déviée (6 / 8 / 10 m)", [6, 8, 10].every((D) => part["b" + D] <= 0.5 + 1e-9), pcs("b"));
  ok("…sur la piste de la mairie, deux sur trois au plus (l'ornière se suit)", [6, 8, 10].every((D) => part["a" + D] <= 2 / 3 + 1e-9), pcs("a"));
  // La piste du platane monte vers y = 15 : la même roulette va moins loin en montant qu'en descendant.
  const sMonte = scene({ piste: "b", but: { x: 3500, y: 14500 } });
  const sDesc = scene({ piste: "b", but: { x: 3500, y: 500 } });
  sDesc.mene.cercle = { x: 3000, y: 13500 }; sMonte.mene.cercle = { x: 3000, y: 1500 };
  const qM = PT.jouer(sMonte, "a", { coup: 0, geste: "roulette", donnee: { x: 3000, y: 4000 }, err: 0 }).s.mene.boules[0];
  const qD = PT.jouer(sDesc, "a", { coup: 0, geste: "roulette", donnee: { x: 3000, y: 11000 }, err: 0 }).s.mene.boules[0];
  const lM = (qM.y - 1500) / 1000, lD = (13500 - qD.y) / 1000;
  ok("la pente se sent : la roulette qui monte s'arrête plus court que celle qui descend", lM < lD - 0.2, `monte ${lM.toFixed(2)} m, descend ${lD.toFixed(2)} m`);
  // Aucune pente sous 10 % sauf au flanc d'un caillou, et aucune boule ne s'arrête là où le roulement ne la retient pas.
  let maxP = 0;
  const g = [0, 0];
  for (const k of ["a", "b"]) {
    const T = PT.PISTES[k];
    for (let x = 0; x <= P.W; x += 0.02) for (let y = 0; y <= P.L; y += 0.02) {
      if (T.cailloux.some((c) => (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) < c.r * c.r)) continue;
      PT.pente(T, x, y, g);
      maxP = Math.max(maxP, Math.sqrt(g[0] * g[0] + g[1] * g[1]));
    }
  }
  ok("hors des cailloux, aucune pente que le roulement ne retienne (MU / K_PENTE = 9,8 %)", maxP <= P.MU / P.K_PENTE, (maxP * 100).toFixed(1) + " %");
  const r = rng(7);
  let bad = 0, tot = 0;
  for (let k = 0; k < 120; k++) {
    const piste = k % 2 ? "a" : "b", s = scene({ piste, but: { x: 600 + Math.floor(r() * 2800), y: 7000 + Math.floor(r() * 4000) } });
    const geste = ["roulette", "demi", "plombee"][k % 3];
    const res = PT.jouer(s, "a", { coup: 0, geste, donnee: pointer(s, geste), err: errDe(r, 60, geste) });
    for (const b of res.sim.corps) {
      if (!b.vivant) continue;
      tot++;
      PT.pente(PT.PISTES[piste], b.x, b.y, g);
      const a = P.K_PENTE * Math.sqrt(g[0] * g[0] + g[1] * g[1]), fr = P.MU * P.LOURD[0].mu * b.mu;
      if (a > fr * 1.0001) bad++;
    }
  }
  ok("aucune boule au repos sur une pente que le roulement ne retient pas", bad === 0, `${bad} sur ${tot}`);
});

/* ─────────────────────────────────────────────────────────────────────────── */
run("§4 — les chocs", () => {
  const cible = { x: 2000, y: 8820, camp: 1, j: "b" };
  const tirer = (err, piste = "plat") => PT.jouer(scene({ piste, boules: [cible], dernier: 1 }), "a", { coup: 0, geste: "tir", donnee: { x: cible.x, y: cible.y }, err });
  const r0 = tirer(0);
  ok("le tir parfait au fer fait CARREAU", r0.sim.fer === 1 && r0.sim.carreau, `tireur à ${cm(dist(r0.s.mene.boules[1], cible))} de la place`);
  ok("… et chasse la boule frappée à plus d'un mètre (ou hors du jeu)", r0.s.mene.boules[0].mort || dist(r0.s.mene.boules[0], cible) > 1);
  ok("le carreau compte dans les faits (la gazette, lot 5) et le palmarès", r0.s.faits.some((f) => f.t === "carreau" && f.j === "a") && r0.s.stats.a.carreaux === 1 && r0.s.stats.a.tirs === 1);
  const rc = tirer(-150), rl = tirer(170);
  ok("le tir trop court tombe devant et touche en roulant (pas au fer)", rc.sim.fer < 0 && rc.sim.ev.some((e) => e.t === "choc" && (e.i === 1 || e.j === 1)));
  ok("le tir trop long passe par-dessus sans la toucher", rl.sim.fer < 0 && rl.s.mene.boules[0].x === cible.x && rl.s.mene.boules[0].y === cible.y);
  let fer = 0, car = 0, carLoin = 0;
  for (let e = -200; e <= 200; e += 5) { const r = tirer(e); if (r.sim.fer === 1) fer++; if (r.sim.carreau) { car++; if (Math.abs(e) > 100) carLoin++; } }
  const fen = fer * 5 / 2000;   // l'aiguille va de −1000 à +1000 ‰
  ok("la fenêtre du fer est étroite mais réelle (5 à 15 % de la course de l'aiguille, à 7,3 m)", fen >= 0.05 && fen <= 0.15, (fen * 100).toFixed(1) + " %");
  ok("le carreau ne vient que d'un tir presque juste", car >= 2 && carLoin === 0, `${car} crans`);
  // Le cochonnet, cinquante fois plus léger, part plus loin qu'une boule frappée de la même façon.
  const lance = PT.donneePour("roulette", { x: 2000, y: 1500 }, { x: 2000, y: 9000 }, 0);
  const sb = scene({ but: { x: 3500, y: 14500 }, boules: [{ x: 2000, y: 7000, camp: 1, j: "b" }], dernier: 1 });
  const rb = PT.jouer(sb, "a", { coup: 0, geste: "roulette", donnee: lance, err: 0 });
  const sc = scene({ but: { x: 2000, y: 7000 } });
  const rcq = PT.jouer(sc, "a", { coup: 0, geste: "roulette", donnee: lance, err: 0 });
  const dBoule = dist(rb.s.mene.boules[0], { x: 2000, y: 7000 }), dBut = rcq.s.mene.butMort ? 99 : dist(rcq.s.mene.but, { x: 2000, y: 7000 });
  ok("frappé par la même roulette, le cochonnet part plus loin qu'une boule", dBut > dBoule, `but ${dBut === 99 ? "hors du jeu" : cm(dBut)}, boule ${cm(dBoule)}`);
});

/* ─────────────────────────────────────────────────────────────────────────── */
run("§5 — le comptage (positions construites)", () => {
  const fin = (s) => PT.compter(s);
  const B = { x: 2000, y: 9000 };
  let s = scene({ but: B, boules: [{ x: 2000, y: 8700, camp: 0, j: "a" }, { x: 2300, y: 9000, camp: 0, j: "a" }, { x: 2000, y: 9400, camp: 1, j: "b" }, { x: 1000, y: 9000, camp: 0, j: "a" }] });
  let r = fin(s);
  ok("deux boules devant la meilleure adverse : deux points", !r.nulle && r.gagnant === 0 && r.points === 2, JSON.stringify(r));
  s = scene({ but: B, boules: [{ x: 2000, y: 8700, camp: 0, j: "a" }, { x: 2300, y: 9000, camp: 1, j: "b" }, { x: 2000, y: 9500, camp: 0, j: "a" }] });
  r = fin(s);
  ok("égalité exacte entre les deux meilleures (au millimètre, en entiers) : mène nulle", r.nulle && r.raison === "egalite", JSON.stringify(r));
  s = scene({ but: B, boules: [{ x: 2000, y: 8900, camp: 0, j: "a" }, { x: 2000, y: 9200, camp: 1, j: "b" }, { x: 2000, y: 8800, camp: 0, j: "a" }, { x: 2000, y: 9300, camp: 1, j: "b" }] });
  r = fin(s);
  ok("une seconde boule à égalité exacte avec la meilleure adverse (20 cm des deux côtés) ne marque pas", !r.nulle && r.gagnant === 0 && r.points === 1, JSON.stringify(r));
  s = scene({ but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }] });
  s.mene.butMort = true;
  r = fin(s);
  ok("le but sorti, les deux camps avec des boules en main : mène nulle", r.nulle && r.raison === "but-mort");
  s = scene({ but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }, { x: 2000, y: 8800, camp: 0, j: "a", mort: true }, { x: 0, y: 0, camp: 0, j: "a", mort: true }, { x: 2000, y: 9100, camp: 1, j: "b" }] });
  s.mene.butMort = true;
  r = fin(s);
  ok("le but sorti, un seul camp avec des boules en main : il marque ses boules en main", !r.nulle && r.gagnant === 1 && r.points === 2, JSON.stringify(r));
  s = scene({ but: B, boules: [{ x: 0, y: 0, camp: 0, j: "a", mort: true }, { x: 0, y: 0, camp: 0, j: "a", mort: true }, { x: 0, y: 0, camp: 0, j: "a", mort: true }, { x: 2000, y: 9800, camp: 1, j: "b" }, { x: 2000, y: 9900, camp: 1, j: "b" }] });
  r = fin(s);
  ok("les boules mortes ne comptent pas ; contre rien, chaque boule vivante marque", !r.nulle && r.gagnant === 1 && r.points === 2, JSON.stringify(r));
  s = scene({ but: B, boules: [{ x: 0, y: 0, camp: 0, j: "a", mort: true }, { x: 0, y: 0, camp: 1, j: "b", mort: true }] });
  r = fin(s);
  ok("aucune boule vivante : mène nulle", r.nulle && r.raison === "aucune-boule");
  s = scene({ mode: "trois", but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }, { x: 2000, y: 9250, camp: 1, j: "b" }, { x: 2100, y: 9000, camp: 0, j: "a" }, { x: 2000, y: 9600, camp: 2, j: "c" }] });
  r = fin(s);
  ok("à trois : le plus près marque ses boules devant la meilleure des deux autres", !r.nulle && r.gagnant === 0 && r.points === 2, JSON.stringify(r));
  // Fanny, et la fin de partie.
  const g = PT.nouvellePartie({ mode: "tat", camps: [["a"], ["b"]], cible: 13, graine: 1 });
  g.camps[0].score = 12;
  g.mene.but = { ...B };
  g.mene.boules = [{ x: 2000, y: 8800, camp: 0, j: "a", mort: false }, { x: 2000, y: 9500, camp: 1, j: "b", mort: false }, { x: 2000, y: 9600, camp: 1, j: "b", mort: false }, { x: 2000, y: 9700, camp: 1, j: "b", mort: false }, { x: 2050, y: 8850, camp: 0, j: "a", mort: false }];
  g.mene.reste = { a: 1, b: 0 };
  g.coups = 5;
  const fz = PT.jouer(g, "a", { coup: 5, geste: "roulette", donnee: { x: 1000, y: 3000 }, err: 0 }).s;
  ok("13 à 0 : la partie est finie, et c'est Fanny", fz.gagnant === 0 && fz.fanny && fz.faits.some((f) => f.t === "fanny") && fz.camps[0].score >= 13);
  ok("une partie finie refuse tout lancer", PT.verifier(fz, "b", { coup: fz.coups, geste: "but", donnee: { x: 2000, y: 9000 }, err: 0, lourd: 0 }) === "partie-finie" && PT.aQui(fz) === null);
  g.camps[1].score = 1;
  const f1 = PT.jouer(g, "a", { coup: 5, geste: "roulette", donnee: { x: 1000, y: 3000 }, err: 0 }).s;
  ok("13 à 1 : pas de Fanny", f1.gagnant === 0 && !f1.fanny);
});

/* ─────────────────────────────────────────────────────────────────────────── */
run("§6 — l'ordre de jeu, et l'arbitre", () => {
  const B = { x: 2000, y: 9000 };
  let s = scene({ but: B });
  s.mene.butLanceur = 1;
  ok("la première boule : le camp qui a lancé le but", PT.aQui(s).camp === 1);
  s = scene({ but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }], dernier: 0 });
  ok("un camp tient le point : l'autre joue", PT.aQui(s).camp === 1);
  s = scene({ but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }, { x: 2000, y: 9500, camp: 1, j: "b" }], dernier: 1 });
  ok("le camp qui n'a pas le point rejoue tant qu'il ne l'a pas repris", PT.aQui(s).camp === 1);
  s = scene({ but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }, { x: 2000, y: 9500, camp: 1, j: "b" }, { x: 2000, y: 9600, camp: 1, j: "b" }, { x: 2000, y: 9700, camp: 1, j: "b" }], dernier: 1 });
  ok("le camp sans point n'a plus de boules : celui qui tient le point joue les siennes", PT.aQui(s).camp === 0);
  s = scene({ but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }, { x: 2000, y: 9200, camp: 1, j: "b" }], dernier: 1 });
  ok("égalité au point : le camp qui vient de jouer rejoue (le règlement)", PT.aQui(s).camp === 1);
  s = scene({ but: B, boules: [{ x: 0, y: 0, camp: 0, j: "a", mort: true }], dernier: 0 });
  ok("aucune boule au sol (la première est morte) : l'autre camp joue", PT.aQui(s).camp === 1);
  s = scene({ mode: "trois", but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }], dernier: 0 });
  ok("à trois, après la première boule : le suivant dans l'ordre (ni l'un ni l'autre n'a joué)", PT.aQui(s).camp === 1);
  s = scene({ mode: "trois", but: B, boules: [{ x: 2000, y: 9300, camp: 0, j: "a" }, { x: 2000, y: 8850, camp: 1, j: "b" }, { x: 2000, y: 9700, camp: 2, j: "c" }], dernier: 2 });
  ok("à trois : le plus LOIN du but joue (ici, celui qui vient de jouer)", PT.aQui(s).camp === 2);
  s = scene({ mode: "doublette", but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }, { x: 2000, y: 9500, camp: 1, j: "b" }, { x: 2000, y: 9600, camp: 1, j: "b" }, { x: 2000, y: 9700, camp: 1, j: "b" }], dernier: 1 });
  const q = PT.aQui(s);
  ok("en doublette, seuls les équipiers qui ont encore des boules sont appelés", q.camp === 1 && q.joueurs.length === 1 && q.joueurs[0] === "b2");
  // L'arbitre.
  s = scene({ but: B, boules: [{ x: 2000, y: 8800, camp: 0, j: "a" }], dernier: 0 });
  const bon = { coup: 0, geste: "plombee", donnee: { x: 2000, y: 8500 }, err: 0 };
  ok("le bon joueur, au bon coup : accepté", PT.verifier(s, "b", bon) === null);
  ok("le mauvais joueur : refusé", PT.verifier(s, "a", bon) === "pas-ton-tour");
  const apres = PT.jouer(s, "b", bon).s;
  ok("deux demandes parallèles pour le même coup : la seconde est refusée (`coup`)", PT.verifier(apres, "b", bon) === "coup");
  ok("un geste de but pendant les boules : refusé", PT.verifier(s, "b", { ...bon, geste: "but", lourd: 0 }) === "geste");
  ok("une donnée hors de la piste, ou pas entière : refusée", PT.verifier(s, "b", { ...bon, donnee: { x: 4100, y: 8000 } }) === "donnee" && PT.verifier(s, "b", { ...bon, donnee: { x: 2000.5, y: 8000 } }) === "donnee");
  ok("une donnée dans le cercle (sans direction) : refusée", PT.verifier(s, "b", { ...bon, donnee: { x: s.mene.cercle.x + 100, y: s.mene.cercle.y } }) === "donnee");
  ok("une erreur de jauge hors de ±1000 ‰ : refusée", PT.verifier(s, "b", { ...bon, err: 1001 }) === "err");
  ok("une entrée absente : refusée sans planter", PT.verifier(s, "b", null) === "entree" && PT.verifier(s, "b", { coup: 0, geste: "plombee" }) === "donnee");
});

/* ─────────────────────────────────────────────────────────────────────────── */
run("§7 — le but", () => {
  const m = { cercle: { x: 2000, y: 1500 } };
  ok("un but à 5,99 m : non ; à 6 m : oui ; à 10 m : oui ; à 10,01 m : non", !PT.butValide(m, 2000, 7490) && PT.butValide(m, 2000, 7500) && PT.butValide(m, 2000, 11500) && !PT.butValide(m, 2000, 11510));
  ok("un but à moins de 80 cm d'une ligne de côté, ou de 1,5 m d'un bout : non", !PT.butValide(m, 790, 9000) && PT.butValide(m, 800, 9000) && !PT.butValide({ cercle: { x: 2000, y: 5000 } }, 2000, 13510) && PT.butValide({ cercle: { x: 2000, y: 5000 } }, 2000, 13500));
  let couvre = true;
  for (let y = 1000; y <= 14000; y += 250) {
    const mm = { cercle: { x: 2000, y } };
    let un = false;
    for (let yy = 0; yy <= 15000 && !un; yy += 100) if (PT.butValide(mm, 2000, yy)) un = true;
    if (!un) couvre = false;
  }
  ok("de tout cercle possible (y de 1 à 14 m), il existe un but valable : la partie va et vient", couvre);
  let s = PT.nouvellePartie({ mode: "tat", camps: [["a"], ["b"]], graine: 0, piste: "plat" });
  ok("la première mène : le but à lancer, par le camp que la graine désigne", PT.aQui(s).phase === "but" && PT.aQui(s).camp === 0);
  for (let k = 0; k < 3; k++) s = PT.jouer(s, "a", { coup: s.coups, geste: "but", donnee: { x: 2000, y: 4000 }, err: 0, lourd: 2 }).s;
  const q = PT.aQui(s);
  ok("trois buts trop courts : l'adversaire le pose à la main", s.mene.essais === 3 && q.phase === "placer" && q.camp === 1);
  ok("posé hors de la zone : refusé", PT.verifier(s, "b", { coup: s.coups, geste: "placer", donnee: { x: 2000, y: 5000 } }) === "donnee");
  s = PT.jouer(s, "b", { coup: s.coups, geste: "placer", donnee: { x: 2000, y: 9000 } }).s;
  ok("posé dans la zone : accepté, et la première boule reste au camp qui lançait", s.mene.but.y === 9000 && PT.aQui(s).camp === 0);
  ok("le terrain lourd lu au lancer du but vaut pour toute la mène", s.mene.lourd === 2);
  // Le cercle suivant : là où le but a fini, ramené à 1 m des lignes.
  const g = scene({ but: { x: 3800, y: 14600 }, boules: [{ x: 3600, y: 14300, camp: 0, j: "a" }, { x: 3400, y: 14100, camp: 0, j: "a" }, { x: 3300, y: 14200, camp: 1, j: "b" }, { x: 3200, y: 13900, camp: 1, j: "b" }, { x: 3000, y: 13800, camp: 1, j: "b" }] });
  g.coups = 5;
  const fin = PT.jouer(g, "a", { coup: 5, geste: "roulette", donnee: { x: 1000, y: 2500 }, err: 0 }).s;
  const nx = PT.avancer(fin).mene;
  ok("la mène suivante : cercle là où le but a fini, ramené à 1 m des lignes ; le but au camp qui a marqué",
    fin.mene.fini && nx.n === 2 && nx.cercle.x === 3000 && nx.cercle.y === 14000 && nx.butLanceur === fin.mene.fini.gagnant && nx.but === null);
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* Le joueur simulé du banc (pas encore les habitants du lot 4) : il lance le but à 6,5-9,5 m du côté où il y a de la
   place, pointe devant le but avec le geste que la piste appelle, et tire une fois sur deux la boule adverse qui
   tient le point de près. */
function choix(s, r, ms) {
  const q = PT.aQui(s);
  if (!q) return null;
  const sa = PT.avancer(s), m = sa.mene, c = m.cercle, sens = c.y <= 7500 ? 1 : -1, pid = q.joueurs[0];
  const place = sens > 0 ? (P.L - P.BUT_FOND) * 1000 - c.y : c.y - P.BUT_FOND * 1000;   // jusqu'à la marge du fond (≥ 6 m)
  if (q.phase === "placer") return { pid, input: { coup: s.coups, geste: "placer", donnee: { x: c.x, y: c.y + sens * Math.round((6000 + Math.min(10000, place)) / 2) } } };
  if (q.phase === "but") {
    const loin = Math.max(6200, Math.min(9500, place - 200)), cible = { x: c.x + Math.round((r() - 0.5) * 1200), y: c.y + sens * Math.round(6200 + r() * (loin - 6200)) };
    return { pid, input: { coup: s.coups, geste: "but", donnee: PT.donneePour("but", c, cible, 0), err: errDe(r, ms, "but"), lourd: Math.floor(r() * 4) } };
  }
  const pt = PT.point(sa);
  if (pt.camp >= 0 && pt.camp !== q.camp && r() < 0.5) {
    let best = null, bd = Infinity;
    for (const b of m.boules) if (!b.mort && b.camp === pt.camp) { const d = dist(b, m.but); if (d < bd) { bd = d; best = b; } }
    if (bd < 0.4) return { pid, input: { coup: s.coups, geste: "tir", donnee: { x: best.x, y: best.y }, err: errDe(r, ms, "tir") } };
  }
  const geste = sa.piste === "b" ? "plombee" : r() < 0.6 ? "roulette" : "demi";
  let D = pointer(sa, geste, 0.05 + r() * 0.15);
  const dx = D.x - c.x, dy = D.y - c.y, dd = Math.sqrt(dx * dx + dy * dy);
  if (dd < 600) D = { x: Math.round(c.x + dx / dd * 600), y: Math.round(c.y + dy / dd * 600) };
  D = { x: Math.min(4000, Math.max(0, D.x)), y: Math.min(15000, Math.max(0, D.y)) };
  return { pid, input: { coup: s.coups, geste, donnee: D, err: errDe(r, ms, geste) } };
}
function partie(mode, cible, piste, seed, { json = false } = {}) {
  const camps = mode === "trois" ? [["a"], ["b"], ["c"]] : mode === "doublette" ? [["a", "a2"], ["b", "b2"]] : [["a"], ["b"]];
  const r = rng(seed), prof = {};
  for (const j of camps.flat()) prof[j] = Object.values(PROFILS)[Math.floor(r() * 3)];
  let s = PT.nouvellePartie({ mode, cible, camps, graine: seed, piste });
  const journal = [], init = s, bilan = { lancers: 0, refus: 0, viole: [], tSim: 0, menes: 0 };
  while (s.gagnant === null && bilan.lancers < 1500) {
    const c = choix(s, r, 0);
    if (!c) { bilan.viole.push("personne à qui jouer sans gagnant"); break; }
    c.input.err = c.input.err === undefined ? undefined : errDe(r, prof[c.pid], c.input.geste === "placer" ? "but" : c.input.geste);
    if (c.input.geste === "placer") delete c.input.err;
    const ref = PT.verifier(s, c.pid, c.input);
    if (ref) { bilan.refus++; bilan.viole.push("refus " + ref); break; }
    const res = PT.jouer(s, c.pid, c.input);
    journal.push(c);
    bilan.lancers++;
    if (res.sim) bilan.tSim += res.sim.tSol + res.sim.n * P.DT;
    const n = res.s;
    if (n.coups !== s.coups + 1) bilan.viole.push("coups");
    const mm = n.mene;
    if (Object.values(mm.reste).some((v) => v < 0)) bilan.viole.push("reste négatif");
    const viv = mm.boules.filter((b) => !b.mort);
    if (viv.some((b) => b.x < 0 || b.x > 4000 || b.y < 0 || b.y > 15000)) bilan.viole.push("boule vivante hors de la piste");
    for (let i = 0; i < viv.length; i++) for (let j = i + 1; j < viv.length; j++) if (dist(viv[i], viv[j]) < 2 * P.BOULE_R - 0.0015) bilan.viole.push("deux boules l'une dans l'autre");
    if (mm.but && !mm.butMort && viv.some((b) => dist(b, mm.but) < P.BOULE_R + P.BUT_R - 0.0015)) bilan.viole.push("une boule dans le but");
    if (mm.fini) bilan.menes++;
    s = json ? JSON.parse(JSON.stringify(n)) : n;
  }
  const somme = s.camps.map((_, c) => s.historique.filter((h) => h.gagnant === c).reduce((a, h) => a + h.points, 0));
  if (somme.some((v, c) => v !== s.camps[c].score)) bilan.viole.push("le score n'est pas la somme des mènes");
  if (s.gagnant !== null && s.camps.some((cc, c) => (c === s.gagnant) !== (cc.score >= cible))) bilan.viole.push("gagnant et scores");
  return { s, init, journal, bilan };
}
run("§8 — des parties entières, entre joueurs simulés", () => {
  const plan = [["tat", 13, 40], ["tat", 7, 20], ["doublette", 13, 20], ["trois", 13, 20]];
  for (const [mode, cible, N] of plan) {
    let finies = 0, viol = [], lancers = 0, menes = 0, tSim = 0, fanny = 0, carreaux = 0, mort = 0, nulles = 0, points = 0;
    for (let k = 0; k < N; k++) {
      const { s, bilan } = partie(mode, cible, k % 2 ? "a" : "b", 1000 + k);
      if (s.gagnant !== null) finies++;
      for (const h of s.historique) { if (h.raison === "but-mort") mort++; if (h.gagnant < 0) nulles++; points += h.points; }
      viol = viol.concat(bilan.viole);
      lancers += bilan.lancers; menes += bilan.menes; tSim += bilan.tSim;
      if (s.fanny) fanny++;
      carreaux += Object.values(s.stats).reduce((a, st) => a + st.carreaux, 0);
    }
    /* La durée ESTIMÉE (pas mesurée : personne n'a encore joué) : 8 s de visée par lancer + le vol et le roulé
       simulés + 25 s par mène (ramasser, retracer le cercle). */
    const min = (lancers * 8 + tSim + menes * 25) / 60 / N;
    ok(`${mode} en ${cible} : les ${N} parties finissent, invariants tenus à chaque lancer`, finies === N && viol.length === 0,
      `${(menes / N).toFixed(1)} mènes, ${(lancers / N).toFixed(0)} lancers, ≈ ${min.toFixed(0)} min estimées ; ${(points / (menes - nulles)).toFixed(2)} point par mène gagnée, ${(nulles / menes * 100).toFixed(0)} % de mènes nulles ; Fanny ${fanny}/${N}, ${carreaux} carreaux${viol.length ? " ; " + [...new Set(viol)].join(", ") : ""}`);
    /* Le défaut du premier jet : un cochonnet qui gichait hors de la piste, et la moitié des mènes du tête-à-tête qui
       finissaient « but mort ». ⚠️ Ce chiffre dépend du joueur simulé, qui tire une fois sur deux sans regarder si le
       but est derrière sa cible : à douze boules (doublette), il chasse le but bien plus qu'un joueur qui lit sa ligne.
       Les habitants du lot 4 devront la lire. */
    const borne = mode === "tat" ? 0.2 : 0.35;
    ok(`${mode} en ${cible} : le but sort de la piste au plus ${borne === 0.2 ? "une mène sur cinq" : "une mène sur trois"}`, mort / menes <= borne, (mort / menes * 100).toFixed(0) + " %");
  }
  const a = partie("doublette", 13, "a", 77), b = partie("doublette", 13, "a", 77, { json: true });
  ok("une partie recopiée en JSON entre chaque lancer (un nouvel hôte) finit exactement pareil", PT.empreinte(a.s) === PT.empreinte(b.s));
  let s = a.init;
  for (const c of a.journal) s = PT.jouer(s, c.pid, c.input).s;
  ok("rejouée depuis son seul journal d'entrées, elle finit exactement pareil", PT.empreinte(s) === PT.empreinte(a.s), `${a.journal.length} lancers`);
});

/* ─────────────────────────────────────────────────────────────────────────── */
run("§9 — la difficulté, contre un joueur plausible", () => {
  const moy = {};
  const r = rng(12345);
  /* 2026-10-29 — sur la piste du platane, deux familles de lignes : celles qui passent par le COULOIR entre les racines et le creux (le
     but posé au milieu, x 1,55 à 2,25 m), et celles qui croisent le RELIEF (x < 1,4 ou > 2,4). Sa note « pas systématique » : le relief
     se lit, il ne frappe pas toutes les boules. */
  const zone = (x) => (x >= 1550 && x <= 2250 ? "couloir" : x < 1400 || x > 2400 ? "relief" : null);
  for (const piste of ["plat", "b"]) for (const [nom, ms] of Object.entries(PROFILS)) for (const g of ["roulette", "plombee"]) {
    const acc = {};
    const N = piste === "b" ? 600 : 300;   // le plat garde son tirage d'avant (les contrôles d'adresse en dépendent)
    for (let k = 0; k < N; k++) {
      const s = scene({ piste, but: { x: 800 + Math.floor(r() * 2400), y: 7500 + Math.floor(r() * 3000) } });
      const res = PT.jouer(s, "a", { coup: 0, geste: g, donnee: pointer(s, g), err: errDe(r, ms, g) }), q = res.s.mene.boules[0];
      const d = q.mort ? 3 : dist(q, res.s.mene.but);
      for (const z of ["", zone(s.mene.but.x)]) if (z !== null) { const a = acc[z] || (acc[z] = [0, 0]); a[0] += d; a[1]++; }
    }
    for (const z in acc) moy[`${piste}${z ? "." + z : ""}.${nom}.${g}`] = acc[z][0] / acc[z][1];
  }
  const t = (k) => cm(moy[k]);
  console.log(`        distance moyenne au but (pointer 10 cm devant) — plat : roulette ${t("plat.habile.roulette")} / ${t("plat.moyen.roulette")} / ${t("plat.debutant.roulette")}, ` +
    `plombée ${t("plat.habile.plombee")} / ${t("plat.moyen.plombee")} / ${t("plat.debutant.plombee")} ; piste du platane : roulette ${t("b.habile.roulette")} / ${t("b.moyen.roulette")} / ${t("b.debutant.roulette")}, plombée ${t("b.habile.plombee")} / ${t("b.moyen.plombee")} / ${t("b.debutant.plombee")}`);
  ok("sur le plat, la roulette est le geste le plus sûr (pour les trois joueurs)", ["habile", "moyen", "debutant"].every((n) => moy[`plat.${n}.roulette`] < moy[`plat.${n}.plombee`]));
  console.log(`        piste du platane, le but derrière le relief : roulette ${t("b.relief.habile.roulette")} / ${t("b.relief.moyen.roulette")}, plombée ${t("b.relief.habile.plombee")} / ${t("b.relief.moyen.plombee")} ; dans le couloir : roulette ${t("b.couloir.habile.roulette")} / ${t("b.couloir.moyen.roulette")}, plombée ${t("b.couloir.habile.plombee")} / ${t("b.couloir.moyen.plombee")}`);
  ok("sur la piste du platane, une ligne qui croise le relief appelle la plombée (habile et moyen)", ["habile", "moyen"].every((n) => moy[`b.relief.${n}.plombee`] < moy[`b.relief.${n}.roulette`]));
  ok("…et le couloir est la meilleure ligne pour la roulette (plus près que derrière le relief, habile et moyen)", ["habile", "moyen"].every((n) => moy[`b.couloir.${n}.roulette`] < moy[`b.relief.${n}.roulette`]));
  ok("l'adresse paie : habile < moyen < débutant, et l'écart se voit (≥ 15 cm du premier au dernier)",
    moy["plat.habile.roulette"] < moy["plat.moyen.roulette"] && moy["plat.moyen.roulette"] < moy["plat.debutant.roulette"] && moy["plat.debutant.roulette"] - moy["plat.habile.roulette"] >= 0.15);
  ok("un bon pointeur finit à un diamètre et demi du but au plus, sur le plat (≈ 33 cm)", moy["plat.habile.roulette"] <= 3 * P.BOULE_R + 0.005);
  const tir = {};
  for (const [nom, ms] of Object.entries(PROFILS)) {
    let fer = 0, car = 0;
    const N = 400;
    for (let k = 0; k < N; k++) {
      const y = 7500 + Math.floor(r() * 2500), cible = { x: 1200 + Math.floor(r() * 1600), y, camp: 1, j: "b" };
      const s = scene({ but: { x: cible.x, y: y + 250 }, boules: [cible], dernier: 1 });
      const res = PT.jouer(s, "a", { coup: 0, geste: "tir", donnee: { x: cible.x, y: cible.y }, err: errDe(r, ms, "tir") });
      if (res.sim.fer === 1) fer++;
      if (res.sim.carreau) car++;
    }
    tir[nom] = { fer: fer / N, car: car / N };
  }
  const pc = (v) => (v * 100).toFixed(0) + " %";
  console.log(`        tir au fer à 6-9 m : habile ${pc(tir.habile.fer)} (carreau ${pc(tir.habile.car)}), moyen ${pc(tir.moyen.fer)} (${pc(tir.moyen.car)}), débutant ${pc(tir.debutant.fer)} (${pc(tir.debutant.car)})`);
  ok("le tir : l'habile touche au fer au moins 7 fois sur 10", tir.habile.fer >= 0.7);
  ok("le moyen, entre 4 et 7 fois sur 10", tir.moyen.fer >= 0.4 && tir.moyen.fer <= 0.7);
  ok("le débutant, moins d'une fois sur deux", tir.debutant.fer < 0.5);
  ok("le carreau reste rare et se mérite (moyen : 3 à 25 %, habile au-dessus du moyen)", tir.moyen.car >= 0.03 && tir.moyen.car <= 0.25 && tir.habile.car > tir.moyen.car);
});

console.log(`\n${fails ? "ÉCHEC" : "OK"} — ${total - fails}/${total} contrôles${F ? " (FALSIFY=" + F + ")" : ""}`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fails ? 1 : 0);
