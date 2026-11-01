/* =============================================================================
   bouloBot.js — LE BOULODROME, LOT 4 : LA TÊTE DES HABITANTS BOULISTES (2026-11-01). PUR — ni React, ni canevas, ni réseau.
   -----------------------------------------------------------------------------
   Ses verdicts (docs/PROJETS.md §11, page https://claude.ai/artifact/FjZkm6oWF1bGbDZs8vDRgd) : une adresse FIXE par personne
   (le fort, le moyen, le débutant) — sa note : « le fort ne doit pas être invincible, attention » ; une VRAIE TÊTE (pointer ou
   tirer selon le jeu, la ligne de tir lue, le relief lu selon le niveau) ; 3 à 6 s avant de lancer ; on ne voit pas sa visée.

   ⚠️⚠️ ILS LANCENT AVEC LES MÊMES MAINS QUE LE JOUEUR. La décision rend une ENTRÉE de lancer ordinaire — `{ coup, geste, donnee,
   err }` — que l'hôte passe à la même porte que celle d'un joueur (`BJ.hoteLancer` → `PT.verifier` → `PT.jouer`). L'adresse
   n'est QUE l'erreur au lâcher (`err`, la même jauge, la même table `kL`/`kA`) : aucune physique à part, aucune triche. Le
   joueur simulé du lot 1 (`verify-petanque` §9) en est la mesure : ±σ ms autour de la marque.

   ⚠️⚠️ LA DÉCISION EST UNE PURE FONCTION DE L'ÉTAT ET DE SA GRAINE — chacun la calcule, rien ne voyage avant le lancer. C'est ce
   qui donne à TOUS les écrans la même posture pendant que l'habitant réfléchit (accroupi pour pointer, debout pour tirer),
   sans un message de plus (noyau §3 : « ce qui peut se déduire ne se diffuse pas »). La graine : celle de la partie (tirée par
   l'hôte, dans l'état), le numéro du lancer, l'habitant. Le lancer lui-même part de l'hôte, comme celui d'un joueur.
   D'où la règle n°2 de `petanque.js`, tenue ici aussi : `+ − × ÷` et `Math.sqrt` seulement là où l'on compte une position, et
   un générateur entier (`Math.imul`, exact partout) — deux moteurs qui décideraient deux gestes montreraient deux postures.
   `tools/verify-boulo-bot.mjs` lit ce fichier et échoue sur un nom interdit.

   CE QUE CHAQUE NIVEAU SAIT FAIRE (`NIVEAUX`) :
   · `ms` : la précision du lâcher (σ, ms autour de la marque). Le lot 1 mesurait habile 20 / moyen 35 / débutant 60 ; le fort
     est à 26 et pas à 20 — à 20, un joueur plausible moyen ne lui prenait presque aucune partie (le banc le tient) ;
   · `lit` : ce qu'il lit du terrain. 2 : il ESSAIE ses pointés dans la tête (la simulation sans erreur, trois gestes, trois
     lignes) — c'est ainsi qu'il prend le couloir de la piste du platane ou la plombée par-dessus les racines ; 1 : il essaie
     la roulette et la plombée sur la ligne droite ; 0 : il vise au plat, à la roulette, et le relief le dévie ;
   · `tir` : son goût pour le tir quand le tir est le bon coup (une boule adverse collée au but, et la ligne de tir propre) ;
   · `pense` : le temps avant de lancer (ms) — « Gustave prend son temps, Honoré lance en parlant » (verdict « rythme »).
   ========================================================================== */
import * as PT from "./petanque.mjs";
import * as BJ from "./bouloJeu.mjs";

const P = PT.PETANQUE;

export const NIVEAUX = {
  fort:     { ms: 26, lit: 2, tir: 0.85, pointe: 0.30, pense: [4200, 6000] },
  moyen:    { ms: 38, lit: 1, tir: 0.55, pointe: 0.38, pense: [3400, 5000] },
  debutant: { ms: 60, lit: 0, tir: 0.12, pointe: 0.50, pense: [3000, 4200] },
};
/* `pointe` : la distance au but (m) que ce niveau peut espérer en pointant — ce qu'il compare à la boule adverse avant de
   tirer (mesuré au lot 1 : 28 / 35 / 48 cm sur le plat, arrondi vers le haut — on se croit rarement meilleur qu'on n'est). */

