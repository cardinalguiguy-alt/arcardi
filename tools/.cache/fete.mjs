/* =============================================================================
   fete.js — LA FÊTE DU NAVIRE (2026-11-08), PUR : LE RENDEZ-VOUS, LA CÉRÉMONIE, LA FOULE.
   -----------------------------------------------------------------------------
   Autorité : QUETE.md, « AUTORITÉ 2026-11-08 — LA FIN (G9 + G10 + G11) ». En une phrase : le maire fixe la fête au soir,
   l'équipe du chantier de la place pare le quai, la foule arrive à pied, puis une cérémonie d'environ cinq minutes — la cloche,
   la fanfare, le discours, le NOM voté par les joueurs, la bouteille, et selon le nom : les vivats, ou la contestation, le vote
   « écouter / maintenir », l'orage et le naufrage (3 fois sur 4) ou le navire qui tient ; puis le départ, le plan de nuit où les
   sept étoiles dessinent la Brebis, et le retour du navire qui jette l'ancre dans la baie, pour toujours.

   ⚠️⚠️ CE FICHIER NE DESSINE RIEN ET NE SAIT RIEN DU RÉSEAU. L'hôte écrit QUELQUES DATES dans `e.finale` (le rendez-vous, le
   signal, la clôture de chaque vote, le « Recommencer ») ; tout le reste — où est le navire, qui parle, où se tient chaque
   personne de la foule, ce que fait la caméra, quand tombe la foudre — est une PURE FONCTION DE CES DATES ET DE L'INSTANT.
   Chaque client la calcule seul : tout le monde voit la même scène à la même seconde, et pas un message ne part pour elle (§3).
   C'est la discipline du chantier de la place (`chantier.js`), dont l'équipe est d'ailleurs réutilisée ici.
   ⚠️ L'INSTANT EST CELUI DE L'HÔTE : l'appelant passe `Date.now()` corrigé du décalage d'horloge relevé à la réception
   (`hostNow`, le patron de `brewingUntil`). Jamais une horloge d'invité comparée telle quelle à une date d'hôte.
   ⚠️ AUCUN `Math.random` : les tirages (le pile ou face, le naufrage) sont faits UNE FOIS par l'hôte et écrits ; ce qui doit
   varier sans être tiré (les fusées, les répliques de la foule) se dérive d'un indice.
   `tools/verify-fete.mjs` joue la cérémonie : l'ordre des phases, les trois chemins (le bon nom, la foule écoutée, le naufrage
   puis « Recommencer », le quart qui passe), le rendez-vous au soir, les votes, la foule placée sur des cases libres.
   ========================================================================== */
import * as C from "./fermeConstants.mjs";

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 1. LES NOMS — trois, votés. « La Belle Étoile » ne se traduit jamais (règle de Guillaume) ; les deux autres sont des
   ║    blagues, et une blague se traduit (décision C1).
   ╚════════════════════════════════════════════════════════════════════════════ */
export function feteNames(lang) { return (lang === "en" ? C.STAR_SHIP_NAMES_EN : C.STAR_SHIP_NAMES_FR).slice(); }
export const FETE_GOOD_NAME = 0;   // l'indice de « La Belle Étoile »

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2. LE RENDEZ-VOUS — « il faut un rdv pour la fête, pas que ça s'enchaîne trop vite » (Guillaume, B2) ; le soir (B5).
   ╚════════════════════════════════════════════════════════════════════════════
   Le maire fixe l'heure à l'entretien : la tombée de la nuit (`duskStart` de la saison + une demi-heure), au plus tôt
   `LEAD_MS` après l'accord (le temps de parer le quai) ; trop tard ce soir (au-delà de `LATEST_MIN`), c'est demain soir.
   ⚠️ UNE MINUTE DE JEU DURE `DAY_REAL_MS / (DAY_END_MIN − DAY_START_MIN)` = 0,8 s : les trois minutes de préparation
   couvrent près de quatre heures de jeu. Le calcul se fait en minutes de jeu, l'heure rendue est une date réelle. */
