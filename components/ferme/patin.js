/* =============================================================================
   patin.js — LE PATIN À GLACE DE VALLEY TOWN (2026-10-04), PUR.
   -----------------------------------------------------------------------------
   Guillaume : « des patins dispos à l'achat pour monter sur le lac gelé et le
   body of water au sud » ; tranché avec lui : un étal d'hiver au bord du lac,
   « très chic et couvert » ; « si on monte sur la glace sans patins on glisse et
   se blesse (même blessure prévue, temps de 15 vraies minutes) ».

   Ce fichier ne sait rien du jeu ni du dessin : il fait avancer une MACHINE
   D'ÉTAT du patineur à partir de l'ordre donné (une direction unitaire ou nulle),
   et rend la vitesse voulue. Le jeu l'applique axe par axe à travers la même
   collision que la marche (`canStandTown`) et signale les chocs (`skateBump`) —
   exactement le contrat de la glissade du cratère (`Q.starSlipStep`, quete.js).
   `tools/verify-patin.mjs` le joue : un tour de lac, un arrêt, une chute.

   ⚠️⚠️ CE QUI FAIT UN PATIN ET PAS UNE MARCHE RAPIDE, EN TROIS NOMBRES :
     · l'ÉLAN : sans ordre, la vitesse ne décroît qu'au taux `GLIDE_K` — neuf
       cases de lancée depuis la croisière (à 0,28, premier chiffre : vingt-sept,
       on traversait le lac sans pouvoir s'arrêter avant le quai d'en face) ;
     · le VIRAGE LARGE : avec un ordre, seule la part de vitesse PERPENDICULAIRE
       à l'ordre est mangée (`TURN_K`, les carres qui mordent) ; tourner, c'est
       courber sa trajectoire, jamais pivoter sur place ;
     · le FREINAGE : un ordre à contresens (`BRAKE_DOT`) ne fait pas repartir en
       arrière, il fait déraper en travers (`BRAKE`) — l'arrêt de hockey, avec sa
       gerbe de glace (le jeu la peint, `st.brake`).
   ⚠️ SANS PATINS, ON NE CONTRÔLE PLUS RIEN : la vitesse d'entrée continue presque
   seule (`SLIP_ACC` infime), les bras moulinent `SLIP_T` secondes, puis la chute
   (`FALL_T`) — et `mode === "down"` dit au jeu d'appliquer la blessure. C'est
   inévitable une fois sur la glace, et c'est voulu (la demande le dit) : le
   jeu prévient à la berge, une fois, avant le premier pas.
   ⚠️ AUCUN NOMBRE TIRÉ AU HASARD, AUCUNE HORLOGE LUE : `dt` est passé, l'état
   est rendu. Les autres joueurs ne reçoivent que la position, comme toujours ;
   la pose qu'ils voient se DÉDUIT (`skateSeen`, §3 de CLAUDE.md).
   ========================================================================== */

