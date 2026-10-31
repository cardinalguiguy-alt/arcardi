/* =============================================================================
   petanque.js — LE BOULODROME DE VALLEY TOWN : LA RÈGLE ET LA PHYSIQUE (2026-10-28, lot 1), PUR.
   -----------------------------------------------------------------------------
   Guillaume, dans une liste d'idées : « la pétanque c'est super, le boulodrome avec une vraie mécanique de jeu et
   de points. Tour à tour : sans bug et sans latence, du coup. » Les trente décisions de forme ont été posées sur une
   page à boutons (docs/PROJETS.md §11) ; il n'y a rien changé et a donné carte blanche le 2026-10-28 : ce sont les
   recommandations qui font foi. Ce fichier est le LOT 1 : la règle et la physique, rien à l'écran. Il ne dessine rien,
   n'appelle ni React ni le réseau, n'importe rien — `tools/verify-petanque.mjs` le joue seul, parties entières.

   CE QU'IL PORTE
   · LA PISTE : 15 m × 4 m, en mètres, repère propre (x en travers, y en long) ; deux reliefs posés à la main
     (`PISTES`) que le lot 2 dessinera DEPUIS ces nombres-là (une grandeur, un seul endroit) ;
   · LE LANCER : un geste (roulette, demi-portée, plombée, tir ; « but » pour le cochonnet), une DONNÉE (le point de
     chute visé) et l'écart à la marque de la jauge (`err`). Le vol est une parabole ; l'atterrissage mange de la
     vitesse selon la raideur de la chute (la plombée s'arrête, la roulette file) ; puis la boule roule sur le relief ;
   · LES CHOCS : au fer (la boule tirée tombe sur une autre : un choc en 3D, la boule frappée retenue par le sol), puis
     à terre (2D) ; le carreau ;
   · LA RÈGLE : le but lancé du cercle entre 6 et 10 m (trois essais, puis l'adversaire le pose à la main), l'équipe
     qui n'a pas le point joue, la boule morte, le but mort, le comptage, la partie à 13 (ou 7), Fanny ; trois formats ;
   · DES AIDES : l'arrêt sur sol plat d'une donnée (`arretPlat`) et son inverse (`donneePour`), pour le guide de visée
     (lot 3) et les habitants (lot 4) ; la jauge (`jauge`).

   ⚠️⚠️⚠️ TROIS RÈGLES DE CONSTRUCTION — CELLES DE LA SCIE DE TRISTAN (`scierie.js`), POUR LA MÊME RAISON.
   1. PAS FIXE (`P.DT`), JAMAIS UN `dt` D'IMAGE. Chaque client rejoue le lancer reçu ; l'écran interpole entre deux
      pas (`px`, `py`), il ne décide rien.
   2. `+ − × ÷` ET `Math.sqrt` SEULEMENT dans tout ce qui touche une position — ni `sin`, ni `atan2`, ni `pow`, ni
      `hypot`, ni `**`, ni `random`, ni `Date`. La norme garantit les quatre opérations et la racine au bit près ; le
      reste est laissé aux moteurs, et Safari et Chrome arrêteraient la même boule à deux endroits sans aucune erreur.
      La direction voyage donc en VECTEUR (la donnée elle-même), jamais en angle. `verify-petanque` §1 lit ce fichier
      et échoue sur un nom interdit.
   3. L'ÉTAT EST EN ENTIERS (MILLIMÈTRES) ET SE RECOPIE EN JSON. Une boule au repos est arrondie au millimètre à la
      fin de CHAQUE lancer, chez tout le monde : c'est cet état-là, et lui seul, que le lancer suivant reçoit, que
      `shared` garde et qu'un nouvel hôte reprend. Les distances au but se comparent en entiers, donc exactement :
      deux boules à égalité le sont chez tous les joueurs.

   ⚠️ RÉSEAU (noyau §3), TEL QUE LE LOT 3 L'ÉCRIRA : UNE `req` par lancer — `{ coup, geste, donnee: {x, y} (mm),
   err (‰), lourd }` — que l'hôte passe à `verifier` puis `jouer`, et UN `apply` qui rediffuse la même entrée ET l'état
   qui en sort. Chaque client anime le lancer (`preparer`, `simPas`) puis ADOPTE l'état de l'hôte ; si son `empreinte`
   diffère, c'est que la règle n°2 a été violée quelque part (un `console.warn`, jamais une partie cassée). Le lanceur
   n'attend pas l'hôte : `verifier` lui dit déjà que c'est son tour, et la simulation ne dépend que de l'entrée.
   `coup` (le numéro du lancer attendu) écarte la seconde de deux demandes parallèles (noyau §4 : un garde-fou posé
   sur la demande ne tient rien quand les demandes sont parallèles). La visée en cours ne voyage pas.
   ⚠️ `lourd` (le terrain après la pluie, 0 à 3) n'est lu qu'au lancer du BUT, puis vaut pour toute la mène : l'hôte
   y met SA lecture de l'humidité du sol. Lue à chaque boule, elle changerait au milieu d'une mène, et deux clients
   qui la liraient à deux instants différents simuleraient deux terrains.

   ⚠️⚠️ LA TAILLE DES BOULES EST CELLE DU DESSIN, PAS CELLE DU RÈGLEMENT (`P.BOULE_R`). À 13,5 px/m, une vraie boule
   (Ø 7,5 cm) ferait un pixel d'art et ne tiendrait pas dans le poing d'un personnage chibi ; elle sera dessinée à
   3 px (≈ 22 cm). Si la physique gardait 7,5 cm, deux boules qui se touchent à l'écran se recouvriraient aux deux
   tiers et « qui tient le point » se lirait faux. Ici c'est donc le CHOC qui suit le dessin, et c'est voulu — l'objet
   dessiné EST l'objet joué (le piège « une grandeur de dessin ne doit pas entrer dans la collision », noyau §4, parle
   d'un décor où l'on marche). Les distances de la piste, elles, restent réelles (15 m, but à 6-10 m).
   Corollaire : la difficulté (toucher au fer, le carreau) dépend de ce rayon. Si le lot 2 le change après l'avoir
   jugé à l'écran (noyau §4 : une proportion n'est pas une dimension), relancer `verify-petanque` §9 et retoucher les
   `kL`/`kA` des gestes.
   ========================================================================== */

