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
  // Moulins (chantier 2026-07) : idx -> { wheat, nextAt }, même famille que
  // `crops` (Map hôte, sérialisée séparément, voir serializeMills/
  // applyOverrides). Vide à la génération : aucun moulin n'est jamais posé
  // par generateWorld, seulement par les joueurs (voir resolveAct cas "mill").
  const mills = new Map();

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
  // bridgeSites[k] retient les indices de TOUTES les cases de la traversée k
  // (pour savoir quand elle est ENTIÈREMENT construite et faire apparaître le
  // levier, chantier 2026-07 "pont ouvrable/fermable") ; bridgeLeverPos[k]
  // retient l'emplacement réservé (berge côté maison) où ce levier apparaîtra
  // automatiquement une fois la traversée achevée (voir resolveAct cas
  // "bridge"). Ces deux tableaux sont PUREMENT dérivés de la seed (comme
  // riverCenter), recalculés à l'identique à chaque generateWorld : rien à
  // persister séparément.
  const bridgeSites = [];
  const bridgeLeverPos = [];
  for (const by of [42, 100]) {
    const sites = [];
    const midY = by + 1;
    for (let y = by; y < by + 3; y++) {
      const cx = Math.round(riverCenter[y]);
      for (let x = cx - 6; x <= cx + 6; x++)
        if (inMap(x, y) && (ground[idx(x, y)] === C.G_WATER || ground[idx(x, y)] === C.G_SAND)) { ground[idx(x, y)] = C.G_BRIDGE_SITE; sites.push(idx(x, y)); }
    }
    bridgeSites.push(sites);
    const cxMid = Math.round(riverCenter[midY]);
    bridgeLeverPos.push(idx(cxMid - C.BRIDGE_LEVER_OFFSET, midY));
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
  // Dégager les emplacements réservés des leviers de pont (chantier 2026-07) :
  // posés dynamiquement en jeu une fois chaque traversée achevée (voir
  // resolveAct cas "bridge"), on s'assure ici qu'aucun arbre/rocher généré
  // juste au-dessus ne vienne bloquer la case.
  for (const lp of bridgeLeverPos) {
    const o = objects[lp];
    if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK) { objects[lp] = C.O_NONE; objHp.delete(lp); }
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

  // Passage sombre (chantier 2026-07, demande Guillaume — repositionné :
  // "le monde maléfique doit être accessible via des passages présents à la
  // limite de la map, proche du bord droit de la map") : posé à la limite
  // EST de la carte (x proche de W), plutôt qu'au bord nord comme avant.
  // La rivière (riverCenter) reste toujours cantonnée entre x=70 et x=120
  // (voir génération plus haut, rx borné à [70,120]) : un point proche du
  // bord droit (x = W - 4) en est donc toujours loin, pas besoin de le
  // calculer depuis riverCenter comme avant. y choisi à mi-hauteur de la
  // carte, à bonne distance de la maison/l'enclos (concentrés côté centre,
  // voir C.HOUSE/C.PEN) et des sites de pont (by 42/100, loin du bord est).
  // Case + voisinage immédiat dégagés d'arbres/rochers pour garantir
  // qu'elle est toujours atteignable.
  const dpX = W - 4;
  const dpY = Math.round(H / 2);
  const darkPassage = { x: Math.max(2, Math.min(W - 3, dpX)), y: dpY };
  for (let y = darkPassage.y - 1; y <= darkPassage.y + 1; y++) {
    for (let x = darkPassage.x - 1; x <= darkPassage.x + 1; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      ground[i] = C.G_GRASS;
      const o = objects[i];
      if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK) { objects[i] = C.O_NONE; objHp.delete(i); }
    }
  }
  ground[idx(darkPassage.x, darkPassage.y)] = C.G_DARK_PASSAGE;

  return { w: W, h: H, ground, objects, objHp, crops, mills, bridgeSites, bridgeLeverPos, riverCenter, darkPassage };
}

function riverCenterAtRow(riverCenter, y) {
  const row = Math.max(0, Math.min(riverCenter.length - 1, Math.round(y)));
  return riverCenter[row];
}

