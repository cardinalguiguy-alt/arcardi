/* =============================================================================
   bouloJeu.js — LE BOULODROME, LOT 3 : JOUER (2026-10-31). PUR — ni React, ni canevas, ni réseau.
   -----------------------------------------------------------------------------
   Les quinze décisions de forme du lot 3 (page https://claude.ai/artifact/TJ9wMuSQqTQfrzqMiuS1YX, docs/PROJETS.md §11) :
   aucun verdict n'y a été posé — un point non touché vaut accord, ce sont les recommandations qui font foi :
   · on OUVRE une partie par E au cercle d'une piste libre (tête-à-tête ou à trois, 13 ou 7 points — 7 par défaut à trois),
     les autres la REJOIGNENT par E au bord de la piste, celui qui a ouvert la LANCE ; une PIÈCE dit qui commence ;
   · un joueur qui quitte la ville (ou que la connexion lâche) met la partie EN PAUSE dix minutes ; au-delà, les autres peuvent
     la clore, sans vainqueur ; on peut abandonner ;
   · seul, une partie d'ENTRAÎNEMENT (mode "solo" de `petanque.js`) : le but, trois boules, pas de points, la meilleure distance ;
   · un FONDU ENCHAÎNÉ de 0,6 s vers le cran ×3, la piste cadrée ; seuls les joueurs passent à ×3 ;
   · les joueurs sont PLACÉS par le jeu, en marchant (le lanceur au cercle, les autres derrière, au bord) ;
   · les commandes, le GUIDE (l'arc, le roulé sur le plat, la boule fantôme ; le relief reste à lire), la JAUGE au-dessus du
     joueur ; les boules d'acier à BANDE de couleur (rouge, bleu, or dans l'ordre d'arrivée), le cochonnet ORANGE ;
   · l'ARDOISE en haut de l'écran et l'ANNEAU de craie autour de la boule qui tient le point ; la fin de mène sur le terrain
     (« +2 »), les boules qui reviennent seules au cercle suivant ; la fin de partie et la REVANCHE.

   ⚠️ CE QUI CIRCULE (noyau §3), et rien d'autre : une requête par geste (ouvrir, rejoindre, quitter, lancer la partie, LANCER
   une boule, revanche, clore), un `apply` par changement qui porte la SESSION (`boulo`) et, pour un lancer, son ENTRÉE
   (`bouloLancer` : `{ k, pid, input, emp }`). Chaque client rejoue le lancer depuis l'état d'avant (`animer`), puis adopte
   l'état de l'hôte et compare l'empreinte (`petanque.js`, ses trois règles de construction). La visée ne voyage pas ; la
   posture (accroupi, debout) part dans le paquet de position qui part déjà. Les échéances (la pause) sont des DURÉES locales
   à l'hôte, diffusées en durée (`bouloT`), jamais une horloge comparée à une autre.
   ⚠️ L'état d'une partie est celui de `petanque.js` : entiers en millimètres, JSON. La session l'enveloppe, en JSON aussi :
   elle voyage dans `sharedRef.boulo` et dans l'instantané (un arrivant voit la partie), PAS dans la sauvegarde rechargée (une
   partie ne survit pas à la fermeture du salon, comme la course de la patinoire).
   ========================================================================== */
import * as PT from "./petanque";
import * as BD from "./boulodrome";

const P = PT.PETANQUE, PX_M = P.PX_M;

export const BJ = {
  COULEURS: ["#c43c2c", "#2f64c8", "#d6a024"],     // rouge, bleu, or — l'ordre d'arrivée dans la partie
  ZOOM: 3,                                         // le cran de la partie (décidé au premier tour : il cadre la piste)
  FONDU_MS: 600,                                   // le fondu enchaîné, à l'aller et au retour
  PAUSE_MS: 10 * 60 * 1000,                        // un joueur parti : la partie l'attend dix minutes
  FIN_MENE_MS: 2000,                               // le « +2 » sur le terrain
  RETOUR_MS: 900,                                  // les boules qui glissent jusqu'au cercle suivant
  FIN_PARTIE_MS: 4500,                             // l'ardoise du vainqueur, avant le fondu du retour
  TENIR_MS: 450,                                   // l'image arrêtée, la dernière boule posée, avant d'adopter l'état
  PROCHE_M: 1.3,                                   // la portée de E autour du cercle (m)
  BORD_M: 1.2,                                     // … et autour de la piste, pour rejoindre (m)
  PAS_M: 0.1,                                      // la donnée au clavier : 10 cm par flèche (×5 avec Maj)
  REVANCHE_MS: 90 * 1000,                          // une partie finie, sans revanche, se ferme
};
/* 2026-11-01 (lot 4) — "dbl", LA DOUBLETTE, n'existe qu'AVEC DES HABITANTS (son verdict : « doublette complétée jusqu'à deux contre
   deux ») : elle s'ouvre en défiant un bouliste (`hoteDefi`), jamais au cercle. Ses équipes sont dans `sess.equipes`. */