export const PETANQUE = {
  W: 4, L: 15,                     // la piste réglementaire, en mètres (x en travers, y en long)
  PX_M: 13.5,                      // l'échelle de Valley Town, pixels d'art par mètre (docs/A-JUGER.md, phase 11)
  CERCLE_R: 0.25,                  // le cercle de lancer (Ø 50 cm)
  CERCLE_Y0: 1.5,                  // le cercle de la première mène, depuis le bout y = 0
  CERCLE_MARGE: 1,                 // un cercle se trace à 1 m au moins des lignes
  BRAS: 0.35,                      // la main lâche la boule à une longueur de bras devant le centre du cercle
  BOULE_R: 0.11, BOULE_M: 0.7,     // ⚠️ le rayon du DESSIN (3 px d'art), voir l'en-tête ; la masse est la vraie
  BUT_R: 0.055, BUT_M: 0.015,      // le cochonnet : la moitié d'une boule, et cinquante fois plus léger
  G: 9.81,
  DT: 1 / 500,                     // le pas fixe ; 2 ms × 8 m/s = 1,6 cm, dix fois moins que le plus petit contact
  MAX_PAS: 20000,                  // 40 s : aucun lancer ne roule plus longtemps
  K_PENTE: 5 / 7,                  // une sphère qui roule sur un plan incliné : a = 5/7 · g · pente
  MU: 0.07,                        // la résistance au roulement sur le gravier stabilisé (a = MU · g ≈ 0,69 m/s²)
  /* Le cochonnet, léger, s'enfonce dans le gravier et freine cinq fois plus vite qu'une boule. ⚠️ À 1,5 (premier
     jet), frappé par une boule qui roule encore, il filait hors de la piste : un quart des mènes finissaient « but
     mort » même après la correction du choc au fer (banc §8, 2026-10-28). Poussé à 1 m/s, il fait 12 cm ; chassé
     par une boule tirée (5 m/s), 3 à 4 m. */
  BUT_MU: 6,
  GARDE: 5 / 7,                    // à l'atterrissage, une boule qui glisse sans tourner garde 5/7 de sa vitesse…
  LABOUR: 0.032,                   // … moins ce que la chute enfonce dans le gravier : LABOUR · vz² (s/m)
  E_BOULE: 0.8, E_BUT: 0.3,        // le rebond acier contre acier ; contre le cochonnet (bois ou buis, il amortit)
  /* Le carreau : la boule tirée s'arrête à moins de CARREAU diamètres de la place de l'autre. En DIAMÈTRES, pas en
     mètres : un tir de face à l'équateur laisse le tireur à un diamètre devant (le vrai carreau, avec de vraies
     boules : 7,5 cm), et nos boules ont le rayon du dessin (en-tête). */
  CARREAU: 1.1,
  /* Le terrain après la pluie (`pluie.js`), en quatre crans : sec, frais, humide, détrempé. Il roule moins et la chute
     s'y enfonce plus. La neige ferme le boulodrome (le lot 2 en décide : ce fichier ne connaît pas la météo). */
  LOURD: [{ mu: 1, labour: 1 }, { mu: 1.12, labour: 1.15 }, { mu: 1.28, labour: 1.35 }, { mu: 1.5, labour: 1.6 }],
  // la règle
  BUT_MIN: 6, BUT_MAX: 10,         // le but, depuis le centre du cercle
  /* … et à distance des lignes de côté et des bouts. Plus que le règlement (50 cm et 1 m) : nos boules ont trois fois
     la taille réelle (en-tête), un but au ras d'une ligne en sortait au premier contact. ⚠️ 1,5 m au fond est le
     MAXIMUM : d'un cercle à 7,5 m (le milieu), le but doit tenir à 6 m au moins et 1,5 m du bout, des deux côtés. */
  BUT_COTE: 0.8, BUT_FOND: 1.5,
  BUT_ESSAIS: 3,                   // trois essais, puis l'adversaire le pose à la main
  DONNEE_MIN: 0.5,                 // une donnée dans le cercle n'a pas de direction
  CIBLES: [13, 7],
};
const P = PETANQUE;
const W_MM = P.W * 1000, L_MM = P.L * 1000;

/* Les gestes. h0 : hauteur du lâcher ; H : sommet de la parabole (m), FIXE par geste — la portée se choisit par le
   geste, la longueur par la donnée ; kL, kA : l'écart en long et en travers par unité d'erreur de jauge, en fraction
   de la distance de vol (l'écart en travers est donc un ANGLE : il grandit pendant le roulé) ; jauge : la période de
   la jauge (ms) — plus courte, elle est plus dure. Réglés au §9 du banc contre un joueur plausible (sa précision au
   moment du lâcher, en ms). ⚠️ kA près de kL : à kA = kL / 2 (premier jet), les boules pointées s'alignaient sur l'axe
   du but, et la première boule tirée chassait le cochonnet par-dessus la suivante (banc §8). */
export const GESTES = {
  roulette: { h0: 0.35, H: 0.6, kL: 0.22, kA: 0.18, jauge: 1600, posture: "accroupi" },
  demi:     { h0: 0.35, H: 1.3, kL: 0.29, kA: 0.23, jauge: 1500, posture: "accroupi" },
  plombee:  { h0: 0.35, H: 3.2, kL: 0.35, kA: 0.28, jauge: 1400, posture: "accroupi" },
  tir:      { h0: 1.1,  H: 2.2, kL: 0.40, kA: 0.14, jauge: 1200, posture: "debout" },
  but:      { h0: 0.9,  H: 1.3, kL: 0.10, kA: 0.05, jauge: 1600, posture: "debout" },
};
export const GESTES_BOULE = ["roulette", "demi", "plombee", "tir"];

/* Les formats (décision « les trois formats ») : tête-à-tête, doublette (des habitants complètent une équipe), et à
   trois chacun pour soi. */
export const MODES = {
  tat:       { camps: 2, joueurs: 1, boules: 3 },
  doublette: { camps: 2, joueurs: 2, boules: 3 },
  trois:     { camps: 3, joueurs: 1, boules: 2 },
  /* 2026-10-31 (lot 3) — L'ENTRAÎNEMENT, seul sur la piste (son verdict : « une partie d'entraînement » en attendant les habitants
     du lot 4) : le but, puis ses trois boules, et la mène suivante repart d'où le but a fini. La règle n'a rien à y changer — un
     seul camp tient toujours le point et joue toutes ses boules (`campSuivant`) — sauf qu'on ne la gagne jamais (`finirMene`). */
  solo:      { camps: 1, joueurs: 1, boules: 3 },
};

