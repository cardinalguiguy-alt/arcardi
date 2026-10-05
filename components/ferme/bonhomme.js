/* =============================================================================
   bonhomme.js — LE BONHOMME DE NEIGE (2026-10-05), PUR.
   -----------------------------------------------------------------------------
   Guillaume : « possibilité de construire un bonhomme de neige quand le sol est
   couvert de neige » ; tranché avec lui : ON ROULE LES BOULES (elles grossissent
   en roulant et creusent leur traînée dans la neige), on en empile trois, puis on
   CHOISIT les accessoires (chapeau, écharpe, nez, bras, une touche de plus).
   Sur les deux cartes (la ferme et Valley Town), partagé entre les joueurs, et il
   fond avec la neige.

   Ce fichier ne sait rien du dessin ni du réseau : il dit combien une boule
   grossit, ce qui s'empile sur quoi, ce que l'hôte accepte, et comment un
   bonhomme s'affaisse au dégel. `tools/verify-bonhomme.mjs` le joue.

   ⚠️ CE QUI CIRCULE (§3 de CLAUDE.md : seul le nombre de `send()` compte) : une
   `req` pour PRENDRE une boule (au sol ou sur un tas), une pour la POSER, une pour
   DÉCORER — trois ou quatre messages par bonhomme. Pendant qu'on roule, RIEN : la
   boule des autres se dessine devant eux et grossit avec la distance qu'on leur
   voit parcourir sur la neige (la même fonction, `rollGrow`), et l'hôte tranche la
   taille finale à la pose (bornée : `ROLL_R_MAX`, et pas plus que ce qu'une
   distance plausible donne).
   ⚠️ LE DÉGEL EST UN ÉTAT DE L'HÔTE, PAS UN CALCUL DE CHACUN : quand la neige a
   quitté le sol de sa carte (ou que l'hiver est fini), l'hôte date `thawAt` une
   fois ; chacun dessine l'affaissement depuis cette date (`slumpAt`), et l'hôte
   retire le bonhomme au bout de `THAW_MS`. Deux joueurs voient donc le même
   bonhomme fondre au même rythme, sans comparer leurs horloges au-delà de ce
   qu'un horodatage d'hôte diffusé permet déjà partout ailleurs.
   ========================================================================== */

export const SNOWMAN = {
  MIN_CM: 2.5,          // la neige qu'il faut sous la boule pour qu'elle prenne (cm) — sous 2,5, elle racle le sol
  R0: 0.16,             // le rayon d'une boule qu'on vient de façonner (cases)
  R_MAX: 0.62,          // au-delà, elle ne grossit plus : on ne la pousse plus (une case et quart de diamètre)
  /* La croissance : l'AIRE de la boule croît avec la distance roulée (on ramasse une
     bande de neige de la largeur de la boule) — r² += K·d. De R0 à R_MAX en ~15 cases (~11 avant le 2026-10-05).
     Dans une neige mince, elle ramasse moins (`snowK`, de 0 à MIN_CM à 1 à 6 cm). */
  GROW_K: 0.024,        // 2026-10-05 : 0,03 → 0,024 — « plus long de les pousser quand elles grossissent » : de R0 à R_MAX en ~15 cases au lieu de ~12
  SLOW_AT_MAX: 0.28,    // 2026-10-05 : 0,55 → 0,28 — pousser une boule au rayon maximal ralentit la marche de 72 % (avant : 45 %)
  CARRY_SLOW_AT_MAX: 0.7, // une boule PORTÉE (soulevée, elle ne roule pas) pèse moins qu'une boule poussée : la marche ralentit de 30 % au rayon maximal
  STACK_RATIO: 0.92,    // une boule ne tient sur une autre que si elle est au plus 92 % de son rayon
  STACK_REACH: 0.9,     // cases, du centre de la boule qu'on pose au centre du tas
  PICK_REACH: 1.1,      // cases, de la semelle au centre d'une boule qu'on reprend
  MAX_PER_ZONE: 14,     // tas (boules comprises) par carte : l'état partagé reste petit
  THAW_MS: 16 * 60 * 1000,   // une journée de jeu pour fondre, une fois la neige partie
  THAW_SNOW_CM: 0.3,    // sous cette neige au sol, le dégel commence
};

/* LE CATALOGUE DES ACCESSOIRES. Chaque emplacement a ses options ; la première est
   celle d'un bonhomme qu'on n'a pas encore décoré. Les yeux et la bouche de charbon
   sont toujours là : c'est ce qui fait un visage, on ne les choisit pas.
   ⚠️ LES CLÉS SONT DES DONNÉES DE PARTIE (persistées, diffusées) : on n'en renomme
   jamais une, on en ajoute. */