export const FETE = {
  LEAD_MS: 3 * 60 * 1000,       // au plus tôt trois minutes réelles après l'accord
  PREP_MS: 150 * 1000,          // l'équipe pare le quai pendant les deux minutes et demie qui précèdent
  GATHER_MS: 135 * 1000,        // la foule descend du train et marche jusqu'au quai pendant les deux dernières minutes et quart
  DUSK_PLUS_MIN: 30,            // l'heure : la tombée de la nuit + une demi-heure (les lampions viennent de s'allumer)
  LATEST_MIN: 22 * 60 + 30,     // au-delà, la fête est pour demain soir
  WALK_V: 2.0,                  // cases/s, la marche d'un habitant (`C.VISITOR_SPEED` est un pas de joueur pressé)
  GATHER_R: C.STAR_FINALE_GATHER_R,
};
const MIN_MS = () => C.DAY_REAL_MS / (C.DAY_END_MIN - C.DAY_START_MIN);
export function gameMinAt(dayStartAt, ms) {
  return C.DAY_START_MIN + Math.min(1, Math.max(0, (ms - dayStartAt) / C.DAY_REAL_MS)) * (C.DAY_END_MIN - C.DAY_START_MIN);
}
/* L'heure de la fête (date réelle). `duskStart` : la minute de jeu où le soir commence (`skyBoundsOf(...).duskStart`). */
export function feteScheduleAt(agreedAt, dayStartAt, duskStart) {
  const want = Math.max(17 * 60, Math.min(21 * 60, (duskStart | 0) || 19 * 60)) + FETE.DUSK_PLUS_MIN;
  const lead = agreedAt + FETE.LEAD_MS;
  const gmLead = gameMinAt(dayStartAt, lead);
  const dayEnd = dayStartAt + C.DAY_REAL_MS;
  if (lead < dayEnd && gmLead <= FETE.LATEST_MIN) {
    const atWant = dayStartAt + (want - C.DAY_START_MIN) * MIN_MS();
    return Math.round(Math.max(lead, atWant));
  }
  // demain soir : le jour suivant commence quand celui-ci s'achève (`DAY_REAL_MS`, le battement de l'hôte)
  let next = dayEnd;
  while (next + (want - C.DAY_START_MIN) * MIN_MS() < lead) next += C.DAY_REAL_MS;
  return Math.round(next + (want - C.DAY_START_MIN) * MIN_MS());
}
/* L'heure affichée (« 19 h 30 ») : la minute de jeu de la fête, arrondie au quart d'heure. */
export function feteClockLabel(fin, dayStartAt) {
  if (!fin || !fin.feteAt) return null;
  let m = gameMinAt(dayStartAt, fin.feteAt);
  if (fin.feteAt >= dayStartAt + C.DAY_REAL_MS) m = C.DAY_START_MIN + ((fin.feteAt - dayStartAt - C.DAY_REAL_MS) / MIN_MS()) % (C.DAY_END_MIN - C.DAY_START_MIN);
  m = Math.round(m / 15) * 15;
  return { h: Math.floor(m / 60) % 24, m: m % 60, tomorrow: fin.feteAt >= dayStartAt + C.DAY_REAL_MS };
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 3. LA CHRONOLOGIE DE LA CÉRÉMONIE — en secondes depuis le signal (`startAt`), puis depuis chaque décision.
   ╚════════════════════════════════════════════════════════════════════════════
   Le bon chemin dure environ quatre minutes, la contestation y ajoute la sienne, l'orage encore une (F3 : « environ cinq »).
   ⚠️ CHAQUE NOMBRE EST UNE DURÉE DE MISE EN SCÈNE, réglée en regardant : il vit ICI et nulle part ailleurs — le dessin, la
   caméra, le son et le banc lisent `feteTimeline`, jamais une seconde recopiée. */
export const SEQ = {
  BELL: 8,              // trois coups de la cloche du navire, la fanfare attaque
  DANCE: 26,            // la fanfare, la foule danse ; la caméra parcourt le quai
  SPEECH: 32,           // cinq phrases du maire, 6,4 s chacune
  SPEECH_LINE: 6.4,
  VOTE_MAX: 25,         // le vote du nom (clos plus tôt si tout le monde a voté)
  DRAW: 4.5,            // égalité : le maire tire au sort
  ANNOUNCE: 5,          // « Je te baptise… »
  BOTTLE_WIN: 10,       // E : briser la bouteille (sinon le maire s'en charge)
  SMASH: 3.2,           // la bouteille vole, éclate, le nom se peint
  CHEER: 7,
  CONTEST: 17,          // la foule conteste
  VERDICT_MAX: 25,      // le vote « écouter / maintenir »
  RENAME: 9,            // la foule écoutée : le nom repeint
  // « maintenir » (depuis la clôture du vote) :
  LEAVE: 12,            // la foule s'en va
  SLIDE0: 2, SLIDE1: 9, // le maire fait mettre à l'eau quand même
  STORM0: 8, STORM1: 18,// l'orage monte en dix secondes
  BOLT: 21,             // la foudre
  SINK: 8,              // le naufrage
  CLEAR0: 30, CLEAR1: 46,
  RETRY_AFTER: 34,      // « Recommencer » apparaît
  REFLOAT: 6, HAUL: 5, BACK: 14,   // après « Recommencer » : le navire remonte, est halé sur la cale, la foule revient
  PASS_CLEAR0: 24, PASS_CLEAR1: 40, PASS_BACK0: 25, PASS_BACK1: 40, PASS_DEPART: 43,
  DEPART: 66,           // le départ : amarres, mise à l'eau, virement, au large ; le feu d'artifice
  NIGHT: 60,            // le plan de nuit : la Brebis
  RETURN: 32,           // le navire revient jeter l'ancre
};
const SPEECH_N = 5;

/* La chronologie de TOUT ce qui est déjà décidé : une liste de segments `{ k, t0, t1, ...}` aux dates absolues, et ce qui
   attend (`open` : le vote ouvert, le bouton « Recommencer »). Lue par `feteStateAt`, le banc et l'hôte (qui y lit quand clore
   un vote ou écrire la fin). `fin` = `e.finale`. */
export function feteTimeline(fin) {
  if (!fin || !fin.startAt) return null;
  const s = fin.startAt, segs = [];
  const seg = (k, t0, dur, x) => { const o = { k, t0, t1: t0 + dur * 1000, ...(x || {}) }; segs.push(o); return o.t1; };
  let t = s;
  t = seg("bell", t, SEQ.BELL);
  t = seg("dance", t, SEQ.DANCE);
  t = seg("speech", t, SEQ.SPEECH);
  const out = { s, segs, open: null, end: 0, depart: 0, name: null, wreck: false };
  // le vote du nom
  const nm = fin.name;
  if (!nm || !nm.at) { segs.push({ k: "voteName", t0: t, t1: t + SEQ.VOTE_MAX * 1000 }); out.open = { kind: "name", round: "name", t0: t, deadline: t + SEQ.VOTE_MAX * 1000 }; return out; }
  seg("voteName", t, Math.max(0, (nm.at - t) / 1000));
  t = Math.max(t, nm.at);
  out.name = nm.k | 0;
  if (nm.draw) t = seg("draw", t, SEQ.DRAW);
  t = seg("announce", t, SEQ.ANNOUNCE, { name: out.name });
  const bDeadline = t + SEQ.BOTTLE_WIN * 1000;
  const bAt = fin.bottleAt && fin.bottleAt >= t ? Math.min(fin.bottleAt, bDeadline) : null;
  segs.push({ k: "bottle", t0: t, t1: bAt || bDeadline, by: bAt ? "player" : "mayor" });
  t = bAt || bDeadline;
  t = seg("smash", t, SEQ.SMASH, { name: out.name });
  let afloat = false, curName = out.name;
  if (curName === FETE_GOOD_NAME) {
    t = seg("cheer", t, SEQ.CHEER, { name: curName });
  } else {
    /* La contestation, puis autant de manches que de « Recommencer ». */
    const rounds = Array.isArray(fin.rounds) ? fin.rounds : [];
    for (let i = 0; ; i++) {
      t = seg("contest", t, SEQ.CONTEST, { round: i, name: curName });
      const r = rounds[i];
      if (!r || !r.at) { segs.push({ k: "voteVerdict", t0: t, t1: t + SEQ.VERDICT_MAX * 1000, round: i }); out.open = { kind: "verdict", round: "c" + i, t0: t, deadline: t + SEQ.VERDICT_MAX * 1000 }; return out; }
      seg("voteVerdict", t, Math.max(0, (r.at - t) / 1000), { round: i });
      t = Math.max(t, r.at);
      if (r.verdict !== "keep") { t = seg("rename", t, SEQ.RENAME, { from: curName }); curName = FETE_GOOD_NAME; break; }
      const k = t;
      // « keep » : le segment principal du chemin de l'orage (jusqu'à l'épave, ou jusqu'au départ si le navire tient)
      segs.push({ k: "keep", t0: k, t1: k + (r.roll === "sink" ? SEQ.BOLT + 0.4 + SEQ.SINK : SEQ.PASS_DEPART) * 1000, roll: r.roll, round: i });
      segs.push({ k: "leave", t0: k, t1: k + SEQ.LEAVE * 1000 });
      segs.push({ k: "slide", t0: k + SEQ.SLIDE0 * 1000, t1: k + SEQ.SLIDE1 * 1000 });
      segs.push({ k: "storm", t0: k + SEQ.STORM0 * 1000, t1: k + (r.roll === "sink" ? SEQ.CLEAR1 : SEQ.PASS_CLEAR1) * 1000, roll: r.roll });
      segs.push({ k: "bolt", t0: k + SEQ.BOLT * 1000, t1: k + (SEQ.BOLT + 0.5) * 1000, roll: r.roll });
      if (r.roll === "sink") {
        segs.push({ k: "sink", t0: k + (SEQ.BOLT + 0.4) * 1000, t1: k + (SEQ.BOLT + 0.4 + SEQ.SINK) * 1000 });
        const retryFrom = k + SEQ.RETRY_AFTER * 1000;
        if (!r.retryAt || r.retryAt < retryFrom) {
          segs.push({ k: "wreck", t0: k + (SEQ.BOLT + 0.4 + SEQ.SINK) * 1000, t1: Infinity });
          out.open = { kind: "retry", round: "r" + i, t0: retryFrom, deadline: Infinity };
          out.wreck = true;
          return out;
        }
        const rr = r.retryAt;
        segs.push({ k: "wreck", t0: k + (SEQ.BOLT + 0.4 + SEQ.SINK) * 1000, t1: rr });
        segs.push({ k: "refloat", t0: rr, t1: rr + SEQ.REFLOAT * 1000 });
        segs.push({ k: "haul", t0: rr + SEQ.REFLOAT * 1000, t1: rr + (SEQ.REFLOAT + SEQ.HAUL) * 1000 });
        segs.push({ k: "back", t0: rr + 2000, t1: rr + (2 + SEQ.BACK) * 1000 });
        t = rr + (2 + SEQ.BACK) * 1000;
        continue;
      }
      segs.push({ k: "miss", t0: k + SEQ.BOLT * 1000, t1: k + (SEQ.BOLT + 3) * 1000 });
      segs.push({ k: "back", t0: k + SEQ.PASS_BACK0 * 1000, t1: k + SEQ.PASS_BACK1 * 1000, sheepish: true });
      t = k + SEQ.PASS_DEPART * 1000;
      afloat = true;
      break;
    }
  }
  out.depart = t; out.finalName = curName; out.afloat = afloat;
  t = seg("depart", t, SEQ.DEPART, { afloat, name: curName });
  t = seg("night", t, SEQ.NIGHT, { name: curName });
  t = seg("return", t, SEQ.RETURN, { name: curName });
  out.end = t;
  return out;
}
const FX_SEGS = new Set(["storm", "bolt", "leave", "slide", "miss", "sink"]);
const at = (tl, k, t) => { for (const g of tl.segs) if (g.k === k && t >= g.t0 && t < g.t1) return g; return null; };
const last = (tl, k, t) => { let r = null; for (const g of tl.segs) if (g.k === k && g.t0 <= t) r = g; return r; };
const clamp01 = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
export const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
const kOf = (g, t) => (g ? clamp01((t - g.t0) / Math.max(1, g.t1 - g.t0)) : 0);

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 4. LE NAVIRE — où il est, comment il flotte, à chaque instant.
   ╚════════════════════════════════════════════════════════════════════════════
   En cases de la ville : `x`, `y` = le point d'ancrage du dessin (le milieu de la quille, comme `(shipX + 0.5, shipY + 1)`
   sur la cale). `face` : 1 = la proue à l'est (le sens dessiné), −1 = à l'ouest ; entre les deux, le virement (le dessin se
   pince puis se retourne : c'est ainsi qu'un profil vire en 2D). `afloat` : sans ber, la quille dans l'eau ; `sink` 0..1 :
   la part du navire sous la ligne d'eau (≈ 0,06 à flot, 1 = seuls les mâts dépassent) ; `rock` : le gain du tangage ;
   `sail` : "set" (voiles dehors) | "furled" (ferlées) ; `fire` 0..1 : le feu au grand mât après la foudre. */