export const MODES_JEU = ["tat", "trois", "solo", "dbl"];
export const requis = (mode) => (mode === "trois" ? 3 : mode === "solo" ? 1 : mode === "dbl" ? 4 : 2);
export const cibleDefaut = (mode) => (mode === "trois" || mode === "dbl" ? 7 : 13);   // « 7 par défaut à trois » (lot 2, sa note) ; la doublette dure deux fois plus
/** Un habitant (lot 4) : son identifiant commence par « pnj: » (`petanque.js` l'annonçait). */
export const estHabitant = (id) => typeof id === "string" && id.startsWith("pnj:");

/* ── LE REPÈRE ── (piste en mètres → monde en px d'art ; voir `boulodrome.js`) */
export function versMonde(k, mx, my, out = [0, 0]) { return BD.pisteVersMonde(k, mx, my, out); }
export const mmVersMonde = (k, x, y, out = [0, 0]) => BD.pisteVersMonde(k, x / 1000, y / 1000, out);
/** Un point du monde (px) → la piste `k` (mm, entiers, bornés à la piste). */
export function mondeVersPiste(k, wx, wy) {
  const p = BD.pisteDe(k);
  const x = Math.round(((wy - p.sy) / PX_M) * 1000), y = Math.round(((wx - p.sx) / PX_M) * 1000);
  return { x: Math.max(0, Math.min(P.W * 1000, x)), y: Math.max(0, Math.min(P.L * 1000, y)) };
}
/** Le cercle où l'on OUVRE une partie sur une piste libre : celui de la première mène (`nouvellePartie`). */
export const cercleLibre = () => ({ x: (P.W * 1000) / 2, y: P.CERCLE_Y0 * 1000 });
/** Le cadre de la partie (px du monde) : la piste, ses madriers, la tête des joueurs debout au bord nord. */
export function cadre(k) {
  const p = BD.pisteDe(k), B = BD.BOULO;
  return { x0: p.sx - B.M - 4, y0: p.sy - B.M - 26, x1: p.sx + B.LP + B.M + 4, y1: p.sy + B.WP + B.M + 6,
           cx: p.sx + B.LP / 2, cy: p.sy + B.WP / 2 - 8 };
}

/* ── LA SESSION (l'hôte l'écrit ; tout le monde la lit) ──
   { sid, k, mode, cible, owner, ent: [{ id, name }], etat: "salle" | "jeu" | "fin", partie, pause: null | { qui: [ids] },
     closable, revanches } */