export const SNOWMAN_DECO = {
  hat:   ["none", "tophat", "beanie", "bucket", "beret"],
  scarf: ["none", "red", "green", "blue"],
  nose:  ["carrot", "none"],
  arms:  ["twigs", "broom", "none"],
  extra: ["none", "pipe", "buttons"],
};
export const SNOWMAN_DECO_DEFAULT = { hat: "none", scarf: "red", nose: "carrot", arms: "twigs", extra: "buttons" };
/* Un décor reçu (d'une `req`, d'une sauvegarde) ramené au catalogue : une valeur
   inconnue retombe sur le défaut de son emplacement, un emplacement absent aussi. */
export function normalizeDeco(d) {
  const out = {};
  for (const k of Object.keys(SNOWMAN_DECO)) {
    const v = d && d[k];
    out[k] = SNOWMAN_DECO[k].includes(v) ? v : SNOWMAN_DECO_DEFAULT[k];
  }
  return out;
}

/* Ce que la neige donne à une boule qui roule dessus (0..1) selon son épaisseur. */
export function snowK(depthCm) {
  if (!(depthCm > SNOWMAN.MIN_CM)) return 0;
  return Math.min(1, (depthCm - SNOWMAN.MIN_CM) / (6 - SNOWMAN.MIN_CM) * 0.7 + 0.3);
}
/* Le rayon après avoir roulé `d` cases dans une neige qui donne `k`. */
export function rollGrow(r, d, k) {
  if (!(d > 0) || !(k > 0) || r >= SNOWMAN.R_MAX) return Math.min(r, SNOWMAN.R_MAX);
  return Math.min(SNOWMAN.R_MAX, Math.sqrt(r * r + SNOWMAN.GROW_K * k * d));
}
/* Le facteur de marche quand on pousse une boule de rayon `r`. */
export function rollSpeedMul(r) {
  const u = Math.max(0, Math.min(1, (r - SNOWMAN.R0) / (SNOWMAN.R_MAX - SNOWMAN.R0)));
  return 1 - (1 - SNOWMAN.SLOW_AT_MAX) * u;
}
/* Le facteur de marche quand on PORTE une boule soulevée (2026-10-05) : elle ne grossit pas, ne
   creuse aucune traînée, et pèse moins que celle qu'on pousse. */
export function carrySpeedMul(r) {
  const u = Math.max(0, Math.min(1, (r - SNOWMAN.R0) / (SNOWMAN.R_MAX - SNOWMAN.R0)));
  return 1 - (1 - SNOWMAN.CARRY_SLOW_AT_MAX) * u;
}
/* Où se tient la boule qu'on pousse : devant la semelle, dans le sens de la marche,
   à son rayon plus un pas. (fx, fy) : la semelle ; (ux, uy) : le cap unitaire. */
export function rollBallPos(fx, fy, ux, uy, r) {
  const d = r + 0.32;
  return { x: fx + ux * d, y: fy + uy * d };
}

/* Où se tient une boule PORTÉE : soulevée dans les bras, tout contre la semelle (et non à son rayon plus
   un pas devant, comme celle qu'on pousse). C'est ce qui permet de la poser sur un tas qu'on touche. */
export function carryBallPos(fx, fy, ux, uy) {
  return { x: fx + ux * 0.42, y: fy + uy * 0.42 };
}

/* ── L'HÔTE ────────────────────────────────────────────────────────────────
   L'état partagé : `snowmen`, une liste de tas { id, zone, x, y, balls: [r…] (du bas
   vers le haut, 1 à 3), deco (null tant qu'il n'a pas ses trois boules), by, at,
   thawAt }, et `snowRoll`, ce que chaque joueur pousse : { [id]: { r, zone, at } }.
   Les résolveurs MUTENT ce qu'on leur passe et rendent { ok, reason, … }. */