export const SHIP_AFLOAT_DY = 2.5;   // la quille à deux cases et demie dans l'eau après la mise à l'eau
export const SHIP_AFLOAT_DX = -1;
export const ANCHOR = { dx: -17, y: 163.5 };   // le mouillage, dans la baie, devant l'aile ouest de la foule (relatif à la cale en x)
export function feteShipAt(tl, t, slip) {
  const base = { x: slip.x, y: slip.y, face: 1, afloat: false, sink: 0, rock: 1, sail: "set", fire: 0, onSlip: true, hidden: false };
  if (!tl) return base;
  const launched = { x: slip.x + SHIP_AFLOAT_DX, y: slip.y + SHIP_AFLOAT_DY };
  const p = { ...base };
  const slideTo = (k) => { const e = smooth(k); p.x = slip.x + (launched.x - slip.x) * e; p.y = slip.y + (launched.y - slip.y) * e; p.afloat = k > 0.55; p.onSlip = k < 0.05; p.sink = p.afloat ? 0.06 * smooth((k - 0.55) / 0.45) : 0; };
  // l'orage (maintenir) : la mise à l'eau sans fête, le tangage, l'eau embarquée, le naufrage
  const sl = last(tl, "slide", t);
  if (sl && t >= sl.t0) slideTo(kOf(sl, t));
  const st = last(tl, "storm", t);
  if (st && t >= st.t0 && t < st.t1) { const kk = stormK(tl, t); p.rock = 1 + 4.5 * kk; p.sink = Math.max(p.sink, 0.06 + 0.12 * smooth((t - st.t0 - 4000) / 9000)); }
  const sk = last(tl, "sink", t);
  if (sk && t >= sk.t0) {
    const k = kOf(sk, t), wr = last(tl, "wreck", t), rf = last(tl, "refloat", t);
    p.sink = 0.18 + 0.82 * (k * k);
    p.fire = t < sk.t0 + 6000 ? 1 - (t - sk.t0) / 6000 : 0;
    p.rock = 1 + 2.5 * (1 - k);
    if (rf && t >= rf.t0) {
      const kr = kOf(rf, t); p.sink = 1 - 0.94 * smooth(kr); p.rock = 1.4; p.fire = 0;
      const ha = last(tl, "haul", t);
      if (ha && t >= ha.t0) { const kh = kOf(ha, t); slideTo(1 - kh); p.rock = 1; }
    } else if (wr && t >= wr.t0) p.rock = 0.4;
  }
  // le départ
  const dp = last(tl, "depart", t);
  if (dp && t >= dp.t0) {
    const u = (t - dp.t0) / 1000;
    if (!dp.afloat) { if (u >= 5) slideTo(clamp01((u - 5) / 7)); }
    else { p.x = launched.x; p.y = launched.y; p.afloat = true; p.onSlip = false; p.sink = 0.06; }
    p.rock = 1;
    const turn0 = dp.afloat ? 3 : 12;
    if (u >= turn0) {
      const kt = clamp01((u - turn0) / 2.5);
      p.face = Math.cos(Math.PI * smooth(kt));        // 1 → −1 : il vire vers l'ouest, le large
      if (u >= turn0 + 2.5) {
        // au large : il prend de l'erre (une demi-parabole), jusqu'à quitter le cadre par l'ouest
        const tt = u - turn0 - 2.5;
        p.x = launched.x - (0.045 * tt * tt + 0.25 * tt);
      }
    }
    if (u > SEQ.DEPART - 2) p.hidden = p.x < slip.x - 40;
  }
  const ni = last(tl, "night", t);
  if (ni && t >= ni.t0) { p.hidden = true; }
  const re = last(tl, "return", t);
  if (re && t >= re.t0) {
    // le retour : il entre par l'ouest, la proue à l'est, et file jusqu'au mouillage en ralentissant ; l'ancre tombe à 22,5 s
    const u = (t - re.t0) / 1000, ax = slip.x + ANCHOR.dx, k = clamp01(u / 22);
    p.hidden = false; p.afloat = true; p.onSlip = false; p.sink = 0.06; p.face = 1; p.rock = 1;
    p.x = ax - 26 * (1 - k) * (1 - k); p.y = ANCHOR.y;
    p.sail = u > 23 ? "furled" : "set";
  }
  return p;
}
/* Le navire une fois la fête finie : au mouillage, voiles ferlées, pour toujours (F1). */
export function feteShipAnchored(slip) { return { x: slip.x + ANCHOR.dx, y: ANCHOR.y, face: 1, afloat: true, sink: 0.06, rock: 1, sail: "furled", fire: 0, onSlip: false, hidden: false }; }