/* LES DEUX PISTES, POSÉES À LA MAIN (décision « un terrain qui se lit » : fixe, il s'apprend ; tiré au hasard, il
   deviendrait de la chance). Mètres, repère de la piste. `incl` : la pente d'ensemble (le gradient de la hauteur :
   +x veut dire « monte vers x »). Une bosse (h > 0) ou un creux (h < 0) a pour profil h·(1 − r²/R²)² : un polynôme,
   lisse, nul au bord, et sa pente se calcule sans racine. Une ornière est un creux allongé le long d'un segment. Les
   cailloux sont de petites bosses dures — le dessin les distingue, la physique non.
   ⚠️ Toutes les pentes restent sous 10 % sauf au flanc d'un caillou : une boule ne s'arrête jamais sur une pente que
   le roulement ne retient pas (`simPas`), et une boule au repos ne repart que frappée. */
export const PISTES = {
  a: {
    // 2026-10-29 (lot 2) : « la piste du puits » au lot 1 ; posée au sud, contre la mairie, elle n'est plus près du puits.
    nom: "la piste de la mairie",
    /* 2026-10-29 (lot 2, sa note « pas systématique ») : 0,6 % au lot 1 — à 10 m, la pente seule déviait 93 % des roulettes de
       plus de 15 cm ; à 0,3 %, 57 %. Ce qui dévie ici est l'ornière, pas la pente. */
    incl: [0.003, 0],                                      // elle penche d'un rien vers x = 0
    // ⚠️ La seconde bosse s'écarte de l'ornière : à (2,9 ; 10,6), leurs flancs s'ajoutaient à 13,6 % (banc §3).
    bosses: [{ x: 1.3, y: 4.4, r: 0.7, h: 0.035 }, { x: 3.3, y: 10.8, r: 0.5, h: 0.025 }],
    // ⚠️ Large de 35 cm, pas 20 : à 20 cm ses flancs montaient à 16 %, plus que ce que le roulement retient (9,8 %),
    // et le banc §3 y a trouvé une boule arrêtée en équilibre impossible.
    ornieres: [{ x0: 2.45, y0: 6.2, x1: 2.15, y1: 12.2, w: 0.35, h: -0.018 }],
    cailloux: [{ x: 1.8, y: 7.4, r: 0.08, h: 0.006 }, { x: 2.75, y: 8.3, r: 0.07, h: 0.005 },
               { x: 1.1, y: 11.3, r: 0.08, h: 0.006 }, { x: 3.1, y: 5.6, r: 0.07, h: 0.005 }],
  },
  b: {
    nom: "la piste du platane",
    /* ⚠️ 2026-10-29 (lot 2) — SA NOTE SUR LE RELIEF : « discret sauf quand il y a des lancers longs et forts ; pas systématique ».
       Mesuré au lot 1 (pointer à 6, 8, 10 m, 14 lignes de 0,7 à 3,3 m) : la roulette était déviée de plus de 15 cm dans 71, 100 et 100 %
       des lancers — par la PENTE (0,8 % allongeait ou raccourcissait CHAQUE roulette) et par la largeur des deux reliefs (les racines et
       le creux couvraient ensemble toute la piste : aucune ligne n'y échappait). Décidé avec lui : « une roulette sur deux passe sans
       être déviée ». La moitié de pente n'y suffisait pas (100 % à 8 et 10 m : à 0,4 %, la pente seule dévie encore chaque longue
       roulette de 20 cm et plus) : un QUART de pente, et un COULOIR propre de 65 cm entre les racines (resserrées vers le nord) et le
       creux (repoussé vers le sud) — 36, 50 et 57 %. Le dessin suit seul (`boulodromeArt.js` lit ces nombres). */
    incl: [0, 0.002],                                      // elle monte vers y = 15 : la mène qui y va est un peu plus courte
    bosses: [{ x: 0.75, y: 9.4, r: 0.65, h: 0.035 },       // les racines
             { x: 3.05, y: 7.2, r: 0.7, h: -0.03 }],       // le creux devant
    ornieres: [],
    cailloux: [{ x: 2.2, y: 4.8, r: 0.08, h: 0.006 }, { x: 3.2, y: 9.9, r: 0.07, h: 0.005 },
               { x: 1.5, y: 12.4, r: 0.08, h: 0.006 }],
  },
  plat: { nom: "plat", incl: [0, 0], bosses: [], ornieres: [], cailloux: [] },   // les bancs, et le guide de visée
};

/* ── LE RELIEF ── */
const DSEG = [0, 0];
function versSegment(o, x, y, out) {
  const sx = o.x1 - o.x0, sy = o.y1 - o.y0;
  let t = ((x - o.x0) * sx + (y - o.y0) * sy) / (sx * sx + sy * sy);
  if (t < 0) t = 0; else if (t > 1) t = 1;
  out[0] = x - (o.x0 + t * sx); out[1] = y - (o.y0 + t * sy);
}
/** La hauteur du sol (m) — pour le dessin (lot 2). La physique ne lit que `pente`. */
export function hauteur(T, x, y) {
  let h = T.incl[0] * (x - P.W / 2) + T.incl[1] * (y - P.L / 2);
  for (const b of T.bosses.concat(T.cailloux)) {
    const dx = x - b.x, dy = y - b.y, q = (dx * dx + dy * dy) / (b.r * b.r);
    if (q < 1) h += b.h * (1 - q) * (1 - q);
  }
  for (const o of T.ornieres) {
    versSegment(o, x, y, DSEG);
    const q = (DSEG[0] * DSEG[0] + DSEG[1] * DSEG[1]) / (o.w * o.w);
    if (q < 1) h += o.h * (1 - q) * (1 - q);
  }
  return h;
}
function penteBosses(list, x, y, out) {
  for (const b of list) {
    const dx = x - b.x, dy = y - b.y, r2 = b.r * b.r, q = (dx * dx + dy * dy) / r2;
    if (q < 1) { const k = -4 * b.h * (1 - q) / r2; out[0] += k * dx; out[1] += k * dy; }
  }
}
/** Le gradient de la hauteur au point (x, y) : la boule roule vers −pente. */
export function pente(T, x, y, out = [0, 0]) {
  out[0] = T.incl[0]; out[1] = T.incl[1];
  penteBosses(T.bosses, x, y, out);
  penteBosses(T.cailloux, x, y, out);
  for (const o of T.ornieres) {
    versSegment(o, x, y, DSEG);
    const w2 = o.w * o.w, q = (DSEG[0] * DSEG[0] + DSEG[1] * DSEG[1]) / w2;
    if (q < 1) { const k = -4 * o.h * (1 - q) / w2; out[0] += k * DSEG[0]; out[1] += k * DSEG[1]; }
  }
  return out;
}