export const SKATE = {
  ACC: 6.2,            // cases/s² : la poussée, le long de l'ordre
  VMAX: 7.6,           // cases/s : la croisière (la marche fait 5,2, la course 9,1)
  VMAX_RUN: 9.4,       // en appuyant sur la course : on pousse plus fort, pas plus longtemps
  GLIDE_K: 0.85,       // /s : ce que perd la lancée sans ordre — v/k ≈ 9 cases de glisse depuis la croisière
  TURN_K: 2.6,         // /s : la part perpendiculaire mangée par les carres
  BRAKE: 13,           // cases/s² : l'arrêt en travers
  BRAKE_DOT: -0.3,     // ordre · sens de la vitesse sous lequel on freine au lieu de tourner
  BRAKE_MIN_V: 1.2,    // sous cette vitesse, un ordre à contresens repart simplement de l'autre côté
  BOUNCE: 0.22,        // ce qui revient d'un choc contre la berge (en sens inverse)
  STOP_V: 0.08,        // sous cette vitesse, on est arrêté
  /* Sans patins : la glissade incontrôlée, la chute, le temps au sol. */
  SLIP_T: 0.95, FALL_T: 1.5,
  SLIP_ACC: 0.9, SLIP_K: 0.18, FALL_K: 7,
  /* La foulée : une poussée par jambe, sa cadence monte avec la vitesse. */
  STRIDE_BASE: 1.6, STRIDE_PER_V: 0.22,
};

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-05 (nuit, fin quater) — LE MATÉRIEL : DEUX PAIRES, UNE COMBINAISON, HUIT COULEURS.
   ╚════════════════════════════════════════════════════════════════════════════
   Guillaume : « les patins actuels pour le patinage normal, des patins pour la course (longues lames) qui permettent un
   meilleur contrôle dans les virages et sont un peu plus rapides ; aussi une combinaison qui permet d'aller plus vite ;
   et un choix de couleurs ». Le matériel se CHOISIT au chalet et se loue avec les patins (`resolveRentSkates`) ; il
   voyage dans le sac (`inv.skateKit`, diffusé par l'hôte comme `skatesUntil`) pour que les autres le VOIENT.
   ⚠️ CE QUE CHAQUE PIÈCE CHANGE, EN CLAIR (le banc `verify-patin` §9 le mesure, il ne le relit pas) :
     · les LONGUES LAMES : croisière +10 %, poussée +7 %, la lancée dure plus (`glideK`), et SURTOUT les virages — les
       carres mordent plus fort (`turnK`) ET une part de la vitesse qu'elles mangent de travers est RENDUE à la nouvelle
       direction (`carry`) : on tourne serré sans perdre sa vitesse, ce qu'un patin ordinaire ne fait pas. Contrepartie :
       elles coûtent plus cher, et un arrêt en travers demande un peu plus de glace (`brakeK`).
     · la COMBINAISON : croisière +5 %, un peu moins de traînée (`glideK`) — l'aérodynamisme, rien de plus.
     · la COULEUR : de l'apparence, rien d'autre (jamais un avantage).
   ⚠️ LE PRIX DE BASE EST UNE CONSTANTE DE `fermeConstants.js` (`SKATES_RENT_PRICE`) : ce fichier-ci est pur et n'importe
   rien (le banc le copie seul) — il ne porte donc que les SUPPLÉMENTS, et `skateKitPrice(kit, base)` reçoit la base. */
export const SKATE_KITS = {
  classic: { extra: 0,  vmaxK: 1,    accK: 1,    turnK: 1,   carry: 0,   glideK: 1,    brakeK: 1,    blade: 6 },
  race:    { extra: 60, vmaxK: 1.10, accK: 1.07, turnK: 1.4, carry: 0.5, glideK: 0.82, brakeK: 0.88, blade: 10 },
};
export const SKATE_SUIT = { extra: 45, vmaxK: 1.05, accK: 1.03, glideK: 0.92 };
export const SKATE_TYPES = ["classic", "race"];
/* Les huit couleurs : la bottine (clair, moyen, ombre) et la combinaison (le même ton). L'indice voyage, pas le nom. */
export const SKATE_COLORS = [
  { key: "white",  main: "#f6f3ec", hi: "#ffffff", lo: "#d6d0c4", suit: "#e8edf6" },
  { key: "red",    main: "#cf3b3b", hi: "#f27d70", lo: "#8a1f25", suit: "#c8323a" },
  { key: "blue",   main: "#3b6fd0", hi: "#7fa8f0", lo: "#223f86", suit: "#2f5fc4" },
  { key: "green",  main: "#2f9a5b", hi: "#6fd098", lo: "#1b5c37", suit: "#2a8a50" },
  { key: "yellow", main: "#e8b92e", hi: "#fbe27a", lo: "#9a7312", suit: "#e0ac1c" },
  { key: "black",  main: "#34363d", hi: "#6b6f7a", lo: "#16171b", suit: "#2a2c33" },
  { key: "pink",   main: "#e873a6", hi: "#f9b0d0", lo: "#a23b6b", suit: "#e0609a" },
  { key: "violet", main: "#7b52c4", hi: "#b393ec", lo: "#472d86", suit: "#6d44b8" },
];
/* Un matériel quelconque (un sac ancien, un paquet tronqué) → un matériel valide. Rend toujours un objet NEUF. */
export function skateKitNorm(k) {
  const type = k && SKATE_KITS[k.type] ? k.type : "classic";
  const c = k && Number.isFinite(+k.color) ? (+k.color | 0) : 0;
  return { type, suit: k && k.suit ? 1 : 0, color: c >= 0 && c < SKATE_COLORS.length ? c : 0 };
}
export function skateKitPrice(k, base) {
  const n = skateKitNorm(k);
  return (base | 0) + SKATE_KITS[n.type].extra + (n.suit ? SKATE_SUIT.extra : 0);
}
/* Les coefficients que `skateStep` lit (`o.stats`) : le matériel, combiné. Les multiplicateurs se MULTIPLIENT. */
export function skateKitStats(k) {
  const n = skateKitNorm(k), K = SKATE_KITS[n.type], S = n.suit ? SKATE_SUIT : null;
  return {
    vmaxK: K.vmaxK * (S ? S.vmaxK : 1), accK: K.accK * (S ? S.accK : 1), turnK: K.turnK, carry: K.carry,
    glideK: K.glideK * (S ? S.glideK : 1), brakeK: K.brakeK,
  };
}
const NEUTRAL = { vmaxK: 1, accK: 1, turnK: 1, carry: 0, glideK: 1, brakeK: 1 };

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LES FIGURES DE LA PRATIQUE LIBRE : le saut, la vrille, l'axel (un saut vrillé), la marche arrière, le cygne.
   ╚════════════════════════════════════════════════════════════════════════════
   Guillaume : « la possibilité de faire des figures en pratique libre : des sauts, des vrilles, des marches arrière ».
   ⚠️ UNE FIGURE EST UNE MACHINE À DURÉE, PAS UNE POSE : `st.trick = { kind, t, dur, h, turns }`. Elle avance avec `dt`
   (jamais une horloge lue) et rend à chaque pas `st.air` (la hauteur, px, de l'arc) et `st.spin` (les tours faits, réel) ;
   le jeu les DESSINE, il ne les calcule pas. Pendant le saut on est en l'air : AUCUNE poussée, AUCUN virage (la vitesse
   s'entretient presque seule) ; la vrille au sol freine un peu (`SPIN_DRAG`). `st.landed` vaut le nom de la figure pendant
   UN pas, à l'atterrissage — c'est ce qui déclenche la gerbe.
   ⚠️ LA MARCHE ARRIÈRE (`o.back`) plafonne la croisière (`BACK_K`) : on ne file pas à reculons aussi vite qu'en avant.
   ⚠️ LE CYGNE (`st.coast`) n'est pas une touche : en roue libre, vite, une jambe se lève toute seule — le patineur qui
   file sans pousser. C'est de l'attitude, rien de commandé.
   ⚠️ L'ENCHAÎNEMENT (`st.chain`) compte les figures rapprochées de moins de `CHAIN_S` secondes : de l'affichage seul, il
   ne donne RIEN (aucune prime, §4 : un panneau qui ne donne rien). Les figures n'existent qu'en pratique libre — le jeu
   ne les propose pas pendant une course. */
export const TRICK = {
  HOP:  { T: 0.58, H: 11 },
  SPIN: { T: 0.74, TURNS: 1 },
  /* 2026-10-06 — LA VRILLE S'EMBALLE (Guillaume : « plus rapide quand on fait V deux fois de suite rapidement, ou qu'on appuie
     de manière répétée »). Quatre NIVEAUX : le premier est la vrille d'avant ; chaque V de plus PENDANT la vrille repart du tour
     où l'on est (l'angle ne saute jamais) vers un segment plus court et plus riche en tours — `G` tours en `T` secondes : 1,35
     puis 2,6, 3,8, 5,4 tours/s. Le niveau change le CODE du paquet (`spin1`…), donc les autres voient la même chose sans rien
     recevoir de plus. `GAP` : l'écart minimal entre deux V pour que la seconde compte (le rebond d'une touche n'embraie pas). */
  SPIN_LV: [{ T: 0.74, G: 1 }, { T: 0.62, G: 1.6 }, { T: 0.56, G: 2.2 }, { T: 0.52, G: 2.8 }],
  SPIN_GAP: 0.03,
  AXEL: { T: 0.92, H: 14, TURNS: 1.5 },
  AXEL_MIN_V: 2.2,       // l'élan qu'il faut pour un axel
  SPIN_DRAG: 0.9,        // /s : la vrille au sol mange un peu de lancée
  AIR_K: 0.12,           // /s : la traînée en l'air
  BACK_K: 0.7,           // la croisière à reculons
  CHAIN_S: 3.4,
  COAST_V: 3.0, COAST_T: 0.45,
  /* LE FREINAGE BRUT (2026-10-06, touche C tenue) : l'arrêt de hockey, lames de travers — il mange la vitesse plus fort que
     le freinage à contresens (`SKATE.BRAKE`, 13) — de la croisière à l'arrêt en ~0,45 s et un peu plus d'une case et demie — et jette la grande gerbe. Aucun ordre n'est écouté tant qu'il dure. */
  STOP_BRAKE: 17, STOP_MIN_V: 1.6,
};
/* Les codes qui voyagent dans le paquet de position (`[code, âge]`, jamais un nom) : 0 rien. */
export const TRICK_CODE = { hop: 1, spin: 2, axel: 3, back: 4, swan: 5, stop: 6, spin1: 7, spin2: 8, spin3: 9 };
export const TRICK_NAMES = ["", "hop", "spin", "axel", "back", "swan", "stop", "spin1", "spin2", "spin3"];
/* Un nom de code (« spin2 ») → la figure (« spin ») et son niveau (2). Le dessin et la machine lisent la MÊME courbe. */
export function skateTrickBase(name) {
  if (typeof name === "string" && name.startsWith("spin")) return { kind: "spin", lv: name.length > 4 ? Math.max(0, Math.min(TRICK.SPIN_LV.length - 1, (+name.slice(4)) | 0)) : 0 };
  return { kind: name, lv: 0 };
}
/* L'ARC D'UNE FIGURE À LA PROGRESSION `u` (0..1) : la hauteur (px) et les tours faits. UNE seule courbe, lue par ma machine
   (`skateStep`) ET par le dessin des autres (qui ne reçoivent que le code et l'âge) — jamais deux copies (§8). */
export function skateTrickAt(kind, u, lv, a0) {
  const base = skateTrickBase(kind), k = Math.max(0, Math.min(1, u));
  const sl = TRICK.SPIN_LV[Math.max(0, Math.min(TRICK.SPIN_LV.length - 1, (lv | 0) || base.lv))];
  /* ⚠️ UNE VRILLE FINIT SUR UN TOUR ENTIER (on retombe de face) : le gain d'un segment s'arrondit au tour supérieur à partir
     de l'angle où il démarre (`a0`, 0 pour la première). Les autres, qui estiment `a0` sur leur horloge, s'arrondissent
     eux-mêmes — ils retombent de face aussi. */
  const D = base.kind === "hop" ? TRICK.HOP : base.kind === "spin" ? { T: sl.T, TURNS: Math.ceil((a0 || 0) + sl.G - 1e-6) - (a0 || 0) } : TRICK.AXEL;
  return { air: D.H ? D.H * Math.sin(k * Math.PI) : 0, spin: D.TURNS * (k * k * (3 - 2 * k) * 0.5 + k * 0.5), dur: D.T };   // départ et arrivée doux, milieu rapide
}
/* Lancer une figure. Rend `true` si elle part : chaussé, en glisse (pas tombé, pas déjà en figure), et pour l'axel avec
   de l'élan. `o.skates` : chaussé ; `o.free` : pratique libre (hors course). */
export function skateTrickStart(st, kind, o) {
  if (!st || !o || !o.skates || o.free === false) return false;
  if (st.mode !== "glide" || st.trick) return false;
  const sp = Math.hypot(st.vx, st.vy);
  let T, h = 0, turns = 0;
  if (kind === "hop") { T = TRICK.HOP.T; h = TRICK.HOP.H; }
  else if (kind === "spin") { T = TRICK.SPIN.T; turns = TRICK.SPIN.TURNS; }
  else if (kind === "axel") { if (sp < TRICK.AXEL_MIN_V) return false; T = TRICK.AXEL.T; h = TRICK.AXEL.H; turns = TRICK.AXEL.TURNS; }
  else return false;
  st.trick = { kind, t: 0, dur: T, h, turns, lv: 0, a0: 0 };
  st.chain = st.chainT > 0 ? st.chain + 1 : 1; st.chainT = TRICK.CHAIN_S + T;
  st.lastTrick = kind;
  return true;
}
/* UN V DE PLUS PENDANT LA VRILLE : on passe au niveau suivant, depuis le tour où l'on est (`a0`, l'angle déjà fait — jamais un
   saut d'angle) ; le segment repart de zéro à la vitesse du niveau. Rend `true` si la vrille s'emballe (pas déjà au dernier
   niveau, pas dans l'écart `SPIN_GAP` du segment qui vient de démarrer, vrille seule — ni le saut ni l'axel).
   `force` : passe outre l'écart — le jeu s'en sert pour les V pressés AVANT que la vrille ne démarre (elle attend `COMBO_MS` pour
   savoir si l'on veut l'axel) : un double V très rapide compte, il ne se perd pas dans cette attente. */
export function skateTrickBoost(st, force) {
  const tk = st && st.trick;
  if (!tk || tk.kind !== "spin" || st.mode !== "glide") return false;
  if (tk.lv >= TRICK.SPIN_LV.length - 1 || (!force && tk.t < TRICK.SPIN_GAP)) return false;
  tk.lv++; tk.a0 = st.spin || 0; tk.t = 0; tk.dur = TRICK.SPIN_LV[tk.lv].T;
  st.chainT = TRICK.CHAIN_S + tk.dur;
  return true;
}
/* Ce que le dessin lit : la hauteur de l'arc, les tours, le sens de la marche arrière, le cygne, le freinage. `null` hors
   figure. `lv` : le niveau d'une vrille. */
export function skateTrickView(st) {
  if (!st) return null;
  const tk = st.trick;
  if (tk) return { kind: tk.kind, air: st.air || 0, spin: st.spin || 0, u: Math.min(1, tk.t / tk.dur), lv: tk.lv | 0 };
  if (st.hard) return { kind: "stop", air: 0, spin: 0, u: 0, lv: 0 };
  if (st.back && Math.hypot(st.vx, st.vy) > 0.35) return { kind: "back", air: 0, spin: 0, u: 0, lv: 0 };
  if (st.coast > TRICK.COAST_T) return { kind: "swan", air: 0, spin: 0, u: 0, lv: 0 };
  return null;
}
/* Le code du paquet de position (0 si rien) : la figure en cours (une vrille emballée porte son niveau), sinon le freinage
   brut, sinon la marche arrière, sinon le cygne. */
export function skateTrickCode(st) {
  const v = skateTrickView(st);
  if (!v) return 0;
  return TRICK_CODE[v.kind === "spin" && v.lv ? "spin" + v.lv : v.kind] | 0;
}

/* ⚠️ 2026-10-05 (nuit) — LA CULBUTE (`skateTumble`) : trop vite contre la bande de la patinoire (ou les plots d'une course),
   on tombe — SANS blessure (c'est une chute de patineur chaussé, pas la glissade de qui n'a pas de patins) : on perd sa
   vitesse en glissant sur le derrière `TUMBLE_T` secondes, sans pouvoir rien commander, puis on se relève. La course y
   perd une seconde : le virage devient un pari (décidé avec Guillaume : « chute contre la bande »). */
export const SKATE_TUMBLE = { T: 0.95, K: 4.5 };
export function skateTumble(st) {
  if (st.mode === "tumble") return st;
  st.mode = "tumble"; st.t = 0; st.vx *= 0.35; st.vy *= 0.35;
  st.trick = null; st.air = 0; st.spin = 0; st.coast = 0;   // une figure ratée contre la bande s'arrête là
  return st;
}
/* ⚠️ 2026-10-06 — OÙ ON ATTERRIT APRÈS UNE CHUTE SANS PATINS (Guillaume : « ne pas te TP directement à la farm, mais en dehors de la
   zone, sur le bord de l'étang ou du plan d'eau, en dehors de la piste ») : la case libre la plus PROCHE de `(x, y)` pour laquelle
   `clear(px, py)` dit oui — le jeu y met « le corps entier tient, hors de toute glace ». Une recherche en anneaux croissants
   (un demi-pas de 0,5 case, des points de plus en plus serrés) : on rend le premier trouvé, donc l'un des plus proches (à un
   demi-pas près). `dir` : le cap qui REGARDE l'endroit d'où l'on vient (0 sud, 1 nord, 2 ouest, 3 est). `null` si rien à `rMax`. */
export function skateShoreSpot(x, y, clear, rMax = 40) {
  for (let r = 0.5; r <= rMax; r += 0.5) {
    const steps = Math.max(16, Math.round(r * 12));
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (clear(px, py)) { const dx = x - px, dy = y - py; return { x: px, y: py, r, dir: Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0) }; }
    }
  }
  return null;
}
export function skateNew(vx = 0, vy = 0) {
  return { vx, vy, mode: "glide", t: 0, stride: 0, brake: 0, push: 0, bump: 0, trick: null, air: 0, spin: 0, landed: null, landedLv: 0, landedTurns: 0, chain: 0, chainT: 0, back: false, coast: 0, lastTrick: null, hard: false };
}
/* Mettre à jour la machine depuis l'ordre (ix, iy) — unitaire ou nul — pendant
   `dt` secondes. `o.skates` : chaussé ou non ; `o.run` : la touche de course.
   Mute `st` et le rend. */
