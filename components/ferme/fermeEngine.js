/* ==========================================================================
   FERME VALLÉE (jeu 22) — moteur PUR (logique testable en Node).
   ==========================================================================
   Contient : génération déterministe du monde à partir d'une seed (identique
   sur tous les clients, comme le futur match_start), résolution des actions
   arbitrée côté hôte (labour, arrosage, semis, récolte, coupe, minage), achat
   / vente / repas, et passage au jour suivant. Aucune dépendance React ni DOM :
   ce fichier se charge et se teste en Node (voir bloc `module.exports` en fin).

   Portage FIDÈLE de la maquette validée (le module "Net-local" du prototype) :
   les valeurs et l'ordre des tirages aléatoires sont préservés pour que le
   monde généré soit exactement celui montré à la validation.

   Modèle réseau ARCARDI (host-authoritative) : l'HÔTE détient le monde
   (ground/objects/objHp/crops), l'or commun et le temps ; il applique les
   actions via ce moteur et rediffuse les deltas. Chaque fermier a un état
   privé (énergie, outils, inventaire) que l'hôte arbitre aussi. Les positions
   des joueurs, elles, sont diffusées de pair à pair (non arbitrées) car
   purement coopératives.
   ========================================================================== */

import * as C from "./fermeConstants";

const idx = (x, y) => y * C.MAP_W + x;
export const xOf = (i) => i % C.MAP_W;
export const yOf = (i) => Math.floor(i / C.MAP_W);
const inMap = (x, y) => x >= 0 && y >= 0 && x < C.MAP_W && y < C.MAP_H;

// RNG déterministe (LCG), identique à la maquette.
export function makeRng(seed) {
  let s = seed & 0x7fffffff;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/* -------------------------------------------------------------------------
   Génération du monde depuis une seed. Retourne des structures SÉRIALISABLES
   (ground/objects = tableaux plats, objHp/crops = Map en mémoire). Tous les
   clients appellent ceci avec la même seed -> monde identique.
   ------------------------------------------------------------------------- */
export function generateWorld(seed) {
  const W = C.MAP_W, H = C.MAP_H;
  const rnd = makeRng(seed);
  const ground = new Array(W * H).fill(C.G_GRASS);
  const objects = new Array(W * H).fill(C.O_NONE);
  const objHp = new Map();
  const crops = new Map();

  function placeObj(x, y, type, hp) {
    if (!inMap(x, y)) return;
    const i = idx(x, y);
    if (ground[i] !== C.G_GRASS || objects[i] !== C.O_NONE) return;
    objects[i] = type; objHp.set(i, hp);
  }

  // Rivière sinueuse + berges
  let rx = 95; const riverCenter = [];
  for (let y = 0; y < H; y++) {
    rx += (rnd() - 0.5) * 2.2; rx = Math.max(70, Math.min(120, rx));
    riverCenter.push(rx);
    const half = 2.2 + Math.sin(y * 0.15) * 0.8;
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x - rx);
      if (d < half) ground[idx(x, y)] = C.G_WATER;
      else if (d < half + 1.6) ground[idx(x, y)] = C.G_SAND;
    }
  }
  // Deux sites de pont (chantier 2026-07, demande Guillaume) : les ponts ne
  // sont plus déjà construits à la génération, ce sont des chantiers
  // (G_BRIDGE_SITE) que les joueurs bâtissent case par case, en bois ou en
  // pierre (voir resolveAct cas "bridge"). Mêmes 2 emplacements et la même
  // largeur de traversée qu'avant (aucun changement de géométrie), seul le
  // type de sol posé change (site à construire au lieu de pont fini).
  for (const by of [42, 100]) for (let y = by; y < by + 3; y++) {
    const cx = Math.round(riverCenter[y]);
    for (let x = cx - 6; x <= cx + 6; x++)
      if (inMap(x, y) && (ground[idx(x, y)] === C.G_WATER || ground[idx(x, y)] === C.G_SAND)) ground[idx(x, y)] = C.G_BRIDGE_SITE;
  }
  // Maison, boutique, bac, chemin
  for (let y = C.HOUSE.y; y < C.HOUSE.y + C.HOUSE.h; y++) for (let x = C.HOUSE.x; x < C.HOUSE.x + C.HOUSE.w; x++) objects[idx(x, y)] = C.O_HOUSE;
  objects[idx(C.SHOP.x, C.SHOP.y)] = C.O_SHOP;
  objects[idx(C.BIN.x, C.BIN.y)] = C.O_BIN;
  for (let y = C.HOUSE.y + C.HOUSE.h; y < C.HOUSE.y + C.HOUSE.h + 3; y++) for (let x = C.HOUSE.x + 1; x < C.HOUSE.x + 5; x++) ground[idx(x, y)] = C.G_PATH;
  // Bosquets d'arbres
  for (let c = 0; c < 26; c++) {
    const cx = Math.floor(rnd() * W), cy = Math.floor(rnd() * H);
    const r = 4 + rnd() * 9, n = 10 + Math.floor(rnd() * 22);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * r;
      placeObj(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), rnd() < 0.35 ? C.O_TREE2 : C.O_TREE, C.TREE_HP);
    }
  }
  for (let i = 0; i < 260; i++) placeObj(Math.floor(rnd() * W), Math.floor(rnd() * H), rnd() < 0.3 ? C.O_TREE2 : C.O_TREE, C.TREE_HP);
  for (let i = 0; i < 340; i++) placeObj(Math.floor(rnd() * W), Math.floor(rnd() * H), C.O_ROCK, C.ROCK_HP);
  // Dégager les abords de la ferme
  for (let y = C.HOUSE.y - 4; y < C.HOUSE.y + C.HOUSE.h + 14; y++)
    for (let x = C.HOUSE.x - 8; x < C.HOUSE.x + C.HOUSE.w + 14; x++) {
      if (!inMap(x, y)) continue;
      const o = objects[idx(x, y)];
      if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK) { objects[idx(x, y)] = C.O_NONE; objHp.delete(idx(x, y)); }
    }
  // Dégager aussi l'emplacement (fixe) de la grange, à droite de l'enclos de
  // départ (zip 161) : sol forcé en herbe (au cas où la rivière serpenterait
  // par là) et arbres/rochers retirés, sur une zone assez large pour
  // accueillir le palier 3 (le plus grand bâtiment du jeu, voir
  // barnSprite() dans fermeArt.js).
  for (let y = C.BARN_SITE.y - 15; y < C.BARN_SITE.y + 5; y++)
    for (let x = C.BARN_SITE.x - 10; x < C.BARN_SITE.x + 10; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      ground[i] = C.G_GRASS;
      const o = objects[i];
      if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK) { objects[i] = C.O_NONE; objHp.delete(i); }
    }

  // Enclos de départ : construit avec de VRAIES sections de clôture (comme
  // celles posées librement par les joueurs), plutôt qu'un simple décor sans
  // collision. Permet de le retirer/replacer pièce par pièce avec le même
  // outil clôture (zip 151, demande "modifier l'enclos fixe pour le déplacer
  // pièce par pièce"). Une ouverture reste laissée en bas au centre.
  // Placé APRÈS la génération des arbres/rochers et leur nettoyage aux abords
  // de la ferme (ci-dessus), pour ne pas être écrasé par eux.
  {
    const p = C.PEN;
    const midX = p.x + Math.floor(p.w / 2);
    for (let y = p.y; y < p.y + p.h; y++) {
      for (let x = p.x; x < p.x + p.w; x++) {
        const onLeft = x === p.x, onRight = x === p.x + p.w - 1;
        const onTop = y === p.y, onBottom = y === p.y + p.h - 1;
        if (!onLeft && !onRight && !onTop && !onBottom) continue; // intérieur
        if (onBottom && x === midX) continue; // portail
        const i = idx(x, y);
        const type = (onLeft || onRight) && (onTop || onBottom) ? C.O_FENCE
          : (onLeft || onRight) ? C.O_FENCE_V : C.O_FENCE_H;
        objects[i] = type; objHp.set(i, 1);
      }
    }
  }

  return { w: W, h: H, ground, objects, objHp, crops };
}