export function normalizeSnowmen(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const s of list) {
    if (!s || typeof s.x !== "number" || typeof s.y !== "number" || !Array.isArray(s.balls)) continue;
    const balls = s.balls.filter((r) => typeof r === "number" && r > 0).slice(0, 3).map((r) => Math.min(SNOWMAN.R_MAX, r));
    if (!balls.length) continue;
    out.push({ id: String(s.id || ""), zone: s.zone === "town" ? "town" : "farm", x: s.x, y: s.y, balls,
               deco: balls.length === 3 ? normalizeDeco(s.deco) : null, by: s.by || null, at: s.at | 0 || 0, thawAt: s.thawAt || 0,
               // Les coups reçus voyagent avec le tas (2026-10-05) : l'hôte relit sa propre diffusion, et sans eux chaque coup compterait pour le premier.
               hits: typeof s.hits === "number" ? s.hits : 0, hitAt: typeof s.hitAt === "number" ? s.hitAt : 0 });
  }
  return out;
}
/* Prendre une boule : au sol (`fromId` absent : on la façonne, `R0`, et on la ROULE), ou la boule du
   HAUT d'un tas qui n'est pas fini (on la reprend telle qu'elle est ; `carry` : on la SOULÈVE, elle ne
   grossit plus — 2026-10-05, « pour contrôler leur taille » — sinon on la roule). On ne prend pas
   une boule sur un bonhomme décoré : on le décore, on ne le démonte pas. */
export function resolveSnowTake(state, pid, zone, fromId, now, carry) {
  const roll = state.snowRoll || (state.snowRoll = {});
  if (roll[pid]) return { ok: false, reason: "busy" };
  if (!fromId) { roll[pid] = { r: SNOWMAN.R0, zone, at: now, carry: false }; return { ok: true, r: SNOWMAN.R0 }; }
  const list = state.snowmen || [];
  const k = list.findIndex((s) => s.id === fromId && s.zone === zone);
  if (k < 0) return { ok: false, reason: "gone" };
  const s = list[k];
  if (s.deco) return { ok: false, reason: "done" };
  const r = s.balls.pop();
  if (!s.balls.length) list.splice(k, 1);
  roll[pid] = { r, zone, at: now, carry: !!carry };
  return { ok: true, r, carry: !!carry };
}
/* Passer de « je roule » à « je porte » (ou l'inverse) : un geste, une `req`. La taille au moment du
   basculement est celle que le joueur annonce, bornée comme à la pose (on ne roule pas plus vite que la
   marche) ; l'hôte la RETIENT comme nouvelle base (`held.r`, `held.at`), pour que la pose qui suit soit
   bornée depuis ce moment-là et non depuis la prise (sinon une boule roulée puis soulevée serait
   ramenée à sa taille de départ). */
export function resolveSnowMode(state, pid, zone, carry, rClaim, now, maxCasesPerS) {
  const roll = state.snowRoll || (state.snowRoll = {});
  const held = roll[pid];
  if (!held || held.zone !== zone) return { ok: false, reason: "none" };
  const dt = Math.max(0, (now - (held.at || now)) / 1000);
  const rMax = held.carry ? held.r : rollGrow(held.r, dt * (maxCasesPerS || 5.2), 1);
  held.r = Math.max(held.r, Math.min(SNOWMAN.R_MAX, rMax, +rClaim || 0));
  held.at = now; held.carry = !!carry;
  return { ok: true, r: held.r, carry: held.carry };
}
/* Poser la boule qu'on pousse en (x, y), rayon `r` annoncé. L'hôte borne le rayon :
   jamais plus que `R_MAX`, jamais moins que ce qu'on a pris, et pas plus que ce que
   permet le temps écoulé depuis la prise (on ne roule pas onze cases en une seconde :
   `maxCasesPerS` est la croisière de la marche). Près d'un tas qui n'a pas ses trois
   boules et dont la boule du haut est assez grosse : elle s'EMPILE ; sinon elle se
   pose seule (si la carte n'est pas pleine). Rend `{ ok, id, stacked, done }` —
   `done` : le tas vient d'avoir sa troisième boule (on ouvre le choix du décor). */