// Carte maléfique (chantier 2026-07, demande Guillaume) : générée localement
// par le client qui l'emprunte, PAS synchronisée entre joueurs (le passage
// n'emmène "que lui" — voir enterDarkPassage côté FermeGame.js) et PAS
// persistée en base : seed fixe (indépendante de la seed de la ferme), donc
// la carte est toujours identique d'une visite à l'autre pour tout le monde,
// mais aucun état (arbres coupés, etc.) n'a besoin d'être sauvegardé puisque
// régénérée à l'identique à chaque entrée. Forêt volontairement bien plus
// dense que la ferme (ambiance plus oppressante) ; le passage retour
// (C.EVIL_RETURN_PASSAGE) est un point fixe, jamais dérivé d'un cours d'eau
// puisqu'il n'y a pas de rivière ici.
export function generateEvilWorld() {
  const W = C.EVIL_MAP_W, H = C.EVIL_MAP_H;
  const rnd = makeRng(0xE411); // seed fixe : une seule carte maléfique, partagée par toutes les parties
  const ground = new Array(W * H).fill(C.G_GRASS);
  const objects = new Array(W * H).fill(C.O_NONE);
  const objHp = new Map();
  // Proportion d'arbres morts croissante avec la profondeur (chantier
  // 2026-07, demande Guillaume : "la proportion d'arbres morts doit être
  // plus grande à mesure qu'on progresse dans le monde maléfique, de 30% à
  // 90%") : "profondeur" = distance à l'arrivée (C.EVIL_SPAWN, bord sud),
  // normalisée sur la diagonale de la carte — s'enfoncer dans la carte,
  // depuis l'arrivée, quelle que soit la direction, augmente donc bien le
  // ratio, jusqu'à 90% dans les coins les plus éloignés. Utilisée par les
  // trois boucles de placement d'arbres ci-dessous, à la place de l'ancien
  // seuil fixe (rnd() < 0.3, identique partout sur la carte).
  const maxDepthDist = Math.hypot(W, H);
  function deadRatioAt(x, y) {
    const dist = Math.hypot(x - C.EVIL_SPAWN.x, y - C.EVIL_SPAWN.y);
    const depth = Math.max(0, Math.min(1, dist / maxDepthDist));
    return 0.3 + 0.6 * depth;
  }
  // Choisit un type d'arbre vivant/mort selon la profondeur de (x,y) : au-delà
  // du seuil mort-vivant, garde un mélange chêne/pin 50/50 comme avant.
  function pickTreeType(x, y) {
    const roll = rnd();
    if (roll < deadRatioAt(x, y)) return C.O_TREE_DEAD;
    return rnd() < 0.5 ? C.O_TREE2 : C.O_TREE;
  }
  function place(x, y, type, hp) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (ground[i] !== C.G_GRASS || objects[i] !== C.O_NONE) return;
    objects[i] = type; objHp.set(i, hp);
  }
  // Grand lac violet luisant (chantier 2026-07, demande Guillaume : "ambiance
  // sombre partout avec un grand lac violet luisant") : placé AVANT les
  // bosquets ci-dessous, pour qu'ils l'évitent naturellement (`place` refuse
  // toute case qui n'est plus G_GRASS). Centre choisi à l'écart du spawn
  // (bord sud) et du passage retour (nord-ouest), pour ne jamais boucher
  // l'accès à l'un ou l'autre. Contour irrégulier (pas un cercle parfait) :
  // rayon local perturbé par un bruit simple pour une silhouette organique.
  const lakeCx = 47, lakeCy = 30, lakeR = 12;
  for (let y = Math.max(0, lakeCy - lakeR - 2); y <= Math.min(H - 1, lakeCy + lakeR + 2); y++) {
    for (let x = Math.max(0, lakeCx - lakeR - 2); x <= Math.min(W - 1, lakeCx + lakeR + 2); x++) {
      const dx = x - lakeCx, dy = y - lakeCy, d = Math.hypot(dx, dy);
      const wobble = Math.sin(Math.atan2(dy, dx) * 5 + 1.7) * 1.6 + Math.cos(Math.atan2(dy, dx) * 3) * 1.1;
      if (d <= lakeR + wobble) ground[y * W + x] = C.G_WATER;
    }
  }
  // Arbres morts, sans feuilles : dispersés PARTOUT sur la carte (pas
  // seulement dans les bosquets), pour une ambiance sombre continue, en plus
  // des bosquets d'arbres normaux ci-dessous (qui gardent une proportion
  // d'arbres morts mélangés, croissante avec la profondeur, voir
  // deadRatioAt/pickTreeType ci-dessus). Ici, contrairement aux deux boucles
  // suivantes, la case reste TOUJOURS un arbre mort si elle est retenue au
  // tirage (pas de pickTreeType) : c'est un semis dédié, en plus du mélange
  // vivant/mort des bosquets/semis normaux, pas une alternative à celui-ci —
  // sa densité reste donc uniforme, la variation de proportion vient des
  // deux boucles suivantes.
  for (let i = 0; i < 260; i++) place(rnd() * W, rnd() * H, C.O_TREE_DEAD, C.TREE_HP);
  // Bosquets denses (plus nombreux/serrés que generateWorld) + semis épars,
  // pour une forêt qui se referme vite autour du joueur.
  for (let c = 0; c < 60; c++) {
    const cx = Math.floor(rnd() * W), cy = Math.floor(rnd() * H);
    const r = 3 + rnd() * 7, n = 14 + Math.floor(rnd() * 26);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * r;
      const tx = cx + Math.cos(a) * d, ty = cy + Math.sin(a) * d;
      place(tx, ty, pickTreeType(tx, ty), C.TREE_HP);
    }
  }
  for (let i = 0; i < 900; i++) {
    const tx = rnd() * W, ty = rnd() * H;
    place(tx, ty, pickTreeType(tx, ty), C.TREE_HP);
  }
  for (let i = 0; i < 260; i++) place(rnd() * W, rnd() * H, C.O_ROCK, C.EVIL_ROCK_HP);
  // Dégage l'arrivée (bord sud), le passage retour (bord nord-ouest) et le
  // chaudron-artéfact (chantier 2026-07, demande Guillaume : "on le trouve
  // comme un artéfact interactif dans le monde maléfique") — ce dernier
  // n'est PAS un objet de world.objects (contrairement aux arbres/rochers) :
  // c'est un point d'intérêt purement CLIENT, rendu/interactif tant que
  // s.salveCraft.cauldronUnlocked est faux (voir FermeGame.js), donc seule
  // sa case doit rester dégagée ici.
  for (const p of [C.EVIL_SPAWN, C.EVIL_RETURN_PASSAGE, C.EVIL_CAULDRON_SPAWN]) {
    for (let y = p.y - 1; y <= p.y + 1; y++) for (let x = p.x - 1; x <= p.x + 1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      const o = objects[i];
      if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_TREE_DEAD || o === C.O_ROCK) { objects[i] = C.O_NONE; objHp.delete(i); }
      if (ground[i] === C.G_WATER) ground[i] = C.G_GRASS; // garde-fou : jamais d'eau sur l'arrivée/le passage retour
    }
  }
  ground[C.EVIL_RETURN_PASSAGE.y * W + C.EVIL_RETURN_PASSAGE.x] = C.G_DARK_PASSAGE;
  // Créatures maléfiques (chantier 2026-07, demande Guillaume : "des
  // monstres qui pourchassent le joueur, lents, mais qui l'assomment et le
  // renvoient chez lui blessé au contact") : générées ici (même seed fixe
  // que le reste de la carte, donc toujours aux mêmes points de départ),
  // simulées ensuite CÔTÉ CLIENT uniquement (updateEvilMonsters,
  // FermeGame.js) — comme le reste de la carte maléfique, aucune notion
  // d'hôte ici. Rejection sampling sur case d'herbe libre (pas d'arbre/
  // rocher/eau), à bonne distance de l'arrivée pour ne jamais surprendre le
  // joueur dès la première seconde. `home{X,Y}` retient le point de
  // génération : sert de point de rappel si jamais on veut les faire
  // "rentrer" hors chasse (non exploité pour l'instant, gardé pour un futur
  // chantier plutôt qu'un champ à rajouter après coup).
  const monsters = [];
  for (let n = 0; n < C.EVIL_MONSTER_COUNT; n++) {
    let mx = 0, my = 0, tries = 0, ok = false;
    while (tries < 300 && !ok) {
      mx = Math.floor(rnd() * W); my = Math.floor(rnd() * H); tries++;
      const i = my * W + mx;
      if (ground[i] === C.G_GRASS && objects[i] === C.O_NONE && Math.hypot(mx - C.EVIL_SPAWN.x, my - C.EVIL_SPAWN.y) >= C.EVIL_MONSTER_MIN_SPAWN_DIST) ok = true;
    }
    if (ok) monsters.push({ id: n, x: mx + 0.5, y: my + 0.5, homeX: mx + 0.5, homeY: my + 0.5 });
  }
  return { w: W, h: H, ground, objects, objHp, crops: new Map(), mills: new Map(), bridgeSites: [], bridgeLeverPos: [], riverCenter: [], monsters };
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
  world.mills = world.mills || new Map();
  world.mills.clear();
  if (saved.mills) for (const row of saved.mills) {
    const [i, wheat, nextAt] = row;
    world.mills.set(i, { wheat: wheat || 0, nextAt: nextAt || 0 });
  }
  return world;
}

export function serializeCrops(world) {
  const out = [];
  for (const [i, c] of world.crops) out.push([i, c.t, c.bankedMs || 0, c.wateredAt || 0]);
  return out;
}