// Applique des overrides persistés (reprise après rechargement) sur un monde
// fraîchement généré depuis la même seed.
export function applyOverrides(world, saved) {
  if (!saved) return world;
  if (saved.groundOv) for (const k in saved.groundOv) world.ground[+k] = saved.groundOv[k];
  if (saved.objectOv) for (const k in saved.objectOv) {
    const [o, hp] = saved.objectOv[k];
    world.objects[+k] = o;
    if (o === C.O_NONE) world.objHp.delete(+k); else world.objHp.set(+k, hp);
  }
  world.crops.clear();
  if (saved.crops) for (const row of saved.crops) {
    const [i, t] = row;
    if (row.length >= 5) {
      // Format d'un zip antérieur au 151 ([i,t,s,prog,watered], pousse par
      // jour de jeu) : pas de conversion fiable vers le nouveau modèle en
      // temps réel, on redémarre la pousse de cette culture à zéro (elle
      // garde son type/emplacement, juste sa progression repart de zéro).
      world.crops.set(i, { t, bankedMs: 0, wateredAt: null });
    } else {
      const [, , bankedMs, wateredAt] = row;
      world.crops.set(i, { t, bankedMs: bankedMs || 0, wateredAt: wateredAt || null });
    }
  }
  return world;
}

export function serializeCrops(world) {
  const out = [];
  for (const [i, c] of world.crops) out.push([i, c.t, c.bankedMs || 0, c.wateredAt || 0]);
  return out;
}

// État de pousse d'une culture au temps `now` (ms epoch), calculé PUREMENT à
// partir de son horodatage d'arrosage et de sa progression déjà "banquée" :
// aucun état supplémentaire à synchroniser, chaque client peut le recalculer
// localement à tout instant (comme gameTimeMin). L'arrosage reste valable
// C.WATER_VALID_MS : passé ce délai sans réarroser, la pousse est mise en
// pause (elle ne recule jamais) jusqu'au prochain arrosage.
export function cropGrowState(crop, now) {
  const def = C.CROPS[crop.t];
  const dur = def.growMs;
  const extra = crop.wateredAt ? Math.min(now - crop.wateredAt, C.WATER_VALID_MS) : 0;
  const grown = Math.min(dur, (crop.bankedMs || 0) + extra);
  const stage = Math.min(C.CROP_STAGES - 1, Math.floor((grown / dur) * (C.CROP_STAGES - 1)));
  const mature = grown >= dur;
  const stale = !crop.wateredAt || (now - crop.wateredAt) >= C.WATER_VALID_MS;
  const needsWater = !mature && stale;
  // Humidité visuelle du sol (chantier 2026-07, remplace la goutte d'eau
  // barrée) : 1 = sol le plus foncé (juste arrosé), 0 = teinte claire
  // d'origine (arrosage expiré = "il faut réarroser", seule indication
  // désormais). Reste à 1 pendant WATER_DARK_MS, puis décroît linéairement
  // jusqu'à 0 pile à WATER_VALID_MS — jamais recalculée/stockée, purement
  // dérivée de `wateredAt` comme le reste de cette fonction.
  let wetness = 0;
  if (crop.wateredAt) {
    const elapsed = now - crop.wateredAt;
    if (elapsed <= C.WATER_DARK_MS) wetness = 1;
    else if (elapsed >= C.WATER_VALID_MS) wetness = 0;
    else wetness = 1 - (elapsed - C.WATER_DARK_MS) / (C.WATER_VALID_MS - C.WATER_DARK_MS);
  }
  return { stage, mature, needsWater, grown, wetness };
}

// Idem pour un animal d'élevage : prêt à ramasser si `now` a dépassé
// `readyAt`. Purement dérivé, comme cropGrowState.
export function animalReady(an, now) {
  return !!an && now >= (an.readyAt || 0);
}

// Temps de construction réels d'une infrastructure (lampadaire, et futures
// constructions similaires — chantier 2026-07, "modèle Clash of Clans") :
// `readyAt` est l'horodatage stocké dans `world.objHp` au moment de la pose
// (voir BUILD_TIMES dans fermeConstants.js). Purement dérivé de `now`, même
// principe que cropGrowState/animalReady : aucun message réseau
// supplémentaire nécessaire pour faire avancer un chantier.
export function buildReady(readyAt, now) {
  return now >= (readyAt || 0);
}
export function buildRemainingMs(readyAt, now) {
  return Math.max(0, (readyAt || 0) - now);
}

// Rareté des gemmes selon la distance à la maison (chantier 2026-07, demande
// Guillaume) : purement dérivée de la position de la case minée, comme
// cropGrowState/animalReady/buildReady sont dérivés d'un horodatage — aucun
// état supplémentaire à synchroniser. Multiplicateur interpolé linéairement
// entre GEM_HOUSE_NEAR_MULT (à GEM_HOUSE_NEAR_RADIUS cases ou moins du centre
// de la maison) et GEM_HOUSE_FAR_MULT (à GEM_HOUSE_FAR_RADIUS cases ou plus),
// appliqué à GEM_DROP_CHANCE. Voir fermeConstants.js pour le détail/les
// valeurs (extrapolées, à ajuster librement).
const HOUSE_CX = C.HOUSE.x + C.HOUSE.w / 2;
const HOUSE_CY = C.HOUSE.y + C.HOUSE.h / 2;
export function gemChanceAt(x, y) {
  const d = Math.hypot(x - HOUSE_CX, y - HOUSE_CY);
  const span = C.GEM_HOUSE_FAR_RADIUS - C.GEM_HOUSE_NEAR_RADIUS;
  const t = span > 0 ? Math.max(0, Math.min(1, (d - C.GEM_HOUSE_NEAR_RADIUS) / span)) : 1;
  const mult = C.GEM_HOUSE_NEAR_MULT + t * (C.GEM_HOUSE_FAR_MULT - C.GEM_HOUSE_NEAR_MULT);
  return C.GEM_DROP_CHANCE * mult;
}