export function nouvelleSession(sid, k, owner, name, mode, cible) {
  const m = MODES_JEU.includes(mode) ? mode : "tat";
  const c = P.CIBLES.includes(cible) ? cible : cibleDefaut(m);
  return { sid, k, mode: m, cible: c, owner, ent: [{ id: owner, name: name || "?" }], etat: "salle", partie: null, pause: null, closable: false, revanches: 0 };
}
export const estDans = (sess, pid) => !!sess && sess.ent.some((e) => e.id === pid);
export const couleurDe = (sess, pid) => {
  // en doublette, la couleur est celle de l'ÉQUIPE : deux partenaires jouent les mêmes boules
  if (sess && sess.mode === "dbl" && sess.equipes) { const c = sess.equipes.findIndex((eq) => eq.includes(pid)); return BJ.COULEURS[c < 0 ? 0 : c]; }
  const i = sess ? sess.ent.findIndex((e) => e.id === pid) : -1; return BJ.COULEURS[i < 0 ? 0 : i % BJ.COULEURS.length];
};
export const nomDe = (sess, pid) => { const e = sess && sess.ent.find((q) => q.id === pid); return e ? e.name : "?"; };
/** La partie se lance : les camps dans l'ordre d'arrivée, la graine tirée par l'hôte (la pièce : `graine % camps` lance le but). */
export function demarrer(sess, graine) {
  const camps = sess.mode === "solo" ? [[sess.ent[0].id]] : sess.mode === "dbl" ? sess.equipes.map((eq) => eq.slice()) : sess.ent.map((e) => [e.id]);
  sess.partie = PT.nouvellePartie({ mode: sess.mode === "dbl" ? "doublette" : sess.mode, cible: sess.cible, camps, graine: graine >>> 0, piste: sess.k });
  sess.etat = "jeu"; sess.pause = null; sess.closable = false;
  return sess;
}
/** Qui a gagné la pièce (l'ouverture de la partie : « X commence »). */
export const piece = (sess) => (sess && sess.partie ? sess.partie.camps[sess.partie.mene.butLanceur].joueurs[0] : null);

/* ── QUI JOUE, OÙ SE TIENT-ON ── */
/** La direction du jeu d'une mène (vecteur unitaire, repère de la piste, m) : vers le but s'il est posé, sinon vers le bout
    le plus loin du cercle. */
export function sensMene(m) {
  if (m.but) {
    let ux = (m.but.x - m.cercle.x) / 1000, uy = (m.but.y - m.cercle.y) / 1000;
    const d = Math.sqrt(ux * ux + uy * uy);
    if (d > 0.01) return [ux / d, uy / d];
  }
  return [0, m.cercle.y < (P.L * 1000) / 2 ? 1 : -1];
}
/** À qui de jouer (`aQui` de la règle), ou null : la partie finie, ou pas encore lancée. */
export function tour(sess) {
  if (!sess || sess.etat !== "jeu" || !sess.partie) return null;
  return PT.aQui(sess.partie);
}
/** QUI lance, dans le camp qui joue (lot 4). La règle laisse jouer n'importe quel joueur du camp qui a encore des boules (`aQui`) ;
    à l'écran il faut UN lanceur, sans quoi deux partenaires viseraient ensemble (et un habitant lancerait pendant que son partenaire
    vise). Celui qui a le plus de boules en main, l'ordre de l'équipe à égalité : en doublette, les partenaires ALTERNENT. Au
    tête-à-tête et à trois, c'est le seul joueur du camp. Rend null si personne. */
export function lanceurDe(partie) {
  const s = PT.avancer(partie), q = PT.aQui(s);
  if (!q || !q.joueurs.length) return null;
  if (q.phase !== "boule" || q.joueurs.length === 1) return q.joueurs[0];
  let best = q.joueurs[0];
  for (const j of q.joueurs) if (s.mene.reste[j] > s.mene.reste[best]) best = j;
  return best;
}
export const lanceur = (sess) => (tour(sess) ? lanceurDe(sess.partie) : null);
export function monTour(sess, pid) { return !!tour(sess) && lanceurDe(sess.partie) === pid && !sess.pause; }
/** Où se tient `pid` (px du monde, le PIED), et vers où il regarde (2 droite, 3 gauche). Le lanceur dans le cercle ; les
    autres derrière lui, au bord de la piste, l'un au nord, l'autre au sud, le troisième un pas plus loin. Recalculé à chaque
    image depuis l'état : entre deux mènes, tout le monde marche jusqu'au cercle suivant sans que rien ne voyage. */
export function placeDe(sess, partie, pid) {
  if (!sess || !partie) return null;
  const s = PT.avancer(partie), m = s.mene, lz = lanceurDe(s), u = sensMene(m);
  const dir = u[1] >= 0 ? 2 : 3;
  const C = [m.cercle.x / 1000, m.cercle.y / 1000];
  let mx, my;
  if (lz === pid) { mx = C[0]; my = C[1]; }
  else {
    const autres = sess.ent.map((e) => e.id).filter((id) => id !== lz);
    const i = Math.max(0, autres.indexOf(pid));
    const recul = i < 2 ? 1.3 : 2.3;
    mx = i % 2 === 0 ? 0.45 : P.W - 0.45;
    my = C[1] - u[1] * recul;
  }
  my = Math.max(0.35, Math.min(P.L - 0.35, my));
  const w = versMonde(sess.k, mx, my);
  return { wx: w[0], wy: w[1], dir };
}