// Sérialisation des moulins (chantier 2026-07), même principe que
// serializeCrops : seuls les moulins avec un état non trivial (du blé en
// stock ou une transformation en cours) sont écrits, un moulin fraîchement
// posé (wheat:0, nextAt:0) est recréé avec ces valeurs par défaut au besoin
// (voir resolveAct cas "millDeposit"/millTick, qui utilisent `world.mills.get(i)
// || { wheat: 0, nextAt: 0 }`).
export function serializeMills(world) {
  const out = [];
  for (const [i, ms] of world.mills) if ((ms.wheat || 0) > 0 || (ms.nextAt || 0) > 0) out.push([i, ms.wheat || 0, ms.nextAt || 0]);
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

// Production continue d'un moulin (chantier 2026-07, transformation
// artisanale demandée par Guillaume) : consomme C.MILL_WHEAT_PER_SACK blé
// toutes les C.MILL_BATCH_MS ms tant qu'il reste assez de blé en stock,
// tourne en continu sans intervention du joueur une fois amorcé (dès qu'il y
// a assez de blé). Fonction PURE (comme cropGrowState/buildReady) : ne mute
// rien, appelée par le tick hôte 1 Hz existant (voir FermeGame.js, qui mute
// ensuite world.mills avec le résultat). La boucle `while` rattrape
// plusieurs sacs d'un coup si l'hôte n'a pas pu tourner pendant un moment
// (tab en veille, etc.), même esprit que cropGrowState qui ne perd jamais de
// progression. Renvoie le nouvel état ({ wheat, nextAt }) et `sacks`
// (nombre de sacs produits depuis le dernier appel).
export function millTick(ms, now) {
  let wheat = (ms && ms.wheat) || 0;
  let nextAt = (ms && ms.nextAt) || 0;
  let sacks = 0;
  if (wheat >= C.MILL_WHEAT_PER_SACK && !nextAt) nextAt = now + C.MILL_BATCH_MS;
  while (nextAt && now >= nextAt && wheat >= C.MILL_WHEAT_PER_SACK) {
    wheat -= C.MILL_WHEAT_PER_SACK; sacks++;
    nextAt = wheat >= C.MILL_WHEAT_PER_SACK ? nextAt + C.MILL_BATCH_MS : 0;
  }
  if (wheat < C.MILL_WHEAT_PER_SACK) nextAt = 0;
  return { wheat, nextAt, sacks };
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
    injuredUntil: 0, // horodatage de fin d'indisponibilité après une morsure de loup (0 = pas blessé)
    tools: { hoe: 1, can: 1, axe: 1, pick: 1 },
    inv: {
      wood: 0, stone: 0, food: 0, fence: 0, wall: 0, path: 0, lamp: 0, scarecrow: 0, grass: 0, mill: 0, healKit: 0, salve: 0,
      magicOre: 0, // minerai magique miné dans le monde maléfique (chantier 2026-07), ingrédient pour de futures concoctions au chaudron
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
export function toolYield(base, level) {
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
  if (typeof f.injuredUntil !== "number") f.injuredUntil = 0;
  // Trophée 🏆 du défi lapins (correctif 2026-07) : horodatage d'expiration,
  // remplace l'ancien champ booléen `hat` (permanent) — un ancien fermier
  // avec `hat: true` mais sans `hatUntil` verra simplement son trophée ne
  // plus s'afficher (0 = pas de trophée en cours), cohérent avec la demande
  // de rendre l'affichage temporaire plutôt que définitif.
  if (typeof f.hatUntil !== "number") f.hatUntil = 0;
  f.inv = f.inv || {};
  if (typeof f.inv.wood !== "number") f.inv.wood = 0;
  if (typeof f.inv.stone !== "number") f.inv.stone = 0;
  if (typeof f.inv.magicOre !== "number") f.inv.magicOre = 0;
  if (typeof f.inv.food !== "number") f.inv.food = 0;
  if (typeof f.inv.fence !== "number") f.inv.fence = 0;
  if (typeof f.inv.wall !== "number") f.inv.wall = 0;
  if (typeof f.inv.path !== "number") f.inv.path = 0;
  if (typeof f.inv.lamp !== "number") f.inv.lamp = 0;
  if (typeof f.inv.scarecrow !== "number") f.inv.scarecrow = 0;
  if (typeof f.inv.grass !== "number") f.inv.grass = 0;
  if (typeof f.inv.mill !== "number") f.inv.mill = 0;
  if (typeof f.inv.healKit !== "number") f.inv.healKit = 0;
  if (typeof f.inv.salve !== "number") f.inv.salve = 0;
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
  const res = { tiles: [], cropTiles: [], fx: [], invChanged: false, toast: null, did: null, millTiles: [] };
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
          // gemChanceAt ci-dessus). Les gemmes vont désormais dans un pool
          // COMMUN à tous les joueurs de la salle (demande Guillaume 2026-07),
          // pas dans l'inventaire privé du fermier : on se contente de
          // signaler la trouvaille via `res.gemFound`, c'est l'appelant hôte
          // (FermeGame.js) qui incrémente le pool partagé (sharedRef.current.gems).
          if (Math.random() < gemChanceAt(x, y)) {
            const gt = weightedPick(C.GEMS);
            res.gemFound = gt;
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
        // Levier (chantier 2026-07, demande Guillaume) : dès que TOUTES les
        // cases de la MÊME traversée sont posées (G_BRIDGE), un levier
        // apparaît automatiquement sur la berge réservée à côté (voir
        // bridgeSites/bridgeLeverPos, generateWorld), sans coût ni pose
        // manuelle. Permet ensuite de fermer/rouvrir tout le pont d'un coup
        // (resolveAct cas "lever" ci-dessous).
        for (let k = 0; k < world.bridgeSites.length; k++) {
          const sites = world.bridgeSites[k];
          if (sites.indexOf(i) === -1) continue;
          if (sites.every((si) => world.ground[si] === C.G_BRIDGE || world.ground[si] === C.G_BRIDGE_STONE)) {
            const lp = world.bridgeLeverPos[k];
            if (world.objects[lp] !== C.O_LEVER) {
              world.objects[lp] = C.O_LEVER; world.objHp.set(lp, 1);
              res.tiles.push(lp);
            }
          }
          break;
        }
      }
      break;
    }
    case "renovateBridge": {
      // Rénovation en pierre d'une case de pont bois déjà construite
      // (chantier 2026-07, demande Guillaume) : "la rénovation en pierre doit
      // changer l'aspect du pont (aspect pierre joli), et lui permettre de
      // résister à la dégradation". Contrairement à "bridge" ci-dessus, cible
      // une case DÉJÀ bâtie en bois (G_BRIDGE ou G_BRIDGE_CLOSED, on peut
      // rénover un pont fermé sans le rouvrir), jamais un chantier
      // G_BRIDGE_SITE. Préserve l'état ouvert/fermé de la case (une case
      // fermée rénovée reste fermée, voir G_BRIDGE_STONE_CLOSED). Permanent,
      // comme la construction initiale : aucun retrait possible.
      if (g === C.G_BRIDGE || g === C.G_BRIDGE_CLOSED) {
        if (f.inv.stone < C.BRIDGE_RENOVATE_COST_STONE) { res.toast = "noStone"; return res; }
        f.inv.stone -= C.BRIDGE_RENOVATE_COST_STONE;
        world.ground[i] = g === C.G_BRIDGE_CLOSED ? C.G_BRIDGE_STONE_CLOSED : C.G_BRIDGE_STONE;
        res.tiles.push(i); res.fx.push({ k: "bridge", x, y, mat: "stone" }); res.invChanged = true;
      }
      break;
    }
    case "lever": {
      // Ferme/ouvre TOUTE une traversée de pont d'un coup (chantier 2026-07,
      // demande Guillaume). Le pont lui-même reste PERMANENT (aucun retrait,
      // aucun remboursement) : seul l'état de passage bascule entre G_BRIDGE
      // (ouvert) et G_BRIDGE_CLOSED (fermé, bloque tout le monde comme
      // G_WATER, voir blockedTile). Bloque bel et bien les joueurs eux-mêmes,
      // pas seulement les futurs ennemis/animaux (décision validée par
      // Guillaume).
      if (o === C.O_LEVER) {
        const k = world.bridgeLeverPos.indexOf(i);
        if (k >= 0) {
          const sites = world.bridgeSites[k];
          // Depuis la rénovation en pierre (chantier 2026-07), une même
          // traversée peut mélanger des cases bois (G_BRIDGE/G_BRIDGE_CLOSED)
          // et des cases rénovées (G_BRIDGE_STONE/G_BRIDGE_STONE_CLOSED) :
          // chaque case bascule désormais selon SON propre matériau, l'état
          // ouvert/fermé global (déterminé sur la 1re case comme avant) reste
          // partagé par toute la traversée.
          const closed = world.ground[sites[0]] === C.G_BRIDGE_CLOSED || world.ground[sites[0]] === C.G_BRIDGE_STONE_CLOSED;
          for (const si of sites) {
            const sg = world.ground[si];
            if (closed) {
              world.ground[si] = sg === C.G_BRIDGE_STONE_CLOSED ? C.G_BRIDGE_STONE : C.G_BRIDGE;
            } else {
              world.ground[si] = sg === C.G_BRIDGE_STONE ? C.G_BRIDGE_STONE_CLOSED : C.G_BRIDGE_CLOSED;
            }
            res.tiles.push(si);
          }
          res.fx.push({ k: "lever", x, y, closed: !closed });
        }
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
    case "grass": {
      // Replanter de l'herbe sur une case labourée (chantier 2026-07, demande
      // Guillaume) : achetée à la boutique (5 or/unité, voir C.GRASS_COST),
      // posée avec l'outil Construction (variante "grass"), UNIQUEMENT sur du
      // sol labouré SEC (G_TILLED — pas G_WATERED/G_GRASS, contrairement à
      // fence/wall/lamp/scarecrow qui se posent sur n'importe quelle case
      // libre). Même "modèle Clash of Clans" que lampadaire/épouvantail (voir
      // BUILD_TIMES.grass, 5 secondes réelles) : le sol passe d'abord en
      // G_GRASS_GROWING (objHp = horodatage de fin de pousse, RÉUTILISÉ ici
      // pour un type de sol plutôt qu'un objet, même pattern que documenté
      // dans BUILD_TIMES), puis redevient G_GRASS TOUT SEUL une fois le délai
      // écoulé (vérifié côté hôte à chaque tick, voir FermeGame.js), sans
      // action supplémentaire du joueur. Définitif, pas de retrait (pas de
      // branche "objects[i] === ..." de récupération comme fence/wall/lamp/
      // scarecrow ci-dessus).
      if (g === C.G_TILLED && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.grass > 0) {
          f.inv.grass--;
          world.ground[i] = C.G_GRASS_GROWING; world.objHp.set(i, now + C.BUILD_TIMES.grass);
          res.tiles.push(i); res.fx.push({ k: "plantGrass", x, y }); res.invChanged = true;
        } else res.toast = "noGrassStock";
      }
      break;
    }
    case "mill": {
      // Moulin (chantier 2026-07, transformation artisanale demandée par
      // Guillaume) : même mécanique que "lamp" (achetée à la boutique en or,
      // posée librement avec l'outil Construction, chantier réel d'1h avant
      // d'être fonctionnel, voir BUILD_TIMES.mill), mais avec un stock de blé
      // COMMUN et une production continue en plus (voir cas "millDeposit"
      // ci-dessous et E.millTick, appelée par le tick hôte de FermeGame.js).
      // Retrait (pour récupérer le moulin en inventaire, comme lamp/wall)
      // IMPOSSIBLE tant qu'il contient encore du blé non transformé : par
      // prudence, pour ne jamais faire disparaître du blé qu'un autre joueur
      // aurait déposé (même logique de précaution que le pont permanent,
      // zip 169, "ne jamais piéger/pénaliser un joueur").
      if (o === C.O_MILL) {
        const ms = world.mills.get(i);
        if (ms && (ms.wheat || 0) > 0) { res.toast = "millNotEmpty"; break; }
        world.objects[i] = C.O_NONE; world.objHp.delete(i); world.mills.delete(i);
        f.inv.mill = (f.inv.mill || 0) + 1;
        res.tiles.push(i); res.invChanged = true;
      } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.mill > 0) {
          f.inv.mill--;
          world.objects[i] = C.O_MILL; world.objHp.set(i, now + C.BUILD_TIMES.mill);
          world.mills.set(i, { wheat: 0, nextAt: 0 });
          res.tiles.push(i); res.invChanged = true;
        } else res.toast = "noMillStock";
      }
      break;
    }
    case "millDeposit": {
      // Dépôt de blé dans un moulin CONSTRUIT (chantier terminé, voir
      // buildReady) : cliquable directement, quel que soit l'outil équipé
      // (voir doAction/FermeGame.js — seule exception : l'outil Construction
      // en variante "mill", réservé au retrait/repose du moulin lui-même, cas
      // "mill" ci-dessus). Transfère le blé récolté de l'inventaire PRIVÉ du
      // fermier (f.inv.crops[C.MILL_WHEAT_CROP]) vers le stock COMMUN du
      // moulin (world.mills, partagé entre tous les joueurs de la ferme,
      // même esprit que les gemmes/la grange), plafonné à C.MILL_STOCK_CAP.
      if (o !== C.O_MILL || !buildReady(world.objHp.get(i), now)) break;
      const have = f.inv.crops[C.MILL_WHEAT_CROP] || 0;
      if (have <= 0) { res.toast = "noWheatToDeposit"; break; }
      const ms = world.mills.get(i) || { wheat: 0, nextAt: 0 };
      const room = C.MILL_STOCK_CAP - (ms.wheat || 0);
      if (room <= 0) { res.toast = "millFull"; break; }
      const n = Math.min(have, room);
      f.inv.crops[C.MILL_WHEAT_CROP] -= n;
      ms.wheat = (ms.wheat || 0) + n;
      world.mills.set(i, ms);
      res.invChanged = true; res.millTiles.push(i);
      res.fx.push({ k: "millDeposit", x, y, n });
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
   Extension du champ par Greg (chantier 2026-07) : abattage d'arbres et
   minage de rochers, mêmes règles de dégâts que le joueur (resolveAct
   "chop"/"mine") mais à un niveau d'outil fixe (GREG_AXE_LVL/GREG_PICK_LVL),
   et le bois/pierre obtenus vont dans le stock COMMUN de la ferme
   (sharedRef.current.gregStock côté FermeGame.js), jamais dans l'inventaire
   d'un joueur en particulier.
   ------------------------------------------------------------------------- */

// Cherche jusqu'à `count` arbres/rochers (O_TREE/O_TREE2/O_STUMP/O_ROCK) en
// anneaux croissants autour de `anchor`, jusqu'à C.GREG_CLEAR_RADIUS — même
// principe de recherche en spirale que findFreeGrassTiles.
export function findClearableTiles(world, anchor, count) {
  const out = [];
  const seen = new Set();
  for (let r = 0; r < C.GREG_CLEAR_RADIUS && out.length < count; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // seulement l'anneau
        const x = anchor.x + dx, y = anchor.y + dy;
        if (!inMap(x, y)) continue;
        const i = idx(x, y);
        if (seen.has(i)) continue;
        seen.add(i);
        const o = world.objects[i];
        if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_STUMP || o === C.O_ROCK) {
          out.push(i);
          if (out.length >= count) return out;
        }
      }
    }
  }
  return out;
}