// Position réelle/affichée d'un animal (zip 152) : dérivée PUREMENT de son
// ancrage (`hx`/`hy`, seule valeur synchronisée) et de l'horodatage, comme
// cropGrowState/gameTimeMin. Chaque client calcule exactement la même
// position sans le moindre message réseau supplémentaire. Un animal en
// cours de transport (`carriedBy`) n'a pas de position propre : l'appelant
// doit alors utiliser la position du fermier qui le porte.
export function animalPos(an, now) {
  if (!an) return { x: 0, y: 0 };
  if (an.carriedBy) return { x: an.hx, y: an.hy };
  const seed = Math.abs(Math.round(an.hx * 97 + an.hy * 131 + an.type * 17)) % 1000;
  const period = C.ANIMAL_WANDER_PERIOD_MS + (seed % 5) * 700; // légère variété par animal
  const amp = C.ANIMAL_WANDER_RADIUS;
  const t = now / period;
  const dx = Math.sin(t * 2 * Math.PI + seed) * amp;
  const dy = Math.cos(t * 1.7 * Math.PI + seed * 0.6) * amp * 0.7;
  return { x: an.hx + dx, y: an.hy + dy };
}

// Filet de sécurité pour les animaux restaurés d'une sauvegarde antérieure au
// zip 151/152 (schéma `hasProduct` au lieu de `readyAt`, ou `x`/`y` au lieu
// de l'ancrage `hx`/`hy` introduit au zip 152), même principe que
// normalizeFarmer : ne jamais rien perdre de ce qui existe déjà.
export function normalizeAnimals(animals) {
  const now = Date.now();
  for (const a of (animals || [])) {
    if (typeof a.readyAt !== "number") {
      const prodMs = (C.ANIMALS[a.type] && C.ANIMALS[a.type].prodMs) || 0;
      a.readyAt = a.hasProduct ? now : now + prodMs;
    }
    if (typeof a.hx !== "number") { a.hx = typeof a.x === "number" ? a.x : 0; a.hy = typeof a.y === "number" ? a.y : 0; }
    if (a.carriedBy === undefined) a.carriedBy = null;
  }
  return animals || [];
}

/* -------------------------------------------------------------------------
   État initial d'un fermier (privé, arbitré par l'hôte).
   ------------------------------------------------------------------------- */
export function newFarmer(id, name, gender, outfit) {
  return {
    id, name: String(name || "Fermier").slice(0, 14), gender: gender === "f" ? "f" : "m", outfit: outfit | 0,
    x: C.SPAWN.x, y: C.SPAWN.y, dir: 0, moving: false, tool: 0,
    energy: C.MAX_ENERGY,
    sleepStartedAt: null, sleepStartEnergy: 0, // dort actuellement ? (voir resolveSleepStart/End)
    tools: { hoe: 1, can: 1, axe: 1, pick: 1 },
    inv: {
      wood: 0, stone: 0, food: 0, fence: 0, wall: 0, path: 0, lamp: 0, scarecrow: 0,
      seeds: [5, 0, 0, 0], crops: [0, 0, 0, 0],
      gems: C.GEMS.map(() => 0),      // gemmes rares trouvées au minage
      fish: C.FISH.map(() => 0),      // poissons pêchés
      products: C.ANIMALS.map(() => 0), // productions d'élevage ramassées
    },
    quests: {}, // id de quête -> true quand accomplie
  };
}

// Bonus de ressources par niveau de hache/pioche (demande Guillaume 2026-07) :
// niveau 1 = quantité de base inchangée, chaque niveau supplémentaire multiplie
// par C.TOOL_YIELD_MULT (1.5 par défaut). Fonction pure, arrondie à l'entier
// le plus proche (au moins 1 pour ne jamais tomber à 0 sur une petite base).
function toolYield(base, level) {
  return Math.max(1, Math.round(base * Math.pow(C.TOOL_YIELD_MULT, Math.max(0, level - 1))));
}

// Complète un tableau numérique à la longueur attendue (préserve les valeurs
// déjà présentes). Sert à faire évoluer le schéma d'inventaire sans jamais
// perdre ce qu'un fermier possède déjà.
function padArray(arr, len) {
  const out = Array.isArray(arr) ? arr.slice(0, len) : [];
  while (out.length < len) out.push(0);
  return out;
}

// Remet un fermier (potentiellement restauré d'une sauvegarde ANCIENNE, d'avant
// l'ajout des gemmes/poissons/productions/quêtes) au format attendu par le
// moteur actuel, SANS jamais perdre ce qu'il possède déjà. Indispensable :
// une ferme durable (table ferme_saves) peut avoir été créée par un zip bien
// antérieur à l'ajout d'un champ ; sans ce filet, la moindre lecture d'un
// champ absent (ex. f.inv.fish[i]) fait planter resolveAct/resolveSell en
// pleine résolution côté hôte, ce qui empêche l'envoi du message `apply` et
// donne l'impression que RIEN ne se passe (pêche invisible, quêtes jamais
// cochées, etc.) alors que l'action a pourtant réussi.
export function normalizeFarmer(f) {
  if (!f) return f;
  f.tools = f.tools || {};
  for (const k of C.TOOLS) if (typeof f.tools[k] !== "number") f.tools[k] = 1;
  if (typeof f.energy !== "number") f.energy = C.MAX_ENERGY;
  if (typeof f.sleepStartedAt !== "number") f.sleepStartedAt = null;
  if (typeof f.sleepStartEnergy !== "number") f.sleepStartEnergy = 0;
  f.inv = f.inv || {};
  if (typeof f.inv.wood !== "number") f.inv.wood = 0;
  if (typeof f.inv.stone !== "number") f.inv.stone = 0;
  if (typeof f.inv.food !== "number") f.inv.food = 0;
  if (typeof f.inv.fence !== "number") f.inv.fence = 0;
  if (typeof f.inv.wall !== "number") f.inv.wall = 0;
  if (typeof f.inv.path !== "number") f.inv.path = 0;
  if (typeof f.inv.lamp !== "number") f.inv.lamp = 0;
  if (typeof f.inv.scarecrow !== "number") f.inv.scarecrow = 0;
  f.inv.seeds = padArray(f.inv.seeds, C.CROPS.length);
  f.inv.crops = padArray(f.inv.crops, C.CROPS.length);
  f.inv.gems = padArray(f.inv.gems, C.GEMS.length);
  f.inv.fish = padArray(f.inv.fish, C.FISH.length);
  f.inv.products = padArray(f.inv.products, C.ANIMALS.length);
  f.quests = f.quests || {};
  return f;
}

