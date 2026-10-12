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
import * as SP from "./skatepark.mjs";

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
const GRIND = { SNAP: 0.17, ALIGN: 0.74, CROSS: 0.5, MIN_V: 0.9, END_POP: 0.6 };
/* Le NOM des figures et des glisses, tel qu'on le crie dans tous les skateparks du monde (en anglais, dans les deux langues du
   jeu : un nom propre, pas une traduction — `verify-strings` refuse à raison une section identique dans les deux tables). */
export const TRICK_LABEL = { kickflip: "Kickflip", popShove: "Pop shove-it", varialFlip: "Varial flip", treFlip: "360 flip", mistyGrab: "Misty grab", muteGrab: "Mute grab", barspin: "Barspin", tailwhip: "Tailwhip", whipBar: "Tailwhip barspin", g5050: "50-50", gboard: "Boardslide", gsoul: "Soul grind", gpegs: "Pegs" };
export const BAIL_T = 1.4;          // s au sol après une chute
const VERT_SLOPE = 1.6;             // pente (≈ 58°) au-delà de laquelle un décollage est un « air de courbe »

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
  return st;
}

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
  const trkV = inp.trick && !st.wasTrk, trkG = inp.trick2 && !st.wasTrk2;
  st.wasTrk = !!inp.trick; st.wasTrk2 = !!inp.trick2;
  if (st.noGrindT > 0) st.noGrindT -= dt;
  if (st.mode === "grind") { grindStep(st, V, inp, dt, release); if (!inp.jump) st.charge = 0; return; }
  if (st.mode === "air") { trickInput(st, trkV, trkG); trickStep(st, dt); airStep(st, V, inp, dt); if (!inp.jump) st.charge = 0; return; }
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
  st.th = wrap(st.th + om * dt);
  st.lean = Math.max(-1, Math.min(1, om * speed / (G * 0.8)));
  st.fakie = st.u < -0.2;
  // ── le déplacement (l'horizontale de la vitesse le long de la surface)
  const k2 = 1 / Math.sqrt(1 + p * p);
  const nx = st.x + st.u * c * k2 * dt, ny = st.y + st.u * sn * k2 * dt;
  const vz = st.u * p * k2;
  // une barrière, un rail, un garde-corps en travers du chemin, sous sa lisse : le choc
  const fh = fenceHit(st.x, st.y, nx, ny, st.z);
  if (fh) { if (fh.kind === "gate") { st.gateHit = true; st.u = -st.u * 0.15; return; } hitWall(st, V, speed, "fence"); return; }
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
  const s1 = surf(nx, ny, S1);
  const p1 = s1.gu * c + s1.gv * sn;
  const vzFollow = st.u * p1 / Math.sqrt(1 + p1 * p1);
  if (vz - G * dt > vzFollow + 0.15 || h1 < zBal - 0.02) {
    // la surface se dérobe plus vite que la chute : on décolle
    takeoff(st, st.u * c * k2, st.u * sn * k2, vz, s, true, inp);
    st.x = nx; st.y = ny; st.z = zBal;
    return;
  }
  if (h1 > st.z + Math.max(V.stepUp, Math.abs(vz * dt) * 2 + 0.02)) {
    // une marche plus haute que ce que la roue avale : le flanc d'un module, la caisse, le plat de la mini-rampe
    hitWall(st, V, speed, "step");
    return;
  }
  st.x = nx; st.y = ny; st.z = h1;
  st.dist = (st.dist || 0) + Math.abs(st.u) * dt;   // la distance roulée (les sons comptent les joints de feuille dessus)
}
function normalOf(s) { const n = Math.hypot(s.gu, s.gv, 1); return [-s.gu / n, -s.gv / n, 1 / n]; }

/* Décoller : la vitesse 3D devient celle du vol. Depuis une courbe raide (le coping), la composante vers la plateforme est
   ôtée, et même un peu RETOURNÉE (`VERT_BACK`) — on retombe dans la courbe, à un rien du coping. Sauf si l'on tient l'ordre
   vers la plateforme : on s'y pose (un « air to deck »). */
const VERT_BACK = -0.07, VERT_DECK = 0.32;
function takeoff(st, vx, vy, vz, s, natural, inp) {
  const slope = Math.hypot(s.gu, s.gv);
  if (natural && slope > VERT_SLOPE && vz > 0) {
    const gx = s.gu / slope, gy = s.gv / slope;       // vers le haut de la pente (vers la plateforme)
    const along = vx * gx + vy * gy;
    const toDeck = inp && (inp.ix || inp.iy) && inp.ix * gx + inp.iy * gy > 0.6;
    const keep = toDeck ? VERT_DECK : VERT_BACK;
    if (along > 0) { vx -= gx * along * (1 - keep); vy -= gy * along * (1 - keep); }
  }
  st.mode = "air"; st.vx = vx; st.vy = vy; st.vz = vz; st.spin = 0; st.airT = 0; st.lastAir = 0;
  st.popped = !natural;   // un saut voulu (le tail claque) ou un décollage du relief
  st.thAir0 = st.th;
}

