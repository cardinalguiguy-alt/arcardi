/* =============================================================================
   monture.js — LES MONTURES DU SKATEPARK (2026-10-11), PUR : LEUR PHYSIQUE.
   -----------------------------------------------------------------------------
   Guillaume : « la physique du skatepark doit être ULTRA soignée — je veux être autant bluffé que pour la patinoire » ;
   « un skate, des rollers (physique comparable aux patins mais pas la même), une trottinette et un BMX » ; « priorité
   jouabilité, effet bluffant et réaliste » ; figures libres, « plaisir du mouvement primordial ».

   ⚠️⚠️ CE QUI FAIT UNE MONTURE À ROUES, ET PAS UN PATIN (`patin.js`) :
     · UNE ROUE NE GLISSE PAS DE CÔTÉ. Le patin est un point qui file où on le pousse ; une planche, une trottinette, un vélo,
       des rollers vont où ils POINTENT. L'état est donc un CAP (`th`) et une vitesse LE LONG de ce cap (`u`, signée : négative,
       on roule en arrière — le fakie). Tourner, c'est faire tourner le cap, à un rayon que la vitesse borne ;
     · LA GRAVITÉ SUR LA PENTE : la composante de g le long du cap, sur la surface (`skatepark.js`, analytique et continue)
       accélère dans la descente et freine à la montée — on monte une courbe avec son élan, on en redescend ;
     · LE POMPAGE : dans une courbe creuse, le corps est PRESSÉ (l'accélération normale u²κ s'ajoute à g). Se déplier à ce
       moment-là (la touche de poussée, tenue dans la courbe) rend de l'énergie : c'est comme ça qu'on monte de plus en plus haut
       dans une mini-rampe sans jamais poser le pied — et ça ne marche QUE dans le creux ;
     · LE DÉCOLLAGE N'EST PAS UN BOUTON : on quitte le sol quand la surface se dérobe plus vite que la chute libre (la lèvre d'un
       tremplin, le bord d'une caisse, le coping d'une courbe). Au coping, la vitesse vers la plateforme est presque toute rendue
       à la verticale (« l'aide du vert », comme tous les jeux de skate : on retombe DANS la courbe) ;
     · LA RÉCEPTION : l'écart entre le cap et la trajectoire, et le choc normal à la surface — trop de travers, trop dur, on
       tombe. Un skate et des rollers retombent aussi bien en arrière (fakie) ; une trottinette et un BMX doivent avoir fait leur
       demi-tour en l'air, sinon c'est la chute : c'est TOUTE la différence de jeu dans une courbe.
   ⚠️ LES QUATRE MONTURES NE SONT PAS QUATRE RÉGLAGES DE LA MÊME POUSSÉE (`VEH`) : le skate pousse par COUPS DE PIED (des
   impulsions, une cadence), la trottinette aussi mais plus efficaces, les rollers par FOULÉES continues (la lignée du patin,
   mais roulantes : la lancée dure moins, les carres sont des roues qui tiennent — virages très serrés, aucune dérive), le BMX
   PÉDALE (un couple : arrache fort, plafonne à sa démultiplication). Freins, rayons, rotations en l'air, tolérances : tout diffère.
   ⚠️ UNITÉS : cases (≈ 1,15 m), secondes. `G` est réglée pour que les temps en l'air soient ceux d'un vrai park (un air de 70 cm
   au-dessus du coping ≈ 0,7 s). Pas fixe interne (`STEP`) : le résultat ne dépend pas de la cadence d'images.
   ⚠️ AUCUN TIRAGE, AUCUNE HORLOGE : `dt` est passé, l'état est rendu. Le réseau ne verra que la position, le cap, la hauteur en
   l'air et le code de figure (§3) — la pose se DÉDUIT.
   `tools/verify-monture.mjs` le JOUE : poussée, roue libre, pompage dans la mini-rampe, air au quarter (skate en fakie, BMX qui
   tombe sans demi-tour et retombe avec), saut de la funbox, ollie, choc contre un flanc, conservation de l'énergie.
   ========================================================================== */
import * as SP from "./skatepark";

/* ⚠️ 2026-10-11 — 9,8 cases/s² (≈ 11 m/s², à peine plus que la vraie) : à 11 (premier jet), il fallait 6,5 cases/s au pied du
   quarter pour en sortir, plus que n'en donne une bonne poussée — on ne voyait jamais d'air en jeu sans pomper longtemps. */
export const G = 9.8;         // cases/s²
const STEP = 1 / 240;         // s : le pas interne
/* ⚠️ La courbure (pompage, frottement) s'échantillonne à 3 cm DEVANT : à 7 cm (premier jet), l'échantillon passait la lèvre
   du coping avant le rider, la courbure devenait très négative, et l'on « décollait » 25 cm sous le coping — un air raboté
   d'un tiers, et sur la funbox un décollage avant la lèvre qui retombait aussitôt sur son propre tremplin. Le DÉCOLLAGE, lui,
   ne lit plus la courbure : seule la trajectoire balistique comparée au relief du pas suivant en décide. */
const SAMPLE = 0.025;         // cases
const PUMP_BODY = 0.26;       // cases : le déplié du corps quand on pompe (≈ 30 cm)
const PUMP_NMAX = 1.4;        // × g : ce que les jambes poussent au plus

/* ── LES QUATRE MONTURES ──
   push : "kick" (coups de pied : `kickT` la cadence, `kickDv` le gain d'un coup à l'arrêt, fondant jusqu'à `vPush`), "stride"
          (foulées continues, `acc`), "pedal" (couple : `acc` à l'arrêt, nul à `vPush`).
   crr : la résistance au roulement (× la force normale) ; drag : l'air. brake : la décélération du frein.
   rMin : le rayon de virage le plus serré en roulant (cases) ; pivot : la rotation sur place à l'arrêt (rad/s) — le kick-turn du
          skate, le guidon de la trottinette ; lowV : sous cette vitesse, on pivote au lieu de tourner.
   spin : la rotation en l'air (rad/s). landTol : l'écart cap/trajectoire admis à la réception (rad) ; fakie : retomber en arrière
          est-il une réception ? impact : le choc normal admis (cases/s) ; stepUp : la marche qu'on avale en roulant (cases).
   ollie : la vitesse verticale d'un saut [non chargé, chargé] (cases/s) ; chargeT : le temps pour charger.
   pump : le rendement du pompage. */
export const VEH = {
  skate: {
    push: "kick", kickT: 0.6, kickDv: 1.35, vPush: 6.8, crr: 0.016, drag: 0.007, brake: 3.4,
    rMin: 1.0, pivot: 6.5, lowV: 0.9, spin: 9.5, landTol: 0.55, fakie: true, impact: 6.2, stepUp: 0.04,
    ollie: [2.15, 3.2], chargeT: 0.32, pump: 0.52, fallLean: 0.55,
  },
  roller: {
    push: "stride", acc: 3.5, vPush: 6.9, crr: 0.026, drag: 0.007, brake: 2.7,
    rMin: 0.55, pivot: 8, lowV: 0.7, spin: 12.5, landTol: 0.68, fakie: true, impact: 5.7, stepUp: 0.05,
    ollie: [2.2, 3.1], chargeT: 0.26, pump: 0.57, fallLean: 0.35,
  },
  scooter: {
    push: "kick", kickT: 0.5, kickDv: 1.5, vPush: 7.0, crr: 0.03, drag: 0.007, brake: 5.6,
    rMin: 0.7, pivot: 5, lowV: 0.8, spin: 10.5, landTol: 0.5, fakie: false, impact: 6.2, stepUp: 0.04,
    ollie: [2.0, 2.95], chargeT: 0.3, pump: 0.47, fallLean: 0.45,
  },
  bmx: {
    push: "pedal", acc: 6.4, vPush: 7.6, crr: 0.014, drag: 0.008, brake: 7.2,
    rMin: 1.25, pivot: 3, lowV: 0.7, spin: 7.2, landTol: 0.46, fakie: false, impact: 7.6, stepUp: 0.13,
    ollie: [2.3, 3.4], chargeT: 0.36, pump: 0.5, fallLean: 0.65,
  },
};
export const VEH_KINDS = ["skate", "roller", "scooter", "bmx"];
/* ── LA LOCATION (la cabane du park) : ce qui s'ajoute au prix de base (`RIDE_RENT_PRICE`), et le choix normalisé — la monture et sa
   couleur (l'indice voyage, pas le nom ; `RIDE_COLOR_N` couleurs, celles de `BOARD_COLORS`, montureArt.js). ⚠️ Un sac ancien ou un
   paquet tronqué retombe sur un skate de la première couleur : jamais un objet à moitié valide. */
export const RIDE_KIT = { skate: { extra: 0 }, roller: { extra: 0 }, scooter: { extra: -10 }, bmx: { extra: 30 } };
export const RIDE_COLOR_N = 6;
export function rideKitNorm(k) {
  const kind = k && VEH[k.kind] ? k.kind : "skate";
  const c = k && Number.isFinite(+k.color) ? (+k.color | 0) : 0;
  return { kind, color: c >= 0 && c < RIDE_COLOR_N ? c : 0 };
}
export function rideKitPrice(k, base) { return (base | 0) + RIDE_KIT[rideKitNorm(k).kind].extra; }
/* ── LES GLISSES ET LES FIGURES, PAR MONTURE ──
   grindK : le frottement d'une glisse (cases/s²) ; styles : ce qu'elle sait faire sur une ligne — "5050" (dans l'axe : les
   trucks du skate, les PEGS du BMX, le plateau de la trottinette), "board" (le skate EN TRAVERS : le boardslide), "soul" (les
   rollers en travers, la platine sur l'arête). tricks : la touche de figure (V) et la seconde (G) — leur durée, ce qu'elles
   font tourner (le plateau sur son grand axe `roll`, sur lui-même `yaw`, le guidon `bar`, le cadre `whip`). Une figure
   PAS FINIE à la réception, c'est la chute. */