// Tirage pondéré d'un index dans une liste d'objets ayant un champ `weight`.
function weightedPick(list, rnd) {
  let total = 0;
  for (const it of list) total += it.weight || 0;
  let r = (rnd || Math.random)() * total;
  for (let i = 0; i < list.length; i++) { r -= list[i].weight || 0; if (r <= 0) return i; }
  return list.length - 1;
}

const canReach = (f, x, y) =>
  Math.abs(f.x + 0.5 - (x + 0.5)) <= C.ACT_RANGE && Math.abs(f.y + 0.5 - (y + 0.5)) <= C.ACT_RANGE;
const nearT = (f, t) => Math.abs(f.x - t.x) <= 2.5 && Math.abs(f.y - t.y) <= 2.5;

// Consomme l'énergie du fermier ; renvoie true si l'action peut se faire.
function useEnergy(f, action, toolKey) {
  let cost = C.ENERGY_COST[action] || 0;
  if (toolKey) cost = Math.max(0.5, cost - (f.tools[toolKey] - 1));
  if (f.energy < cost) return false;
  f.energy = Math.round((f.energy - cost) * 10) / 10;
  return true;
}

/* -------------------------------------------------------------------------
   Résolution d'une action sur le monde (hôte). MUTE world + farmer et renvoie
   les effets à diffuser : { tiles:[{i,g,o}], cropTiles:[i], fx:[...],
   invChanged, toast }. Le composant lit ensuite world pour construire les
   messages tile/crop et met à jour ses overrides de persistance.
   ------------------------------------------------------------------------- */