/* ── LE VOL ──
   Une parabole du lâcher (hauteur h0) au sol, par le sommet H. Tout se déduit de H et de la distance : le temps de
   vol, donc la vitesse horizontale, et la vitesse verticale à l'arrivée — celle qui laboure le gravier. */
function vol(g, d) {
  const vz0 = Math.sqrt(2 * P.G * (g.H - g.h0)), tDescente = Math.sqrt(2 * g.H / P.G);
  const T = vz0 / P.G + tDescente;
  return { T, vz0, vh: d / T, vz: P.G * tDescente };
}
/* Ce que l'atterrissage laisse de vitesse horizontale. */
function garde(vh, vz, labour) {
  const k = P.GARDE * vh - P.LABOUR * labour * vz * vz;
  return k > 0 ? k : 0;
}
/** Le point de vol `t` (s) d'un arc de `sim.vols` : pour dessiner la boule en l'air (lot 3). */
export function volAt(a, t) {
  const u = t < a.t0 ? 0 : t > a.t1 ? a.t1 - a.t0 : t - a.t0;
  return { x: a.x0 + a.vx * u, y: a.y0 + a.vy * u, z: a.z0 + a.vz * u - P.G * u * u / 2 };
}

/* ── LES AIDES DE VISÉE ── */
/** Sur sol PLAT : à quelle distance de la main s'arrête un lancer dont la donnée est à `d` mètres de la main ?
    Le guide de visée (lot 3) et les habitants (lot 4) lisent ceci ; le relief, lui, est l'affaire du joueur. */
export function arretPlat(geste, d, lourd = 0) {
  const g = GESTES[geste], f = vol(g, d), L = P.LOURD[lourd], v = garde(f.vh, f.vz, L.labour);
  const fr = P.MU * P.G * L.mu * (geste === "but" ? P.BUT_MU : 1);
  return d + v * v / (2 * fr);
}
/** L'inverse : la donnée (mm) qui, sur sol plat, arrête le lancer sur `cible` (mm) depuis le cercle `cercle` (mm).
    Bisection à nombre de tours fixe : déterministe. Si même la donnée la plus courte roule trop loin, rend celle-là. */
export function donneePour(geste, cercle, cible, lourd = 0) {
  const cx = cercle.x / 1000, cy = cercle.y / 1000;
  let ux = cible.x / 1000 - cx, uy = cible.y / 1000 - cy;
  const dc = Math.sqrt(ux * ux + uy * uy);
  ux /= dc; uy /= dc;
  const visee = dc - P.BRAS;
  let lo = P.DONNEE_MIN - P.BRAS + 0.01, hi = visee;
  if (arretPlat(geste, lo, lourd) >= visee) hi = lo;
  else for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (arretPlat(geste, mid, lourd) < visee) lo = mid; else hi = mid; }
  const d = P.BRAS + hi;
  return { x: Math.round((cx + ux * d) * 1000), y: Math.round((cy + uy * d) * 1000) };
}
/** La jauge : une aiguille qui va et vient de −1 à +1 (triangle, aucune fonction trigonométrique) ; la marque est au
    milieu. Rend l'erreur en ‰ au moment `ms` (local, ms écoulées depuis l'ouverture de la jauge). Négative : court
    et d'un côté ; positive : long et de l'autre — toujours le même, ça s'apprend. */
export function jauge(ms, periode) {
  const ph = (ms % periode) / periode;
  return Math.round((ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph) * 1000);
}

/* ── LA SIMULATION D'UN LANCER ── */
function corps(but, camp, j, x, y) {
  return { but, camp, j, x, y, px: x, py: y, x0: x, y0: y, vx: 0, vy: 0, r: but ? P.BUT_R : P.BOULE_R, m: but ? P.BUT_M : P.BOULE_M,
           mu: but ? P.BUT_MU : 1, vivant: true, bouge: false, air: 0, ax: 0, ay: 0, avx: 0, avy: 0, avz: 0 };
}
const dehors = (b) => b.x < 0 || b.x > P.W || b.y < 0 || b.y > P.L;
function tuer(sim, i) {
  const b = sim.corps[i];
  b.vivant = false; b.bouge = false; b.vx = 0; b.vy = 0;
  sim.ev.push({ t: "mort", n: sim.n, i, but: b.but });
}
function atterrir(sim, i, x, y, vx, vy, vz) {
  const b = sim.corps[i], vh = Math.sqrt(vx * vx + vy * vy), k = vh > 0 ? garde(vh, vz, sim.labour) / vh : 0;
  b.x = b.px = x; b.y = b.py = y; b.vx = vx * k; b.vy = vy * k; b.bouge = k > 0; b.air = 0;
  sim.ev.push({ t: "sol", n: sim.n, i, vz });
  if (dehors(b)) tuer(sim, i);
}

/** Prépare un lancer : vérifie l'entrée, pose les corps, calcule le vol et l'éventuel choc au fer. Rend
    `{ raison }` si l'entrée est refusée, sinon `{ s, sim }` (`sim` est nul pour « placer » : pas de lancer).
    `s` est l'état de départ (la mène suivante si la précédente était finie). */