/* ── LA GRAINE ET LE TIRAGE (entiers seulement : exacts dans tous les moteurs) ── */
export function graineDe(partie, pid) {
  let h = (partie.graine >>> 0) ^ Math.imul((partie.coups | 0) + 1, 2654435761);
  const s = String(pid);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function tirage(graine) {
  let a = graine >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // une cloche : la somme de six tirages, centrée et réduite (le même gabarit que le joueur simulé du lot 1)
  r.cloche = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) * 1.4142135623730951; };
  return r;
}
/** L'erreur de jauge d'un lâcher à ±σ ms de la marque : l'aiguille parcourt quatre unités par période. */
export function errDe(r, ms, geste) {
  const e = Math.round(r.cloche() * ms * 4 / PT.GESTES[geste].jauge * 1000);
  return e > 1000 ? 1000 : e < -1000 ? -1000 : e;
}

/* ── LA LECTURE D'UNE MÈNE ── */
const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
/** La boule adverse qui tient le point (celle qu'on tirerait), ou null. */
function bouleAdverse(m, camp) {
  let best = null, bd = Infinity;
  for (const q of m.boules) if (!q.mort && q.camp !== camp) { const d = d2(q.x, q.y, m.but.x, m.but.y); if (d < bd) { bd = d; best = q; } }
  return best;
}
/** La ligne de tir est-elle SALE ? Le but juste derrière la boule visée (dans l'axe, à moins de 90 cm au-delà, à moins de 35 cm
    de côté) : tirée, la boule chasserait le cochonnet avec elle. C'est ce qui faisait sortir le but dans 29 % des mènes en
    doublette au lot 1 (le joueur simulé tirait sans regarder). Tous les niveaux la lisent (verdict « jugement »). */
export function ligneSale(m, cible) {
  const cx = m.cercle.x, cy = m.cercle.y;
  let ux = cible.x - cx, uy = cible.y - cy;
  const L = Math.sqrt(ux * ux + uy * uy);
  if (L < 1) return true;
  ux /= L; uy /= L;
  const bx = m.but.x - cible.x, by = m.but.y - cible.y;
  const along = bx * ux + by * uy, cote = bx * uy - by * ux;
  return along > -60 && along < 900 && cote < 350 && cote > -350;
}
/** Ce que vaut une mène pour le camp `camp` (en mètres, plus c'est grand, mieux c'est) : tenir le point et de combien, sinon
    la distance qui reste à rattraper. Un but mort vaut une demi-mène perdue — mieux que de laisser trois points, pire que tout
    le reste (le règlement : mène nulle si plusieurs camps ont encore des boules). */
function valeur(s, camp) {
  const m = s.mene;
  if (!m.but || m.butMort) return -0.8;
  const best = PT.meilleures(s), pt = PT.point(s);
  if (pt.camp === camp) return 0.5 + Math.min(0.6, pt.avance === Infinity ? 0.6 : pt.avance);
  return best[camp] === Infinity ? -1.5 : -Math.sqrt(best[camp]) / 1000;
}
/** Un lancer essayé « dans la tête » : sans erreur, jusqu'au bout. */
function essayer(partie, pid, input) {
  const p = PT.preparer(partie, pid, input);
  if (p.raison || !p.sim) return null;
  PT.simFinir(p.sim);
  return PT.conclure(partie, pid, input, p.sim);
}
/** La donnée (mm) qui arrête une boule `devant` m en deçà du but, sur la ligne cercle → but décalée de `cote` m. */
function viseePointer(m, geste, cote, devant) {
  const cx = m.cercle.x, cy = m.cercle.y;
  let ux = m.but.x - cx, uy = m.but.y - cy;
  const L = Math.sqrt(ux * ux + uy * uy);
  ux /= L; uy /= L;
  const recul = (P.BOULE_R + P.BUT_R + devant) * 1000;
  const cible = { x: Math.round(m.but.x - ux * recul - uy * cote * 1000), y: Math.round(m.but.y - uy * recul + ux * cote * 1000) };
  return BJ.horsCercle(m, BJ.borner(PT.donneePour(geste, m.cercle, cible, m.lourd)));
}

/* ── LA DÉCISION ──
   Rend { geste, donnee, err, pense, quoi } : l'entrée du lancer (avec `coup`), le temps de réflexion, et ce qu'il fait
   (« but », « place », « pointe », « tire ») pour les répliques. `null` si ce n'est pas à `pid` de jouer. */