export function resolveAct(world, f, m) {
  normalizeFarmer(f);
  const res = { tiles: [], cropTiles: [], fx: [], invChanged: false, toast: null, did: null };
  const x = m.x | 0, y = m.y | 0;
  if (!inMap(x, y) || !canReach(f, x, y)) return res;
  const i = idx(x, y), g = world.ground[i], o = world.objects[i];
  const now = Date.now();

  switch (m.action) {
    case "till":
      if (g === C.G_GRASS && o === C.O_NONE && !world.crops.has(i)) {
        if (!useEnergy(f, "till", "hoe")) { res.toast = "tired"; return res; }
        world.ground[i] = C.G_TILLED; res.tiles.push(i); res.fx.push({ k: "till", x, y }); res.invChanged = true;
      }
      break;
    case "water":
      // Arrosage temps réel (zip 151) : recharge la validité de l'arrosage
      // (C.WATER_VALID_MS) pour la culture présente sur la case, en banquant
      // d'abord sa progression déjà acquise (jamais de recul). Sans culture,
      // l'action reste possible (effet visuel seulement) mais n'a pas d'effet
      // durable à sauvegarder.
      if (g === C.G_TILLED || g === C.G_WATERED) {
        if (!useEnergy(f, "water", "can")) { res.toast = "tired"; return res; }
        const c = world.crops.get(i);
        if (c) { c.bankedMs = cropGrowState(c, now).grown; c.wateredAt = now; res.cropTiles.push(i); }
        res.fx.push({ k: "water", x, y }); res.invChanged = true;
      }
      break;
    case "plant": {
      const st = m.seed | 0;
      if ((g === C.G_TILLED || g === C.G_WATERED) && !world.crops.has(i) && st >= 0 && st < C.CROPS.length && f.inv.seeds[st] > 0) {
        f.inv.seeds[st]--;
        world.crops.set(i, { t: st, bankedMs: 0, wateredAt: null });
        res.cropTiles.push(i); res.invChanged = true;
      }
      break;
    }
    case "harvest": {
      const c = world.crops.get(i);
      if (c && cropGrowState(c, now).mature) {
        world.crops.delete(i); world.ground[i] = C.G_TILLED;
        f.inv.crops[c.t]++;
        res.cropTiles.push(i); res.tiles.push(i); res.fx.push({ k: "harvest", x, y, crop: c.t }); res.invChanged = true;
      }
      break;
    }
    case "chop":
      if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_STUMP) {
        if (!useEnergy(f, "chop", "axe")) { res.toast = "tired"; return res; }
        const hp = (world.objHp.get(i) || 1) - f.tools.axe;
        res.fx.push({ k: "chop", x, y });
        if (hp <= 0) {
          const wood = toolYield(o === C.O_STUMP ? 2 : C.TREE_WOOD, f.tools.axe);
          if (o === C.O_STUMP) { world.objects[i] = C.O_NONE; world.objHp.delete(i); }
          else { world.objects[i] = C.O_STUMP; world.objHp.set(i, 2); }
          f.inv.wood += wood;
          res.tiles.push(i); res.fx.push({ k: "treedown", x, y, wood });
        } else world.objHp.set(i, hp);
        res.invChanged = true;
      }
      break;
    case "mine":
      if (o === C.O_ROCK) {
        if (!useEnergy(f, "mine", "pick")) { res.toast = "tired"; return res; }
        const hp = (world.objHp.get(i) || 1) - f.tools.pick;
        res.fx.push({ k: "mine", x, y });
        if (hp <= 0) {
          world.objects[i] = C.O_NONE; world.objHp.delete(i);
          f.inv.stone += toolYield(C.ROCK_STONE, f.tools.pick);
          res.tiles.push(i); res.fx.push({ k: "rockdown", x, y });
          // Gemme rare : chance de trouver une pierre précieuse dans le rocher,
          // modulée par la distance à la maison (chantier 2026-07, voir
          // gemChanceAt ci-dessus).
          if (Math.random() < gemChanceAt(x, y)) {
            const gt = weightedPick(C.GEMS);
            f.inv.gems[gt] = (f.inv.gems[gt] || 0) + 1;
            res.fx.push({ k: "gem", x, y, gem: gt });
          }
        } else world.objHp.set(i, hp);
        res.invChanged = true;
      }
      break;
    case "bridge": {
      // Construction d'une case de pont (chantier 2026-07, demande Guillaume) :
      // uniquement sur un site de chantier existant (G_BRIDGE_SITE, les 2
      // emplacements fixes de traversée posés par generateWorld), au choix en
      // bois ou en pierre (m.material). Coût prélevé DIRECTEMENT sur
      // l'inventaire récolté (pas de section à fabriquer au préalable,
      // contrairement à fence/wall/path). Permanent une fois posée : pas de
      // branche de retrait, contrairement à "fence"/"wall"/"path" ci-dessous
      // (retirer la case sous les pieds d'un joueur en pleine rivière serait
      // dangereux/déroutant, volontairement évité).
      if (g === C.G_BRIDGE_SITE) {
        const mat = m.material === "stone" ? "stone" : "wood";
        if (mat === "stone") {
          if (f.inv.stone < C.BRIDGE_COST_STONE) { res.toast = "noStone"; return res; }
          f.inv.stone -= C.BRIDGE_COST_STONE;
        } else {
          if (f.inv.wood < C.BRIDGE_COST_WOOD) { res.toast = "noWood"; return res; }
          f.inv.wood -= C.BRIDGE_COST_WOOD;
        }
        world.ground[i] = C.G_BRIDGE;
        res.tiles.push(i); res.fx.push({ k: "bridge", x, y, mat }); res.invChanged = true;
      }
      break;
    }
    case "fence": {
      // Clôture posée librement par le joueur (achetée à la boutique, une
      // section à la fois), OU section de l'enclos de départ (désormais
      // construit avec de vraies sections, voir generateWorld) : pose sur une
      // case libre et constructible, ou retire (et récupère) une section déjà
      // posée, quelle que soit son orientation. Aucun coût en énergie, comme
      // planter/récolter.
      // Orientation : par défaut automatique (selon les sections voisines,
      // voir fenceKindAt côté rendu), ou FORCÉE horizontale/verticale si le
      // joueur a tourné l'aperçu avec la touche R avant de poser (m.dir).
      const isFence = o === C.O_FENCE || o === C.O_FENCE_H || o === C.O_FENCE_V;
      if (isFence) {
        world.objects[i] = C.O_NONE; world.objHp.delete(i);
        f.inv.fence = (f.inv.fence || 0) + 1;
        res.tiles.push(i); res.invChanged = true;
      } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.fence > 0) {
          f.inv.fence--;
          world.objects[i] = m.dir === "h" ? C.O_FENCE_H : m.dir === "v" ? C.O_FENCE_V : C.O_FENCE;
          world.objHp.set(i, 1);
          res.tiles.push(i); res.invChanged = true;
        } else res.toast = "noFence";
      }
      break;
    }
    case "wall": {
      // Mur en pierre (construction, zip 154+) : même mécanique que "fence"
      // (pose sur case libre / retire et récupère la section), mais son
      // propre stock (f.inv.wall, fabriqué à partir de pierre, voir
      // resolveCraft) et aucune orientation (un seul sprite, pas de sections
      // qui se prolongent). Ne coûte aucune énergie, comme la clôture.
      if (o === C.O_WALL) {
        world.objects[i] = C.O_NONE; world.objHp.delete(i);
        f.inv.wall = (f.inv.wall || 0) + 1;
        res.tiles.push(i); res.invChanged = true;
      } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.wall > 0) {
          f.inv.wall--;
          world.objects[i] = C.O_WALL; world.objHp.set(i, 1);
          res.tiles.push(i); res.invChanged = true;
        } else res.toast = "noWallStock";
      }
      break;
    }
    case "path": {
      // Chemin dallé (construction, zip 154+) : agit sur le SOL (pas un
      // objet), avec son propre type G_PATH_STONE, DISTINCT du chemin fixe
      // G_PATH devant la maison/le puits (généré par generateWorld/buyWell) :
      // ainsi un joueur ne peut jamais "récupérer" le chemin fixe pour de la
      // pierre gratuite, seul un chemin qu'il a lui-même posé est retirable.
      if (g === C.G_PATH_STONE) {
        world.ground[i] = C.G_GRASS;
        f.inv.path = (f.inv.path || 0) + 1;
        res.tiles.push(i); res.invChanged = true;
      } else if (g === C.G_GRASS && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.path > 0) {
          f.inv.path--;
          world.ground[i] = C.G_PATH_STONE;
          res.tiles.push(i); res.invChanged = true;
        } else res.toast = "noPathStock";
      }
      break;
    }
    case "lamp": {
      // Lampadaire (chantier 2026-07) : même mécanique que "wall" (achetée à
      // la boutique en or, pose/retrait sur une case libre, un seul sprite
      // sans orientation), mais fonctionnel : une fois posé ET construit, il
      // éclaire un rayon autour de lui dès que la nuit tombe (voir
      // nightAlpha/lampsInView côté rendu, FermeGame.js). Aucun coût en
      // énergie. Chantier réel (2026-07, "modèle Clash of Clans") : posé, il
      // n'est PAS immédiatement fonctionnel, `objHp` reçoit l'horodatage de
      // fin de chantier (`now + BUILD_TIMES.lamp`, 15 min réelles pour le
      // niveau 1) plutôt qu'une simple valeur 1 ; voir E.buildReady/
      // E.buildRemainingMs pour dériver l'état du chantier à l'affichage.
      if (o === C.O_LAMP) {
        world.objects[i] = C.O_NONE; world.objHp.delete(i);
        f.inv.lamp = (f.inv.lamp || 0) + 1;
        res.tiles.push(i); res.invChanged = true;
      } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.lamp > 0) {
          f.inv.lamp--;
          world.objects[i] = C.O_LAMP; world.objHp.set(i, now + C.BUILD_TIMES.lamp);
          res.tiles.push(i); res.invChanged = true;
        } else res.toast = "noLampStock";
      }
      break;
    }
    case "scarecrow": {
      // Épouvantail (chantier 2026-07) : même mécanique que "lamp" (achetée à
      // la boutique en or, pose/retrait sur une case libre, chantier réel de
      // 10s avant d'être considéré comme prêt, voir BUILD_TIMES.scarecrow),
      // mais NE bloque PAS le passage (voir blockedTile, fermeEngine.js) :
      // pensé pour être posé au milieu d'un champ de cultures. Pas encore
      // d'effet de jeu actif (contre les oiseaux, pas encore implémentés).
      if (o === C.O_SCARECROW) {
        world.objects[i] = C.O_NONE; world.objHp.delete(i);
        f.inv.scarecrow = (f.inv.scarecrow || 0) + 1;
        res.tiles.push(i); res.invChanged = true;
      } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.scarecrow > 0) {
          f.inv.scarecrow--;
          world.objects[i] = C.O_SCARECROW; world.objHp.set(i, now + C.BUILD_TIMES.scarecrow);
          res.tiles.push(i); res.invChanged = true;
        } else res.toast = "noScarecrowStock";
      }
      break;
    }
    case "fish":
      // Pêche : la case ciblée doit être de l'eau (rivière) et à portée. Le
      // TYPE de poisson est décidé par le minijeu côté client (m.fish) : on
      // ajoute exactement ce poisson (repli sur un tirage si absent/invalide).
      if (g === C.G_WATER) {
        if (!useEnergy(f, "fish", null)) { res.toast = "tired"; return res; }
        let ft = m.fish | 0;
        if (!(ft >= 0 && ft < C.FISH.length)) ft = weightedPick(C.FISH);
        f.inv.fish[ft] = (f.inv.fish[ft] || 0) + 1;
        res.fx.push({ k: "fish", x, y, fish: ft });
        res.invChanged = true;
      } else {
        res.toast = "needWater";
      }
      break;
    default: break;
  }
  if (res.invChanged) res.did = m.action; // pour la détection des quêtes
  return res;
}

/* -------------------------------------------------------------------------
   Missions collaboratives (v1 "grandes lignes", voir COOP_MISSIONS/COOP_SITE
   dans fermeConstants.js). État partagé minimal : { id, parts:[{id,resource,
   target,got}] }, tiré au hasard parmi COOP_MISSIONS, régénéré une fois
   terminé (voir FermeGame.js/hostMaybeStartCoop).
   ------------------------------------------------------------------------- */
