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
     bande de neige de la largeur de la boule) — r² += K·d. De R0 à R_MAX en ~11 cases.
     Dans une neige mince, elle ramasse moins (`snowK`, de 0 à MIN_CM à 1 à 6 cm). */
  GROW_K: 0.03,
  SLOW_AT_MAX: 0.55,    // pousser une boule au rayon maximal ralentit la marche de 45 %
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
/* Où se tient la boule qu'on pousse : devant la semelle, dans le sens de la marche,
   à son rayon plus un pas. (fx, fy) : la semelle ; (ux, uy) : le cap unitaire. */
export function rollBallPos(fx, fy, ux, uy, r) {
  const d = r + 0.32;
  return { x: fx + ux * d, y: fy + uy * d };
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
               deco: balls.length === 3 ? normalizeDeco(s.deco) : null, by: s.by || null, at: s.at | 0 || 0, thawAt: s.thawAt || 0 });
  }
  return out;
}
/* Prendre une boule : au sol (`fromId` absent : on la façonne, `R0`), ou la boule du
   HAUT d'un tas qui n'est pas fini (on la reprend telle qu'elle est). On ne prend pas
   une boule sur un bonhomme décoré : on le décore, on ne le démonte pas. */
export function resolveSnowTake(state, pid, zone, fromId, now) {
  const roll = state.snowRoll || (state.snowRoll = {});
  if (roll[pid]) return { ok: false, reason: "busy" };
  if (!fromId) { roll[pid] = { r: SNOWMAN.R0, zone, at: now }; return { ok: true, r: SNOWMAN.R0 }; }
  const list = state.snowmen || [];
  const k = list.findIndex((s) => s.id === fromId && s.zone === zone);
  if (k < 0) return { ok: false, reason: "gone" };
  const s = list[k];
  if (s.deco) return { ok: false, reason: "done" };
  const r = s.balls.pop();
  if (!s.balls.length) list.splice(k, 1);
  roll[pid] = { r, zone, at: now };
  return { ok: true, r };
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
  const rMax = rollGrow(held.r, dt * (maxCasesPerS || 5.2), 1);
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