export function resolveSnowDrop(state, pid, zone, x, y, rClaim, now, maxCasesPerS, newId) {
  const roll = state.snowRoll || (state.snowRoll = {});
  const held = roll[pid];
  if (!held || held.zone !== zone) return { ok: false, reason: "none" };
  const dt = Math.max(0, (now - (held.at || now)) / 1000);
  // Une boule PORTÉE ne grossit pas : la taille annoncée est au plus celle qu'on tenait (2026-10-05).
  const rMax = held.carry ? held.r : rollGrow(held.r, dt * (maxCasesPerS || 5.2), 1);
  const r = Math.max(held.r, Math.min(SNOWMAN.R_MAX, rMax, +rClaim || 0));
  delete roll[pid];
  const list = state.snowmen || (state.snowmen = []);
  let best = null, bestD = Infinity;
  for (const s of list) {
    if (s.zone !== zone || s.deco || s.balls.length >= 3) continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= SNOWMAN.STACK_REACH && d < bestD) { best = s; bestD = d; }
  }
  if (best) {
    const top = best.balls[best.balls.length - 1];
    if (r > top * SNOWMAN.STACK_RATIO) {
      // Trop grosse pour tenir dessus : elle se pose à côté, comme une boule de plus.
      if (list.filter((s) => s.zone === zone).length >= SNOWMAN.MAX_PER_ZONE) return { ok: false, reason: "full", r };
      const id = newId();
      list.push({ id, zone, x, y, balls: [r], deco: null, by: pid, at: now, thawAt: 0 });
      return { ok: true, id, stacked: false, tooBig: true, r };
    }
    best.balls.push(r);
    const done = best.balls.length === 3;
    if (done) best.deco = { ...SNOWMAN_DECO_DEFAULT };
    return { ok: true, id: best.id, stacked: true, done, r };
  }
  if (list.filter((s) => s.zone === zone).length >= SNOWMAN.MAX_PER_ZONE) return { ok: false, reason: "full", r };
  const id = newId();
  list.push({ id, zone, x, y, balls: [r], deco: null, by: pid, at: now, thawAt: 0 });
  return { ok: true, id, stacked: false, r };
}
/* Décorer un bonhomme fini (le sien ou celui d'un autre : c'est un jeu à plusieurs). */
export function resolveSnowDeco(state, id, deco) {
  const s = (state.snowmen || []).find((q) => q.id === id);
  if (!s) return { ok: false, reason: "gone" };
  if (!s.deco) return { ok: false, reason: "notDone" };
  if (s.thawAt) return { ok: false, reason: "thaw" };
  s.deco = normalizeDeco(deco);
  return { ok: true };
}
/* ── LES COUPS DE PIED (2026-10-05) ──────────────────────────────────────────
   Guillaume : « un moyen de détruire une boule, ou le bonhomme entier : des coups de pied (ça fait
   exploser les boules et les détruit). Respecter la physique naturelle : si l'on kick un bonhomme
   une fois il ne se passera quasiment rien, peut-être qu'une boule va tomber au pire ; mais si l'on
   kick de manière répétée alors on le détruira. »
   LA RÈGLE : chaque tas porte `hits`, des coups qui S'ESTOMPENT (passé `GRACE_MS`, un coup par `DECAY_MS` retombe) :
   deux coups espacés ne valent pas deux coups rapprochés — c'est la différence entre taper dans
   une boule et la marteler. Une boule SEULE explose en 1 à 3 coups selon sa taille (une petite se
   brise, une grosse résiste). Un bonhomme (2 ou 3 boules) encaisse : à chaque coup la boule du
   HAUT peut tomber (12 % au premier coup, puis 35, 60, 85 %), et il ne s'écroule d'un coup, en
   explosant, qu'à `DESTROY_HITS` coups rapprochés. La boule tombée devient une boule seule, posée
   à côté dans le sens du coup, que l'on peut reprendre — ou achever. Un bonhomme décoré qui perd
   sa tête perd son décor (il n'a plus trois boules).
   Tout se joue côté hôte (aléa passé en argument : un banc le rejoue) ; un joueur ne frappe pas
   plus d'une fois par `GAP_MS`, ce qui borne les messages (§3 : un coup = une `req`). */
export const KICK = {
  REACH: 1.25,          // cases, de la semelle au bord de la boule du bas, pour la frapper (la latence : l'hôte tolère +1)
  GAP_MS: 420,          // un coup toutes les 0,42 s au plus, par joueur
  GRACE_MS: 1200,       // des coups séparés de moins de 1,2 s ne retombent pas du tout : c'est le martèlement
  DECAY_MS: 4500,       // au-delà, un coup « retombe » en 4,5 s
  DESTROY_HITS: [0, 0, 4, 5],   // coups rapprochés qui détruisent un tas de 2 ou de 3 boules (indice = nombre de boules)
  FALL_P: [0.12, 0.35, 0.6, 0.85],   // chance que la boule du haut tombe, au 1er, 2e, 3e, 4e coup et suivants
};
/* Combien de coups pour briser une boule SEULE de rayon `r` : 1 (petite), 2, ou 3 (grosse). */
export function snowKicksToBreak(r) {
  const u = Math.max(0, Math.min(1, (r - SNOWMAN.R0) / (SNOWMAN.R_MAX - SNOWMAN.R0)));
  return u < 0.34 ? 1 : u < 0.72 ? 2 : 3;
}
/* Un coup de pied sur le tas `sid` (zone `zone`) : (ux, uy) est le sens du coup (unitaire, du pied vers
   le tas). Rend { ok, id, x, y, r, n, hits, destroyed, fell: {x, y, r} | null }. */