export function pickCoopMission(rnd) {
  const list = C.COOP_MISSIONS;
  const def = list[Math.floor((rnd ? rnd() : Math.random()) * list.length)];
  return { id: def.id, parts: def.parts.map(p => ({ id: p.id, resource: p.resource, target: p.target, got: 0 })) };
}

// Dépôt au chantier (touche E à proximité de COOP_SITE, comme la boutique/le
// bac). `m.part` optionnel (partie visée) ; à défaut, on prend la première
// partie inachevée pour laquelle le fermier porte la ressource. Dépose le
// MAXIMUM possible (comme resolveSell/resolveCraft) plutôt que de tout
// refuser si le fermier a plus que le manquant. Renvoie { invChanged, toast,
// deposited, resource, partId, completed }.
export function resolveCoopDeposit(f, coop, m) {
  normalizeFarmer(f);
  const res = { invChanged: false, toast: null, deposited: 0, resource: null, partId: null, completed: false };
  if (!coop) { res.toast = "coopNone"; return res; }
  if (!nearT(f, C.COOP_SITE)) { res.toast = "farCoop"; return res; }
  let part = null;
  if (m.part) part = coop.parts.find(p => p.id === m.part && p.got < p.target);
  if (!part) part = coop.parts.find(p => p.got < p.target && (f.inv[p.resource] || 0) > 0);
  if (!part) { res.toast = "coopNothing"; return res; }
  const have = f.inv[part.resource] || 0;
  const need = part.target - part.got;
  const n = Math.min(have, need);
  if (n <= 0) { res.toast = "coopNothing"; return res; }
  f.inv[part.resource] -= n;
  part.got += n;
  res.invChanged = true; res.deposited = n; res.resource = part.resource; res.partId = part.id;
  if (coop.parts.every(p => p.got >= p.target)) res.completed = true;
  return res;
}

/* -------------------------------------------------------------------------
   Grange collaborative persistante (zip 158, voir BARN_SITE/BARN_LEVELS
   dans fermeConstants.js). État partagé minimal : { level, progress:
   {wood,stone}, ready }. `level` 0..3 = paliers déjà construits (survit
   entre les sessions, comme animals/horse/wellBuilt). `progress` accumule
   les ressources vers le PROCHAIN palier (BARN_LEVELS[level]). `ready`
   passe à true une fois le bois/la pierre ET l'or du palier réunis (or
   ajouté au zip 161, payé depuis la caisse commune dès que le bois/la
   pierre sont au complet) : il ne reste alors plus qu'à réussir le mini-jeu
   de construction (voir FermeGame.js) pour valider le palier.
   ------------------------------------------------------------------------- */
export function newBarnState() { return { level: 0, progress: { wood: 0, stone: 0 }, ready: false }; }

// Capacité d'animaux effective compte tenu des paliers de grange déjà construits.
export function barnAnimalCap(level) {
  let cap = C.MAX_ANIMALS;
  for (let i = 0; i < (level | 0) && i < C.BARN_LEVELS.length; i++) cap += C.BARN_LEVELS[i].animalBonus;
  return cap;
}

// Dépôt de bois/pierre au chantier de la grange (même logique que
// resolveCoopDeposit : dépose le maximum possible, déduit la ressource
// depuis ce que porte le fermier). Ne fait rien si la grange est déjà au
// niveau maximum ou si le palier en cours est déjà "prêt" (il ne manque
// plus que le mini-jeu, pas de ressources/argent).
// `money` = caisse commune actuelle (lecture seule, fournie par l'appelant
// hôte, voir FermeGame.js) : une fois bois/pierre au complet, il faut AUSSI
// que la caisse contienne `def.cost.money` pour que la grange devienne
// "prête" ; l'or est alors déduit par l'APPELANT (res.moneySpent > 0), pas
// ici, pour garder cette fonction cohérente avec le reste du moteur (jamais
// de mutation directe de `s.money`, toujours via shareState() côté hôte).
export function resolveBarnDeposit(f, barn, m, money) {
  normalizeFarmer(f);
  const res = { invChanged: false, toast: null, deposited: 0, resource: null, becameReady: false, moneySpent: 0 };
  if (!barn || barn.level >= C.BARN_LEVELS.length) { res.toast = "barnMax"; return res; }
  if (!nearT(f, C.BARN_SITE)) { res.toast = "farBarn"; return res; }
  if (barn.ready) { res.toast = "barnReady"; return res; }
  const def = C.BARN_LEVELS[barn.level];
  const resourcesDone = barn.progress.wood >= def.cost.wood && barn.progress.stone >= def.cost.stone;
  if (resourcesDone) {
    // Il ne manque plus que l'or : pas de bois/pierre à déposer ici, on se
    // contente de vérifier la caisse commune (permet de revenir réessayer
    // après avoir vendu de quoi compléter la somme, sans rien reporter).
    if ((money || 0) < def.cost.money) { res.toast = "barnNeedMoney"; return res; }
    barn.ready = true; res.becameReady = true; res.moneySpent = def.cost.money;
    return res;
  }
  let resource = null;
  if (m.res && (barn.progress[m.res] || 0) < def.cost[m.res] && (f.inv[m.res] || 0) > 0) resource = m.res;
  if (!resource) resource = ["wood", "stone"].find(r => (barn.progress[r] || 0) < def.cost[r] && (f.inv[r] || 0) > 0);
  if (!resource) { res.toast = "coopNothing"; return res; }
  const have = f.inv[resource] || 0, need = def.cost[resource] - (barn.progress[resource] || 0);
  const n = Math.min(have, need);
  if (n <= 0) { res.toast = "coopNothing"; return res; }
  f.inv[resource] -= n; barn.progress[resource] = (barn.progress[resource] || 0) + n;
  res.invChanged = true; res.deposited = n; res.resource = resource;
  if (barn.progress.wood >= def.cost.wood && barn.progress.stone >= def.cost.stone) {
    // Les ressources viennent de se compléter avec CE dépôt : on tente
    // directement le paiement, pour ne pas obliger un aller-retour inutile
    // si la caisse commune a déjà assez d'or. Sinon, un toast dédié prévient
    // (en plus du message de dépôt) qu'il ne manque plus que l'argent.
    if ((money || 0) >= def.cost.money) { barn.ready = true; res.becameReady = true; res.moneySpent = def.cost.money; }
    else res.toast = "barnNeedMoney";
  }
  return res;
}

// Validation du palier après réussite du mini-jeu de construction (rythme,
// joué côté client comme la pêche — voir BarnMinigame dans FermeGame.js).
// Ne fait confiance qu'à `barn.ready` (déjà vérifié côté hôte via les
// dépôts) : le client ne peut pas "inventer" un palier sans avoir réuni les
// ressources, seul le résultat du mini-jeu (gagné/raté) est déclaratif —
// même niveau de confiance que le minijeu de pêche existant.
export function resolveBarnBuild(f, barn) {
  const res = { built: false, level: barn ? barn.level : 0, toast: null };
  if (!barn || !barn.ready) { res.toast = "barnNotReady"; return res; }
  barn.level += 1; barn.ready = false; barn.progress = { wood: 0, stone: 0 };
  res.built = true; res.level = barn.level;
  return res;
}