export function skateStep(st, ix, iy, dt, o) {
  const K = SKATE;
  const skates = !!(o && o.skates);
  st.bump = Math.max(0, st.bump - dt);
  st.brake = 0; st.push = 0; st.hard = false;
  if (!skates) {
    /* ── SANS PATINS : on glisse, on mouline, on tombe. ── */
    if (st.mode === "glide") { st.mode = "slip"; st.t = 0; }
    st.t += dt;
    if (st.mode === "slip") {
      st.vx += ix * K.SLIP_ACC * dt; st.vy += iy * K.SLIP_ACC * dt;
      const k = Math.exp(-K.SLIP_K * dt); st.vx *= k; st.vy *= k;
      if (st.t >= K.SLIP_T) st.mode = "fall";
    } else if (st.mode === "fall") {
      const k = Math.exp(-K.FALL_K * dt); st.vx *= k; st.vy *= k;
      if (st.t >= K.SLIP_T + K.FALL_T) { st.mode = "down"; st.vx = 0; st.vy = 0; }
    } else { st.vx = 0; st.vy = 0; }
    return st;
  }
  /* ── CHAUSSÉ. ── */
  st.landed = null;
  if (st.mode === "tumble") {
    st.t += dt;
    st.trick = null; st.air = 0; st.spin = 0; st.coast = 0;
    const k = Math.exp(-SKATE_TUMBLE.K * dt); st.vx *= k; st.vy *= k;
    if (st.t >= SKATE_TUMBLE.T) { st.mode = "glide"; st.t = 0; }
    return st;
  }
  st.mode = "glide";
  const S = (o && o.stats) || NEUTRAL;
  /* LA FIGURE EN COURS : on est en l'air (saut, axel) ou sur une jambe (vrille) — aucun ordre n'est écouté, la vitesse
     s'entretient presque seule. La fin rend `st.landed` (UN pas) : le jeu y pose la gerbe de l'atterrissage. */
  if (st.trick) {
    const tk = st.trick; tk.t += dt;
    const u = Math.min(1, tk.t / tk.dur);
    const arc = skateTrickAt(tk.kind, u, tk.lv, tk.a0); st.air = arc.air; st.spin = (tk.a0 || 0) + arc.spin;   // `a0` : les tours déjà faits quand la vrille s'est emballée
    const kd = Math.exp(-(tk.h ? TRICK.AIR_K : TRICK.SPIN_DRAG) * dt); st.vx *= kd; st.vy *= kd;
    st.coast = 0; st.back = !!(o && o.back);
    if (tk.t >= tk.dur) { st.landed = tk.kind; st.landedLv = tk.lv | 0; st.landedTurns = Math.round(st.spin || 0); st.trick = null; st.air = 0; st.spin = 0; }
    return st;
  }
  st.air = 0; st.spin = 0;
  if (st.chainT > 0) { st.chainT -= dt; if (st.chainT <= 0) { st.chainT = 0; st.chain = 0; } }
  const sp = Math.hypot(st.vx, st.vy);
  st.back = !!(o && o.back);
  const vmax = (o && o.run ? K.VMAX_RUN : K.VMAX) * (o && o.vmaxK ? o.vmaxK : 1) * S.vmaxK * (st.back ? TRICK.BACK_K : 1);   // `vmaxK` (2026-10-05) : l'aspiration en course
  if (o && o.stop && sp > K.STOP_V) {
    /* LE FREINAGE BRUT (touche tenue) : aucun ordre n'est écouté, la vitesse fond. `st.hard` (au-dessus de `STOP_MIN_V`) dit
       au jeu de jeter la grande gerbe et aux autres, par le code du paquet, de la voir. */
    const nsp = Math.max(0, sp - TRICK.STOP_BRAKE * S.brakeK * dt);
    st.vx *= nsp / sp; st.vy *= nsp / sp;
    st.brake = 2; st.hard = sp > TRICK.STOP_MIN_V;
  } else if (ix || iy) {
    const dot = sp > 1e-6 ? (ix * st.vx + iy * st.vy) / sp : 1;
    if (sp > K.BRAKE_MIN_V && dot < K.BRAKE_DOT) {
      // L'arrêt en travers : on mange la vitesse, on ne la retourne pas.
      const nsp = Math.max(0, sp - K.BRAKE * S.brakeK * dt);
      st.vx *= nsp / sp; st.vy *= nsp / sp;
      st.brake = 1;
    } else {
      // La poussée le long de l'ordre, puis les carres mangent ce qui part de travers.
      const acc = K.ACC * (o && o.accK ? o.accK : 1) * S.accK * (st.back ? 0.85 : 1);
      st.vx += ix * acc * dt; st.vy += iy * acc * dt;
      const par = st.vx * ix + st.vy * iy;
      const kp = Math.exp(-K.TURN_K * S.turnK * dt);
      const px = st.vx - ix * par, py = st.vy - iy * par;
      st.vx = ix * par + px * kp;
      st.vy = iy * par + py * kp;
      /* LE VIRAGE EN CARRES (les longues lames, `carry`) : une part de la vitesse que les carres mangent de travers est
         RENDUE à la nouvelle direction — on tourne serré sans lâcher sa vitesse. Nul pour un patin ordinaire. */
      if (S.carry && par > -1e-6) {
        const eaten = Math.hypot(px, py) * (1 - kp) * S.carry;
        st.vx += ix * eaten; st.vy += iy * eaten;
      }
      const s2 = Math.hypot(st.vx, st.vy);
      if (s2 > vmax) { st.vx *= vmax / s2; st.vy *= vmax / s2; }
      else st.push = 1;
    }
  } else {
    const k = Math.exp(-K.GLIDE_K * S.glideK * dt); st.vx *= k; st.vy *= k;
  }
  const s3 = Math.hypot(st.vx, st.vy);
  if (s3 < K.STOP_V && !(ix || iy)) { st.vx = 0; st.vy = 0; }
  /* La foulée n'avance que quand on POUSSE : en roue libre, les jambes restent
     jointes (on file), elles ne pédalent pas dans le vide. */
  if (st.push) st.stride += dt * (K.STRIDE_BASE + K.STRIDE_PER_V * s3);
  /* Le cygne : en roue libre et vite, une jambe se lève (voir TRICK). */
  if (!(ix || iy) && !st.brake && s3 > TRICK.COAST_V) st.coast += dt; else st.coast = 0;
  return st;
}
/* Un axe a buté (la berge, l'eau libre, un pieu) : sa vitesse revient un peu, en
   sens inverse. `axis` : "x" ou "y". Rend la vitesse du choc (pour la gerbe). */