/* ── LE GUIDE DE VISÉE (ce que fait le GESTE sur sol plat ; le relief n'est pas compté) ──
   Rend { main, donnee, arc: [[x, y, z]…] (m, repère de la piste), arret: [x, y] | null } : l'arc du vol de la main à la donnée,
   puis l'arrêt sur le plat (`arretPlat`). Un dessin, pas de la physique : la règle n°2 de `petanque.js` ne s'y applique pas. */
export function guide(m, geste, donnee, lourd = 0) {
  const g = PT.GESTES[geste];
  if (!g || !donnee) return null;
  const cx = m.cercle.x / 1000, cy = m.cercle.y / 1000, Dx = donnee.x / 1000, Dy = donnee.y / 1000;
  let ux = Dx - cx, uy = Dy - cy;
  const dC = Math.sqrt(ux * ux + uy * uy);
  if (dC < P.DONNEE_MIN) return null;
  ux /= dC; uy /= dC;
  const hx = cx + ux * P.BRAS, hy = cy + uy * P.BRAS, d = dC - P.BRAS;
  const vz0 = Math.sqrt(2 * P.G * (g.H - g.h0)), T = vz0 / P.G + Math.sqrt((2 * g.H) / P.G);
  const n = Math.max(6, Math.round(d / 0.32)), arc = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, t = f * T;
    arc.push([hx + ux * d * f, hy + uy * d * f, Math.max(0, g.h0 + vz0 * t - (P.G * t * t) / 2)]);
  }
  const L = geste === "placer" ? 0 : PT.arretPlat(geste, d, lourd);
  return { main: [hx, hy], donnee: [Dx, Dy], arc, arret: geste === "placer" ? null : [hx + ux * L, hy + uy * L] };
}
/** La donnée par défaut à l'ouverture de la visée : celle qui, sur le plat, arrête la boule SUR le but (le tir : le but lui-même) ;
    pour lancer le but, celle qui le pose à 8 m dans le sens du jeu (ou au plus long qui tient : 6 m au moins, 1,5 m du bout) ;
    pour le poser à la main, cet endroit-là. ⚠️ Toujours une donnée que la règle accepte (`verifier`) : à plus de 60 cm du cercle,
    sur la piste — une visée proposée que l'arbitre refuserait serait un jeu qui propose puis refuse. */
export function donneeDefaut(m, geste) {
  const u = sensMene(m), C = m.cercle;
  const loin = (d) => ({ x: C.x + Math.round(u[0] * d * 1000), y: C.y + Math.round(u[1] * d * 1000) });
  if (geste === "but" || geste === "placer" || !m.but) {
    let t = null;
    for (const d of [8, 7.5, 7, 6.5, 6.1]) { const c = loin(d); if (PT.butValide(m, c.x, c.y)) { t = c; break; } }
    if (!t) t = borner(loin(6.5));
    return geste === "placer" ? t : horsCercle(m, borner(PT.donneePour("but", C, t, m.lourd)));
  }
  if (geste === "tir") return horsCercle(m, { x: m.but.x, y: m.but.y });
  return horsCercle(m, borner(PT.donneePour(geste, C, m.but, m.lourd)));
}
export function horsCercle(m, d) {   // exportée au lot 4 : les habitants (`bouloBot.js`) visent sous la même règle
  const dx = d.x - m.cercle.x, dy = d.y - m.cercle.y, L = Math.sqrt(dx * dx + dy * dy), min = (P.DONNEE_MIN + 0.1) * 1000;
  if (L >= min) return d;
  const u = L > 1 ? [dx / L, dy / L] : sensMene(m);
  return borner({ x: m.cercle.x + u[0] * min, y: m.cercle.y + u[1] * min });
}
export function borner(d) {
  return { x: Math.max(0, Math.min(P.W * 1000, Math.round(d.x))), y: Math.max(0, Math.min(P.L * 1000, Math.round(d.y))) };
}