// Achat à la boutique. Renvoie { moneyDelta, invChanged, toast, chat }.
export function resolveBuy(f, money, m) {
  normalizeFarmer(f);
  const res = { moneyDelta: 0, invChanged: false, toast: null, chat: null };
  if (!nearT(f, C.SHOP)) { res.toast = "farShop"; return res; }
  if (m.item === "seed") {
    const st = m.crop | 0, n = Math.max(1, Math.min(50, (m.n | 0) || 1));
    if (st < 0 || st >= C.CROPS.length) return res;
    const cost = C.CROPS[st].seedCost * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.inv.seeds[st] += n; res.invChanged = true;
  } else if (m.item === "food") {
    if (money < C.FOOD_COST) { res.toast = "noGold"; return res; }
    res.moneyDelta = -C.FOOD_COST; f.inv.food++; res.invChanged = true;
  } else if (m.item === "fence") {
    const n = Math.max(1, Math.min(50, (m.n | 0) || 1));
    const cost = C.FENCE_COST * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.inv.fence += n; res.invChanged = true;
  } else if (m.item === "lamp") {
    const n = Math.max(1, Math.min(50, (m.n | 0) || 1));
    const cost = C.LAMP_COST * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.inv.lamp = (f.inv.lamp || 0) + n; res.invChanged = true;
  } else if (m.item === "scarecrow") {
    const n = Math.max(1, Math.min(50, (m.n | 0) || 1));
    const cost = C.SCARECROW_COST * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.inv.scarecrow = (f.inv.scarecrow || 0) + n; res.invChanged = true;
  } else if (m.item === "tool") {
    const key = m.tool;
    if (!C.TOOLS.includes(key)) return res;
    const lvl = f.tools[key];
    if (lvl >= C.TOOL_MAX_LEVEL) { res.toast = "toolMax"; return res; }
    const cost = C.TOOL_UPGRADE_COST[lvl];
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.tools[key] = lvl + 1; res.invChanged = true;
    res.chat = { from: "⚒", key: "toolUp", tool: key, lvl: lvl + 1 };
  }
  return res;
}

// Fabrication (bois/pierre -> sections de construction prêtes à poser).
// Déclenchée depuis le menu Construire (clic sur l'icône bois/pierre du HUD),
// PAS liée à une case précise (juste une conversion dans l'inventaire du
// fermier), donc pas de contrainte de portée/proximité contrairement à
// resolveAct. `m.item` = "fence" (coûte du bois) | "wall" | "path" (coûtent
// de la pierre). `m.n` = quantité souhaitée (1 ou 5 dans l'UI) ; si les
// ressources ne suffisent pas pour tout fabriquer, on fabrique le maximum
// possible (comme resolveSell qui vend le maximum disponible) plutôt que de
// tout refuser. Renvoie { invChanged, toast }.
export function resolveCraft(f, m) {
  normalizeFarmer(f);
  const res = { invChanged: false, toast: null };
  const item = m.item, wanted = Math.max(1, Math.min(50, (m.n | 0) || 1));
  if (item === "fence") {
    const unit = C.BUILD_COSTS.fence;
    const n = Math.min(wanted, Math.floor(f.inv.wood / unit));
    if (n <= 0) { res.toast = "noWood"; return res; }
    f.inv.wood -= n * unit; f.inv.fence = (f.inv.fence || 0) + n; res.invChanged = true;
  } else if (item === "wall") {
    const unit = C.BUILD_COSTS.wall;
    const n = Math.min(wanted, Math.floor(f.inv.stone / unit));
    if (n <= 0) { res.toast = "noStone"; return res; }
    f.inv.stone -= n * unit; f.inv.wall = (f.inv.wall || 0) + n; res.invChanged = true;
  } else if (item === "path") {
    const unit = C.BUILD_COSTS.path;
    const n = Math.min(wanted, Math.floor(f.inv.stone / unit));
    if (n <= 0) { res.toast = "noStone"; return res; }
    f.inv.stone -= n * unit; f.inv.path = (f.inv.path || 0) + n; res.invChanged = true;
  }
  return res;
}

// Vente au bac. Renvoie { moneyDelta, earnedDelta, invChanged, toast, gain }.
export function resolveSell(f, m) {
  normalizeFarmer(f);
  const res = { moneyDelta: 0, earnedDelta: 0, invChanged: false, toast: null, gain: 0 };
  if (!nearT(f, C.BIN)) { res.toast = "farBin"; return res; }
  let gain = 0;
  if (m.item === "crop") {
    const ct = m.crop | 0;
    if (ct < 0 || ct >= C.CROPS.length) return res;
    const n = Math.min(f.inv.crops[ct], Math.max(1, (m.n | 0) || f.inv.crops[ct]));
    f.inv.crops[ct] -= n; gain = n * C.CROPS[ct].sell;
  } else if (m.item === "wood") {
    const n = Math.min(f.inv.wood, Math.max(1, (m.n | 0) || f.inv.wood));
    f.inv.wood -= n; gain = n * C.WOOD_SELL;
  } else if (m.item === "stone") {
    const n = Math.min(f.inv.stone, Math.max(1, (m.n | 0) || f.inv.stone));
    f.inv.stone -= n; gain = n * C.STONE_SELL;
  } else if (m.item === "gem") {
    const gt = m.gem | 0;
    if (gt < 0 || gt >= C.GEMS.length) return res;
    const n = Math.min(f.inv.gems[gt], Math.max(1, (m.n | 0) || f.inv.gems[gt]));
    f.inv.gems[gt] -= n; gain = n * C.GEMS[gt].sell;
  } else if (m.item === "fish") {
    const ft = m.fish | 0;
    if (ft < 0 || ft >= C.FISH.length) return res;
    const n = Math.min(f.inv.fish[ft], Math.max(1, (m.n | 0) || f.inv.fish[ft]));
    f.inv.fish[ft] -= n; gain = n * C.FISH[ft].sell;
  } else if (m.item === "product") {
    const pt = m.product | 0;
    if (pt < 0 || pt >= C.ANIMALS.length) return res;
    const n = Math.min(f.inv.products[pt], Math.max(1, (m.n | 0) || f.inv.products[pt]));
    f.inv.products[pt] -= n; gain = n * C.ANIMALS[pt].sell;
  }
  if (gain > 0) { res.moneyDelta = gain; res.earnedDelta = gain; res.invChanged = true; res.gain = gain; }
  return res;
}