export function preparer(state, pid, input) {
  const raison = verifier(state, pid, input);
  if (raison) return { raison };
  const s = avancer(state), m = s.mene;
  if (input.geste === "placer") return { s, sim: null };
  const g = GESTES[input.geste], lourd = input.geste === "but" ? input.lourd : m.lourd, L = P.LOURD[lourd];
  const sim = { n: 0, T: PISTES[s.piste], corps: [], ev: [], vols: [], tSol: 0, fini: false, lourd, frot: P.MU * P.G * L.mu,
                labour: L.labour, geste: input.geste, camp: campDe(s, pid), fer: -1, carreau: false };
  // Les corps : 0 = le but, puis les boules de la mène dans leur ordre (les mortes comprises, inertes), puis la lancée.
  if (input.geste !== "but") {
    sim.corps.push(corps(true, -1, null, m.but.x / 1000, m.but.y / 1000));
    for (const q of m.boules) { const c = corps(false, q.camp, q.j, q.x / 1000, q.y / 1000); c.vivant = !q.mort; sim.corps.push(c); }
  }
  const moi = corps(input.geste === "but", sim.camp, pid, 0, 0), im = sim.corps.length;
  sim.corps.push(moi);
  // La main, puis la donnée corrigée de l'erreur de jauge (en long et en travers de la direction visée).
  const cx = m.cercle.x / 1000, cy = m.cercle.y / 1000, Dx = input.donnee.x / 1000, Dy = input.donnee.y / 1000;
  let ux = Dx - cx, uy = Dy - cy;
  const dC = Math.sqrt(ux * ux + uy * uy);
  ux /= dC; uy /= dC;
  const rx = cx + ux * P.BRAS, ry = cy + uy * P.BRAS, d0 = dC - P.BRAS, e = input.err / 1000;
  const lg = e * g.kL * d0, tr = e * g.kA * d0;
  const lx = Dx + ux * lg - uy * tr, ly = Dy + uy * lg + ux * tr;
  let fx = lx - rx, fy = ly - ry;
  const d = Math.sqrt(fx * fx + fy * fy);
  fx /= d; fy /= d;
  const f = vol(g, d), vx = fx * f.vh, vy = fy * f.vh;
  // Le choc au fer : la fin du vol, à l'approche du sol, est une droite (x, y, z) qui finit en (lx, ly, r) avec la
  // vitesse (vx, vy, −vz) ; on remonte cette droite jusqu'à la première sphère de contact d'un corps au sol.
  let k = -1, tau = 0;
  const a = vx * vx + vy * vy + f.vz * f.vz;
  for (let i = 0; i < im; i++) {
    const b = sim.corps[i];
    if (!b.vivant) continue;
    const R = moi.r + b.r, wx = lx - b.x, wy = ly - b.y, wz = moi.r - b.r;
    const bq = wx * vx + wy * vy - wz * f.vz, cc = wx * wx + wy * wy + wz * wz - R * R, disc = bq * bq - a * cc;
    if (disc < 0) continue;
    const t = (bq + Math.sqrt(disc)) / a;              // la plus grande racine : le PREMIER contact dans le temps
    if (t > 0 && t < f.T && t > tau) { tau = t; k = i; }
  }
  const arc0 = { x0: rx, y0: ry, z0: g.h0, vx, vy, vz: f.vz0, t0: 0, t1: f.T };
  if (k < 0) {
    sim.vols.push(arc0); sim.tSol = f.T;
    atterrir(sim, im, lx, ly, vx, vy, f.vz);
    return { s, sim };
  }
  const b = sim.corps[k], R = moi.r + b.r;
  const pcx = lx - vx * tau, pcy = ly - vy * tau, pcz = moi.r + f.vz * tau;
  const nx = (b.x - pcx) / R, ny = (b.y - pcy) / R, nz = (b.r - pcz) / R;      // du lanceur vers la boule frappée
  const vn = vx * nx + vy * ny - f.vz * nz;
  arc0.t1 = f.T - tau; sim.vols.push(arc0); sim.tSol = arc0.t1;
  /* Le choc entre deux masses LIBRES ; la part verticale reçue par la boule frappée part dans le sol.
     ⚠️ Écarté le 2026-10-28 : la boule frappée « tenue par le sol » (sa masse ne comptant que pour la part
     horizontale). Plus juste en apparence, elle fait de la boule frappée un mur : le tir parfait, sur un essai à
     7,5 m, revenait de 1,2 m EN ARRIÈRE au lieu de prendre la place — aucun carreau possible. À masses libres, le
     tireur garde (1 − e)/2 de sa vitesse dans l'axe et s'arrête sur place, comme au vrai boulodrome. */
  /* ⚠️ Le COCHONNET frappé au fer ne reçoit que la part HORIZONTALE du choc. Cinquante fois plus léger, pris entre
     la boule qui tombe et le gravier, il recevrait sinon toute la vitesse de la chute et gicherait comme un pépin :
     une plombée posée dessus l'envoyait à 8 m/s hors de la piste, et la moitié des mènes des parties simulées
     finissaient « but mort » (banc §8, 2026-10-28). Le vrai cochonnet est trop petit pour être souvent pris d'en
     haut ; le nôtre a la taille du dessin, le gravier boit la part verticale. Un tir de face le chasse toujours. */
  const ee = b.but ? P.E_BUT : P.E_BOULE, vJ = b.but ? vx * nx + vy * ny : vn;
  const J = vJ > 0 ? (1 + ee) * vJ / (1 / moi.m + 1 / b.m) : 0;
  b.vx = J / b.m * nx; b.vy = J / b.m * ny; b.bouge = J > 0;
  const wx = vx - J / moi.m * nx, wy = vy - J / moi.m * ny, wz = -f.vz - J / moi.m * nz;   // wz > 0 : elle remonte
  sim.fer = k;
  sim.ev.push({ t: "fer", n: 0, i: im, j: k, v: vn, but: b.but });
  // Puis le lanceur retombe de la hauteur du contact : un petit arc, et il atterrit là où il touche.
  const hr = pcz - moi.r, tf = (wz + Math.sqrt(wz * wz + 2 * P.G * hr)) / P.G, vzf = Math.sqrt(wz * wz + 2 * P.G * hr);
  sim.vols.push({ x0: pcx, y0: pcy, z0: pcz, vx: wx, vy: wy, vz: wz, t0: arc0.t1, t1: arc0.t1 + tf });
  const nAir = Math.round(tf / P.DT);
  moi.x = moi.px = pcx; moi.y = moi.py = pcy;
  if (nAir < 1) atterrir(sim, im, pcx + wx * tf, pcy + wy * tf, wx, wy, vzf);
  else { moi.air = nAir; moi.ax = pcx + wx * tf; moi.ay = pcy + wy * tf; moi.avx = wx; moi.avy = wy; moi.avz = vzf; }
  return { s, sim };
}