const GRINDS_BY = {
  skate: { grindK: 1.15, styles: ["5050", "board"] },
  roller: { grindK: 1.45, styles: ["soul", "5050"] },
  scooter: { grindK: 1.3, styles: ["5050"] },
  bmx: { grindK: 1.0, styles: ["5050"] },
};
export const TRICKS = {
  skate: { v: { name: "kickflip", dur: 0.42, roll: 1, yaw: 0 }, g: { name: "popShove", dur: 0.36, roll: 0, yaw: 0.5 }, vg: { name: "varialFlip", dur: 0.5, roll: 1, yaw: 0.5 }, gv: { name: "treFlip", dur: 0.62, roll: 1, yaw: 1 } },
  roller: { v: { name: "mistyGrab", dur: 0.5, grab: 1 }, g: { name: "muteGrab", dur: 0.45, grab: 1 } },
  scooter: { v: { name: "barspin", dur: 0.4, bar: 1 }, g: { name: "tailwhip", dur: 0.5, whip: 1 }, vg: { name: "whipBar", dur: 0.62, bar: 1, whip: 1 } },
  bmx: { v: { name: "barspin", dur: 0.45, bar: 1 }, g: { name: "tailwhip", dur: 0.6, whip: 1 }, vg: { name: "whipBar", dur: 0.75, bar: 1, whip: 1 } },
};
/* ⚠️ 2026-10-13 (soir) — `LOOSE` : l'accroche d'une ligne prise entre l'axe et le travers. Premier jet : entre 42° (`ALIGN`) et 60°
   (`CROSS`), aucun style ne prenait — on retombait SUR le rail, et c'était la chute. Le skate et les rollers (deux styles) prennent le
   plus proche ; la trottinette et le BMX (le 50-50 seul) s'accrochent jusqu'à 53°. */
const GRIND = { SNAP: 0.17, ALIGN: 0.74, CROSS: 0.5, LOOSE: 0.6, MIN_V: 0.9, END_POP: 0.6 };
/* Le NOM des figures et des glisses, tel qu'on le crie dans tous les skateparks du monde (en anglais, dans les deux langues du
   jeu : un nom propre, pas une traduction — `verify-strings` refuse à raison une section identique dans les deux tables). */