/* ── EN L'AIR ── */
function airStep(st, V, inp, dt) {
  st.airT += dt;
  st.vz -= G * dt;
  // la rotation : gauche/droite à l'écran font tourner (la vitesse de rotation de la monture), sinon on garde le cap
  let om = 0;
  if (inp.ix) om = (inp.ix > 0 ? 1 : -1) * V.spin;
  st.th = wrap(st.th + om * dt); st.spin += om * dt; st.om = om;   // `om` : ce que le réseau envoie pour qu'on la voie tourner
  const ox = st.x, oy = st.y, oz = st.z;
  const nx = st.x + st.vx * dt, ny = st.y + st.vy * dt, nz = st.z + st.vz * dt;
  if (!(st.noGrindT > 0) && !st.trick) { const gc = grindCatch(st, oz, nx, ny, nz); if (gc) { enterGrind(st, gc); return; } }
  if (fenceHit(ox, oy, nx, ny, nz)) { st.mode = "bail"; st.bailT = 0; st.bailed = { why: "fence" }; st.u = 0; st.vx *= -0.2; st.vy *= -0.2; return; }
  const h = SP.heightAt(nx, ny);
  st.lastAir = Math.max(st.lastAir, nz - h);
  if (nz > h) { st.x = nx; st.y = ny; st.z = nz; return; }
  // on touche : un mur (le relief a monté d'un coup bien au-dessus de nous) ou une réception
  const hOld = SP.heightAt(ox, oy);
  if (h - nz > 0.3 && hOld < oz - 0.05 && h - hOld > 0.3) { st.mode = "bail"; st.bailT = 0; st.bailed = { why: "wall" }; st.u = 0; st.vx *= -0.25; st.vy *= -0.25; return; }
  st.x = nx; st.y = ny; st.z = h;
  land(st, V);
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
  if (tLen > 0.6) {
    const cosE = Math.max(-1, Math.min(1, along / tLen));
    err = Math.acos(cosE);                                       // 0 : droit devant ; π : en arrière
    if (V.fakie) err = Math.min(err, Math.PI - err);
  }
  const hard = -vn;
  const airH = st.lastAir;
  // une figure pas finie (le plateau, le guidon, le cadre encore en train de tourner) : on retombe dessus de travers
  const tk = st.trick, unfinished = tk && tk.t < tk.dur - 0.04 && !tk.grab;
  if (err > V.landTol || hard > V.impact || unfinished) {
    st.mode = "bail"; st.bailT = 0; st.vx = tx * 0.5; st.vy = ty * 0.5; st.vz = 0; st.u = 0; st.trick = null;
    st.bailed = { why: unfinished ? "trick" : err > V.landTol ? "angle" : "impact" };
    return;
  }
  // le choc absorbé coûte un peu de vitesse ; on garde la part le long du cap
  const loss = Math.max(0, hard - 2.2) * 0.05;
  st.u = along * (1 - Math.min(0.35, loss));
  st.mode = "ground";
  st.landed = { air: airH, spin: st.spin, fakie: st.u < -0.2, hard, trick: tk ? tk.name : null, tricks: st.tricksDone || null };
  st.landT = 0.08 + Math.min(0.16, hard * 0.035);   // les genoux amortissent : d'autant plus longtemps que la réception est dure
  st.trick = null; st.tricksDone = null;
  st.fakie = st.u < -0.2;
  st.spin = 0; st.vx = st.vy = st.vz = 0;
}

/* ── LA CHUTE : on glisse au sol, on s'arrête, on se relève ── */
function bailStep(st, dt) {
  const k = Math.exp(-5 * dt);
  st.vx *= k; st.vy *= k;
  if (st.vz) {
    st.vz -= G * dt;
    const nz = st.z + st.vz * dt, h = SP.heightAt(st.x, st.y);
    if (nz <= h) { st.z = h; st.vz = 0; } else st.z = nz;
  }
  const nx = st.x + st.vx * dt, ny = st.y + st.vy * dt;
  if (!fenceHit(st.x, st.y, nx, ny, st.z) && SP.heightAt(nx, ny) <= st.z + 0.05) { st.x = nx; st.y = ny; if (!st.vz) st.z = SP.heightAt(nx, ny); }
  st.bailT = (st.bailT || 0) + dt;
  if (st.bailT >= BAIL_T) { st.mode = "ground"; st.u = 0; st.bailT = 0; st.vx = st.vy = 0; st.z = SP.heightAt(st.x, st.y); }
}
function hitWall(st, V, speed, why) {
  if (speed > 3.6) { st.mode = "bail"; st.bailT = 0; st.bailed = { why }; st.vx = -Math.cos(st.th) * st.u * 0.2; st.vy = -Math.sin(st.th) * st.u * 0.2; st.u = 0; return; }
  st.u = -st.u * 0.18; st.bump = 0.25;
}