export function resolveSnowKick(state, pid, zone, sid, now, rnd, newId, ux, uy) {
  const gap = state.snowKickAt || (state.snowKickAt = {});
  if (now - (gap[pid] || 0) < KICK.GAP_MS) return { ok: false, reason: "gap" };
  const list = state.snowmen || (state.snowmen = []);
  const k = list.findIndex((s) => s.id === sid && s.zone === zone);
  if (k < 0) return { ok: false, reason: "gone" };
  gap[pid] = now;
  const s = list[k], n = s.balls.length;
  const dt = s.hitAt ? Math.max(0, now - s.hitAt - KICK.GRACE_MS) : 0;
  s.hits = Math.max(0, (s.hits || 0) - dt / KICK.DECAY_MS) + 1;
  s.hitAt = now;
  const out = { ok: true, id: s.id, x: s.x, y: s.y, r: s.balls[0], n, hits: s.hits, destroyed: false, fell: null };
  if (n === 1) {
    if (s.hits >= snowKicksToBreak(s.balls[0]) - 1e-6) { list.splice(k, 1); out.destroyed = true; }
    return out;
  }
  if (s.hits >= KICK.DESTROY_HITS[n] - 1e-6) { list.splice(k, 1); out.destroyed = true; return out; }
  const p = KICK.FALL_P[Math.min(KICK.FALL_P.length - 1, Math.max(0, Math.round(s.hits) - 1))];
  if (rnd() < p) {
    const r = s.balls.pop(), below = s.balls[s.balls.length - 1];
    s.deco = null;
    s.hits *= 0.6;
    const l = Math.hypot(ux || 0, uy || 0) || 1, dx = (ux || 0) / l, dy = (uy || 0) / l;
    const d = (below + r) * 0.95 + 0.12, fx = s.x + (l === 1 && !ux && !uy ? 1 : dx) * d, fy = s.y + dy * d;
    out.fell = { x: fx, y: fy, r };
    if (list.filter((q) => q.zone === zone).length < SNOWMAN.MAX_PER_ZONE)
      list.push({ id: newId(), zone, x: fx, y: fy, balls: [r], deco: null, by: pid, at: now, thawAt: s.thawAt || 0 });
  }
  return out;
}
/* Écraser la boule qu'on tient (la pousse ou la porte) : un coup de pied dedans, elle explose. */
export function resolveSnowSmashHeld(state, pid) {
  const roll = state.snowRoll || (state.snowRoll = {});
  const held = roll[pid];
  if (!held) return { ok: false, reason: "none" };
  delete roll[pid];
  return { ok: true, r: held.r, zone: held.zone };
}
/* Le tic de l'hôte : `snowAt(zone)` rend la neige au sol de cette carte (cm),
   `winter` dit si c'est l'hiver. Date le dégel une fois, retire ce qui a fini de
   fondre, et oublie ce qu'un joueur parti poussait (`alive(pid)`). Rend `true` si
   l'état a changé (à diffuser). */
export function snowmenTick(state, now, snowAt, winter, alive) {
  let changed = false;
  const list = state.snowmen || [];
  for (let k = list.length - 1; k >= 0; k--) {
    const s = list[k];
    if (!s.thawAt && (!winter || snowAt(s.zone) < SNOWMAN.THAW_SNOW_CM)) { s.thawAt = now; changed = true; }
    if (s.thawAt && now - s.thawAt >= SNOWMAN.THAW_MS) { list.splice(k, 1); changed = true; }
  }
  const roll = state.snowRoll || {};
  for (const pid of Object.keys(roll)) if (alive && !alive(pid)) { delete roll[pid]; changed = true; }
  return changed;
}
/* L'affaissement (0 intact .. 1 fondu) d'un tas à l'instant `now`. */
export function slumpAt(s, now) {
  if (!s || !s.thawAt) return 0;
  return Math.max(0, Math.min(1, (now - s.thawAt) / SNOWMAN.THAW_MS));
}
/* Le tas le plus proche d'un point (cases) sur une carte, avec sa distance. */
export function nearestSnowman(list, zone, x, y) {
  let best = null, bd = Infinity;
  for (const s of list || []) {
    if (s.zone !== zone) continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? { s: best, d: bd } : null;
}
/* Un tas bloque-t-il le point (cases) ? Son pied : un disque du rayon de sa boule du
   bas, un peu rogné (on frôle un bonhomme sans s'y cogner de loin). */
export function snowmanBlocks(list, zone, x, y, now) {
  for (const s of list || []) {
    if (s.zone !== zone) continue;
    const r = s.balls[0] * (1 - 0.5 * slumpAt(s, now)) * 0.8;
    if (Math.hypot(s.x - x, s.y - y) < r) return true;
  }
  return false;
}
