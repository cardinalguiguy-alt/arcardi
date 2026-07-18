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
  // Deux ponts
  for (const by of [42, 100]) for (let y = by; y < by + 3; y++) {
    const cx = Math.round(riverCenter[y]);
    for (let x = cx - 6; x <= cx + 6; x++)
      if (inMap(x, y) && (ground[idx(x, y)] === C.G_WATER || ground[idx(x, y)] === C.G_SAND)) ground[idx(x, y)] = C.G_BRIDGE;
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
  if (saved.crops) for (const [i, t, s, prog, watered] of saved.crops) world.crops.set(i, { t, s, prog, watered: !!watered });
  return world;
}

export function serializeCrops(world) {
  const out = [];
  for (const [i, c] of world.crops) out.push([i, c.t, c.s, c.prog, c.watered ? 1 : 0]);
  return out;
}

/* -------------------------------------------------------------------------
   État initial d'un fermier (privé, arbitré par l'hôte).
   ------------------------------------------------------------------------- */
export function newFarmer(id, name, gender, outfit) {
  return {
    id, name: String(name || "Fermier").slice(0, 14), gender: gender === "f" ? "f" : "m", outfit: outfit | 0,
    x: C.SPAWN.x, y: C.SPAWN.y, dir: 0, moving: false, tool: 0,
    energy: C.MAX_ENERGY,
    tools: { hoe: 1, can: 1, axe: 1, pick: 1 },
    inv: {
      wood: 0, stone: 0, food: 0, fence: 0,
      seeds: [5, 0, 0, 0], crops: [0, 0, 0, 0],
      gems: C.GEMS.map(() => 0),      // gemmes rares trouvées au minage
      fish: C.FISH.map(() => 0),      // poissons pêchés
      products: C.ANIMALS.map(() => 0), // productions d'élevage ramassées
    },
    quests: {}, // id de quête -> true quand accomplie
  };
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
  f.inv = f.inv || {};
  if (typeof f.inv.wood !== "number") f.inv.wood = 0;
  if (typeof f.inv.stone !== "number") f.inv.stone = 0;
  if (typeof f.inv.food !== "number") f.inv.food = 0;
  if (typeof f.inv.fence !== "number") f.inv.fence = 0;
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

  switch (m.action) {
    case "till":
      if (g === C.G_GRASS && o === C.O_NONE && !world.crops.has(i)) {
        if (!useEnergy(f, "till", "hoe")) { res.toast = "tired"; return res; }
        world.ground[i] = C.G_TILLED; res.tiles.push(i); res.fx.push({ k: "till", x, y }); res.invChanged = true;
      }
      break;
    case "water":
      if (g === C.G_TILLED) {
        if (!useEnergy(f, "water", "can")) { res.toast = "tired"; return res; }
        world.ground[i] = C.G_WATERED;
        const c = world.crops.get(i); if (c) c.watered = true;
        res.tiles.push(i); res.fx.push({ k: "water", x, y }); res.invChanged = true;
      }
      break;
    case "plant": {
      const st = m.seed | 0;
      if ((g === C.G_TILLED || g === C.G_WATERED) && !world.crops.has(i) && st >= 0 && st < C.CROPS.length && f.inv.seeds[st] > 0) {
        f.inv.seeds[st]--;
        world.crops.set(i, { t: st, s: 0, prog: 0, watered: g === C.G_WATERED });
        res.cropTiles.push(i); res.invChanged = true;
      }
      break;
    }
    case "harvest": {
      const c = world.crops.get(i);
      if (c && c.s >= C.CROP_STAGES - 1) {
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
          const wood = o === C.O_STUMP ? 2 : C.TREE_WOOD;
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
          f.inv.stone += C.ROCK_STONE;
          res.tiles.push(i); res.fx.push({ k: "rockdown", x, y });
          // Gemme rare : chance de trouver une pierre précieuse dans le rocher.
          if (Math.random() < C.GEM_DROP_CHANCE) {
            const gt = weightedPick(C.GEMS);
            f.inv.gems[gt] = (f.inv.gems[gt] || 0) + 1;
            res.fx.push({ k: "gem", x, y, gem: gt });
          }
        } else world.objHp.set(i, hp);
        res.invChanged = true;
      }
      break;
    case "fence":
      // Clôture posée librement par le joueur (achetée à la boutique, une
      // section à la fois) : pose sur une case libre et constructible, ou
      // retire (et récupère) une section déjà posée. Aucun coût en énergie,
      // comme planter/récolter.
      if (o === C.O_FENCE) {
        world.objects[i] = C.O_NONE; world.objHp.delete(i);
        f.inv.fence = (f.inv.fence || 0) + 1;
        res.tiles.push(i); res.invChanged = true;
      } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.fence > 0) {
          f.inv.fence--; world.objects[i] = C.O_FENCE; world.objHp.set(i, 1);
          res.tiles.push(i); res.invChanged = true;
        } else res.toast = "noFence";
      }
      break;
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

/* -------------------------------------------------------------------------
   Passage au jour suivant (hôte uniquement). Fait pousser les cultures
   arrosées, assèche la terre, fait repousser un peu de nature loin du spawn,
   restaure l'énergie de tous les fermiers. MUTE world + farmers, renvoie les
   tuiles/cultures à diffuser.
   ------------------------------------------------------------------------- */
export function newDay(world, farmers, day, seed) {
  const W = C.MAP_W, H = C.MAP_H;
  const rnd = makeRng((seed ^ (day * 2654435761)) & 0x7fffffff);
  const tiles = [], cropTiles = [];
  for (const [i, c] of world.crops) {
    if (c.watered) {
      c.prog++;
      c.s = Math.min(C.CROP_STAGES - 1, Math.round((c.prog / C.CROPS[c.t].growDays) * (C.CROP_STAGES - 1)));
      c.watered = false;
      cropTiles.push(i);
    }
  }
  for (let i = 0; i < world.ground.length; i++) if (world.ground[i] === C.G_WATERED) { world.ground[i] = C.G_TILLED; tiles.push(i); }
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H), i = idx(x, y);
    if (world.ground[i] === C.G_GRASS && world.objects[i] === C.O_NONE && !world.crops.has(i)
      && Math.abs(x - C.SPAWN.x) + Math.abs(y - C.SPAWN.y) > 18) {
      const type = rnd() < 0.5 ? C.O_ROCK : (rnd() < 0.35 ? C.O_TREE2 : C.O_TREE);
      world.objects[i] = type; world.objHp.set(i, type === C.O_ROCK ? C.ROCK_HP : C.TREE_HP);
      tiles.push(i);
    }
  }
  for (const id in farmers) farmers[id].energy = C.MAX_ENERGY;
  return { tiles, cropTiles };
}

// Temps de jeu (minutes) à partir de l'horodatage de début de journée partagé.
export function gameTimeMin(dayStartAt, now) {
  const frac = Math.min(1, (now - dayStartAt) / C.DAY_REAL_MS);
  return Math.floor(C.DAY_START_MIN + frac * (C.DAY_END_MIN - C.DAY_START_MIN));
}

// Collision : true si la tuile bloque le déplacement d'un fermier.
export function blockedTile(world, x, y) {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (!inMap(fx, fy)) return true;
  const i = idx(fx, fy);
  const g = world.ground[i], o = world.objects[i];
  if (g === C.G_WATER) return true;
  if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK || o === C.O_HOUSE || o === C.O_SHOP || o === C.O_BIN || o === C.O_STUMP || o === C.O_WELL || o === C.O_FENCE) return true;
  return false;
}

export const idxOf = idx;
