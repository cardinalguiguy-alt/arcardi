/* ==========================================================================
   Pendule des Échecs — HORODATÉE (audit 2026-09-24, lot 2).

   CE QU'ELLE REMPLACE, ET POURQUOI. L'hôte comptait des TOPS : un setInterval
   d'une seconde retirait 1 s au camp au trait à l'instant du top. Un coup joué
   entre deux tops coûtait donc 0 ou 1 s selon la phase, jamais son vrai temps ;
   un fil principal bloqué (l'ordinateur calculait 0,5 à 1 s sur ce même fil)
   sautait des tops, donc du temps jamais décompté. Et pour que les invités
   voient la pendule bouger, l'hôte la rediffusait toutes les 10 s.

   ICI, UNE PENDULE EST UN ÉTAT, PAS UN COMPTEUR : ce qui reste à chacun, qui
   est au trait, et DEPUIS QUAND (horloge de l'hôte). Le temps d'un coup est
   une soustraction de deux dates : précis à la milliseconde, insensible aux
   gels du fil principal. Et elle ne se diffuse plus du tout à part — elle
   voyage dans le message `state` que chaque coup envoyait déjà (§3 de
   CLAUDE.md : ce qui peut se déduire ne se diffuse pas). Gain réseau : tous
   les messages `clock` périodiques disparaissent.

   ⚠️ DEUX HORLOGES, JAMAIS COMPARÉES (§3 de CLAUDE.md). L'hôte date avec
   Date.now() ; chaque client affiche avec SA performance.now(), à partir de
   l'instant où IL a reçu le message (`at`). On ne compare jamais une date de
   l'hôte à une date de l'invité : seules des DURÉES traversent le réseau
   (ce qui reste, depuis combien de temps l'invité réfléchit).

   ⚠️ COMPENSATION DE LATENCE (comme lichess, en plus simple). Le coup d'un
   invité met un aller-retour à arriver ; sans compensation, l'invité paie à
   chaque coup la latence de SA liaison (100 à 300 ms, soit 4 à 12 s sur une
   partie de 40 coups — énorme en 3+2). Il envoie donc son temps de réflexion
   mesuré chez lui, et l'hôte le croit dans une limite : jamais plus de
   LAG_COMP_MS de rabais par coup. Entre amis, la triche n'est pas le sujet ;
   la borne existe pour qu'un bogue d'horloge ne donne pas du temps infini.
   Aucun React, aucun DOM.
   ========================================================================== */

export const LAG_COMP_MS = 500;

// clock = { w: ms restantes, b: ms restantes, side: "w"|"b"|null, since: date hôte }
// `since` peut être dans le FUTUR : pendant le décompte 3-2-1, la pendule des
// Blancs ne démarre qu'à sa fin.
export function clockRemaining(clock, color, now) {
  if (!clock) return 0;
  const base = clock[color];
  if (clock.side !== color) return base;
  return base - Math.max(0, now - clock.since);
}

// Facture le coup de `mover`. `thinkMs` = réflexion mesurée par le joueur
// (null = on ne mesure que l'écoulé, cas de l'hôte et de l'ordinateur).
// Rend { flagged, charged, clock } — la nouvelle pendule donne le trait à
// l'autre camp, incrément compris.
export function chargeMove(clock, mover, now, { incMs = 0, thinkMs = null, lagCompMs = 0 } = {}) {
  const elapsed = Math.max(0, now - clock.since);
  let charged = elapsed;
  if (thinkMs != null && Number.isFinite(thinkMs)) {
    charged = Math.min(elapsed, Math.max(thinkMs, elapsed - lagCompMs, 0));
  }
  const left = clock[mover] - charged;
  if (left <= 0) return { flagged: true, charged, clock: { ...clock, [mover]: 0, side: null, since: now } };
  const other = mover === "w" ? "b" : "w";
  return { flagged: false, charged, clock: { ...clock, [mover]: left + incMs, side: other, since: now } };
}

// Arrête la pendule (fin de partie, reprise de coup) : le camp qui tournait
// paie ce qu'il a déjà consommé, sans incrément.
export function stopClock(clock, now) {
  if (!clock || !clock.side) return clock;
  const left = Math.max(0, clockRemaining(clock, clock.side, now));
  return { ...clock, [clock.side]: left, side: null, since: now };
}

// Ce que l'hôte diffuse : ce qui reste À L'INSTANT DE L'ENVOI, plus le délai
// avant que la pendule ne démarre (décompte). Aucune date absolue.
export function snapshotClock(clock, now) {
  if (!clock) return null;
  return {
    w: Math.max(0, clockRemaining(clock, "w", now)),
    b: Math.max(0, clockRemaining(clock, "b", now)),
    side: clock.side || null,
    startIn: Math.max(0, (clock.since || 0) - now),
  };
}

// Affichage chez un client : snap = { w, b, side, at } où `at` est SA date
// locale (performance.now()) à partir de laquelle le camp au trait décompte.
export function snapRemaining(snap, color, localNow) {
  if (!snap) return 0;
  if (snap.side !== color) return Math.max(0, snap[color]);
  return Math.max(0, snap[color] - Math.max(0, localNow - snap.at));
}

// « 4:59 » ; sous 10 s, les dixièmes (« 0:09.4 »), comme lichess — c'est
// là que chaque dixième se joue. Toujours ARRONDI VERS LE BAS : afficher
// « 0:01 » quand il reste 0,4 s serait mentir au joueur qui compte dessus.
export function fmtClock(ms) {
  const t = Math.max(0, ms);
  if (t < 10000) {
    const tenths = Math.floor(t / 100);
    return "0:0" + Math.floor(tenths / 10) + "." + (tenths % 10);
  }
  const s = Math.floor(t / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + (r < 10 ? "0" : "") + r;
}