const GR = [0, 0];
/** Un pas fixe de la simulation. Rend vrai quand tout est au repos (ou mort). */
export function simPas(sim) {
  if (sim.fini) return true;
  sim.n++;
  const cs = sim.corps, n = cs.length, dt = P.DT;
  for (const b of cs) { b.px = b.x; b.py = b.y; }
  for (let i = 0; i < n; i++) { const b = cs[i]; if (b.air > 0 && --b.air === 0) atterrir(sim, i, b.ax, b.ay, b.avx, b.avy, b.avz); }
  for (let i = 0; i < n; i++) {
    const b = cs[i];
    if (!b.vivant || !b.bouge || b.air > 0) continue;
    pente(sim.T, b.x, b.y, GR);
    const ax = -P.K_PENTE * P.G * GR[0], ay = -P.K_PENTE * P.G * GR[1], fr = sim.frot * b.mu;
    const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp <= fr * dt) {
      // Elle s'arrête… sauf si la pente l'emporte sur le roulement : elle repart dans le sens de la pente.
      const a2 = ax * ax + ay * ay;
      if (a2 <= fr * fr) { b.vx = 0; b.vy = 0; b.bouge = false; continue; }
      const kk = 1 - fr / Math.sqrt(a2);
      b.vx += ax * kk * dt; b.vy += ay * kk * dt;
    } else {
      b.vx += (ax - fr * b.vx / sp) * dt; b.vy += (ay - fr * b.vy / sp) * dt;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (dehors(b)) tuer(sim, i);
  }
  /* Les chocs à terre. ⚠️ Toutes les paires, même deux corps au repos : une boule qui atterrit sans élan (une
     plombée) peut se poser contre une autre, et l'arrondi au millimètre de la fin du lancer précédent peut laisser
     deux boules qui se touchent se recouvrir d'un millimètre. On les sépare sans les réveiller. */
  for (let i = 0; i < n; i++) {
    const bi = cs[i];
    for (let j = i + 1; j < n && bi.vivant && bi.air === 0; j++) {
      const bj = cs[j];
      if (!bj.vivant || bj.air > 0) continue;
      const dx = bj.x - bi.x, dy = bj.y - bi.y, R = bi.r + bj.r, d2 = dx * dx + dy * dy;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2), nx = d > 0 ? dx / d : 0, ny = d > 0 ? dy / d : 1;
      const wi = 1 / bi.m, wj = 1 / bj.m, ws = wi + wj, pen = R - d;
      bi.x -= nx * pen * wi / ws; bi.y -= ny * pen * wi / ws;
      bj.x += nx * pen * wj / ws; bj.y += ny * pen * wj / ws;
      const vn = (bi.vx - bj.vx) * nx + (bi.vy - bj.vy) * ny;
      if (vn > 0) {
        const J = (1 + (bi.but || bj.but ? P.E_BUT : P.E_BOULE)) * vn / ws;
        bi.vx -= J * wi * nx; bi.vy -= J * wi * ny; bj.vx += J * wj * nx; bj.vy += J * wj * ny;
        bi.bouge = true; bj.bouge = true;
        if (vn > 0.02) sim.ev.push({ t: "choc", n: sim.n, i, j, v: vn, but: bi.but || bj.but });
      }
      if (dehors(bi)) tuer(sim, i);
      if (dehors(bj)) tuer(sim, j);
    }
  }
  let calme = true;
  for (const b of cs) if (b.vivant && (b.bouge || b.air > 0)) { calme = false; break; }
  if (calme || sim.n >= P.MAX_PAS) {
    for (const b of cs) { b.bouge = false; b.vx = 0; b.vy = 0; }
    sim.fini = true;
    // Le carreau : un tir au fer sur une boule ADVERSE, qui l'a chassée et a pris sa place.
    if (sim.geste === "tir" && sim.fer > 0) {
      const moi = cs[n - 1], c = cs[sim.fer];
      if (!c.but && c.camp !== sim.camp && moi.vivant) {
        const ex = moi.x - c.x0, ey = moi.y - c.y0, fx = c.x - c.x0, fy = c.y - c.y0;
        const lim = P.CARREAU * 2 * c.r;
        if (ex * ex + ey * ey <= lim * lim && (!c.vivant || fx * fx + fy * fy >= 4 * c.r * c.r)) {
          sim.carreau = true; sim.ev.push({ t: "carreau", n: sim.n, i: n - 1, j: sim.fer });
        }
      }
    }
  }
  return sim.fini;
}
export function simFinir(sim) { while (!simPas(sim)); return sim; }

/* ── L'ÉTAT D'UNE PARTIE ──
   Tout en entiers, tout en JSON. Les joueurs sont des identifiants (un habitant aussi : « pnj:… »). */
const copie = (s) => JSON.parse(JSON.stringify(s));
const mm = (v) => Math.round(v * 1000);

export function nouvellePartie({ mode = "tat", cible = 13, camps, graine = 0, piste = "a" }) {
  const M = MODES[mode];
  if (!M) throw new Error("petanque : mode inconnu " + mode);
  if (!P.CIBLES.includes(cible)) throw new Error("petanque : partie en " + cible + " points");
  if (!PISTES[piste]) throw new Error("petanque : piste inconnue " + piste);
  if (!Array.isArray(camps) || camps.length !== M.camps || camps.some((c) => !Array.isArray(c) || c.length !== M.joueurs)) throw new Error("petanque : camps qui ne vont pas au mode " + mode);
  const ids = camps.flat();
  if (new Set(ids).size !== ids.length) throw new Error("petanque : un joueur dans deux camps");
  const s = { v: 1, mode, cible, piste, graine: graine >>> 0, boules: M.boules, coups: 0,
              camps: camps.map((js) => ({ joueurs: js.slice(), score: 0 })), mene: null, historique: [],
              gagnant: null, fanny: false, stats: {}, faits: [] };
  for (const j of ids) s.stats[j] = { lancers: 0, tirs: 0, fers: 0, carreaux: 0 };
  // Qui lance le but à la première mène : la graine (tirée par l'hôte, gardée dans l'état, donc la même partout).
  s.mene = nouvelleMene(s, 1, s.graine % s.camps.length, { x: W_MM / 2, y: P.CERCLE_Y0 * 1000 });
  return s;
}
function nouvelleMene(s, n, lanceur, cercle) {
  const reste = {};
  for (const c of s.camps) for (const j of c.joueurs) reste[j] = s.boules;
  return { n, cercle, butLanceur: lanceur, essais: 0, place: -1, but: null, butMort: false, butAvant: null, boules: [],
           reste, dernier: -1, lourd: 0, fini: null };
}
/* Le cercle de la mène suivante : là où le but a fini, ramené à 1 m des lignes. D'un cercle à y ∈ [1, 14], il y a
   toujours au moins un sens où le but tient entre 6 et 10 m et à 1,5 m du bout : la partie va et vient sur la piste. */