/* ── LE LANCER À L'ÉCRAN ──
   `animer` prépare la simulation depuis l'état d'AVANT (celui que l'hôte a reçu) ; `animPas` l'avance jusqu'à `t` secondes du
   lâcher et rend la place de chaque corps : en vol, la parabole (`volAt`) ; au sol, la simulation à pas fixe (`simPas`), dont
   l'écran interpole les deux derniers pas. Rien de ceci ne décide quoi que ce soit : l'état adopté est celui de l'hôte. */
export function animer(partie, pid, input) {
  const p = PT.preparer(partie, pid, input);
  if (p.raison) return { raison: p.raison };
  return { s0: p.s, sim: p.sim, pid, input, geste: input.geste };
}
export function animPas(a, t, out = []) {
  out.length = 0;
  const sim = a.sim;
  if (!sim) return { fini: true, corps: out };
  const DT = P.DT;
  if (t >= sim.tSol) {
    const n = Math.floor((t - sim.tSol) / DT);
    while (sim.n < n && !sim.fini) PT.simPas(sim);
  }
  // l'écran a un pas de retard (2 ms) : il interpole entre les deux derniers pas calculés, jamais au-delà
  const fr = t >= sim.tSol ? Math.min(1, Math.max(0, (t - sim.tSol) / DT - sim.n)) : 0;
  const im = sim.corps.length - 1;
  for (let i = 0; i < sim.corps.length; i++) {
    const b = sim.corps[i];
    let x, y, z = 0;
    // ⚠️ le premier arc finit à z = 0 (`vol`), le second, celui qui retombe d'un choc au fer, à z = r (le centre posé)
    if (i === im && t < sim.tSol) { const v = PT.volAt(sim.vols[0], t); x = v.x; y = v.y; z = Math.max(0, v.z); }
    else if (t < sim.tSol) { x = b.x0; y = b.y0; }
    else if (b.air > 0 && sim.vols[1]) { const v = PT.volAt(sim.vols[1], sim.tSol + sim.n * DT); x = v.x; y = v.y; z = Math.max(0, v.z - b.r); }
    else { x = b.px + (b.x - b.px) * fr; y = b.py + (b.y - b.py) * fr; }
    out.push({ x, y, z, but: b.but, camp: b.camp, j: b.j, vivant: b.vivant, vol: i === im && t < sim.tSol });
  }
  return { fini: sim.fini && t >= sim.tSol, corps: out };
}
/** L'état que la simulation locale a conclu (pour comparer son empreinte à celle de l'hôte). */
export const conclusion = (partie, a) => PT.conclure(partie, a.pid, a.input, a.sim);