// Abattage d'une case par Greg (identique à resolveAct "chop", sans énergie
// ni outil de joueur). `done` ne devient vrai que quand la case est
// entièrement dégagée (arbre -> souche -> rien) : l'appelant garde la même
// tâche en tête de file tant que `done` est faux.
export function gregChop(world, i) {
  const o = world.objects[i];
  if (o !== C.O_TREE && o !== C.O_TREE2 && o !== C.O_STUMP) return { done: true, wood: 0 };
  const hp = (world.objHp.get(i) || 1) - C.GREG_AXE_LVL;
  let wood = 0;
  if (hp <= 0) {
    if (o === C.O_STUMP) { world.objects[i] = C.O_NONE; world.objHp.delete(i); wood = toolYield(2, C.GREG_AXE_LVL); }
    else { world.objects[i] = C.O_STUMP; world.objHp.set(i, 2); wood = toolYield(C.TREE_WOOD, C.GREG_AXE_LVL); }
  } else world.objHp.set(i, hp);
  return { done: world.objects[i] === C.O_NONE, wood };
}

// Minage d'une case par Greg (identique à resolveAct "mine", sans énergie ni
// outil de joueur ; pas de gemme — chance réservée aux joueurs, cf.
// resolveAct "mine").
export function gregMine(world, i) {
  const o = world.objects[i];
  if (o !== C.O_ROCK) return { done: true, stone: 0 };
  const hp = (world.objHp.get(i) || 1) - C.GREG_PICK_LVL;
  let stone = 0, done = false;
  if (hp <= 0) {
    world.objects[i] = C.O_NONE; world.objHp.delete(i);
    stone = toolYield(C.ROCK_STONE, C.GREG_PICK_LVL);
    done = true;
  } else world.objHp.set(i, hp);
  return { done, stone };
}