// Repas : rend de l'énergie. Mange un casse-croûte en priorité ; sinon, mange
// le poisson le moins précieux disponible (la pêche sert donc aussi à se
// nourrir). Renvoie { invChanged, fx }.
export function resolveEat(f) {
  normalizeFarmer(f);
  const res = { invChanged: false, fx: null };
  if (f.energy >= C.MAX_ENERGY) return res;
  if (f.inv.food > 0) {
    f.inv.food--; f.energy = Math.min(C.MAX_ENERGY, f.energy + C.FOOD_ENERGY);
    res.invChanged = true; res.fx = { k: "eat", x: f.x, y: f.y };
    return res;
  }
  // Pas de casse-croûte : manger un poisson (du moins cher au plus cher).
  for (let ft = 0; ft < C.FISH.length; ft++) {
    if ((f.inv.fish[ft] || 0) > 0) {
      f.inv.fish[ft]--; f.energy = Math.min(C.MAX_ENERGY, f.energy + C.FISH[ft].energy);
      res.invChanged = true; res.fx = { k: "eat", x: f.x, y: f.y };
      return res;
    }
  }
  // Ni casse-croûte ni poisson : manger une production d'élevage comestible
  // (œuf, lait, truffe...). La laine n'est pas un aliment (edible:false).
  for (let pt = 0; pt < C.ANIMALS.length; pt++) {
    const a = C.ANIMALS[pt];
    if (a.edible && (f.inv.products[pt] || 0) > 0) {
      f.inv.products[pt]--; f.energy = Math.min(C.MAX_ENERGY, f.energy + (a.energy || 0));
      res.invChanged = true; res.fx = { k: "eat", x: f.x, y: f.y };
      return res;
    }
  }
  return res;
}

// Dormir dans la maison (chantier 2026-07) : f.sleepStartedAt (horodatage
// hôte) + f.sleepStartEnergy (énergie au moment de s'endormir) permettent de
// dériver l'énergie actuelle à tout instant sans message réseau
// supplémentaire, même principe que cropGrowState/animalReady (état dérivé
// purement d'un horodatage). L'énergie est pleine PILE au bout de
// C.SLEEP_MS ; sortir plus tôt (resolveSleepEnd) garde juste la fraction déjà
// acquise à cet instant.
export function sleepEnergyNow(f, now) {
  if (!f.sleepStartedAt) return f.energy;
  const frac = Math.min(1, (now - f.sleepStartedAt) / C.SLEEP_MS);
  return Math.round(f.sleepStartEnergy + (C.MAX_ENERGY - f.sleepStartEnergy) * frac);
}
// Entrer dormir (touche E devant la porte, voir C.HOUSE_DOOR). Refuse si déjà
// endormi, ou si l'énergie est déjà au maximum (dormir ne servirait à rien).
export function resolveSleepStart(f, now) {
  normalizeFarmer(f);
  const res = { ok: false, reason: null };
  if (f.sleepStartedAt) { res.reason = "actionFailed"; return res; }
  if (f.energy >= C.MAX_ENERGY) { res.reason = "sleepFull"; return res; }
  f.sleepStartedAt = now; f.sleepStartEnergy = f.energy;
  res.ok = true;
  return res;
}
// Sortir de la maison : soit automatiquement après C.SLEEP_MS (énergie
// pleine), soit plus tôt sur demande du joueur (énergie partielle, jamais
// perdue). Renvoie { invChanged } pour rediffuser la nouvelle énergie.
export function resolveSleepEnd(f, now) {
  normalizeFarmer(f);
  const res = { invChanged: false };
  if (!f.sleepStartedAt) return res;
  f.energy = sleepEnergyNow(f, now);
  f.sleepStartedAt = null; f.sleepStartEnergy = 0;
  res.invChanged = true;
  return res;
}

/* -------------------------------------------------------------------------
   Passage au jour suivant (hôte uniquement). Depuis le zip 151, la pousse des
   cultures, l'arrosage et la production animale sont en temps RÉEL et ne
   dépendent plus de ce passage de jour (voir cropGrowState/animalReady) :
   celui-ci ne fait plus que repousser un peu de nature loin du spawn et
   restaurer l'énergie de tous les fermiers. Le cycle jour/nuit visuel (8 min
   réelles) continue de tourner pour l'ambiance. MUTE world + farmers, renvoie
   les tuiles à diffuser.
   ------------------------------------------------------------------------- */
export function newDay(world, farmers, day, seed) {
  const W = C.MAP_W, H = C.MAP_H;
  const rnd = makeRng((seed ^ (day * 2654435761)) & 0x7fffffff);
  const tiles = [];
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H), i = idx(x, y);
    if (world.ground[i] === C.G_GRASS && world.objects[i] === C.O_NONE && !world.crops.has(i)
      && Math.abs(x - C.SPAWN.x) + Math.abs(y - C.SPAWN.y) > 18) {
      const type = rnd() < 0.5 ? C.O_ROCK : (rnd() < 0.35 ? C.O_TREE2 : C.O_TREE);
      world.objects[i] = type; world.objHp.set(i, type === C.O_ROCK ? C.ROCK_HP : C.TREE_HP);
      tiles.push(i);
    }
  }
  for (const id in farmers) { farmers[id].energy = C.MAX_ENERGY; farmers[id].sleepStartedAt = null; farmers[id].sleepStartEnergy = 0; }
  return { tiles, cropTiles: [] };
}

// Temps de jeu (minutes) à partir de l'horodatage de début de journée partagé.
export function gameTimeMin(dayStartAt, now) {
  const frac = Math.min(1, (now - dayStartAt) / C.DAY_REAL_MS);
  return Math.floor(C.DAY_START_MIN + frac * (C.DAY_END_MIN - C.DAY_START_MIN));
}

// Collision : true si la tuile bloque le déplacement d'un fermier.
// `now` (correctif chantier 2026-07) : une infrastructure encore EN CHANTIER
// (temps de construction réel, voir BUILD_TIMES/buildReady) ne bloque PAS le
// passage — seule l'infrastructure TERMINÉE devient un obstacle solide. Sans
// ce correctif, poser un lampadaire (ou toute future infrastructure
// chronométrée) juste devant/sous soi rendait la case immédiatement solide
// dès la pose, ce qui pouvait figer le fermier qui vient de la poser (bloqué
// par sa propre construction en cours, incapable de circuler librement).
// `now` par défaut à `Date.now()` pour ne rien casser aux appels existants qui
// ne le précisent pas encore.
export function blockedTile(world, x, y, now = Date.now()) {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (!inMap(fx, fy)) return true;
  const i = idx(fx, fy);
  const g = world.ground[i], o = world.objects[i];
  if (g === C.G_WATER || g === C.G_BRIDGE_SITE) return true;
  if (o === C.O_LAMP) return buildReady(world.objHp.get(i), now);
  if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK || o === C.O_HOUSE || o === C.O_SHOP || o === C.O_BIN || o === C.O_STUMP || o === C.O_WELL || o === C.O_FENCE || o === C.O_FENCE_H || o === C.O_FENCE_V || o === C.O_WALL) return true;
  return false;
}

export const idxOf = idx;
