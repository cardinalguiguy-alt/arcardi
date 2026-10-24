/* ╔══════════════════════════════════════════════════════════════════════════
   ║ expressions.js — LES EXPRESSIONS AUTOMATIQUES DES PERSONNAGES EN 32 × 48 (2026-10-23)
   ╚══════════════════════════════════════════════════════════════════════════
   Pur (aucun DOM, aucun réseau) : `FermeGame.js` lui tend, à chaque image et pour chaque personnage dessiné, ce qu'il sait DÉJÀ de lui
   (sa pose, son assise, sa blessure, l'heure du jeu…) et les événements qu'il a datés à la RÉCEPTION (une course gagnée, un cadeau, un
   poisson) ; ce module choisit le visage. Rien ne circule de plus : ce qu'un joueur voit, son ami le voit aussi (CLAUDE.md §3).
   Le visage lui-même est dessiné par `persoHdArt.js` (une feuille par expression, `S.getCharHD(…, expr)`) ; en 16 × 24, rien ne change.

   LES VERDICTS DE GUILLAUME (page d'arbitrage du 2026-10-23) :
   - sommeil : au lit (`drawSleeper`, déjà fait) ; ASSIS plus d'une minute après 22 h, partout (il se réveille dès qu'il se lève) ;
   - surprise : la chute (patin, park, glace sans patins, glissade du cratère), puis une seconde ;
   - gêne : toute la blessure ;
   - rire (3 s) : gagner une course, une figure à deux, une grosse figure posée au park (vrille complète, combo) ;
   - joie (2,5 s) : nouvelle tenue ou coupe, cadeau ou troc, poisson, figure simple posée (park, patin), un ami qui arrive ;
   - deux joueurs assis côte à côte : la joie PAR MOMENTS — « pour l'instant c'est la joie, ou rien ; pas systématique » (les cœurs
     viendront avec les relations amoureuses, docs/PROJETS.md) ;
   - le clignement : tout le monde, PNJ compris, toutes les 3 à 6 s ;
   - les PNJ restent sobres : le clignement et le sommeil seulement (« certains sont nerveux : pondérer selon le caractère », plus tard) ;
   - colère, tristesse, clin d'œil : dessinés, aucun déclencheur (les interactions entre personnages, plus tard).
   L'ordre, quand deux se chevauchent : sommeil > surprise > gêne > rire > joie > joie d'être assis ensemble > clignement > neutre. */

export const EXPR = {
  SURPRISE_MAX: 2000,   // une chute qui dure (un déchaussé immobile sur la glace reste « tombé ») : la surprise n'en prend que le début…
  SURPRISE_TAIL: 1000,  // … et la garde encore une seconde
  RIRE: 3000, JOIE: 2500,
  BLINK_MS: 110, BLINK_MIN: 3000, BLINK_SPAN: 3000,   // un dixième de seconde, toutes les 3 à 6 s selon le personnage
  DOZE_AFTER: 60000, DOZE_FROM_MIN: 22 * 60,          // assis plus d'une minute, après 22 h (l'heure du jeu, en minutes)
  ARRIVE_GAP: 60000,                                  // un ami « arrive » s'il n'était pas là depuis une minute
  SIT_WIN: 12000, SIT_JOY: 3000, SIT_ODDS: 0.35,      // assis ensemble : une fenêtre de 12 s sur trois environ commence par 3 s de joie
};