/* -------------------------------------------------------------------------
   Greg, l'employé de champs de base (chantier 2026-07). Fonctions pures de
   mutation du monde, appelées uniquement côté hôte (FermeGame.js/updateGreg
   et hostHandleReqUnsafe), sans passer par un `farmer` (Greg n'a ni énergie
   ni outils : il agit gratuitement une fois engagé).
   ------------------------------------------------------------------------- */

// Cherche jusqu'à `count` cases d'herbe libres (G_GRASS, sans objet, sans
// culture, hors pont/eau) en anneaux croissants autour de `anchor` — même
// principe de recherche en spirale que les spawns (wolfSpawnPos/rabbitSpawnPos).
export function findFreeGrassTiles(world, anchor, count) {
  const out = [];
  const seen = new Set();
  for (let r = 0; r < 40 && out.length < count; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // seulement l'anneau
        const x = anchor.x + dx, y = anchor.y + dy;
        if (!inMap(x, y)) continue;
        const i = idx(x, y);
        if (seen.has(i)) continue;
        seen.add(i);
        if (world.ground[i] === C.G_GRASS && world.objects[i] === C.O_NONE && !world.crops.has(i)) {
          out.push(i);
          if (out.length >= count) return out;
        }
      }
    }
  }
  return out;
}

// Labour d'une case par Greg (identique à resolveAct "till", sans énergie).
export function gregTill(world, i) {
  if (world.ground[i] === C.G_GRASS && world.objects[i] === C.O_NONE && !world.crops.has(i)) {
    world.ground[i] = C.G_TILLED; return true;
  }
  return false;
}

// Plantation d'une case par Greg (le coût en pièces a déjà été prélevé au
// moment de l'ordre, voir hostHandleReqUnsafe cas "gregOrder" — Greg ne
// consomme pas l'inventaire de graines d'un joueur, c'est un stock commun).
export function gregPlant(world, i, cropIdx) {
  const g = world.ground[i];
  if ((g === C.G_TILLED || g === C.G_WATERED) && !world.crops.has(i)) {
    world.crops.set(i, { t: cropIdx, bankedMs: 0, wateredAt: null }); return true;
  }
  return false;
}

// Arrosage d'une case par Greg (identique à resolveAct "water", sans énergie).
export function gregWater(world, i, now) {
  const c = world.crops.get(i);
  if (c) { c.bankedMs = cropGrowState(c, now).grown; c.wateredAt = now; return true; }
  return false;
}

// Engrais (chantier 2026-07, révisé 2026-07 : zone fixe au lieu d'un
// nombre de cases choisi) : renvoie TOUTES les cases PLANTÉES et NON
// MÛRES (contrairement à findFreeGrassTiles qui cherche de l'herbe libre)
// dans le carré C.FERTILIZER_AREA_SIZE x C.FERTILIZER_AREA_SIZE centré sur
// `anchor` (le point où se trouve le joueur quand il lance l'ordre à Greg).
// Un seul engrais du stock est consommé pour tout le carré, quel que soit
// le nombre de cases effectivement fertilisées (voir gregFertilizeOrder,
// FermeGame.js).
export function findFertilizableTiles(world, anchor, now) {
  const out = [];
  const half = Math.floor(C.FERTILIZER_AREA_SIZE / 2);
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = anchor.x + dx, y = anchor.y + dy;
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      const c = world.crops.get(i);
      if (c && !cropGrowState(c, now).mature) out.push(i);
    }
  }
  return out;
}

// Engrais sur une case par Greg : banque la progression actuelle (comme
// gregWater) puis ajoute FERTILIZER_BOOST_MS, plafonné à growMs (jamais de
// pousse négative ni de dépassement de la durée réelle). Renvoie false si la
// case n'a pas de culture ou si la culture est déjà mûre (rien à accélérer).
export function gregFertilize(world, i, now) {
  const c = world.crops.get(i);
  if (!c) return false;
  const gs = cropGrowState(c, now);
  if (gs.mature) return false;
  const dur = C.CROPS[c.t].growMs;
  c.bankedMs = Math.min(dur, gs.grown + C.FERTILIZER_BOOST_MS);
  c.wateredAt = now;
  return true;
}

// Détection des cultures qui ont besoin d'être arrosées (cropGrowState().needsWater,
// i.e. pas mûres et dernier arrosage expiré depuis WATER_VALID_MS), quelle que soit
// la personne qui les a plantées (world.crops est global, pas rattaché à un joueur
// en particulier — un champ planté par un joueur et un champ planté par Greg
// lui-même sont traités de façon identique). Ne MOUILLE PAS les cases : se contente
// de renvoyer la liste des indices, pour que l'appelant (updateGreg) mette Greg en
// route à pied vers chacune (voir gregWater, déjà câblé à la file de tâches côté
// FermeGame.js) — "dès qu'une culture manque d'eau, Greg doit aller l'arroser"
// (demande Guillaume), remplace l'ancien arrosage instantané (télétransporté, sans
// déplacement réel).
export function findThirstyCrops(world, now, limit) {
  const out = [];
  for (const [i, c] of world.crops) {
    const gs = cropGrowState(c, now);
    if (!gs.needsWater) continue;
    out.push(i);
    if (out.length >= limit) break;
  }
  return out;
}

/* -------------------------------------------------------------------------
   Soan, l'employé pêcheur (chantier 2026-07, demande Guillaume). Fonctions
   pures, mêmes principes que le bloc Greg ci-dessus.
   ------------------------------------------------------------------------- */

// Cherche la berge (case G_SAND, sans objet dessus) la plus proche de
// `anchor` en anneaux croissants, jusqu'à C.SOAN_RIVER_SEARCH_RADIUS — même
// principe de recherche en spirale que findClearableTiles/findFreeGrassTiles.
// La rivière étant sinueuse et sa position dérivée de la seed (voir
// generateWorld), on ne peut pas viser un point fixe : on part d'une ancre
// côté maison et on cherche la berge la plus proche.
export function findRiverbankTile(world, anchor) {
  const seen = new Set();
  for (let r = 0; r < C.SOAN_RIVER_SEARCH_RADIUS; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // seulement l'anneau
        const x = anchor.x + dx, y = anchor.y + dy;
        if (!inMap(x, y)) continue;
        const i = idx(x, y);
        if (seen.has(i)) continue;
        seen.add(i);
        if (world.ground[i] === C.G_SAND && world.objects[i] === C.O_NONE) return i;
      }
    }
  }
  return null;
}