/* Le segment (x0, y0) → (x1, y1) (cases de la ville), à la hauteur de pieds `z`, traverse-t-il un garde-corps, une barrière ou
   un rail sous sa lisse ? */
function segX(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(d) < 1e-12) return -1;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : -1;
}
function fenceHit(x0, y0, x1, y1, z) {
  const P = SP.PARK;
  const ax = x0 - P.x0, ay = y0 - P.y0, bx = x1 - P.x0, by = y1 - P.y0;
  for (const f of SP.PARK_FENCES) {
    const u = segX(ax, ay, bx, by, f.u0, f.v0, f.u1, f.v1);
    if (u < 0) continue;
    const base = f.b0 + (f.b1 - f.b0) * u;
    if (z < base + f.top && z > base - 0.4) return f;
  }
  for (const r of SP.PARK_RAILS) for (let k = 0; k + 1 < r.pts.length; k++) {
    const A = r.pts[k], B = r.pts[k + 1];
    const u = segX(ax, ay, bx, by, A[0], A[1], B[0], B[1]);
    if (u < 0) continue;
    if (z < A[2] + (B[2] - A[2]) * u - 0.02) return r;
  }
  // la porte de l'est : on ne sort pas du park en roulant
  const gU = SP.PARK.w, gate = SP.EAST_GATE;
  const ug = segX(ax, ay, bx, by, gU, gate.v0, gU, gate.v1);
  if (ug >= 0) return { kind: "gate" };
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
      if (cAl > GRIND.ALIGN && styles.includes("5050")) style = "5050";
      else if (cAl < GRIND.CROSS && (styles.includes("board") || styles.includes("soul"))) style = styles.includes("board") ? "board" : "soul";
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
    if (nk < 0 || nk + 1 >= L.pts.length) { grindExit(st, V, "end"); return; }
    g.k = nk; A = lineW(L, g.k); B = lineW(L, g.k + 1); len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    g.t = g.s > 0 ? over / len : 1 - over / len;
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) + (g.s < 0 ? Math.PI : 0), off = g.style === "5050" ? 0 : Math.PI / 2;
    const cands = [ang + off, ang + off + Math.PI];
    st.th = wrap(cands.reduce((a, b) => (Math.abs(wrap(a - st.th)) <= Math.abs(wrap(b - st.th)) ? a : b)));
  }
  st.x = A[0] + (B[0] - A[0]) * g.t; st.y = A[1] + (B[1] - A[1]) * g.t; st.z = A[2] + (B[2] - A[2]) * g.t;
  if (release) { grindExit(st, V, "pop"); return; }
  if (st.u < 0.3) { grindExit(st, V, "stall"); }
}
/* Quitter la ligne : au bout, on file dans son axe (un petit rebond) ; d'un saut, l'ollie ; à court de vitesse, on tombe du côté
   où le relief est le plus bas (la courbe sous un coping, le sol à côté d'une caisse). */
function grindExit(st, V, how) {
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
  st.noGrindT = 0.25;
  st.grindDone = { style: g.style, kind: g.kind, len: g.len, how };
  st.g = null;
}

/* ── LES FIGURES EN L'AIR ── `st.trick` = { name, t, dur, roll, yaw, bar, whip, grab } ; le dessin lit les angles, la réception
   juge si elle est finie. Deux appuis rapprochés (V puis G, ou G puis V, moins d'un dixième de seconde) donnent la figure combinée. */
function trickInput(st, v, gk) {
  if (!v && !gk) return;
  const T = TRICKS[st.kind]; if (!T) return;
  const tk = st.trick;
  if (tk && tk.t < 0.1) {   // le second appui juste après le premier : la combinée
    const combo = tk.key === "v" && gk ? T.vg : tk.key === "g" && v ? T.gv || T.vg : null;
    if (combo) { st.trick = { ...combo, key: "c", t: tk.t }; return; }
  }
  if (tk && tk.t < tk.dur) return;                     // une figure à la fois
  if (st.airT < 0.06 || st.z - SP.heightAt(st.x, st.y) < 0.12) return;   // pas collé au sol
  const def = v ? T.v : T.g;
  if (!def) return;
  if (tk) (st.tricksDone || (st.tricksDone = [])).push(tk.name);
  st.trick = { ...def, key: v ? "v" : "g", t: 0 };
  st.flipped = def.name;   // un pas : le son du plateau qui tourne
}
function trickStep(st, dt) {
  const tk = st.trick; if (!tk) return;
  tk.t += dt;
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