export function decider(partie, pid, niveau) {
  const N = NIVEAUX[niveau] || NIVEAUX.moyen;
  const s = PT.avancer(partie), q = PT.aQui(s);
  if (!q || !q.joueurs.includes(pid)) return null;
  const m = s.mene, r = tirage(graineDe(partie, pid));
  const pense = Math.round(N.pense[0] + (N.pense[1] - N.pense[0]) * r());
  const out = (quoi, geste, donnee) => ({ quoi, pense, input: { coup: s.coups, geste, donnee, err: geste === "placer" ? 0 : errDe(r, N.ms, geste) } });

  if (q.phase === "placer") return out("place", "placer", BJ.donneeDefaut(m, "placer"));
  if (q.phase === "but") {
    // le but : entre 6,5 et 9 m dans le sens du jeu, un peu de côté (on ne le lance jamais deux fois au même endroit)
    const u = BJ.sensMene(m), d = 6.5 + 2.5 * r(), cote = (r() - 0.5) * 1.2;
    let t = { x: Math.round(m.cercle.x + (u[0] * d - u[1] * cote) * 1000), y: Math.round(m.cercle.y + (u[1] * d + u[0] * cote) * 1000) };
    if (!PT.butValide(m, t.x, t.y)) t = BJ.donneeDefaut(m, "placer");
    return out("but", "but", BJ.horsCercle(m, BJ.borner(PT.donneePour("but", m.cercle, t, m.lourd))));
  }

  const camp = PT.campDe(s, pid);
  // POINTER : les essais selon ce qu'il lit du terrain
  const gestes = N.lit >= 2 ? ["roulette", "demi", "plombee"] : N.lit === 1 ? ["roulette", "plombee"] : ["roulette"];
  const cotes = N.lit >= 2 ? [0, -0.3, 0.3] : [0];
  let pointe = null;
  if (N.lit === 0) {
    pointe = { geste: "roulette", donnee: viseePointer(m, "roulette", 0, 0.1), v: null };
  } else {
    for (const g of gestes) for (const c of cotes) {
      const donnee = viseePointer(m, g, c, 0.1);
      const s2 = essayer(partie, pid, { coup: s.coups, geste: g, donnee, err: 0 });
      if (!s2) continue;
      const v = valeur(s2, camp);
      // à valeur égale (au centimètre), le geste le plus simple : la roulette d'abord, la ligne droite d'abord
      if (!pointe || v > pointe.v + 0.01) pointe = { geste: g, donnee, v };
    }
    if (!pointe) pointe = { geste: "roulette", donnee: viseePointer(m, "roulette", 0, 0.1), v: null };
  }

  // TIRER : seulement quand c'est le bon coup, et jamais par une ligne sale
  const adv = bouleAdverse(m, camp), pt = PT.point(s);
  if (adv && pt.camp >= 0 && pt.camp !== camp) {
    const dAdv = Math.sqrt(d2(adv.x, adv.y, m.but.x, m.but.y)) / 1000;
    const sale = ligneSale(m, adv);
    // la boule adverse est trop bien placée pour qu'il espère pointer devant (son essai le dit, s'il en fait ; sinon son
    // habitude), et il lui reste de quoi jouer après — ou c'est sa dernière chance de sauver la mène
    const pointeTient = pointe.v != null ? pointe.v > 0.05 : N.pointe < dAdv * 0.9;
    const derniere = PT.resteCamp(s, camp) === 1;
    const collee = dAdv < 0.45;
    if (!sale && collee && (!pointeTient || (derniere && pt.avance !== Infinity && pt.avance > 0.25)) && r() < N.tir) {
      const donnee = BJ.horsCercle(m, BJ.borner({ x: adv.x, y: adv.y }));
      return out("tire", "tir", donnee);
    }
  }
  return out("pointe", pointe.geste, pointe.donnee);
}

/** Le geste qu'il va faire (pour sa posture pendant qu'il réfléchit) — la même décision, sans la recalculer à chaque image
    quand l'appelant la garde. */
export const postureDe = (d) => (!d || d.input.geste === "placer" ? 0 : (PT.GESTES[d.input.geste] || {}).posture === "accroupi" ? 1 : 2);