// Une prise de Soan une fois posté à la rivière : tirage pondéré identique
// au joueur (voir resolveAct cas "fish", fallback `weightedPick(C.FISH)`
// quand aucun minijeu ne tranche — Soan n'en a pas). Renvoie l'index dans
// C.FISH.
export function soanCatchFish(rnd) {
  return weightedPick(C.FISH, rnd);
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
   Chaudron de la pommade de protection (chantier 2026-07, voir
   SALVE_RECIPE dans fermeConstants.js). État partagé minimal : { trout,
   pike, cauldronUnlocked } — `trout`/`pike` = quantité de poissons déjà
   déposée par l'équipe vers LA PROCHAINE pommade. L'améthyste n'a pas besoin
   d'être "déposée" : elle est prélevée directement dans la réserve commune
   de gemmes (s.gems) au moment de la concoction (voir resolveSalveBrew).
   Comme la grange/les missions d'équipe : persiste entre sessions,
   coopératif (n'importe quel fermier peut déposer un poisson qu'il porte,
   n'importe quel fermier peut lancer la concoction une fois la recette
   réunie).
   `cauldronUnlocked` (chantier 2026-07, demande Guillaume : "le chaudron
   doit être récupéré dans le monde maléfique et ramené") : passe à true la
   PREMIÈRE fois qu'un fermier ramasse l'artéfact sur la carte maléfique (voir
   resolveEvilCauldronPickup) — unique pour toute la ferme, comme le puits :
   une fois true, plus personne ne peut le retrouver une deuxième fois côté
   maléfique, quel que soit l'endroit où le chaudron se trouve/est posé côté
   ferme ensuite. Le chaudron LUI-MÊME (l'objet posé sur la carte, voir
   O_CAULDRON) n'a pas besoin d'une position dans cet état partagé : comme
   O_MILL, sa position est entièrement dérivée de world.objects (persistée
   via objectOv, voir generateWorld/applyOverrides) — retrouvée au besoin par
   findCauldronPos() ci-dessous plutôt que dupliquée ici.
   ------------------------------------------------------------------------- */
export function newSalveCraftState() { return { trout: 0, pike: 0, cauldronUnlocked: false }; }

// Position du chaudron posé sur la carte (s'il l'est), dérivée de
// world.objects — un seul chaudron possible pour toute la ferme (voir
// resolveCauldronPlace), le scan complet de la carte reste donc négligeable
// (appelé seulement sur pression de E, jamais par tick).
function findCauldronPos(world) {
  for (let i = 0; i < world.objects.length; i++) {
    if (world.objects[i] === C.O_CAULDRON) return { x: xOf(i), y: yOf(i), i };
  }
  return null;
}

// Ramassage de l'artéfact sur la carte maléfique (touche E à proximité
// d'EVIL_CAULDRON_SPAWN, côté client — voir FermeGame.js/generateEvilWorld ;
// la carte maléfique elle-même est simulée localement, mais l'inventaire du
// fermier est géré par l'hôte comme le reste, d'où cette requête dédiée).
// Unique pour toute la ferme : refusé si déjà débloqué par quelqu'un
// d'autre (protège aussi contre une double requête si deux fermiers
// l'atteignent au même instant, l'hôte traitant les requêtes séquentiellement).
export function resolveEvilCauldronPickup(f, salveCraft) {
  normalizeFarmer(f);
  const res = { invChanged: false, toast: null, unlocked: false };
  if (salveCraft.cauldronUnlocked) { res.toast = "cauldronAlreadyTaken"; return res; }
  salveCraft.cauldronUnlocked = true;
  f.inv.cauldron = (f.inv.cauldron || 0) + 1;
  res.invChanged = true; res.unlocked = true;
  return res;
}

// Pose/retrait du chaudron ramené (outil Construction, variante "cauldron",
// même mécanique que le moulin — voir cas "mill" de resolveAct) : posable
// UNE SEULE fois puisque f.inv.cauldron ne peut valoir que 0 ou 1 (obtenu
// uniquement via resolveEvilCauldronPickup, jamais acheté). Retrait possible
// pour le déplacer ailleurs, mais bloqué tant que salveCraft contient encore
// du poisson non transformé (même prudence que millNotEmpty : ne jamais
// faire disparaître un dépôt collectif d'un autre fermier).
export function resolveCauldronPlace(f, world, salveCraft, m) {
  normalizeFarmer(f);
  const res = { invChanged: false, toast: null, tiles: [] };
  const x = m.x | 0, y = m.y | 0;
  if (!inMap(x, y) || !canReach(f, x, y)) return res;
  const i = idx(x, y), g = world.ground[i], o = world.objects[i];
  const now = Date.now();
  if (o === C.O_CAULDRON) {
    if ((salveCraft.trout || 0) > 0 || (salveCraft.pike || 0) > 0) { res.toast = "cauldronNotEmpty"; return res; }
    world.objects[i] = C.O_NONE; world.objHp.delete(i);
    f.inv.cauldron = (f.inv.cauldron || 0) + 1;
    res.tiles.push(i); res.invChanged = true;
  } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
    if (f.inv.cauldron > 0) {
      f.inv.cauldron--;
      world.objects[i] = C.O_CAULDRON; world.objHp.set(i, now + C.BUILD_TIMES.cauldron);
      res.tiles.push(i); res.invChanged = true;
    } else res.toast = "noCauldronStock";
  }
  return res;
}

// Dépôt d'un poisson (truite ou brochet) au chaudron (touche E à proximité
// du chaudron POSÉ, comme le dépôt de bois/pierre à la grange). `m.fish` =
// "trout" | "pike". Dépose le MAXIMUM utile (comme resolveCoopDeposit/
// resolveBarnDeposit) plutôt que tout refuser si le fermier en porte plus
// que ce qu'il reste à réunir pour la prochaine pommade — l'éventuel surplus
// déposé sert d'avance pour la pommade SUIVANTE plutôt que d'être plafonné,
// pour ne pas gaspiller une pêche généreuse.
export function resolveSalveDeposit(f, salveCraft, world, m) {
  normalizeFarmer(f);
  const res = { invChanged: false, toast: null, deposited: 0, fish: null };
  const pos = findCauldronPos(world);
  if (!pos || !buildReady(world.objHp.get(pos.i), Date.now())) { res.toast = "cauldronMissing"; return res; }
  if (!nearT(f, pos)) { res.toast = "farCauldron"; return res; }
  const key = m.fish === "pike" ? "pike" : m.fish === "trout" ? "trout" : null;
  if (!key) return res;
  const ft = key === "trout" ? 1 : 2; // index C.FISH (voir fermeConstants.js)
  const have = f.inv.fish[ft] || 0;
  if (have <= 0) { res.toast = "noFishToDeposit"; return res; }
  f.inv.fish[ft] -= have;
  salveCraft[key] = (salveCraft[key] || 0) + have;
  res.invChanged = true; res.deposited = have; res.fish = key;
  return res;
}

// Lancement de la concoction (touche E au chaudron, une fois la recette
// réunie) : consomme EXACTEMENT SALVE_RECIPE (pas tout le surplus éventuel,
// pour laisser une avance à la pommade suivante) dans le stock déposé
// (trout/pike) et dans la réserve commune de gemmes (amethyst), puis crédite
// 1 pommade dans l'inventaire PERSONNEL du fermier qui lance la concoction
// (physiquement présent pour la récupérer) — pas dans un stock partagé, pour
// rester cohérent avec le reste de l'inventaire consommable (trousse de
// soins, etc.).
export function resolveSalveBrew(f, salveCraft, gems, world) {
  normalizeFarmer(f);
  const res = { invChanged: false, gemsChanged: false, toast: null, brewed: false };
  const pos = findCauldronPos(world);
  if (!pos || !buildReady(world.objHp.get(pos.i), Date.now())) { res.toast = "cauldronMissing"; return res; }
  if (!nearT(f, pos)) { res.toast = "farCauldron"; return res; }
  const rec = C.SALVE_RECIPE;
  const haveAmethyst = (gems && gems[0]) || 0;
  const ready = (salveCraft.trout || 0) >= rec.trout && (salveCraft.pike || 0) >= rec.pike && haveAmethyst >= rec.amethyst;
  if (!ready) { res.toast = "cauldronMissing"; return res; }
  salveCraft.trout -= rec.trout; salveCraft.pike -= rec.pike;
  gems[0] -= rec.amethyst; res.gemsChanged = true;
  f.inv.salve = (f.inv.salve || 0) + 1; res.invChanged = true; res.brewed = true;
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
  } else if (m.item === "grass") {
    const n = Math.max(1, Math.min(50, (m.n | 0) || 1));
    const cost = C.GRASS_COST * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.inv.grass = (f.inv.grass || 0) + n; res.invChanged = true;
  } else if (m.item === "mill") {
    const n = Math.max(1, Math.min(50, (m.n | 0) || 1));
    const cost = C.MILL_COST * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.inv.mill = (f.inv.mill || 0) + n; res.invChanged = true;
  } else if (m.item === "healKit") {
    const n = Math.max(1, Math.min(10, (m.n | 0) || 1));
    const cost = C.HEAL_KIT_COST * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.inv.healKit = (f.inv.healKit || 0) + n; res.invChanged = true;
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

// Usage de la pommade de protection (chantier 2026-07) : consomme 1 unité de
// l'inventaire si dispo. L'effet (immunité/répulsion 10 min côté carte
// maléfique) est appliqué localement côté client au moment du clic (voir
// useSalve, FermeGame.js) ; cette fonction ne gère QUE le décompte du stock
// côté hôte, seul autorité sur l'inventaire (persistance/diffusion).
export function resolveUseSalve(f) {
  normalizeFarmer(f);
  const res = { invChanged: false, toast: null };
  if (!((f.inv.salve || 0) > 0)) { res.toast = "noSalve"; return res; }
  f.inv.salve -= 1; res.invChanged = true;
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

// Vente d'une gemme depuis le pool COMMUN à la salle (chantier 2026-07,
// demande Guillaume : les gemmes/diamants sont partagés entre tous les
// joueurs de la ferme, pas privés à chacun). `gems` = tableau partagé
// (sharedRef.current.gems côté FermeGame.js), muté directement comme le
// fait resolveSell sur f.inv. Renvoie { moneyDelta, earnedDelta, gemsChanged,
// toast, gain }, même forme que resolveSell pour rester simple à brancher
// côté hôte.
export function resolveSellGem(gems, m) {
  const res = { moneyDelta: 0, earnedDelta: 0, gemsChanged: false, toast: null, gain: 0 };
  const gt = m.gem | 0;
  if (gt < 0 || gt >= C.GEMS.length || !gems) return res;
  const have = gems[gt] || 0;
  const n = Math.min(have, Math.max(1, (m.n | 0) || have));
  if (n <= 0) return res;
  gems[gt] -= n;
  const gain = n * C.GEMS[gt].sell;
  res.moneyDelta = gain; res.earnedDelta = gain; res.gemsChanged = true; res.gain = gain;
  return res;
}

// Vente d'un sac de farine depuis le pool COMMUN à la salle (chantier
// 2026-07, transformation artisanale demandée par Guillaume) : même principe
// que resolveSellGem, mais `shared.flour` est un simple compteur (pas un
// tableau par type, un seul produit pour l'instant). `shared` = sharedRef.current
// côté FermeGame.js, muté directement. Renvoie { moneyDelta, earnedDelta,
// flourChanged, toast, gain }, même forme que resolveSell/resolveSellGem.
export function resolveSellFlour(shared, m) {
  const res = { moneyDelta: 0, earnedDelta: 0, flourChanged: false, toast: null, gain: 0 };
  if (!shared) return res;
  const have = shared.flour || 0;
  const n = Math.min(have, Math.max(1, (m.n | 0) || have));
  if (n <= 0) return res;
  shared.flour = have - n;
  const gain = n * C.FLOUR_SELL;
  res.moneyDelta = gain; res.earnedDelta = gain; res.flourChanged = true; res.gain = gain;
  return res;
}

// Vente d'un poisson depuis le pool COMMUN pêché par Soan (chantier 2026-07,
// demande Guillaume : "le poisson est direct notre propriété et on peut aller
// le vendre") : même principe que resolveSellGem/resolveSellFlour ci-dessus.
// `stock` = sharedRef.current.gregStock côté FermeGame.js (stock.fish, tableau
// par espèce comme C.FISH/f.inv.fish), muté directement. Renvoie
// { moneyDelta, earnedDelta, stockChanged, toast, gain }.
export function resolveSellCommonFish(stock, m) {
  const res = { moneyDelta: 0, earnedDelta: 0, stockChanged: false, toast: null, gain: 0 };
  const ft = m.fish | 0;
  if (ft < 0 || ft >= C.FISH.length || !stock || !stock.fish) return res;
  const have = stock.fish[ft] || 0;
  const n = Math.min(have, Math.max(1, (m.n | 0) || have));
  if (n <= 0) return res;
  stock.fish[ft] -= n;
  const gain = n * C.FISH[ft].sell;
  res.moneyDelta = gain; res.earnedDelta = gain; res.stockChanged = true; res.gain = gain;
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
  // Dégradation du pont bois (chantier 2026-07, demande Guillaume) : "une
  // fois qu'il est totalement construit, il perd deux tuiles par nuit, car il
  // est en bois" — ajusté ensuite par Guillaume ("trop fréquent sinon") à
  // une nuit SUR DEUX (voir BRIDGE_DECAY_EVERY_N_NIGHTS). Ne s'applique QUE
  // si la traversée est déjà ENTIÈREMENT bâtie (aucune case encore en
  // G_BRIDGE_SITE) ; les cases perdues sont tirées au hasard PARMI LES CASES
  // BOIS uniquement (G_BRIDGE/G_BRIDGE_CLOSED
  // — jamais les cases rénovées G_BRIDGE_STONE/G_BRIDGE_STONE_CLOSED, qui
  // résistent) et redeviennent un chantier G_BRIDGE_SITE normal à rebâtir.
  for (const sites of (world.bridgeSites || [])) {
    if (day % C.BRIDGE_DECAY_EVERY_N_NIGHTS !== 0) continue;
    const complete = sites.every((si) => {
      const sg = world.ground[si];
      return sg === C.G_BRIDGE || sg === C.G_BRIDGE_CLOSED || sg === C.G_BRIDGE_STONE || sg === C.G_BRIDGE_STONE_CLOSED;
    });
    if (!complete) continue;
    const woodSites = sites.filter((si) => world.ground[si] === C.G_BRIDGE || world.ground[si] === C.G_BRIDGE_CLOSED);
    let n = Math.min(C.BRIDGE_DECAY_PER_NIGHT, woodSites.length);
    while (n > 0) {
      const pick = Math.floor(rnd() * woodSites.length);
      const si = woodSites.splice(pick, 1)[0];
      world.ground[si] = C.G_BRIDGE_SITE;
      tiles.push(si);
      n--;
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

// Météo (chantier 2026-07, demande Guillaume) : true si `day` est un jour
// orageux/pluvieux (voir C.STORM_EVERY_N_DAYS). Dérivé du compteur `day`
// existant plutôt que d'un tirage aléatoire : même résultat pour tous les
// joueurs de la ferme sans rien synchroniser de plus, et prévisible d'une
// session à l'autre.
export function isStormyDay(day) {
  return C.STORM_EVERY_N_DAYS > 0 && (day | 0) % C.STORM_EVERY_N_DAYS === 0;
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
  if (g === C.G_WATER || g === C.G_BRIDGE_SITE || g === C.G_BRIDGE_CLOSED || g === C.G_BRIDGE_STONE_CLOSED) return true;
  if (o === C.O_LAMP || o === C.O_MILL) return buildReady(world.objHp.get(i), now);
  if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK || o === C.O_HOUSE || o === C.O_SHOP || o === C.O_BIN || o === C.O_STUMP || o === C.O_WELL || o === C.O_FENCE || o === C.O_FENCE_H || o === C.O_FENCE_V || o === C.O_WALL) return true;
  return false;
}

export const idxOf = idx;

/* -------------------------------------------------------------------------
   Loups (chantier 2026-07, demande Guillaume). Fonctions PURES réutilisées
   par la simulation hôte dans FermeGame.js (updateWolves) : déterminer la
   nuit, le côté de la rivière, et l'état d'un pont à un point donné.
   ------------------------------------------------------------------------- */

// Vrai entre le crépuscule (17h) et l'aube (6h30), mêmes paliers que le
// voile visuel nightAlpha (voir C.DUSK_START_MIN/DAWN_END_MIN).
export function isNightTime(tmin) {
  return tmin < C.DAWN_END_MIN || tmin >= C.DUSK_START_MIN;
}

// Centre de la rivière à la rangée y (clampée aux bords de la carte).
export function riverCenterAt(world, y) {
  if (!world.riverCenter || !world.riverCenter.length) return world.w / 2;
  const row = Math.max(0, Math.min(world.riverCenter.length - 1, Math.round(y)));
  return world.riverCenter[row];
}

// "east" = rive droite (sauvage, où les loups apparaissent), "west" = rive
// gauche (côté ferme/enclos). Correspond à x plus grand ou plus petit que le
// centre de la rivière à cette rangée.
export function riverSideOf(world, x, y) {
  return x > riverCenterAt(world, y) ? "east" : "west";
}

// Un pont (index k dans world.bridgeSites) est franchissable seulement si
// TOUTES ses cases sont posées en G_BRIDGE (jamais G_BRIDGE_SITE, jamais
// G_BRIDGE_CLOSED — même règle de collision que blockedTile pour les
// fermiers). Vérifier la première case suffit : le levier (resolveAct cas
// "lever") bascule toutes les cases d'une même traversée ensemble.
export function bridgeIsOpen(world, k) {
  const sites = world.bridgeSites && world.bridgeSites[k];
  if (!sites || !sites.length) return false;
  const g0 = world.ground[sites[0]];
  return g0 === C.G_BRIDGE || g0 === C.G_BRIDGE_STONE;
}

// Vrai si la case (x,y) est de l'eau infranchissable à pied (rivière, ou
// emplacement de pont pas encore construit/fermé) — utilisé pour empêcher
// les loups de traverser la rivière ailleurs que par un pont OUVERT (voir
// updateWolves dans FermeGame.js, correctif chantier 2026-07 : les loups
// pouvaient sinon marcher directement sur l'eau, ex. en phase "flee").
export function isWaterTile(world, x, y) {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (!inMap(fx, fy)) return true;
  const g = world.ground[idx(fx, fy)];
  return g === C.G_WATER || g === C.G_BRIDGE_SITE || g === C.G_BRIDGE_CLOSED || g === C.G_BRIDGE_STONE_CLOSED;
}

// Point de passage (centre) d'un pont, pour servir de point de cheminement
// intermédiaire aux loups qui doivent changer de rive.
export function bridgeCrossPoint(world, k) {
  const sites = world.bridgeSites[k];
  let sx = 0, sy = 0;
  for (const si of sites) { sx += xOf(si); sy += yOf(si); }
  return { x: sx / sites.length, y: sy / sites.length };
}

// Pont ouvert le plus proche d'un point donné (n'importe quelle rive) :
// renvoie son index, ou -1 si aucun pont n'est actuellement ouvert.
export function nearestOpenBridge(world, x, y) {
  let best = -1, bestD = Infinity;
  for (let k = 0; k < (world.bridgeSites ? world.bridgeSites.length : 0); k++) {
    if (!bridgeIsOpen(world, k)) continue;
    const p = bridgeCrossPoint(world, k);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

// Position d'apparition d'un loup, rive droite (sauvage), à une distance
// raisonnable de la berge (C.WOLF_SPAWN_MARGIN) et de la rivière, tirée
// aléatoirement le long d'une rangée valide. `rnd` = générateur 0..1 fourni
// par l'appelant (Math.random côté hôte, la seed du monde n'a pas besoin
// d'être respectée ici : les loups ne font pas partie du monde persistant).
export function wolfSpawnPos(world, rnd) {
  for (let tries = 0; tries < 40; tries++) {
    const y = Math.floor(rnd() * world.h);
    const cx = riverCenterAt(world, y);
    const x = Math.round(cx + C.WOLF_SPAWN_MARGIN + rnd() * C.WOLF_ROAM_RADIUS);
    if (x < 0 || x >= world.w) continue;
    if (!blockedTile(world, x, y)) return { x: x + 0.5, y: y + 0.5 };
  }
  // Repli : juste à l'est du centre de la rivière au milieu de la carte.
  const y = Math.floor(world.h / 2);
  return { x: riverCenterAt(world, y) + C.WOLF_SPAWN_MARGIN + 1, y: y + 0.5 };
}

// Distance (en cases) au centre de la maison — même centre que gemChanceAt
// ci-dessus, réutilisé tel quel pour placer les lapins ("zones éloignées de
// la maison", demande Guillaume).
export function houseDist(x, y) {
  return Math.hypot(x - HOUSE_CX, y - HOUSE_CY);
}

// Position d'apparition d'un lapin (chantier 2026-07, demande Guillaume :
// "petits lapins... surtout rive droite"). Contrairement aux loups (qui
// n'apparaissent QUE rive droite), les lapins favorisent la rive droite sans
// s'y limiter strictement (C.RABBIT_EAST_BIAS, tiré une fois par tentative de
// spawn) — et doivent toujours être loin de la maison (C.RABBIT_MIN_HOUSE_DIST),
// où qu'ils soient sur la carte. `rnd` = générateur 0..1 fourni par
// l'appelant (Math.random côté hôte, comme wolfSpawnPos).
export function rabbitSpawnPos(world, rnd) {
  const preferEast = rnd() < C.RABBIT_EAST_BIAS;
  for (let tries = 0; tries < 60; tries++) {
    const x = Math.floor(rnd() * world.w);
    const y = Math.floor(rnd() * world.h);
    if (houseDist(x, y) < C.RABBIT_MIN_HOUSE_DIST) continue;
    if (preferEast && riverSideOf(world, x, y) !== "east") continue;
    if (blockedTile(world, x, y) || isWaterTile(world, x, y)) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  // Repli : même filet que wolfSpawnPos, rive droite au milieu de la carte.
  const y = Math.floor(world.h / 2);
  return { x: riverCenterAt(world, y) + C.WOLF_SPAWN_MARGIN + 4, y: y + 0.5 };
}