function cercleDepuis(p) {
  const lo = P.CERCLE_MARGE * 1000, cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  return { x: cl(p.x, lo, W_MM - lo), y: cl(p.y, lo, L_MM - lo) };
}
/** Une position (mm) est-elle un but valable depuis le cercle de la mène `m` ? */
export function butValide(m, x, y) {
  const dx = x - m.cercle.x, dy = y - m.cercle.y, d2 = dx * dx + dy * dy, a = P.BUT_MIN * 1000, b = P.BUT_MAX * 1000;
  return d2 >= a * a && d2 <= b * b && x >= P.BUT_COTE * 1000 && x <= W_MM - P.BUT_COTE * 1000 &&
         y >= P.BUT_FOND * 1000 && y <= L_MM - P.BUT_FOND * 1000;
}
export function campDe(s, pid) {
  for (let c = 0; c < s.camps.length; c++) if (s.camps[c].joueurs.includes(pid)) return c;
  return -1;
}
export function resteCamp(s, c) {
  let n = 0;
  for (const j of s.camps[c].joueurs) n += s.mene.reste[j];
  return n;
}
const d2But = (m, q) => { const dx = q.x - m.but.x, dy = q.y - m.but.y; return dx * dx + dy * dy; };
/** La meilleure distance au but (mm², entière) de chaque camp ; Infinity pour un camp sans boule vivante. */
export function meilleures(s) {
  const m = s.mene, best = s.camps.map(() => Infinity);
  if (!m.but) return best;
  for (const q of m.boules) if (!q.mort) { const d = d2But(m, q); if (d < best[q.camp]) best[q.camp] = d; }
  return best;
}
/** Qui tient le point (−1 : personne, ou égalité) et de combien d'avance (m) sur le suivant — pour l'écran et la
    mesure (lot 5 : quand l'avance tient en quelques centimètres, on sort le mètre). */
export function point(state) {
  const best = meilleures(state);
  let c = -1, b1 = Infinity, b2 = Infinity;
  for (let k = 0; k < best.length; k++) {
    if (best[k] < b1) { b2 = b1; b1 = best[k]; c = k; } else if (best[k] < b2) b2 = best[k];
  }
  if (b1 === Infinity || b1 === b2) return { camp: -1, avance: 0 };
  return { camp: c, avance: b2 === Infinity ? Infinity : (Math.sqrt(b2) - Math.sqrt(b1)) / 1000 };
}

/* L'ORDRE DE JEU. Le camp qui a lancé le but joue la première boule. Ensuite, parmi les camps qui ont encore des
   boules, ce n'est jamais celui qui tient le point qui joue, mais le PLUS LOIN du but (à deux, c'est simplement
   « l'équipe qui n'a pas le point » ; à trois chacun pour soi, c'est la règle de comptoir). Si personne d'autre n'a de
   boule, celui qui tient le point joue les siennes. Égalité au point : le camp qui vient de jouer rejoue (le
   règlement) ; aucune boule au sol des deux côtés : on tourne. */
function campSuivant(s) {
  const m = s.mene, nc = s.camps.length;
  if (m.boules.length === 0) return m.butLanceur;
  const best = meilleures(s), cand = [];
  for (let c = 0; c < nc; c++) if (resteCamp(s, c) > 0) cand.push(c);
  if (!cand.length) return -1;
  const pt = point(s).camp, pool = cand.filter((c) => c !== pt);
  if (!pool.length) return pt;
  let loin = -1;
  for (const c of pool) if (best[c] > loin) loin = best[c];
  const ex = pool.filter((c) => best[c] === loin);
  if (ex.length === 1) return ex[0];
  if (loin !== Infinity && ex.includes(m.dernier)) return m.dernier;
  for (let k = 1; k <= nc; k++) { const c = (m.dernier + k + nc) % nc; if (ex.includes(c)) return c; }
  return ex[0];
}
/** À qui de jouer, et quoi : `{ phase: "but" | "placer" | "boule", camp, joueurs }`, ou `null` (partie finie). */
export function aQui(state) {
  const s = avancer(state);
  if (s.gagnant !== null) return null;
  const m = s.mene;
  if (!m.but) {
    if (m.essais < P.BUT_ESSAIS) return { phase: "but", camp: m.butLanceur, joueurs: s.camps[m.butLanceur].joueurs.slice() };
    const c = (m.butLanceur + 1) % s.camps.length;
    return { phase: "placer", camp: c, joueurs: s.camps[c].joueurs.slice() };
  }
  const c = campSuivant(s);
  if (c < 0) return null;
  return { phase: "boule", camp: c, joueurs: s.camps[c].joueurs.filter((j) => m.reste[j] > 0) };
}