/* ── CE QUI SE LIT ENTRE DEUX LANCERS ── */
/** La boule qui tient le point (pour l'anneau de craie), ou null. */
export function bouleDuPoint(partie) {
  if (!partie || !partie.mene || !partie.mene.but) return null;
  const m = partie.mene, pt = PT.point(partie);
  if (pt.camp < 0) return null;
  let best = null, bd = Infinity;
  for (const q of m.boules) if (!q.mort && q.camp === pt.camp) {
    const dx = q.x - m.but.x, dy = q.y - m.but.y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
/* ── 2026-11-01 (lot 5) — LA MESURE ──
   « Le folklore : la mesure au mètre » (premier tour). On sort le mètre quand le point se joue à moins de 3 cm entre deux camps (ou à
   égalité) — 1,4 px d'art : là où l'œil ne tranche plus. À 5 cm (premier jet), il sortait après 13 % des boules, une fois par mène :
   une corvée de 2,6 s, plus un moment (`verify-boulo-bot` §11) : la boule qui le tient et la meilleure d'en face, mesurées du cochonnet. Rend null, ou { but, a, b } — `a` tient le point
   (à égalité : la première trouvée), chacun { x, y, j, camp, mm } où `mm` est l'écart de BORD À BORD (ce que lit un vrai mètre ; nos
   boules ont le rayon du dessin, voir `petanque.js`), borné à 0. Pure, sur la partie AFFICHÉE : chaque écran la sort au même lancer,
   rien ne voyage. */
export const MESURE_MM = 30;
export function aMesurer(partie) {
  const m = partie && partie.mene;
  if (!m || !m.but || m.butMort) return null;
  const best = [];   // par camp : la boule vivante la plus proche
  for (const q of m.boules) {
    if (q.mort) continue;
    const dx = q.x - m.but.x, dy = q.y - m.but.y, d2 = dx * dx + dy * dy;
    if (!best[q.camp] || d2 < best[q.camp].d2) best[q.camp] = { q, d2 };
  }
  const tri = best.filter(Boolean).sort((u, v) => u.d2 - v.d2);
  if (tri.length < 2) return null;
  const da = Math.sqrt(tri[0].d2), db = Math.sqrt(tri[1].d2);
  if (db - da >= MESURE_MM) return null;
  const bord = Math.round((P.BOULE_R + P.BUT_R) * 1000);
  const fiche = (t, d) => ({ x: t.q.x, y: t.q.y, j: t.q.j, camp: t.q.camp, mm: Math.max(0, Math.round(d) - bord) });
  return { but: { x: m.but.x, y: m.but.y }, a: fiche(tri[0], da), b: fiche(tri[1], db) };
}
/** Une cote lisible : « 12 cm », et au millimètre quand deux cotes tiennent dans le même centimètre (« 12,4 cm » ; `sep` : la virgule
    ou le point décimal de la langue). */
export function cote(mm, fin, sep = ",") { return fin ? (Math.round(mm) / 10).toFixed(1).replace(".", sep) + " cm" : Math.round(mm / 10) + " cm"; }

/** Les boules qui marquent, à la fin d'une mène (la règle de `compter`) : pour poser le « +n » à côté. */
export function quiMarque(partie) {
  const m = partie && partie.mene;
  if (!m || !m.fini || m.fini.nulle) return { camp: -1, points: 0, boules: [] };
  if (m.fini.raison === "but-mort") return { camp: m.fini.gagnant, points: m.fini.points, boules: [] };
  const best = PT.meilleures(partie);
  let second = Infinity;
  for (let c = 0; c < best.length; c++) if (c !== m.fini.gagnant && best[c] < second) second = best[c];
  const boules = m.boules.filter((q) => {
    if (q.mort || q.camp !== m.fini.gagnant) return false;
    const dx = q.x - m.but.x, dy = q.y - m.but.y;
    return dx * dx + dy * dy < second;
  });
  return { camp: m.fini.gagnant, points: m.fini.points, boules };
}
/** L'ardoise : les camps (nom, couleur, score, boules en main), la mène, qui joue ; l'entraînement : la meilleure distance. */
export function ardoise(sess, partie, moi, finie = false) {
  if (!sess) return null;
  const s = partie ? PT.avancer(partie) : null, q = s ? PT.aQui(s) : null;
  // `finie` : l'écran montre encore la mène qui vient de finir (le « +n ») — son numéro et sa meilleure boule, pas la suivante
  const src = finie && partie ? partie : s;
  const camps = (s ? s.camps : sess.ent.map((e) => ({ joueurs: [e.id], score: 0 }))).map((c) => ({
    joueurs: c.joueurs.map((j) => ({ id: j, nom: nomDe(sess, j), col: couleurDe(sess, j), reste: s ? s.mene.reste[j] | 0 : 0, moi: j === moi })),
    score: c.score,
  }));
  let meilleure = null;
  if (src && sess.mode === "solo" && src.mene.but) {   // la mène AFFICHÉE (une mène finie cède la place à la suivante, vide)
    const b = PT.meilleures(src)[0];
    if (b !== Infinity) meilleure = Math.round(Math.sqrt(b) / 10);   // cm
  }
  return { mode: sess.mode, cible: sess.cible, mene: src ? src.mene.n : 0, camps, gagnant: s ? s.gagnant : null, fanny: s ? s.fanny : false,
           joue: q ? lanceurDe(s) : null, phase: q ? q.phase : null, moi: !!q && lanceurDe(s) === moi, meilleure, pause: sess.pause };
}

/* ── L'HÔTE ──
   `sessions` : { a: session | null, b: session | null } (l'état partagé). Chaque fonction rend la raison d'un refus (une clé de
   message pour le toast du demandeur), ou null. Aucune n'écrit le réseau : l'appelant diffuse ce qui a changé. */
export function hoteOuvrir(sessions, sid, k, pid, name, mode, cible) {
  if (!BD.pisteDe(k)) return "bouloNoPiste";
  for (const kk of ["a", "b"]) if (estDans(sessions[kk], pid) && sessions[kk].etat !== "fin") return "bouloAlready";
  const cur = sessions[k];
  if (cur && cur.etat !== "fin") return "bouloBusy";
  sessions[k] = nouvelleSession(sid, k, pid, name, mode, cible);
  if (sessions[k].mode === "solo") demarrer(sessions[k], sid * 2654435761);
  return null;
}
export function hoteRejoindre(sessions, k, pid, name) {
  const s = sessions[k];
  if (!s || s.etat !== "salle") return "bouloNotOpen";
  if (estDans(s, pid)) return null;
  for (const kk of ["a", "b"]) if (kk !== k && estDans(sessions[kk], pid) && sessions[kk].etat !== "fin") return "bouloAlready";
  /* 2026-11-01 (lot 4) — LA DOUBLETTE AVEC DES HABITANTS est toujours au complet : un joueur qui la rejoint PREND LA PLACE d'un
     habitant — celle du partenaire de celui qui a ouvert d'abord (« à deux : ensemble contre deux habitants »), sinon une place en face
     (« ou chacun avec un habitant »). L'habitant remplacé retourne au banc : il n'est plus dans la session, c'est tout. */
  if (s.mode === "dbl" && s.equipes) {
    const own = s.equipes.findIndex((eq) => eq.includes(s.owner));
    const order = [own, 1 - own];
    for (const c of order) {
      const h = s.equipes[c].find((id) => estHabitant(id));
      if (!h) continue;
      s.equipes[c] = s.equipes[c].map((id) => (id === h ? pid : id));
      s.ent = s.ent.map((e) => (e.id === h ? { id: pid, name: name || "?" } : e));
      return null;
    }
    return "bouloFull";
  }
  if (s.ent.length >= requis(s.mode)) return "bouloFull";
  s.ent.push({ id: pid, name: name || "?" });
  return null;
}
/* ── 2026-11-01 (lot 4) : LES PARTIES AVEC LES HABITANTS ──
   `habs` : [{ id, name }] — les boulistes libres que l'hôte a choisis (le défié d'abord). Au TÊTE-À-TÊTE, la partie démarre aussitôt
   (le défi est l'invitation) ; en DOUBLETTE, elle attend dans la salle, au complet — un autre joueur peut prendre la place du partenaire
   (`hoteRejoindre`) avant que celui qui a défié la lance (`hoteLancerPartie`). */
export function hoteDefi(sessions, sid, k, pid, name, habs, mode, cible, graine) {
  if (!BD.pisteDe(k)) return "bouloNoPiste";
  for (const kk of ["a", "b"]) if (estDans(sessions[kk], pid) && sessions[kk].etat !== "fin") return "bouloAlready";
  const cur = sessions[k];
  if (cur && cur.etat !== "fin") return "bouloBusy";
  const m = mode === "dbl" ? "dbl" : "tat";
  if (!habs || habs.length < (m === "dbl" ? 3 : 1)) return "bouloHabBusy";
  const c = P.CIBLES.includes(cible) ? cible : cibleDefaut(m);
  const s = { sid, k, mode: m, cible: c, owner: pid, ent: [{ id: pid, name: name || "?" }], etat: "salle", partie: null, pause: null, closable: false, revanches: 0, habs: true };
  if (m === "tat") { s.ent.push({ id: habs[0].id, name: habs[0].name }); sessions[k] = s; demarrer(s, graine); return null; }
  for (const h of habs.slice(0, 3)) s.ent.push({ id: h.id, name: h.name });
  s.equipes = [[pid, habs[0].id], [habs[1].id, habs[2].id]];
  sessions[k] = s;
  return null;
}
/** La partie du CLUB : deux habitants, en 7, lancée aussitôt (le troisième attend sur le banc). Son « propriétaire » est le club. */
export function hoteClub(sessions, sid, k, a, b, cible, graine) {
  const cur = sessions[k];
  if (cur && cur.etat !== "fin") return "bouloBusy";
  const s = { sid, k, mode: "tat", cible, owner: "pnj:club", ent: [{ id: a.id, name: a.name }, { id: b.id, name: b.name }], etat: "salle",
              partie: null, pause: null, closable: false, revanches: 0, habs: true, club: true };
  sessions[k] = s;
  demarrer(s, graine);
  return null;
}
/** Les habitants pris par une partie (le club compris, ou non). */
export function habitantsOccupes(sessions, avecClub = true) {
  const out = new Set();
  for (const k of ["a", "b"]) {
    const s = sessions[k];
    // une partie finie garde ses habitants le temps de la revanche ; celle du club se range, elle
    if (!s || (s.club && s.etat === "fin") || (!avecClub && s.club)) continue;
    for (const e of s.ent) if (estHabitant(e.id)) out.add(e.id);
  }
  return out;
}
/** Quitter la salle, ou abandonner une partie (sans vainqueur), ou fermer une partie finie : la session disparaît si c'est
    celui qui l'a ouverte, ou si la partie était lancée (on ne joue pas à trois avec deux camps). */
export function hoteQuitter(sessions, k, pid, remplacant = null) {
  const s = sessions[k];
  if (!s || !estDans(s, pid)) return "bouloNotIn";
  // lot 4 : la doublette avec habitants reste au complet — un habitant libre reprend la place de celui qui s'en va
  if (s.etat === "salle" && pid !== s.owner && s.mode === "dbl" && s.equipes && remplacant) {
    s.equipes = s.equipes.map((eq) => eq.map((id) => (id === pid ? remplacant.id : id)));
    s.ent = s.ent.map((e) => (e.id === pid ? { id: remplacant.id, name: remplacant.name } : e));
    return null;
  }
  if (s.etat === "salle" && pid !== s.owner && s.mode !== "dbl") { s.ent = s.ent.filter((e) => e.id !== pid); return null; }
  sessions[k] = null;
  return null;
}
export function hoteLancerPartie(sessions, k, pid, graine) {
  const s = sessions[k];
  if (!s || s.etat !== "salle") return "bouloNotOpen";
  if (pid !== s.owner) return "bouloNotOwner";
  if (s.ent.length !== requis(s.mode)) return "bouloWaiting";
  demarrer(s, graine);
  return null;
}
export function hoteRevanche(sessions, k, pid, graine) {
  const s = sessions[k];
  if (!s || s.etat !== "fin" || !estDans(s, pid)) return "bouloNotOpen";
  s.revanches = (s.revanches | 0) + 1;
  demarrer(s, graine);
  return null;
}
/** Un lancer : `{ s }` (la session à jour) ou `{ raison }`. `lourd` : la lecture de l'hôte, mise dans l'entrée du but. */
export function hoteLancer(sessions, k, pid, req, lourd) {
  const s = sessions[k];
  if (!s || s.etat !== "jeu" || !s.partie) return { raison: "bouloNotOpen" };
  if (s.pause) return { raison: "bouloPaused" };
  const input = { coup: req.coup | 0, geste: req.geste, donnee: req.donnee && { x: req.donnee.x | 0, y: req.donnee.y | 0 }, err: req.err | 0 };
  if (input.geste === "but") input.lourd = Math.max(0, Math.min(P.LOURD.length - 1, lourd | 0));
  const r = PT.jouer(s.partie, pid, input);
  if (r.raison) return { raison: "bouloRefused", detail: r.raison };
  s.partie = r.s;
  if (s.partie.gagnant !== null) s.etat = "fin";
  return { s, input, emp: PT.empreinte(r.s) };
}
/** Les présents (ceux qui sont en ville) → la pause : qui manque. Rend vrai si la session a changé. */
export function hotePresence(sess, present) {
  if (!sess || sess.etat !== "jeu") return false;
  const qui = sess.ent.map((e) => e.id).filter((id) => !present(id));
  const was = sess.pause ? sess.pause.qui.join(",") : "";
  if (qui.join(",") === was) return false;
  sess.pause = qui.length ? { qui } : null;
  if (!qui.length) sess.closable = false;
  return true;
}