export function skateBump(st, axis) {
  const v = axis === "x" ? st.vx : st.vy;
  if (axis === "x") st.vx = -v * SKATE.BOUNCE; else st.vy = -v * SKATE.BOUNCE;
  if (Math.abs(v) > 1.5) st.bump = 0.25;
  return Math.abs(v);
}
/* MA pose, lue sur ma machine : "glide" (en mouvement), "stand" (immobile sur
   ses lames), "brake", "slip" (les bras moulinent), "fall" (assis sur la glace) ; et
   les figures : "hop", "spin", "axel" (en l'air ou sur une jambe), "swan" (le cygne). */
export function skatePose(st) {
  if (!st) return null;
  if (st.mode === "slip") return "slip";
  if (st.mode === "fall" || st.mode === "down" || st.mode === "tumble") return "fall";
  if (st.trick) return st.trick.kind;
  if (st.brake) return "brake";
  if (st.coast > TRICK.COAST_T) return "swan";
  return Math.hypot(st.vx, st.vy) > 0.35 ? "glide" : "stand";
}
/* LA POSE DES AUTRES, DÉDUITE (rien ne circule de plus) : sur la glace, chaussé,
   on glisse ou on se tient ; déchaussé, on mouline tant qu'on bouge, et un
   déchaussé immobile sur la glace est un déchaussé tombé.
   ⚠️ SEULE EXCEPTION : la FIGURE (`code`, `TRICK_CODE`) ne se déduit pas d'une vitesse — elle voyage dans le paquet de
   position (`tk`, deux nombres : le code et l'âge) ; `u` est sa progression, que le récepteur calcule sur SON horloge. */
export function skateSeen(hasSkates, vx, vy, code) {
  const sp = Math.hypot(vx || 0, vy || 0);
  if (hasSkates) {
    const nm = skateTrickBase(TRICK_NAMES[code | 0]).kind;
    if (nm === "hop" || nm === "spin" || nm === "axel" || nm === "swan") return nm;
    if (nm === "stop") return "brake";   // le freinage brut d'un autre : la pose d'arrêt, et la gerbe (le jeu la lit sur le code)
    return sp > 0.6 ? "glide" : "stand";
  }
  return sp > 0.3 ? "slip" : "fall";
}
/* La phase de foulée d'un patineur qu'on ne fait que voir : sa distance parcourue
   au rythme de la croisière. Rend un réel dont la partie entière alterne les jambes. */
export function skateSeenStride(dist) {
  return dist / 2.4;
}