/** L'arbitre : `null` si `pid` peut jouer `input` maintenant, sinon la raison. C'est la seule porte de l'hôte. */
export function verifier(state, pid, input) {
  if (!input || typeof input !== "object") return "entree";
  const s = avancer(state);
  if (s.gagnant !== null) return "partie-finie";
  if (input.coup !== s.coups) return "coup";
  const q = aQui(s);
  if (!q) return "fini";
  if (!q.joueurs.includes(pid)) return "pas-ton-tour";
  const g = input.geste;
  if (q.phase === "but" ? g !== "but" : q.phase === "placer" ? g !== "placer" : !GESTES_BOULE.includes(g)) return "geste";
  const d = input.donnee;
  if (!d || !Number.isInteger(d.x) || !Number.isInteger(d.y) || d.x < 0 || d.y < 0 || d.x > W_MM || d.y > L_MM) return "donnee";
  if (g === "placer") return butValide(s.mene, d.x, d.y) ? null : "donnee";
  const dx = d.x - s.mene.cercle.x, dy = d.y - s.mene.cercle.y, dm = P.DONNEE_MIN * 1000;
  if (dx * dx + dy * dy < dm * dm) return "donnee";
  if (!Number.isInteger(input.err) || input.err < -1000 || input.err > 1000) return "err";
  if (g === "but" && !(Number.isInteger(input.lourd) && input.lourd >= 0 && input.lourd < P.LOURD.length)) return "lourd";
  return null;
}

/** L'état après le lancer que `sim` a joué jusqu'au bout (`simFinir`). Pur : l'état reçu n'est pas touché. */
export function conclure(state, pid, input, sim) {
  const s = copie(avancer(state)), m = s.mene, camp = campDe(s, pid), st = s.stats[pid];
  s.coups++;
  if (input.geste === "placer") { m.but = { x: input.donnee.x, y: input.donnee.y }; m.place = camp; return s; }
  st.lancers++;
  const cs = sim.corps;
  if (input.geste === "but") {
    const b = cs[0], x = mm(b.x), y = mm(b.y);
    m.lourd = sim.lourd;
    if (b.vivant && butValide(m, x, y)) m.but = { x, y }; else m.essais++;
    return s;
  }
  const b0 = cs[0];
  if (!b0.vivant) { m.butMort = true; m.butAvant = m.but; }
  m.but = { x: mm(b0.x), y: mm(b0.y) };
  for (let k = 0; k < m.boules.length; k++) {
    const c = cs[k + 1], q = m.boules[k];
    q.x = mm(c.x); q.y = mm(c.y);
    if (!c.vivant) q.mort = true;
  }
  const moi = cs[cs.length - 1];
  m.boules.push({ x: mm(moi.x), y: mm(moi.y), camp, j: pid, mort: !moi.vivant });
  m.reste[pid]--;
  m.dernier = camp;
  if (input.geste === "tir") {
    st.tirs++;
    if (sim.fer > 0 && !cs[sim.fer].but && cs[sim.fer].camp !== camp) st.fers++;
    if (sim.carreau) { st.carreaux++; s.faits.push({ t: "carreau", j: pid, mene: m.n }); }
  }
  let reste = 0;
  for (let c = 0; c < s.camps.length; c++) reste += resteCamp(s, c);
  if (m.butMort || reste === 0) finirMene(s);
  return s;
}

/** Le compte de la mène en cours, telle qu'elle est (le lot 3 le montre en direct ; `finirMene` l'arrête). */
export function compter(state) {
  const s = state, m = s.mene, nc = s.camps.length;
  if (m.butMort) {
    // Le but sorti : si un seul camp a encore des boules en main, il marque autant de points ; sinon, mène nulle.
    // ⚠️ La page disait « le cochonnet sorti annule la mène » ; le règlement ajoute ce cas, et sans lui le camp qui
    // perd la mène sortirait le but pour l'annuler alors que l'autre n'a plus rien à jouer.
    const avec = [];
    for (let c = 0; c < nc; c++) if (resteCamp(s, c) > 0) avec.push(c);
    if (avec.length === 1) return { nulle: false, gagnant: avec[0], points: resteCamp(s, avec[0]), raison: "but-mort" };
    return { nulle: true, gagnant: -1, points: 0, raison: "but-mort" };
  }
  const best = meilleures(s), pt = point(s);
  if (pt.camp < 0) return { nulle: true, gagnant: -1, points: 0, raison: best.every((b) => b === Infinity) ? "aucune-boule" : "egalite" };
  let second = Infinity;
  for (let c = 0; c < nc; c++) if (c !== pt.camp && best[c] < second) second = best[c];
  let points = 0;
  for (const q of m.boules) if (!q.mort && q.camp === pt.camp && d2But(m, q) < second) points++;
  return { nulle: false, gagnant: pt.camp, points, raison: "point" };
}
function finirMene(s) {
  const m = s.mene, r = compter(s);
  m.fini = r;
  if (!r.nulle) s.camps[r.gagnant].score += r.points;
  s.historique.push({ n: m.n, gagnant: r.gagnant, points: r.points, raison: r.raison });
  if (s.mode !== "solo") for (let c = 0; c < s.camps.length; c++) if (s.camps[c].score >= s.cible) s.gagnant = c;   // l'entraînement ne finit pas
  if (s.gagnant !== null) {
    // Fanny : un perdant à zéro. La boîte à volet ne s'ouvre que pour ça (lot 5), la gazette le raconte.
    const perdants = [];
    for (let c = 0; c < s.camps.length; c++) if (c !== s.gagnant && s.camps[c].score === 0) perdants.push(c);
    if (perdants.length) { s.fanny = true; s.faits.push({ t: "fanny", camps: perdants, mene: m.n }); }
  }
}
/** L'état prêt pour le lancer suivant : si la mène est finie (et pas la partie), la suivante, son cercle tracé là où
    le but a fini. Les boules ramassées entre les deux (l'aimant, lot 5) sont du dessin : rien ne les attend ici. */
export function avancer(state) {
  if (!state.mene.fini || state.gagnant !== null) return state;
  const s = copie(state), m = s.mene;
  const lanceur = m.fini.nulle ? m.butLanceur : m.fini.gagnant;
  s.mene = nouvelleMene(s, m.n + 1, lanceur, cercleDepuis(m.butMort ? m.butAvant : m.but));
  return s;
}

/** Tout en un, pour l'hôte et pour les bancs : `{ raison }` ou `{ s, sim }`, `s` étant l'état d'après. */
export function jouer(state, pid, input) {
  const p = preparer(state, pid, input);
  if (p.raison) return p;
  if (p.sim) simFinir(p.sim);
  return { s: conclure(state, pid, input, p.sim), sim: p.sim };
}

/** Une empreinte de l'état (32 bits) : le filet du réseau — le client compare la sienne à celle de l'hôte. */
export function empreinte(state) {
  const t = JSON.stringify(state);
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