// Un entier tiré d'une chaîne (l'identifiant) : le rythme propre à chacun, le même sur toutes les machines.
export function exprHash(s, salt = 0) {
  let h = 2166136261 ^ salt;
  const t = String(s);
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* La mémoire d'un personnage, tenue par l'appelant (une par identifiant). */
export function newExprMem() {
  // `seenAt` : la dernière image où l'appelant l'a vu dans SA zone (un ami qui arrive, FermeGame.js `exprArrivals`)
  return { fallT0: null, surpriseUntil: 0, rireUntil: 0, joieUntil: 0, sitSince: null, look: undefined, air: null, fig: null, seenAt: null };
}
/* Un événement daté à la réception : « rire » ou « joie ». */
export function exprMark(mem, kind, now) {
  if (kind === "rire") mem.rireUntil = Math.max(mem.rireUntil, now + EXPR.RIRE);
  else if (kind === "joie") mem.joieUntil = Math.max(mem.joieUntil, now + EXPR.JOIE);
}

const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); return (a < 0 ? a + 2 * Math.PI : a) - Math.PI; };
const FIG_SKATE = new Set(["hop", "spin", "axel", "swan"]);
const LANDED_SKATE = new Set(["glide", "stand", "brake"]);
/* LES RETOMBÉES, lues sur la pose qu'on dessine (la mienne comme celle des autres, déduite chez chacun) :
   - au park (`ride` : { mode, th, flip, yaw, bar, whip, grab, nohand, xup }) : pendant le vol on cumule la rotation du cap et l'on note
     si une figure a bougé le corps ou la monture ; à la retombée (le vol cesse, sans chute), une vrille complète, ou une figure ET un
     demi-tour, font rire ; une figure seule ou un demi-tour, sourire ;
   - au patin (`skate`, la pose) : une figure (saut, vrille, axel, cygne) qui finit en glisse, à l'arrêt ou au freinage = posée. */
export function exprRideStep(mem, ride, now) {
  if (ride && ride.mode === "air") {
    const moved = !!(ride.flip || ride.yaw || ride.bar || ride.whip || ride.grab || ride.nohand || ride.xup);
    if (!mem.air) mem.air = { th: ride.th || 0, spin: 0, trick: moved };
    else { mem.air.spin += Math.abs(wrapA((ride.th || 0) - mem.air.th)); mem.air.th = ride.th || 0; mem.air.trick = mem.air.trick || moved; }
    return;
  }
  const a = mem.air;
  mem.air = null;
  if (!a || !ride || ride.mode === "bail") return;
  const full = a.spin >= 1.9 * Math.PI, half = a.spin >= 0.9 * Math.PI;
  if (full || (a.trick && half)) exprMark(mem, "rire", now);
  else if (a.trick || half) exprMark(mem, "joie", now);
}
export function exprSkateStep(mem, pose, now) {
  if (FIG_SKATE.has(pose)) { mem.fig = pose; return; }
  if (mem.fig && LANDED_SKATE.has(pose)) exprMark(mem, "joie", now);
  mem.fig = null;
}
/* Le changement de tenue ou de coupe : la chaîne `look` change (pas à la première fois qu'on la voit). */
export function exprLookStep(mem, look, now) {
  const l = look || "";
  if (mem.look !== undefined && mem.look !== l) exprMark(mem, "joie", now);
  mem.look = l;
}

/* LE CHOIX. `s` : { id, npc, seated, gameMin, falling, hurt, buddy } — `buddy` : un autre joueur assis à côté. Rend un nom de
   `PERSO_HD_EXPRESSIONS`. Met à jour la mémoire (début de chute, début d'assise). */
export function exprPick(mem, s, now) {
  if (s.seated) { if (mem.sitSince == null) mem.sitSince = now; } else mem.sitSince = null;
  if (s.falling) {
    if (mem.fallT0 == null) mem.fallT0 = now;
    if (now - mem.fallT0 < EXPR.SURPRISE_MAX) mem.surpriseUntil = now + EXPR.SURPRISE_TAIL;
  } else mem.fallT0 = null;
  const dozing = s.seated && now - mem.sitSince >= EXPR.DOZE_AFTER && s.gameMin >= EXPR.DOZE_FROM_MIN;
  if (dozing) return "sommeil";
  if (!s.npc) {
    if (now < mem.surpriseUntil) return "surprise";
    if (s.hurt) return "gene";
    if (now < mem.rireUntil) return "rire";
    if (now < mem.joieUntil) return "joie";
    if (s.buddy && s.seated) {
      const ph = exprHash(s.id, 7) % EXPR.SIT_WIN, t = now + ph, k = Math.floor(t / EXPR.SIT_WIN);
      if (t % EXPR.SIT_WIN < EXPR.SIT_JOY && (exprHash(s.id + ":" + k, 11) % 1000) / 1000 < EXPR.SIT_ODDS) return "joie";
    }
  }
  const period = EXPR.BLINK_MIN + (exprHash(s.id, 3) % EXPR.BLINK_SPAN), ph = exprHash(s.id, 5) % period;
  if ((now + ph) % period < EXPR.BLINK_MS) return "cligne";
  return "neutre";
}