/* L'orage de scène (D4) : 0..1, il monte en dix secondes, se dissipe en seize. `bolt` : la foudre (0..1 pendant son éclair). */
export function stormK(tl, t) {
  if (!tl) return 0;
  const st = last(tl, "storm", t);
  if (!st || t < st.t0 || t >= st.t1) return 0;
  const up = smooth((t - st.t0) / ((SEQ.STORM1 - SEQ.STORM0) * 1000));
  const c0 = st.t1 - (st.roll === "sink" ? (SEQ.CLEAR1 - SEQ.CLEAR0) : (SEQ.PASS_CLEAR1 - SEQ.PASS_CLEAR0)) * 1000;
  const down = 1 - smooth((t - c0) / (st.t1 - c0));
  return Math.min(up, down);
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 5. L'ÉTAT À L'INSTANT — ce que lisent le dessin, la caméra, le son et l'interface.
   ╚════════════════════════════════════════════════════════════════════════════ */
export function feteStateAt(fin, t, slip) {
  const out = { pre: null, tl: null, seg: null, k: 0, cine: 0, ship: null, storm: 0, crowd: "none", nameShown: null, nameReveal: 1, open: null, done: false };
  if (!fin || !fin.agreedAt) return out;
  if (fin.inaugAt && t >= fin.inaugAt) {
    out.done = true; out.crowd = t < fin.inaugAt + 70000 ? "disperse" : "none";
    out.ship = feteShipAnchored(slip);
    return out;
  }
  if (!fin.startAt) {
    if (fin.feteAt) {
      out.pre = { prep: t >= fin.feteAt - FETE.PREP_MS, gather: t >= fin.feteAt - FETE.GATHER_MS, ready: t >= fin.feteAt };
      if (out.pre.gather) out.crowd = "arrive";
    }
    out.ship = feteShipAt(null, t, slip);
    return out;
  }
  const tl = feteTimeline(fin);
  out.tl = tl; out.open = tl.open;
  let cur = null;
  /* Le segment PRINCIPAL (celui qui nomme la phase) : les segments d'effet (l'orage, la foudre, la foule qui part, la mise à
     l'eau, le naufrage) se superposent à lui sans le remplacer ; « back » (la foule qui revient) le remplace, c'est un plan. */
  for (const g of tl.segs) if (t >= g.t0 && t < g.t1 && !FX_SEGS.has(g.k)) cur = g;
  out.seg = cur ? cur.k : (tl.open ? (tl.open.kind === "retry" ? "wreck" : tl.open.kind === "name" ? "voteName" : "voteVerdict") : "end");
  out.k = kOf(cur, t);
  // la cinématique : les bandes entrent à l'instant du signal, sortent à la fin du retour
  const endAt = tl.end || Infinity;
  out.cine = Math.min(smooth((t - tl.s) / 1500), endAt === Infinity ? 1 : smooth((endAt - t) / 4000));
  out.ship = feteShipAt(tl, t, slip);
  out.storm = stormK(tl, t);
  // la foule
  const lv = last(tl, "leave", t), bk = last(tl, "back", t);
  out.crowd = "gathered";
  if (lv && t >= lv.t0 && (!bk || bk.t0 < lv.t0 || t < bk.t0)) out.crowd = t < lv.t1 ? "leave" : "away";
  if (bk && t >= bk.t0 && (!lv || bk.t0 > lv.t0)) out.crowd = t < bk.t1 ? "back" : "gathered";
  if (out.seg === "dance") out.crowd = "dance";
  if (out.seg === "cheer" || (out.seg === "rename" && out.k > 0.45) || out.seg === "smash" && tl.name === FETE_GOOD_NAME && out.k > 0.5) out.crowd = "cheer";
  if (out.seg === "contest" || out.seg === "voteVerdict") out.crowd = "contest";
  if (out.seg === "depart") out.crowd = "wave";
  const re = last(tl, "return", t);
  if (re && t >= re.t0 + 4000) out.crowd = "disperse";
  // le nom peint sur la coque
  const sm = last(tl, "smash", t), rn = last(tl, "rename", t);
  if (sm && t >= sm.t0 + 900) { out.nameShown = sm.name; out.nameReveal = clamp01((t - sm.t0 - 900) / 1600); }
  if (rn && t >= rn.t0 + 3000) {
    const kk = (t - rn.t0 - 3000) / 1000;
    if (kk < 1.2) { out.nameShown = rn.from; out.nameReveal = 1 - clamp01(kk / 1.2); }
    else { out.nameShown = FETE_GOOD_NAME; out.nameReveal = clamp01((kk - 1.2) / 1.6); }
  }
  if (rn && t >= rn.t1) { out.nameShown = FETE_GOOD_NAME; out.nameReveal = 1; }
  return out;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 6. LES VOTES — la majorité ; à égalité, le maire tire au sort (C2) / on écoute la foule (D3).
   ╚════════════════════════════════════════════════════════════════════════════
   `ballots` : { idJoueur: choix } ; `voters` : les joueurs connectés (l'hôte les connaît). `rnd` : un nombre 0..1 tiré PAR
   L'HÔTE, une fois. Personne n'a voté → le bon nom / écouter. Rend { pick, tie }. */
export function feteTally(ballots, voters, nChoices, tieRule, rnd) {
  const cnt = new Array(nChoices).fill(0);
  const ids = voters && voters.length ? voters : Object.keys(ballots || {});
  for (const id of ids) { const v = ballots && ballots[id]; if (Number.isInteger(v) && v >= 0 && v < nChoices) cnt[v]++; }
  const max = Math.max(...cnt);
  if (max === 0) return { pick: 0, tie: false, cnt };
  const top = cnt.map((c, i) => (c === max ? i : -1)).filter(i => i >= 0);
  if (top.length === 1) return { pick: top[0], tie: false, cnt };
  if (tieRule === "first") return { pick: top[0], tie: true, cnt };
  return { pick: top[Math.min(top.length - 1, Math.floor((rnd || 0) * top.length))], tie: true, cnt };
}
/* Tout le monde a-t-il voté ? (l'hôte clôt alors sans attendre le délai) */
export function feteAllVoted(ballots, voters) { return !!voters && voters.length > 0 && voters.every(id => ballots && Number.isInteger(ballots[id])); }

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 7. LA FOULE — qui vient, où elle se tient, comment elle marche.
   ╚════════════════════════════════════════════════════════════════════════════
   Tous les habitants (la station), leurs familles (`C.RESIDENT_FAMILY`, toutes : c'est la fête), les deux lèche-bottes et
   Tristan (toujours là : il a taillé la chaise de la cloche), et des visiteurs du train de la fête — de nouveaux visages, sans
   nom. Chacun reçoit une PLACE (une case libre autour de la cale, la plus proche d'abord, regard tourné vers le navire) et une
   ENTRÉE (le quai de la gare, ou l'endroit où l'habitant se trouvait en ville quand la fête l'a appelé — l'appelant le dit). */
export const FETE_SYCOPHANTS = [13, 20];            // Honoré (il marchande, flatte qui décide), Philomène (elle finance la mairie)
export const FETE_ALWAYS = [13, 20, 27];             // + Tristan
export const FETE_VISITORS = 24;
export function feteCrowdMembers(residentRids, lang) {
  const rids = [];
  for (const r of FETE_ALWAYS) rids.push(r);
  for (const r of residentRids || []) if (Number.isInteger(r) && r >= 0 && r < C.VISITOR_ROSTER.length && !rids.includes(r)) rids.push(r);
  const out = [];
  for (const rid of rids) {
    const ro = C.VISITOR_ROSTER[rid] || {};
    const lead = out.length;
    out.push({ id: "r" + rid, kind: "res", rid, gender: ro.gender || "m", outfit: ro.outfit | 0, overalls: !!ro.overalls, cap: !!ro.cap, look: ro.look || null, name: ro.name || null, syco: FETE_SYCOPHANTS.includes(rid) });
    const fam = (C.RESIDENT_FAMILY && C.RESIDENT_FAMILY[rid]) || [];
    fam.forEach((g, gi) => out.push({ id: "g" + rid + "_" + gi, kind: "guest", rid, gi, follow: lead, gender: g.gender || "m", outfit: g.outfit | 0, overalls: false, cap: !!g.cap, look: g.look || null, small: !!g.small, name: g.name || null, lag: 1.15 * (gi + 1) }));
  }
  for (let i = 0; i < FETE_VISITORS; i++) {
    const h = hash(i * 7919 + 17);
    out.push({ id: "v" + i, kind: "visitor", gender: h % 2 ? "f" : "m", outfit: (h >>> 3) % 8, overalls: ((h >>> 7) & 3) === 0, cap: ((h >>> 9) & 3) === 0, look: null, small: ((h >>> 11) % 5) === 0, name: null });
  }
  return out;
}
function hash(n) { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; }
/* Les places : les cases libres (`free(x, y)`, la marche de la ville) d'un rectangle autour de la cale, hors de l'emprise du
   navire et de l'estrade, triées par distance au navire. ⚠️ En CASES (entiers) ; l'appelant convertit en ancre
   (`C.tileAnchor`) pour poser les pieds au milieu. `face` : vers le navire. */
export function feteSlots(slip, stage, free) {
  const out = [];
  const cx = slip.x, cy = slip.y - 1.6;
  // ⚠️ DE LA PELOUSE DU QUAI AU PONTON (six rangées au nord de la cale, trois au sud) : la promenade au pied du mur de la
  // terrasse est au même niveau, mais quelqu'un qui s'y tient se peint DEVANT le mur — il a l'air debout dessus (vu en jeu).
  for (let y = Math.floor(slip.y) - 6; y <= Math.floor(slip.y) + 3; y++) {
    for (let x = Math.floor(slip.x) - 19; x <= Math.floor(slip.x) + 17; x++) {
      if (!free(x, y)) continue;
      // ⚠️ EN QUINCONCE : une case sur deux. Un personnage est plus haut qu'une case (24 px pour 16) ; sur deux rangées voisines
      // à la même colonne, les têtes s'empilaient en totem (vu en jeu). La place est ensuite décalée d'un rien (`feteMemberAt`).
      if ((x + y) % 2) continue;
      if (x >= Math.floor(slip.x) - 4 && x <= Math.floor(slip.x) + 3 && y >= Math.floor(slip.y) - 7) continue;   // le navire et son ber
      if (stage && x >= stage.x0 - 1 && x <= stage.x1 + 1 && y >= stage.y0 - 1 && y <= stage.y1) continue;     // l'estrade et son abord
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const face = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx < 0 ? 3 : 2) : (dy < 0 ? 0 : 1);
      // ⚠️ les rangs du bord de l'eau d'abord (on voit le navire), puis la promenade
      out.push({ x, y, face, d: Math.hypot(dx * 0.85, dy * 1.4) });
    }
  }
  out.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  // une case sur deux en quinconce au premier rang, pour qu'on ne se marche pas dessus (une semelle fait 0,6 case)
  return out;
}
/* Qui prend quelle place : les lèche-bottes et Tristan devant, près de l'estrade ; une famille côte à côte (la case suivante). */
export function feteAssign(members, slots) {
  const used = new Set(), pick = new Array(members.length).fill(-1);
  const take = (i) => { for (let s = 0; s < slots.length; s++) if (!used.has(s)) { used.add(s); pick[i] = s; return; } };
  const near = (i, j) => {   // la place libre la plus proche de celle de `j`
    const a = slots[pick[j]]; if (!a) return take(i);
    let best = -1, bd = 1e9;
    for (let s = 0; s < slots.length; s++) { if (used.has(s)) continue; const d = Math.hypot(slots[s].x - a.x, slots[s].y - a.y); if (d < bd) { bd = d; best = s; } }
    if (best >= 0) { used.add(best); pick[i] = best; } else take(i);
  };
  members.forEach((m, i) => { if (m.kind === "res" && (m.syco || m.rid === 27)) take(i); });
  members.forEach((m, i) => { if (pick[i] >= 0) return; if (m.kind === "guest" && pick[m.follow] >= 0) near(i, m.follow); else if (m.kind !== "guest") take(i); });
  members.forEach((m, i) => { if (pick[i] < 0) { if (m.kind === "guest" && pick[m.follow] >= 0) near(i, m.follow); else take(i); } });
  return pick;
}
/* Le départ de chacun (étalé : une procession, pas un bloc). ⚠️ IL SE COMPTE À REBOURS DEPUIS L'ARRIVÉE : chacun est à sa place
   au moins `ARRIVE_EARLY_MS` avant l'heure, quelle que soit la longueur de son chemin (`len`, en cases) — « la foule est déjà
   là quand la fête commence » (B2). Le premier jet partait d'une fenêtre fixe : le chemin le plus long (121 cases depuis le
   train) arrivait seize secondes APRÈS l'heure, et seul le banc l'a vu. */
export const ARRIVE_EARLY_MS = 12000, ARRIVE_SPREAD_MS = 45000;
export function feteArriveStart(i, len, fin) {
  const walk = (Math.max(0, len) / FETE.WALK_V) * 1000;
  return Math.max(fin.feteAt - FETE.GATHER_MS, fin.feteAt - ARRIVE_EARLY_MS - walk - Math.round(ARRIVE_SPREAD_MS * ((hash(i + 31) % 1000) / 1000)));
}
/* Une position le long d'un chemin (points d'ancre `{x, y}`) à `dist` cases du départ. Rend { x, y, dir, moving, done }. */
export function alongPath(pts, dist) {
  if (!pts || !pts.length) return null;
  let d = Math.max(0, dist);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= L || i + 2 === pts.length) {
      const k = L > 1e-6 ? Math.min(1, d / L) : 1, dx = b.x - a.x, dy = b.y - a.y;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
      return { x: a.x + dx * k, y: a.y + dy * k, dir, moving: k < 1, done: k >= 1 && i + 2 === pts.length };
    }
    d -= L;
  }
  const z = pts[pts.length - 1];
  return { x: z.x, y: z.y, dir: 0, moving: false, done: true };
}
export function pathLength(pts) { let L = 0; for (let i = 0; i + 1 < (pts || []).length; i++) L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); return L; }

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 8. CE QUE DIT CHACUN — les bulles, datées. `who` : "mayor" | un indice de membre ; `key` : la clé de la réplique dans
   ║    `L.fete` (fermeStrings.js) ; `i` : l'indice de la ligne dans une liste.
   ╚════════════════════════════════════════════════════════════════════════════ */
export function feteBubbles(tl, members, t) {
  const out = [];
  if (!tl) return out;
  const n = members.length;
  const say = (who, key, i, t0, dur, x) => { if (t >= t0 && t < t0 + dur * 1000) out.push({ who, key, i, t0, dur: dur * 1000, ...(x || {}) }); };
  const front = (j) => { // un membre « du premier rang », dérivé d'un indice — jamais un lèche-botte quand on proteste
    const pool = members.map((m, i) => i).filter(i => !members[i].syco && members[i].kind !== "guest");
    return pool.length ? pool[(hash(j * 131 + 7) % pool.length)] : 0;
  };
  for (const g of tl.segs) {
    if (g.k === "dance") for (let j = 0; j < 5; j++) say(front(j + 40), "dance", j, g.t0 + (2 + j * 4) * 1000, 3);
    if (g.k === "speech") for (let j = 0; j < SPEECH_N; j++) say("mayor", "speech", j, g.t0 + j * SEQ.SPEECH_LINE * 1000, SEQ.SPEECH_LINE - 0.4);
    if (g.k === "voteName") say("mayor", "voteName", 0, g.t0, Math.min(6, (g.t1 - g.t0) / 1000));
    if (g.k === "draw") say("mayor", "draw", 0, g.t0, SEQ.DRAW);
    if (g.k === "announce") say("mayor", "announce", 0, g.t0, SEQ.ANNOUNCE, { name: g.name });
    if (g.k === "bottle" && g.by === "mayor") say("mayor", "mayorBottle", 0, g.t1 - 2500, 2.6);
    if (g.k === "cheer") for (let j = 0; j < 6; j++) say(front(j + 60), "cheer", j, g.t0 + j * 900, 2.6, { name: g.name });
    if (g.k === "contest") {
      say("mayor", "contestMayor", 0, g.t0 + 12500, 4.4);
      for (let j = 0; j < 8; j++) say(front(j + 80 + g.round * 9), "contest", j, g.t0 + (0.4 + j * 1.45) * 1000, 2.8, { name: g.name });
      const sy = members.map((m, i) => i).filter(i => members[i].syco);
      sy.forEach((mi, j) => say(mi, "syco", j + g.round * 2, g.t0 + (3.2 + j * 4.1) * 1000, 3));
    }
    if (g.k === "voteVerdict") say("mayor", "voteVerdict", 0, g.t0, 5);
    if (g.k === "rename") { say("mayor", "rename", 0, g.t0, 5); for (let j = 0; j < 4; j++) say(front(j + 120), "cheer", j, g.t0 + (5 + j) * 1000, 2.6, { name: FETE_GOOD_NAME }); }
    if (g.k === "leave") { say("mayor", "keep", 0, g.t0, 4); for (let j = 0; j < 3; j++) say(front(j + 140), "leave", j, g.t0 + (0.8 + j * 1.6) * 1000, 2.6); }
    if (g.k === "bolt") say("mayor", "storm", 0, g.t0 - 5500, 4);
    if (g.k === "wreck") say("mayor", "sunk", 0, g.t0 + 2000, 5);
    if (g.k === "miss") say("mayor", "held", 0, g.t0 + 3000, 5);
    if (g.k === "back" && g.sheepish) for (let j = 0; j < 3; j++) say(front(j + 160), "sheepish", j, g.t0 + (7 + j * 2) * 1000, 3);
    if (g.k === "depart") { say("mayor", "depart", 0, g.t0, 3.5); for (let j = 0; j < 5; j++) say(front(j + 180), "farewell", j, g.t0 + (15 + j * 3) * 1000, 2.8); }
    if (g.k === "return") say("mayor", "home", 0, g.t0 + 24000, 5);
  }
  return out;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 9. LA CAMÉRA — des plans, pas une poursuite. Chaque plan : un point visé (cases).
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ PAS DE ZOOM. Le premier jet zoomait à chaque plan (0,8 à 1,45, lissé) : le sol de la ville est CUIT PAR BLOCS à l'échelle
   du cadrage (`townGroundFrame`, sa signature porte le zoom), donc chaque image d'un zoom glissant recuisait tout le sol visible
   — la page s'est figée au bout d'une minute de cérémonie, vu en jeu (aucun banc ne le pouvait). Les plans sont des
   panoramiques au zoom du joueur ; c'est la règle de toute la ville (le dézoom du 428 bascule d'un cran, il ne glisse pas).
   `A` : les repères de la scène (fournis par l'appelant, dérivés du monde) — `slip`, `stage`, `bow`, `west`, `east`, `pier`,
   `anchor`. ⚠️ Les passages d'un plan à l'autre sont des `smoothstep` (un vol part doux et se pose doux, leçon du 445). */
export function feteCamAt(st, t, A) {
  const tl = st && st.tl;
  if (!tl || !(st.cine > 0)) return null;
  const ship = st.ship || { x: A.slip.x, y: A.slip.y };
  const P = (x, y) => ({ x, y });
  const shipC = P(ship.x, ship.y - 2.4);
  let a = P(A.slip.x, A.slip.y - 2.5), b = a, k = 0;
  const g = st.seg, u = st.k;
  const segOf = (key) => last(tl, key, t);
  if (g === "bell") { a = P(A.slip.x + 1, A.slip.y - 2.5); b = a; }
  else if (g === "dance") { a = P(A.west.x, A.west.y); b = P(A.east.x, A.east.y); k = smooth((u - 0.08) / 0.84); }
  else if (g === "speech") { a = P(A.stage.x - 1.5, A.stage.y - 1.8); b = P(A.stage.x - 1.2, A.stage.y - 1.6); k = smooth(u); }
  else if (g === "voteName" || g === "draw" || g === "announce" || g === "bottle") { a = P(A.slip.x + 1.6, A.slip.y - 2.2); b = a; }
  else if (g === "smash") { a = P(A.bow.x - 0.5, A.bow.y - 1.2); b = P(A.slip.x + 0.8, A.slip.y - 2.2); k = smooth((u - 0.55) / 0.45); }
  else if (g === "cheer" || g === "rename") { a = P(A.slip.x, A.slip.y - 2.6); b = a; }
  else if (g === "contest" || g === "voteVerdict") { a = P(A.west.x + 3, A.west.y); b = P(A.east.x - 2, A.east.y); k = smooth(u); }
  else if (g === "depart") {
    /* Le départ : le plan large du quai pendant les amarres et la mise à l'eau, puis on SUIT le navire vers l'ouest, puis on
       revient au plan large du ciel pour le feu d'artifice pendant qu'il disparaît au large. */
    const dp = segOf("depart"), uu = (t - dp.t0) / 1000;
    const follow = P(Math.max(A.slip.x - 30, Math.min(A.slip.x, ship.x + 1)), A.slip.y - 1.2);
    const quay = P(A.slip.x + 1, A.slip.y - 1.6), sky = P(A.slip.x - 1, A.slip.y - 4.2);
    if (uu < 30) { a = quay; b = follow; k = smooth((uu - 9) / 6); }
    else { a = follow; b = sky; k = smooth((uu - 30) / 6); }
  }
  else if (g === "return") { a = P(A.anchor.x + 5, A.anchor.y - 4.2); b = a; }
  else if (g === "wreck" || g === "keep") { a = P(A.slip.x, A.slip.y - 1); b = a; }
  else if (g === "refloat" || g === "haul") { a = P(A.slip.x, A.slip.y - 1.2); b = a; }
  else if (g === "back") { a = P(A.slip.x, A.slip.y - 2.6); b = a; }
  // l'orage (maintenir) : le plan suit la foule qui part, puis se resserre sur le navire
  if (g === "keep") {
    const kp = segOf("keep"), s2 = (t - kp.t0) / 1000;
    a = P(A.slip.x, A.slip.y - 3); b = P(shipC.x, shipC.y + 1); k = smooth((s2 - 9) / 10);
    if (kp.roll !== "sink") { const c2 = smooth((s2 - 26) / 6); b = { x: b.x + (A.slip.x - b.x) * c2, y: b.y + (A.slip.y - 2.6 - b.y) * c2 }; }
  }
  const c = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  // la secousse de la foudre : quatre images, pas plus
  const bo = segOf("bolt");
  if (bo && t >= bo.t0 && t < bo.t0 + 450) { const s3 = Math.sin((t - bo.t0) / 18); c.x += s3 * 0.12; c.y += Math.cos((t - bo.t0) / 23) * 0.09; }
  return { ...c, k: st.cine };
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 10. LE DÉCOR ET L'ÉQUIPE — les ouvriers du chantier de la place parent le quai (B2), puis restent pour l'animation :
   ║     ils ôtent les cales au départ et tirent le feu d'artifice depuis le bout du ponton.
   ╚════════════════════════════════════════════════════════════════════════════
   Le décor : des MÂTS le long du quai (les fanions et les lampions courent de l'un à l'autre), l'ESTRADE du maire à l'est
   de la cale, deux mâts à oriflamme à ses coins. Chaque morceau a son ouvrier et son instant de pose, en ms avant l'heure ;
   une fois posé, il reste — la fête est un souvenir, pas un décor qu'on démonte (choix de D11 pour la guirlande). */
export const CREW_FETE = [
  { id: "chef", look: "chef:0", gender: "m", outfit: 2 },
  { id: "p1", look: "ouvrier:0", gender: "m", outfit: 5 },
  { id: "p2", look: "ouvrier:3", gender: "f", outfit: 7 },
  { id: "p3", look: "ouvrier:2", gender: "m", outfit: 9 },
  { id: "p4", look: "ouvrier:4", gender: "m", outfit: 3 },
];
export function feteDecor(slip, free) {
  /* ⚠️ LE DÉCOR SE POSE SUR DES CASES LIBRES DU QUAI (`free`, la marche de la ville) : le quai porte des bancs et des bittes, et
     le premier jet a planté l'estrade sur un banc (vu en jeu : un banc bleu devant le pupitre du maire) et un mât dans l'anse
     de l'ouest. L'estrade prend le premier rectangle de 3 × 2 cases libres à l'est du navire ; les mâts, la case libre la plus
     proche de leur écart voulu. Sans `free` (un banc pur), les écarts tels quels. */
  const ok = free || (() => true);
  const sx = Math.floor(slip.x), row = Math.floor(slip.y) - 2, y = row + 0.65;
  let x0 = sx + 5;
  for (let x = sx + 5; x <= sx + 14; x++) {
    let all = true;
    for (let dx = 0; dx < 3 && all; dx++) for (const yy of [row, row + 1]) if (!ok(x + dx, yy)) { all = false; break; }
    if (all) { x0 = x; break; }
  }
  const stage = { x0, x1: x0 + 2, y0: row, y1: row + 1 };
  const taken = new Set();
  const snap = (want) => {
    for (let d = 0; d <= 4; d++) for (const s2 of [1, -1]) {
      const x = want + d * s2;
      if (taken.has(x) || (x >= sx - 4 && x <= sx + 4) || (x >= stage.x0 - 1 && x <= stage.x1 + 1) || !ok(x, row)) continue;
      taken.add(x); return { x: x + 0.5, y };
    }
    return null;
  };
  const poles = [snap(sx - 10), snap(sx - 6), snap(stage.x1 + 3), snap(stage.x1 + 7)].filter(Boolean);
  return { poles, stage, mayor: { x: (stage.x0 + stage.x1 + 1) / 2, y: stage.y0 + 0.9 } };
}
/* Le script de l'équipe : `{ t0, t1, act, a: [x, y], b, task }`, en ms RELATIVES à l'heure de la fête (négatives avant).
   Les positions sont des PIEDS (comme `chantier.js`). `task` : ce que le geste pose quand il s'achève ("pole:i", "stage",
   "flag:i"). Deux ouvriers montent l'estrade, deux plantent les mâts, le chef montre. Ils arrivent par l'est du quai. */
let CREW_MEMO = null;
export function feteCrewScripts(slip, D0) {
  const D = D0 || feteDecor(slip);
  const key = slip.x + "," + slip.y + "|" + D.stage.x0 + "|" + D.poles.map(p => p.x).join(",");
  if (CREW_MEMO && CREW_MEMO.key === key) return CREW_MEMO.S;
  const S = {};
  CREW_FETE.forEach((w) => { S[w.id] = []; });
  const V = 1.9;   // cases/s
  const t0 = -FETE.PREP_MS;
  const enter = [slip.x + 26, slip.y - 0.4];
  const step = (id, a0, a1, act, a, b, x) => S[id].push({ t0: a0, t1: a1, act, a, b: b || a, ...(x || {}) });
  const walk = (id, from, a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const t1 = from + (d / V) * 1000; step(id, from, t1, "walk", a, b); return t1; };
  // le chef : arrive, se poste devant la cale, montre ; reste près de l'estrade
  let t = walk("chef", t0, enter, [slip.x + 8.5, slip.y - 0.6]);
  step("chef", t, t + 9000, "point", [slip.x + 8.5, slip.y - 0.6], null, { dir: 2 }); t += 9000;
  t = walk("chef", t, [slip.x + 8.5, slip.y - 0.6], [D.stage.x1 + 1.5, slip.y - 0.2]);
  step("chef", t, 1e12, "stand", [D.stage.x1 + 1.5, slip.y - 0.2], null, { dir: 2 });
  // l'estrade : deux porteurs, trois planches chacun, puis on visse
  for (const [id, off] of [["p1", 0], ["p2", 0.9]]) {
    let tt = walk(id, t0 + off * 1000, [enter[0] + off, enter[1]], [D.stage.x0 + 0.5 + off, D.stage.y1 + 0.2]);
    for (let k = 0; k < 3; k++) {
      step(id, tt, tt + 2600, "carry", [D.stage.x0 + 0.5 + off, D.stage.y1 + 0.2], null, { dir: 1 }); tt += 2600;
      step(id, tt, tt + 4200, "screw", [D.stage.x0 + 0.5 + off, D.stage.y1 + 0.2], null, { dir: 1, task: k === 2 && id === "p2" ? "stage" : null }); tt += 4200;
    }
    step(id, tt, tt + 7000, "screw", [D.stage.x0 + 0.5 + off, D.stage.y1 + 0.2], null, { dir: 1, task: id === "p1" ? "flags" : null }); tt += 7000;
    const post = id === "p1" ? [slip.x - 3.6, slip.y - 0.3] : [slip.x + 3.2, slip.y - 0.3];   // aux cales du ber : ils ôteront les coins au départ
    tt = walk(id, tt, [D.stage.x0 + 0.5 + off, D.stage.y1 + 0.2], post);
    step(id, tt, 1e12, "stand", post, null, { dir: id === "p1" ? 3 : 2 });
  }
  // les mâts : p3 vers l'ouest, p4 vers l'est ; un mât = marcher, planter (visser), puis le suivant
  const west = D.poles.filter(p => p.x < slip.x).sort((a, b) => b.x - a.x), east = D.poles.filter(p => p.x > slip.x).sort((a, b) => a.x - b.x);
  for (const [id, list, start] of [["p3", west, t0 + 2500], ["p4", east, t0 + 1500]]) {
    let tt = start, pos = enter;
    for (const p of list) {
      const i = D.poles.indexOf(p), spot = [p.x + 0.2, p.y + 0.55];
      tt = walk(id, tt, pos, spot); pos = spot;
      step(id, tt, tt + 5200, "screw", spot, null, { dir: 1, task: "pole:" + i }); tt += 5200;
    }
    // p4 finit au bout du ponton (le feu d'artifice), p3 devant la foule de l'ouest
    const fin = id === "p4" ? [slip.x + 13.6, slip.y + 6.6] : [slip.x - 9, slip.y - 0.4];
    tt = walk(id, tt, pos, id === "p4" ? [slip.x + 13.6, slip.y - 0.4] : fin);
    if (id === "p4") tt = walk(id, tt, [slip.x + 13.6, slip.y - 0.4], fin);
    step(id, tt, 1e12, "stand", fin, null, { dir: id === "p4" ? 0 : 3 });
  }
  CREW_MEMO = { key, S };
  return S;
}
/* Où est l'ouvrier `id` à `rel` ms de l'heure de la fête ; et ce qui est déjà posé. */
export function feteWorkerAt(slip, id, rel, D) {
  const S = feteCrewScripts(slip, D)[id];
  if (!S || !S.length || rel < S[0].t0) return null;
  let s = S[0];
  for (const x of S) if (x.t0 <= rel) s = x; else break;
  const k = s.t1 > s.t0 ? clamp01((rel - s.t0) / (s.t1 - s.t0)) : 1;
  const x = s.a[0] + (s.b[0] - s.a[0]) * k, y = s.a[1] + (s.b[1] - s.a[1]) * k;
  const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
  const moving = s.act === "walk" && k < 1 && Math.hypot(dx, dy) > 0.01;
  let dir = s.dir != null ? s.dir : 0;
  if (moving) dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  return { x, y, dir, moving, act: s.act === "walk" && !moving ? "stand" : s.act, phase: (rel - s.t0) / 1000 };
}
export function feteBuilt(slip, rel, D) {
  const S = feteCrewScripts(slip, D), out = { poles: new Set(), stage: false, flags: false };
  if (rel == null) return out;
  for (const id in S) for (const s of S[id]) if (s.task && rel >= s.t1) {
    if (s.task === "stage") out.stage = true; else if (s.task === "flags") out.flags = true;
    else if (s.task.startsWith("pole:")) out.poles.add(+s.task.slice(5));
  }
  return out;
}
/* Pendant la cérémonie, l'équipe sert la scène : au départ, p1 et p2 ôtent les coins du ber (« screw » accroupis, 2,5 → 5 s) ;
   p4 tire le feu d'artifice du bout du ponton (il lève sa lance à chaque fusée). Rend l'acte à jouer, ou null. */
export function feteCrewCeremonyAct(tl, id, t) {
  if (!tl) return null;
  const dp = last(tl, "depart", t);
  if (!dp || t < dp.t0) return null;
  const u = (t - dp.t0) / 1000;
  if ((id === "p1" || id === "p2") && !dp.afloat && u >= 2.5 && u < 5.2) return "screw";
  if (id === "p4" && u >= 30 && u < 61) return "point";
  return null;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 11. LE FEU D'ARTIFICE — le soir ou la nuit seulement (B4 : en plein jour, il ne se verrait pas). Une liste de fusées
   ║     dérivée de la date du départ : même ciel chez tous.
   ╚════════════════════════════════════════════════════════════════════════════
   `{ t0 (ms), x, y (cases : le point d'éclatement), kind: "peony"|"willow"|"ring"|"crackle", hue, rise (ms) }` ; elles
   partent du bout du ponton. Un bouquet final serré dans les six dernières secondes. */
export function feteFireworks(tl, A) {
  const dp = tl && tl.segs.find(g => g.k === "depart");
  if (!dp) return [];
  const out = [], KINDS = ["peony", "willow", "ring", "crackle"], HUES = [48, 8, 200, 320, 130, 28, 270];
  /* ⚠️ ILS ÉCLATENT BAS, AU-DESSUS DE LA FOULE : la vue est de dessus, le « ciel » est la ville derrière le quai ; éclatés à
     onze cases, ils passaient sous la bande haute du cinéma (vu en jeu : une fusée sur trois visible, au bord du cadre).
     Deux à trois en l'air à la fois, puis le bouquet final serré. */
  let t = dp.t0 + 31000, i = 0;
  while (t < dp.t0 + 55000) {
    const h = hash(i * 977 + 3);
    out.push({ t0: t, x: A.slip.x - 12 + (h % 2400) / 100, y: A.slip.y - 6.5 - ((h >>> 12) % 350) / 100, kind: KINDS[(h >>> 5) % 4], hue: HUES[(h >>> 8) % HUES.length], rise: 1000 + (h >>> 3) % 400, i });
    t += 700 + (h >>> 17) % 900; i++;
  }
  for (let j = 0; j < 12; j++) { const h = hash(j * 31 + 999); out.push({ t0: dp.t0 + 56000 + j * 380, x: A.slip.x - 11 + (h % 2200) / 100, y: A.slip.y - 7 - ((h >>> 12) % 300) / 100, kind: KINDS[j % 4], hue: HUES[j % HUES.length], rise: 950, i: 100 + j }); }
  return out;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 12. LE PLAN DE NUIT — `feteNightAt(t)` : 0..1 de chaque étape, lue par le dessin en espace écran.
   ╚════════════════════════════════════════════════════════════════════════════ */
export function feteNightAt(tl, t) {
  const ni = tl && tl.segs.find(g => g.k === "night");
  if (!ni || t < ni.t0 - 2500 || t >= ni.t1 + 2500) return null;
  const u = (t - ni.t0) / 1000;
  return {
    u,
    veil: Math.min(smooth((u + 2.5) / 2.5), 1 - smooth((u - (SEQ.NIGHT - 1)) / 3.5)),   // le bleu nuit monte, puis rend le monde
    rise: clamp01((u - 3) / 13),          // les sept étoiles quittent le navire et montent
    draw: clamp01((u - 15) / 7),          // les traits de la Brebis
    text: [[22, 27], [27, 32], [32, 37], [37, 43]].map(([a, b]) => Math.min(smooth((u - a) / 0.8), 1 - smooth((u - b + 0.8) / 0.8))),
    corner: smooth((u - 44) / 6),         // la Brebis rejoint son coin du ciel (le dessin du HUD)
    name: ni.name,
  };
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 13. CE QUI S'ENTEND — les événements sonores datés (`sonFete.js` les joue une fois chacun) et les sections de fanfare.
   ╚════════════════════════════════════════════════════════════════════════════ */
export function feteSoundPlan(tl, fws) {
  if (!tl) return { ev: [], sections: [] };
  const ev = [], sections = [];
  const E = (id, t, kind, k) => ev.push({ id, t, kind, k });
  E("bell1", tl.s + 1000, "bell"); E("bell2", tl.s + 2600, "bell"); E("bell3", tl.s + 4200, "bell");
  for (const g of tl.segs) {
    if (g.k === "dance") sections.push({ t0: g.t0 - 3500, t1: g.t1 });
    if (g.k === "speech") E("clapS", g.t1 - 600, "clap");
    if (g.k === "draw") E("toss" + g.t0, g.t0 + 300, "toss");
    if (g.k === "smash") { E("smash" + g.t0, g.t0 + 800, "smash"); if (g.name === FETE_GOOD_NAME) E("cheerS" + g.t0, g.t0 + 1300, "cheer"); }
    if (g.k === "cheer") E("cheerC" + g.t0, g.t0 + 200, "cheer", 0.7);
    if (g.k === "contest") { E("boo" + g.t0, g.t0 + 300, "boo"); E("boo2" + g.t0, g.t0 + 6500, "boo", 0.7); E("clapSy" + g.t0, g.t0 + 3400, "clap", 0.3); }
    if (g.k === "rename") E("cheerR" + g.t0, g.t0 + 5200, "cheer");
    if (g.k === "slide") E("splashL" + g.t0, g.t1 - 800, "splash");
    if (g.k === "back" && g.sheepish) E("clapB" + g.t0, g.t1 - 500, "clap", 0.5);
    if (g.k === "depart") { E("rope" + g.t0, g.t0 + 3200, "rope"); if (!g.afloat) E("splashD" + g.t0, g.t0 + 11000, "splash"); E("cheerD" + g.t0, g.t0 + 13000, "cheer"); sections.push({ t0: g.t0 + 13000, t1: g.t0 + 30000 }); }
    if (g.k === "return") { E("chain" + g.t0, g.t0 + 22000, "chain"); E("splashA" + g.t0, g.t0 + 22500, "splash", 0.6); E("clapE" + g.t0, g.t0 + 25000, "clap", 0.6); }
  }
  for (const f of fws || []) { E("fw" + f.i, f.t0, "whistle", 0.6); E("fb" + f.i, f.t0 + f.rise, "burst"); if (f.kind === "crackle") E("fc" + f.i, f.t0 + f.rise, "crackle"); }
  return { ev, sections };
}