export const TRICK_LABEL = { kickflip: "Kickflip", popShove: "Pop shove-it", varialFlip: "Varial flip", treFlip: "360 flip", mistyGrab: "Misty grab", muteGrab: "Mute grab", barspin: "Barspin", tailwhip: "Tailwhip", whipBar: "Tailwhip barspin", g5050: "50-50", gboard: "Boardslide", gsoul: "Soul grind", gpegs: "Pegs" };
export const BAIL_T = 1.1;          // s au sol après une chute (1,4 au premier jet : 2026-10-13 soir, « les échecs rares » — et courts)
const VERT_SLOPE = 1.6;             // pente (≈ 58°) au-delà de laquelle un décollage est un « air de courbe »
const RIDE_RX = SP.RIDE_TORSO_R;    // cases : la demi-largeur du corps d'un rider vu de face (contre un flanc à côté de lui)
/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-13 (soir) — LES CHUTES RARES. Guillaume : « le rendu final devra être fluide, les échecs rares » — « le but est une
   ║ fluidité et un côté fun pour le joueur ».
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️ MESURÉ AVANT (une sonde de « joueur plausible » : il vise les modules et les lignes, pousse, saute, lance une figure dans un air
   sur deux, garde la flèche qu'il tenait) : 6 à 10 CHUTES PAR MINUTE. Trois causes faisaient presque tout :
     · LA ROTATION EN L'AIR SANS LE VOULOIR (3 à 4/min). Gauche/droite FAISAIENT TOURNER : qui roulait vers l'est en tenant → et
       sautait tournait de ~270° pendant l'ollie. → En l'air, la flèche VISE UN CAP (la monture tourne vers elle et s'y arrête) ;
       la flèche qu'on tenait au décollage n'est pas un ordre ; sans ordre, la monture S'ALIGNE SUR SA RÉCEPTION (`predictLanding`)
       — le demi-tour du BMX et de la trottinette au quarter se fait seul (décision de Guillaume, 2026-10-13). Un 180 : l'opposé ;
       un 360 : le tour des flèches (ou du pavé tactile) ;
     · LA FIGURE PAS FINIE (2 à 3,7/min) : lancée tard, elle tournait encore à la réception. → Elle se PRESSE pour tenir dans l'air
       qui reste (jusqu'à `TRICK_FAST` × plus vite), ne part pas s'il n'y a plus le temps, et finie aux 4/5 elle se rattrape ;
     · LES CHOCS (3 à 4/min) : contre un flanc ou une barrière, la chute dès 3,6 c/s, même en biais. → On LONGE l'obstacle (la
       vitesse qui y entrait est perdue, le reste suit le mur) ; on ne tombe que de face et lancé (`HIT_FALL`, `AIR_FALL`).
   Et la réception de travers ou dure, jusqu'à `LAND_CATCH` de plus que la tolérance, se RATTRAPE : le cap se remet dans la
   trajectoire, on perd de la vitesse, les genoux plient plus longtemps (`landed.sketchy`). `tools/verify-skatepark.mjs` compte les
   chutes de ce même joueur plausible, sous un plafond. */
const HIT_FALL = 5.6;      // c/s DANS l'obstacle, au sol, au-delà de laquelle on tombe (≈ 6,4 m/s : de face, à fond de poussée)
const AIR_FALL = 4.4;      // c/s dans l'obstacle, en l'air
const LAND_CATCH = 0.45;   // rad de travers rattrapables au-delà de `landTol`
const IMPACT_CATCH = 1.3;  // × `impact` : le choc qu'on absorbe encore, genoux au sol
const TRICK_FAST = 1.8;    // une figure se presse au plus de ce facteur (un kickflip en 0,23 s : un vrai kickflip dure ~0,3 s)
const TRICK_DONE = 0.8;    // la part d'une figure qui suffit à la réception (le reste se rattrape)
const TRICK_BUFFER = 0.22; // s : un appui de figure trop tôt (au décollage, au sol pendant la charge) est gardé, pas perdu
const LIP_ASSIST = 0.14;   // cases : un flanc dont le dessus est à moins de ça au-dessus de la planche, en l'air, on s'y pose
const RAIL_LIFT = 0.12;    // cases : un rail frôlé à moins de ça sous son dessus, en l'air, on passe
/* La demi-longueur du véhicule le long du cap (cases), contre les tubes : la planche (80 cm), la trottinette roue à roue, le BMX
   d'un pneu à l'autre, les rollers une bottine. ⚠️ Ce sont les mesures du dessin (`montureArt.js` : `BL`, les roues à ± 0,27, celles
   du BMX à ± 0,42 de rayon 0,21) : le jour où l'un change, l'autre suit. */
export const RIDE_HALF = { skate: 0.35, roller: 0.12, scooter: 0.3, bmx: 0.62 };
/* Sa hauteur, du bas des roues (cases) : le plateau de la planche, la bottine des rollers, le plateau de la trottinette, le haut des
   roues de 20 pouces du BMX. */
export const RIDE_TALL = { skate: 0.11, roller: 0.2, scooter: 0.11, bmx: 0.42 };
const rideHalf = (st) => RIDE_HALF[st.kind] || 0.3;
const rideTall = (st) => RIDE_TALL[st.kind] || 0.12;
/* Le jeu du rider contre les tubes, à (x, y, z) et au cap `th` — `half` 0 : le torse seul (à terre, le véhicule a filé). */
const clearAt = (st, x, y, z, th, half, gr, skip) => SP.rideClear(x, y, z, th, half, gr, skip, rideTall(st)).c;

const S0 = {}, S1 = {};
function surf(x, y, o) {
  const s = SP.parkSurf(x, y, o);
  if (s) return s;
  o.h = 0; o.gu = 0; o.gv = 0; o.mat = ""; o.prim = -1;
  return o;
}
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

/* Une monture neuve, posée en (x, y) — les PIEDS, en cases de la ville — cap `th` (rad, 0 = est, π/2 = sud). */
export function rideNew(kind, x, y, th) {
  return {
    kind: VEH[kind] ? kind : "skate", x, y, z: SP.heightAt(x, y), th: th || 0, u: 0,
    mode: "ground", vx: 0, vy: 0, vz: 0, t: 0, acc: 0,
    kickT: 0, kick: 0, stride: 0, charge: 0, wasJump: false, spin: 0, spinT: 0, airT: 0,
    lean: 0, pumpK: 0, brake: 0, landed: null, bailed: null, bump: 0, fakie: false, lastAir: 0,
    trick: null, tricksDone: null, wasTrk: false, wasTrk2: false, noGrindT: 0, g: null, grinded: null, grindDone: null, flipped: null, dist: 0,
  };
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ UN PAS — `inp` : { ix, iy } (l'ordre, unitaire ou nul, en axes du monde), `push` (la touche de poussée / pompage, tenue),
   ║ `jump` (la touche de saut, tenue : on charge, on lâche, on saute), `stop` (frein franc, tenu).
   ╚════════════════════════════════════════════════════════════════════════════
   Mute `st` et le rend. `st.landed` (un pas) : la réception qui vient d'avoir lieu, `{ air, spin, fakie, hard }` ; `st.bailed`
   (un pas) : la chute, `{ why }`. */
export function rideStep(st, inp, dt) {
  st.landed = null; st.bailed = null; st.grinded = null; st.grindDone = null; st.flipped = null; st.gateHit = false;
  if (st.landT > 0) st.landT = Math.max(0, st.landT - dt);
  st.acc += Math.min(0.1, Math.max(0, dt));
  while (st.acc >= STEP) { st.acc -= STEP; step1(st, inp || {}, STEP); }
  /* 2026-10-13 (soir) — LE CAP DESSINÉ (`thV`) : il suit le cap à la lettre tant que celui-ci TOURNE (moins de `VIS_TURN` rad/s, au-dessus
     de toute rotation de monture), et rattrape en quelques images ce qui CLAQUE d'un pas à l'autre — l'accroche d'une glisse, la
     réception rattrapée, l'obstacle qu'on longe. Premier jet : le sprite sautait de 60° d'une image à l'autre. Le dessin seul le lit. */
  const d = st.thV == null ? 0 : wrap(st.th - st.thV), m = VIS_TURN * Math.max(0, dt);
  st.thV = st.thV == null || Math.abs(d) <= m ? st.th : wrap(st.thV + Math.sign(d) * m);
  return st;
}
const VIS_TURN = 20;   // rad/s

function step1(st, inp, dt) {
  const V = VEH[st.kind];
  st.t += dt;
  st.bump = Math.max(0, st.bump - dt);
  if (st.mode === "bail") { bailStep(st, dt); return; }
  // la charge du saut : on la tient, elle monte ; on la lâche au sol, on saute
  if (inp.jump) st.charge = Math.min(1, st.charge + dt / V.chargeT);
  const release = st.wasJump && !inp.jump;
  st.wasJump = !!inp.jump;
  // les touches de figure : on ne garde que l'APPUI (un front), comme l'ollie garde le relâché
  let trkV = inp.trick && !st.wasTrk, trkG = inp.trick2 && !st.wasTrk2;
  st.wasTrk = !!inp.trick; st.wasTrk2 = !!inp.trick2;
  /* 2026-10-13 (soir) — LE TAMPON : un appui de figure qui arrive trop tôt (pendant la charge du saut, au décollage, encore collé au
     sol) est GARDÉ `TRICK_BUFFER` s et rejoué dès qu'il peut partir. Premier jet : il était perdu — Espace puis V tout de suite,
     le geste le plus naturel au clavier comme au doigt, ne faisait rien. */
  if (trkV || trkG) st.trickQ = { v: trkV, g: trkG, t: TRICK_BUFFER };
  else if (st.trickQ && !(st.mode === "ground" && inp.jump) && (st.trickQ.t -= dt) <= 0) st.trickQ = null;
  if (st.noGrindT > 0) st.noGrindT -= dt;
  if (st.mode === "grind") { st.trickQ = null; grindStep(st, V, inp, dt, release); if (!inp.jump) st.charge = 0; return; }
  if (st.mode === "air") {
    if (st.trickQ && trickInput(st, st.trickQ.v, st.trickQ.g)) st.trickQ = null;
    trickStep(st, dt); airStep(st, V, inp, dt); if (!inp.jump) st.charge = 0; return;
  }
  if (st.trickQ && !inp.jump && !release) st.trickQ = null;   // au sol, seul l'appui PENDANT la charge attend le saut
  groundStep(st, V, inp, dt, release);
  if (!inp.jump) st.charge = 0;
}

/* ── AU SOL ── */
function groundStep(st, V, inp, dt, release) {
  const s = surf(st.x, st.y, S0);
  const c = Math.cos(st.th), sn = Math.sin(st.th);
  const p = s.gu * c + s.gv * sn;                 // la pente le long du cap
  const q = -s.gu * sn + s.gv * c;                // la pente en travers (vers la gauche du cap)
  const k1 = 1 / Math.sqrt(1 + p * p);
  const dir = st.u >= 0 ? 1 : -1;
  // La courbure le long de la trajectoire (rad/case), échantillonnée DANS LE SENS DU MOUVEMENT.
  const s2 = surf(st.x + c * dir * SAMPLE, st.y + sn * dir * SAMPLE, S1);
  const p2 = s2.gu * c + s2.gv * sn;
  const kappa = (Math.atan(dir * p2) - Math.atan(dir * p)) / (SAMPLE / k1);
  const N = G * k1 / Math.sqrt(1 + q * q) + st.u * st.u * kappa;    // l'accélération normale (le poids ressenti)
  // ── la gravité le long du cap, le roulement, l'air
  let a = -G * p * k1;
  a -= Math.sign(st.u) * (V.crr * Math.max(0, N) + V.drag * st.u * st.u);
  // ── l'ordre : où il pointe par rapport au sens de la marche
  const travel = st.th + (st.u < 0 ? Math.PI : 0);
  let want = null, dot = 0, sideErr = 0;
  if (inp.ix || inp.iy) {
    want = Math.atan2(inp.iy, inp.ix);
    sideErr = wrap(want - travel);
    dot = Math.cos(sideErr);
  }
  const speed = Math.abs(st.u);
  const flat = Math.abs(p) < 0.2 && Math.abs(q) < 0.25;
  const curved = kappa > 0.25;   // un creux (le pied d'une courbe compris : c'est là que le pompage rend le plus)
  st.brake = 0; st.pumpK = 0;
  // ── frein : la touche de frein, ou l'ordre à contresens quand on roule (à l'arrêt, l'ordre à contresens fait pivoter)
  if ((inp.stop || (want != null && dot < -0.55)) && speed > Math.max(0.15, V.lowV * 0.8)) {
    const b = V.brake * (inp.stop ? 1 : 0.8);
    st.brake = inp.stop ? 2 : 1;
    const nu = Math.max(0, speed - b * dt);
    st.u = Math.sign(st.u) * nu;
  } else if (curved && inp.push && speed > 0.2) {
    /* ── LE POMPAGE. Se déplier dans le creux, c'est pousser contre le poids RESSENTI (la gravité plus l'accélération
       centripète, `N`) sur la hauteur du corps qui se tend (`PUMP_BODY`) : l'énergie gagnée par seconde est ce travail, au rythme
       où l'on traverse la courbe (|u|·κ). Elle est grande au pied d'une courbe prise vite, nulle sur le plat, faible tout en
       haut (le poids s'y efface) — on pompe AU CREUX, comme un vrai rider. */
    /* ⚠️ La force des jambes PLAFONNE (`PUMP_NMAX` × g) : sans ce plafond, le gain croissait avec la vitesse (le poids ressenti
       monte en u²κ) et l'on finissait à deux mètres au-dessus d'une mini-rampe. Plafonné, le gain par passage est à peu près
       constant, les pertes (roulement, air) grandissent avec la vitesse : un équilibre s'installe, un peu au-dessus du coping. */
    const P = V.pump * Math.min(Math.max(0, N), PUMP_NMAX * G) * speed * kappa * PUMP_BODY;
    st.u += Math.sign(st.u) * (P / speed) * dt;
    st.pumpK = Math.min(1, kappa * speed * 0.15);
  } else if (want != null && dot > 0.35 && flat) {
    /* ── la poussée : l'ordre DEVANT soi, sur le plat (dans une courbe, les pieds restent sur la planche). Maj tenue : on
       pousse plus fort et plus souvent (la course de la marche, comme au patin). */
    const fwd = st.u < -0.2 && V.fakie ? -1 : 1;   // en fakie, un skate pousse en arrière (« pousser mongo » : on l'accepte)
    const boost = inp.push ? 1.25 : 1;
    if (V.push === "kick") {
      st.kickT -= dt * boost;
      const top = V.vPush * (inp.push ? 1.06 : 0.86);
      if (st.kickT <= 0 && speed < top) {
        st.kickT = V.kickT * (0.85 + 0.3 * speed / V.vPush);
        const gain = V.kickDv * boost * Math.max(0, 1 - speed / top) ** 0.6;
        st.u += fwd * gain; st.kick = 1;
      }
    } else {
      const top = V.vPush * (inp.push ? 1.08 : 1);
      if (speed < top) st.u += fwd * V.acc * boost * (1 - speed / top) * dt;
      st.stride += dt * (1.4 + 0.25 * speed) * (inp.push ? 1.2 : 1);
    }
  }
  st.kick = Math.max(0, st.kick - dt * 3.2);
  if (st.kickT > 0 && !inp.push) st.kickT = Math.max(0, st.kickT - dt);
  st.u += a * dt;
  if (Math.abs(st.u) < 0.04 && want == null && Math.abs(p) < 0.05) st.u = 0;   // ⚠️ `want` vaut 0 vers l'est : `!want` arrêtait tout
  // ── le cap : vers l'ordre, à un rayon que la vitesse borne ; à l'arrêt, on pivote
  let om = 0;
  if (want != null && (dot >= -0.55 || speed < V.lowV)) {
    // à l'arrêt, on pivote vers l'ordre (le skate fait son kick-turn), et c'est le NEZ qui se tourne, pas le sens de la marche
    const err = wrap(want - (speed < V.lowV ? st.th : travel));
    const omMax = speed < V.lowV ? V.pivot : Math.min(V.pivot, speed / V.rMin);
    om = Math.max(-omMax, Math.min(omMax, err * 7));
  }
  // la pente en travers fait tourner vers le bas (la planche couchée sur un mur s'y laisse tomber) — un carve
  if (speed > 0.3 && Math.abs(q) > 0.05) om += V.fallLean * (-G * q / Math.sqrt(1 + q * q)) / Math.max(1.2, speed) * (st.u >= 0 ? 1 : -1);
  st.th = turnTo(st, wrap(st.th + om * dt));
  st.lean = Math.max(-1, Math.min(1, om * speed / (G * 0.8)));
  st.fakie = st.u < -0.2;
  // ── le déplacement (l'horizontale de la vitesse le long de la surface)
  const k2 = 1 / Math.sqrt(1 + p * p);
  const nx = st.x + st.u * c * k2 * dt, ny = st.y + st.u * sn * k2 * dt;
  const vz = st.u * p * k2;
  // une barrière, un rail, un garde-corps en travers du chemin, sous sa lisse : le choc
  // (à la hauteur du sol d'ARRIVÉE, et du départ : en montant une courbe vers un garde-corps posé plus haut, l'ancienne hauteur
  // mentait sur l'écart — 2026-10-13)
  const hArr = SP.heightAt(nx, ny);
  const fh = fenceHit(st, nx, ny, Math.max(hArr, st.z + vz * dt), Math.min(st.z, hArr), rideHalf(st));
  if (fh) { if (fh.kind === "gate") { st.gateHit = true; st.u = -st.u * 0.15; return; } hitWall(st, V, speed, "fence", groundBlocked(st, V)); return; }
  const h1 = SP.heightAt(nx, ny);
  const zBal = st.z + vz * dt - 0.5 * G * dt * dt;
  if (release) {
    // ── LE SAUT (ollie, bunny hop) : la vitesse le long de la surface, plus une impulsion selon sa normale
    const J = V.ollie[0] + (V.ollie[1] - V.ollie[0]) * Math.min(1, st.charge);
    const n = normalOf(s);
    takeoff(st, st.u * c * k2 + J * n[0], st.u * sn * k2 + J * n[1], vz + J * n[2], s, false, inp);
    return;
  }
  /* ⚠️ LE DÉCOLLAGE SE DÉCIDE SUR LES VITESSES, PAS SUR LES POSITIONS (premier jet : `h1 < zBal − 4 mm`). À 240 pas par
     seconde, un pas ne fait monter que d'un ou deux centimètres : au passage de la lèvre, l'écart de POSITION restait sous la
     marge, et l'on roulait sur la plateforme au lieu de s'envoler — le coping comme le haut du tremplin. On compare donc ce
     que la surface d'ARRIVÉE ferait monter (sa pente, le long du cap) avec ce que la chute libre fait monter : si on monte plus
     vite qu'elle, elle s'est dérobée. Une marche vers le bas (le bord d'une caisse) reste un test de position. */
  /* ⚠️ 2026-10-13 — ET LA SURFACE D'ARRIVÉE N'EST PAS AU-DESSUS DE NOUS (`h1 < zBal + 0,03`). Sans cette garde, aborder DE CÔTÉ
     une courbe ou un tremplin (on longe le flanc et l'on y entre en biais) lisait la pente du module « le long du cap » — une
     descente, vu dans ce sens — et décidait qu'il se dérobait : on « décollait », et la réception posait le rider sur le flanc,
     jusqu'à 75 cm plus haut, d'une image à l'autre (la sonde : 96 cas sur 3 000 sessions). C'est une marche : le test d'après. */
  const s1 = surf(nx, ny, S1);
  const p1 = s1.gu * c + s1.gv * sn;
  const vzFollow = st.u * p1 / Math.sqrt(1 + p1 * p1);
  if (h1 < zBal + 0.03 && (vz - G * dt > vzFollow + 0.15 || h1 < zBal - 0.02)) {
    // la surface se dérobe plus vite que la chute : on décolle
    takeoff(st, st.u * c * k2, st.u * sn * k2, vz, s, true, inp);
    st.x = nx; st.y = ny; st.z = zBal;
    return;
  }
  if (h1 > st.z + Math.max(V.stepUp, Math.abs(vz * dt) * 2 + 0.02)) {
    // une marche plus haute que ce que la roue avale : le flanc d'un module, la caisse, le plat de la mini-rampe
    hitWall(st, V, speed, "step", groundBlocked(st, V));
    return;
  }
  /* Le CORPS à côté de soi (est, ouest) contre un flanc vertical, sur le plat : il n'y entre pas plus qu'avant. On frotte le long
     (le pas perd sa part en travers, un rien de vitesse) ; si même le frottement y entre, c'est un coin : le choc. */
  if (Math.hypot(s.gu, s.gv) < 0.2) {
    const w0 = SP.sideWallDepth(st.x, st.y, st.z, RIDE_RX);
    if (SP.sideWallDepth(nx, ny, st.z, RIDE_RX) > w0 + 1e-9) {
      // on garde la part du pas qui longe le flanc (l'autre axe), si elle n'y entre pas — sinon, c'est un coin : le choc
      const tries = Math.abs(nx - st.x) > Math.abs(ny - st.y) ? [[nx, st.y], [st.x, ny]] : [[st.x, ny], [nx, st.y]];
      const ok = tries.find(([x2, y2]) => SP.sideWallDepth(x2, y2, st.z, RIDE_RX) <= w0 + 1e-9 && Math.hypot(x2 - st.x, y2 - st.y) > 1e-6 && SP.heightAt(x2, y2) <= st.z + Math.max(V.stepUp, Math.abs(vz * dt) * 2 + 0.02) && SP.heightAt(x2, y2) > st.z - 0.02 && !fenceHit(st, x2, y2, st.z, st.z, rideHalf(st)));
      if (!ok || speed * Math.hypot(ok[0] - st.x, ok[1] - st.y) / Math.max(1e-6, Math.hypot(nx - st.x, ny - st.y)) < speed * 0.3) { hitWall(st, V, speed, "step", groundBlocked(st, V)); return; }
      st.u *= 1 - 1.5 * dt; st.bump = Math.max(st.bump, 0.08);
      st.x = ok[0]; st.y = ok[1]; st.z = SP.heightAt(ok[0], ok[1]);
      st.dist = (st.dist || 0) + Math.abs(st.u) * dt;
      return;
    }
  }
  st.x = nx; st.y = ny; st.z = h1;
  st.dist = (st.dist || 0) + Math.abs(st.u) * dt;   // la distance roulée (les sons comptent les joints de feuille dessus)
}
/* ⚠️ 2026-10-13 — TOURNER, C'EST AUSSI BALAYER : la planche (le cadre du BMX, sa roue arrière) pivote autour des pieds, et son bout
   entrait dans le tube d'à côté — le kick-turn contre une barrière, le spin en l'air près d'un rail. Le cap ne tourne pas s'il
   ferait toucher, et plus qu'avant. */
function turnTo(st, th1) {
  if (th1 === st.th) return th1;
  const half = rideHalf(st), gr = st.mode === "ground", c1 = clearAt(st, st.x, st.y, st.z, th1, half, gr);
  if (c1 >= 0) return th1;
  return c1 < clearAt(st, st.x, st.y, st.z, st.th, half, gr) - 1e-9 ? st.th : th1;
}
function normalOf(s) { const n = Math.hypot(s.gu, s.gv, 1); return [-s.gu / n, -s.gv / n, 1 / n]; }

/* Décoller : la vitesse 3D devient celle du vol. Depuis une courbe raide (le coping), la composante vers la plateforme est
   ôtée, et même un peu RETOURNÉE (`VERT_BACK`) — on retombe dans la courbe, à un rien du coping. Sauf si l'on tient l'ordre
   vers la plateforme : on s'y pose (un « air to deck »). */
const VERT_BACK = -0.07, VERT_DECK = 0.32;
/* 2026-10-13 (soir) — LA RÉCEPTION À VENIR, par la balistique seule (ni rotation ni figure ; les tubes ignorés) : le temps qui reste
   en l'air, et la direction de la trajectoire COUCHÉE sur la surface d'arrivée (ce que `land` comparera au cap). Pas de 1/60 s,
   deux secondes au plus. Sert à presser une figure (`trickRate`) et à aligner la monture sur sa réception (`airWant`). */
function predictLanding(st) {
  let x = st.x, y = st.y, z = st.z, vz = st.vz;
  const dt = 1 / 60;
  for (let k = 1; k <= 120; k++) {
    x += st.vx * dt; y += st.vy * dt; vz -= G * dt; z += vz * dt;
    if (z <= SP.heightAt(x, y)) {
      const n = normalOf(surf(x, y, S1)), vn = st.vx * n[0] + st.vy * n[1] + vz * n[2];
      return { t: k * dt, tx: st.vx - vn * n[0], ty: st.vy - vn * n[1] };
    }
  }
  return { t: 2, tx: st.vx, ty: st.vy };
}
/* LE CAP QUE VISE LA MONTURE EN L'AIR (null : elle garde le sien). Une flèche tenue AUTRE que celle du décollage (à 45° près) est un
   ordre : le bout qui ouvrait la marche (`airRef` : l'arrière, si l'on roulait en fakie) se tourne vers elle. Sinon, on s'aligne
   sur la réception prévue : le skate et les rollers par le bout le plus proche (le fakie compte), la trottinette et le BMX par
   l'avant — c'est leur demi-tour au quarter, fait sans qu'on touche à rien. */
function airWant(st, V, inp) {
  if (inp.ix || inp.iy) {
    const w = Math.atan2(inp.iy, inp.ix);
    if (st.airIn0 == null || Math.abs(wrap(w - st.airIn0)) > 0.8) { st.airIn0 = null; st.airOrder = true; return { th: wrap(w - st.airRef), order: true }; }
  } else st.airIn0 = null;   // les flèches lâchées : la prochaine sera un ordre, même la même
  const p = st.airPred;
  if (!p || Math.hypot(p.tx, p.ty) < 0.3) return null;
  const d = Math.atan2(p.ty, p.tx);
  if (!V.fakie && st.airRef !== Math.PI) return { th: d, order: false };
  return { th: Math.abs(wrap(d - st.th)) <= Math.PI / 2 ? d : wrap(d + Math.PI), order: false };
}
function takeoff(st, vx, vy, vz, s, natural, inp) {
  const slope = Math.hypot(s.gu, s.gv);
  if (natural && slope > VERT_SLOPE && vz > 0) {
    const gx = s.gu / slope, gy = s.gv / slope;       // vers le haut de la pente (vers la plateforme)
    const along = vx * gx + vy * gy;
    const toDeck = inp && (inp.ix || inp.iy) && inp.ix * gx + inp.iy * gy > 0.6;
    const keep = toDeck ? VERT_DECK : VERT_BACK;
    if (along > 0) { vx -= gx * along * (1 - keep); vy -= gy * along * (1 - keep); }
  }
  st.mode = "air"; st.vx = vx; st.vy = vy; st.vz = vz; st.spin = 0; st.airT = 0; st.lastAir = 0; st.airHitN = 0;
  st.popped = !natural;   // un saut voulu (le tail claque) ou un décollage du relief
  st.thAir0 = st.th;
  airBegin(st, inp, st.u < -0.2);
}
/* Ce que l'air retient de l'instant du décollage : la flèche tenue (elle n'est pas un ordre de rotation), le bout qui ouvrait la
   marche, la réception prévue. */
function airBegin(st, inp, backward) {
  st.airIn0 = inp && (inp.ix || inp.iy) ? Math.atan2(inp.iy, inp.ix) : null;
  st.airRef = backward ? Math.PI : 0;
  st.airOrder = false; st.airDir = 0; st.stepOff = false; st.om = 0; st.railLifted = false;
  st.airPred = predictLanding(st); st.predT = 1 / 30;
}

/* ── EN L'AIR ── */
function airStep(st, V, inp, dt) {
  st.airT += dt;
  st.vz -= G * dt;
  /* LA ROTATION : vers le cap visé (`airWant` — un ordre, ou la réception prévue), à la vitesse de rotation de la monture, et l'on
     s'y arrête. L'alignement sans ordre se fait en douceur : au rythme qui le finit aux deux tiers de l'air qui reste (le demi-tour
     du BMX s'étale sur tout le vol au lieu de claquer au décollage), jusqu'à 2,5 fois la rotation de la monture (un air court, un
     air raccourci par un heurt : le cap dessiné, `thV`, en lisse le coup de reins). `spin` ne compte que les rotations VOULUES (le nom « 180 »
     au-dessus de la tête n'est pas pour un demi-tour qu'on n'a pas fait). */
  if ((st.predT -= dt) <= 0) { st.airPred = predictLanding(st); st.predT = 1 / 30; }
  let om = 0;
  const want = airWant(st, V, inp);
  if (want) {
    let err = wrap(want.th - st.th);
    // au demi-tour près, le sens ne se rejoue pas à chaque pas (±π se retourne au moindre bruit) : on garde celui pris
    if (Math.abs(err) > 2.8 && st.airDir) err = st.airDir * Math.abs(err);
    if (Math.abs(err) > 1e-4) {
      const rem = st.airPred ? st.airPred.t : 0.5;
      const rate = want.order ? V.spin : Math.max(2.2, Math.min(V.spin * 2.5, Math.abs(err) / Math.max(0.05, rem * 0.66)));
      om = Math.sign(err) * Math.min(rate, Math.abs(err) / dt);
      st.airDir = Math.sign(err);
    }
  }
  const th1 = turnTo(st, wrap(st.th + om * dt));
  if (th1 === st.th) om = 0;
  st.th = th1; st.om = om;   // `om` : ce que le réseau envoie pour qu'on la voie tourner
  if (want && want.order) st.spin += om * dt;
  const ox = st.x, oy = st.y, oz = st.z;
  let nx = st.x + st.vx * dt, ny = st.y + st.vy * dt;
  let nz = st.z + st.vz * dt;
  // une figure FINIE n'empêche pas l'accroche (un kickflip qui retombe sur le rail : premier jet, le rail était heurté — la chute)
  if (!(st.noGrindT > 0) && !(st.trick && (st.trick.grab || st.trick.t < st.trick.dur))) { const gc = grindCatch(st, oz, nx, ny, nz); if (gc) { enterGrind(st, gc); return; } }
  /* Le corps contre un FLANC à côté de soi (est, ouest, nord), au-dessus du plat : on le longe — la vitesse qui y entre est ôtée,
     comme au sol. Au-dessus d'une courbe, rien (ses côtés montent, ce ne sont pas des flancs). */
  {
    const q = SP.parkSurf(nx, ny, S0);
    if (!q || Math.hypot(q.gu, q.gv) < 0.2) {
      const w0 = SP.sideWallDepth(ox, oy, oz, RIDE_RX);
      if (SP.sideWallDepth(nx, ny, nz, RIDE_RX) > w0 + 1e-9) {
        if (SP.sideWallDepth(ox, ny, nz, RIDE_RX) <= w0 + 1e-9) { nx = ox; st.vx = 0; }
        else if (SP.sideWallDepth(nx, oy, nz, RIDE_RX) <= w0 + 1e-9) { ny = oy; st.vy = 0; }
        else { nx = ox; ny = oy; }
      }
      /* Encore dedans : c'est la DESCENTE qui y entre (on retombe au ras du bout de la caisse) — le corps glisse du bord, écarté du
         flanc à chaque pas tant qu'il y est (une seule poussée ne suffisait pas : on se posait 13 cm dedans). */
      const sw = SP.sideWall(nx, ny, nz, RIDE_RX);
      if (sw.pen > 0) {
        const k = Math.min(0.04, sw.pen), x2 = nx + sw.du * k, y2 = ny + sw.dv * k;
        if (SP.heightAt(x2, y2) <= nz + 0.05) {
          nx = x2; ny = y2;
          const out = st.vx * sw.du + st.vy * sw.dv;
          if (out < 0.6) { st.vx += sw.du * (0.6 - out); st.vy += sw.dv * (0.6 - out); }
        }
      }
    }
  }
  let fh = fenceHit(st, nx, ny, nz, Math.min(oz, nz), rideHalf(st), alignedRail(st));
  /* 2026-10-13 (soir) — LE RAIL FRÔLÉ PAR-DESSOUS : un saut qui arrive au rail à moins de `RAIL_LIFT` sous son dessus PASSE (on se
     soulève de ce rien) — il s'y accroche s'il est aligné, il le franchit sinon. Premier jet : à 2 cm sous le dessus, c'était la
     chute ; la moitié des « fence » en l'air de la sonde étaient ces sauts presque assez hauts. Les garde-corps n'ont pas cette aide. */
  /* ⚠️ UNE FOIS PAR SAUT, en TRAVERSANT le rail (la vitesse en travers de son axe), pas en tombant dessus : premier jet sans ces
     gardes, un rider qui descendait SUR le rail de travers était relevé à chaque pas — il planait le long du tube, 3 cm sous son
     dessus (le banc des contacts résiduels l'a vu : 3 → 10). */
  if (fh && fh.pts && !st.railLifted && st.vz > -1.2) {
    const ax = SP.tubeAxis(fh, st.x, st.y), across = Math.abs(st.vx * ax.nu + st.vy * ax.nv);
    const lift = railZAt(fh, nx, ny) - 0.015 - Math.min(oz, nz);
    if (across > 0.8 && lift > 0 && lift < RAIL_LIFT && !fenceHit(st, nx, ny, nz + lift, nz + lift, rideHalf(st), alignedRail(st))) { nz += lift; st.vz = Math.max(st.vz, 0); fh = null; st.railLifted = true; }
  }
  if (fh && fh.kind === "gate") {
    // une ouverture (la porte de l'est, le haut de l'escalier du nord) : on y bute, la vitesse sortante rendue au dixième, sans chute
    st.gateHit = true;
    if (nx - SP.PARK.x0 > SP.PARK.w) st.vx = -Math.abs(st.vx) * 0.15; else st.vy = Math.abs(st.vy) * 0.15;
    return;
  }
  if (fh) { airHit(st, "fence", airBlocked(st, nz, Math.min(oz, nz), alignedRail(st))); return; }
  const h = SP.heightAt(nx, ny);
  st.lastAir = Math.max(st.lastAir, nz - h);
  if (nz > h) { st.x = nx; st.y = ny; st.z = nz; st.airHitN = 0; return; }
  /* On touche : un FLANC (le relief a monté d'un coup, plus que sa pente ne l'explique) ou une réception.
     ⚠️ 2026-10-13 — premier jet : `h − nz > 0,3 && hOld < oz − 0,05 && h − hOld > 0,3`. La clause du milieu (« on volait déjà
     au-dessus de l'ancien sol ») est FAUSSE au premier pas d'un ollie : collé au pied du quarter (1,37 m), on sautait, le flanc
     passait pour une réception, et l'on se retrouvait debout sur la plateforme. Et le seuil de 30 cm laissait « atterrir » sur la
     caisse en la percutant à 20 cm du sol. La discontinuité se lit contre la PENTE : sur une courbe raide, deux points voisins
     diffèrent de leur pente fois leur écart ; un flanc, de toute sa hauteur. */
  const hOld = SP.heightAt(ox, oy);
  const gOld = SP.parkSurf(ox, oy, S1), gNew = SP.parkSurf(nx, ny, S0);
  const slopeMax = Math.max(gOld ? Math.hypot(gOld.gu, gOld.gv) : 0, gNew ? Math.hypot(gNew.gu, gNew.gv) : 0);
  /* 2026-10-13 (soir) — LE BORD ATTRAPÉ : un flanc dont le dessus (plat) n'est qu'à `LIP_ASSIST` au-dessus de la planche, on s'y pose
     — l'ollie presque assez haut pour la caisse ou la funbox monte dessus au lieu d'y planter les roues (la réception juge le reste). */
  if (h - nz > 0.06 && h - hOld > slopeMax * Math.hypot(nx - ox, ny - oy) + 0.04 && !(h - nz < LIP_ASSIST && gNew && Math.hypot(gNew.gu, gNew.gv) < 0.3 && st.vz > -4)) { airHit(st, "wall", airBlocked(st, nz, Math.min(oz, nz))); return; }
  // posé, le véhicule se couche sur la pente : s'il y entre dans un tube (une réception sur la courbe au ras d'un garde-corps), c'est
  // le choc, pas une réception
  { const half = rideHalf(st), c1 = clearAt(st, nx, ny, h, st.th, half, true); if (c1 < 0 && c1 < clearAt(st, ox, oy, oz, st.th, half, false) - 1e-9) { airHit(st, "fence", airBlocked(st, nz, Math.min(oz, nz))); return; } }
  st.x = nx; st.y = ny; st.z = h;
  land(st, V);
}

/* Heurter un tube ou un flanc en l'air : lancé, c'est la chute ; à peine en mouvement (un saut sur place contre la barrière, un ollie
   collé au pied d'un module), on y bute et l'on retombe à côté — la chute pour un geste qu'on n'a pas fait, c'est le jeu qui punit. */
/* ⚠️ Un second heurt d'affilée, c'est qu'on DESCEND dedans (sur le rail, de travers) : la chute — sans quoi le rebond, qui ne bouge
   pas, se rejouait à chaque pas et l'on restait suspendu au-dessus du tube (la sonde, 2026-10-13). */
/* 2026-10-13 (soir) — DE BIAIS, ON LONGE AUSSI EN L'AIR : seule la vitesse qui entre dans l'obstacle est rendue (un peu retournée) ;
   la chute, c'est y entrer à plus de `AIR_FALL`, ou un troisième heurt d'affilée. Premier jet : la chute dès 2,5 c/s de vitesse
   horizontale, quel que soit l'angle — un ollie le long d'une barrière, et l'on tombait en la frôlant. */
function airHit(st, why, blocked) {
  st.airHitN = (st.airHitN || 0) + 1;
  const n = blocked ? wallNormal(st, blocked) : null;
  const into = n ? -(st.vx * n[0] + st.vy * n[1]) : Math.hypot(st.vx, st.vy);
  if (into > AIR_FALL || st.airHitN > 2) { st.mode = "bail"; st.bailT = 0; st.bailed = { why }; st.u = 0; st.vx *= -0.22; st.vy *= -0.22; st.airHitN = 0; return; }
  if (n) { if (into > 0) { st.vx += n[0] * into * 1.15; st.vy += n[1] * into * 1.15; } }
  else { st.vx *= -0.15; st.vy *= -0.15; }
  st.vz = Math.min(st.vz, 0); st.bump = 0.25;
}
/* Ce qui arrête un pas EN L'AIR (la sonde) : un tube, le bord de l'aire, un relief plus haut que soi au-delà de sa pente (un flanc). */
function airBlocked(st, nz, zl, skip) {
  const half = rideHalf(st);
  return (x, y) => {
    if (fenceHit(st, x, y, nz, zl, half, skip)) return true;
    const q = SP.parkSurf(x, y, S2);
    return !!q && q.h > nz + 0.06 + Math.hypot(q.gu, q.gv) * 0.1;
  };
}

/* ── LA RÉCEPTION : l'angle et le choc ── */
function land(st, V) {
  const s = surf(st.x, st.y, S0);
  const n = normalOf(s);
  const vn = st.vx * n[0] + st.vy * n[1] + st.vz * n[2];      // négatif : on arrive dans la surface
  const tx = st.vx - vn * n[0], ty = st.vy - vn * n[1], tz = st.vz - vn * n[2];
  const c = Math.cos(st.th), sn = Math.sin(st.th);
  const p = s.gu * c + s.gv * sn, k1 = 1 / Math.sqrt(1 + p * p);
  const fx = c * k1, fy = sn * k1, fz = p * k1;                 // le cap, couché sur la surface
  const along = tx * fx + ty * fy + tz * fz;
  const tLen = Math.hypot(tx, ty, tz);
  let err = 0;
  /* ⚠️ 2026-10-13 (soir) — l'angle ne se juge qu'au-dessus de 1,2 c/s (0,6 au premier jet) : un petit saut presque à l'arrêt se
     reçoit d'un pied posé, quel que soit le cap. Et qui roulait DÉJÀ en arrière au décollage (`airRef`) peut y retomber, même sur
     une monture qui ne sait pas partir en fakie (le BMX qui recule d'une plateforme et en tombe : ce n'est pas un demi-tour raté). */
  const fakieOK = V.fakie || st.airRef === Math.PI;
  if (tLen > 1.2) {
    const cosE = Math.max(-1, Math.min(1, along / tLen));
    err = Math.acos(cosE);                                       // 0 : droit devant ; π : en arrière
    if (fakieOK) err = Math.min(err, Math.PI - err);
  }
  const hard = -vn;
  const airH = st.lastAir;
  // une figure pas finie (le plateau, le guidon, le cadre encore en train de tourner) : on retombe dessus de travers — mais aux 4/5,
  // elle se rattrape (le dessin la finit au contact)
  const tk = st.trick, unfinished = tk && !tk.grab && tk.t < tk.dur * TRICK_DONE;
  if (tk && !tk.grab) tk.t = tk.dur;
  // descendu d'une glisse calée (`stepOff`) : on pose le pied, quel que soit l'angle
  if (st.stepOff) err = 0;
  if (err > V.landTol + LAND_CATCH || hard > V.impact * IMPACT_CATCH || unfinished) {
    st.mode = "bail"; st.bailT = 0; st.vx = tx * 0.5; st.vy = ty * 0.5; st.vz = 0; st.u = 0; st.trick = null;
    st.bailed = { why: unfinished ? "trick" : err > V.landTol + LAND_CATCH ? "angle" : "impact" };
    return;
  }
  // le choc absorbé coûte un peu de vitesse ; on garde la part le long du cap
  const loss = Math.max(0, hard - 2.2) * 0.05;
  const sketchy = err > V.landTol || hard > V.impact;
  if (sketchy && tLen > 1e-6) {
    /* LA RÉCEPTION RATTRAPÉE : de travers (ou trop dure) mais pas trop — le cap se remet dans la trajectoire, du bout le plus proche
       pour qui sait rouler en arrière ; on perd du tiers à la moitié de la vitesse ; les genoux plient longtemps. */
    const d = Math.atan2(ty, tx), back = fakieOK && Math.abs(wrap(d - st.th)) > Math.PI / 2;
    const th1 = back ? wrap(d + Math.PI) : d;
    if (clearAt(st, st.x, st.y, st.z, th1, rideHalf(st), true) >= 0) st.th = th1;
    st.u = (back ? -1 : 1) * tLen * (hard > V.impact ? 0.5 : 0.65);
  } else st.u = along * (1 - Math.min(0.35, loss));
  st.mode = "ground";
  st.landed = { air: airH, spin: st.spin, fakie: st.u < -0.2, hard, trick: tk ? tk.name : null, tricks: st.tricksDone || null, sketchy };
  st.landT = sketchy ? 0.3 : 0.08 + Math.min(0.16, hard * 0.035);   // les genoux amortissent : d'autant plus longtemps que la réception est dure
  st.trick = null; st.tricksDone = null;
  st.fakie = st.u < -0.2;
  st.spin = 0; st.vx = st.vy = st.vz = 0;
}

/* ── LA CHUTE : on glisse au sol, on s'arrête, on se relève ── */
function bailStep(st, dt) {
  const k = Math.exp(-5 * dt);
  st.vx *= k; st.vy *= k;
  /* ⚠️ 2026-10-13 — TOMBÉ CONTRE UN RAIL (heurté en l'air, raté à l'accroche) : on glisse de son côté, on ne retombe pas À TRAVERS
     lui. Premier jet : la chute gardait sa verticale, et le corps descendait au sol le tube au milieu des jambes. */
  {
    const n = SP.rideClear(st.x, st.y, st.z, st.th, 0);
    if (n.f && n.c < 0.02) {
      const ax = SP.tubeAxis(n.f, st.x, st.y);
      if (ax.d < 0.45) { const out = st.vx * ax.nu + st.vy * ax.nv; if (out < 1.6) { st.vx += ax.nu * (1.6 - out); st.vy += ax.nv * (1.6 - out); } }
    }
  }
  if (st.vz) {
    st.vz -= G * dt;
    const nz = st.z + st.vz * dt, h = SP.heightAt(st.x, st.y);
    if (nz <= h) { st.z = h; st.vz = 0; } else st.z = nz;
  }
  const nx = st.x + st.vx * dt, ny = st.y + st.vy * dt;
  if (!fenceHit(st, nx, ny, st.z, st.z, 0) && SP.heightAt(nx, ny) <= st.z + 0.05 && SP.sideWallDepth(nx, ny, st.z, RIDE_RX) <= SP.sideWallDepth(st.x, st.y, st.z, RIDE_RX) + 1e-9) { st.x = nx; st.y = ny; if (!st.vz) st.z = SP.heightAt(nx, ny); }
  {
    const sw = SP.sideWall(st.x, st.y, st.z, RIDE_RX);
    const k = Math.min(0.02, sw.pen), x2 = st.x + sw.du * k, y2 = st.y + sw.dv * k;
    if (sw.pen > 0 && SP.heightAt(x2, y2) <= st.z + 0.05 && !fenceHit(st, x2, y2, st.z, st.z, 0)) { st.x = x2; st.y = y2; }
  }
  st.bailT = (st.bailT || 0) + dt;
  if (st.bailT >= BAIL_T) {
    st.mode = "ground"; st.u = 0; st.bailT = 0; st.vx = st.vy = 0; st.z = SP.heightAt(st.x, st.y);
    /* On se relève et l'on repose la monture : dans son cap si elle y tient, sinon dans le sens où elle ne touche aucun tube (premier
       jet : reposée telle quelle, le nez de la planche dans la barrière contre laquelle on avait glissé). */
    const half = rideHalf(st);
    if (clearAt(st, st.x, st.y, st.z, st.th, half, true) < 0) {
      let best = st.th, bc = -1e9;
      for (let k = 0; k < 16; k++) { const th = wrap(st.th + k * Math.PI / 8), c = clearAt(st, st.x, st.y, st.z, th, half, true); if (c > bc + 1e-9) { bc = c; best = th; } }
      st.th = best;
      // aucun sens ne tient (un angle d'enceinte) : on reste à terre un dixième de plus, en glissant à l'écart du tube — une seconde au plus
      if (bc < 0 && (st.bailX = (st.bailX || 0) + 1) < 10) {
        const n = SP.rideClear(st.x, st.y, st.z, best, half, true, null, rideTall(st)), ax = n.f ? SP.tubeAxis(n.f, st.x, st.y) : null;
        if (ax) { st.mode = "bail"; st.bailT = BAIL_T - 0.1; st.vx = ax.nu * 0.8; st.vy = ax.nv * 0.8; return; }
      }
    }
    st.bailX = 0;
  }
}
/* 2026-10-13 (soir) — LA NORMALE D'UN OBSTACLE, SONDÉE : seize pas d'essai d'un dixième de case autour du rider ; la normale est
   l'opposé de la moyenne des pas refusés. Une seule règle pour tout ce qu'on peut heurter (flanc d'un module, garde-corps, rail,
   bord de l'aire, coin) — aucun n'a à publier sa normale. `null` : pris de partout (un coin serré) ou de nulle part. */
function wallNormal(st, blocked) {
  let sx = 0, sy = 0, nb = 0;
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
    if (blocked(st.x + c * 0.1, st.y + s * 0.1)) { sx += c; sy += s; nb++; }
  }
  const L = Math.hypot(sx, sy);
  if (!nb || nb > 12 || L < 1e-6) return null;
  return [-sx / L, -sy / L];
}
/* Ce qui arrête un pas AU SOL (la sonde de `wallNormal`) : une marche plus haute que la roue ne l'avale — au-delà de ce que la pente
   du point explique (une courbe n'est pas un mur) —, un tube, le bord de l'aire, un flanc contre le corps. */
const S2 = {};
function groundBlocked(st, V) {
  const w0 = SP.sideWallDepth(st.x, st.y, st.z, RIDE_RX), half = rideHalf(st);
  return (x, y) => {
    const q = SP.parkSurf(x, y, S2), h = q ? q.h : 0, sl = q ? Math.hypot(q.gu, q.gv) : 0;
    if (h > st.z + Math.max(V.stepUp, 0.02) + sl * 0.1) return true;
    if (fenceHit(st, x, y, Math.max(h, st.z), Math.min(st.z, h), half)) return true;
    return SP.sideWallDepth(x, y, st.z, RIDE_RX) > w0 + 1e-9;
  };
}
/* LE CHOC AU SOL : on LONGE l'obstacle (le cap prend la direction du mur, la vitesse garde ce qui le longeait) ; de face (moins de
   20° de biais), on rebondit ; DANS le mur au-delà de `HIT_FALL`, on tombe. Premier jet : la chute dès 3,6 c/s, de biais comme de
   face — on tombait en frôlant un flanc. */
function hitWall(st, V, speed, why, blocked) {
  const trav = st.th + (st.u < 0 ? Math.PI : 0), tx = Math.cos(trav), ty = Math.sin(trav);
  const n = blocked ? wallNormal(st, blocked) : null;
  const into = n ? -(tx * n[0] + ty * n[1]) : 1;
  if (speed * Math.max(0, into) > HIT_FALL) { st.mode = "bail"; st.bailT = 0; st.bailed = { why }; st.vx = -tx * speed * 0.2; st.vy = -ty * speed * 0.2; st.u = 0; return; }
  if (n && into > 0) {
    const gx = tx + into * n[0], gy = ty + into * n[1], gl = Math.hypot(gx, gy);   // la part qui longe le mur
    if (gl > 0.34) {
      const d = Math.atan2(gy, gx), th1 = wrap(st.u < 0 ? d + Math.PI : d);
      if (clearAt(st, st.x, st.y, st.z, th1, rideHalf(st), true) >= 0 && !blocked(st.x + gx / gl * 0.06, st.y + gy / gl * 0.06)) {
        st.th = th1; st.u = Math.sign(st.u || 1) * speed * gl * 0.9; st.bump = Math.max(st.bump, 0.15);
        return;
      }
    }
  }
  st.u = -st.u * 0.18; st.bump = 0.25;
}

/* Le segment (x0, y0) → (x1, y1) (cases de la ville), à la hauteur de pieds `z` (`zLo` : la plus basse du pas, en l'air), mène-t-il
   dans un garde-corps, une barrière ou un rail sous sa lisse, ou hors de l'aire de roulage ?
   ⚠️ 2026-10-13 — TROIS GARDES, ET CHACUNE A SON TROU SANS LES AUTRES :
     · LA TRAVERSÉE de l'axe d'un tube (le pas qui le franchit d'un coup) — la seule du premier jet : on frôlait un tube à un
       millimètre, la moitié du corps dessinée dedans ; et l'on passait 1 à 3 cm sous le rail plat en l'air (le test lisait la
       hauteur d'ARRIVÉE du pas, pas la plus basse) ;
     · LE CORPS ET LE VÉHICULE (`SP.rideClear` : le torse, la planche ou le cadre le long du cap) : ça touche ET plus qu'avant —
       on ne s'y colle plus, on s'en éloigne toujours (une monture posée contre la lisse repart) ;
     · L'AIRE DE ROULAGE (`SP.inRideArea`) : le filet sous tout le reste. Une ouverture (`rideOpeningAt`) est une porte, ailleurs
       c'est l'enceinte — un vol très haut au-dessus d'un garde-corps de bord y finit aussi. */
const GATE = { kind: "gate" }, EDGE = { kind: "edge" };
function segX(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(d) < 1e-12) return -1;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : -1;
}
/* En l'air, le rail qu'on survole DANS SON AXE (l'angle d'un 50-50, à moins d'une demi-case de lui) : le nez de la planche ne bute pas
   sur son bout pendant que l'ollie monte encore — on vient s'y poser, l'accroche en décide. ⚠️ 2026-10-13 : sans ceci, le corps et la
   planche ayant enfin une emprise (`SP.rideClear`), plus aucun ollie aligné n'atteignait le rail plat (`verify-monture` §7). */
function alignedRail(st) {
  const P = SP.PARK, u = st.x - P.x0, v = st.y - P.y0, c = Math.cos(st.th), sn = Math.sin(st.th);
  for (const r of SP.PARK_RAILS) for (let k = 0; k + 1 < r.pts.length; k++) {
    const A = r.pts[k], B = r.pts[k + 1], du = B[0] - A[0], dv = B[1] - A[1], L = Math.hypot(du, dv);
    if (Math.abs((c * du + sn * dv) / L) < GRIND.ALIGN) continue;
    if (Math.abs(((u - A[0]) * dv - (v - A[1]) * du) / L) > GRIND.SNAP + 0.03) continue;
    // ⚠️ seulement en MONTÉE, ou encore au-dessus de la fenêtre d'accroche : qui redescend sous le rail sans s'y être accroché (une
    // figure en cours, trop vite) le heurte — premier jet sans cette garde : la planche le traversait.
    // et seulement par le BOUT (les pieds pas encore au-dessus du rail, ou à peine) : à côté de lui, la planche y est vraiment
    const tt = ((u - A[0]) * du + (v - A[1]) * dv) / (L * L);
    /* ⚠️ 2026-10-13 (soir) — par les VRAIS bouts du rail : le premier point du premier segment, le dernier du dernier. Premier jet,
       chaque segment comptait ses deux bouts — au COUDE du rail de la funbox (sa descente rejoint son plat), on était « au bout »
       d'un segment, et tout le rail était exempté : une planche qui sautait sur place à côté entrait de 8 cm dans le tube. */
    if (!((tt <= 0.03 && k === 0) || (tt >= 0.97 && k + 2 === r.pts.length))) continue;
    const t = tt < 0 ? 0 : tt > 1 ? 1 : tt;
    if (st.vz > 0 || st.z >= A[2] + (B[2] - A[2]) * t - 0.03) return r.pts;
  }
  return null;
}
/* La hauteur d'un rail (`PARK_RAILS`) au plus près de (x, y), en cases de la ville. */
function railZAt(r, x, y) {
  const u = x - SP.PARK.x0, v = y - SP.PARK.y0;
  let best = 1e9, z = r.pts[0][2];
  for (let k = 0; k + 1 < r.pts.length; k++) {
    const A = r.pts[k], B = r.pts[k + 1], du = B[0] - A[0], dv = B[1] - A[1], L2 = du * du + dv * dv || 1;
    const t = Math.max(0, Math.min(1, ((u - A[0]) * du + (v - A[1]) * dv) / L2)), d = Math.hypot(u - A[0] - du * t, v - A[1] - dv * t);
    if (d < best) { best = d; z = A[2] + (B[2] - A[2]) * t; }
  }
  return z;
}
function fenceHit(st, x1, y1, z, zLo, half, skip) {
  const P = SP.PARK, zl = zLo == null ? z : zLo, x0 = st.x, y0 = st.y;
  const ax = x0 - P.x0, ay = y0 - P.y0, bx = x1 - P.x0, by = y1 - P.y0;
  // l'aire de roulage : on ne sort pas du park en roulant (la porte de l'est, le haut de l'escalier du nord ; ailleurs, l'enceinte)
  if (!SP.inRideArea(x1, y1)) return SP.rideOpeningAt(bx, by) ? GATE : EDGE;
  for (const f of SP.PARK_FENCES) {
    const u = segX(ax, ay, bx, by, f.u0, f.v0, f.u1, f.v1);
    if (u < 0) continue;
    const base = f.b0 + (f.b1 - f.b0) * u;
    if (zl < base + f.top && z + SP.RIDER_H > base) return f;
  }
  for (const r of SP.PARK_RAILS) for (let k = 0; k + 1 < r.pts.length; k++) {
    const A = r.pts[k], B = r.pts[k + 1];
    const u = segX(ax, ay, bx, by, A[0], A[1], B[0], B[1]);
    if (u < 0) continue;
    if (zl < A[2] + (B[2] - A[2]) * u - 0.02 - (r.pts === skip ? SP.RIDE_LEG_H : 0)) return r;
  }
  // le corps et le véhicule contre un tube (`SP.rideClear`) : ça touche, et plus qu'avant — mesuré avant à la hauteur D'AVANT (qui
  // redescend sur un rail en le chevauchant y entre par le haut : il n'y touchait pas, il y touche)
  // (le pas balaie de `zl` à `z` : un saut sur place monte la planche DANS le rail qu'elle frôlait par-dessous)
  const gr = st.mode === "ground";
  let n1 = SP.rideClear(x1, y1, zl, st.th, half, gr, skip, rideTall(st)), c1 = n1.c, f1 = n1.f;
  if (z !== zl) { n1 = SP.rideClear(x1, y1, z, st.th, half, gr, skip, rideTall(st)); if (n1.c < c1) { c1 = n1.c; f1 = n1.f; } }
  if (c1 < 0 && c1 < clearAt(st, x0, y0, st.z, st.th, half, gr, skip) - 1e-9) return f1;
  return null;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LES GRINDS — on s'accroche à une ligne en RETOMBANT dessus, aligné (ou en travers pour un boardslide, un soul) ; on y glisse
   ║ avec son frottement (et la pente d'un rail qui descend) ; on la quitte au bout, d'un saut, ou à court de vitesse.
   ╚════════════════════════════════════════════════════════════════════════════ */
function lineW(L, k) { const P = SP.PARK, a = L.pts[k]; return [P.x0 + a[0], P.y0 + a[1], a[2]]; }
function grindCatch(st, oz, nx, ny, nz) {
  const styles = GRINDS_BY[st.kind].styles;
  const vh = Math.hypot(st.vx, st.vy);
  if (vh < GRIND.MIN_V) return null;
  let best = null;
  SP.PARK_GRINDS.forEach((L, li) => {
    for (let k = 0; k + 1 < L.pts.length; k++) {
      const A = lineW(L, k), B = lineW(L, k + 1);
      const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const ux = dx / len, uy = dy / len;
      let t = ((nx - A[0]) * ux + (ny - A[1]) * uy) / len;
      if (t < 0 || t > 1) continue;
      const px = A[0] + dx * t, py = A[1] + dy * t, d = Math.hypot(nx - px, ny - py);
      if (d > GRIND.SNAP) continue;
      const hl = A[2] + (B[2] - A[2]) * t;
      if (oz < hl - 0.03 || nz > hl + 0.06 || st.vz > 1.2) continue;   // on la traverse en descendant, à sa hauteur
      const along = st.vx * ux + st.vy * uy;
      if (Math.abs(along) < GRIND.MIN_V * 0.8) continue;
      const cAl = Math.abs(Math.cos(st.th) * ux + Math.sin(st.th) * uy);
      let style = null;
      const across = styles.includes("board") ? "board" : styles.includes("soul") ? "soul" : null;
      if (cAl > GRIND.ALIGN && styles.includes("5050")) style = "5050";
      else if (cAl < GRIND.CROSS && across) style = across;
      else if (across) style = cAl > GRIND.LOOSE && styles.includes("5050") ? "5050" : across;   // entre les deux : le plus proche
      else if (cAl > GRIND.LOOSE) style = "5050";
      if (!style) continue;
      if (!best || d < best.d) best = { li, k, t, d, style, s: along >= 0 ? 1 : -1, speed: Math.abs(along), ux, uy, kind: L.kind };
    }
  });
  return best;
}
function enterGrind(st, gc) {
  const ang = Math.atan2(gc.uy, gc.ux) + (gc.s < 0 ? Math.PI : 0);   // le sens de la glisse
  // le nez reste du côté où il était : 5050 dans l'axe (ou à l'envers, fakie), boardslide en travers
  const cands = gc.style === "5050" ? [ang, ang + Math.PI] : [ang + Math.PI / 2, ang - Math.PI / 2];
  st.th = wrap(cands.reduce((a, b) => (Math.abs(wrap(a - st.th)) <= Math.abs(wrap(b - st.th)) ? a : b)));
  if (st.trick) { (st.tricksDone || (st.tricksDone = [])).push(st.trick.name); st.trick = null; }
  st.mode = "grind"; st.u = gc.speed; st.g = { li: gc.li, k: gc.k, t: gc.t, s: gc.s, style: gc.style, kind: gc.kind, len: 0, T: 0 };
  st.vx = st.vy = st.vz = 0; st.om = 0;
  const L = SP.PARK_GRINDS[gc.li], A = lineW(L, gc.k), B = lineW(L, gc.k + 1);
  st.x = A[0] + (B[0] - A[0]) * gc.t; st.y = A[1] + (B[1] - A[1]) * gc.t; st.z = A[2] + (B[2] - A[2]) * gc.t;
  st.grinded = { style: gc.style, kind: gc.kind };
}
function grindStep(st, V, inp, dt, release) {
  const g = st.g, L = SP.PARK_GRINDS[g.li];
  let A = lineW(L, g.k), B = lineW(L, g.k + 1);
  let len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const slope = (B[2] - A[2]) / len * g.s;   // la pente dans le sens de la glisse
  st.u = Math.max(0, st.u + (-G * slope / Math.sqrt(1 + slope * slope) - GRINDS_BY[st.kind].grindK) * dt);
  let ds = st.u * dt / Math.sqrt(1 + slope * slope);
  g.T += dt; g.len += ds;
  g.t += g.s * ds / len;
  // le passage d'un segment au suivant (la polyligne du coping qui tourne, le rail qui casse)
  while (g.t > 1 || g.t < 0) {
    const over = g.t > 1 ? (g.t - 1) * len : -g.t * len, nk = g.k + (g.t > 1 ? 1 : -1);
    if (nk < 0 || nk + 1 >= L.pts.length) { grindExit(st, V, "end", inp); return; }
    g.k = nk; A = lineW(L, g.k); B = lineW(L, g.k + 1); len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    g.t = g.s > 0 ? over / len : 1 - over / len;
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) + (g.s < 0 ? Math.PI : 0), off = g.style === "5050" ? 0 : Math.PI / 2;
    const cands = [ang + off, ang + off + Math.PI];
    st.th = wrap(cands.reduce((a, b) => (Math.abs(wrap(a - st.th)) <= Math.abs(wrap(b - st.th)) ? a : b)));
  }
  /* ⚠️ 2026-10-13 — LE NEZ DU VÉHICULE CONTRE UN TUBE AU BOUT DE LA LIGNE (le poteau qui termine un coping, sa main courante) : on
     cale — la glisse s'arrête et l'on retombe du côté bas. Le coping raccourci (`GRIND_END`, skatepark.js) laisse passer le torse,
     pas les 1,24 case d'un BMX : sans ceci, on sortait de la glisse le nez dans le garde-corps. */
  {
    const x2 = A[0] + (B[0] - A[0]) * g.t, y2 = A[1] + (B[1] - A[1]) * g.t, z2 = A[2] + (B[2] - A[2]) * g.t, half = rideHalf(st);
    const c1 = clearAt(st, x2, y2, z2, st.th, half, false, L.pts);
    if (c1 < 0 && c1 < clearAt(st, st.x, st.y, st.z, st.th, half, false, L.pts) - 1e-9) { grindExit(st, V, "stall", inp); return; }
    st.x = x2; st.y = y2; st.z = z2;
  }
  if (release) { grindExit(st, V, "pop", inp); return; }
  if (st.u < 0.3) { grindExit(st, V, "stall", inp); }
}
/* Quitter la ligne : au bout, on file dans son axe (un petit rebond) ; d'un saut, l'ollie ; à court de vitesse, on tombe du côté
   où le relief est le plus bas (la courbe sous un coping, le sol à côté d'une caisse). */
function grindExit(st, V, how, inp) {
  const g = st.g, L = SP.PARK_GRINDS[g.li];
  const A = lineW(L, Math.min(g.k, L.pts.length - 2)), B = lineW(L, Math.min(g.k, L.pts.length - 2) + 1);
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / len * g.s, uy = (B[1] - A[1]) / len * g.s;
  const slope = (B[2] - A[2]) / len * g.s;
  let vx = ux * st.u, vy = uy * st.u, vz = slope * st.u + (how === "end" ? GRIND.END_POP : 0);
  // le côté bas : on sonde à une demi-case de part et d'autre de la ligne
  const lx = -uy, ly = ux;
  const hL = SP.heightAt(st.x + lx * 0.45, st.y + ly * 0.45), hR = SP.heightAt(st.x - lx * 0.45, st.y - ly * 0.45);
  const side = hL < hR ? 1 : -1;
  if (how === "pop") { vz = V.ollie[1] * 0.85; vx += lx * side * 0.5; vy += ly * side * 0.5; }
  if (how === "stall") { vx = lx * side * 0.9; vy = ly * side * 0.9; vz = 0.4; }
  st.mode = "air"; st.vx = vx; st.vy = vy; st.vz = vz; st.spin = 0; st.airT = 0; st.lastAir = 0; st.popped = how === "pop";
  st.z += 0.03;
  airBegin(st, inp, false);
  // calé (à court de vitesse, le nez contre un poteau) : on descend de la ligne en posant le pied — pas une réception à juger
  st.stepOff = how === "stall";
  st.noGrindT = 0.25;
  st.grindDone = { style: g.style, kind: g.kind, len: g.len, how };
  st.g = null;
}

/* ── LES FIGURES EN L'AIR ── `st.trick` = { name, t, dur, roll, yaw, bar, whip, grab } ; le dessin lit les angles, la réception
   juge si elle est finie. Deux appuis rapprochés (V puis G, ou G puis V, moins d'un dixième de seconde) donnent la figure combinée. */
/* Rend `true` si l'appui est CONSOMMÉ (la figure part, la combinée se forme, ou il n'y a plus le temps : elle ne partira jamais),
   `false` s'il peut attendre (trop tôt, trop près du sol : le tampon le rejoue). */
function trickInput(st, v, gk) {
  if (!v && !gk) return true;
  const T = TRICKS[st.kind]; if (!T) return true;
  const tk = st.trick;
  if (tk && tk.t < 0.1 * (tk.rate || 1)) {   // le second appui juste après le premier : la combinée
    const combo = tk.key === "v" && gk ? T.vg : tk.key === "g" && v ? T.gv || T.vg : null;
    if (combo) {
      const rate = trickRate(st, combo, tk.t);
      if (rate) { st.trick = { ...combo, key: "c", t: tk.t, rate }; return true; }
    }
  }
  if (tk && tk.t < tk.dur) return true;                // une figure à la fois
  if (st.airT < 0.06 || st.z - SP.heightAt(st.x, st.y) < 0.12) return false;   // pas encore décollé du sol : on attend
  const def = v ? T.v : T.g;
  if (!def) return true;
  const rate = trickRate(st, def, 0);
  if (!rate) return true;   // plus le temps : la figure ne part pas — jamais une chute pour un appui tardif
  if (tk) (st.tricksDone || (st.tricksDone = [])).push(tk.name);
  st.trick = { ...def, key: v ? "v" : "g", t: 0, rate };
  st.flipped = def.name;   // un pas : le son du plateau qui tourne
  return true;
}
/* La cadence d'une figure pour qu'elle FINISSE avant la réception prévue (`predictLanding`) : 1 si l'air suffit, plus vite sinon,
   au plus `TRICK_FAST` ; 0 si même pressée elle ne tiendrait pas. Un grab se tient le temps qu'on veut : toujours 1. */
function trickRate(st, def, t0) {
  if (def.grab) return 1;
  const rem = predictLanding(st).t - 0.03, left = def.dur - t0;
  if (left <= 0) return 1;
  if (rem * TRICK_FAST < left) return 0;
  return Math.max(1, left / Math.max(rem * 0.9, left / TRICK_FAST));
}
function trickStep(st, dt) {
  const tk = st.trick; if (!tk) return;
  tk.t += dt * (tk.rate || 1);
  if (tk.grab) return;
  if (tk.t >= tk.dur) { tk.t = tk.dur; }
}
/* Les angles qu'une figure donne au dessin à l'instant (radians) : le plateau sur son grand axe, sur lui-même, le guidon, le
   cadre. `tk` peut venir du réseau (un nom et un âge) : la même fonction le relit. */
export function trickAngles(tk) {
  if (!tk) return null;
  const u = Math.max(0, Math.min(1, tk.t / tk.dur)), e = u * u * (3 - 2 * u);
  return { roll: (tk.roll || 0) * 2 * Math.PI * e, yaw: (tk.yaw || 0) * 2 * Math.PI * e, bar: (tk.bar || 0) * 2 * Math.PI * e, whip: (tk.whip || 0) * 2 * Math.PI * e, grab: tk.grab ? Math.sin(Math.PI * u) : 0 };
}
export function trickByName(kind, name) {
  const T = TRICKS[kind] || {};
  for (const k of Object.keys(T)) if (T[k].name === name) return T[k];
  return null;
}

/* Ce que le dessin et le réseau lisent : la hauteur en l'air (au-dessus du relief sous soi), la vitesse horizontale. */
export function rideView(st) {
  const h = SP.heightAt(st.x, st.y);
  const air = st.mode === "air" || st.mode === "grind" ? Math.max(0, st.z - h) : 0;
  const c = Math.cos(st.th), sn = Math.sin(st.th);
  let vx = st.mode === "air" ? st.vx : st.u * c, vy = st.mode === "air" ? st.vy : st.u * sn;
  if (st.mode === "grind" && st.g) {   // en glisse, la vitesse suit la ligne, pas le nez (un boardslide va de travers)
    const L = SP.PARK_GRINDS[st.g.li], A = L.pts[st.g.k], B = L.pts[st.g.k + 1], len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    vx = (B[0] - A[0]) / len * st.g.s * st.u; vy = (B[1] - A[1]) / len * st.g.s * st.u;
  }
  return { air, vx, vy, speed: Math.hypot(vx, vy), z: st.z, h };
}
