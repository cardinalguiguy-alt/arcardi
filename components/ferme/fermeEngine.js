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

  /* ⚠️⚠️ ZIP 425 — CORRECTION D'UN BOGUE QUI RENDAIT IMPOSSIBLE DE CRÉER UNE
     FERME NEUVE. Trouvé en ouvrant le jeu en local pour la première fois depuis
     que `node` existe sur cette machine.
     ─────────────────────────────────────────────────────────────────────────
     Ce monde sortait d'ici SANS `sucreries` ni `orchards`. Les deux Map
     n'étaient créées que par `applyOverrides`, qu'on n'appelle QUE sur une
     ferme rechargée depuis une sauvegarde. La branche « nouveau code de
     ferme » (voir loadFarmByCode dans FermeGame.js) enchaînait donc
     `generateWorld()` puis `persistFarm()`, lequel appelle
     `serializeSucreries` — qui fait `for (const [i, s] of world.sucreries)`
     sur `undefined`. Résultat : « TypeError: world.sucreries is not iterable »
     et un écran de personnage figé, à la première ouverture d'un code inédit.

     ⚠️ POURQUOI PERSONNE NE L'AVAIT VU : toutes les fermes existantes passent
     par la branche « sauvegarde », donc par applyOverrides, qui répare le
     manque au passage. Le défaut ne se déclenche QUE sur un code jamais
     utilisé — c'est-à-dire pour un nouveau joueur, et jamais pour nous.
     C'est aussi pour ça qu'il a survécu au zip 398, qui a ajouté `orchards`
     en copiant fidèlement le chemin de `sucreries`... et son oubli avec.

     ⚠️ LA CORRECTION EST ICI ET NON DANS L'APPELANT : un monde doit sortir
     COMPLET de son constructeur. Le réparer côté chargement, c'était rendre la
     validité du monde dépendante de qui l'a fabriqué — exactement la faute que
     `serializeOrchards` se donne du mal à éviter dix lignes plus bas. */
  return { w: W, h: H, ground, objects, objHp, crops, mills, sucreries: new Map(), orchards: new Map(), bridgeSites, bridgeLeverPos, riverCenter, darkPassage };
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
/* -------------------------------------------------------------------------
   Zip 372 : couloir garanti vers la PORTE DU DÉFI DE FUITE (bord est).
   -------------------------------------------------------------------------
   Appelée par generateEvilWorld ET generatePassageWorld, APRÈS toute la
   génération : elle passe en force. C'est le seul moyen de tenir la promesse
   « toujours accessible quelle que soit la carte » — le monde du labyrinthe
   pose des haies sur toute la surface, et rien dans un placement aléatoire ne
   garantit qu'un chemin subsiste.

   Le tracé est un escalier qui réduit à chaque pas le plus grand des deux
   écarts. Il traverse donc le lac : les cases d'eau redeviennent de l'herbe,
   ce qui dessine une chaussée sombre au milieu du violet luisant. C'est voulu,
   et ça signale le chemin au joueur sans avoir à ajouter le moindre balisage.

   Largeur : RUN_CORRIDOR_HALF de chaque côté, donc 3 cases. À 1 case de large,
   un joueur qui longe le bord se coince entre deux troncs et la garantie n'en
   est plus une dès qu'on joue vraiment.
   ------------------------------------------------------------------------- */
export function carveRunCorridor(ground, objects, objHp, W, H) {
  const clearAt = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (ground[i] === C.G_WATER) ground[i] = C.G_GRASS;
    if (objects[i] !== C.O_NONE) { objects[i] = C.O_NONE; objHp.delete(i); }
  };
  const half = C.RUN_CORRIDOR_HALF;
  const swath = (x, y) => {
    for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) clearAt(x + dx, y + dy);
  };

  /* ZIP 375 : le couloir vise désormais le PIED de la jetée, pas la porte.
     La porte est au bout d'une jetée posée sur le lac ; y creuser un couloir
     reviendrait à convertir en herbe les cases d'eau qu'il traverse, donc à
     vider le lac sur trois cases de large exactement là où il doit être le
     plus imposant. Le couloir amène sur la berge, la jetée fait le reste. */
  const target = C.RUN_JETTY_BASE;
  let x = C.EVIL_SPAWN.x, y = C.EVIL_SPAWN.y;
  let guard = W * H; // garde-fou : jamais de boucle infinie, même sur une constante aberrante
  swath(x, y);
  while ((x !== target.x || y !== target.y) && guard-- > 0) {
    if (Math.abs(target.x - x) >= Math.abs(target.y - y)) x += Math.sign(target.x - x);
    else y += Math.sign(target.y - y);
    swath(x, y);
  }

  // Place dégagée devant la jetée : on doit pouvoir la voir venir et manœuvrer
  // — et, depuis le zip 375, y affronter trois loups sans se coincer dans un
  // arbre au premier pas de côté.
  for (let dy = -C.RUN_GATE_CLEAR; dy <= C.RUN_GATE_CLEAR; dy++) {
    for (let dx = -C.RUN_GATE_CLEAR; dx <= C.RUN_GATE_CLEAR; dx++) clearAt(target.x + dx, target.y + dy);
  }
}

/* --------------------------------------------------------------------------
   ZIP 375 — RIVE EST, BERGE ET JETÉE.

   Appelée APRÈS carveRunCorridor dans les deux générateurs, et c'est un
   ordre qui compte : le couloir dégage en force tout ce qu'il traverse, y
   compris de l'eau. S'il passait après, il découperait une tranchée d'herbe
   dans la rive qu'on vient de creuser.

   Trois passes, dans cet ordre :
     1. l'eau, avec un bord irrégulier (une rive rectiligne se lit comme un
        bug d'affichage, pas comme un rivage) ;
     2. la BERGE, bande de galets moussus sur les cases de terre qui touchent
        l'eau. C'est elle qui porte le « fondu » demandé — un dégradé de
        rendu sur un bord en escalier ne fait qu'adoucir l'escalier ;
     3. la JETÉE, dalles posées PAR-DESSUS l'eau, plus la porte au bout.

   Renvoie la carte de PROFONDEUR (0 au bord, 255 au large), calculée ici une
   fois pour toutes. Le rendu s'en sert pour foncer l'eau et atténuer la lueur
   près du bord ; la recalculer à chaque frame coûterait un parcours complet
   de la carte soixante fois par seconde pour un résultat rigoureusement
   constant.
   -------------------------------------------------------------------------- */
export function carveEastLake(ground, objects, objHp, W, H) {
  const clearObj = (i) => { if (objects[i] !== C.O_NONE) { objects[i] = C.O_NONE; objHp.delete(i); } };

  // --- 1. L'eau ---------------------------------------------------------
  // Le bord suit une somme de deux sinus de périodes non multiples : la
  // silhouette ne se répète pas sur la hauteur de la carte, contrairement à
  // un sinus unique dont on verrait aussitôt la régularité.
  const edgeAt = (y) =>
    C.EAST_LAKE_X
    + Math.sin(y * 0.21) * C.EAST_LAKE_WOBBLE
    + Math.sin(y * 0.073 + 2.1) * (C.EAST_LAKE_WOBBLE * 0.55);

  for (let y = 0; y < H; y++) {
    const edge = edgeAt(y);
    for (let x = Math.max(0, Math.floor(edge) - 1); x < W; x++) {
      if (x < edge) continue;
      const i = y * W + x;
      ground[i] = C.G_WATER;
      clearObj(i);
    }
  }

  /* ESPLANADE D'APPROCHE. Bien plus qu'un pied de jetée au sec : toute la
     bande de terre depuis laquelle les darkwolves surgissent, et sur laquelle
     se joue l'affrontement si le joueur ressort du menu.

     Sa longueur est RUN_AMBUSH_START_DIST + marge, et ce n'est pas une
     coïncidence : c'est exactement la distance à laquelle la cinématique fait
     apparaître le premier loup. Dériver les deux du même nombre est la seule
     façon de garantir qu'ils ne surgiront jamais du lac — le placement des
     loups est purement géométrique, rien dans leur code ne consulte la
     collision.

     Ce défaut-là n'a pas été deviné : verify-gate.mjs rejoue les positions de
     la cinématique et l'a signalé sur la carte maléfique historique, où le
     lac CENTRAL (rayon 12 autour de x=47) recouvrait le point d'apparition.

     Comme le couloir garanti, l'esplanade convertit l'eau qu'elle rencontre.
     Sur la carte historique elle taille donc un isthme dans le lac central —
     c'est le même parti pris qu'au zip 372 (« le couloir traverse le lac :
     ça dessine une chaussée sombre au milieu du violet luisant »), et la
     berge posée juste après en fait un rivage plutôt qu'une découpe. */
  const base = C.RUN_JETTY_BASE, half = C.RUN_JETTY_HALF_W;
  const runway = C.RUN_AMBUSH_START_DIST + 3;
  // Zip 378 : la largeur de l'esplanade est DÉRIVÉE de celle de la chaussée
  // (RUN_KERB_HALF_W) au lieu d'être « une case de plus que les voies ». Les
  // deux valaient 2 par coïncidence ; élargir la chaussée sans élargir son
  // approche aurait fait déboucher les blocs de bordure sur du vide.
  for (let dy = -C.RUN_KERB_HALF_W; dy <= C.RUN_KERB_HALF_W; dy++) {
    const yy = base.y + dy;
    if (yy < 0 || yy >= H) continue;
    for (let xx = base.x - runway; xx <= base.x; xx++) {
      if (xx < 0 || xx >= W) continue;
      const i = yy * W + xx;
      ground[i] = C.G_GRASS;
      clearObj(i);
    }
  }

  // --- 2. La berge ------------------------------------------------------
  const isWater = (x, y) => x >= 0 && y >= 0 && x < W && y < H && ground[y * W + x] === C.G_WATER;
  const shore = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (ground[i] !== C.G_GRASS) continue;
      let near = false;
      for (let d = 1; d <= C.LAKE_SHORE_BAND && !near; d++) {
        if (isWater(x + d, y) || isWater(x - d, y) || isWater(x, y + d) || isWater(x, y - d)) near = true;
      }
      if (near) shore.push(i);
    }
  }
  for (const i of shore) { ground[i] = C.G_LAKE_SHORE; clearObj(i); }

  /* --- 3. La CHAUSSÉE (zip 378) -----------------------------------------
     Elle ne s'arrête plus quatre dalles après la berge : elle court jusqu'au
     bord EST de la carte et sort du cadre. Retour de Guillaume sur capture :
     une jetée qui s'interrompt au milieu d'un lac se lit comme un décor
     inachevé, alors que la même chaussée qui file hors de l'écran raconte que
     le défi de fuite en est la suite.

     Cinq cases de large : trois praticables au centre, une rangée de BORDURE
     de chaque côté. La bordure bloque, mais elle ne coûte aucun passage — ces
     cases-là étaient de l'eau, qui bloquait déjà. C'est la condition pour que
     toute la géométrie de l'embuscade, calculée sur les trois voies, reste
     valable sans y toucher.

     On s'arrête à W - 1 inclus : la dernière colonne de la carte porte donc
     de la pierre, et la caméra, qui se bloque sur le bord, ne montre jamais
     de fin de chaussée. */
  for (let x = base.x + 1; x <= Math.min(C.RUN_DECK_END_X, W - 1); x++) {
    for (let dy = -C.RUN_KERB_HALF_W; dy <= C.RUN_KERB_HALF_W; dy++) {
      const yy = base.y + dy;
      if (x < 0 || yy < 0 || x >= W || yy >= H) continue;
      const i = yy * W + x;
      ground[i] = Math.abs(dy) <= half ? C.G_RUN_JETTY : C.G_RUN_KERB;
      clearObj(i);
    }
  }
  // Le point de déclenchement garde sa case. Posé APRÈS le pavage, sinon la
  // boucle ci-dessus le recouvrirait — et le défi deviendrait injouable sans
  // qu'aucune erreur ne soit levée.
  ground[C.RUN_GATE.y * W + C.RUN_GATE.x] = C.G_RUN_GATE;

  // --- Carte de profondeur ---------------------------------------------
  // Transformée de distance en deux balayages (avant puis arrière) sur la
  // distance de Manhattan : exact, linéaire, et sans file d'attente à gérer.
  const INF = 1e6;
  const dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = ground[i] === C.G_WATER ? INF : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
    if (y > 0) dist[i] = Math.min(dist[i], dist[i - W] + 1);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (x < W - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
    if (y < H - 1) dist[i] = Math.min(dist[i], dist[i + W] + 1);
  }
  const DEPTH_FULL = 6; // au-delà de 6 cases du bord, l'eau est « au large »
  const depth = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    depth[i] = ground[i] === C.G_WATER
      ? Math.round(255 * Math.min(1, dist[i] / DEPTH_FULL)) : 0;
  }
  return depth;
}

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
  // Zip 372 : couloir garanti vers la porte du défi. Posé AVANT les créatures
  // ci-dessous, qui tirent leur position sur les cases libres — elles peuvent
  // donc apparaître dans le couloir, et c'est très bien : le chemin est
  // garanti praticable, pas garanti tranquille.
  carveRunCorridor(ground, objects, objHp, W, H);
  // Zip 375 : rive est, berge et jetée. APRÈS le couloir, jamais avant — le
  // couloir dégage en force tout ce qu'il traverse, y compris de l'eau, et
  // découperait une tranchée d'herbe en plein milieu de la rive.
  const depth = carveEastLake(ground, objects, objHp, W, H);
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
    // Correctif 2026-07 (demande Guillaume : "il ne faut pas que tous les
    // monstres aient un aspect de loup") : chaque créature reçoit un `kind`
    // ("wolf" ou "zombie") tiré ici via le même rnd() seedé que le reste de
    // la génération, donc déterministe et identique pour tous les clients
    // (pas de Math.random(), sinon désync visuelle entre joueurs). Répartition
    // ~50/50, aucun impact sur la logique de poursuite/contact (voir
    // updateEvilMonsters, FermeGame.js), seulement sur le rendu.
    const kind = rnd() < 0.5 ? "wolf" : "zombie";
    if (ok) monsters.push({ id: n, kind, x: mx + 0.5, y: my + 0.5, homeX: mx + 0.5, homeY: my + 0.5 });
  }
  return { w: W, h: H, ground, objects, objHp, depth, crops: new Map(), mills: new Map(), bridgeSites: [], bridgeLeverPos: [], riverCenter: [], monsters };
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
      // Zip 287 (empilement de graines, n en 5e position) : depuis ce zip,
      // serializeCrops écrit TOUJOURS [i,t,bankedMs,wateredAt,n] (longueur
      // 5). L'ANCIEN format pré-151 avait aussi 5 éléments
      // ([i,t,stage,prog,watered], pousse par jour de jeu) mais aucune
      // sauvegarde de cette ancienneté (130+ zips plus tôt) ne peut
      // raisonnablement subsister ; on ne distingue donc plus les deux ici
      // (cropGrowState reste défensif sur des valeurs incohérentes de toute
      // façon, voir son commentaire).
      const [, , bankedMs, wateredAt, n] = row;
      world.crops.set(i, { t, n: n || 1, bankedMs: bankedMs || 0, wateredAt: wateredAt || null });
    } else {
      // [i,t,bankedMs,wateredAt] (longueur 4, zips 151 à 286) : pas de n
      // sauvegardé -> défaut 1 (une seule culture par case, comme avant).
      const [, , bankedMs, wateredAt] = row;
      world.crops.set(i, { t, n: 1, bankedMs: bankedMs || 0, wateredAt: wateredAt || null });
    }
  }
  world.mills = world.mills || new Map();
  world.mills.clear();
  if (saved.mills) for (const row of saved.mills) {
    const [i, wheat, nextAt] = row;
    world.mills.set(i, { wheat: wheat || 0, nextAt: nextAt || 0 });
  }
  // Sucrerie (chantier canne à sucre) : miroir exact de world.mills ci-dessus.
  world.sucreries = world.sucreries || new Map();
  world.sucreries.clear();
  if (saved.sucreries) for (const row of saved.sucreries) {
    const [i, cane, nextAt] = row;
    world.sucreries.set(i, { cane: cane || 0, nextAt: nextAt || 0 });
  }
  /* ZIP 398 — LES VERGERS. Miroir EXACT de world.mills / world.sucreries
     ci-dessus : même Map, même sérialisation, même chemin réseau. C'est la
     règle du projet — un chemin d'accès à un état partagé se COPIE d'un accès
     existant du même fichier, jamais de mémoire (leçon des zips 385/387). */
  world.orchards = world.orchards || new Map();
  world.orchards.clear();
  if (saved.orchards) for (const row of saved.orchards) {
    const [i, k, plantedAt, nextAt, ripe] = row;
    world.orchards.set(i, { k: k | 0, plantedAt: plantedAt || 0, nextAt: nextAt || 0, ripe: ripe | 0 });
  }
  return world;
}

export function serializeCrops(world) {
  const out = [];
  for (const [i, c] of world.crops) out.push([i, c.t, c.bankedMs || 0, c.wateredAt || 0, c.n || 1]);
  return out;
}

// Sérialisation des moulins (chantier 2026-07), même principe que
// serializeCrops : seuls les moulins avec un état non trivial (du blé en
// stock ou une transformation en cours) sont écrits, un moulin fraîchement
// posé (wheat:0, nextAt:0) est recréé avec ces valeurs par défaut au besoin
// (voir resolveAct cas "millDeposit"/millTick, qui utilisent `world.mills.get(i)
// || { wheat: 0, nextAt: 0 }`).
export function serializeOrchards(world) {
  const out = [];
  // ⚠️ On écrit TOUS les vergers, contrairement aux moulins qui ne sont écrits
  // qu'avec un état non trivial. La raison est de fond : un moulin vide est
  // reconstructible depuis `world.objects` (c'est un bâtiment posé, sans
  // mémoire) ; un verger, lui, PORTE son espèce et sa date de plantation. Un
  // verger « par défaut » n'existe pas — on ne saurait pas s'il s'agit d'un
  // citronnier ou d'un fraisier, ni depuis quand il pousse.
  for (const [i, o] of (world.orchards || new Map())) out.push([i, o.k | 0, o.plantedAt || 0, o.nextAt || 0, o.ripe | 0]);
  return out;
}

export function serializeMills(world) {
  const out = [];
  for (const [i, ms] of world.mills) if ((ms.wheat || 0) > 0 || (ms.nextAt || 0) > 0) out.push([i, ms.wheat || 0, ms.nextAt || 0]);
  return out;
}

// Sérialisation des sucreries (chantier canne à sucre), miroir exact de
// serializeMills ci-dessus.
export function serializeSucreries(world) {
  const out = [];
  for (const [i, ss] of world.sucreries) if ((ss.cane || 0) > 0 || (ss.nextAt || 0) > 0) out.push([i, ss.cane || 0, ss.nextAt || 0]);
  return out;
}

// État de pousse d'une culture au temps `now` (ms epoch), calculé PUREMENT à
// partir de son horodatage d'arrosage et de sa progression déjà "banquée" :
// aucun état supplémentaire à synchroniser, chaque client peut le recalculer
// localement à tout instant (comme gameTimeMin). L'arrosage reste valable
// C.WATER_VALID_MS : passé ce délai sans réarroser, la pousse est mise en
// pause (elle ne recule jamais) jusqu'au prochain arrosage.
export function cropGrowState(crop, now) {
  // Défensif (chantier 2026-07) : un `crop.t` invalide/hors-limites (tuile
  // ciblée par une tâche de Greg périmée, snapshot en cours de migration,
  // etc.) faisait planter cette fonction (accès à C.CROPS[undefined].growMs),
  // ce qui interrompait la boucle de rendu des tuiles EN PLEIN FRAME et
  // laissait tout le reste de la carte non dessiné — le fameux glitch des
  // "carrés noirs". On retombe sur la culture 0 plutôt que de jeter.
  const def = C.CROPS[crop.t] || C.CROPS[0];
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
// Zip 286 (demande Guillaume : "2 moulins = x2, 3 moulins = x3") :
// `speedMult` (nombre de moulins CONSTRUITS sur la ferme, calculé par
// l'appelant — voir FermeGame.js) divise la durée d'un batch, sans toucher
// à la quantité de blé consommée par sac (MILL_WHEAT_PER_SACK inchangé).
// Par défaut 1 (aucun changement de comportement pour un appelant qui ne le
// précise pas encore).
export function millTick(ms, now, speedMult = 1) {
  let wheat = (ms && ms.wheat) || 0;
  let nextAt = (ms && ms.nextAt) || 0;
  let sacks = 0;
  const mult = Math.max(C.MILL_SPEED_MIN_MULT, speedMult || 1);
  const batchMs = C.MILL_BATCH_MS / mult;
  if (wheat >= C.MILL_WHEAT_PER_SACK && !nextAt) nextAt = now + batchMs;
  while (nextAt && now >= nextAt && wheat >= C.MILL_WHEAT_PER_SACK) {
    wheat -= C.MILL_WHEAT_PER_SACK; sacks++;
    nextAt = wheat >= C.MILL_WHEAT_PER_SACK ? nextAt + batchMs : 0;
  }
  if (wheat < C.MILL_WHEAT_PER_SACK) nextAt = 0;
  return { wheat, nextAt, sacks };
}

// Production continue d'une sucrerie (chantier canne à sucre) : miroir EXACT
// de millTick ci-dessus (même formule de batch/rattrapage), MAIS avec une
// différence assumée et cohérente avec le personnage : contrairement au
// moulin (purement mécanique, personne ne l'actionne), la sucrerie a besoin
// du savoir-faire de Jérôme Martial (résident à skill "sugarworker") pour
// tourner — `working` (calculé par l'appelant via E.residentHasSkill(station,
// "sugarworker"), voir FermeGame.js) doit être vrai, sinon la fonction ne fait
// AVANCER ni consommer ni produire (la canne déposée reste intacte en
// attendant qu'il soit recruté, jamais perdue). Une fois `working` vrai, la
// mécanique de batch/rattrapage est identique à millTick.
export function sucrerieTick(ss, now, speedMult = 1, working = true) {
  let cane = (ss && ss.cane) || 0;
  let nextAt = (ss && ss.nextAt) || 0;
  let sacks = 0;
  if (!working) return { cane, nextAt, sacks }; // en attente de Jérôme Martial : rien ne bouge
  const mult = Math.max(C.SUCRERIE_SPEED_MIN_MULT, speedMult || 1);
  const batchMs = C.SUCRERIE_BATCH_MS / mult;
  if (cane >= C.SUCRERIE_CANE_PER_SACK && !nextAt) nextAt = now + batchMs;
  while (nextAt && now >= nextAt && cane >= C.SUCRERIE_CANE_PER_SACK) {
    cane -= C.SUCRERIE_CANE_PER_SACK; sacks += C.SUCRERIE_SACKS_PER_BATCH; // zip 327 : 1 canne -> 2 sacs
    nextAt = cane >= C.SUCRERIE_CANE_PER_SACK ? nextAt + batchMs : 0;
  }
  if (cane < C.SUCRERIE_CANE_PER_SACK) nextAt = 0;
  return { cane, nextAt, sacks };
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

// Zip 281 (bijouterie) : l'or ne se trouve QUE près de la rivière — vrai
// pour la carte (déterministe par seed), contrairement à `world` qui n'est
// pas dispo ici (cette fonction est appelée depuis resolveAct, qui l'a).
function nearRiver(world, x, y, radius) {
  for (let yy = y - radius; yy <= y + radius; yy++) {
    for (let xx = x - radius; xx <= x + radius; xx++) {
      if (inMap(xx, yy) && world.ground[idx(xx, yy)] === C.G_WATER) return true;
    }
  }
  return false;
}
// Zip 283 : chance de trouver de l'or à CETTE case (déjà su près de la
// rivière, voir appel dans resolveAct) — montée aux extrémités nord/sud de
// la carte (bande GOLD_EXTREME_BAND depuis y=0 ou y=MAP_H-1), 5% ailleurs.
function goldChanceAt(y) {
  if (y <= C.GOLD_EXTREME_BAND || y >= C.MAP_H - 1 - C.GOLD_EXTREME_BAND) return C.GOLD_EXTREME_CHANCE;
  return C.GOLD_DROP_CHANCE;
}

// Position/état affiché d'un animal (zip 152, refonte zip 255) : dérivé
// PUREMENT de son ancrage (`hx`/`hy`, seule valeur synchronisée), de son
// `type` et de l'horodatage, comme cropGrowState/gameTimeMin. Chaque client
// calcule exactement la même chose sans le moindre message réseau
// supplémentaire (demande explicite Guillaume : rester 100% local, zéro
// trafic, contrairement aux loups/lapins simulés côté hôte). Un animal en
// cours de transport (`carriedBy`) n'a pas de position propre : l'appelant
// doit alors utiliser la position du fermier qui le porte.
//
// Comportement (zip 255, demande Guillaume : "faire bouger les animaux de
// manière cohérente et légèrement plus détaillée, animer les pattes, changer
// de direction, s'arrêter") : cycle long par animal, alternant une longue
// phase "broute" (arrêté sur place, la majorité du cycle — calme, réaliste)
// et une courte phase "marche" vers un point voisin fixe puis, au cycle
// suivant, le retour vers l'ancrage — un vrai aller-retour cohérent plutôt
// qu'un tremblement aléatoire. `dir` (1=droite, 2=gauche, pour le miroir du
// sprite) et `frame` (0..3, cycle de pattes façon loup) sont dérivés du même
// calcul, toujours en phase.
export function animalPos(an, now) {
  if (!an) return { x: 0, y: 0, dir: 1, frame: 0, state: "stop" };
  if (an.carriedBy) return { x: an.hx, y: an.hy, dir: 1, frame: 0, state: "stop" };
  const seed = Math.abs(Math.round(an.hx * 97 + an.hy * 131 + an.type * 17)) % 1000;
  const cycleMs = C.ANIMAL_CYCLE_MS + (seed % 7) * 900;   // variété de rythme par animal
  const walkMs = Math.min(cycleMs - 500, C.ANIMAL_WALK_MS + (seed % 5) * 250);
  const t = now + seed * 37; // déphasage par animal (même horloge globale)
  const cycleIdx = Math.floor(t / cycleMs);
  const phase = t - cycleIdx * cycleMs;
  // Point voisin fixe (angle figé par seed, façon "aiguille d'or" pour une
  // bonne répartition visuelle), toujours dans le petit rayon d'origine.
  const angle = (seed * 2.399963) % (Math.PI * 2);
  const amp = C.ANIMAL_WANDER_RADIUS;
  const ox = Math.cos(angle) * amp, oy = Math.sin(angle) * amp * 0.6;
  const fromAnchor = (cycleIdx % 2 === 0); // alterne : ancrage->point, puis point->ancrage
  const startX = fromAnchor ? an.hx : an.hx + ox, startY = fromAnchor ? an.hy : an.hy + oy;
  const endX = fromAnchor ? an.hx + ox : an.hx, endY = fromAnchor ? an.hy + oy : an.hy;
  const facingRight = endX >= startX;
  const dir = facingRight ? 1 : 2;
  if (phase < cycleMs - walkMs) {
    // Broute : immobile au point de départ de la prochaine marche, déjà
    // orienté vers celle-ci (pas de demi-tour brusque au démarrage).
    // Zip 369 (demande Guillaume : "il faut qu'elles broutent ou picorent
    // quand elles sont à l'arrêt") : cette phase, déjà nommée "broute" depuis
    // le zip 152, ANIME enfin la tête. La frame est tirée de C.ANIMAL_GRAZE
    // (frames 4 à 7 = tête basse, voir animalSprite) sur l'horloge `t`, qui
    // porte DÉJÀ le déphasage par animal (seed * 37) — deux bêtes voisines ne
    // picorent donc pas dans la même frame, et les deux joueurs voient la même
    // chose sans qu'un seul message réseau soit émis.
    const gz = C.ANIMAL_GRAZE[an.type] || C.ANIMAL_GRAZE[0];
    const slot = Math.floor((t % gz.cycleMs) / (gz.cycleMs / gz.seq.length)) % gz.seq.length;
    return { x: startX, y: startY, dir, frame: gz.seq[slot], state: "stop" };
  }
  const tw = (phase - (cycleMs - walkMs)) / walkMs; // 0..1 sur la phase de marche
  const ease = tw < 0.5 ? 2 * tw * tw : 1 - Math.pow(-2 * tw + 2, 2) / 2; // smoothstep
  const x = startX + (endX - startX) * ease;
  const y = startY + (endY - startY) * ease;
  const frame = Math.floor(t / C.ANIMAL_WALK_FRAME_MS) % 4;
  return { x, y, dir, frame, state: "walk" };
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
    // Zip 369 : robe (cosmétique). Tirée au hasard À L'ACHAT et persistée avec
    // la bête (voir s.animals.push). Pour les animaux d'AVANT ce zip, le champ
    // manque : on le dérive de l'ancrage persisté hx/hy plutôt que de le
    // retirer au hasard ici. Deux raisons — la robe doit être STABLE d'une
    // session à l'autre (sinon la même vache change de robe à chaque
    // chargement), et elle doit être IDENTIQUE sur les deux écrans, or
    // normalizeAnimals tourne aussi bien chez l'hôte que chez l'invité.
    if (typeof a.skin !== "number") {
      const ns = (C.ANIMAL_SKINS[a.type] || [0]).length;
      a.skin = ns > 1 ? (Math.abs(Math.round(a.hx * 31 + a.hy * 17 + a.type * 7)) % ns) : 0;
    }
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
      // Zip 372 : BONBONS, ramassés pendant le défi de fuite du monde sombre.
      // Ressource PAR JOUEUR (pas commune) : le défi est individuel, personne
      // ne court à deux, et une réserve commune inviterait à se disputer le
      // fruit d'une course qu'un seul a faite. Aucun usage pour l'instant,
      // c'est un compteur — la dépense viendra dans un chantier dédié.
      // Aucune migration Supabase : le fermier est persisté en instantané JSON.
      candies: 0,
      // Meilleur score au défi de fuite. Ce n'est PAS un objet d'inventaire, et
      // le ranger ici est assumé : `inv` est le seul bloc du fermier qui voyage
      // déjà en entier vers son propriétaire (setMyInv, payload `farmer`).
      // L'y poser évite quatre points de plomberie supplémentaires pour un
      // simple compteur, sans rien coûter au réseau — `inv` était déjà envoyé.
      runBest: 0,
      seeds: [5, 0, 0, 0], crops: [0, 0, 0, 0],
      gems: C.GEMS.map(() => 0),      // gemmes rares trouvées au minage
      fish: C.FISH.map(() => 0),      // poissons pêchés
      seaCreatures: C.SEA_CREATURES.map(() => 0), // rare sea creatures (2026-07 station update), sell-only
      products: C.ANIMALS.map(() => 0), // productions d'élevage ramassées
      decor: {}, // zip 251: décorations reçues en cadeau, déployables via l'outil main (id -> quantité)
    },
    quests: {}, // id de quête -> true quand accomplie
    pets: [],   // zip 236/368 : pets INDIVIDUELS, {id, at, out}. Sac plafonné à C.MAX_PETS, balade à C.MAX_PETS_WALKING (`out`). Voir resolveCatchPet/resolveReleasePet/resolveSetPetWalking.
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
  if (typeof f.inv.candies !== "number") f.inv.candies = 0; // zip 372 : défi de fuite
  if (typeof f.inv.runBest !== "number") f.inv.runBest = 0; // zip 372 : meilleur score au défi
  /* Zip 385 — LE GOURMANDIN. Trois champs, tous dans f.inv, donc dans
     l'instantané JSON du fermier : AUCUNE migration Supabase.
       candyLevel     = plus haut niveau terminé (0..CANDY_GAME_LEVELS) ;
       candyGoldBlock = numéro de créneau de rotation où l'or a été pris
                        (-1 = jamais) — c'est lui qui rend le trésor rejouable
                        « une fois par venue » sans le rendre farmable ;
       candyCatDone   = le chat berlingot a été remis (définitif). */
  /* Zip 393 — LE LABYRINTHE. Deux champs, tous deux dans f.inv, donc dans
     l'instantané JSON du fermier : AUCUNE migration Supabase.
       labBest      = meilleur score au labyrinthe ;
       labGoldBlock = numéro de créneau de rotation où la prime de sortie a
                      été prise (-1 = jamais). Même mécanique que
                      candyGoldBlock : « une fois par VENUE » et non « par
                      visite », parce qu'une visite se répète en ressortant et
                      en rentrant par le passage, ce qui ferait de la prime un
                      bouton à or infini. Le créneau, lui, est strictement
                      croissant (passageBlockOf) : il ne peut pas être rejoué. */
  if (typeof f.inv.labBest !== "number") f.inv.labBest = 0;
  if (typeof f.inv.labGoldBlock !== "number") f.inv.labGoldBlock = -1;
  if (typeof f.inv.candyLevel !== "number") f.inv.candyLevel = 0;
  // Zip 411 : la descente. `lugeBlock` = créneau où la prime d'arrivée a déjà
  // été touchée ; `lugeBest` = meilleur temps, en ms (0 = jamais fini).
  if (typeof f.inv.lugeRuns !== "number") f.inv.lugeRuns = 0;
  if (typeof f.inv.lugeBest !== "number") f.inv.lugeBest = 0;
  if (typeof f.inv.candyGoldBlock !== "number") f.inv.candyGoldBlock = -1;
  if (typeof f.inv.candyCatDone !== "boolean") f.inv.candyCatDone = false;
  if (typeof f.inv.food !== "number") f.inv.food = 0;
  if (typeof f.inv.fence !== "number") f.inv.fence = 0;
  if (typeof f.inv.wall !== "number") f.inv.wall = 0;
  if (typeof f.inv.path !== "number") f.inv.path = 0;
  if (typeof f.inv.lamp !== "number") f.inv.lamp = 0;
  if (typeof f.inv.scarecrow !== "number") f.inv.scarecrow = 0;
  if (typeof f.inv.grass !== "number") f.inv.grass = 0;
  if (typeof f.inv.mill !== "number") f.inv.mill = 0;
  if (typeof f.inv.berries !== "number") f.inv.berries = 0;
  if (typeof f.inv.fruit !== "number") f.inv.fruit = 0;
  if (typeof f.inv.healKit !== "number") f.inv.healKit = 0;
  if (typeof f.inv.salve !== "number") f.inv.salve = 0;
  f.inv.seeds = padArray(f.inv.seeds, C.CROPS.length);
  f.inv.crops = padArray(f.inv.crops, C.CROPS.length);
  f.inv.gems = padArray(f.inv.gems, C.GEMS.length);
  f.inv.fish = padArray(f.inv.fish, C.FISH.length);
  f.inv.seaCreatures = padArray(f.inv.seaCreatures, C.SEA_CREATURES.length); // 2026-07 station update
  if (typeof f.seaStreak !== "number") f.seaStreak = 0; // consecutive casts, host-side rarity gate
  f.inv.products = padArray(f.inv.products, C.ANIMALS.length);
  /* ⚠️⚠️ ZIP 398 — `f.inv.products` EST DÉJÀ PRIS, ET C'EST UN TABLEAU.
     Il contient les produits ANIMAUX, indexés par type (œuf, lait, laine…),
     et la ligne ci-dessus le repasse par `padArray` à chaque normalisation.
     La première écriture du 398 y rangeait aussi les confitures, sous des clés
     de texte : `padArray` les effaçait toutes à la première normalisation —
     c'est-à-dire au premier rechargement. On aurait fabriqué des confitures
     qui disparaissent en rechargeant la page.
     C'est la MÊME faute que O_SUCRERIE / O_BERRY_BUSH, un étage plus haut :
     deux choses différentes sous un même nom. D'où `fruitProducts`, distinct.

     Les trois champs neufs sont des OBJETS (id → nombre) et non des tableaux :
     ajouter un fruit ou une recette un jour ne doit décaler aucun indice. */
  if (!f.inv.saplings || typeof f.inv.saplings !== "object" || Array.isArray(f.inv.saplings)) f.inv.saplings = {};
  if (!f.inv.fruits || typeof f.inv.fruits !== "object" || Array.isArray(f.inv.fruits)) f.inv.fruits = {};
  if (!f.inv.fruitProducts || typeof f.inv.fruitProducts !== "object" || Array.isArray(f.inv.fruitProducts)) f.inv.fruitProducts = {};
  // Zip 251: sac de décorations (id -> quantité), nettoyé aux ids connus.
  { const d = (f.inv.decor && typeof f.inv.decor === "object") ? f.inv.decor : {};
    const clean = {};
    for (const dd of C.UNIQUE_DECORATIONS) { const n = d[dd.id] | 0; if (n > 0) clean[dd.id] = n; }
    f.inv.decor = clean; }
  // Zip 388 : familier PROPOSÉ par un visiteur et pas encore accepté. Vit dans
  // l'instantané JSON déjà persisté, donc aucune migration ; une ferme d'avant
  // ce zip se recharge sans le champ, ce qui veut exactement dire « aucune
  // offre en cours ». On le nettoie s'il désigne un familier inconnu — sinon
  // un catalogue réduit un jour laisserait une offre inacceptable coincée dans
  // le sac, et le joueur ne pourrait plus jamais en recevoir d'autre.
  if (f.inv.petOffer && !C.PET_CATALOG[f.inv.petOffer]) delete f.inv.petOffer;
  f.quests = f.quests || {};
  // Zip 236: individual pets. Keep only well-formed known pets; cap at MAX_PETS.
  // (Le .filter conserve les OBJETS d'origine, donc le drapeau `out` du zip
  // 368 traverse cette normalisation sans être recréé.)
  f.pets = (Array.isArray(f.pets) ? f.pets : [])
    .filter(p => p && typeof p.id === "string" && C.PET_CATALOG[p.id])
    .slice(0, C.MAX_PETS);
  // Zip 368 : `out` = ce familier est-il EN BALADE (dessiné et diffusé) ou
  // seulement rangé dans le sac ? Deux cas à couvrir ici :
  //   - sauvegarde d'AVANT le zip 368 : le champ n'existe pas. Les familiers
  //     suivaient tous le joueur, donc on les sort tous — dans la limite de
  //     MAX_PETS_WALKING, ce qui ne coupe personne puisque le plafond
  //     précédent du sac était justement 4 ;
  //   - sauvegarde d'après : on respecte `out`, mais on RE-PLAFONNE quand
  //     même. C'est le seul garde-fou contre un sac trafiqué ou une baisse
  //     future de MAX_PETS_WALKING qui laisserait 6 familiers dehors.
  // Le surplus est rangé (out = false), jamais supprimé.
  { let outN = 0;
    for (const p of f.pets) {
      const wants = (p.out === undefined) ? true : !!p.out;
      p.out = wants && outN < C.MAX_PETS_WALKING;
      if (p.out) outN++;
    } }
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

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 426 — LA COUPE À VALLEY TOWN, CÔTÉ HÔTE.
   ───────────────────────────────────────────────────────────────────────────
   Voir la longue note de TOWN_TREE_REGROW_MS : la carte de la ville est un
   singleton de module et ne doit JAMAIS être mutée. Ces deux fonctions ne
   touchent donc qu'au dictionnaire `chop` de l'état partagé.

   ⚠️ ELLES SONT PURES AU SENS DU PROJET : elles mutent ce qu'on leur passe et
   ne lisent aucune horloge implicite (`now` est un paramètre). C'est ce qui
   permet au banc de les rejouer et à l'hôte de les appeler dans son tick.
   ═══════════════════════════════════════════════════════════════════════════ */
// Un arbre est-il debout sur cette case ? Prend en compte la coupe en cours.
export function townTreeStanding(tw, chop, i) {
  if (!tw) return false;
  const o = tw.objects[i];
  if (o !== C.O_TREE && o !== C.O_TREE2) return false;
  const e = chop && chop[i];
  return !(e && e.r);   // `r` = abattu, en repousse
}
export function resolveTownChop(chop, tw, f, i, now) {
  const res = { changed: false, wood: 0, felled: false, toast: null };
  if (!tw || !chop) return res;
  if (!townTreeStanding(tw, chop, i)) return res;
  normalizeFarmer(f);
  /* ⚠️ MÊME COÛT, MÊME OUTIL, MÊME RENDEMENT QU'À LA FERME. C'est la seule
     façon de ne pas créer un second équilibrage : un joueur qui découvre qu'on
     coupe plus vite en ville se met à faire l'aller-retour en train, et le
     déséquilibre ne vient d'aucune ligne en particulier. */
  if (!useEnergy(f, "chop", "axe")) { res.toast = "tired"; return res; }
  const prev = chop[i];
  const hp = ((prev && prev.hp) || C.TREE_HP) - f.tools.axe;
  res.changed = true;
  if (hp <= 0) {
    chop[i] = { r: now + C.TOWN_TREE_REGROW_MS };
    res.wood = toolYield(C.TREE_WOOD, f.tools.axe);
    f.inv.wood += res.wood;
    res.felled = true;
  } else chop[i] = { hp };
  return res;
}
/* LA REPOUSSE. Appelée par le tick de l'hôte ; renvoie les cases redevenues des
   arbres, pour que l'appelant sache s'il a quelque chose à diffuser.
   ⚠️ ON SUPPRIME L'ENTRÉE plutôt que d'écrire « arbre à nouveau debout » : un
   dictionnaire qui ne garde que les EXCEPTIONS reste petit quoi qu'il arrive,
   et il se persiste sans jamais gonfler la sauvegarde. */
export function townTreeRegrow(chop, now) {
  const back = [];
  if (!chop) return back;
  for (const k of Object.keys(chop)) {
    const e = chop[k];
    if (e && e.r && now >= e.r) { delete chop[k]; back.push(+k); }
  }
  return back;
}

/* -------------------------------------------------------------------------
   Résolution d'une action sur le monde (hôte). MUTE world + farmer et renvoie
   les effets à diffuser : { tiles:[{i,g,o}], cropTiles:[i], fx:[...],
   invChanged, toast }. Le composant lit ensuite world pour construire les
   messages tile/crop et met à jour ses overrides de persistance.
   ------------------------------------------------------------------------- */
export function resolveAct(world, f, m) {
  normalizeFarmer(f);
  // sucrerieTiles retiré (chantier "sucrerie déplaçable") : voir commentaire
  // au cas "sucrerieDeposit" plus bas (déménagé hors de resolveAct).
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
      if ((g === C.G_TILLED || g === C.G_WATERED) && st >= 0 && st < C.CROPS.length && f.inv.seeds[st] > 0) {
        const existing = world.crops.get(i);
        if (!existing) {
          f.inv.seeds[st]--;
          world.crops.set(i, { t: st, n: 1, bankedMs: 0, wateredAt: null });
          res.cropTiles.push(i); res.invChanged = true;
        } else if (existing.t === st && (existing.n || 1) < C.MAX_CROPS_PER_TILE) {
          // Zip 287 : compléter une case déjà plantée (même graine, pas
          // encore mûre — sinon le clic déclenche la récolte avant d'arriver
          // ici, voir doAction/FermeGame.js) au lieu d'exiger une case vide.
          f.inv.seeds[st]--;
          existing.n = (existing.n || 1) + 1;
          res.cropTiles.push(i); res.invChanged = true;
        } else if (existing.t !== st) {
          res.toast = "cropWrongType";
        } else {
          res.toast = "cropMaxed";
        }
      }
      break;
    }
    case "harvest": {
      const c = world.crops.get(i);
      if (c && cropGrowState(c, now).mature) {
        const n = c.n || 1;
        world.crops.delete(i); world.ground[i] = C.G_TILLED;
        f.inv.crops[c.t] += n;
        res.cropTiles.push(i); res.tiles.push(i); res.fx.push({ k: "harvest", x, y, crop: c.t, n }); res.invChanged = true;
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
          // Zip 280/281 (bijouterie) : or, tirage INDÉPENDANT de la gemme
          // ci-dessus (un même rocher peut donc donner les deux, l'un des
          // deux, ou ni l'un ni l'autre) — MAIS uniquement près de la
          // rivière (demande Guillaume), peu importe la distance à la
          // maison. Va aussi au pool commun (gregStock.gold), signalé ici
          // pour incrément côté hôte.
          if (nearRiver(world, x, y, C.GOLD_RIVER_RADIUS) && Math.random() < goldChanceAt(y)) {
            res.goldFound = (res.goldFound || 0) + C.GOLD_PER_FIND;
            res.fx.push({ k: "gold", x, y });
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
      } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
        // Chantier "chemin sur tuile labourée" (2026-07, demande utilisateur) :
        // le chemin dallé acceptait seulement l'herbe (G_GRASS) ; il rejoint
        // désormais le mur/lampadaire (même liste de sols autorisés) pour
        // pouvoir aussi être posé sur une tuile labourée (G_TILLED) ou
        // arrosée (G_WATERED) tant qu'aucune culture n'y pousse. Le retrait
        // (branche G_PATH_STONE ci-dessus) continue de rendre G_GRASS dans
        // tous les cas — un labour existant sous un chemin posé n'est donc
        // pas restauré au retrait, comme c'était déjà le cas pour l'herbe.
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
      /* ⚠️⚠️ ZIP 402 — TROIS ÉCHECS SILENCIEUX, ET C'EST LE BUG DE GUILLAUME.
         ---------------------------------------------------------------------
         Retour : « vérifie la posabilité des moulins. il y a une ferme où
         c'est buggé. j'en pose ils disparaissent aussitôt. Et après on me dit
         que le nombre max est atteint. »

         Le moteur a été INTERROGÉ plutôt que relu, et il a répondu trois fois :

         1. **LE DEUXIÈME CLIC REPRENAIT LE MOULIN, SANS UN MOT.** Poser et
            retirer sont le MÊME geste sur la même case (comme lampadaire et
            mur), et aucune des deux branches ne disait rien. Mesuré :
            1er clic → moulin au sol, stock 5→4 ; 2e clic → plus rien au sol,
            stock 4→5. C'est littéralement « j'en pose ils disparaissent
            aussitôt », et c'est d'autant plus facile à déclencher qu'un moulin
            en chantier est dessiné à 55 % d'opacité — on doute d'avoir réussi,
            donc on reclique.

            ⚠️ Le correctif de juillet avait déjà vu la moitié du problème
            (« rien ne rebasculait la variante après la pose ») et rebasculait
            sur « clôture » APRÈS chaque pose. Ça réglait le clic de DÉPÔT et
            ça cassait la pose EN SÉRIE : pour poser un deuxième moulin il
            fallait ressortir la variante à la main. Voir FermeGame.js.

         2. **QUINZE SOLS REFUSAIENT LE MOULIN SANS RIEN DIRE.** Pavage, sable,
            rive, ponts, jetée… La condition n'accepte que herbe, labouré et
            arrosé, et l'absence de `else` faisait sortir la fonction en
            silence. Sur une ferme dont la place libre est pavée, poser un
            moulin ne fait donc RIEN, et rien ne l'explique.

         3. **DÉPOSER DU BLÉ SANS AUCUN MOULIN CONSTRUIT sortait aussi en
            silence** (`if (!millIdx.length) break;`), et quand il y en a un
            de plein, le message est « Le moulin est plein » — ce qui se lit
            très exactement comme « le nombre maximum est atteint ».

         ⚠️ AUCUNE RÈGLE DE JEU NE CHANGE ICI. On n'ajoute ni plafond, ni
         verrou, ni délai : on rend au joueur les trois phrases qui lui
         manquaient. Un jeu qui refuse sans le dire est indiscernable d'un jeu
         cassé — et c'est bien pour un jeu cassé que Guillaume l'a pris. */
      if (o === C.O_MILL) {
        const ms = world.mills.get(i);
        if (ms && (ms.wheat || 0) > 0) { res.toast = "millNotEmpty"; break; }
        world.objects[i] = C.O_NONE; world.objHp.delete(i); world.mills.delete(i);
        f.inv.mill = (f.inv.mill || 0) + 1;
        res.tiles.push(i); res.invChanged = true;
        res.toast = "millTaken";                      // zip 402 : on le DIT
      } else if (o !== C.O_NONE) {
        res.toast = "millOccupied";                   // zip 402
      } else if (world.crops.has(i)) {
        res.toast = "millOnCrop";                     // zip 402
      } else if (!(g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED)) {
        res.toast = "millGround";                     // zip 402
      } else if ((g === C.G_GRASS || g === C.G_TILLED || g === C.G_WATERED) && o === C.O_NONE && !world.crops.has(i)) {
        if (f.inv.mill > 0) {
          f.inv.mill--;
          world.objects[i] = C.O_MILL; world.objHp.set(i, now + C.BUILD_TIMES.mill);
          world.mills.set(i, { wheat: 0, nextAt: 0 });
          // Zip 273 (demande Guillaume : "un moulin apparaîtra toujours sur
          // une case marron, quand on le pose il laboure la case en dessous
          // de lui = meilleur rendu visuel") : on force G_TILLED si la case
          // était en herbe, pour que le moulin ne semble jamais flotter sur
          // l'herbe. Sans effet si déjà labourée/arrosée (on ne casse pas un
          // arrosage existant).
          if (g === C.G_GRASS) world.ground[i] = C.G_TILLED;
          res.tiles.push(i); res.invChanged = true;
          // zip 402 : on annonce le chantier. Sans ça, un moulin à 55 %
          // d'opacité passe pour un clic raté, et on reclique — ce qui le
          // reprenait (voir le bloc ci-dessus).
          res.toast = "millPlaced";
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
      /* ⚠️ ZIP 402 — QUATRIÈME ÉCHEC SILENCIEUX, ET LE PLUS TROMPEUR.
         Ce garde-fou renvoyait sans un mot quand le moulin n'était pas encore
         CONSTRUIT. Or c'est exactement le moment où le joueur clique dessus :
         il vient de le poser, il le voit à 55 % d'opacité, il ne sait pas si
         ça a marché, et le jeu ne répond rien. On distingue donc les deux
         causes — pas un moulin / moulin en chantier — au lieu de sortir en
         silence dans les deux cas. */
      if (o !== C.O_MILL) break;
      if (!buildReady(world.objHp.get(i), now)) { res.toast = "millBuilding"; break; }
      const have = f.inv.crops[C.MILL_WHEAT_CROP] || 0;
      if (have <= 0) { res.toast = "noWheatToDeposit"; break; }
      // Zip 301b (demande Guillaume) : un clic sur UN moulin alimente TOUS les
      // moulins terminés de la ferme, en répartissant le blé équitablement
      // (round-robin, plafonné à MILL_STOCK_CAP par moulin) — ils broient alors
      // en parallèle. On scanne les tuiles O_MILL prêtes (peu nombreuses).
      const millIdx = [];
      for (let k = 0; k < world.objects.length; k++) {
        if (world.objects[k] === C.O_MILL && buildReady(world.objHp.get(k), now)) millIdx.push(k);
      }
      // zip 402 : ce `break` était muet. « On a pourtant cliqué un moulin
      // prêt » n'est vrai que si le chantier est fini : un moulin encore en
      // construction n'entre pas dans millIdx, et le joueur n'apprenait rien.
      if (!millIdx.length) { res.toast = "noMillBuilt"; break; }
      let totalRoom = 0;
      for (const k of millIdx) totalRoom += Math.max(0, C.MILL_STOCK_CAP - ((world.mills.get(k) || {}).wheat || 0));
      if (totalRoom <= 0) { res.toast = "millFull"; break; }
      let toDeposit = Math.min(have, totalRoom);
      f.inv.crops[C.MILL_WHEAT_CROP] -= toDeposit;
      // Répartition 1 par 1 en tournant sur les moulins non pleins.
      let remaining = toDeposit, ri = 0, guard = 0;
      const guardMax = toDeposit + millIdx.length + 4;
      while (remaining > 0 && guard++ < guardMax * 4) {
        const k = millIdx[ri % millIdx.length]; ri++;
        const ms = world.mills.get(k) || { wheat: 0, nextAt: 0 };
        if ((ms.wheat || 0) < C.MILL_STOCK_CAP) {
          ms.wheat = (ms.wheat || 0) + 1; world.mills.set(k, ms);
          if (!res.millTiles.includes(k)) res.millTiles.push(k);
          remaining--;
        }
      }
      res.invChanged = true;
      res.fx.push({ k: "millDeposit", x, y, n: toDeposit });
      break;
    }
    // Chantier "sucrerie déplaçable" (2026-07) : le cas "sucrerieDeposit" a
    // déménagé hors de resolveAct (voir hostHandleDecorReq, FermeGame.js) —
    // la sucrerie n'est plus une tuile world.objects scannable par tile mais
    // un bâtiment unique dans s.crafts.sucrerie (comme la ruche/fromagerie/
    // etc.), et resolveAct n'a accès qu'à `world`, pas à l'état partagé où
    // vit désormais son stock de canne. Toujours le même dépôt côté joueur
    // (mêmes toasts noCaneToDeposit/sucrerieFull, même fx sucrerieDeposit),
    // juste résolu là où crafts.sucrerie est atteignable.
    case "fish":
      // Pêche : la case ciblée doit être de l'eau (rivière) et à portée. Le
      // TYPE de poisson est décidé par le minijeu côté client (m.fish) : on
      // ajoute exactement ce poisson (repli sur un tirage si absent/invalide).
      if (g === C.G_WATER) {
        if (!useEnergy(f, "fish", null)) { res.toast = "tired"; return res; }
        // 2026-07 station update, rare sea creatures. The client minigame
        // CLAIMS a rare catch (m.sea = species index) but the host is the
        // judge: the claim is only honored if this cast was actually
        // eligible (enough consecutive casts, f.seaStreak, OR the tile is
        // in the extreme north/south stretch of the river). An ineligible
        // claim silently downgrades to a normal fish, so a tampered client
        // gains nothing.
        const extreme = seaExtremeRow(y);
        if (typeof m.sea === "number" && m.sea >= 0 && m.sea < C.SEA_CREATURES.length
            && ((f.seaStreak | 0) >= C.SEA_MIN_STREAK || extreme)) {
          f.inv.seaCreatures[m.sea] = (f.inv.seaCreatures[m.sea] || 0) + 1;
          f.seaStreak = 0; // rarity streak resets on a rare catch
          res.fx.push({ k: "sea", x, y, sea: m.sea });
        } else {
          let ft = m.fish | 0;
          if (!(ft >= 0 && ft < C.FISH.length)) ft = weightedPick(C.FISH);
          f.inv.fish[ft] = (f.inv.fish[ft] || 0) + 1;
          f.seaStreak = (f.seaStreak | 0) + 1;
          res.fx.push({ k: "fish", x, y, fish: ft });
        }
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

// Zip 247 : première tuile "à défricher" d'un TYPE donné autour de `anchor`
// (balayage par anneaux croissants, même principe que findClearableTiles
// ci-dessus, mais filtré par type). Utilisé par la simulation des résidents
// (visiteurs ayant emménagé) : un bûcheron cherche un arbre, un tailleur de
// pierre un rocher. Renvoie -1 si rien n'est trouvé dans le rayon.
export function findResidentTile(world, anchor, kind) {
  for (let r = 0; r < C.GREG_CLEAR_RADIUS; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // seulement l'anneau
        const x = anchor.x + dx, y = anchor.y + dy;
        if (!inMap(x, y)) continue;
        const i = idx(x, y);
        const o = world.objects[i];
        const hit = kind === "rock"
          ? o === C.O_ROCK
          : (o === C.O_TREE || o === C.O_TREE2 || o === C.O_STUMP);
        if (hit) return i;
      }
    }
  }
  return -1;
}

// Abattage d'une case par Greg (identique à resolveAct "chop", sans énergie
// ni outil de joueur). `done` ne devient vrai que quand la case est
// entièrement dégagée (arbre -> souche -> rien) : l'appelant garde la même
// tâche en tête de file tant que `done` est faux.
export function gregChop(world, i, mult = 1) {
  const o = world.objects[i];
  if (o !== C.O_TREE && o !== C.O_TREE2 && o !== C.O_STUMP) return { done: true, wood: 0 };
  // Chantier 3 (feuille de route) : SuperGreg multiplie les dégâts par coup
  // pour que "10x plus rapide" se traduise aussi sur chop/mine (sinon Greg
  // irait 10x plus vite d'arbre en arbre sans les abattre plus vite).
  const hp = (world.objHp.get(i) || 1) - C.GREG_AXE_LVL * mult;
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
export function gregMine(world, i, mult = 1) {
  const o = world.objects[i];
  if (o !== C.O_ROCK) return { done: true, stone: 0 };
  const hp = (world.objHp.get(i) || 1) - C.GREG_PICK_LVL * mult;
  let stone = 0, done = false;
  if (hp <= 0) {
    world.objects[i] = C.O_NONE; world.objHp.delete(i);
    stone = toolYield(C.ROCK_STONE, C.GREG_PICK_LVL);
    done = true;
  } else world.objHp.set(i, hp);
  return { done, stone };
}

// Chantier "Super Tristan" (2026-07, effet café comique) : sélectionne
// environ la MOITIÉ (C.SUPERTRISTAN_CLEAR_FRACTION) des arbres/cailloux de
// TOUTE la carte, hors zones protégées (rails, zone dégagée de la station,
// zone dégagée de la grange — mêmes exclusions que la repousse quotidienne,
// voir newDay). Renvoie un tableau d'index de tuiles déjà mélangé ;
// updateSuperTristan (FermeGame.js) le vide ensuite par petits paquets
// réguliers pendant la durée de l'effet, plutôt que tout d'un coup.
export function pickSuperTristanTargets(world) {
  const W = C.MAP_W, H = C.MAP_H;
  const onRails = (x) => x >= C.STATION_RAIL_X && x <= C.STATION_RAIL_X + 1;
  const inRect = (x, y, R) => x >= R.x && x < R.x + R.w && y >= R.y && y < R.y + R.h;
  const all = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (onRails(x) || inRect(x, y, C.STATION_CLEAR) || inRect(x, y, C.BARN_CLEAR)) continue;
      const i = idx(x, y);
      const o = world.objects[i];
      if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK || o === C.O_STUMP) all.push(i);
    }
  }
  // Mélange (Fisher-Yates) puis ne garde que la fraction visée.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = all[i]; all[i] = all[j]; all[j] = tmp;
  }
  return all.slice(0, Math.round(all.length * C.SUPERTRISTAN_CLEAR_FRACTION));
}

/* -------------------------------------------------------------------------
   Greg, l'employé de champs de base (chantier 2026-07). Fonctions pures de
   mutation du monde, appelées uniquement côté hôte (FermeGame.js/updateGreg
   et hostHandleReqUnsafe), sans passer par un `farmer` (Greg n'a ni énergie
   ni outils : il agit gratuitement une fois engagé).
   ------------------------------------------------------------------------- */

// Cherche jusqu'à `count` cases plantables libres (herbe G_GRASS OU déjà
// labourées G_TILLED/G_WATERED, sans objet, sans culture, hors pont/eau) en
// anneaux croissants autour de `anchor` — même principe de recherche en
// spirale que les spawns (wolfSpawnPos/rabbitSpawnPos). Correctif 2026-07
// (demande Guillaume : "Greg doit pouvoir semer sur des cases déjà
// labourées qui n'ont pas de plantes, [...] pour l'instant son comportement
// c'est de labourer une nouvelle case même quand certaines sont libres") :
// avant, seul G_GRASS était retenu, ignorant toute case déjà labourée mais
// vide (par exemple après une récolte) — Greg labourait donc une case
// fraîche à côté au lieu de replanter directement sur celle déjà prête.
// L'appelant (gregOrder, FermeGame.js) inspecte `world.ground[i]` pour
// sauter la tâche "till" si la case est déjà labourée.
export function findFreeGrassTiles(world, anchor, count) {
  // FIX 246 (demande Guillaume) : quand une commande de plantation tombe,
  // Greg doit PRIVILÉGIER les cases vides DÉJÀ LABOURÉES proches de l'ordre
  // (pas de "till" à refaire, gain de temps) avant de labourer de nouvelles
  // cases d'herbe. On collecte donc en deux catégories, en balayant par
  // anneaux (du plus proche au plus loin) : les cases déjà labourées
  // (G_TILLED/G_WATERED) d'abord — bornées à un rayon de proximité pour qu'il
  // n'aille pas traverser toute la ferme vers une case labourée isolée —,
  // puis les cases d'herbe libres pour compléter. Résultat ordonné
  // "labourées proches -> herbe la plus proche".
  const PREF_R = 16; // rayon de "proximité" pour préférer une case déjà labourée
  const tilled = [], grass = [];
  const seen = new Set();
  for (let r = 0; r < 40 && (tilled.length + grass.length) < count * 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // seulement l'anneau
        const x = anchor.x + dx, y = anchor.y + dy;
        if (!inMap(x, y)) continue;
        const i = idx(x, y);
        if (seen.has(i)) continue;
        seen.add(i);
        if (world.objects[i] !== C.O_NONE || world.crops.has(i)) continue;
        const gr = world.ground[i];
        if ((gr === C.G_TILLED || gr === C.G_WATERED) && r <= PREF_R) tilled.push(i);
        else if (gr === C.G_GRASS || gr === C.G_TILLED || gr === C.G_WATERED) grass.push(i);
      }
    }
  }
  return tilled.concat(grass).slice(0, count);
}

// Cherche jusqu'à `count` cases DÉJÀ PLANTÉES de la MÊME espèce `cropIdx`,
// pas encore pleines (n < MAX_CROPS_PER_TILE) ET PAS ENCORE MÛRES, en
// anneaux croissants autour de `anchor` — même principe de balayage que
// findFreeGrassTiles.
// Zip 288bis (demande Guillaume : "il doit semer 5 par 5 maintenant, de
// préférence sur des cases de même espèce quand il peut") : appelée EN
// PREMIER par gregOrder (FermeGame.js), avant findFreeGrassTiles, pour que
// Greg privilégie le complément de cases existantes (aucun labour requis,
// terrain déjà utilisé) plutôt que d'étendre le champ à de nouvelles cases.
// Zip 288ter (demande Guillaume : "la lisibilité doit être cohérente, on
// doit toujours connaître l'état de nos cultures") : une case déjà MÛRE
// est exclue — une fois "prête à récolter" (bulle flottante, voir
// FermeGame.js), l'état d'une case doit rester figé et lisible tel quel
// jusqu'à la récolte du joueur ; Greg qui continuerait d'y ajouter des
// graines en douce changerait silencieusement le rendu (n) d'une case déjà
// annoncée comme "terminée", ce qui casserait cette lisibilité.
export function findGregToppableTiles(world, anchor, cropIdx, count, now) {
  const PREF_R = 16; // même rayon de proximité que le préférentiel "labourée" ci-dessous
  const out = [];
  const seen = new Set();
  for (let r = 0; r <= PREF_R && out.length < count; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = anchor.x + dx, y = anchor.y + dy;
        if (!inMap(x, y)) continue;
        const i = idx(x, y);
        if (seen.has(i)) continue;
        seen.add(i);
        const c = world.crops.get(i);
        if (c && c.t === cropIdx && (c.n || 1) < C.MAX_CROPS_PER_TILE && !cropGrowState(c, now).mature) out.push(i);
      }
    }
  }
  return out.slice(0, count);
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
// Zip 288bis (demande Guillaume, suite à l'affichage "n/5" du zip 288 :
// "Greg doit semer 5 par 5 maintenant") : Greg complète maintenant une case
// déjà plantée de la MÊME espèce jusqu'à MAX_CROPS_PER_TILE au lieu de
// n'agir que sur une case vide (auparavant n:1 systématique, voir
// findFreeGrassTiles qui écartait toute case déjà en culture) — même règle
// de complétion que le joueur (resolveAct cas "plant").
export function gregPlant(world, i, cropIdx, now) {
  const g = world.ground[i];
  if (g !== C.G_TILLED && g !== C.G_WATERED) return false;
  const existing = world.crops.get(i);
  if (!existing) {
    world.crops.set(i, { t: cropIdx, n: 1, bankedMs: 0, wateredAt: null }); return true;
  }
  // Zip 288ter : re-vérifié ici (pas seulement à la sélection dans
  // findGregToppableTiles) car Greg met du temps à marcher jusqu'à la case —
  // elle a pu mûrir entre-temps. Une case mûre ne doit plus changer tant
  // qu'elle n'a pas été récoltée (lisibilité pour le joueur).
  if (existing.t === cropIdx && (existing.n || 1) < C.MAX_CROPS_PER_TILE && !cropGrowState(existing, now).mature) {
    existing.n = (existing.n || 1) + 1; return true;
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
  // FIX 246 (demande Guillaume : "Soan a parfois du mal à trouver la rivière").
  // Avant, on n'acceptait QUE des cases de sable (G_SAND) libres : sur une
  // rive sans liseré de sable (herbe/terre au ras de l'eau), la recherche
  // renvoyait null et Soan restait planté. On accepte désormais TOUTE case
  // praticable (non-eau, sans objet) qui BORDE l'eau (4-voisinage) — le sable
  // reste préféré quand il existe. Balayage par anneaux (du plus proche au
  // plus loin) autour de l'ancre (désormais la position du joueur à l'ordre,
  // voir soanOrder).
  const isWater = (x, y) => inMap(x, y) && world.ground[idx(x, y)] === C.G_WATER;
  const walkable = (x, y) => inMap(x, y) && world.ground[idx(x, y)] !== C.G_WATER && world.objects[idx(x, y)] === C.O_NONE;
  let fallback = null;
  const seen = new Set();
  for (let r = 0; r < C.SOAN_RIVER_SEARCH_RADIUS; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // seulement l'anneau
        const x = anchor.x + dx, y = anchor.y + dy;
        const i = inMap(x, y) ? idx(x, y) : -1;
        if (i < 0 || seen.has(i)) continue;
        seen.add(i);
        if (!walkable(x, y)) continue;
        if (!(isWater(x + 1, y) || isWater(x - 1, y) || isWater(x, y + 1) || isWater(x, y - 1))) continue;
        if (world.ground[i] === C.G_SAND) return i; // berge de sable = idéale, prioritaire
        if (fallback == null) fallback = i;          // sinon 1re terre praticable bordant l'eau
      }
    }
  }
  return fallback; // sable si trouvé dans le rayon, sinon toute berge praticable, sinon null
}

// Une prise de Soan une fois posté à la rivière : tirage pondéré identique
// au joueur (voir resolveAct cas "fish", fallback `weightedPick(C.FISH)`
// quand aucun minijeu ne tranche — Soan n'en a pas). Renvoie l'index dans
// C.FISH.
export function soanCatchFish(rnd) {
  return weightedPick(C.FISH, rnd);
}

/* -------------------------------------------------------------------------
   Missions d'équipe : SUPPRIMÉES au zip 368 (demande Guillaume).
   Vivaient ici pickCoopMission() (tirage d'un chantier parmi C.COOP_MISSIONS)
   et resolveCoopDeposit() (dépôt bois/pierre à C.COOP_SITE par la touche E).
   Voir le commentaire de suppression dans fermeConstants.js pour la liste
   complète de ce qui est parti avec elles.
   ATTENTION : resolveBarnDeposit (plus bas) — la GRANGE collaborative, qui
   reste — réutilise le toast "coopNothing" (« tu n'as pas la ressource
   attendue sur toi »). Cette chaîne doit donc survivre dans fermeStrings.js
   malgré son nom, exactement comme woodLabel/stoneLabel.
   ------------------------------------------------------------------------- */

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
// `brewingUntil` (chantier 2026-07, demande Guillaume : "menu déposer/prêt/
// allumer" + minuterie de concoction + retrait dédié) : 0 tant qu'aucune
// concoction n'est en cours ; sinon horodatage de fin de concoction, MÊME
// PRINCIPE que world.objHp/buildReady (aucun message réseau supplémentaire
// nécessaire pour faire avancer la minuterie, les clients comparent
// simplement à Date.now()). Remis à 0 par resolveSalveCollect une fois le
// produit récupéré.
export function newSalveCraftState() { return { trout: 0, pike: 0, cauldronUnlocked: false, brewingUntil: 0 }; }

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
    if ((salveCraft.trout || 0) > 0 || (salveCraft.pike || 0) > 0 || salveCraft.brewingUntil > 0) { res.toast = "cauldronNotEmpty"; return res; }
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
  // Correctif audit 2026-07 : ne prélève que ce qui MANQUE pour la recette en
  // cours (avant : tout le poisson porté partait au chaudron, surplus compris,
  // sans retrait possible — perte sèche pour un pêcheur trop chargé, et le
  // surplus bloquait en plus le déplacement du chaudron via cauldronNotEmpty).
  const needed = Math.max(0, (C.SALVE_RECIPE[key] || 0) - (salveCraft[key] || 0));
  if (needed <= 0) { res.toast = "cauldronHasEnough"; return res; }
  const take = Math.min(have, needed);
  f.inv.fish[ft] -= take;
  salveCraft[key] = (salveCraft[key] || 0) + take;
  res.invChanged = true; res.deposited = take; res.fish = key;
  return res;
}

// Allumage/lancement de la concoction (chantier 2026-07, refonte demande
// Guillaume : "cliquer sur le chaudron en tenant la torche pour allumer le
// feu et lancer la concoction" — déclenché côté client par un clic/E sur le
// chaudron lorsque la torche est allumée ET la recette complète, voir
// tryOpenNearby/igniteCauldron, FermeGame.js). Consomme EXACTEMENT
// SALVE_RECIPE (pas tout le surplus éventuel, pour laisser une avance à la
// pommade suivante) dans le stock déposé (trout/pike) et dans la réserve
// commune de gemmes (amethyst) — MAIS ne crédite plus la pommade
// immédiatement : lance une minuterie réelle de C.SALVE_BREW_MS (1 minute),
// le produit devant ensuite être récupéré séparément (voir
// resolveSalveCollect). Refuse si une concoction est déjà en cours (pas de
// double-lancement, pas de perte d'ingrédients déjà engagés).
export function resolveSalveBrew(f, salveCraft, gems, world) {
  normalizeFarmer(f);
  const res = { invChanged: false, gemsChanged: false, toast: null, ignited: false };
  const pos = findCauldronPos(world);
  if (!pos || !buildReady(world.objHp.get(pos.i), Date.now())) { res.toast = "cauldronMissing"; return res; }
  if (!nearT(f, pos)) { res.toast = "farCauldron"; return res; }
  if (salveCraft.brewingUntil > 0) { res.toast = "cauldronBrewing"; return res; }
  const rec = C.SALVE_RECIPE;
  const haveAmethyst = (gems && gems[0]) || 0;
  const ready = (salveCraft.trout || 0) >= rec.trout && (salveCraft.pike || 0) >= rec.pike && haveAmethyst >= rec.amethyst;
  if (!ready) { res.toast = "cauldronMissing"; return res; }
  salveCraft.trout -= rec.trout; salveCraft.pike -= rec.pike;
  gems[0] -= rec.amethyst; res.gemsChanged = true;
  salveCraft.brewingUntil = Date.now() + C.SALVE_BREW_MS;
  res.ignited = true;
  return res;
}

// Retrait du produit fini (touche E au chaudron une fois la minuterie
// écoulée, chantier 2026-07, demande Guillaume : "le produit est récupérable
// directement au chaudron et apparaîtra dans l'inventaire, il sera
// logiquement utilisable par tous les joueurs de la session") : crédite 1
// pommade dans l'inventaire PERSONNEL du fermier PRÉSENT qui vient la
// chercher — n'importe quel fermier de l'équipe peut faire ce geste, pas
// forcément celui qui avait allumé le feu (coopératif, comme le reste du
// chaudron). Remet `brewingUntil` à 0, ce qui libère le chaudron pour une
// prochaine concoction (dépôt à nouveau possible).
export function resolveSalveCollect(f, salveCraft, world) {
  normalizeFarmer(f);
  const res = { invChanged: false, toast: null, collected: false };
  const pos = findCauldronPos(world);
  if (!pos || !buildReady(world.objHp.get(pos.i), Date.now())) { res.toast = "cauldronMissing"; return res; }
  if (!nearT(f, pos)) { res.toast = "farCauldron"; return res; }
  if (!(salveCraft.brewingUntil > 0)) { res.toast = "cauldronNothingToCollect"; return res; }
  if (Date.now() < salveCraft.brewingUntil) { res.toast = "cauldronBrewing"; return res; }
  salveCraft.brewingUntil = 0;
  f.inv.salve = (f.inv.salve || 0) + 1;
  res.invChanged = true; res.collected = true;
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
// Chantier "grange déplaçable" (2026-07, demande utilisateur) : `pos` fixe
// l'ancrage courant du bâtiment (par défaut BARN_SITE), déplacé ensuite via
// l'outil main comme un bâtiment d'artisan (voir req "moveBarn",
// FermeGame.js). Cloné (pas une référence à C.BARN_SITE) pour ne jamais
// muter la constante par inadvertance.
export function newBarnState() { return { level: 0, progress: { wood: 0, stone: 0 }, ready: false, pos: { x: C.BARN_SITE.x, y: C.BARN_SITE.y } }; }

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
  // Chantier "grange déplaçable" : on vise sa position COURANTE (barn.pos),
  // repli sur BARN_SITE pour les parties déjà en cours sans ce champ.
  const barnPosNow = (barn.pos && typeof barn.pos.x === "number") ? barn.pos : C.BARN_SITE;
  if (!nearT(f, barnPosNow)) { res.toast = "farBarn"; return res; }
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
    if (C.CROPS[st].unique) { res.toast = "actionFailed"; return res; } // zip 233: gift-only seeds, never sold
    const cost = C.CROPS[st].seedCost * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost; f.inv.seeds[st] += n; res.invChanged = true;
  } else if (m.item === "sapling") {
    /* ZIP 398 — LE PLANT DE VERGER. Même porte que les graines : la boutique
       ne connaît qu'un catalogue et un prix. La différence avec une graine est
       tout entière dans ce qui se passe APRÈS la plantation, pas à l'achat. */
    /* ⚠️ LE CHAMP S'APPELLE `sap`, ET SÛREMENT PAS `kind` : `kind` est déjà le
       DISCRIMINANT de toute requête du jeu ("buy", "act", "petWalk"…). Lire
       `m.kind` ici aurait rendu « buy », donc aucune espèce n'aurait jamais
       été trouvée, et l'achat aurait échoué en silence. Le genre de collision
       de noms qu'on ne voit qu'à l'exécution. */
    const k = C.ORCHARDS.findIndex(o => o.id === m.sap);
    if (k < 0) return res;
    const n = Math.max(1, Math.min(20, (m.n | 0) || 1));
    const cost = C.ORCHARDS[k].saplingCost * n;
    if (money < cost) { res.toast = "noGold"; return res; }
    res.moneyDelta = -cost;
    f.inv.saplings = f.inv.saplings || {};
    f.inv.saplings[m.sap] = (f.inv.saplings[m.sap] | 0) + n;
    res.invChanged = true;
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
  } else if (m.item === "sea") {
    // 2026-07 station update: rare sea creatures, sell-only.
    const st = m.sea | 0;
    if (st < 0 || st >= C.SEA_CREATURES.length) return res;
    const n = Math.min(f.inv.seaCreatures[st], Math.max(1, (m.n | 0) || f.inv.seaCreatures[st]));
    f.inv.seaCreatures[st] -= n; gain = n * C.SEA_CREATURES[st].sell;
  } else if (m.item === "berry") {
    const n = Math.min(f.inv.berries || 0, Math.max(1, (m.n | 0) || (f.inv.berries || 0)));
    f.inv.berries = (f.inv.berries || 0) - n; gain = n * C.BERRY_SELL;
  } else if (m.item === "fruit") {
    const n = Math.min(f.inv.fruit || 0, Math.max(1, (m.n | 0) || (f.inv.fruit || 0)));
    f.inv.fruit = (f.inv.fruit || 0) - n; gain = n * C.FRUIT_SELL;
  } else if (m.item === "product") {
    const pt = m.product | 0;
    if (pt < 0 || pt >= C.ANIMALS.length) return res;
    const n = Math.min(f.inv.products[pt], Math.max(1, (m.n | 0) || f.inv.products[pt]));
    f.inv.products[pt] -= n; gain = n * C.ANIMALS[pt].sell;
  }
  if (gain > 0) { res.moneyDelta = gain; res.earnedDelta = gain; res.invChanged = true; res.gain = gain; }
  return res;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 430 — VENDRE AU MARCHÉ DE VALLEY TOWN.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CETTE FONCTION NE PEUT PAS ÊTRE `resolveSell` AVEC UN MULTIPLICATEUR,
   ET LA RAISON EST LE PIÈGE DES DEUX CARTES (§4). `resolveSell` commence par
   `nearT(f, C.BIN)`, qui lit `f.x/f.y` — les coordonnées FERME du fermier.
   Pendant qu'il est en ville, ces coordonnées ne veulent rien dire : selon
   l'endroit où il a laissé son personnage au champ, la vente serait tantôt
   acceptée, tantôt refusée, sans aucun rapport avec l'endroit où il se trouve
   VRAIMENT. C'est exactement le défaut qu'on a payé au 426 sur la coupe de bois
   en ville, et la note de `townChop` le dit déjà.
   La portée est donc vérifiée sur la position TRANSMISE dans la requête
   (`px/py`, que `sendReq` remplit avec la position courante, donc de ville
   quand on est en ville) — jamais sur `f.x/f.y`.
   ⚠️ ET LE PRIX EST RECALCULÉ ICI, CHEZ L'HÔTE. Le client affiche une cote ; il
   ne l'envoie pas. Un prix qui voyagerait dans la requête serait un prix qu'un
   client bricolé pourrait choisir — l'or est partagé (§3), donc c'est l'hôte
   qui cote, comme c'est lui qui débite.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️⚠️ ZIP 431 — CETTE FONCTION EST DEVENUE LE GUICHET UNIQUE DU MARCHÉ, et
   c'est la conséquence directe de la demande de Guillaume : « nos produits
   doivent être vendus exclusivement sur le marché de Valley Town ». Avant ce
   zip, le jeu avait NEUF chemins de vente (le bac, les gemmes, la farine, le
   sucre, les prises de Soan, les productions de Harald, les vergers, les
   artisans, la bijouterie), chacun avec son propre test de proximité — ou
   aucun. Les faire tous transiter par ici est la seule façon d'avoir UNE règle
   de lieu, UNE cote et UN endroit à relire.
   ⚠️ ET ON DÉLÈGUE, ON NE RECOPIE PAS. Chaque famille garde son résolveur
   d'origine : eux seuls savent où vit le stock et ce que vaut la pièce. Cette
   fonction n'ajoute que deux choses par-dessus — la PORTÉE et la COTE. Recopier
   les prix ici aurait donné deux barèmes pour le même fromage, exactement le
   doublon que le §8 de CLAUDE.md interdit.
   ⚠️⚠️ ATTENTION AU DOUBLE CRÉDIT, c'est le piège de cette délégation : trois
   résolveurs (fruits de verger, produits aux fruits, bijouterie) CRÉDITENT
   `shared.money` eux-mêmes, les autres se contentent de renvoyer un
   `moneyDelta` que l'appelant applique. Pour les premiers, on ne renvoie donc
   que le BONUS ; pour les seconds, le total. `paid` porte cette distinction, et
   se tromper ici paierait la vente deux fois sans lever la moindre erreur. */
export function resolveTownSell(f, m, day, s) {
  normalizeFarmer(f);
  const res = {
    moneyDelta: 0, earnedDelta: 0, invChanged: false, toast: null, gain: 0, base: 0,
    gemsChanged: false, flourChanged: false, sugarChanged: false, stockChanged: false,
    craftChanged: false, jewelryChanged: false, sharedChanged: false, n: 0,
  };
  if (!atMarket(m)) { res.toast = "farMarket"; return res; }
  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 431 — LE PANIER : UNE REQUÊTE, N LIGNES.
     ⚠️⚠️ C'EST UNE CONTRAINTE RÉSEAU, PAS UN CONFORT D'INTERFACE. Le panneau du
     marché peut contenir une quarantaine de lignes (neuf cultures, dix
     poissons, les fruits de verger, les produits d'artisans…). Vendre « tout »
     en émettant un `send()` par ligne ferait quarante messages en une seconde
     contre un PLAFOND DUR DE DIX (§3 de CLAUDE.md), et le dépassement est
     SILENCIEUX : la moitié du panier partirait dans le vide, l'or n'arriverait
     pas, et rien ne le dirait. Une requête porte donc tout le panier.
     ⚠️ ET LA PORTÉE EST VÉRIFIÉE UNE FOIS, EN TÊTE, pour le panier entier : les
     lignes n'ont pas de position à elles, et leur en inventer une serait
     rouvrir le piège des deux cartes. */
  if (Array.isArray(m.lines)) {
    for (const line of m.lines.slice(0, 64)) {
      if (!line || Array.isArray(line.lines)) continue;   // pas de panier dans un panier
      const r = resolveTownSell(f, { ...line, px: m.px, py: m.py, pz: m.pz }, day, s);
      res.moneyDelta += r.moneyDelta; res.earnedDelta += r.earnedDelta;
      res.gain += r.gain; res.base += r.base; res.n += r.n;
      for (const k of ["invChanged", "gemsChanged", "flourChanged", "sugarChanged",
                       "stockChanged", "craftChanged", "jewelryChanged"]) if (r[k]) res[k] = true;
    }
    /* ⚠️ ON NE REMONTE « TROP LOIN » QUE SI RIEN N'A ÉTÉ VENDU. Un panier
       partiellement servi (un stock qui a bougé entre l'affichage et le clic)
       est un succès partiel, pas une erreur : afficher un refus alors que l'or
       est arrivé serait le pire des deux mondes. */
    if (res.gain <= 0) res.toast = "marketNothing";
    return res;
  }
  /* ⚠️ LA QUANTITÉ ET LE STOCK SONT LUS EXACTEMENT COMME AU BAC. On recopie la
     forme de `resolveSell` plutôt que de l'appeler : l'appeler obligerait à
     court-circuiter son test de portée, c'est-à-dire à créer un chemin où une
     vente se fait SANS vérification de position. Un jour quelqu'un l'emprunte
     depuis autre chose. */
  const take = (have, want) => Math.min(have, Math.max(1, (want | 0) || have));
  let n = 0, unit = 0;
  if (m.item === "crop") {
    const ct = m.crop | 0; if (ct < 0 || ct >= C.CROPS.length) return res;
    n = take(f.inv.crops[ct], m.n); f.inv.crops[ct] -= n; unit = C.CROPS[ct].sell;
  } else if (m.item === "wood") {
    n = take(f.inv.wood, m.n); f.inv.wood -= n; unit = C.WOOD_SELL;
  } else if (m.item === "stone") {
    n = take(f.inv.stone, m.n); f.inv.stone -= n; unit = C.STONE_SELL;
  } else if (m.item === "fish") {
    const ft = m.fish | 0; if (ft < 0 || ft >= C.FISH.length) return res;
    n = take(f.inv.fish[ft], m.n); f.inv.fish[ft] -= n; unit = C.FISH[ft].sell;
  } else if (m.item === "sea") {
    const st = m.sea | 0; if (st < 0 || st >= C.SEA_CREATURES.length) return res;
    n = take(f.inv.seaCreatures[st], m.n); f.inv.seaCreatures[st] -= n; unit = C.SEA_CREATURES[st].sell;
  } else if (m.item === "berry") {
    n = take(f.inv.berries || 0, m.n); f.inv.berries = (f.inv.berries || 0) - n; unit = C.BERRY_SELL;
  } else if (m.item === "fruit") {
    n = take(f.inv.fruit || 0, m.n); f.inv.fruit = (f.inv.fruit || 0) - n; unit = C.FRUIT_SELL;
  } else if (m.item === "product") {
    const pt = m.product | 0; if (pt < 0 || pt >= C.ANIMALS.length) return res;
    n = take(f.inv.products[pt], m.n); f.inv.products[pt] -= n; unit = C.ANIMALS[pt].sell;
  } else return resolveTownSellShared(f, m, day, s, res);
  if (n <= 0) return res;
  const priced = marketPrice(day, m.item, unit);
  res.gain = res.moneyDelta = res.earnedDelta = n * priced;
  res.base = n * unit;
  res.n = n;
  res.invChanged = true;
  return res;
}
/* Le second étage du guichet : tout ce qui ne vit pas dans `f.inv`. Séparé
   pour que la fonction du dessus reste lisible, appelé par elle seule — la
   portée a déjà été vérifiée quand on arrive ici, et c'est le SEUL appelant,
   ce qui est la condition pour que ça reste vrai. */
function resolveTownSellShared(f, m, day, s, res) {
  if (!s) return res;
  const it = m.item;
  const rate = marketRate(day, marketFamilyOf(it) || "__none__");
  /* `paid` = le résolveur a DÉJÀ crédité shared.money (voir l'avertissement de
     l'en-tête). `base` = ce qu'il a rapporté au prix de la ferme. */
  const finish = (base, paid, flag, n) => {
    if (base <= 0) return res;
    const total = Math.max(base, Math.ceil(base * rate));
    res.base = base; res.gain = total; res.n = n || 1;
    res.moneyDelta = res.earnedDelta = paid ? total - base : total;
    if (flag) res[flag] = true;
    return res;
  };
  if (it === "gem") {
    const r = resolveSellGem(s.gems, m);
    return finish(r.gain, false, r.gemsChanged ? "gemsChanged" : null, m.n);
  }
  if (it === "flour") {
    const r = resolveSellFlour(s, m);
    return finish(r.gain, false, r.flourChanged ? "flourChanged" : null, m.n);
  }
  if (it === "sugar") {
    const r = resolveSellSugar(s, m);
    return finish(r.gain, false, r.sugarChanged ? "sugarChanged" : null, m.n);
  }
  if (it === "commonFish" || it === "commonAnimal") {
    const stock = s.gregStock; if (!stock) return res;
    const r = it === "commonFish" ? resolveSellCommonFish(stock, m) : resolveSellCommonAnimal(stock, m);
    return finish(r.gain, false, r.stockChanged ? "stockChanged" : null, m.n);
  }
  if (it === "craft") {
    /* ⚠️ LE STOCK D'ARTISANS EST COMMUN À LA SALLE, comme les gemmes. Le prix
       vient de `craftSellPrice`, qui est aussi ce que lit la requête `sellCraft`
       — un seul barème (voir sa note). */
    const stock = s.craftStock; if (!stock) return res;
    const key = String(m.craft || "");
    if (!CRAFT_SELL_ITEMS.includes(key)) return res;
    const price = craftSellPrice(s, key);
    const have = stock[key] | 0;
    const n = Math.min(have, Math.max(1, (m.n | 0) || have));
    if (price <= 0 || n <= 0) return res;
    stock[key] = have - n;
    return finish(n * price, false, "craftChanged", n);
  }
  if (it === "orchardFruit") {
    /* ⚠️ LA BARQUETTE RESTE UNE VENTE À PART, PAS UNE QUANTITÉ. Six fruits
       vendus par six ne font PAS une barquette : la barquette rapporte +25 %
       (voir C.punnetPrice), c'est tout son objet depuis le 398. On boucle donc
       sur des ventes entières plutôt que de multiplier un prix unitaire. */
    const fid = String(m.fruit || "");
    let base = 0, done = 0;
    const want = Math.max(1, (m.n | 0) || 1);
    for (let k = 0; k < want; k++) {
      const r = resolveSellFruit(f, s, fid, !!m.punnet);
      if (!r.ok) break;
      base += r.gain; done++;
    }
    res.invChanged = done > 0;
    return finish(base, true, null, done);
  }
  if (it === "fruitProduct") {
    const pid = String(m.product || "");
    let base = 0, done = 0;
    const want = Math.max(1, (m.n | 0) || 1);
    for (let k = 0; k < want; k++) {
      const r = resolveSellFruitProduct(f, s, pid);
      if (!r.ok) break;
      base += r.gain; done++;
    }
    res.invChanged = done > 0;
    return finish(base, true, null, done);
  }
  if (it === "jewelry") {
    /* ⚠️ PAS DE COTE ICI : le prix est celui qu'un joueur a fixé (voir
       marketFamilyOf). `paid` vaut true — resolveSellJewelry crédite lui-même —
       donc `finish` ne renvoie que la différence, qui est nulle par
       construction. C'est voulu : la pièce est déjà payée, on ne fait que
       remonter le montant pour le chat et l'effet « +N or ». */
    const r = resolveSellJewelry(s, s.station, m.jewelry | 0);
    if (!r.ok) { res.toast = r.toast || null; return res; }
    res.jewelryChanged = true;
    return finish(r.gain, true, null, 1);
  }
  return res;
}
/* ⚠️ ZIP 431 — LA LISTE DES REQUÊTES QUI SONT DES VENTES DE PRODUITS. C'est
   elle qui rend la règle « on ne vend qu'au marché » VRAIE plutôt
   qu'affichée : l'interface de la ferme n'a plus de bouton vendre, mais un
   client d'une version antérieure (ou bricolé) enverrait toujours ses vieilles
   requêtes. Le contrôle est donc chez l'hôte, en un seul point d'entrée.
   ⚠️ `visitorDeal` ET `visitorSwap` N'Y SONT PAS, ET C'EST LA DEMANDE : on peut
   toujours vendre à un visiteur qui frappe à la porte, individuellement, pour
   répondre à SA demande. Ce n'est pas écouler une récolte, c'est rendre service
   — et c'est le seul commerce qui ait encore un sens à la ferme.
   ⚠️ `sellAnimal` non plus : vendre une BÊTE n'est pas vendre une denrée, et
   personne ne transporte une vache dans le train. */
export const PRODUCE_SALE_KINDS = ["sell", "sellCraft", "sellFruit", "sellFruitProduct", "sellJewelry"];
export function isProduceSale(req) {
  return !!req && PRODUCE_SALE_KINDS.includes(req.kind);
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

// Vente d'un sac de sucre depuis le pool COMMUN à la salle (chantier canne à
// sucre) : miroir EXACT de resolveSellFlour ci-dessus, sur `shared.sugar` /
// C.SUGAR_SELL.
export function resolveSellSugar(shared, m) {
  const res = { moneyDelta: 0, earnedDelta: 0, sugarChanged: false, toast: null, gain: 0 };
  if (!shared) return res;
  const have = shared.sugar || 0;
  const n = Math.min(have, Math.max(1, (m.n | 0) || have));
  if (n <= 0) return res;
  shared.sugar = have - n;
  const gain = n * C.SUGAR_SELL;
  res.moneyDelta = gain; res.earnedDelta = gain; res.sugarChanged = true; res.gain = gain;
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

// Zip 260 : vente d'une PRODUCTION ANIMALE depuis le pool COMMUN ramassé par
// Harald (agent d'élevage) — œuf/lait/laine/truffe. Même principe que
// resolveSellCommonFish : `stock` = sharedRef.current.gregStock, muté
// directement (stock.animals, tableau par type comme C.ANIMALS/f.inv.products).
// Renvoie { moneyDelta, earnedDelta, stockChanged, toast, gain }.
export function resolveSellCommonAnimal(stock, m) {
  const res = { moneyDelta: 0, earnedDelta: 0, stockChanged: false, toast: null, gain: 0 };
  const pt = m.product | 0;
  if (pt < 0 || pt >= C.ANIMALS.length || !stock || !stock.animals) return res;
  const have = stock.animals[pt] || 0;
  const n = Math.min(have, Math.max(1, (m.n | 0) || have));
  if (n <= 0) return res;
  stock.animals[pt] -= n;
  const gain = n * C.ANIMALS[pt].sell;
  res.moneyDelta = gain; res.earnedDelta = gain; res.stockChanged = true; res.gain = gain;
  return res;
}

// Zip 260 : rattrapage HORS-LIGNE de Harald (agent d'élevage, demande
// Guillaume : "à notre reconnexion on a dans l'inventaire les ressources
// collectées"). Appelé une fois au chargement HÔTE. Pour chaque animal, on
// crédite au pool commun (gregStock.animals) autant de cycles de production
// (prodMs) écoulés pendant l'absence, borné par la fin du contrat
// (harald.expiresAt) et PLAFONNÉ par animal (20 poule / 6 gros animal). On
// repart ensuite d'un readyAt frais depuis MAINTENANT (aucun double-comptage
// par updateHarald ensuite).
export function haraldCatchup(s, now) {
  if (!s || !s.harald) return;
  const h = s.harald;
  const effNow = Math.min(now, h.expiresAt || now);
  const stock = s.gregStock || (s.gregStock = {});
  if (!stock.animals) stock.animals = C.ANIMALS.map(() => 0);
  for (const a of (s.animals || [])) {
    if (!a || a.carriedBy || typeof a.readyAt !== "number") continue;
    const prodMs = (C.ANIMALS[a.type] && C.ANIMALS[a.type].prodMs) || 0;
    if (prodMs <= 0 || effNow < a.readyAt) continue;
    let cycles = 1 + Math.floor((effNow - a.readyAt) / prodMs);
    const cap = a.type === C.HEN_ANIMAL ? C.HARALD_OFFLINE_CAP_HEN : C.HARALD_OFFLINE_CAP_BIG;
    if (cycles > cap) cycles = cap;
    stock.animals[a.type] = (stock.animals[a.type] || 0) + cycles;
    a.readyAt = now + prodMs;
  }
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
  // Zip 232: never regrow nature ON the train tracks (Guillaume: "make sure
  // trees can't grow on the train tracks; they can grow beside it"), nor
  // inside the normalized station area, nor under the barn's largest drawn
  // rectangle (trees there would be invisible under the sprite and, now that
  // buildings are solid, unreachable to chop).
  const onRails = (x) => x >= C.STATION_RAIL_X && x <= C.STATION_RAIL_X + 1;
  const inRect = (x, y, R) => x >= R.x && x < R.x + R.w && y >= R.y && y < R.y + R.h;
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H), i = idx(x, y);
    if (onRails(x) || inRect(x, y, C.STATION_CLEAR) || inRect(x, y, C.BARN_CLEAR)) continue;
    if (world.ground[i] === C.G_GRASS && world.objects[i] === C.O_NONE && !world.crops.has(i)
      && Math.abs(x - C.SPAWN.x) + Math.abs(y - C.SPAWN.y) > 18) {
      const type = rnd() < 0.5 ? C.O_ROCK : (rnd() < 0.35 ? C.O_TREE2 : C.O_TREE);
      world.objects[i] = type; world.objHp.set(i, type === C.O_ROCK ? C.ROCK_HP : C.TREE_HP);
      tiles.push(i);
    }
  }
  // Zip 284 (demande Guillaume : "plus de cailloux autour de la rivière, au
  // nord et sud de la map, ces cailloux respawn tous les jours quand
  // l'utilisateur ne regarde pas") : en plus du repop généraliste ci-dessus
  // (14 tuiles réparties sur toute la carte, loin du spawn), on ajoute ici
  // RIVER_STONE_RESPAWN_PER_DAY rochers CIBLÉS près des berges, uniquement
  // dans les bandes nord (y proche de 0) et sud (y proche de MAP_H-1) —
  // mêmes bandes que le bonus d'or (GOLD_EXTREME_BAND) puisque ce sont ces
  // rochers-là qu'on veut alimenter. Position tirée près du centre de la
  // rivière à cette rangée (riverCenterAt) plutôt qu'au hasard sur toute la
  // largeur, pour rester "autour de la rivière" comme demandé.
  for (let k = 0; k < C.RIVER_STONE_RESPAWN_PER_DAY; k++) {
    const north = rnd() < 0.5;
    const y = north
      ? Math.floor(rnd() * C.GOLD_EXTREME_BAND)
      : H - 1 - Math.floor(rnd() * C.GOLD_EXTREME_BAND);
    const cx = riverCenterAt(world, y);
    const x = Math.round(cx + (rnd() - 0.5) * 2 * C.RIVER_STONE_RESPAWN_RADIUS);
    if (!inMap(x, y)) continue;
    const i = idx(x, y);
    if (world.ground[i] === C.G_GRASS && world.objects[i] === C.O_NONE && !world.crops.has(i)) {
      world.objects[i] = C.O_ROCK; world.objHp.set(i, C.ROCK_HP);
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

// Zip suivant (demande Guillaume) : prix de vente EFFECTIF d'un produit de
// boulangerie, tenant compte du réglage du joueur (bk.prices[item], un
// pourcentage 50..200 du prix par défaut, paliers de 10 %). Sans réglage
// (undefined), on retombe sur le prix par défaut (BAKERY_DEFAULT_PRICE).
export function bakeryItemPrice(bk, item) {
  const def = C.BAKERY_DEFAULT_PRICE[item] || 0;
  const pct = bk && bk.prices && bk.prices[item] != null ? bk.prices[item] : 100;
  return Math.max(1, Math.round(def * pct / 100));
}

// Météo (chantier 2026-07, demande Guillaume) : true si `day` est un jour
// orageux/pluvieux (voir C.STORM_EVERY_N_DAYS). Dérivé du compteur `day`
// existant plutôt que d'un tirage aléatoire : même résultat pour tous les
// joueurs de la ferme sans rien synchroniser de plus, et prévisible d'une
// session à l'autre.
export function isStormyDay(day) {
  return C.STORM_EVERY_N_DAYS > 0 && (day | 0) % C.STORM_EVERY_N_DAYS === 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 430 — LE MARCHÉ DE VALLEY TOWN.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ C'EST LE CHANTIER QUI RELIE LES DEUX CARTES, et c'est sa seule raison
   d'être. Jusqu'ici Valley Town était un beau décor qu'on visite : on y montait
   par curiosité, on redescendait, et la ferme continuait sans elle. Le train
   n'avait aucune raison ÉCONOMIQUE d'être pris. Le champ de foire et ses dix
   étals existent depuis le 426 et ne servaient à rien.

   ⚠️⚠️ ET LE PRIX N'EST PAS UN ÉTAT PARTAGÉ. C'est LA décision de ce chantier.
   Un tableau de prix stocké dans `shared` aurait voulu dire : un champ de plus
   dans le JSON de `ferme_saves`, une valeur à faire tourner chaque jour chez
   l'hôte, un message pour la diffuser, une réconciliation quand un invité se
   connecte à mi-journée, et une sauvegarde d'avant ce zip à rattraper. Pour
   quelque chose qui est une PURE FONCTION DU JOUR.
   Le prix est donc HACHÉ à partir du numéro de jour et de la famille de
   produit. Deux joueurs, à deux bouts du monde, lisent le même chiffre sans
   qu'un octet ne circule — exactement l'astuce des répliques d'ambiance du 427
   (`townHash`), appliquée à l'économie. Zéro `send()`, zéro migration SQL,
   zéro champ à réconcilier.
   ⚠️ Corollaire à ne jamais oublier : le prix ne doit dépendre QUE du jour et
   de la famille. Le jour où l'un d'eux dépendra du stock d'un joueur, de son
   or ou de sa saison locale, les deux écrans afficheront des prix différents
   et chacun aura l'air cohérent avec lui-même. */
export function marketHash(a, b) {
  let h = ((a | 0) + 1) * 2246822519 ^ ((b | 0) + 1) * 3266489917;
  h ^= h >>> 15; h = (h * 2654435761) >>> 0;
  return h;
}
/* Les familles. ⚠️ ON COTE DES FAMILLES, PAS DES ARTICLES. Un prix par culture
   donnerait neuf courbes à surveiller sur un tableau de dix lignes : le joueur
   ne lirait plus rien, et « le marché » deviendrait une loterie. Cinq familles,
   c'est ce qu'on peut tenir en tête en montant dans le train — donc ce qu'on
   peut ANTICIPER, et anticiper est tout l'intérêt d'un cours qui varie. */
export const MARKET_FAMILIES = ["crop", "fish", "product", "forage", "material"];
export function marketFamilyOf(item) {
  if (item === "crop" || item === "orchardFruit") return "crop";
  if (item === "fish" || item === "sea" || item === "commonFish") return "fish";
  if (item === "product" || item === "commonAnimal" || item === "flour"
   || item === "sugar" || item === "craft" || item === "fruitProduct") return "product";
  if (item === "berry" || item === "fruit") return "forage";
  if (item === "wood" || item === "stone" || item === "gem") return "material";
  /* ⚠️⚠️ LA BIJOUTERIE N'A PAS DE FAMILLE, ET C'EST DÉLIBÉRÉ (zip 431). Le prix
     d'une pièce est FIXÉ PAR LE JOUEUR qui l'a dessinée (voir resolveMakeJewelry).
     Lui appliquer une cote reviendrait à multiplier un nombre choisi par un
     humain : il suffirait d'afficher une pièce à 999 999 le jour où les
     matériaux sont à +35 % pour transformer le marché en distributeur. Une
     pièce se vend donc à son prix, ni plus ni moins — ce qui reste cohérent
     avec le plancher promis (« jamais moins que le bac »). */
  return null;
}
/* ⚠️ ZIP 431 — LA PORTÉE DU MARCHÉ, EN UNE SEULE DÉFINITION. Elle était écrite
   dans `resolveTownSell` (hôte) et recopiée dans `nearMarket` (client, pour
   l'invite). Depuis ce zip elle décide AUSSI si une vente est légale, tous
   guichets confondus — trois copies d'un même rectangle, c'est la garantie
   qu'un jour le jeu propose de vendre puis refuse (le défaut que le 426 s'est
   juré de ne plus commettre).
   ⚠️ ELLE LIT `px/py` DE LA REQUÊTE, JAMAIS `f.x/f.y` : voir l'en-tête de
   resolveTownSell — c'est le piège des deux cartes, et il coûte cher ici. */
export function atMarket(m) {
  /* ⚠️⚠️ LA ZONE D'ABORD, LES DISTANCES ENSUITE. C'est la règle
     d'`anyRemoteNearZoned` (§4 de CLAUDE.md) appliquée à la vente, et elle est
     ici VITALE : le champ de foire vit en x∈[34;68], y∈[70;104] de la carte de
     VILLE — des coordonnées qui existent aussi au milieu des champs de la
     ferme, qui fait 180×140. Sans ce test, un fermier debout au bon endroit de
     son pré vendait « au marché » sans avoir pris le train, et rien ne l'aurait
     jamais signalé : les deux cartes sont des grilles de nombres, elles ne
     savent pas qu'elles sont deux.
     ⚠️ ET ON REFUSE FAUTE DE ZONE, jamais l'inverse : un client d'avant le 431
     n'envoie pas `pz`, et le laisser passer par tolérance rouvrirait le trou
     pour tout le monde — il suffirait d'omettre le champ. */
  if (m.pz !== "town") return false;
  const px = +m.px, py = +m.py;
  const mk = C.TOWN_MARKET, R = C.MARKET_RANGE_TILES;
  return Number.isFinite(px) && Number.isFinite(py)
    && px >= mk.x - R && px <= mk.x + mk.w + R && py >= mk.y - R && py <= mk.y + mk.h + R;
}
/* Le prix d'un produit d'artisan. ⚠️ IL VIT ICI DEPUIS LE 431 : la table était
   écrite dans le corps de la requête `sellCraft` (FermeGame), donc invisible du
   marché. Deux tables de prix pour le même fromage, c'est le doublon que le §8
   interdit — et celui-là aurait donné DEUX PRIX DIFFÉRENTS selon le guichet. */
export function craftSellPrice(shared, item) {
  if (C.BAKERY_SELL_ITEMS.includes(item)) return bakeryItemPrice((shared.crafts || {}).bakery, item);
  return {
    honey: C.HONEY_SELL, cheeseWheel: C.CHEESE_WHEEL_SELL, cheesePortion: C.CHEESE_PORTION_SELL,
    butter: C.BUTTER_SELL, yogurtNature: C.YOGURT_NATURE_SELL, yogurtVanilla: C.YOGURT_VANILLA_SELL,
  }[item] || 0;
}
/* La liste des articles d'artisan vendables. ⚠️ DÉRIVÉE, pas recopiée : le
   panneau du marché la parcourt, l'hôte la valide avec, et une denrée nouvelle
   apparaît des deux côtés le jour où on l'ajoute ici. */
export const CRAFT_SELL_ITEMS = ["honey", "cheeseWheel", "cheesePortion", "butter", "yogurtNature", "yogurtVanilla", ...C.BAKERY_SELL_ITEMS];
/* Le cours du jour, en pourcentage du prix de la ferme.
   ⚠️ LE MARCHÉ EST TOUJOURS AU MOINS AUSSI CHER QUE LE BAC DE LA FERME, et
   c'est un choix de conception, pas un réglage. Si vendre en ville pouvait
   rapporter MOINS, la réponse optimale serait « ne jamais prendre le train »,
   et on aurait ajouté un menu que personne n'ouvre. Le plancher est donc à
   +0 % : au pire on ne gagne rien de plus, jamais on ne perd. Ce qu'on vend en
   ville, on a de toute façon payé le voyage en temps.
   ⚠️ ET LE JOUR DE MARCHÉ EST LE MÊME POUR TOUT LE MONDE, dérivé lui aussi. */
export function isMarketDay(day) {
  return C.MARKET_DAY_EVERY > 0 && (day | 0) % C.MARKET_DAY_EVERY === 0;
}
export function marketRate(day, family) {
  const fi = MARKET_FAMILIES.indexOf(family);
  if (fi < 0) return 1;
  const h = marketHash(day, fi);
  // Une cote dans [1 ; 1 + MARKET_SPREAD], par pas de 1 % — des chiffres ronds
  // se retiennent, et on veut que le joueur DISE « le blé est à +18 aujourd'hui ».
  const span = Math.round(C.MARKET_SPREAD * 100);
  let pct = h % (span + 1);
  /* ⚠️ LE JOUR DE MARCHÉ NE REMPLACE PAS LE TIRAGE, IL LE RELÈVE. Le
     remplacer par une valeur fixe ferait de ce jour-là une constante connue
     d'avance, donc le seul jour où l'on vend — et les six autres deviendraient
     du décor. En relevant le plancher, un jour de marché reste variable :
     il vaut la peine, sans être une évidence. */
  if (isMarketDay(day)) pct = Math.max(pct, span - (h % Math.max(1, Math.round(span / 3))));
  return 1 + pct / 100;
}
/* ⚠️ ZIP 430 — LE JOUR DE SERVICE D'UN RÉSIDENT « À LA SEMAINE ». Dérivé du
   numéro de jour, donc identique chez tous les clients sans qu'un octet ne
   circule (même astuce que le cours du marché juste au-dessus et que le jour
   d'orage). `weeklyShift` est l'indice du jour dans la semaine ; un résident
   qui ne le porte pas travaille tous les jours, comme avant. */
export function isShopDay(ro, day) {
  if (!ro || ro.weeklyShift === undefined || ro.weeklyShift === null) return true;
  return ((day | 0) % 7) === (ro.weeklyShift | 0);
}
export function marketPrice(day, item, basePrice) {
  const fam = marketFamilyOf(item);
  if (!fam) return basePrice;
  // ⚠️ Arrondi au SUPÉRIEUR : à petits prix (une baie vaut 3), un arrondi au
  // plus proche mangerait toute la prime et le marché n'existerait que pour
  // les articles chers. Une baie à +20 % doit rapporter 4, pas 3.
  return Math.max(basePrice, Math.ceil(basePrice * marketRate(day, fam)));
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
// Zip 232 (Guillaume: "users can't walk through or behind" the station and
// the barn): the two buildings become SOLID over their full drawn rectangle
// (roof included), not just their footprint. The station rect is a constant
// (the station always exists); the barn rect depends on the built level,
// read from `world.barnLevel` — a mirror field refreshed every frame by
// updateMe (FermeGame.js) since the barn state lives in `shared`, not in
// the world object that collision functions receive.
const inBlockRect = (fx, fy, R) => fx >= R.x && fx < R.x + R.w && fy >= R.y && fy < R.y + R.h;
export function solidBuildingAt(world, fx, fy) {
  if (inBlockRect(fx, fy, C.STATION_BLOCK)) return true;
  // Chantier "grange déplaçable" (2026-07) : le rectangle de collision suit
  // désormais la position COURANTE de la grange, pas BARN_SITE fixe — mirroité
  // chaque frame dans world.barnBlockRect par updateMe (FermeGame.js), au
  // même titre que world.artisanBlocks ci-dessous.
  const bbr = world && world.barnBlockRect;
  if (bbr && inBlockRect(fx, fy, bbr)) return true;
  // Zip 260 (demande Guillaume : "on passe pas à travers et les résidents non
  // plus") : les bâtiments d'artisans (ruche/fromagerie/boulangerie/scierie)
  // sont SOLIDES. Leurs footprints (w×h à leur position COURANTE, déplaçable)
  // sont mirroités chaque frame dans world.artisanBlocks par updateMe
  // (FermeGame.js), au même titre que world.barnLevel — solidBuildingAt ne
  // reçoit que `world`, pas l'état partagé.
  const ab = world && world.artisanBlocks;
  if (ab) for (let k = 0; k < ab.length; k++) { const R = ab[k]; if (fx >= R.x && fx < R.x + R.w && fy >= R.y && fy < R.y + R.h) return true; }
  return false;
}

/* ⚠️⚠️ ZIP 401 — LES ARBUSTES FRUITIERS NE BLOQUENT PLUS, ET C'EST UNE
   DEMANDE EXPLICITE. Guillaume : « audit jouabilité des arbustes fruitiers.
   ils sont en dur, provoquent une collision or je veux pas cela. »

   O_BERRY_BUSH et O_ORCHARD sortent des DEUX listes — à pied comme à cheval.
   Ce sont les seuls objets du jeu dont on RÉCOLTE sans les détruire : on
   revient dessus tous les jours, et un buisson à hauteur de genou qui arrête
   un fermier comme le ferait un rocher est le genre de friction qu'on ne
   remarque qu'après en avoir planté quinze.

   ⚠️ LES DEUX Y PASSENT, ET C'EST UNE DÉCISION PRISE SEULE. Guillaume ne
   nomme que « les arbustes fruitiers », c'est-à-dire les vergers du 398. Mais
   le buisson à baies du printemps est le même objet du point de vue du joueur
   — un arbuste bas dont on cueille des fruits — et n'en libérer qu'un aurait
   produit une incohérence qu'on rencontre au premier printemps. Signalé ici
   plutôt que tu.

   ⚠️ CE QUE ÇA NE CASSE PAS, VÉRIFIÉ PLUTÔT QUE SUPPOSÉ :
     * la CUEILLETTE. targetTile() (FermeGame.js) vise la case sous la souris
       dès qu'elle est à portée, et la distance zéro est à portée : debout sur
       un verger, on le cueille toujours en cliquant dessus ;
     * l'ABATTAGE à la hache, qui passe par le même chemin ;
     * la POSE. On n'a jamais pu poser sur une case occupée, et ce test-là
       regarde `objects[i] !== O_NONE`, pas la collision ;
     * le RENDU. Les objets et les personnages sont dans la même liste triée en
       y (voir `draws.sort` dans FermeGame.js) : marcher dans un verger fait
       passer le feuillage devant les bottes, ce qui est exactement ce qu'on
       veut voir. Rien à écrire pour l'obtenir.
   ========================================================================= */
export function blockedTile(world, x, y, now = Date.now()) {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (!inMap(fx, fy)) return true;
  if (solidBuildingAt(world, fx, fy)) return true;
  const i = idx(fx, fy);
  const g = world.ground[i], o = world.objects[i];
  if (g === C.G_WATER || g === C.G_BRIDGE_SITE || g === C.G_BRIDGE_CLOSED || g === C.G_BRIDGE_STONE_CLOSED) return true;
  if (o === C.O_LAMP || o === C.O_MILL || o === C.O_SUCRERIE) return buildReady(world.objHp.get(i), now);
  if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK || o === C.O_HOUSE || o === C.O_SHOP || o === C.O_BIN || o === C.O_STUMP || o === C.O_WELL || o === C.O_FENCE || o === C.O_FENCE_H || o === C.O_FENCE_V || o === C.O_WALL) return true;
  return false;
}

// Variante MONTÉE de blockedTile (chantier 2026-07, demande Guillaume : "on
// doit pouvoir traverser la rivière à cheval") : identique, sauf que l'eau
// (et les emplacements/tabliers de pont fermés — de l'eau en dessous) est
// franchissable À LA NAGE. Les obstacles solides (arbres, rochers, clôtures,
// murs, bâtiments...) bloquent toujours, monté ou pas. Le RALENTISSEMENT
// (C.HORSE_WATER_SLOW) est appliqué côté FermeGame (updateMe /
// updateWhistledHorses), pas ici : cette fonction ne dit que "passable ou
// non".
export function blockedTileMounted(world, x, y, now = Date.now()) {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (!inMap(fx, fy)) return true;
  if (solidBuildingAt(world, fx, fy)) return true; // station/barn solid, mounted or not (zip 232)
  const i = idx(fx, fy);
  const o = world.objects[i];
  if (o === C.O_LAMP || o === C.O_MILL || o === C.O_SUCRERIE) return buildReady(world.objHp.get(i), now);
  if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_ROCK || o === C.O_HOUSE || o === C.O_SHOP || o === C.O_BIN || o === C.O_STUMP || o === C.O_WELL || o === C.O_FENCE || o === C.O_FENCE_H || o === C.O_FENCE_V || o === C.O_WALL) return true;
  return false;
}

// Chantier reprise (demande Guillaume) : les visiteurs qui marchent depuis
// la gare (aller ET retour) ainsi que ceux qui flânent en phase "wait"
// doivent PRIVILÉGIER les chemins dallés (G_PATH devant les maisons ET
// G_PATH_STONE posé par le joueur, traités à égalité) plutôt qu'une ligne
// droite à travers l'herbe. A* borné à la boîte englobante départ/arrivée
// (+ marge) : les tuiles dallées coûtent nettement moins cher à traverser
// que le reste, mais rien n'est infranchissable — un visiteur coupe quand
// même à travers l'herbe si aucune dalle n'est disponible sur le trajet
// (fourchette de recherche dépassée, dalle manquante, trou dans le
// chemin...). Comme la carte fait 180x140 tuiles, la recherche est bornée
// à une boîte + un nombre de nœuds explorés max : aucune de ces limites
// n'est jamais atteinte en pratique ici (au plus VISITORS_MAX = 5
// visiteurs, trajets gare<->mairie ou petits sauts de flânerie), mais en
// cas de dépassement (carte custom, distance inhabituelle) la fonction
// retourne simplement `null` — l'appelant retombe alors sur l'ancien
// comportement en ligne droite (aucune régression possible).
const PATH_TILE_COST = 1;      // coût d'une tuile dallée (G_PATH / G_PATH_STONE)
const PLAIN_TILE_COST = 6;     // coût du reste (herbe, terre labourée, etc.) — décourage sans bloquer
const PATHFIND_MARGIN = 6;     // marge (tuiles) ajoutée autour de la boîte départ/arrivée
const PATHFIND_MAX_NODES = 3000; // garde-fou perf : au-delà, on abandonne (fallback ligne droite)

function tileTravelCost(world, fx, fy) {
  const g = world.ground[idx(fx, fy)];
  return (g === C.G_PATH || g === C.G_PATH_STONE) ? PATH_TILE_COST : PLAIN_TILE_COST;
}

export function findPavedPath(world, sx, sy, tx, ty, now = Date.now()) {
  const sfx = Math.floor(sx), sfy = Math.floor(sy), tfx = Math.floor(tx), tfy = Math.floor(ty);
  if (sfx === tfx && sfy === tfy) return [{ x: tx, y: ty }];
  const minX = Math.max(0, Math.min(sfx, tfx) - PATHFIND_MARGIN);
  const maxX = Math.min(C.MAP_W - 1, Math.max(sfx, tfx) + PATHFIND_MARGIN);
  const minY = Math.max(0, Math.min(sfy, tfy) - PATHFIND_MARGIN);
  const maxY = Math.min(C.MAP_H - 1, Math.max(sfy, tfy) + PATHFIND_MARGIN);
  if ((maxX - minX + 1) * (maxY - minY + 1) > PATHFIND_MAX_NODES) return null;
  if (!inMap(tfx, tfy) || blockedTile(world, tfx + 0.5, tfy + 0.5, now)) return null;
  const key = (x, y) => (y - minY) * (maxX - minX + 1) + (x - minX);
  const gScore = new Map(), fScore = new Map(), came = new Map();
  const h = (x, y) => Math.hypot(x - tfx, y - tfy);
  const startK = key(sfx, sfy);
  gScore.set(startK, 0); fScore.set(startK, h(sfx, sfy));
  const open = new Map([[startK, { x: sfx, y: sfy }]]);
  const closed = new Set();
  let explored = 0;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.size) {
    let bestK = -1, bestF = Infinity;
    for (const [k] of open) { const f = fScore.get(k); if (f < bestF) { bestF = f; bestK = k; } }
    const cur = open.get(bestK); open.delete(bestK); closed.add(bestK);
    if (cur.x === tfx && cur.y === tfy) {
      const pts = []; let ck = bestK;
      while (came.has(ck)) { const [px, py] = came.get(ck); pts.unshift({ x: px + 0.5, y: py + 0.5 }); ck = key(px, py); }
      pts.push({ x: tx, y: ty });
      return pts;
    }
    explored++;
    if (explored > PATHFIND_MAX_NODES) return null;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
      if (dx !== 0 && dy !== 0) { // pas de coupe de coin en diagonale
        if (blockedTile(world, cur.x + dx + 0.5, cur.y + 0.5, now) || blockedTile(world, cur.x + 0.5, cur.y + dy + 0.5, now)) continue;
      }
      if (blockedTile(world, nx + 0.5, ny + 0.5, now)) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const stepCost = tileTravelCost(world, nx, ny) * (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
      const tentative = (gScore.get(bestK) || 0) + stepCost;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, [cur.x, cur.y]);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + h(nx, ny));
        if (!open.has(nk)) open.set(nk, { x: nx, y: ny });
      }
    }
  }
  return null;
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

/* ==========================================================================
   2026-07 TRAIN STATION UPDATE (see fermeConstants.js header). Pure host
   helpers, same discipline as the wolf/evil-world modules: the host resolves
   everything, clients only send requests and render broadcast state.
   ========================================================================== */

// Is this map row in the "extreme end" stretch of the river (top/bottom
// C.SEA_EXTREME_FRAC of the map)? Used by both the host validation in
// resolveAct("fish") and the client-side roll in startFishing.
export function seaExtremeRow(y) {
  const frac = C.SEA_EXTREME_FRAC;
  return y < C.MAP_H * frac || y >= C.MAP_H * (1 - frac);
}

// Fresh station state. Persisted inside the save JSON (ferme_saves.state),
// snapshot-carried like `house`. `visitor` and `damage` are transient and
// reset to null at load (migrateStation): a half-finished visit or an
// unrepaired raid never survives a session, exactly like wolves/monsters.
export function newStationState() {
  return {
    ads: [],            // posted ad categories (subset of C.AD_CATEGORIES)
    blacklist: [],      // roster ids banned from ever visiting again
    rel: {},            // roster id -> friendship points (chats, deals)
    // Chantier "reset ponctuel de l'amitié" (2026-07, demande utilisateur) :
    // drapeau de migration à usage unique (voir migrateStation ci-dessous).
    // Une ferme TOUTE NEUVE n'a rien à réinitialiser (rel est déjà vide), donc
    // elle démarre directement avec le drapeau posé ; seules les fermes
    // EXISTANTES (chargées depuis une sauvegarde antérieure à ce chantier, où
    // ce champ est absent) déclenchent la remise à zéro, une seule fois, à
    // leur prochain chargement — voir migrateStation.
    relResetDone2607: true,
    residents: [],      // [{rid, job}] accepted through a unanimous vote (or dice)
    nextVisitAt: 0,     // host clock; 0 = schedule on next host tick
    visitors: [],       // live visitor objects (host-simulated, broadcast) - up to VISITORS_MAX (zip 233)
    pendingGifts: [],   // owed gifts (decor/pet) awaiting their systems - PERSISTED (zip 233)
    promisedGifts: [],  // zip 250: bag gifts a departed visitor pledged to SEND, delivered to a specific farmer after a short delay - PERSISTED
    damage: null,       // live hostile-damage record awaiting co-op repair
    // Zip 258 : réserve commune de produits du monde rapportés par Eduardo
    // (clé WORLD_GOODS[].key -> quantité). PERSISTÉE. `voyagerNotice` = petit
    // avis de retour transitoire (affiché en coin, effacé à l'ouverture du menu).
    worldStock: {},
    voyagerNotice: null,
    // Zip 259 : exclusions de résidents (kick-out). `kickVotes[rid] = { playerId:
    // true }` = votes d'exclusion en cours (unanimité des joueurs en ligne).
    // `exiles` = ex-résidents exclus qui reviendront supplier (returnAt = horloge
    // hôte, mood + variante de texte figées à l'exclusion). PERSISTÉ.
    kickVotes: {},
    exiles: [],
    // Zip 278 (demande Guillaume) : "si un visiteur hostile avec skills a été
    // mis en blacklist permanente, le faire revenir sous un autre nom".
    // `covers[rid] = "NouveauNom"` — identité de couverture PERSISTÉE, utilisée
    // partout où le nom du roster est affiché (voir rosterOf côté FermeGame.js).
    // Uniquement peuplé pour les rid À SKILL bannis (resolveBlacklist) : eux ne
    // sont PAS ajoutés à `blacklist`, ils continuent de pouvoir être tirés au
    // sort comme visiteur, juste sous ce nom d'emprunt. Un hostile SANS skill
    // reste banni pour de bon, sans entrée ici.
    covers: {},
    // Zip 280 : bijouterie — PAS liée à un résident (voir fermeConstants.js).
    // `built` = bâtiment acheté (pot commun, une fois) ; `items` = pièces
    // finies en attente de vente, chacune avec son PROPRE prix fixé par le
    // joueur qui l'a designée : { id, type, gemId, shape, price, maker }.
    jewelry: { built: false, items: [] },
    // Zip 302 : montgolfière — voir newBalloonState() plus bas.
    balloon: null, // rempli paresseusement (E.newBalloonState()) au premier tick hôte
    // Chantier "rivalité Tristan/Jérôme" (2026-07) : état PARTAGÉ (horloge
    // hôte) de la provocation en cours — voir updateTristanJeromeFeud/
    // resolveTjBrawl (FermeGame.js). `tjBrawl` = scène de tension en cours
    // (null hors scène) ; `tjNextStormAt`/`tjBrawlCooldownUntil` = horodatages
    // hôte, relocalisés comme nextVisitAt en cas de snapshot/changement d'hôte.
    tjBrawl: null,
    tjNextStormAt: 0,
    tjBrawlCooldownUntil: 0,
    // Correctif "dispute Chloé/Rosalie vue de tous" (2026-07, demande
    // Guillaume) : la scène était jusque-là 100% locale (chaque client la
    // recalculait/rejouait pour son propre compte, désync possible entre
    // joueurs). Même principe que tjBrawl ci-dessus désormais : `crScene` =
    // scène de dispute en cours (null hors scène), `crNextCooldownUntil` =
    // horodatage hôte avant lequel on ne redéclenche pas. Aucun impact
    // gameplay (contrairement à tjBrawl) — seule la SYNCHRONISATION change.
    crScene: null,
    crNextCooldownUntil: 0,
  };
}

// Look up a live visitor by roster id. Every resolver now targets a specific
// visitor this way (zip 233: several can be on the farm at once).
export function getVisitor(s, rid) {
  const list = (s.station && s.station.visitors) || [];
  for (const v of list) if (v.rid === rid) return v;
  return null;
}

// Load/snapshot normalization (same role as normalizeFarmer for farmers).
// `hostNow` (snapshots only) relocates host-clock timestamps onto the local
// clock, same discipline as salveCraft.brewingUntil / house.upgradeUntil.
export function migrateStation(st, hostNow) {
  const out = newStationState();
  if (!st) return out;
  out.ads = Array.isArray(st.ads) ? st.ads.filter(a => C.AD_CATEGORIES.includes(a)) : [];
  out.blacklist = Array.isArray(st.blacklist) ? st.blacklist.filter(r => typeof r === "number") : [];
  // Chantier "reset ponctuel de l'amitié" (2026-07, demande utilisateur) :
  // une ferme sauvegardée AVANT ce chantier n'a pas encore le champ
  // `relResetDone2607` (absent = falsy) -> son compteur d'amitié par
  // visiteur (rel) est remis à zéro UNE SEULE FOIS, à ce chargement précis
  // (le tout prochain à se connecter à la ferme après la mise à jour), puis
  // le drapeau est posé pour de bon : tous les chargements suivants (et le
  // fonctionnement du jeu en général : chats, cadeaux, prix, etc.) continuent
  // normalement à partir de rel={}, exactement comme aujourd'hui pour une
  // ferme neuve. Aucune répétition possible, même après plusieurs
  // reconnexions/changements d'hôte.
  if (st.relResetDone2607) {
    out.rel = (st.rel && typeof st.rel === "object") ? st.rel : {};
  } else {
    out.rel = {};
  }
  out.relResetDone2607 = true;
  out.residents = Array.isArray(st.residents) ? st.residents.filter(r => r && typeof r.rid === "number") : [];
  // Zip 258 : réserve de produits du monde (objet clé->quantité) préservée à
  // chaque chargement/snapshot, comme les cadeaux dus.
  out.worldStock = (st.worldStock && typeof st.worldStock === "object") ? { ...st.worldStock } : {};
  out.voyagerNotice = (st.voyagerNotice && typeof st.voyagerNotice === "object") ? st.voyagerNotice : null;
  // Zip 259 : votes d'exclusion en cours + file des ex-résidents à faire revenir.
  out.kickVotes = (st.kickVotes && typeof st.kickVotes === "object") ? st.kickVotes : {};
  out.exiles = Array.isArray(st.exiles) ? st.exiles.filter(e => e && typeof e.rid === "number") : [];
  // Zip 278 : identités de couverture des hostiles à skill graciés — mêmes
  // règles de survie qu'un rel/blacklist : PERSISTÉES à chaque chargement/
  // snapshot, aucune relocalisation d'horloge nécessaire (pas de timestamp).
  out.covers = (st.covers && typeof st.covers === "object") ? { ...st.covers } : {};
  // Zip 280 : bijouterie — survit à chaque chargement/snapshot, comme le
  // reste de la station (aucun timestamp à relocaliser, contrairement aux
  // visiteurs/dégâts ci-dessous).
  out.jewelry = (st.jewelry && typeof st.jewelry === "object")
    ? { built: !!st.jewelry.built, items: Array.isArray(st.jewelry.items) ? st.jewelry.items.filter(it => it && typeof it.id === "number") : [] }
    : { built: false, items: [] };
  // Zip 302 : montgolfière — état PERSISTÉ comme le reste de la station.
  out.balloon = migrateBalloon(st.balloon);
  // Chantier "rivalité Tristan/Jérôme" (2026-07) : état de la scène en cours
  // + les deux horodatages hôte (cooldowns) — sans cette copie explicite, un
  // invité qui reçoit p.station perdrait tjBrawl/tjNextStormAt/
  // tjBrawlCooldownUntil (out ne recopie QUE les champs listés ici), et la
  // scène/le verrou d'ITT se désynchroniseraient chez lui.
  out.tjBrawl = (st.tjBrawl && typeof st.tjBrawl === "object" && Array.isArray(st.tjBrawl.lines)) ? { ...st.tjBrawl } : null;
  out.tjNextStormAt = typeof st.tjNextStormAt === "number" ? st.tjNextStormAt : 0;
  out.tjBrawlCooldownUntil = typeof st.tjBrawlCooldownUntil === "number" ? st.tjBrawlCooldownUntil : 0;
  // Correctif "dispute Chloé/Rosalie vue de tous" : même whitelist que
  // tjBrawl ci-dessus, sinon ces champs seraient silencieusement perdus chez
  // les invités à la prochaine synchro (piège déjà rencontré sur tjBrawl).
  out.crScene = (st.crScene && typeof st.crScene === "object" && Array.isArray(st.crScene.lines)) ? { ...st.crScene } : null;
  out.crNextCooldownUntil = typeof st.crNextCooldownUntil === "number" ? st.crNextCooldownUntil : 0;
  // Owed gifts (zip 233) survive EVERY load, plain or snapshot: a promised
  // pet must not vanish before the pet system ships.
  out.pendingGifts = Array.isArray(st.pendingGifts) ? st.pendingGifts.filter(g => g && typeof g.kind === "string") : [];
  // Zip 250: promised (delayed) bag gifts survive loads too, so a pledge made
  // just before a reload/snapshot still reaches the right farmer's bag.
  out.promisedGifts = Array.isArray(st.promisedGifts)
    ? st.promisedGifts.filter(g => g && g.reward && typeof g.reward.kind === "string" && g.farmerId)
    : [];
  if (typeof hostNow === "number") {
    // Mid-session snapshot: keep the live visitors/damage, relocated.
    // A legacy single st.visitor (pre-233 snapshot) is wrapped into an array.
    const shift = Date.now() - hostNow;
    const raw = Array.isArray(st.visitors) ? st.visitors : (st.visitor ? [st.visitor] : []);
    out.visitors = raw.map(v0 => {
      const v = { ...v0 };
      for (const k of ["phaseUntil", "waitUntil", "deadline", "voteUntil", "waitStartedAt"]) {
        if (typeof v[k] === "number" && v[k] > 0) v[k] += shift;
      }
      // Chantier v363 ("plus aucun PNJ figé") : les horodatages de
      // l'attroupement Tristan/Jérôme (tjReact.startAt / tjReact.returnAt)
      // manquaient à cette liste alors qu'ils sont eux aussi datés sur
      // l'HORLOGE DE L'HÔTE. Un changement d'hôte en pleine scène les projetait
      // dans le futur, et le PNJ restait bloqué sur `if (now < rc.startAt) {
      // moving = false; return; }` — figé, sans jamais reprendre sa flânerie.
      // Piège récurrent déjà rencontré sur les visiteurs/dégâts/montgolfière.
      if (v.tjReact && typeof v.tjReact === "object") {
        v.tjReact = { ...v.tjReact };
        for (const k of ["startAt", "returnAt"]) {
          if (typeof v.tjReact[k] === "number" && v.tjReact[k] > 0) v.tjReact[k] += shift;
        }
      }
      return v;
    });
    if (st.damage) {
      out.damage = { ...st.damage };
      if (typeof out.damage.until === "number" && out.damage.until > 0) out.damage.until += shift;
    }
    // Zip 302 : montgolfière — mêmes horodatages "horloge hôte" que les
    // visiteurs/dégâts, à relocaliser en cas de changement d'hôte en cours
    // de vol/embarquement (sinon décollage/atterrissage se dérègle).
    for (const k of ["boardingUntil", "flightStartAt", "flightEndAt", "nextDepartureAt"]) {
      if (typeof out.balloon[k] === "number" && out.balloon[k] > 0) out.balloon[k] += shift;
    }
    // Zip 258 : la commande d'Eduardo en cours (res.trip.returnAt, horloge de
    // l'hôte) doit être relocalisée comme les échéances des visiteurs, sinon un
    // changement d'hôte en plein voyage fausserait l'heure de retour.
    out.residents = out.residents.map(r => {
      if (r && r.trip && typeof r.trip.returnAt === "number" && r.trip.returnAt > 0) {
        return { ...r, trip: { ...r.trip, returnAt: r.trip.returnAt + shift } };
      }
      return r;
    });
    // Chantier "rivalité Tristan/Jérôme" : injuredUntil (ITT post-bagarre)
    // est, comme trip.returnAt ci-dessus, un horodatage HÔTE — même
    // relocalisation, sinon un changement d'hôte en pleine ITT décalerait
    // (ou effacerait) l'immobilisation pour les invités.
    out.residents = out.residents.map(r => (r && typeof r.injuredUntil === "number" && r.injuredUntil > 0) ? { ...r, injuredUntil: r.injuredUntil + shift } : r);
    // Chantier v363 ("plus aucun PNJ figé", demande Guillaume) : deux autres
    // horodatages HÔTE des résidents manquaient à la relocalisation.
    //  - shopPhaseUntil : alternance dehors/à l'intérieur de la boulangerie
    //    (Chloé/Rosalie, voir updateBakeryVisibility). Non relocalisé, un
    //    changement d'hôte pouvait le projeter loin dans le futur -> la
    //    boulangère restait invisible (« à l'intérieur ») ou plantée dehors
    //    pendant très longtemps.
    //  - tjReact.startAt / tjReact.returnAt : attroupement autour de la bagarre
    //    T/J. Même symptôme, mais bien plus visible : `if (now < rc.startAt)
    //    return;` figeait totalement le résident (voir residentRoam). C'est
    //    l'une des causes possibles du « Eduardo reste figé » remonté par
    //    Guillaume, en plus du bug de position (corrigé côté FermeGame.js).
    //    Idem côté visiteurs, traité plus haut dans out.visitors.
    out.residents = out.residents.map(r => {
      if (!r) return r;
      let changed = false; const nr = { ...r };
      if (typeof nr.shopPhaseUntil === "number" && nr.shopPhaseUntil > 0) { nr.shopPhaseUntil += shift; changed = true; }
      if (nr.tjReact && typeof nr.tjReact === "object") {
        const rc = { ...nr.tjReact };
        for (const k of ["startAt", "returnAt"]) {
          if (typeof rc[k] === "number" && rc[k] > 0) { rc[k] += shift; changed = true; }
        }
        nr.tjReact = rc;
      }
      return changed ? nr : r;
    });
    // Zip 259 : idem pour l'heure de retour des ex-résidents exclus.
    out.exiles = out.exiles.map(e => (e && typeof e.returnAt === "number" && e.returnAt > 0) ? { ...e, returnAt: e.returnAt + shift } : e);
    // Chantier "rivalité Tristan/Jérôme" : mêmes horodatages hôte que
    // ci-dessus pour la scène de provocation en cours + les deux cooldowns.
    if (out.tjBrawl && typeof out.tjBrawl.stepUntil === "number" && out.tjBrawl.stepUntil > 0) out.tjBrawl.stepUntil += shift;
    if (out.tjNextStormAt > 0) out.tjNextStormAt += shift;
    if (out.tjBrawlCooldownUntil > 0) out.tjBrawlCooldownUntil += shift;
    // Correctif "dispute Chloé/Rosalie vue de tous" : mêmes horodatages hôte que tjBrawl.
    if (out.crScene && typeof out.crScene.stepUntil === "number" && out.crScene.stepUntil > 0) out.crScene.stepUntil += shift;
    if (out.crNextCooldownUntil > 0) out.crNextCooldownUntil += shift;
  }
  return out;
}

// Zip 252 : ateliers d'artisans + stock de produits artisanaux (communs).
export function newCrafts() {
  const c = {};
  for (const bid of Object.keys(C.ARTISAN_BUILDINGS)) c[bid] = { built: false, nextAt: 0 };
  return c;
}
export function migrateCrafts(cr) {
  const out = newCrafts();
  if (cr && typeof cr === "object") for (const bid of Object.keys(out)) {
    // Zip 258 : on conserve le flag `alert` de la boulangerie (rupture
    // d'ingrédients). Zip 259 : on conserve aussi `pos` (position déplaçable
    // du bâtiment, voir moveArtisan) à travers synchros invité et changements
    // d'hôte — sinon un bâtiment déplacé "sauterait" à son site d'origine.
    if (cr[bid] && typeof cr[bid] === "object") {
      // Correctif "persistance de la presse à canne" (retour Guillaume) :
      // `nextAt` est un horodatage ABSOLU (Date.now() + délai, potentiellement
      // ~1,7 * 10^12 ms). `| 0` (OU bit à bit) convertit en entier 32 bits
      // SIGNÉ (ToInt32) : bien au-delà de ±2^31 (~2,1 milliard), la valeur
      // "wrap" en un nombre quasi aléatoire, presque toujours très inférieur
      // à l'heure réelle. Au rechargement suivant, le rattrapage de
      // production (sucrerieTick et consorts) croit alors avoir un retard
      // énorme et vide le stock déposé (canne, pain...) d'un coup pour
      // produire en rafale. `|| 0` (OU logique, simple filet anti-NaN/undefined
      // comme partout ailleurs dans le fichier, ex. serializeMills) ne tronque
      // rien et corrige le problème pour TOUS les ateliers (pas seulement la
      // sucrerie).
      out[bid] = { built: !!cr[bid].built, nextAt: cr[bid].nextAt || 0, alert: !!cr[bid].alert };
      if (cr[bid].pos && typeof cr[bid].pos.x === "number" && typeof cr[bid].pos.y === "number") out[bid].pos = { x: cr[bid].pos.x, y: cr[bid].pos.y };
      // Zip 301 : préserver le réglage du ratio fromage/beurre (fromagerie) et
      // les bookkeepings de production de Rosalie (bakery) à travers les
      // synchros invité et les changements d'hôte.
      if (bid === "fromagerie") {
        if (typeof cr[bid].butterPct === "number") out[bid].butterPct = Math.max(0, Math.min(100, cr[bid].butterPct | 0));
        if (typeof cr[bid].ratioAcc === "number") out[bid].ratioAcc = cr[bid].ratioAcc;
      }
      if (bid === "bakery") {
        // Même correctif que nextAt ci-dessus : breadNextAt est lui aussi un
        // horodatage absolu, pas un petit entier — `| 0` le tronquait pareil.
        if (typeof cr[bid].breadNextAt === "number") out[bid].breadNextAt = cr[bid].breadNextAt || 0;
        if (typeof cr[bid].viennoIdx === "number") out[bid].viennoIdx = cr[bid].viennoIdx | 0;
      }
      // Chantier "sucrerie déplaçable" (2026-07, demande Guillaume) : la
      // sucrerie a rejoint ce modèle crafts[bid] générique. Contrairement aux
      // autres artisans (production passive liée au résident, pas de dépôt
      // joueur), elle garde un STOCK de canne déposée (mêmes mécaniques que
      // sucrerieTick/resolveAct "sucrerieDeposit" du chantier canne à sucre,
      // simplement stocké ici au lieu de world.sucreries) — `nextAt` (déjà
      // générique ci-dessus) sert de minuteur de batch, exactement comme pour
      // world.mills/world.sucreries avant ce chantier.
      if (bid === "sucrerie" && typeof cr[bid].cane === "number") out[bid].cane = Math.max(0, cr[bid].cane | 0);
    }
  }
  return out;
}
// Zip 301 : nouveaux produits — beurre (fromagerie), pain + viennoiseries
// (Rosalie). migrateCraftStock itère sur Object.keys(out), donc l'ajout ici
// suffit à les faire persister/synchroniser.
export function newCraftStock() { return { honey: 0, cheeseWheel: 0, cheesePortion: 0, eclairChoco: 0, eclairVanilla: 0, flanVanilla: 0, gateauBasque: 0, butter: 0, bread: 0, croissant: 0, chocolatine: 0, painSuisse: 0, yogurtNature: 0, yogurtVanilla: 0 }; }
export function migrateCraftStock(s) {
  const out = newCraftStock();
  if (s && typeof s === "object") for (const k of Object.keys(out)) out[k] = Math.max(0, s[k] | 0);
  return out;
}
// Skill présent parmi les résidents installés ? (débloque l'achat d'atelier)
export function residentHasSkill(station, skill) {
  const list = (station && station.residents) || [];
  for (const r of list) { const ro = C.VISITOR_ROSTER[r.rid]; if (ro && ro.skill === skill) return true; }
  return false;
}
// Zip 376 (chantier Carla Garfield) : nombre de résidents PORTEURS D'UN SKILL
// installés sur la ferme. Sert de porte d'apparition à Carla (voir
// spawnVisitor et C.CARLA_MIN_ARTISANS). Volontairement écrit ici et non dans
// FermeGame.js : skilledResidents() y existe déjà mais vit côté rendu, alors
// que la porte se joue côté HÔTE, dans le tirage du train.
export function countSkilledResidents(station) {
  const list = (station && station.residents) || [];
  let n = 0;
  for (const r of list) { const ro = C.VISITOR_ROSTER[r.rid]; if (ro && ro.skill) n++; }
  return n;
}
// Chantier "rivalité Tristan/Jérôme" (2026-07) : variante de residentHasSkill
// qui exige EN PLUS que le résident ne soit pas en ITT (injuredUntil) — sert
// à couper la production continue (sucrerie de Jérôme) pendant une
// immobilisation post-bagarre, sans toucher au reste de residentHasSkill
// (utilisé ailleurs juste pour débloquer l'achat d'un atelier).
export function residentActiveSkill(station, skill, now) {
  const list = (station && station.residents) || [];
  for (const r of list) {
    const ro = C.VISITOR_ROSTER[r.rid];
    if (ro && ro.skill === skill) return !(r.injuredUntil && r.injuredUntil > (now || Date.now()));
  }
  return false;
}

// Zip 251: normalise la liste des décorations posées (ferme + Valley Town).
// Chaque entrée : { did, deco, x, y, zone: "farm"|"town", owner }. Filtrée aux
// ids connus et aux coordonnées valides. `did` = identifiant unique stable
// (attribué à la pose) utilisé par l'outil main pour cibler/déplacer/reprendre.
export function migrateDecor(list) {
  if (!Array.isArray(list)) return [];
  const known = new Set(C.UNIQUE_DECORATIONS.map(d => d.id));
  return list
    .filter(e => e && known.has(e.deco) && typeof e.x === "number" && typeof e.y === "number")
    .map(e => ({ did: e.did | 0, deco: e.deco, x: +e.x, y: +e.y, zone: e.zone === "town" ? "town" : "farm", owner: e.owner || null }));
}

// Farm popularity score: how established the place looks. Feeds the organic
// "people are curious about your farm" visits (no ad needed). Deliberately
// coarse; every term is capped so no single stat dominates.
export function farmPopularity(s, w) {
  let pop = 0;
  pop += Math.min(10, (s.animals || []).length);                 // livestock
  pop += Math.min(6, (s.horses || []).length * 2);               // horses
  // Zip 368 : le terme `+ (s.coop ? 2 : 0)` (mission d'équipe en cours) est
  // parti avec les missions d'équipe. Arbitrage Guillaume : on ne le reporte
  // sur rien — le score maximal passe de ~56 à ~54, les visites spontanées
  // deviennent donc très légèrement plus rares. C'était un bonus « chantier
  // en cours » : sans chantier, il n'a plus d'objet.
  pop += (s.wellBuilt ? 2 : 0);
  pop += s.barn ? Math.min(6, (s.barn.level || 0) * 2) : 0;
  pop += s.house ? Math.min(6, ((s.house.level || 1) - 1) * 3) : 0;
  pop += Math.min(10, Math.floor((s.totalEarned || 0) / 2000));  // trade history
  pop += Math.min(6, ((s.station && s.station.residents) || []).length * 2);
  // Zip 234: total friendship makes the farm popular too — friends spread the
  // word, so the next visit round comes sooner (see scheduleNextVisit).
  const relSum = Object.values((s.station && s.station.rel) || {}).reduce((a, b) => a + (b || 0), 0);
  pop += Math.min(C.REL_POP_MAX, Math.floor(relSum / C.REL_POP_DIV));
  return pop; // 0..~56
}

// Valley Town (zip 234): a second map like the evil world — fixed seed, built
// locally by whoever rides the train, never persisted — but MULTIPLAYER
// (players in zone "town" publish real positions and see each other; see
// pubMe/drawTownFrame in FermeGame.js). Ground only: streets, a paved plaza,
// a 2x2 fountain pool, a platform by the rails, and grass. House sprites,
// rails and signs are drawn client-side from the TOWN_* constants; trees stay
// world objects so the existing sprite/collision patterns apply.
/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ZIP 425 — GÉNÉRATEUR REFAIT POUR LA CARTE 192×144 (voir l'en-tête des
   constantes TOWN_* dans fermeConstants.js).
   ───────────────────────────────────────────────────────────────────────────
   Il rend maintenant CINQ tableaux au lieu de trois, et les deux nouveaux
   portent tout ce que la refonte ajoute :

     `elev`  — l'altitude de chaque case, en unités (0, 1, 2 et les quarts
               intermédiaires des marches). Voir la longue note de TOWN_ELEV_PX.
     `solid` — les cases infranchissables, CALCULÉES UNE FOIS ICI.

   ⚠️ POURQUOI `solid` PLUTÔT QU'UN TEST À LA VOLÉE. `blockedTown` était une
   boucle sur TOWN_HOUSES, appelée quatre fois par déplacement. Avec huit
   maisons c'était invisible ; avec vingt maisons, trois monuments, les bancs,
   les lampadaires et les jardinières, ça devenait une centaine de comparaisons
   par image pour une information qui NE CHANGE JAMAIS — la ville est
   regénérée à l'identique et rien ne s'y construit. On la calcule donc au
   moment où on la connaît, et la collision redevient une lecture de tableau.
   ⚠️ Corollaire : tout ce qui bloque doit être marqué ICI. Un décor ajouté
   plus tard et dessiné sans être marqué serait TRAVERSABLE, sans erreur.
   ═══════════════════════════════════════════════════════════════════════════ */
export function generateTownWorld() {
  const W = C.TOWN_MAP_W, H = C.TOWN_MAP_H;
  const rnd = makeRng(0x7041); // fixed seed: one Valley Town for everyone
  const ground = new Array(W * H).fill(C.G_GRASS);
  const objects = new Array(W * H).fill(C.O_NONE);
  const objHp = new Map();
  const elev = new Float32Array(W * H);      // 425 : altitude, voir TOWN_ELEV_PX
  const solid = new Uint8Array(W * H);       // 425 : cases bloquées, pré-calculées
  const props = [];                          // 425 : mobilier urbain (dessiné client-side)
  /* ⚠️ 425 — LES HAIES SONT UNE COUCHE, PAS UNE LISTE D'OBJETS. Il y en a
     plusieurs centaines (le pourtour de vingt jardins, les bordures du parc et
     du verger) : une liste obligerait le rendu à la parcourir en entier à
     chaque image pour savoir quoi dessiner dans la fenêtre visible, alors qu'un
     tableau parallèle se lit en même temps que le sol, à l'index qu'on a déjà.
     C'est le même raisonnement que `solid`. */
  const hedge = new Uint8Array(W * H);
  const id = (x, y) => y * W + x;
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const rect = (r, fn) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (inMap(x, y)) fn(x, y, id(x, y));
  };

  /* ---------------------------------------------------------------- RELIEF
     Il est posé EN PREMIER, avant la moindre rue, et l'ordre compte : tout ce
     qui suit consulte `elev` pour ne pas paver une falaise ni planter un arbre
     sur une marche. Une rue tracée avant le relief aurait fallu être
     re-découpée après, ce qui est exactement la sorte de reprise qui laisse
     un pavé orphelin au bord d'un à-pic. */
  rect(C.TOWN_UPPER, (x, y, i) => { elev[i] = 1; });
  rect(C.TOWN_BELVEDERE, (x, y, i) => { elev[i] = 2; });
  for (const st of C.TOWN_STAIRS) {
    const span = st.to - st.from;
    for (let k = 0; k < st.len; k++) {
      /* La marche la plus proche du palier haut porte presque son altitude, la
         plus basse presque celle du sol : `len + 1` intervalles pour `len`
         marches, donc AUCUN saut ne dépasse span/(len+1) — soit 0,2 avec les
         réglages actuels, sous TOWN_STEP_MAX. C'est ce qui rend l'escalier
         franchissable SANS aucun cas particulier dans la collision. */
      const h = st.dir === "e"
        ? st.to - span * (st.len - k) / (st.len + 1)
        : st.to - span * (k + 1) / (st.len + 1);
      for (let w = 0; w < st.w; w++) {
        const x = st.dir === "e" ? st.x + k : st.x + w;
        const y = st.dir === "e" ? st.y + w : st.y + k;
        if (!inMap(x, y)) continue;
        elev[id(x, y)] = h;
        ground[id(x, y)] = C.G_TOWN_STAIR;
      }
    }
  }

  /* ------------------------------------------------------------------ RUES
     ⚠️ UNE RUE S'ARRÊTE AU PIED D'UNE FALAISE. `paveRun` refuse toute case
     dont l'altitude n'est pas nulle : sans ce test, l'artère de l'est
     (colonne 150) montait tout droit sur la terrasse et l'on aurait vu une
     rue pavée grimper un à-pic de quatorze pixels. C'est le genre de défaut
     qu'aucune erreur ne signale et qu'on ne voit qu'en s'y promenant. */
  const paveRow = (y0, x0, x1) => {
    for (let x = x0; x <= x1; x++) for (let dy = 0; dy < 2; dy++) {
      if (inMap(x, y0 + dy) && elev[id(x, y0 + dy)] === 0) ground[id(x, y0 + dy)] = C.G_PATH;
    }
  };
  const paveCol = (x0, y0, y1) => {
    for (let y = y0; y <= y1; y++) for (let dx = 0; dx < 2; dx++) {
      if (inMap(x0 + dx, y) && elev[id(x0 + dx, y)] === 0) ground[id(x0 + dx, y)] = C.G_PATH;
    }
  };
  for (const ry of C.TOWN_ST_ROWS) paveRow(ry, ry === C.TOWN_MAIN_ST_Y ? C.TOWN_PLATFORM.x : 10, W - 3);
  /* ⚠️ 426 — UNE ARTÈRE NORD-SUD S'ARRÊTE À LA DERNIÈRE AVENUE, pas au bord de
     la carte. Elle allait jusqu'à H-11 ; avec le lac du sud, deux d'entre elles
     descendaient droit dans l'eau (le pavage refuse l'eau, mais s'arrêtait donc
     sur un bord déchiqueté, à un pas du rivage). Une rue finit à un carrefour :
     on le DÉRIVE de TOWN_ST_ROWS plutôt que d'écrire un nombre qui mentirait au
     prochain déplacement d'avenue. */
  const lastRow = C.TOWN_ST_ROWS[C.TOWN_ST_ROWS.length - 1];
  for (const cx of C.TOWN_ST_COLS) paveCol(cx, 10, lastRow + 1);
  // La promenade de la Haute-Ville : une rue à elle, sur la terrasse, sinon la
  // terrasse est un plateau nu qu'on traverse dans l'herbe.
  for (let x = C.TOWN_UPPER.x + 1; x < C.TOWN_UPPER.x + C.TOWN_UPPER.w - 1; x++) {
    for (let dy = 0; dy < 2; dy++) {
      const y = C.TOWN_UPPER.y + C.TOWN_UPPER.h - 4 + dy;
      if (inMap(x, y) && elev[id(x, y)] === 1) ground[id(x, y)] = C.G_PATH;
    }
  }

  /* ------------------------------------------------------- PLACE CENTRALE
     Demande de Guillaume : « améliorer la place centrale pour la rendre plus
     soignée graphiquement ». Elle était douze cases sur douze, entièrement
     dallées, avec un bassin au milieu — c'est-à-dire un parking.
     Ce qui la rend soignée tient en quatre choses, et aucune n'est un dessin
     plus détaillé : une BORDURE (le dallage s'arrête net, il ne se fond pas
     dans l'herbe), des PARTERRES engazonnés qui cassent la surface, une
     SYMÉTRIE nord-sud autour de la rue qui la traverse, et du MOBILIER posé
     sur des axes plutôt que semé. */
  rect(C.TOWN_PLAZA, (x, y, i) => { ground[i] = C.G_PATH_STONE; });
  const pz = C.TOWN_PLAZA;
  // Quatre parterres, aux quatre angles, à trois cases des bords.
  for (const [ox, oy] of [[3, 3], [pz.w - 8, 3], [3, pz.h - 8], [pz.w - 8, pz.h - 8]]) {
    rect({ x: pz.x + ox, y: pz.y + oy, w: 5, h: 5 }, (x, y, i) => { ground[i] = C.G_TOWN_LAWN; });
  }
  // Le bassin de la fontaine (l'eau bloque, comme partout).
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) ground[id(C.TOWN_FOUNTAIN.x + dx, C.TOWN_FOUNTAIN.y + dy)] = C.G_WATER;
  // Le monument, pendant sud de la fontaine : il bloque, il n'est pas de l'eau.
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) solid[id(C.TOWN_MONUMENT.x + dx, C.TOWN_MONUMENT.y + dy)] = 1;

  /* Le mobilier. Il est posé sur des AXES (les médianes de la place, les bords
     de la rue principale) et jamais au hasard : c'est la différence entre une
     place dessinée et une place saupoudrée. */
  const addProp = (x, y, kind, blocks) => {
    if (!inMap(x, y)) return;
    props.push({ x, y, kind });
    if (blocks) solid[id(x, y)] = 1;
  };
  // Lampadaires : les quatre angles de la place, plus deux paires en garde
  // d'honneur de part et d'autre de la fontaine et du monument.
  for (const [lx, ly] of [
    [pz.x + 1, pz.y + 1], [pz.x + pz.w - 2, pz.y + 1],
    [pz.x + 1, pz.y + pz.h - 2], [pz.x + pz.w - 2, pz.y + pz.h - 2],
    [C.TOWN_FOUNTAIN.x - 3, C.TOWN_FOUNTAIN.y], [C.TOWN_FOUNTAIN.x + 4, C.TOWN_FOUNTAIN.y],
    [C.TOWN_MONUMENT.x - 3, C.TOWN_MONUMENT.y + 1], [C.TOWN_MONUMENT.x + 4, C.TOWN_MONUMENT.y + 1],
  ]) addProp(lx, ly, "lamp", true);
  // Bancs : tournés vers la fontaine au nord, vers le monument au sud.
  for (const [bx, by] of [
    [C.TOWN_FOUNTAIN.x - 2, C.TOWN_FOUNTAIN.y + 3], [C.TOWN_FOUNTAIN.x + 2, C.TOWN_FOUNTAIN.y + 3],
    [C.TOWN_MONUMENT.x - 2, C.TOWN_MONUMENT.y - 2], [C.TOWN_MONUMENT.x + 2, C.TOWN_MONUMENT.y - 2],
  ]) addProp(bx, by, "bench", true);
  // Arbres taillés au centre de chaque parterre : quatre masses vertes qui
  // donnent son échelle à la place.
  for (const [ox, oy] of [[5, 5], [pz.w - 6, 5], [5, pz.h - 6], [pz.w - 6, pz.h - 6]]) {
    addProp(pz.x + ox, pz.y + oy, "topiary", true);
  }
  /* Lampadaires le long de la rue principale, tous les huit pas, hors place.
     ⚠️ 426 — ET JAMAIS SUR UN CARREFOUR. Le banc de circulation
     (tools/verify-vallee.mjs) l'a trouvé dès sa première exécution : avec la
     nouvelle artère x = 196, un lampadaire de cette boucle tombait pile au
     milieu de la chaussée et coupait la rue en deux. Il était parfaitement
     visible — donc pas un « mur invisible » — mais tout aussi infranchissable.
     ⚠️ LA LEÇON : un décor posé sur une trame régulière rencontrera un jour une
     AUTRE trame régulière. On teste donc le sol, qui sait déjà tout. */
  for (let x = 12; x < W - 6; x += 8) {
    if (x >= pz.x - 1 && x < pz.x + pz.w + 1) continue;
    const li = id(x, C.TOWN_MAIN_ST_Y - 1);
    if (ground[li] === C.G_PATH || ground[li] === C.G_PATH_STONE || solid[li]) continue;
    addProp(x, C.TOWN_MAIN_ST_Y - 1, "lamp", true);
  }

  /* ------------------------------------------------- PARVIS DES MONUMENTS
     ⚠️⚠️ LE PREMIER JET DONNAIT UN GRAND RECTANGLE GRIS AUTOUR DE CHAQUE
     BÂTIMENT, ET ÇA NE MARCHAIT PAS DU TOUT — le banc de rendu l'a montré tout
     de suite : l'église et l'hôtel de ville flottaient sur des dalles grises
     posées dans l'herbe, sans le moindre chemin pour y arriver. Un parvis n'est
     pas un socle : c'est un ESPACE DEVANT, et il est RELIÉ À LA RUE.

     Trois choses, donc, et les trois comptent :
       1. le dallage ne déborde que d'une case sur les côtés et se développe
          DEVANT (au sud), là où l'on arrive ;
       2. une allée le raccorde à la rue la plus proche — sans elle, le bâtiment
          n'appartient à rien ;
       3. une bordure de gazon sur les flancs, pour que la pierre ne se répande
          pas jusqu'à l'herbe sans transition. */
  const forecourt = (b, front) => {
    const e0 = elev[id(b.x, b.y)];
    rect({ x: b.x - 1, y: b.y, w: b.w + 2, h: b.h + front }, (x, y, i) => {
      if (elev[i] === e0) ground[i] = C.G_PATH_STONE;
    });
    // Gazon sur les flancs : la transition pierre → herbe.
    for (const sx of [b.x - 3, b.x + b.w + 1]) {
      rect({ x: sx, y: b.y, w: 2, h: b.h + front }, (x, y, i) => {
        if (elev[i] === e0 && ground[i] === C.G_GRASS) ground[i] = C.G_TOWN_LAWN;
      });
    }
    // L'allée jusqu'à la rue : deux cases de large, dans l'axe de la porte.
    const doorX = b.x + Math.floor(b.w / 2) - 1, y0 = b.y + b.h + front;
    const street = C.TOWN_ST_ROWS.find((r) => r >= y0 && r - y0 <= 14);
    if (street !== undefined) {
      for (let y = y0; y <= street + 1; y++) {
        if (!inMap(doorX, y) || elev[id(doorX, y)] !== e0) break;
        ground[id(doorX, y)] = C.G_PATH; ground[id(doorX + 1, y)] = C.G_PATH;
      }
    }
  };
  forecourt(C.TOWN_CHURCH, 5);
  forecourt(C.TOWN_HALL, 4);
  forecourt(C.TOWN_COURT, 6);
  /* ZIP 427 — LES DEUX COMMERCES DE LA HAUTE-VILLE. Ils passent par le MÊME
     `forecourt` que les monuments, et ce n'est pas de la paresse : c'est lui qui
     dalle le devant, pose le gazon des flancs et tire l'allée jusqu'à la rue. Un
     bâtiment posé sans lui aurait été une boîte dans l'herbe — et se serait vu
     immédiatement à côté de trois monuments qui, eux, ont leur parvis.
     ⚠️ Un parvis COURT (2) : la promenade de la terrasse passe à quatre rangées
     du bord (voir plus haut), un parvis profond l'aurait avalée. */
  forecourt(C.TOWN_BOUTIQUE, 2);
  forecourt(C.TOWN_SALON, 2);
  for (const b of [C.TOWN_CHURCH, C.TOWN_HALL, C.TOWN_COURT, C.TOWN_BOUTIQUE, C.TOWN_SALON]) rect(b, (x, y, i) => { solid[i] = 1; });

  /* --------------------------------------------------------- LES MAISONS
     Empreinte bloquante + allée jusqu'à la rue SOUS la parcelle.
     ⚠️ L'ALLÉE S'ARRÊTE DÈS QUE L'ALTITUDE CHANGE. Les deux parcelles de la
     terrasse n'ont pas de rue en dessous — elles ont un à-pic. Sans ce test,
     leur allée descendait le vide en pavés flottants. */
  for (const hsn of C.TOWN_HOUSES) {
    rect({ x: hsn.x, y: hsn.y, w: C.TOWN_HOUSE_W, h: C.TOWN_HOUSE_H }, (x, y, i) => { solid[i] = 1; });
    const doorX = hsn.x + 2, doorY = hsn.y + C.TOWN_HOUSE_H;
    const e0 = inMap(doorX, doorY) ? elev[id(doorX, doorY)] : 0;
    /* ⚠️ LE JARDIN CLOS (425). C'est LA correction qui transforme la carte.
       Vingt maisons posées dans une prairie donnent un lotissement fantôme :
       rien ne dit où finit l'une et où commence l'autre, et tout l'espace entre
       les rues reste un pré. Un jardin — gazon + haie sur le pourtour, avec une
       ouverture devant la porte — donne d'un coup une PARCELLE, donc une ville.
       ⚠️ La haie borne, elle n'enferme pas : l'ouverture est garantie plus bas
       en effaçant la haie sur l'allée, APRÈS l'avoir posée. Poser la haie « sauf
       devant la porte » aurait marché aussi, mais un jour un décalage d'une case
       aurait muré quelqu'un chez lui — et personne n'aurait pu le faire sortir. */
    const gx = hsn.x - 2, gy = hsn.y - 1, gw = C.TOWN_HOUSE_W + 4, gh = C.TOWN_HOUSE_H + 4;
    rect({ x: gx, y: gy, w: gw, h: gh }, (x, y, i) => {
      if (elev[i] !== e0 || solid[i] || ground[i] === C.G_PATH || ground[i] === C.G_PATH_STONE) return;
      const edge = (x === gx || x === gx + gw - 1 || y === gy || y === gy + gh - 1);
      if (edge) hedge[i] = 1; else if (ground[i] === C.G_GRASS) ground[i] = C.G_TOWN_LAWN;
    });
    const street = C.TOWN_ST_ROWS.find((r) => r >= doorY && r - doorY <= 8);
    const last = street === undefined ? doorY + 2 : street;
    for (let y = doorY; y <= last; y++) {
      if (!inMap(doorX, y) || elev[id(doorX, y)] !== e0) break;
      for (const dx of [0, 1]) {
        const i = id(doorX + dx, y);
        ground[i] = C.G_PATH; hedge[i] = 0;      // l'allée perce la haie
      }
    }
  }
  for (let i = 0; i < W * H; i++) if (hedge[i]) solid[i] = 1;

  /* ═══════════════════════════════════════════════════════════════════════
     LES TROIS ÎLOTS OCCUPÉS (425) — parc, verger, champ de foire.
     ───────────────────────────────────────────────────────────────────────
     ⚠️ ILS EXISTENT PARCE QUE LE BANC DE RENDU A MONTRÉ UNE PRAIRIE. Multiplier
     la surface par neuf sans rien y mettre ne fait pas une grande ville : ça
     fait une petite ville perdue. Ces trois-là occupent les trois plus grands
     vides du centre. Il en reste d'autres, et c'est assumé — la parité avec la
     ferme est un chantier de plusieurs sessions, pas une case à cocher.
     ═══════════════════════════════════════════════════════════════════════ */
  const plantTree = (x, y) => {
    if (!inMap(x, y)) return;
    const i = id(x, y);
    if (solid[i] || objects[i] !== C.O_NONE) return;
    if (ground[i] === C.G_PATH || ground[i] === C.G_PATH_STONE || ground[i] === C.G_WATER || ground[i] === C.G_TOWN_STAIR) return;
    objects[i] = rnd() < 0.5 ? C.O_TREE : C.O_TREE2; objHp.set(i, C.TREE_HP);
  };
  // LE PARC : gazon, un étang, une allée en croix, des bancs au bord de l'eau.
  {
    const p = C.TOWN_PARK;
    rect(p, (x, y, i) => { if (ground[i] === C.G_GRASS) ground[i] = C.G_TOWN_LAWN; });
    const cx = p.x + (p.w >> 1), cy = p.y + (p.h >> 1);
    for (let x = p.x; x < p.x + p.w; x++) for (const dy of [0, 1]) ground[id(x, cy + dy)] = C.G_PATH;
    for (let y = p.y; y < p.y + p.h; y++) for (const dx of [0, 1]) ground[id(cx + dx, y)] = C.G_PATH;
    // L'étang, dans le quart nord-ouest, en ovale grossier.
    const px0 = p.x + 4, py0 = p.y + 3, pw = 11, ph = 7;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const u = (x - (pw - 1) / 2) / ((pw - 1) / 2), v = (y - (ph - 1) / 2) / ((ph - 1) / 2);
      if (u * u + v * v <= 1) ground[id(px0 + x, py0 + y)] = C.G_WATER;
    }
    // Bordure d'arbres + bancs face à l'étang.
    for (let x = p.x; x < p.x + p.w; x += 3) { plantTree(x, p.y); plantTree(x + 1, p.y + p.h - 1); }
    for (let y = p.y + 2; y < p.y + p.h - 2; y += 4) { plantTree(p.x, y); plantTree(p.x + p.w - 1, y + 1); }
    for (const [bx, by] of [[px0 + 2, py0 + ph + 1], [px0 + 6, py0 + ph + 1]]) {
      if (inMap(bx, by) && !solid[id(bx, by)]) { props.push({ x: bx, y: by, kind: "bench" }); solid[id(bx, by)] = 1; }
    }
    for (const [tx, ty] of [[cx - 3, cy + 4], [cx + 4, cy + 4], [cx - 3, cy - 4], [cx + 4, cy - 4]]) {
      if (inMap(tx, ty) && !solid[id(tx, ty)] && ground[id(tx, ty)] !== C.G_WATER) { props.push({ x: tx, y: ty, kind: "topiary" }); solid[id(tx, ty)] = 1; }
    }
  }
  // LE VERGER : des arbres EN RANGS. C'est l'alignement qui dit « planté par
  // quelqu'un » — un semis aléatoire, à deux pas d'une rue, dit « friche ».
  {
    const o = C.TOWN_ORCHARD;
    rect(o, (x, y, i) => { if (ground[i] === C.G_GRASS) ground[i] = C.G_TOWN_LAWN; });
    for (let y = o.y + 1; y < o.y + o.h - 1; y += 4) for (let x = o.x + 1; x < o.x + o.w - 1; x += 3) plantTree(x, y);
    /* ⚠️⚠️ L'ALLÉE EST TRACÉE AVANT LA HAIE, ET C'EST TOUTE LA CORRECTION.
       Premier jet : haie sur tout le pourtour, sans ouverture. Le verger s'est
       refermé sur lui-même — 309 cases devenues inatteignables, dans une ville
       où l'on peut se promener partout ailleurs. Ça ne lève évidemment aucune
       erreur : c'est juste un enclos.
       ⚠️ LA LEÇON VAUT POUR TOUTE CLÔTURE : on perce d'abord le passage, on
       clôt ensuite ce qui reste. L'inverse (« poser la haie partout SAUF
       devant l'entrée ») marche aussi le jour où on l'écrit, et se casse au
       premier décalage d'une case — sans que rien ne le dise. C'est le même
       raisonnement que pour les allées de jardin plus haut.
       Le portail regarde l'est, vers la rue nord-sud la plus proche. */
    const gateY = o.y + (o.h >> 1);
    const street = C.TOWN_ST_COLS.find((cx2) => cx2 >= o.x + o.w);
    const upto = street === undefined ? o.x + o.w + 2 : street + 1;
    for (let x = o.x + 1; x <= upto; x++) for (const dy of [0, 1]) {
      const i = id(x, gateY + dy);
      if (!inMap(x, gateY + dy) || solid[i]) continue;
      ground[i] = C.G_PATH; objects[i] = C.O_NONE; objHp.delete(i); hedge[i] = 0;
    }
    rect(o, (x, y, i) => {
      const edge = (x === o.x || x === o.x + o.w - 1 || y === o.y || y === o.y + o.h - 1);
      if (edge && !solid[i] && objects[i] === C.O_NONE && ground[i] !== C.G_PATH) hedge[i] = 1;
    });
  }
  // LE CHAMP DE FOIRE : une esplanade dallée, bordée d'arbres et de lampadaires.
  // Elle ne sert encore à rien — c'est une PLACE À REMPLIR, et il en faut une.
  {
    const mk = C.TOWN_MARKET;
    rect(mk, (x, y, i) => { if (ground[i] === C.G_GRASS || ground[i] === C.G_TOWN_LAWN) ground[i] = C.G_PATH; });
    /* ⚠️⚠️ ZIP 431 — LE DALLAGE A UN NOMBRE IMPAIR DE COLONNES, ET C'EST CE QUI
       PERMET DE CENTRER QUOI QUE CE SOIT DESSUS. Retour de Guillaume, en jeu :
       « tout n'est pas bien centré, ça déborde un peu sur la gauche ». Il avait
       raison, et la cause n'était pas la rangée d'étals seule.
       Un décor est dessiné centré sur SA CASE, donc son axe tombe toujours sur
       un demi-pixel de case (x + 0,5). Un dallage de 22 colonnes (mk.w − 4) a
       son axe sur un JOINT entre deux cases : aucune rangée de décors ne peut
       s'y aligner, et il reste fatalement huit pixels d'écart d'un côté. En
       passant à 21 colonnes (mk.w − 5), l'axe du dallage EST une colonne — la
       50 — et tout ce qui s'y aligne tombe juste au pixel.
       ⚠️ La colonne perdue l'est à l'EST, sur la bordure de terre battue, qui
       fait donc 2 cases à l'ouest et 3 à l'est. Personne ne mesure une bordure
       de terre entre deux rangées d'arbres ; tout le monde voit un étal qui
       dépasse du dallage. */
    rect({ x: mk.x + 2, y: mk.y + 2, w: mk.w - 5, h: mk.h - 4 }, (x, y, i) => { ground[i] = C.G_PATH_STONE; });
    for (let x = mk.x; x < mk.x + mk.w; x += 5) { plantTree(x, mk.y - 1); plantTree(x + 2, mk.y + mk.h); }
    for (const [lx, ly] of [[mk.x + 1, mk.y + 1], [mk.x + mk.w - 2, mk.y + 1], [mk.x + 1, mk.y + mk.h - 2], [mk.x + mk.w - 2, mk.y + mk.h - 2]]) {
      if (inMap(lx, ly) && !solid[id(lx, ly)]) { props.push({ x: lx, y: ly, kind: "lamp" }); solid[id(lx, ly)] = 1; }
    }
  }
  /* ═══════════════════════════════════════════════════════════════════════
     ZIP 426 — CE QUI REMPLIT L'AGRANDISSEMENT, ET LE CHAMP DE FOIRE.
     ───────────────────────────────────────────────────────────────────────
     ⚠️ L'ORDRE DE CE BLOC N'EST PAS LIBRE : il vient APRÈS les rues, les
     parcelles et les trois îlots du 425 (il consulte `solid` et le dallage
     pour ne rien recouvrir), et AVANT la passe `hedge → solid` finale, sans
     quoi l'enclos du cimetière ne bloquerait rien. La leçon du 425 vaut aussi
     dans l'autre sens : une haie qui ne bloque pas est une clôture qu'on
     traverse, et ça ne lève pas plus d'erreur qu'un mur invisible.
     ═══════════════════════════════════════════════════════════════════════ */
  // ---- LE CHAMP DE FOIRE ENFIN OCCUPÉ. Le 425 l'a laissé nu en le disant
  // (« une PLACE À REMPLIR, et il en faut une ») : voilà la foire. Deux rangées
  // d'étals se faisant face de part et d'autre d'une allée centrale — c'est
  // l'allée qui fait le marché, des étals semés ne font qu'un entrepôt.
  {
    const mk = C.TOWN_MARKET;
    const axis = mk.y + (mk.h >> 1);          // l'allée centrale, laissée libre
    /* ⚠️ LA COULEUR DE LA BÂCHE EST CHOISIE ICI, PAS AU RENDU. Premier jet : le
       rendu la déduisait d'un hachage de la position — et comme les étals sont
       posés tous les QUATRE pas, tous ceux d'une rangée tombaient sur la même
       bâche. Un hachage non linéaire améliorait sans convaincre. Le générateur,
       lui, connaît l'INDICE de l'étal : il n'a pas à le deviner. C'est la règle
       du §8 de CLAUDE.md — ce qui peut être dérivé de la source ne se
       re-devine pas plus loin. */
    /* ⚠️⚠️ ZIP 431 — LES MÉTIERS SE DISTRIBUENT, ILS NE SE RÉPÈTENT PAS. Le 426
       faisait `stall++ % 4` sur dix étals : la rangée nord sortait 0,1,2,3,0 et
       la rangée sud 1,2,3,0,1, donc CINQ paires se faisaient face avec deux
       bâches consécutives identiques d'un côté. Avec six métiers et un décalage
       de trois entre les deux rangées, aucun étal n'a le même métier que son
       voisin NI que celui d'en face — c'est la seule chose qui compte, parce
       qu'on lit une foire par contraste avec ce qui est juste à côté. */
    /* ⚠️⚠️ ZIP 431 — L'AXE DE LA FOIRE EST UNE COLONNE, ET TOUT EN DÉCOULE.
       Retour de Guillaume, en jeu : « ça déborde un peu sur la gauche ». Il
       avait raison et le chiffre est net : la rangée commençait à une MARGE
       FIXE (`mk.x + 3`), pas au centre. Cinq étals espacés de quatre cases
       occupent seize cases de centres ; posés à partir de la colonne 41, leur
       axe tombait à 1,5 case à l'ouest de l'axe du dallage, et le premier étal
       — large de 52 px, donc débordant de 1,6 case de part et d'autre de sa
       case — mordait sur le bord de la pierre.
       ⚠️ LA LEÇON EST CELLE DU §8 : une position qui devrait être DÉDUITE d'un
       centre ne se règle pas à la main. Tout ce qui suit part maintenant de
       `AX`, la colonne médiane du dallage, et rien n'est recentré deux fois. */
    const NT = C.TOWN_STALL_TRADES.length;
    const NS = 5, GAP = 4;                    // cinq étals par rangée, un tous les quatre pas
    const AX = mk.x + 2 + ((mk.w - 5) >> 1);  // la colonne médiane du dallage (voir sa note)
    let stall = 0;
    for (const row of [axis - 3, axis + 2]) {
      const shift = stall ? 3 : 0;
      for (let k = 0; k < NS; k++) {
        const sx = AX - (((NS - 1) * GAP) >> 1) + k * GAP;
        if (!inMap(sx, row) || solid[id(sx, row)]) continue;
        props.push({ x: sx, y: row, kind: "stall", v: (k + shift) % NT });
        solid[id(sx, row)] = 1;
      }
      stall++;
    }
    // Le puits de la foire, au bout de l'allée : un point de rendez-vous, et
    // la raison pour laquelle un marché s'installe là plutôt qu'ailleurs.
    addProp(AX, axis + 6, "townWell", true);
    for (const d of [-9, 9]) addProp(AX + d, axis + 6, "crate", true);
    /* ═══════════════════════════════════════════════════════════════════════
       ZIP 431 — L'ARCHE D'ENTRÉE, ET POURQUOI ELLE COMPTE POUR DEUX PROPS.
       ───────────────────────────────────────────────────────────────────────
       ⚠️⚠️ ON VEUT PASSER DESSOUS. Une arche dont l'emprise entière bloque est
       un mur avec un trou dessiné dedans ; une arche qui ne bloque rien est un
       décor traversable, que le banc refuse à juste titre (« aucun décor n'est
       traversable »). La seule forme qui satisfait les deux est celle du monde
       réel : ce sont les DEUX POTEAUX qui sont solides, et l'espace entre eux
       ne l'est pas.
       On pose donc deux props `marketArch`, un par poteau, chacun solide sur SA
       case — donc chacun expliqué par le banc des murs invisibles — et chacun
       dessinant SA MOITIÉ du même sprite. Les deux moitiés se rejoignent au
       pixel parce qu'elles sont découpées dans une seule image, jamais dessinées
       séparément : deux demi-arches réglées à la main auraient fini décalées.
       ⚠️ ELLE EST AU NORD, pas au bout de l'allée. L'allée court d'est en ouest,
       et les sprites de ce jeu sont des FAÇADES vues de face : une arche posée à
       l'ouest de l'allée se présenterait de profil, c'est-à-dire de travers.
       Au nord, elle est dans l'axe de l'arrivée depuis la rue — on entre PAR
       elle, ce qui est tout son objet. */
    {
      /* ⚠️ L'ARCHE EST SUR LE MÊME AXE QUE LES ÉTALS (AX), et son sprite est
         dessiné centré sur la CASE `cx` — pas sur son joint. Les deux poteaux
         tombent alors exactement au milieu des cases AX±2, qui sont celles
         qu'on rend solides : le dessin et la collision coïncident au pixel. */
      const ay = mk.y + 2;
      for (const side of [-1, 1]) {
        const px2 = AX + side * 2;
        if (!inMap(px2, ay) || solid[id(px2, ay)]) continue;
        props.push({ x: px2, y: ay, kind: "marketArch", side, cx: AX });
        solid[id(px2, ay)] = 1;
      }
    }
    /* ⚠️ CE QUI TRAÎNE AUTOUR DES ÉTALS, ET C'EST LA MOITIÉ DU TRAVAIL. Dix
       étals parfaitement alignés dans une esplanade vide se lisent comme un
       salon professionnel, pas comme une foire. Ce qui fait le marché, c'est ce
       que les marchands ont POSÉ à côté d'eux en déballant : une charrette
       encore attelée, des tonneaux, des sacs entamés. Tout est contre le bord
       des rangées, jamais dans l'allée — l'allée doit rester une allée. */
    /* ⚠️ POSÉS EN ÉCART À L'AXE (±), jamais en marge depuis un bord : c'est ce
       qui garantit qu'ils restent symétriques le jour où le champ de foire
       change de taille — et c'est très exactement la faute qu'on vient de
       corriger sur la rangée d'étals. */
    for (const [dx2, oy, kind] of [
      [-9, axis - 5, "flowerCart"],
      [9, axis - 5, "barrel"],
      [-9, axis + 4, "sacks"],
      [9, axis + 4, "flowerCart"],
      [-5, axis + 4, "barrel"],
      [5, axis - 5, "sacks"],
    ]) addProp(AX + dx2, oy, kind, true);
  }
  // ---- LE KIOSQUE À MUSIQUE, dans le parc. Il occupe 3×3 cases : son emprise
  // entière bloque, sinon on marcherait au travers de son estrade.
  {
    const k = C.TOWN_KIOSK;
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      const x = k.x + dx, y = k.y + dy;
      if (!inMap(x, y)) continue;
      if (ground[id(x, y)] === C.G_WATER) continue;
      objects[id(x, y)] = C.O_NONE; objHp.delete(id(x, y));
      ground[id(x, y)] = C.G_PATH_STONE;
      solid[id(x, y)] = 1;
    }
    props.push({ x: k.x + 1, y: k.y + 2, kind: "kiosk" });   // dessiné depuis sa case du bas, au centre
  }
  // ---- LE CIMETIÈRE DE L'ÉGLISE. ⚠️ ON PERCE LE PORTAIL AVANT DE POSER
  // L'ENCLOS (règle du 425, verger) : l'allée est tracée d'abord, la haie
  // ensuite, et seulement là où il n'y a pas d'allée.
  {
    const cm = C.TOWN_CEMETERY;
    rect(cm, (x, y, i) => { if (ground[i] === C.G_GRASS) ground[i] = C.G_TOWN_LAWN; objects[i] = C.O_NONE; objHp.delete(i); });
    const gateX = cm.x + (cm.w >> 1);
    for (let y = cm.y + 1; y <= cm.y + cm.h; y++) for (const dx of [0, 1]) {
      const i = id(gateX + dx, y);
      if (inMap(gateX + dx, y) && !solid[i]) { ground[i] = C.G_PATH; hedge[i] = 0; }
    }
    rect(cm, (x, y, i) => {
      const edge = (x === cm.x || x === cm.x + cm.w - 1 || y === cm.y || y === cm.y + cm.h - 1);
      if (edge && !solid[i] && ground[i] !== C.G_PATH) hedge[i] = 1;
    });
    // Les tombes EN RANGS, comme les arbres du verger : c'est l'alignement qui
    // dit « entretenu ». Deux colonnes de part et d'autre de l'allée.
    for (let y = cm.y + 2; y < cm.y + cm.h - 2; y += 3) {
      for (const x of [cm.x + 2, cm.x + 4, cm.x + cm.w - 5, cm.x + cm.w - 3]) addProp(x, y, "grave", true);
    }
    plantTree(cm.x + 1, cm.y + cm.h - 2); plantTree(cm.x + cm.w - 2, cm.y + 1);
  }
  // ---- LE LAC DU SUD, SA PROMENADE ET SON PONTON.
  /* ⚠️⚠️ TOUT SE DÉDUIT DE LA LIGNE DE RIVAGE, ET C'EST LA CORRECTION QUI A
     SAUVÉ CE QUARTIER. Premier jet : l'eau était découpée par une ondulation,
     mais la promenade et le ponton restaient posés sur des lignes DROITES. Vu
     en jeu : une bande d'herbe traversait la promenade et l'eau, et le ponton
     partait du pré, à quatre cases du bord. Un ponton qui ne touche pas l'eau
     est la définition d'un décor faux.
     Il n'y a donc qu'UNE seule description du rivage — `shore(x)` — et la
     promenade, les bancs, les lampadaires et le ponton s'y accrochent tous. */
  {
    const lk = C.TOWN_LAKE;
    // Une ondulation lente et déterministe : deux sinus, jamais un tirage par
    // case (qui ferait de l'écume, pas une berge).
    const shore = (x) => lk.y + Math.round(Math.sin(x * 0.21) * 1.6 + Math.sin(x * 0.07 + 1.3) * 1.2);
    for (let x = lk.x; x < lk.x + lk.w; x++) {
      const sy = shore(x);
      for (let y = sy; y < lk.y + lk.h; y++) {
        if (!inMap(x, y)) continue;
        const i = id(x, y);
        if (solid[i] || ground[i] === C.G_PATH) continue;
        ground[i] = C.G_WATER; objects[i] = C.O_NONE; objHp.delete(i);
      }
      // La promenade : elle SUIT le rivage, deux rangées au-dessus de l'eau.
      for (let y = sy - C.TOWN_QUAY_H; y < sy; y++) {
        if (!inMap(x, y)) continue;
        const i = id(x, y);
        if (solid[i] || ground[i] === C.G_WATER) continue;
        ground[i] = C.G_PATH_STONE; objects[i] = C.O_NONE; objHp.delete(i);
      }
    }
    /* LE PONTON, POSÉ AVANT LE MOBILIER. Du bois SUR l'eau : il part de la
       promenade et s'avance. Il ne bloque pas — c'est le seul endroit d'où l'on
       marche au-dessus du lac.
       ⚠️ L'ORDRE N'EST PAS UN DÉTAIL : il EFFACE `solid` sur son emprise. Posé
       après les bancs, il en libérait un — un banc qu'on traverse, dessiné au
       milieu du ponton. Le banc de contrôle l'a vu (« aucun décor n'est
       traversable ») ; à l'œil, on aurait juste trouvé le ponton encombré. */
    const pierTop = shore(C.TOWN_PIER.x) - C.TOWN_QUAY_H;
    for (let y = pierTop; y < pierTop + C.TOWN_PIER.h + C.TOWN_QUAY_H; y++) {
      for (let x = C.TOWN_PIER.x; x < C.TOWN_PIER.x + C.TOWN_PIER.w; x++) {
        if (!inMap(x, y) || y >= lk.y + lk.h) continue;
        ground[id(x, y)] = C.G_BRIDGE; solid[id(x, y)] = 0; objects[id(x, y)] = C.O_NONE;
      }
    }
    const freeQuay = (x, y) => inMap(x, y) && !solid[id(x, y)] && ground[id(x, y)] !== C.G_BRIDGE && ground[id(x, y)] !== C.G_WATER;
    for (let x = lk.x + 4; x < lk.x + lk.w - 4; x += 8) {
      const sy = shore(x);
      if (freeQuay(x, sy - 1)) addProp(x, sy - 1, "bench", true);
      const lx = x + 4, ly = shore(lx) - 2;
      if (((x - lk.x) / 8) % 2 === 0 && freeQuay(lx, ly)) addProp(lx, ly, "lamp", true);
    }
  }
  // ---- LE QUARTIER DES ARTISANS, à l'est. Trois parcelles (TOWN_HOUSES) plus
  // un petit square d'atelier : des caisses, un puits, des lampadaires. Il ne
  // s'agit pas de meubler — un quartier sans mobilier de rue se lit comme un
  // lotissement posé la veille.
  {
    const ar = C.TOWN_ARTISANS;
    for (let y = ar.y + 6; y < ar.y + ar.h; y += 18) {
      addProp(ar.x + 14, y, "townWell", true);
      addProp(ar.x + 12, y + 1, "crate", true);
      addProp(ar.x + 16, y + 1, "crate", true);
    }
    for (let y = ar.y + 2; y < ar.y + ar.h; y += 12) addProp(ar.x + 9, y, "lamp", true);
  }
  // ---- LE MOBILIER QUI MANQUAIT PARTOUT AILLEURS.
  // Jardinières fleuries sur la place (elles cassent la pierre sans rien
  // bloquer de la circulation, posées le long des bords), panneaux aux
  // carrefours, statues en Haute-Ville.
  {
    const pz2 = C.TOWN_PLAZA;
    for (const [px2, py2] of [
      [pz2.x + 6, pz2.y + 1], [pz2.x + pz2.w - 7, pz2.y + 1],
      [pz2.x + 6, pz2.y + pz2.h - 2], [pz2.x + pz2.w - 7, pz2.y + pz2.h - 2],
      [pz2.x + 1, pz2.y + 8], [pz2.x + pz2.w - 2, pz2.y + 8],
      [pz2.x + 1, pz2.y + pz2.h - 9], [pz2.x + pz2.w - 2, pz2.y + pz2.h - 9],
    ]) addProp(px2, py2, "planter", true);
    // Un panneau à chaque croisement d'avenues : c'est ce qui rend une ville
    // ORIENTABLE. On le pose sur l'angle nord-ouest, hors chaussée.
    for (const ry of C.TOWN_ST_ROWS) for (const cx2 of C.TOWN_ST_COLS) {
      const sx = cx2 - 2, sy = ry - 1;
      if (!inMap(sx, sy)) continue;
      if (solid[id(sx, sy)] || ground[id(sx, sy)] === C.G_PATH) continue;
      addProp(sx, sy, "streetSign", true);
    }
    // Deux statues sur la terrasse : le belvédère et le parvis du tribunal se
    // regardent, il fallait quelque chose à regarder.
    addProp(C.TOWN_BELVEDERE.x + (C.TOWN_BELVEDERE.w >> 1), C.TOWN_BELVEDERE.y + 5, "statue", true);
    addProp(C.TOWN_COURT.x - 3, C.TOWN_COURT.y + C.TOWN_COURT.h + 3, "statue", true);
  }
  /* ═══ ZIP 427 — LE MOBILIER DE LA VIE SOCIALE ═══
     Trois ajouts, et chacun répond à une mécanique de ce zip plutôt qu'à un
     souci de décoration :
       * LE TABLEAU DES NOUVELLES, sur la place. C'est lui qui rend LISIBLE
         l'architecture sociale : qui est en ville, qui s'entend avec qui, qui
         s'évite. Sans lui, les affinités restent un fichier de constantes que
         personne ne voit jamais — exactement ce qu'elles étaient avant.
       * DEUX BANCS DE VITRINE devant la Maison Garfield. Un banc n'est pas un
         meuble ici, c'est une ACTIVITÉ (TOWN_ACTS.sit) : le poser devant la
         boutique, c'est décider qu'on vient s'y asseoir pour regarder les gens
         qui en sortent.
       * LE BANC DU PARVIS DU TRIBUNAL, pour la même raison — on attend son tour
         quelque part.
     ⚠️ AUCUN N'EST POSÉ DEVANT UNE PORTE. Les portes des deux commerces sont au
     milieu de leur façade sud (comme tous les bâtiments de la ville) : les bancs
     sont décalés aux extrémités, jamais dans l'axe. C'est la version « ville »
     du garde-fou `doorGuard` du tribunal (426), et le banc de contrôle le
     vérifie explicitement plutôt que de me croire sur parole. */
  {
    const bo = C.TOWN_BOUTIQUE, sa = C.TOWN_SALON;
    addProp(bo.x, bo.y + bo.h + 1, "bench", true);
    addProp(bo.x + bo.w - 1, bo.y + bo.h + 1, "bench", true);
    addProp(bo.x - 2, bo.y + bo.h, "lamp", true);
    addProp(bo.x + bo.w + 1, bo.y + bo.h, "lamp", true);
    addProp(sa.x + sa.w - 1, sa.y + sa.h + 1, "bench", true);
    addProp(C.TOWN_COURT.x + C.TOWN_COURT.w + 1, C.TOWN_COURT.y + C.TOWN_COURT.h + 4, "bench", true);
    // Le tableau des nouvelles : plein nord de la place, dans l'axe de la
    // fontaine, hors des parterres et hors de la chaussée qui la traverse.
    addProp(C.TOWN_PLAZA.x + 10, C.TOWN_PLAZA.y + 1, "newsBoard", true);
    /* ⚠️ ET UN PANNEAU AU PIED DES MARCHES. Une boutique qu'on ne découvre
       qu'en montant par hasard n'existe pas : c'est la version urbaine du
       principe du 426 (« un bâtiment muet passe pour cassé »). On le pose au
       bas de la volée la plus fréquentée — celle qui monte au tribunal — en
       DÉDUISANT sa position de TOWN_STAIRS, jamais en l'écrivant à la main. */
    const mainStair = C.TOWN_STAIRS[0];
    if (mainStair) {
      // Au PIED de la volée, décalé d'une case sur le côté : dans l'axe, il
      // barrerait l'escalier — et un panneau qu'on doit contourner pour monter
      // est pire que pas de panneau. La marche la plus BASSE est celle qui
      // s'éloigne du palier haut, donc la dernière de la boucle du générateur.
      const sx = mainStair.x - 2;
      const sy = mainStair.dir === "e" ? mainStair.y + mainStair.w + 1 : mainStair.y + mainStair.len - 1;
      if (inMap(sx, sy) && !solid[id(sx, sy)] && ground[id(sx, sy)] !== C.G_PATH) addProp(sx, sy, "streetSign", true);
    }
  }

  for (let i = 0; i < W * H; i++) if (hedge[i]) solid[i] = 1;

  /* LES ALIGNEMENTS D'ARBRES LE LONG DES AVENUES. Deux rangées régulières, en
     retrait d'une case du bitume. C'est ce qui donne aux rues leur épaisseur —
     une chaussée nue au milieu d'un pré n'est pas une avenue. */
  for (const ry of C.TOWN_ST_ROWS) {
    for (let x = 12; x < W - 8; x += 6) { plantTree(x, ry - 2); plantTree(x + 3, ry + 3); }
  }

  /* ------------------------------------------------------- LA GARE, LES RAILS
     Le quai est dallé pour se distinguer du ballast ; le reste du dessin des
     rails est client-side, comme avant. */
  rect(C.TOWN_PLATFORM, (x, y, i) => { ground[i] = C.G_PATH_STONE; });
  paveRow(C.TOWN_SPAWN.y - 1, C.TOWN_PLATFORM.x, C.TOWN_PLATFORM.x + 6);
  /* ZIP 427 — LE BÂTIMENT DE GARE (voir TOWN_STATION). Il complète le quai :
     une voie et des planches sans gare, c'est un arrêt de bus. Dallage devant
     lui pour le relier au quai, empreinte bloquante — un bâtiment traversable
     est la réciproque exacte du mur invisible du 425, et tout aussi muette. */
  {
    const ts = C.TOWN_STATION;
    rect({ x: ts.x - 1, y: ts.y, w: ts.w + 2, h: ts.h + 4 }, (x, y, i) => {
      if (elev[i] === 0 && ground[i] !== C.G_PATH) ground[i] = C.G_PATH_STONE;
    });
    rect(ts, (x, y, i) => { solid[i] = 1; objects[i] = C.O_NONE; objHp.delete(i); });
  }

  /* ------------------------------------------------------------- VERDURE
     Rideau d'arbres sur les quatre bords + semis léger. `clearOf` a gagné les
     tests qui manquaient : altitude non nulle, case déjà solide, dallage. */
  const clearOf = (x, y) => {
    const i = id(x, y);
    if (solid[i]) return false;
    if (ground[i] !== C.G_GRASS && ground[i] !== C.G_TOWN_LAWN) return false;
    if (x <= C.TOWN_RAIL_X + 2 && y >= C.TOWN_PLATFORM.y - 2 && y <= C.TOWN_PLATFORM.y + C.TOWN_PLATFORM.h + 2) return false;
    // Jamais sur un bord de falaise : l'arbre serait dessiné à cheval sur deux
    // altitudes et paraîtrait flotter.
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (inMap(x + dx, y + dy) && Math.abs(elev[id(x + dx, y + dy)] - elev[i]) > 0.01) return false;
    }
    for (const hsn of C.TOWN_HOUSES) {
      if (x >= hsn.x - 1 && x < hsn.x + C.TOWN_HOUSE_W + 1 && y >= hsn.y - 4 && y < hsn.y + C.TOWN_HOUSE_H + 2) return false;
    }
    return true;
  };
  const put = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < C.TOWN_RAIL_X + 2 || y < 1 || x >= W - 1 || y >= H - 1) return;
    /* ⚠️ 426 — LE CŒUR URBAIN REFUSE ENFIN LE SEMIS, et c'est un défaut du 425
       qu'on corrige, pas une nouveauté : la constante TOWN_CORE existait, son
       commentaire annonçait exactement cette règle... et RIEN NE LA LISAIT. Le
       semis tombait donc entre les rues, ce que le même commentaire décrit
       comme le défaut à éviter (« des arbres épars faisaient lire toute la
       ville comme une clairière »). Les arbres du centre sont PLANTÉS —
       alignements, parc, verger, cimetière, place ; ceux du semis peuplent la
       ceinture. ⚠️ Une constante que personne ne lit ment plus qu'elle
       n'informe : c'est le même piège qu'un stub qui retombe sur une valeur
       raisonnable (§10 de CLAUDE.md). */
    const cr = C.TOWN_CORE;
    if (x >= cr.x && y >= cr.y && x < cr.x + cr.w && y < cr.y + cr.h) return;
    const i = id(x, y);
    if (objects[i] !== C.O_NONE || !clearOf(x, y)) return;
    objects[i] = rnd() < 0.5 ? C.O_TREE : C.O_TREE2; objHp.set(i, C.TREE_HP);
  };
  for (let x = 5; x < W - 1; x += 1) { if (rnd() < 0.75) put(x, 1 + Math.floor(rnd() * 4)); if (rnd() < 0.75) put(x, H - 2 - Math.floor(rnd() * 4)); }
  for (let y = 1; y < H - 1; y += 1) if (rnd() < 0.75) put(W - 2 - Math.floor(rnd() * 4), y);
  // Le semis suit la surface : 70 arbres sur 3 072 cases faisaient un parc,
  // les mêmes 70 sur 27 648 auraient fait un désert.
  for (let i = 0; i < 620; i++) put(rnd() * W, rnd() * H);
  /* ⚠️⚠️ `hedge` FAIT PARTIE DU RETOUR, ET L'OUBLIER A COÛTÉ SIX CENTS MURS
     INVISIBLES. Premier jet : la couche était construite, servait à remplir
     `solid`... et n'était pas rendue. Le jeu recevait donc des centaines de
     cases bloquantes que RIEN ne dessinait — on butait dans le vide au milieu
     d'une pelouse, sans le moindre message d'erreur, et le rendu des haies que
     l'on venait d'écrire ne s'affichait jamais (il testait `tw.hedge`, qui
     valait `undefined`).
     ⚠️ LA LEÇON : une couche qui décide d'une COLLISION doit toujours sortir
     avec le monde, même quand on croit n'en avoir besoin que « pour construire
     autre chose ». Le contrôle qui l'a trouvée est simple et vaut d'être
     gardé : « toute case bloquante doit être dessinée par quelqu'un ». */
  return { w: W, h: H, ground, objects, objHp, elev, solid, props, hedge };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — LES ENDROITS OÙ L'ON VIT, DÉRIVÉS DE LA CARTE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CETTE LISTE N'EST PAS ÉCRITE, ELLE EST LUE. C'est l'application directe
   de la leçon la plus coûteuse du projet (§8 de CLAUDE.md) : « un paramètre qui
   DOUBLE un autre paramètre est une divergence en attente ; il doit être DÉRIVÉ,
   jamais réglé ». Une table de coordonnées « voici les bancs de Valley Town »
   posée à côté du générateur qui pose les bancs aurait tenu exactement jusqu'au
   jour où l'on déplace un banc — et le symptôme aurait été un résident debout
   dans le vide, en position assise, sans la moindre erreur.
   Donc : le mobilier vient de `tw.props` (c'est le générateur qui l'a posé), et
   les monuments viennent de leurs constantes (c'est là qu'ils sont définis).

   ⚠️ LE POINT RENVOYÉ EST OÙ L'ON SE TIENT, PAS L'OBJET. Un banc est SOLIDE :
   viser sa case, c'est viser un endroit où l'on ne peut pas aller. On vise donc
   la case du DESSOUS (`sy`), celle depuis laquelle on s'assoit — et le dessin
   « assis » posera le personnage sur le banc, décalé vers le haut.

   ⚠️ ET ELLE EST MISE EN CACHE À PART, JAMAIS SUR LE MONDE. `getTownWorldCached`
   rend un SINGLETON de module partagé par tous les remontages de l'onglet :
   écrire `tw.spots = …` dessus serait une mutation de la carte en cache, c'est-
   à-dire précisément l'interdit du §4. Le cache vit ici, il est purement dérivé,
   il ne porte aucun état de partie. */
const TOWN_SPOT_CACHE = { w: null, list: null };
export function townSpots(tw) {
  if (!tw) return [];
  if (TOWN_SPOT_CACHE.w === tw && TOWN_SPOT_CACHE.list) return TOWN_SPOT_CACHE.list;
  const list = [];
  const add = (x, y, act, extra) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) return;
    const i = y * tw.w + x;
    // Un endroit inaccessible n'est pas un endroit : on ne propose jamais une
    // destination sur une case solide, sur l'eau, ou sous un arbre.
    if (tw.solid[i] || tw.ground[i] === C.G_WATER) return;
    if (tw.objects[i] === C.O_TREE || tw.objects[i] === C.O_TREE2) return;
    /* ⚠️ ZIP 428 — ET ON S'Y TIENT DEBOUT, PAS SEULEMENT « LA CASE EST LIBRE ».
       Trois endroits (deux coins de la fontaine, une vitrine) passaient le test
       de case et échouaient au test de BOÎTE : le personnage fait 0,6 case de
       large, sa coordonnée exacte tombait dans le décor voisin. Le résident y
       arrivait puis se faisait refouler d'un demi-pas, indéfiniment. C'est le
       même défaut d'échelle que « la case du banc est solide » corrigé au 427,
       à un cran plus fin. */
    if (!townBoxFree(tw, x, y)) return;
    list.push({ x, y, act, ...(extra || {}) });
  };
  /* ⚠️⚠️ ZIP 428 — ON S'ASSOIT PAR LE CÔTÉ QUI EST LIBRE, PAS TOUJOURS PAR LE
     SUD. Le 427 posait le point d'assise sur la case AU SUD du banc, sans
     alternative. Ça marche pour les onze bancs de la place et du parc ; ça ne
     marche pas pour les TROIS BANCS DE LA PROMENADE DU LAC, dont le sud est…
     le lac. Leur point d'assise tombait dans l'eau, `add` le refusait en
     silence, et ces bancs-là n'existaient tout simplement pas pour les
     résidents — personne ne s'est jamais assis au bord du lac de Valley Town.
     Trouvé au 428 par le contrôle de couverture des quartiers, pas à l'œil :
     ça ne se voit qu'en remarquant une absence, et une absence ne se remarque
     pas.
     ⚠️ L'ORDRE DES CÔTÉS N'EST PAS ARBITRAIRE : le sud d'abord, parce que c'est
     l'orientation du sprite de banc (dossier en haut, assise en bas) et donc la
     seule où l'on s'assoit vraiment « dedans ». Les autres sont des replis, et
     ils valent mieux qu'un banc mort.
     ⚠️ Le point rendu est celui où l'on SE TIENT ; `bx/by` reste la case du
     banc, et c'est elle que le dessin utilise pour poser l'assis. Les deux ne
     coïncident plus forcément — c'est justement ce qui rend le repli possible. */
  /* ⚠️⚠️ ZIP 429 — UN BANC REND JUSQU'À TROIS ENDROITS, UN PAR PLACE. Le sprite
     fait 40 px de large : à une seule assise, deux résidents ne pouvaient pas
     s'y asseoir ensemble, et le seul banc du parc valait pour toute la ville.
     Chaque place a SON point où l'on se tient (on rejoint sa place par le
     côté, pas par le centre), et elles portent toutes le même `bx/by` — c'est
     le banc qui est le meuble, la place n'est qu'un décalage (`seat`).
     ⚠️ ON N'EXIGE PAS QUE LES TROIS SOIENT ACCESSIBLES. Un banc adossé à une
     haie n'en offrira qu'une ou deux, et c'est très bien : mieux vaut un banc
     à une place qu'un banc refusé. C'est la même règle que les quatre côtés
     ci-dessous — on cherche, on garde ce qui passe. */
  const addBench = (pr) => {
    for (let k = 0; k < C.TOWN_SEATS_PER_BENCH; k++) {
      const seat = k - (C.TOWN_SEATS_PER_BENCH - 1) / 2;      // -1, 0, +1
      const ox = Math.round(seat * C.TOWN_SEAT_SPACING);      // la case la plus proche de la place
      for (const [dx, dy] of [[ox, 1], [ox, -1], [ox - 1, 1], [ox + 1, 1], [-1, 0], [1, 0]]) {
        const before = list.length;
        add(pr.x + dx, pr.y + dy, "sit", { bx: pr.x, by: pr.y, seat });
        if (list.length > before) break;
      }
    }
  };
  // ---- Le mobilier (posé par le générateur, donc lu chez lui).
  for (const pr of tw.props || []) {
    if (pr.kind === "bench") addBench(pr);
    else if (pr.kind === "planter") add(pr.x, pr.y + 1, "flowers");
    else if (pr.kind === "kiosk") { add(pr.x - 2, pr.y + 1, "kiosk"); add(pr.x + 2, pr.y + 1, "kiosk"); }
    else if (pr.kind === "stall") add(pr.x, pr.y + 1, "stall");
    else if (pr.kind === "townWell") add(pr.x + 1, pr.y + 1, "well");
    else if (pr.kind === "grave") add(pr.x, pr.y + 1, "grave");
    else if (pr.kind === "statue") add(pr.x, pr.y + 2, "statue");
    else if (pr.kind === "newsBoard") add(pr.x, pr.y + 1, "board");
  }
  // ---- Les lieux, définis par leurs constantes.
  const fo = C.TOWN_FOUNTAIN;
  for (const [dx, dy] of [[-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2], [0, -1], [1, -1]]) add(fo.x + dx, fo.y + dy, "fountain");
  // Le ponton : on va jusqu'au bout, c'est tout l'intérêt d'un ponton.
  add(C.TOWN_PIER.x + 1, C.TOWN_PIER.y + C.TOWN_PIER.h - 1, "pier");
  add(C.TOWN_PIER.x + 2, C.TOWN_PIER.y + C.TOWN_PIER.h - 2, "pier");
  // Le belvédère : on regarde vers le sud, donc on se poste au bord sud.
  add(C.TOWN_BELVEDERE.x + 4, C.TOWN_BELVEDERE.y + C.TOWN_BELVEDERE.h - 2, "view");
  add(C.TOWN_BELVEDERE.x + C.TOWN_BELVEDERE.w - 5, C.TOWN_BELVEDERE.y + C.TOWN_BELVEDERE.h - 2, "view");
  // Le parvis de l'église.
  add(C.TOWN_CHURCH.x + 3, C.TOWN_CHURCH.y + C.TOWN_CHURCH.h + 2, "pray");
  // La vitrine de la Maison Garfield : on s'y colle le nez, on n'entre pas.
  add(C.TOWN_BOUTIQUE.x + 1, C.TOWN_BOUTIQUE.y + C.TOWN_BOUTIQUE.h + 1, "window");
  add(C.TOWN_BOUTIQUE.x + C.TOWN_BOUTIQUE.w - 2, C.TOWN_BOUTIQUE.y + C.TOWN_BOUTIQUE.h + 1, "window");
  add(C.TOWN_SALON.x + 1, C.TOWN_SALON.y + C.TOWN_SALON.h + 1, "window");

  /* ═════════════════════════════════════════════════════════════════════════
     ZIP 428 — LES QUARTIERS QUE PERSONNE N'HABITAIT.
     ─────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ MESURÉ AVANT D'ÊTRE CORRIGÉ : découpée en blocs de 28×28, la ville
     comptait 48 blocs ouverts, et 33 D'ENTRE EUX N'AVAIENT AUCUN ENDROIT DE
     VIE. Le verger, le lac, le quartier des artisans, le champ de foire, le
     parc, les avenues : rien à y viser, donc personne n'y allait jamais. Pire,
     la répartition était franchement fausse — SEIZE des 61 endroits étaient des
     tombes, si bien qu'un quart de la vie sociale de Valley Town se passait au
     cimetière. Ce n'était pas une intention, c'était une conséquence : le
     cimetière est le seul décor dont le générateur pose seize exemplaires.

     ⚠️ LA RÈGLE NE CHANGE PAS D'UN IOTA : tout ce qui suit est DÉRIVÉ de la
     carte ou de ses constantes, jamais d'une liste de coordonnées écrite à la
     main (voir l'en-tête de cette fonction). Ce qu'on ajoute, ce sont des
     LIEUX — un bord de lac, une allée de verger, une rue — pas des points.
     ⚠️ ET LE PAS D'ÉCHANTILLONNAGE COMPTE AUTANT QUE LE LIEU. Trop serré, on
     fabrique douze endroits identiques à trois cases l'un de l'autre et le
     tirage pondéré ne voit plus qu'eux ; trop lâche, le quartier reste mort.
     Les pas ci-dessous donnent un endroit tous les 8 à 14 pas, soit à peu près
     un par « coin » qu'un promeneur distinguerait. */

  // ---- LA PROMENADE DU LAC. On s'accoude au bord de l'eau : on cherche donc
  // la première case SÈCHE au-dessus de l'eau, colonne par colonne — la rive
  // est irrégulière, une ligne droite tomberait dedans.
  {
    const lk = C.TOWN_LAKE;
    for (let x = lk.x + 3; x < lk.x + lk.w - 3; x += 9) {
      for (let y = lk.y; y < lk.y + lk.h; y++) {
        const i = y * tw.w + x;
        if (tw.ground[i] === C.G_WATER) { add(x, y - 1, "shore"); break; }
      }
    }
  }
  // ---- LE VERGER MUNICIPAL. On lève le nez vers les branches.
  {
    const or = C.TOWN_ORCHARD;
    for (let y = or.y + 3; y < or.y + or.h - 2; y += 8)
      for (let x = or.x + 2; x < or.x + or.w - 2; x += 7) add(x, y, "orchard");
  }
  // ---- LE PARC ET SON ÉTANG. Même méthode que le lac : on longe l'eau.
  {
    const pk = C.TOWN_PARK;
    for (let x = pk.x + 2; x < pk.x + pk.w - 2; x += 6) {
      for (let y = pk.y; y < pk.y + pk.h; y++) {
        const i = y * tw.w + x;
        if (tw.ground[i] === C.G_WATER) { add(x, y - 1, "pond"); break; }
      }
    }
  }
  // ---- LE QUARTIER DES ARTISANS. On regarde travailler ; c'est ce qu'on fait
  // dans un quartier d'ateliers, et c'est ce qui lui donne son bruit.
  {
    const ar = C.TOWN_ARTISANS;
    for (let y = ar.y + 4; y < ar.y + ar.h; y += 14) { add(ar.x + 7, y, "craft"); add(ar.x + 13, y + 5, "craft"); }
  }
  // ---- LE CHAMP DE FOIRE, ailleurs que devant les étals : on traîne entre
  // les rangées, ce qui est précisément ce qui fait une foire plutôt qu'un
  // alignement de commerces.
  {
    const mk = C.TOWN_MARKET;
    for (let y = mk.y + 3; y < mk.y + mk.h - 2; y += 9)
      for (let x = mk.x + 3; x < mk.x + mk.w - 3; x += 10) add(x, y, "fair");
  }
  /* ---- LES CARREFOURS. ⚠️ C'EST L'AJOUT QUI CHANGE LE PLUS LA VILLE, et c'est
     le moins spectaculaire. Sans endroit dans les rues, un résident semble se
     téléporter d'un point d'intérêt à l'autre : on ne le croise jamais EN TRAIN
     d'aller quelque part. Une rue où personne ne s'arrête est un couloir.

     ⚠️⚠️ MAIS ON PREND LES CARREFOURS, PAS UN POINT TOUS LES N PAS — ET C'EST
     LE BANC QUI A TRANCHÉ. Premier jet : un endroit tous les 26 pas le long de
     chaque avenue. Résultat mesuré : 58 endroits de rue sur 148, soit 39 % de
     la ville. On venait de remplacer « un quart de la vie sociale se passe au
     cimetière » par « deux cinquièmes se passent sur le trottoir » — le même
     défaut de répartition, à l'autre bout. C'est exactement pour ça que le
     contrôle « aucune activité n'écrase les autres » a été écrit AVANT
     d'ajouter quoi que ce soit.
     Le croisement de deux avenues est en plus le bon endroit en soi : c'est là
     qu'on hésite, qu'on se salue, qu'on regarde le panneau. Et il est DÉRIVÉ
     des deux tables qui définissent déjà les rues — vingt endroits qui se
     déplacent tout seuls le jour où l'on déplace une avenue. */
  for (const ry of C.TOWN_ST_ROWS) for (const cx2 of C.TOWN_ST_COLS) add(cx2 + 2, ry + 2, "stroll");

  TOWN_SPOT_CACHE.w = tw; TOWN_SPOT_CACHE.list = list;
  return list;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 428 — LA NAVIGATION DE VALLEY TOWN. ON REVIENT SUR UNE DÉCISION ÉCRITE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ LE 427 A TRANCHÉ « LA PARADE N'EST PAS UN A*, C'EST UN ITINÉRAIRE » —
   ET C'ÉTAIT FAUX. Mesuré au 428 en rejouant le VRAI `townResidentRoam` (ligne
   droite + glissement + garde de 2,4 s) sur la VRAIE carte :

       depuis le quai .............  15/64 destinations atteintes (23 %)
       d'un endroit à un autre ....  94/394               (24 %)
       vie complète simulée ....... 416/2000 déplacements (21 %)

   Quatre trajets sur cinq échouaient. Et la cause n'était pas la topologie :
   un parcours en largeur avec la règle de dénivelé du jeu trouve 33 198 des
   33 199 cases praticables depuis le quai, les 64 endroits sont TOUS
   atteignables, et le détour médian ne vaut que 1,28× la ligne droite. La
   ville est parfaitement connexe ; c'est la ligne droite qui meurt contre la
   première des 27 haies.
   ⚠️ ET LE SYMPTÔME MENTAIT : à l'abandon, le résident joue quand même son
   activité SUR PLACE, sept à vingt-six secondes. Un résident bloqué contre une
   haie n'avait donc pas l'air bloqué — il avait l'air de contempler une haie.
   C'est la signature exacte des pièges de ce projet : aucune erreur, et ça
   ressemble à une intention.

   Ce qui NE change pas, et c'est ce qui rendait l'A* refusé au 427 :
   ⚠️ LE COÛT RÉSEAU EST STRICTEMENT LE MÊME. Le chemin est calculé chez l'hôte
   puis RÉDUIT à quelques points de passage (`simplify` ci-dessous) avant de
   partir dans le message `residentPaths` qui existe depuis le 364 et qui
   accepte déjà une liste de points. Un trajet = un `send()`, hier comme
   aujourd'hui — et seul le nombre de `send()` est facturé (§3).
   ⚠️ ET LES ESCALIERS CESSENT D'ÊTRE UN CAS PARTICULIER. `townStairRoute`
   dérivait des points de passage de `TOWN_STAIRS` pour compenser l'aveuglement
   de la ligne droite ; un chemin qui connaît le dénivelé monte l'escalier
   parce que c'est le seul endroit où il PEUT monter. Une table de moins à
   tenir d'accord avec la carte.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ LA GRILLE DE NAVIGATION EST STATIQUE, ET C'EST DÉMONTRABLE PLUTÔT QUE
   COMMODE. Le seul obstacle de la ville qui change en cours de partie est un
   arbre qu'on abat (`shared.townChop`) — or un arbre est TOUJOURS bloquant et
   une souche ne l'est jamais (TOWN_STUMP_BLOCKS = false). Couper ne peut donc
   qu'OUVRIR une case. Une grille qui ignore la coupe est pessimiste, jamais
   optimiste : elle fait parfois faire un détour, elle n'envoie jamais dans un
   mur. C'est ce qui autorise à la calculer une fois pour toutes.
   ⚠️ ET ELLE VIT DANS SON PROPRE CACHE, PAS SUR `tw`. Même raison que
   TOWN_SPOT_CACHE juste au-dessus : `getTownWorldCached` rend un singleton
   partagé par tous les remontages de l'onglet, y écrire ferait fuiter l'état
   d'une ferme à l'autre (§4). */
const TOWN_NAV_CACHE = { w: null, nav: null };
export function townNav(tw) {
  if (!tw) return null;
  if (TOWN_NAV_CACHE.w === tw && TOWN_NAV_CACHE.nav) return TOWN_NAV_CACHE.nav;
  const W = tw.w, H = tw.h, N = W * H;
  const walk = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    // Mêmes refus que townBlockedAt côté jeu, la coupe en moins (voir ci-dessus).
    if (x <= C.TOWN_RAIL_X + 1 && !(y >= C.TOWN_PLATFORM.y && y < C.TOWN_PLATFORM.y + C.TOWN_PLATFORM.h)) continue;
    if (tw.solid && tw.solid[i]) continue;
    if (tw.ground[i] === C.G_WATER) continue;
    const o = tw.objects[i];
    if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_STUMP) continue;
    walk[i] = 1;
  }
  /* ---- LES COMPOSANTES CONNEXES. ⚠️ C'EST LE PLAFOND DE COÛT DE L'A*, ET LA
     SEULE RAISON POUR LAQUELLE ON PEUT S'EN SERVIR VINGT FOIS PAR MINUTE. Un
     A* qui ÉCHOUE est le seul qui coûte cher : il explore tout ce qu'il peut
     atteindre avant de se rendre. Savoir AVANT de partir que la destination
     est dans une autre poche, c'est transformer le pire cas (37 632 cases
     visitées) en une comparaison de deux entiers. Le calcul est fait une fois,
     ici, en un parcours en largeur. */
  const comp = new Int32Array(N).fill(-1);
  const stack = new Int32Array(N);
  let nComp = 0;
  for (let s = 0; s < N; s++) {
    if (!walk[s] || comp[s] >= 0) continue;
    const id = nComp++;
    let sp = 0; stack[sp++] = s; comp[s] = id;
    while (sp > 0) {
      const i = stack[--sp], x = i % W, y = (i / W) | 0, e = tw.elev[i];
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (!walk[j] || comp[j] >= 0) continue;
        // La règle unique du relief (§6) : pas plus de TOWN_STEP_MAX d'un pas.
        // Écrite ICI, elle fait que l'escalier est le seul chemin vers le haut
        // sans qu'aucun code ne connaisse l'existence d'un escalier.
        if (Math.abs(tw.elev[j] - e) > C.TOWN_STEP_MAX) continue;
        comp[j] = id; stack[sp++] = j;
      }
    }
  }
  /* Les tampons de l'A*, alloués UNE FOIS et réutilisés. ⚠️ `stamp` évite de
     les remettre à zéro à chaque appel : effacer 37 632 entrées coûterait plus
     cher que la recherche elle-même sur un trajet court. */
  const nav = {
    w: W, h: H, walk, comp, nComp,
    g: new Float32Array(N), f: new Float32Array(N),
    from: new Int32Array(N), stamp: new Int32Array(N), closed: new Uint8Array(N),
    /* ⚠️⚠️ LE TAS EST UN TABLEAU ORDINAIRE, ET C'EST UN BOGUE PAYÉ AU 428.
       Premier jet : `new Int32Array(N + 1)`, en raisonnant « il y a N cases,
       donc au plus N entrées ». FAUX. Cet A* n'a pas de décrémentation de clé
       (elle coûterait un index de position dans le tas, pour un gain nul à
       cette taille) : une case AMÉLIORÉE est repoussée sans que l'ancienne
       entrée soit retirée. Le tas peut donc dépasser N.
       ⚠️ ET LE DÉPASSEMENT EST TOTALEMENT MUET : écrire hors bornes d'un
       tableau typé en JavaScript ne lève rien, ça ne fait simplement RIEN. La
       recherche perdait des nœuds, se terminait sans avoir trouvé, et rendait
       `null` — ce qui a l'air d'une réponse (« il n'y a pas de chemin »). Un
       seul trajet sur 3 660 tombait dessus, du sud du lac vers le belvédère,
       c'est-à-dire la diagonale la plus longue de la ville.
       Un tableau ordinaire grandit tout seul, et le coût est invisible face à
       une recherche à 0,17 ms. */
    run: 0, heap: [], heapKey: [],
  };
  TOWN_NAV_CACHE.w = tw; TOWN_NAV_CACHE.nav = nav;
  return nav;
}
export function townWalkableTile(tw, x, y) {
  const nav = townNav(tw); if (!nav) return false;
  const fx = Math.floor(x), fy = Math.floor(y);
  if (fx < 0 || fy < 0 || fx >= nav.w || fy >= nav.h) return false;
  return !!nav.walk[fy * nav.w + fx];
}
/* Deux cases sont-elles dans la même poche de la ville ? Sert de garde AVANT
   tout A*, et de filtre à `townSpots` quand on choisit une destination. */
export function townSameArea(tw, x0, y0, x1, y1) {
  const nav = townNav(tw); if (!nav) return false;
  const a = townCompAt(nav, x0, y0), b = townCompAt(nav, x1, y1);
  return a >= 0 && a === b;
}
function townCompAt(nav, x, y) {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (fx < 0 || fy < 0 || fx >= nav.w || fy >= nav.h) return -1;
  return nav.comp[fy * nav.w + fx];
}

/* ⚠️ ON SE DÉPLACE DE CENTRE DE CASE À CENTRE DE CASE, ET CE N'EST PAS UN
   DÉTAIL DE CONFORT. La boîte du personnage fait 0,6 case de large et 0,35 de
   haut (voir townCanStand) : posée au CENTRE d'une case libre, elle tient
   toujours entièrement dedans. Viser un bord, c'est viser une position que le
   test de collision peut refuser alors que la case est libre — un chemin
   parfaitement valide qui échouerait à l'exécution, c'est-à-dire le retour du
   défaut qu'on est en train de corriger. */
const TC = 0.5;
const TOWN_LOS_MAX = 48;   // portée de visée de la réduction, en cases (voir townSimplifyPath)
export function townFindPath(tw, x0, y0, x1, y1, maxNodes) {
  const nav = townNav(tw); if (!nav) return null;
  const W = nav.w, H = nav.h;
  const sx = Math.floor(x0), sy = Math.floor(y0), gx = Math.floor(x1), gy = Math.floor(y1);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H || gx < 0 || gy < 0 || gx >= W || gy >= H) return null;
  const start = sy * W + sx, goal = gy * W + gx;
  if (!nav.walk[start] || !nav.walk[goal]) return null;
  if (start === goal) return [{ x: gx + TC, y: gy + TC }];
  // Le garde-fou : deux poches différentes, on ne cherche même pas.
  if (nav.comp[start] !== nav.comp[goal]) return null;
  const run = ++nav.run;
  const { g, f, from, stamp, closed, heap, heapKey, walk, comp } = nav;
  const elev = tw.elev;
  /* ⚠️ LE PLAFOND DE NŒUDS EST UNE CEINTURE, PAS UN RÉGLAGE — ET IL A FAILLI
     DEVENIR UN BOGUE. Premier jet à 12 000 : douze recherches sur quatre cents
     échouaient, TOUTES sur la même forme (Haute-Ville → cimetière, c'est-à-dire
     la ville en diagonale). Elles n'échouaient pas parce que le chemin
     n'existait pas — les deux cases étaient dans la même poche — mais parce que
     la recherche s'arrêtait avant de le trouver. Un plafond qui coupe un
     résultat VALIDE est exactement le stub menteur du §10 : ça retombe sur
     « pas de chemin », ce qui a l'air d'une réponse.
     Le garde des poches ci-dessus ayant déjà éliminé le seul cas réellement
     coûteux (chercher ce qui n'existe pas), le plafond n'a plus qu'à être plus
     grand que la ville. */
  const CAP = maxNodes || (W * H);
  /* ⚠️⚠️ L'HEURISTIQUE EST OCTILE, PAS MANHATTAN, ET C'EST UNE CORRECTION DU
     428 TROUVÉE PAR LE BANC. Manhattan (|dx|+|dy|) SURESTIME le coût réel dès
     qu'on se déplace en diagonale, où deux cases ne coûtent pas 2 mais 1,414.
     Une heuristique qui surestime n'est pas seulement « non optimale » : elle
     est INCONSISTANTE, donc l'A* rouvre sans cesse des nœuds qu'il avait déjà
     fermés, et le nombre d'expansions explose bien au-delà du nombre de cases.
     Le plafond de sécurité sautait alors AVANT que le but soit atteint, et la
     fonction rendait `null` — c'est-à-dire « il n'y a pas de chemin », ce qui a
     tout l'air d'une réponse. Un trajet sur 3 660 tombait dessus : le sud du
     lac vers le belvédère, la plus longue diagonale de la ville, exactement le
     cas où Manhattan se trompe le plus.
     La forme octile est le coût EXACT en terrain libre : elle ne surestime
     jamais, donc aucun nœud n'est rouvert. */
  const D2 = 1.41421356;
  const h = (i) => {
    const dxh = Math.abs((i % W) - gx), dyh = Math.abs(((i / W) | 0) - gy);
    return (dxh + dyh) + (D2 - 2) * Math.min(dxh, dyh);
  };
  let hn = 0;
  heap.length = 1; heapKey.length = 1;   // l'indice 0 est inutilisé (tas 1-indexé)
  const push = (i, key) => {
    let c = ++hn; heap[c] = i; heapKey[c] = key;
    while (c > 1) { const p = c >> 1; if (heapKey[p] <= heapKey[c]) break; const ti = heap[p], tk = heapKey[p]; heap[p] = heap[c]; heapKey[p] = heapKey[c]; heap[c] = ti; heapKey[c] = tk; c = p; }
  };
  const pop = () => {
    const top = heap[1];
    heap[1] = heap[hn]; heapKey[1] = heapKey[hn]; hn--;
    let c = 1;
    for (;;) { const l = c << 1, r = l + 1; let m = c;
      if (l <= hn && heapKey[l] < heapKey[m]) m = l;
      if (r <= hn && heapKey[r] < heapKey[m]) m = r;
      if (m === c) break;
      const ti = heap[m], tk = heapKey[m]; heap[m] = heap[c]; heapKey[m] = heapKey[c]; heap[c] = ti; heapKey[c] = tk; c = m; }
    return top;
  };
  stamp[start] = run; g[start] = 0; f[start] = h(start); from[start] = -1; closed[start] = 0;
  push(start, f[start]);
  let expanded = 0, found = false;
  while (hn > 0) {
    const i = pop();
    if (closed[i] === 1 && stamp[i] === run) continue;
    closed[i] = 1;
    if (i === goal) { found = true; break; }
    if (++expanded > CAP) break;
    const x = i % W, y = (i / W) | 0, e = elev[i];
    for (let k = 0; k < 8; k++) {
      const dx = k < 4 ? (k === 0 ? 1 : k === 1 ? -1 : 0) : (k === 4 || k === 6 ? 1 : -1);
      const dy = k < 4 ? (k === 2 ? 1 : k === 3 ? -1 : 0) : (k === 4 || k === 5 ? 1 : -1);
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (!walk[j] || comp[j] !== comp[i]) continue;
      if (Math.abs(elev[j] - e) > C.TOWN_STEP_MAX) continue;
      /* ⚠️ PAS DE COIN COUPÉ. Une diagonale ne passe que si les DEUX cases
         orthogonales sont libres : sinon le chemin frôle l'angle d'une haie,
         et la boîte du personnage — 0,6 case, pas un point — s'y accroche. Le
         chemin serait juste sur le papier et faux à l'exécution. */
      if (dx && dy) {
        const a = y * W + (x + dx), b = (y + dy) * W + x;
        if (!walk[a] || !walk[b]) continue;
        if (Math.abs(elev[a] - e) > C.TOWN_STEP_MAX || Math.abs(elev[b] - e) > C.TOWN_STEP_MAX) continue;
      }
      const step = (dx && dy) ? D2 : 1;
      const ng = g[i] + step;
      if (stamp[j] === run && ng >= g[j]) continue;
      stamp[j] = run; g[j] = ng; from[j] = i; closed[j] = 0;
      f[j] = ng + h(j);
      push(j, f[j]);
    }
  }
  if (!found) return null;
  const raw = [];
  for (let i = goal; i !== -1; i = from[i]) { raw.push(i); if (i === start) break; }
  raw.reverse();
  /* ⚠️ LA RÉDUCTION PART DE LA POSITION RÉELLE, PAS DU CENTRE DE LA CASE DE
     DÉPART. Le résident n'est presque jamais au centre d'une case : valider le
     premier segment depuis le centre reviendrait à valider un segment que
     personne ne parcourra. Repli sur le centre si la position réelle ne tient
     pas la boîte — ce qui n'arrive que si le résident a été poussé dans un
     coin, et le centre de sa case est alors le meilleur point de rattrapage. */
  const from0 = townBoxFree(tw, x0, y0) ? { x: x0, y: y0 } : null;
  return townSimplifyPath(tw, raw, W, x1, y1, from0);
}

/* ---- LA RÉDUCTION EN POINTS DE PASSAGE -------------------------------------
   ⚠️⚠️ ELLE EST OBLIGATOIRE, ET PAS POUR LE RÉSEAU. Le suiveur, chez l'hôte
   comme chez l'invité, avance EN LIGNE DROITE d'un point au suivant : c'est le
   modèle de tout le jeu depuis le 252 et on n'y touche pas. Un chemin d'A*
   rendu case par case donnerait un PNJ qui zigzague d'un centre de case à
   l'autre. On ne garde donc que les points où il faut vraiment tourner — mais
   on ne les choisit pas géométriquement : on garde un point dès que le segment
   direct depuis le dernier point retenu N'EST PLUS PRATICABLE. Le critère est
   donc EXACTEMENT celui qui sera appliqué en jeu, ce qui est la seule façon de
   garantir qu'un segment validé ici sera parcouru là-bas.
   ⚠️ Effet de bord voulu : le chemin cesse de raser les murs. Deux virages en
   diagonale valent mieux que douze petits pas contre une haie. */
function townSimplifyPath(tw, raw, W, tx, ty, from0) {
  const pt = (i) => ({ x: (i % W) + TC, y: ((i / W) | 0) + TC });
  const out = [];
  let anchor = from0 || pt(raw[0]);
  /* ⚠️⚠️ `base` NE RECULE JAMAIS, ET C'EST UNE GARANTIE D'ARRÊT, PAS UN
     RAFFINEMENT. Premier jet du 428 : on gardait « le dernier point qui
     passait » sans forcer sa progression. Le jour où DEUX CASES VOISINES ont
     échoué au test de segment (rendu plus strict le même jour, au ras d'un
     escalier), le point retenu cessait d'avancer : la boucle repoussait
     éternellement le même point de passage et Node tombait sur un dépassement
     de mémoire — c'est-à-dire le seul bogue de ce zip qui, lui, ait fait du
     bruit. Ici `base` est le point retenu et `k` repart TOUJOURS de `base + 1` :
     l'avancée d'au moins une case par tour est vraie par construction, quel que
     soit ce que répond le test de segment.
     ⚠️ Deux cases voisines du chemin sont traversables par construction (l'A*
     ne relie que des cases dont il a vérifié l'arête) : les accepter sans les
     retester n'est pas une concession, c'est la même règle lue au bon endroit. */
  let base = 0;
  while (base < raw.length - 1) {
    /* ⚠️ LA PORTÉE DE VISÉE EST BORNÉE, ET C'EST UN PLAFOND DE COÛT, PAS UNE
       LIMITE DE QUALITÉ. Sans borne, un chemin de deux cents cases teste des
       segments de deux cents cases à chaque pas : la réduction coûterait plus
       cher que la recherche. Au-delà de TOWN_LOS_MAX on coupe le trajet en
       tronçons — quelques points de passage de plus, sur une liste qui n'est
       pas facturée à la taille (§3). */
    let last = base + 1;
    const far = Math.min(raw.length - 1, base + TOWN_LOS_MAX);
    for (let k = base + 2; k <= far; k++) {
      const cand = pt(raw[k]);
      if (!townSegmentClear(tw, anchor.x, anchor.y, cand.x, cand.y)) break;
      last = k;
    }
    const keep = pt(raw[last]);
    out.push(keep); anchor = keep; base = last;
  }
  const end = pt(raw[raw.length - 1]);
  if (!out.length || out[out.length - 1].x !== end.x || out[out.length - 1].y !== end.y) out.push(end);
  /* La destination EXACTE en dernier. Les endroits de `townSpots` sont donnés
     en coordonnées de case ; s'arrêter au centre de la case suffirait presque,
     mais « presque » est ce qui décale un personnage assis d'un demi-banc. */
  if (Number.isFinite(tx) && Number.isFinite(ty)) {
    const e = out[out.length - 1];
    if (Math.abs(e.x - tx) > 0.01 || Math.abs(e.y - ty) > 0.01) {
      if (townSegmentClear(tw, e.x, e.y, tx, ty)) out.push({ x: tx, y: ty });
    }
  }
  return out;
}
/* ╔══════════════════════════════════════════════════════════════════════════
   ║ ZIP 432 — LE RÉSEAU ROUTIER DE VALLEY TOWN (le taxi).
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ UN DEUXIÈME GRAPHE, ET C'EST DÉLIBÉRÉ. `townNav` décrit où l'on PEUT
   MARCHER : l'herbe, les parterres, la prairie. Un taxi n'y va pas — demande de
   Guillaume, « il faut se trouver à proximité d'une route pavée car le taxi ne
   roule pas sur l'herbe ». Filtrer le chemin après coup ne marcherait pas :
   l'A* trouverait la ligne droite à travers le parc et on la rejetterait sans
   avoir d'alternative. La contrainte doit être DANS le graphe.

   ⚠️ IL RÉUTILISE EXACTEMENT LA MÊME MACHINERIE que `townNav` (mêmes tampons,
   mêmes composantes connexes, même A*, même réduction en points de passage) —
   seul le test « cette case est-elle praticable » change. Écrire un second A*
   « comme l'autre mais pour les routes » aurait été le doublon du §8, et le
   symptôme serait un taxi qui monte les escaliers le jour où l'on corrige un
   bogue dans un seul des deux.

   ⚠️ LES MARCHES ET LES PONTS SONT EXCLUS. Une volée d'escalier est dallée : la
   laisser passer, c'est un taxi qui grimpe à la Haute-Ville par les marches.
   Le dénivelé est de toute façon refusé arête par arête (TOWN_STEP_MAX), mais
   l'exclusion explicite dit POURQUOI, ce qu'un seuil ne dit pas. */
const TOWN_ROAD_CACHE = { w: null, nav: null };
const CENTER_WANT = 3;      // dégagement visé, en cases : l'axe d'une avenue
const CENTER_COST = 0.55;   // surcoût par case de dégagement manquante
function townRoadDrivable(tw, i) {
  const g = tw.ground[i];
  if (g !== C.G_PATH && g !== C.G_PATH_STONE) return false;
  if (tw.solid && tw.solid[i]) return false;
  const o = tw.objects[i];
  if (o === C.O_TREE || o === C.O_TREE2 || o === C.O_STUMP) return false;
  return true;
}
export function townRoadNav(tw) {
  if (!tw) return null;
  if (TOWN_ROAD_CACHE.w === tw && TOWN_ROAD_CACHE.nav) return TOWN_ROAD_CACHE.nav;
  const W = tw.w, H = tw.h, N = W * H;
  const walk = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (townRoadDrivable(tw, i)) walk[i] = 1;
  // Composantes connexes : même rôle que dans townNav — un A* qui ÉCHOUE est le
  // seul qui coûte cher, savoir avant de partir qu'on ne peut pas y aller le
  // ramène à deux entiers comparés.
  const comp = new Int32Array(N).fill(-1);
  const stack = new Int32Array(N);
  let nComp = 0;
  for (let s0 = 0; s0 < N; s0++) {
    if (!walk[s0] || comp[s0] >= 0) continue;
    const id = nComp++;
    let sp = 0; stack[sp++] = s0; comp[s0] = id;
    while (sp > 0) {
      const i = stack[--sp], x = i % W, y = (i / W) | 0, e = tw.elev[i];
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (!walk[j] || comp[j] >= 0) continue;
        if (Math.abs(tw.elev[j] - e) > C.TOWN_STEP_MAX) continue;
        comp[j] = id; stack[sp++] = j;
      }
    }
  }
  /* ⚠️⚠️ LA « GRANDE » COMPOSANTE EST RETENUE, ET C'EST LA MESURE QUI L'A IMPOSÉ.
     Le dallage de la ville forme SEPT poches, pas une : les avenues (4 207
     cases), le champ de foire (651), la Haute-Ville (212 + 28), le parc (116),
     le cimetière (32). Les places sont dallées mais on y accède par l'herbe.
     Résultat du premier jet : 32 trajets réussis sur 132, et le MARCHÉ — la
     destination qui justifie le taxi — était injoignable.
     ⚠️ LA PARADE N'EST PAS D'ÉLARGIR LE GRAPHE (un taxi qui coupe par la pelouse
     n'est plus un taxi) : c'est de DÉPOSER AU TROTTOIR. Chaque arrêt est snappé
     sur le RÉSEAU DE RUES, et on finit à pied — ce que fait un vrai taxi. */
  let main = -1, mainN = 0;
  { const size = new Int32Array(nComp);
    for (let i = 0; i < N; i++) if (comp[i] >= 0) size[comp[i]]++;
    for (let k = 0; k < nComp; k++) if (size[k] > mainN) { mainN = size[k]; main = k; } }
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ LA CARTE DE DÉGAGEMENT — c'est elle qui fait rouler AU MILIEU.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ UN A* CHERCHE LE PLUS COURT, ET LE PLUS COURT LONGE LE TROTTOIR. Sur
     une avenue de six cases, le chemin optimal colle le bord intérieur des
     virages : le taxi roulait sur la bordure, ce qui se voit immédiatement
     (« il roule pas au centre des chemins dallés »). Aucun réglage de conduite
     ne corrige ça — le défaut est dans le CHEMIN, pas dans le volant.
     La parade est une distance de chanfrein : pour chaque case roulable, à quelle
     distance est le bord de la chaussée. L'A* paie ensuite un supplément pour
     les cases peu dégagées, donc il PRÉFÈRE l'axe de la rue sans jamais s'y
     enfermer — dans une ruelle d'une case de large, le supplément est le même
     partout et le chemin passe quand même. */
  const clear = new Int32Array(N).fill(1e9);
  { const q = new Int32Array(N); let qh = 0, qt = 0;
    for (let i = 0; i < N; i++) if (!walk[i]) { clear[i] = 0; q[qt++] = i; }
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0, d = clear[i];
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (clear[j] > d + 1) { clear[j] = d + 1; q[qt++] = j; }
      }
    }
  }
  const nav = { w: W, h: H, walk, comp, nComp, main, mainN, clear,
    g: new Float32Array(N), f: new Float32Array(N),
    from: new Int32Array(N), stamp: new Int32Array(N), closed: new Uint8Array(N),
    run: 0, heap: [], heapKey: [] };
  TOWN_ROAD_CACHE.w = tw; TOWN_ROAD_CACHE.nav = nav;
  return nav;
}
/* La case roulable la plus proche, en anneaux croissants. Sert DEUX fois, et
   c'est pour ça qu'elle est ici : dire au joueur « vous êtes trop loin d'une
   route » et choisir où le taxi vient se ranger. Deux réponses différentes à la
   même question, ce serait un taxi qui se gare là où le joueur n'a pas le droit
   de l'appeler. */
/* ⚠️ `streetOnly` (433) : la case doit être une VRAIE RUE (`G_PATH`), pas une
   esplanade dallée (`G_PATH_STONE` — la place, le parvis du marché, le quai).
   Les deux sont roulables et c'est voulu (le taxi traverse le marché), mais on
   ne DÉPOSE pas au milieu d'un square : la place centrale a une fontaine, un
   obélisque et quatre parterres, et le taxi s'y faufilait en diagonale pour se
   garer contre le monument. Un taxi se range au trottoir. */
export function townRoadNear(tw, x, y, maxR, mainOnly, streetOnly) {
  const nav = townRoadNav(tw); if (!nav) return null;
  const W = nav.w, H = nav.h, cx = Math.floor(x), cy = Math.floor(y);
  const R = Math.max(1, maxR | 0);
  let best = null, bestD = Infinity;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const fx = cx + dx, fy = cy + dy;
    if (fx < 0 || fy < 0 || fx >= W || fy >= H) continue;
    const i = fy * W + fx;
    if (!nav.walk[i]) continue;
    // ⚠️ `mainOnly` : la case doit être sur le RÉSEAU DE RUES, pas sur un îlot
    // de dallage isolé — sinon on hèle un taxi qui ne peut pas venir.
    if (mainOnly && nav.comp[i] !== nav.main) continue;
    if (streetOnly && tw.ground[i] !== C.G_PATH) continue;
    const d = Math.hypot(fx + 0.5 - x, fy + 0.5 - y);
    if (d < bestD) { bestD = d; best = { x: fx + 0.5, y: fy + 0.5, d }; }
  }
  return best;
}
export function townRoadSameArea(tw, x0, y0, x1, y1) {
  const nav = townRoadNav(tw); if (!nav) return false;
  const W = nav.w;
  const a = nav.comp[Math.floor(y0) * W + Math.floor(x0)];
  const b = nav.comp[Math.floor(y1) * W + Math.floor(x1)];
  return a >= 0 && a === b;
}
/* Le trajet du taxi. Même A* octile que `townFindPath`, sur le graphe routier.
   ⚠️ IL N'EST PAS RÉDUIT EN POINTS DE PASSAGE : le taxi doit SUIVRE la rue,
   virage par virage, pour qu'on puisse ralentir dans les courbes. Une réduction
   en ligne de visée couperait les angles et le véhicule roulerait en diagonale
   à travers un pâté de maisons. C'est l'inverse du besoin des piétons. */
/* ╔══════════════════════════════════════════════════════════════════════════
   ║ RECENTRER SUR LA BANDE PAVÉE — et c'est la VRAIE réponse à « il roule pas
   ║ au centre des chemins dallés ».
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ MESURE D'ABORD : **85 % des cases de rue de Valley Town ont un dégagement
   de 1**, autrement dit la ville est faite de rues d'une à deux cases de large.
   Il n'y a donc pas de « milieu de la chaussée » à trouver par un surcoût de
   bordure : sur une rue de DEUX cases, le milieu visuel est la LIGNE ENTRE les
   deux cases (x entier), et l'A* — qui passe par des CENTRES de cases (x + 0,5)
   — roule par construction sur une moitié de rue, c'est-à-dire collé au bord.
   ⚠️ LA PARADE EST GÉOMÉTRIQUE, PAS HEURISTIQUE : à chaque point de passage on
   sonde PERPENDICULAIREMENT au sens de marche jusqu'aux deux bords de la bande
   pavée, et on repose le point au milieu de ce segment. Une rue de deux cases
   place la voiture sur la ligne mitoyenne, une avenue de six la place à trois
   cases du trottoir, et une ruelle d'une case ne bouge pas. Une seule règle,
   aucun cas particulier, et elle se mesure (voir verify-taxi.mjs).

   ⚠️⚠️ ZIP 433 — ET C'EST CE SONDAGE QUI FAISAIT LA DENT DE SCIE (« le taxi a
   une trajectoire stupide, il prend des virages plus que nécessaire »). Une
   sonde perpendiculaire ne sait pas distinguer la CHAUSSÉE de la BOUCHE D'UNE
   RUE TRANSVERSALE : à chaque amorce de rue latérale, elle comptait les deux
   cases de l'avenue PLUS les trois cases du départ de la petite rue, concluait
   « la chaussée fait cinq cases de large ici » et posait le point un cran et
   demi plus haut. Le taxi montait donc dans la bouche de CHAQUE rue latérale
   avant de redescendre — mesuré par `verify-taxi.mjs` sur les 132 trajets :
   **598 aller-retour** et **969° de rotation cumulée par course en moyenne**,
   contre **0** et **214°** une fois le gabarit posé.

   ⚠️ LA PARADE EST DANS LA DÉFINITION, PAS DANS UN SEUIL : **la chaussée est
   la largeur qui PERSISTE le long de la marche.** On sonde donc sur un gabarit
   de `SPAN` cases de part et d'autre, DANS le sens du déplacement, et on retient
   la largeur MINIMALE. Une amorce de rue de deux cases de large disparaît du
   minimum ; une esplanade, large sur toute la longueur du gabarit, le traverse
   intacte. Aucun cas particulier pour les carrefours — et c'est justement aux
   carrefours qu'on veut que la voiture GARDE SA LIGNE. */
export function townRoadCenter(tw, pts) {
  const nav = townRoadNav(tw);
  if (!nav || !pts || pts.length < 2) return pts;
  const W = nav.w, H = nav.h;
  const road = (fx, fy) => fx >= 0 && fy >= 0 && fx < W && fy < H && !!nav.walk[fy * W + fx];
  const MAXT = 6;                       // au-delà, c'est une esplanade, pas une rue
  /* Le gabarit de persistance, en cases. ⚠️ IL DOIT ÊTRE PLUS LARGE QUE LA
     PLUS LARGE DES RUES TRANSVERSALES, sinon la bouche persiste sur tout le
     gabarit et on retombe sur la dent de scie. Les rues de Valley Town sont
     pavées deux cases de large (`paveRow`/`paveCol`), les carrefours quatre :
     un gabarit de ±3 (sept cases) les enjambe tous. */
  const SPAN = 3;
  const out = pts.map(p => ({ x: p.x, y: p.y }));
  for (let i = 1; i < out.length - 1; i++) {
    const a2 = out[i - 1], b2 = out[i + 1];
    const dx = b2.x - a2.x, dy = b2.y - a2.y;
    if (Math.hypot(dx, dy) < 0.001) continue;
    /* ⚠️ ON NE SONDE QUE SUR L'AXE PERPENDICULAIRE DOMINANT. Les rues de la
       ville sont orthogonales ; sonder en diagonale compterait des cases de
       biais et recentrerait de travers. Sur un segment diagonal (un raccord de
       carrefour), on ne touche à rien : deux points recentrés de part et d'autre
       suffisent à tenir la trajectoire. */
    const horiz = Math.abs(dx) > Math.abs(dy) * 1.2;
    const vert = Math.abs(dy) > Math.abs(dx) * 1.2;
    if (!horiz && !vert) continue;
    const p = pts[i];
    const fx = Math.floor(p.x), fy = Math.floor(p.y);
    if (!road(fx, fy)) continue;
    /* Combien de cases de rue de chaque côté, PUIS les bords en coordonnées
       monde. C'est le comptage en cases qui rend la mesure exacte : mon premier
       jet sondait par demi-cases et s'arrêtait sur le dernier échantillon
       ROULABLE, pas sur le bord — il ratait donc systématiquement d'un demi-pas,
       et une rue de deux cases restait décentrée (mesuré : 0,36 case d'écart). */
    /* ⚠️ LE MINIMUM SUR LE GABARIT, PAS LA MESURE AU POINT (433, voir l'en-tête).
       Un échantillon hors chaussée ne dit rien de sa largeur : on le SAUTE, on
       ne le compte pas comme une largeur nulle — sinon un bout de rue près d'un
       bord cesserait d'être recentré. */
    let nPos = MAXT, nNeg = MAXT, seen = 0;
    for (let s = -SPAN; s <= SPAN; s++) {
      const sx = horiz ? fx + s : fx, sy = horiz ? fy : fy + s;
      if (!road(sx, sy)) continue;
      let p2 = 0, n2 = 0;
      if (horiz) {
        while (p2 < MAXT && road(sx, sy + p2 + 1)) p2++;
        while (n2 < MAXT && road(sx, sy - n2 - 1)) n2++;
      } else {
        while (p2 < MAXT && road(sx + p2 + 1, sy)) p2++;
        while (n2 < MAXT && road(sx - n2 - 1, sy)) n2++;
      }
      nPos = Math.min(nPos, p2); nNeg = Math.min(nNeg, n2); seen++;
    }
    if (!seen || nPos >= MAXT || nNeg >= MAXT) continue;
    const base = horiz ? fy : fx;
    const mid = (base - nNeg + base + nPos + 1) / 2;   // milieu de la bande, en monde
    if (horiz) out[i].y = mid; else out[i].x = mid;
  }
  return out;
}
export function townRoadPath(tw, x0, y0, x1, y1) {
  const nav = townRoadNav(tw); if (!nav) return null;
  const W = nav.w, H = nav.h;
  const sx = Math.floor(x0), sy = Math.floor(y0), gx = Math.floor(x1), gy = Math.floor(y1);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H || gx < 0 || gy < 0 || gx >= W || gy >= H) return null;
  const start = sy * W + sx, goal = gy * W + gx;
  if (!nav.walk[start] || !nav.walk[goal]) return null;
  if (start === goal) return [{ x: gx + 0.5, y: gy + 0.5 }];
  if (nav.comp[start] !== nav.comp[goal]) return null;
  const run = ++nav.run;
  const { g, f, from, stamp, closed, heap, heapKey, walk } = nav;
  const elev = tw.elev;
  heap.length = 0; heapKey.length = 0;
  const push = (i, key) => {
    heap.push(i); heapKey.push(key);
    let c = heap.length - 1;
    while (c > 0) { const p = (c - 1) >> 1; if (heapKey[p] <= heapKey[c]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]]; [heapKey[p], heapKey[c]] = [heapKey[c], heapKey[p]]; c = p; }
  };
  const pop = () => {
    const top = heap[0]; const li = heap.length - 1;
    heap[0] = heap[li]; heapKey[0] = heapKey[li]; heap.pop(); heapKey.pop();
    let c = 0;
    for (;;) { const l = c * 2 + 1, r = l + 1; let m = c;
      if (l < heap.length && heapKey[l] < heapKey[m]) m = l;
      if (r < heap.length && heapKey[r] < heapKey[m]) m = r;
      if (m === c) break;
      [heap[m], heap[c]] = [heap[c], heap[m]]; [heapKey[m], heapKey[c]] = [heapKey[c], heapKey[m]]; c = m; }
    return top;
  };
  /* ⚠️ HEURISTIQUE OCTILE, PAS MANHATTAN — le 428 a payé ce détail : une
     heuristique non consistante rouvre des nœuds sans fin et finit par rendre
     `null`, ce qui a l'air d'une réponse. */
  const hOf = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy);
    return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  stamp[start] = run; g[start] = 0; f[start] = hOf(sx, sy); closed[start] = 0; from[start] = -1;
  push(start, f[start]);
  let guard = 0;
  while (heap.length) {
    if (++guard > 60000) return null;
    const cur = pop();
    if (closed[cur] === 1 && stamp[cur] === run) continue;
    closed[cur] = 1;
    if (cur === goal) break;
    const cx2 = cur % W, cy2 = (cur / W) | 0, ce = elev[cur];
    for (let k = 0; k < 8; k++) {
      const dx = k < 4 ? [1, -1, 0, 0][k] : [1, 1, -1, -1][k - 4];
      const dy = k < 4 ? [0, 0, 1, -1][k] : [1, -1, 1, -1][k - 4];
      const nx = cx2 + dx, ny = cy2 + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nb = ny * W + nx;
      if (!walk[nb]) continue;
      if (Math.abs(elev[nb] - ce) > C.TOWN_STEP_MAX) continue;
      // ⚠️ PAS DE DIAGONALE QUI COUPE UN COIN : une voiture ne passe pas entre
      // deux angles de trottoir, et un chemin qui le fait se voit tout de suite.
      if (dx && dy && (!walk[cy2 * W + nx] || !walk[ny * W + cx2])) continue;
      /* ⚠️ LE SUPPLÉMENT DE BORDURE. `CENTER_WANT` est le dégagement visé (3
         cases du bord = l'axe d'une avenue) ; en dessous, chaque case coûte plus
         cher. Le facteur est volontairement du même ordre que le pas lui-même :
         plus fort, le taxi ferait des détours absurdes pour rester au milieu ;
         plus faible, il retournerait au trottoir. */
      const step = (dx && dy) ? Math.SQRT2 : 1;
      const cl = nav.clear[nb];
      const edge = cl >= CENTER_WANT ? 0 : (CENTER_WANT - cl) * CENTER_COST;
      const ng = (stamp[cur] === run ? g[cur] : 0) + step + edge;
      if (stamp[nb] !== run) { stamp[nb] = run; g[nb] = Infinity; closed[nb] = 0; from[nb] = -1; }
      if (ng < g[nb]) { g[nb] = ng; from[nb] = cur; f[nb] = ng + hOf(nx, ny); push(nb, f[nb]); }
    }
  }
  if (stamp[goal] !== run || from[goal] === -1) return null;
  const pts = [];
  let i2 = goal;
  while (i2 !== -1) { pts.unshift({ x: (i2 % W) + 0.5, y: ((i2 / W) | 0) + 0.5 }); i2 = from[i2]; }
  /* ⚠️ ON RECENTRE AVANT DE RÉDUIRE, ET L'ORDRE EST LE SUJET. Réduire d'abord
     ne laisse que quelques points de passage : recentrer ceux-là recentre la
     voiture aux angles et la laisse dériver vers le trottoir entre deux (mesuré :
     0,36 case d'écart moyen contre 0,5 collé au bord — mieux, pas bon). Recentré
     case par case, l'axe est décrit sur toute la longueur, et la réduction qui
     suit ne garde que des cordes qui restent dessus. */
  return townRoadSimplify(tw, townRoadCenter(tw, pts));
}
/* ⚠️⚠️ LE CHEMIN BRUT ZIGZAGUE, ET UNE VOITURE NE ZIGZAGUE PAS. L'A* rend une
   suite de CENTRES DE CASES : sur une avenue en diagonale, c'est un escalier de
   45°, et le volant (TURN_RATE) passe son temps à corriger — mesuré au banc,
   105 trajets sur 132 finissaient par mordre la pelouse dans les angles.
   On réduit donc en points de passage par ligne de visée, mais — et c'est tout
   le point — **la corde n'est acceptée que si elle reste ENTIÈREMENT sur du
   dallage**. Une réduction géométrique naïve couperait à travers un pâté de
   maisons ; celle-ci ne peut, par construction, que suivre la rue.
   ⚠️ ET ELLE GARDE LES VRAIS VIRAGES : un angle de rue n'est jamais visible en
   ligne droite depuis l'avant-dernier point, donc il survit à la réduction.
   C'est ce qui laisse au ralentissement en courbe quelque chose à ralentir.

   ⚠️⚠️ ZIP 433 — ELLE NE S'EST JAMAIS DÉCLENCHÉE, ET PERSONNE NE POUVAIT LE
   VOIR. Deux exigences la rendaient impossible à satisfaire dans Valley Town :
     · elle éprouvait la corde à **± 0,5 case** de son axe. Une rue est pavée
       DEUX cases de large (`paveRow`) et la voiture roule sur la mitoyenne :
       à un demi-pas de l'axe on tombe pile sur la case d'HERBE d'à côté. Toute
       corde était donc refusée sur toute rue normale ;
     · elle exigeait un dégagement ≥ 2, alors que **4 106 des 5 271 cases
       roulables de la ville ont un dégagement de 1** — c'est-à-dire sur 78 %
       du réseau, y compris toutes les rues droites.
   Résultat : la réduction rendait le chemin BRUT, case par case (mesuré : 80
   points de passage pour 92 tuiles de la gare à la place). Elle ne cassait
   rien — un escalier de centres de cases décrit quand même la rue — mais tout
   le travail d'anti-zigzag décrit ci-dessus n'existait que sur le papier.
   ⚠️ LA DEMI-LARGEUR EST CELLE DE LA VOITURE (0,4 case, la caisse fait 0,8),
   pas un demi-pas de grille ; et le dégagement ne se contrôle plus du tout :
   c'est `townRoadCenter` qui place l'axe, et couper un carrefour en biais est
   exactement ce que fait une voiture. Une corde qui reste sur le pavé sur toute
   sa largeur ne peut pas monter sur le trottoir — c'est le seul invariant utile,
   et `verify-taxi.mjs` le mesure sur la position RÉELLE du véhicule. */
export function townRoadSimplify(tw, pts) {
  const nav = townRoadNav(tw);
  if (!nav || !pts || pts.length < 3) return pts;
  const W = nav.w;
  const HALF = 0.4;                 // demi-largeur de la caisse, en cases
  const clear = (a, b) => {
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4));
    for (let k = 0; k <= n; k++) {
      const x = a.x + (b.x - a.x) * (k / n), y = a.y + (b.y - a.y) * (k / n);
      // La caisse a une largeur : on éprouve l'axe ET ses deux bords.
      for (const [ox, oy] of [[0, 0], [HALF, 0], [-HALF, 0], [0, HALF], [0, -HALF]]) {
        const fx = Math.floor(x + ox), fy = Math.floor(y + oy);
        if (fx < 0 || fy < 0 || fx >= nav.w || fy >= nav.h) return false;
        if (!nav.walk[fy * W + fx]) return false;
      }
    }
    return true;
  };
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    // Corde bornée : au-delà, on perd le tracé réel de la rue et la voiture
    // couperait un carrefour entier en ligne droite.
    const maxJ = Math.min(pts.length - 1, i + 14);
    for (j = maxJ; j > i + 1; j--) if (clear(pts[i], pts[j])) break;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ LES DESTINATIONS DU TAXI — DÉRIVÉES, JAMAIS ÉCRITES À CÔTÉ.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️ CHAQUE ARRÊT EST LA CASE ROULABLE LA PLUS PROCHE D'UN LIEU EXISTANT. Une
   table de coordonnées écrite à la main aurait tenu jusqu'au premier bâtiment
   déplacé — c'est exactement la leçon de `townSpots` (§3 du README de la ferme).
   Ajouter un monument à la ville, c'est l'ajouter ici en UNE ligne qui NOMME sa
   constante ; le jour où on le bouge, son arrêt le suit tout seul.
   ⚠️ ET UN LIEU SANS ROUTE À PORTÉE N'EST PAS PROPOSÉ. Proposer une destination
   qu'on ne peut pas atteindre, c'est le « propose puis refuse » que le 426 s'est
   juré de ne plus commettre. */
const TOWN_TAXI_CACHE = { w: null, list: null };
export function townTaxiStops(tw) {
  if (!tw) return [];
  if (TOWN_TAXI_CACHE.w === tw && TOWN_TAXI_CACHE.list) return TOWN_TAXI_CACHE.list;
  const src = [
    ["station",  C.TOWN_STATION.x + C.TOWN_STATION.w / 2, C.TOWN_STATION.y + C.TOWN_STATION.h + 2],
    ["plaza",    C.TOWN_PLAZA.x + C.TOWN_PLAZA.w / 2,     C.TOWN_PLAZA.y + C.TOWN_PLAZA.h - 2],
    ["market",   C.TOWN_MARKET.x + C.TOWN_MARKET.w / 2,   C.TOWN_MARKET.y + C.TOWN_MARKET.h - 2],
    ["hall",     C.TOWN_HALL.x + C.TOWN_HALL.w / 2,       C.TOWN_HALL.y + C.TOWN_HALL.h + 2],
    ["church",   C.TOWN_CHURCH.x + C.TOWN_CHURCH.w / 2,   C.TOWN_CHURCH.y + C.TOWN_CHURCH.h + 2],
    ["court",    C.TOWN_COURT.x + C.TOWN_COURT.w / 2,     C.TOWN_COURT.y + C.TOWN_COURT.h + 2],
    ["boutique", C.TOWN_BOUTIQUE.x + C.TOWN_BOUTIQUE.w / 2, C.TOWN_BOUTIQUE.y + C.TOWN_BOUTIQUE.h + 2],
    ["park",     C.TOWN_KIOSK.x + 1,                      C.TOWN_KIOSK.y + 4],
    ["lake",     C.TOWN_PIER.x + C.TOWN_PIER.w / 2,       C.TOWN_LAKE.y - 3],
    ["belvedere",C.TOWN_BELVEDERE.x + C.TOWN_BELVEDERE.w / 2, C.TOWN_BELVEDERE.y + C.TOWN_BELVEDERE.h + 2],
    ["artisans", C.TOWN_ARTISANS.x + 3,                   C.TOWN_ARTISANS.y + C.TOWN_ARTISANS.h / 2],
    ["cemetery", C.TOWN_CEMETERY.x + C.TOWN_CEMETERY.w / 2, C.TOWN_CEMETERY.y + C.TOWN_CEMETERY.h + 2],
  ];
  const list = [];
  for (const [key, x, y] of src) {
    /* Rayon large et RÉSEAU DE RUES imposé : on cherche le trottoir le plus
       proche du lieu, pas la première dalle venue (voir townRoadNav/main).
       ⚠️ 433 — LA RUE D'ABORD, L'ESPLANADE SEULEMENT S'IL N'Y EN A PAS. Le
       dallage de la place centrale est roulable, donc l'arrêt « place » tombait
       DEDANS : le taxi traversait le square en diagonale et se garait contre
       l'obélisque, en se faufilant entre deux parterres. Un taxi dépose au
       trottoir et le client finit à pied — c'est déjà la règle écrite plus haut
       pour les poches isolées, elle valait aussi pour les esplanades. */
    const near = townRoadNear(tw, x, y, 26, true, true) || townRoadNear(tw, x, y, 26, true);
    if (near) list.push({ key, x: near.x, y: near.y, walk: +near.d.toFixed(1) });
  }
  TOWN_TAXI_CACHE.w = tw; TOWN_TAXI_CACHE.list = list;
  return list;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ ZIP 433 — LES PIGEONS ET LES COLOMBES DE LA PLACE.
   ╚══════════════════════════════════════════════════════════════════════════
   Demande de Guillaume : « des colombes et des pigeons par terre sur la place
   centrale, qui s'envolent élégamment quand on se rapproche trop d'elles ;
   ajoute-les aussi devant le courthouse ; travaille bien le vol ». Puis, après
   essai : « le comportement social des pigeons n'est pas très réaliste […] ils
   se comportent comme les animaux de la ferme ».

   ⚠️⚠️ RIEN DE TOUT ÇA NE CIRCULE SUR LE RÉSEAU, ET C'EST LE POINT D'ARCHITECTURE.
   Un vol d'oiseaux, c'est vingt entités qui bougent soixante fois par seconde :
   diffusées, elles feraient exploser à elles seules le plafond de dix messages
   par seconde du §3. Deux conséquences, et Guillaume a tranché la seconde
   (« leur comportement doit pas être exactement partagé entre tous les
   joueurs ») :
     · les EMPLACEMENTS POSSIBLES se déduisent de la carte, donc tout le monde
       a des pigeons au même endroit ;
     · le NOMBRE, les activités et les envols sont tirés LOCALEMENT. Deux
       joueurs sur la même place ne comptent pas les mêmes pigeons — c'est
       assumé, ça ne se remarque pas, et ça coûte zéro message.
   ⚠️ L'envol, lui, écoute TOUS les joueurs : leurs positions circulent déjà,
   donc un vol s'envole aussi quand c'est le camarade qui approche, gratuitement.

   ⚠️ ET LE COMPORTEMENT VIT DANS LE MOTEUR, PAS DANS LA BOUCLE DE RENDU — même
   raison que la conduite du taxi juste en dessous : une machine à états dont
   les règles se contredisent a toujours l'air de marcher quand on la regarde
   dix secondes. `tools/render-oiseaux.mjs` la rejoue image par image. */
const TOWN_FLOCK_CACHE = { w: null, list: null };
/* Les emplacements. ⚠️ DÉRIVÉS DE DEUX RECTANGLES EXISTANTS, jamais écrits en
   coordonnées : le jour où la place ou le tribunal bougent, les oiseaux
   suivent — c'est la leçon de `townSpots` et de `townTaxiStops`. */
export function townFlocks(tw) {
  if (!tw) return [];
  if (TOWN_FLOCK_CACHE.w === tw && TOWN_FLOCK_CACHE.list) return TOWN_FLOCK_CACHE.list;
  const nav = townNav(tw);
  if (!nav) return [];
  const W = tw.w;
  /* Une case accueille un oiseau si elle est PRATICABLE, DALLÉE et DÉGAGÉE de
     ses huit voisines. La troisième condition n'est pas du luxe : posé contre
     un parterre, l'oiseau décolle dans la haie et on ne voit qu'un battement
     derrière un buisson. */
  const roomy = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const fx = x + dx, fy = y + dy;
      if (fx < 0 || fy < 0 || fx >= tw.w || fy >= tw.h) return false;
      const i = fy * W + fx;
      if (!nav.walk[i]) return false;
      const gnd = tw.ground[i];
      if (gnd !== C.G_PATH && gnd !== C.G_PATH_STONE) return false;
      if (tw.objects[i] !== C.O_NONE) return false;
    }
    return true;
  };
  const sites = [
    // La place centrale : le gros du vol, autour de la fontaine.
    { key: "plaza", rect: C.TOWN_PLAZA, n: 14 },
    // Le parvis du tribunal : la bande dallée devant sa façade sud.
    { key: "court", rect: { x: C.TOWN_COURT.x - 3, y: C.TOWN_COURT.y + C.TOWN_COURT.h, w: C.TOWN_COURT.w + 6, h: 6 }, n: 9 },
  ];
  const list = [];
  for (const site of sites) {
    const free = [];
    for (let y = site.rect.y; y < site.rect.y + site.rect.h; y++)
      for (let x = site.rect.x; x < site.rect.x + site.rect.w; x++)
        if (roomy(x, y)) free.push([x, y]);
    if (!free.length) continue;
    /* ⚠️⚠️ UNE VOLÉE SE GROUPE, ELLE NE SE SAUPOUDRE PAS. On choisit un CENTRE
       (la case libre la plus proche du milieu du lieu — au centre d'une place,
       c'est la fontaine) et le vol vit dans un disque autour de lui. Neuf
       oiseaux répartis sur trente cases de large, c'est un oiseau par écran,
       donc AUCUNE volée — et un envol qu'on ne voit pas partir.
       ⚠️ Le tri est TOTALEMENT DÉTERMINISTE (distance, puis coordonnées) :
       `Array.sort` ne garantit rien sur les ex æquo (§4 de CLAUDE.md). */
    const cx0 = site.rect.x + site.rect.w / 2, cy0 = site.rect.y + site.rect.h / 2;
    free.sort((a, b) => (Math.hypot(a[0] - cx0, a[1] - cy0) - Math.hypot(b[0] - cx0, b[1] - cy0))
                        || (a[1] - b[1]) || (a[0] - b[0]));
    const spots = free.slice(0, Math.max(site.n * 3, 24));
    let sx = 0, sy = 0;
    for (const q of spots) { sx += q[0] + 0.5; sy += q[1] + 0.5; }
    const cx = sx / spots.length, cy = sy / spots.length;
    let r = 0;
    for (const q of spots) r = Math.max(r, Math.hypot(q[0] + 0.5 - cx, q[1] + 0.5 - cy));
    list.push({ key: site.key, cx, cy, r: Math.max(2.5, r), spots, max: site.n, birds: [], popAt: 0, pop: 0 });
  }
  TOWN_FLOCK_CACHE.w = tw; TOWN_FLOCK_CACHE.list = list;
  return list;
}
/* Un oiseau neuf, posé sur une case libre du site. ⚠️ TOUT EST TIRÉ AU SORT
   LOCALEMENT (`Math.random`) et non depuis une graine partagée : c'est la
   décision de Guillaume ci-dessus, et c'est aussi ce qui fait qu'une place
   n'a pas exactement la même vie deux jours de suite. */
export function newBird(site, away) {
  const q = site.spots[(Math.random() * site.spots.length) | 0];
  return {
    kind: Math.random() < C.BIRD_DOVE_SHARE ? "dove" : "pigeon",
    x: q[0] + 0.5 + (Math.random() - 0.5) * 0.6, y: q[1] + 0.5 + (Math.random() - 0.5) * 0.6,
    vx: 0, vy: 0, alt: 0, ang: Math.random() * 6.28, spd: 0, a: away ? 0 : 1,
    st: away ? "away" : "ground", act: "idle", actT: Math.random() * C.BIRD_ACT_MAX,
    exc: 0, tx: 0, ty: 0, follow: -1, bank: Math.random() < 0.5 ? -1 : 1,
    face: Math.random() < 0.5 ? -1 : 1, wing: Math.random() * 6.28, wingRate: 0,
    t: 0, wait: away ? Math.random() * 6 : 0, seed: (Math.random() * 1e6) | 0,
  };
}
/* ╔══════════════════════════════════════════════════════════════════════════
   ║ UN PAS DE VOLÉE. Le groupe est l'unité, pas l'oiseau — et c'est tout le
   ║ sujet du deuxième retour de Guillaume.
   ╚══════════════════════════════════════════════════════════════════════════
   `ctx` = { threats: [{x,y}], food: {x,y} | null }.

   LES CINQ ACTIVITÉS AU SOL, et pourquoi chacune existe :
     · `idle`  — planté, il regarde. ⚠️ C'EST LA PLUS IMPORTANTE : « ils ne font
       pas toujours que picorer ». Un oiseau qui a toujours quelque chose à
       faire est un automate ;
     · `peck`  — coups de bec, d'autant plus rapides qu'il est excité ;
     · `walk`  — il flâne vers un point tiré au sort dans le disque du groupe ;
     · `court` — la parade : il EN SUIT UN AUTRE, jabot gonflé, en tournant
       autour de lui. C'est de là que viennent les accélérations, les arrêts
       nets et les poursuites que décrit la demande ;
     · `squab` — la chamaillerie : une ruée d'une demi-seconde sur un voisin,
       ailes battantes. Elle n'apparaît QUE si le groupe est serré ou excité,
       c'est-à-dire autour du pain.

   ⚠️⚠️ ET L'ESPACEMENT N'EST JAMAIS RÉGLÉ : il TOMBE de deux forces opposées
   (on s'écarte du voisin trop proche, on revient vers le groupe si l'on s'en
   éloigne). C'est ce qui produit des grappes serrées et des isolés, au lieu de
   la grille régulière du premier jet. */
export function flockStep(site, dt, ctx, cfg, now) {
  const birds = site.birds;
  const food = ctx.food || null;
  const threats = ctx.threats || [];
  /* ---- LA POPULATION DÉRIVE. On retire une cible de temps en temps ; les
     oiseaux en trop restent au loin, les manquants reviennent. Le pain, lui,
     appelle tout le monde — c'est même à ça qu'on le reconnaît. */
  if (now - site.popAt > cfg.POP_MS) {
    site.popAt = now;
    site.pop = Math.round(site.max * (cfg.POP_MIN + Math.random() * (cfg.POP_MAX - cfg.POP_MIN)));
  }
  const foodCall = food && Math.hypot(food.x - site.cx, food.y - site.cy) < cfg.FOOD_R;
  const want = foodCall ? site.max : site.pop;
  let landed = 0;
  for (const b of birds) if (b.st !== "away") landed++;

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    b.t += dt;
    // La menace la plus proche, tous joueurs confondus.
    let td = Infinity, tx = 0, ty = 0;
    for (const q of threats) {
      const d = Math.hypot(q.x - b.x, q.y - b.y);
      if (d < td) { td = d; tx = q.x; ty = q.y; }
    }
    if (b.st === "ground") {
      b.alt = 0; b.a = 1;
      if (td < cfg.FLUSH_R) {
        /* ⚠️ IL FUIT DANS LA DIRECTION OPPOSÉE À LA MENACE. Un oiseau qui
           décolle vers le joueur a l'air d'attaquer. Le `bank` propre à chaque
           oiseau écarte ensuite les trajectoires en éventail. */
        b.ang = Math.atan2(b.y - ty, b.x - tx) + (Math.random() - 0.5) * 0.4;
        b.st = "fly"; b.t = 0; b.spd = cfg.TAKEOFF; b.vz = cfg.CLIMB; b.act = "idle";
        continue;
      }
      if (td < cfg.ALERT_R) { b.act = "alert"; b.vx = b.vy = 0; continue; }
      if (b.act === "alert") { b.act = "idle"; b.actT = 0; }
      /* ---- L'EXCITATION : elle monte près du pain et dans la foule, elle
         retombe seule. Elle pilote la vitesse, le rythme des coups de bec et
         la probabilité de se chamailler — un seul nombre pour trois effets. */
      const nearFood = food && Math.hypot(food.x - b.x, food.y - b.y) < cfg.FOOD_EAT_R * 2.5;
      let crowd = 0;
      for (let k = 0; k < birds.length; k++) {
        if (k === i || birds[k].st !== "ground") continue;
        if (Math.hypot(birds[k].x - b.x, birds[k].y - b.y) < 1.6) crowd++;
      }
      const wantExc = (nearFood ? 1 : 0) * 0.75 + Math.min(0.45, crowd * 0.11);
      b.exc += (wantExc - b.exc) * Math.min(1, dt * (wantExc > b.exc ? cfg.EXC_UP : cfg.EXC_DOWN));
      // ---- Changement d'activité
      b.actT -= dt;
      if (b.actT <= 0) {
        const r = Math.random();
        if (food && Math.hypot(food.x - b.x, food.y - b.y) < cfg.FOOD_R) {
          /* Autour du pain : on se rue, on picore, on se chamaille. Personne ne
             flâne. */
          if (Math.hypot(food.x - b.x, food.y - b.y) > cfg.FOOD_EAT_R * 0.55) {
            /* ⚠️⚠️ ON VISE UNE MIETTE, PAS « LE PAIN ». Premier jet : tous les
               oiseaux convergeaient vers un point unique avec une gigue — vu en
               jeu, ils s'empilaient en CHENILLE, une file indienne qui rentre
               dans le même pixel. Un quignon émietté fait plusieurs tas, et
               c'est ce qui étale l'attroupement en rosace au lieu d'une file :
               chacun a SA miette et se chamaille avec son voisin pour elle. */
            const pts = food.pts;
            const q = pts && pts.length ? pts[(Math.random() * pts.length) | 0] : food;
            b.act = "walk";
            b.tx = q.x + (Math.random() - 0.5) * 0.5;
            b.ty = q.y + (Math.random() - 0.5) * 0.5;
          } else if (r < 0.14 && crowd > 1) { b.act = "squab"; b.follow = nearestOther(birds, i); }
          else { b.act = "peck"; }
        } else if (r < 0.30) b.act = "idle";
        else if (r < 0.55) b.act = "peck";
        else if (r < 0.84) {
          b.act = "walk";
          const a = Math.random() * 6.28, rr = Math.random() * site.r;
          b.tx = site.cx + Math.cos(a) * rr; b.ty = site.cy + Math.sin(a) * rr;
        } else if (r < 0.96 && crowd > 0) { b.act = "court"; b.follow = nearestOther(birds, i); }
        else { b.act = "idle"; }
        b.actT = cfg.ACT_MIN + Math.random() * (cfg.ACT_MAX - cfg.ACT_MIN) * (1 - b.exc * 0.5);
      }
      /* ---- LE PILOTAGE. Une vitesse VOULUE, puis on y va progressivement :
         c'est l'accélération qui manquait (« parfois l'un suit l'autre,
         accélère, ralentit sa course en le suivant »). */
      let wx = 0, wy = 0, spd = 0;
      if (b.act === "walk") {
        wx = b.tx - b.x; wy = b.ty - b.y;
        spd = cfg.WALK_SPD * (1 + b.exc * 1.6);
        if (Math.hypot(wx, wy) < 0.25) { b.act = "peck"; b.actT = 0.4 + Math.random(); }
      } else if (b.act === "court" && b.follow >= 0 && birds[b.follow] && birds[b.follow].st === "ground") {
        /* La parade : on ne va pas SUR l'autre, on tourne AUTOUR. Le décalage
           tangentiel est ce qui donne la ronde du mâle, et il coûte un cosinus. */
        const o = birds[b.follow];
        const a = Math.atan2(b.y - o.y, b.x - o.x) + dt * 1.7 * b.bank;
        wx = o.x + Math.cos(a) * 0.8 - b.x; wy = o.y + Math.sin(a) * 0.8 - b.y;
        spd = cfg.WALK_SPD * 1.5;
      } else if (b.act === "squab" && b.follow >= 0 && birds[b.follow]) {
        const o = birds[b.follow];
        wx = o.x - b.x; wy = o.y - b.y;
        spd = cfg.RUN_SPD;
      }
      // ---- Séparation : on s'écarte de qui nous serre. C'est elle qui casse
      // l'espacement régulier, sans qu'aucun espacement ne soit écrit nulle part.
      for (let k = 0; k < birds.length; k++) {
        if (k === i || birds[k].st !== "ground") continue;
        const dx = b.x - birds[k].x, dy = b.y - birds[k].y;
        const d = Math.hypot(dx, dy);
        if (d > 0.001 && d < cfg.SEP) {
          const f = (cfg.SEP - d) / cfg.SEP * cfg.SEP_F;
          wx += (dx / d) * f; wy += (dy / d) * f;
          if (spd < cfg.WALK_SPD) spd = cfg.WALK_SPD;
        }
      }
      // ---- Cohésion : hors du disque du groupe, on y revient. Sans elle, la
      // volée dérive et la place se vide d'un côté en dix minutes.
      const dc = Math.hypot(b.x - site.cx, b.y - site.cy);
      if (dc > site.r) {
        wx += (site.cx - b.x) / dc * cfg.COH; wy += (site.cy - b.y) / dc * cfg.COH;
        if (spd < cfg.WALK_SPD) spd = cfg.WALK_SPD;
      }
      const wl = Math.hypot(wx, wy);
      const vx = wl > 0.001 ? (wx / wl) * spd : 0, vy = wl > 0.001 ? (wy / wl) * spd : 0;
      b.vx += (vx - b.vx) * Math.min(1, dt * cfg.ACC);
      b.vy += (vy - b.vy) * Math.min(1, dt * cfg.ACC);
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.abs(b.vx) > 0.05) b.face = b.vx < 0 ? -1 : 1;
      b.spd = Math.hypot(b.vx, b.vy);
      continue;
    }
    if (b.st === "fly") {
      b.vz = Math.max(0, b.vz - cfg.CLIMB_DECAY * dt);
      b.alt += b.vz * dt;
      b.spd += (cfg.CRUISE - b.spd) * Math.min(1, dt * 2.2);
      b.ang += b.bank * cfg.TURN * dt * Math.max(0, 1 - b.t / 1.6);
      b.x += Math.cos(b.ang) * b.spd * dt;
      b.y += Math.sin(b.ang) * b.spd * dt;
      b.face = Math.cos(b.ang) < 0 ? -1 : 1;
      b.wingRate = cfg.WING_FAST + (cfg.WING_GLIDE - cfg.WING_FAST) * Math.min(1, b.t / cfg.BEAT_S);
      b.wing += b.wingRate * dt;
      if (b.t > cfg.FADE_S) b.a = Math.max(0, 1 - (b.t - cfg.FADE_S) / 0.7);
      if (b.a <= 0) { b.st = "away"; b.t = 0; b.wait = cfg.AWAY_MIN + Math.random() * (cfg.AWAY_MAX - cfg.AWAY_MIN); landed--; }
      continue;
    }
    if (b.st === "away") {
      // Le pain raccourcit l'attente : c'est LUI qui rappelle les absents.
      if (b.t < (foodCall ? b.wait * 0.25 : b.wait)) continue;
      if (landed >= want) { b.t = 0; b.wait = 3 + Math.random() * 6; continue; }
      const q = site.spots[(Math.random() * site.spots.length) | 0];
      b.hx = q[0] + 0.5; b.hy = q[1] + 0.5;
      const a = Math.random() * 6.28;
      b.x = b.hx + Math.cos(a) * cfg.RETURN_D;
      b.y = b.hy + Math.sin(a) * cfg.RETURN_D;
      b.alt = cfg.ALT_MAX; b.a = 0; b.spd = cfg.CRUISE * 0.7;
      b.ang = Math.atan2(b.hy - b.y, b.hx - b.x);
      b.st = "land"; b.t = 0; b.wing = 0; landed++;
      continue;
    }
    // ---- land : descente en plané, puis cabré.
    const hx = food ? food.x : b.hx, hy = food ? food.y : b.hy;
    const dx = hx - b.x, dy = hy - b.y, d = Math.hypot(dx, dy);
    b.a = Math.min(1, b.a + dt * 2.4);
    const want2 = Math.atan2(dy, dx);
    let da = want2 - b.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    b.ang += Math.max(-cfg.TURN * dt, Math.min(cfg.TURN * dt, da));
    /* ⚠️ LA DESCENTE EST PROPORTIONNELLE À LA DISTANCE RESTANTE : l'oiseau
       touche le sol EN ARRIVANT, pas trois cases avant. Même idée que le
       freinage du taxi, et même défaut évité — l'atterrissage en l'air. */
    const flare = d < cfg.FLARE_D;
    if (flare) b.spd = Math.max(cfg.LAND_SPD, b.spd - cfg.LAND_BRAKE * dt);
    const step = b.spd * dt;
    b.alt = Math.max(0, b.alt - (d > 0.05 ? (b.alt / Math.max(0.2, d)) * step : b.alt));
    b.x += Math.cos(b.ang) * step; b.y += Math.sin(b.ang) * step;
    b.face = Math.cos(b.ang) < 0 ? -1 : 1;
    b.wingRate = flare ? cfg.WING_FAST : cfg.WING_GLIDE;
    b.wing += b.wingRate * dt;
    b.flare = flare;
    if ((d < 0.3 && b.alt < 0.08) || b.t > cfg.LAND_MAX_S) {
      b.alt = 0; b.a = 1; b.spd = 0; b.vx = b.vy = 0;
      b.st = "ground"; b.act = "peck"; b.t = 0; b.actT = 0.3 + Math.random();
    }
  }
}
function nearestOther(birds, i) {
  let best = -1, bd = Infinity;
  for (let k = 0; k < birds.length; k++) {
    if (k === i || birds[k].st !== "ground") continue;
    const d = Math.hypot(birds[k].x - birds[i].x, birds[k].y - birds[i].y);
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ ZIP 432 — LA CONDUITE DU TAXI, EN RÈGLE PURE.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ELLE EST DANS LE MOTEUR, PAS DANS LA BOUCLE DE RENDU, ET C'EST POUR
   POUVOIR LA MESURER. Une conduite « réaliste » — accélération progressive,
   ralentissement en virage, freinage pile au point d'arrivée — est faite de
   trois vitesses cibles qui se contredisent : regardée à l'œil, elle a
   toujours l'air de marcher, et elle tourne en rond une fois sur cent. Ici,
   `tools/verify-taxi.mjs` la rejoue sur les 132 trajets réels de la ville et
   compte les arrivées. Écrite dans FermeGame, elle n'aurait été jugeable qu'en
   regardant une voiture pendant une minute.

   Trois vitesses cibles, on retient la plus BASSE :
     · la croisière (dérivée du cheval, voir TAXI_SPEED) ;
     · celle qu'autorise le VIRAGE À VENIR, lu sur le chemin quelques tuiles plus
       loin — d'où « ralentit en entrée de courbe, réaccélère en sortie », sans
       aucune table de cas ;
     · celle qu'autorise la DISTANCE RESTANTE, v = √(2·a·d), qui est la formule
       du freinage : arrêt PILE au but, quelle que soit la vitesse d'approche.
   ⚠️ ET ON PASSE AU POINT SUIVANT QUAND ON L'A DÉPASSÉ, pas seulement quand on
   est dedans. Un rayon d'arrivée seul, c'est un véhicule qui rate sa cible d'un
   demi-pixel à pleine vitesse et tourne autour indéfiniment — le défaut classe
   de tous les suiveurs de chemin, et il ne lève aucune erreur. */
export function taxiRemaining(t) {
  if (!t.path || t.i >= t.path.length) return 0;
  let d = Math.hypot(t.path[t.i].x - t.x, t.path[t.i].y - t.y);
  for (let k = t.i; k < t.path.length - 1; k++) d += Math.hypot(t.path[k + 1].x - t.path[k].x, t.path[k + 1].y - t.path[k].y);
  return d;
}
export function taxiCornerSpeed(t, cfg) {
  let d = 0, turn = 0, prev = t.ang, px = t.x, py = t.y;
  for (let k = t.i; k < t.path.length && d < cfg.LOOKAHEAD; k++) {
    const nx = t.path[k].x, ny = t.path[k].y;
    const seg = Math.hypot(nx - px, ny - py);
    if (seg > 0.001) {
      const a = Math.atan2(ny - py, nx - px);
      let da = a - prev; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      turn += Math.abs(da); prev = a; d += seg;
    }
    px = nx; py = ny;
  }
  const k2 = Math.max(0, 1 - turn / (Math.PI * 0.9));
  return cfg.SPEED * (cfg.CORNER_MIN + (1 - cfg.CORNER_MIN) * k2);
}
/* Un pas de conduite. Rend `true` quand le dernier point est atteint.
   `cfg` = { SPEED, ACCEL, BRAKE, CORNER_MIN, LOOKAHEAD, TURN_RATE, ARRIVE_R }. */
export function taxiStep(t, dt, cfg) {
  if (!t.path || t.i >= t.path.length) { t.spd = Math.max(0, t.spd - cfg.BRAKE * dt); return true; }
  const tgt = t.path[t.i];
  const dx = tgt.x - t.x, dy = tgt.y - t.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.0001) {
    const want = Math.atan2(dy, dx);
    let da = want - t.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const maxTurn = cfg.TURN_RATE * dt;
    t.ang += Math.abs(da) < maxTurn ? da : Math.sign(da) * maxTurn;
  }
  const rest = taxiRemaining(t);
  const vBrake = Math.sqrt(Math.max(0, 2 * cfg.BRAKE * Math.max(0, rest - cfg.ARRIVE_R * 0.5)));
  const vTarget = Math.min(cfg.SPEED, taxiCornerSpeed(t, cfg), vBrake);
  /* ⚠️⚠️ BANDE MORTE, ET SANS ELLE LA VOITURE FREINE EN LIGNE DROITE. Le test
     `vTarget > t.spd` est FAUX quand les deux sont égaux — c'est-à-dire tout le
     temps une fois la vitesse de croisière atteinte : le véhicule passait alors
     en freinage, ralentissait, réaccélérait, et broutait en permanence. Trouvé
     par le banc (« il lève le pied à 19,8 tuiles de l'arrivée »), invisible à
     l'œil. Un comparateur strict entre deux flottants qui convergent est une
     oscillation en attente. */
  const dv = vTarget - t.spd;
  if (Math.abs(dv) > 0.05) t.spd += (dv > 0 ? cfg.ACCEL : -cfg.BRAKE) * dt;
  else t.spd = vTarget;
  t.spd = Math.max(0, Math.min(cfg.SPEED, t.spd));
  const px0 = t.x, py0 = t.y;
  t.x += Math.cos(t.ang) * t.spd * dt;
  t.y += Math.sin(t.ang) * t.spd * dt;
  /* Point atteint : on est DANS le rayon, ou bien on vient de le DÉPASSER —
     le produit scalaire change de signe entre l'avant et l'après. */
  const before = (tgt.x - px0) * Math.cos(t.ang) + (tgt.y - py0) * Math.sin(t.ang);
  const after = (tgt.x - t.x) * Math.cos(t.ang) + (tgt.y - t.y) * Math.sin(t.ang);
  const newDist = Math.hypot(tgt.x - t.x, tgt.y - t.y);
  if (newDist <= cfg.ARRIVE_R || (before > 0 && after <= 0)) {
    t.i++;
    if (t.i >= t.path.length) { t.i = t.path.length; return true; }
  }
  return false;
}

/* La boîte du personnage, en dur : c'est celle de townCanStand côté jeu.
   ⚠️ ELLE EST ÉCRITE ICI ET LUE LÀ-BAS, pas l'inverse — deux boîtes réglées
   séparément, c'est la divergence en attente du §8. */
export function townBoxFree(tw, x, y, fromE) {
  const nav = townNav(tw); if (!nav) return false;
  const r = 0.3, W = nav.w, H = nav.h;
  /* ⚠️⚠️ SANS ALTITUDE DE RÉFÉRENCE, ON PREND CELLE DE LA CASE SOUS LES PIEDS —
     ET ON VÉRIFIE QUAND MÊME. Un `fromE` absent voulait dire « ne regarde pas
     le relief », ce qui laissait passer une boîte à cheval sur une falaise :
     le personnage tient dans la case, mais son épaule est un demi-étage plus
     bas. Le jeu, lui, relit l'altitude à chaque image et refuse. La boîte ne
     doit JAMAIS enjamber plus qu'une marche, c'est l'invariant — pas un
     paramètre de l'appelant. */
  const eRef = fromE !== undefined ? fromE : townElevTile(tw, x, y + 0.2);
  for (let p = 0; p < 4; p++) {
    const px = x + (p % 2 ? r : -r), py = y + (p < 2 ? 0 : 0.35);
    const fx = Math.floor(px), fy = Math.floor(py);
    if (fx < 0 || fy < 0 || fx >= W || fy >= H) return false;
    const i = fy * W + fx;
    if (!nav.walk[i]) return false;
    if (Math.abs(tw.elev[i] - eRef) > C.TOWN_STEP_MAX) return false;
  }
  return true;
}
/* Le segment A→B est-il parcourable EN LIGNE DROITE ?
   ⚠️⚠️ L'ALTITUDE DE RÉFÉRENCE EST CELLE DE L'ÉCHANTILLON COURANT, PAS DU
   PRÉCÉDENT, ET C'EST LE DERNIER DÉFAUT DE NAVIGATION DU 428. Premier jet :
   `prevE` retenait l'altitude de l'échantillon d'avant, à un quart de case en
   arrière — en imitant le jeu, qui compare bien la boîte NOUVELLE à
   l'altitude ANCIENNE. Mais le jeu avance de 0,025 case par image, pas de
   0,25 : son « ancienne » altitude est celle d'il y a un quarantième de case.
   Sur un escalier dont chaque marche vaut 0,2 et dont le seuil est 0,34, ce
   décalage suffit à faire dire « ça passe » à un segment que le jeu refuse.
   Symptôme : le chemin franchissait un escalier EN BIAIS par le côté, ce qui
   n'existe pas, et le résident restait planté au pied des marches de la
   Haute-Ville — encore une fois sans la moindre erreur.
   Sans décalage du tout, le test devient l'invariant lui-même (« la boîte
   n'enjambe jamais plus qu'une marche »), donc au moins aussi strict que le
   jeu à n'importe quelle vitesse. Un test de navigation doit se tromper du
   côté du refus. */
export function townSegmentClear(tw, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(d / 0.2));
  for (let s = 1; s <= n; s++) {
    const t = s / n, x = ax + dx * t, y = ay + dy * t;
    if (!townBoxFree(tw, x, y)) return false;
  }
  return true;
}
export function townElevTile(tw, x, y) {
  if (!tw || !tw.elev) return 0;
  const fx = Math.floor(x), fy = Math.floor(y);
  if (fx < 0 || fy < 0 || fx >= tw.w || fy >= tw.h) return 0;
  return tw.elev[fy * tw.w + fx];
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 426 — L'INTÉRIEUR DU TRIBUNAL. Voir le long en-tête des constantes
   COURT_* : le plan est déduit des usages, les trois niveaux tiennent dans une
   seule grille empilée, et le niveau se LIT dans `y`.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ CE GÉNÉRATEUR EST PUR ET SANS GRAINE. Il n'y a rien d'aléatoire dans un
   bâtiment : deux visites doivent donner exactement le même couloir, sans quoi
   deux joueurs ne décriraient pas le même endroit. Le seul « hasard » toléré
   serait décoratif, et il n'en reste aucun.
   ⚠️ ET IL SORT COMPLET. Leçon du 425 (« un monde doit sortir complet de son
   constructeur ») : `tile`, `solid`, `props`, `doors` et `rooms` sont tous
   remplis ici, y compris ce dont le rendu seul a besoin. Rien n'est ajouté
   plus tard par un chemin d'appel particulier.
   ═══════════════════════════════════════════════════════════════════════════ */
export function courtFloorY0(f) { return f * (C.COURT_FLOOR_H + C.COURT_FLOOR_GAP); }
export function courtFloorOf(y) {
  const step = C.COURT_FLOOR_H + C.COURT_FLOOR_GAP;
  const f = Math.floor(y / step);
  return Math.max(0, Math.min(C.COURT_FLOORS.length - 1, f));
}
export function generateCourtWorld() {
  const W = C.COURT_MAP_W, H = C.COURT_MAP_H;
  const tile = new Uint8Array(W * H);      // CT_VOID partout au départ
  const solid = new Uint8Array(W * H).fill(1);
  const props = [];                        // { x, y, kind, dir? } — mobilier, dessiné client-side
  const doors = [];                        // { x, y, floor, room } — pour les plaques et les invites
  const id = (x, y) => y * W + x;
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, t) => {
    if (!inMap(x, y)) return;
    tile[id(x, y)] = t;
    solid[id(x, y)] = (t === C.CT_VOID || t === C.CT_WALL || t === C.CT_WINDOW || t === C.CT_BARS) ? 1 : 0;
  };
  const fill = (x0, y0, w, h, t) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, t); };
  const border = (x0, y0, w, h, t) => {
    for (let x = x0; x < x0 + w; x++) { set(x, y0, t); set(x, y0 + h - 1, t); }
    for (let y = y0; y < y0 + h; y++) { set(x0, y, t); set(x0 + w - 1, y, t); }
  };
  /* ⚠️⚠️ AUCUN MEUBLE DEVANT UNE PORTE — ET C'EST UN GARDE-FOU, PAS UNE
     CONVENTION. Premier jet : les colonnes du couloir (posées tous les cinq
     pas) et le panneau d'affichage tombaient devant quatre portes sur dix-sept.
     Résultat : SIX PIÈCES INACCESSIBLES, dont la salle d'audience et les
     cellules — un bâtiment de dix-sept pièces dont un tiers est murées, sans
     la moindre erreur à l'exécution. Trouvé par tools/verify-vallee.mjs, pas à
     la relecture : une colonne à (19,12) et une porte à (18,12) sont écrites à
     cent lignes l'une de l'autre.
     ⚠️ IL PARLE. Un meuble refusé en silence, c'est un panneau d'affichage qui
     disparaît sans que personne ne le sache — exactement le repli menteur que
     CLAUDE.md proscrit. On refuse ET on le dit. */
  const doorGuard = new Set();
  for (const r of C.COURT_ROOMS) {
    const fy = courtFloorY0(r.floor);
    for (const d of r.doors) {
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) doorGuard.add(`${d.x + dx},${fy + d.y + dy}`);
    }
  }
  for (let f = 0; f < C.COURT_FLOORS.length; f++) {
    const fy = courtFloorY0(f);
    for (const sw of C.COURT_STAIRWELLS) {
      for (let y = sw.y; y < sw.y + sw.h + 1; y++) for (let x = sw.x; x < sw.x + sw.w; x++) doorGuard.add(`${x},${fy + y}`);
    }
  }
  for (const dx of [0, 1]) for (const dy of [0, -1]) doorGuard.add(`${C.COURT_ENTRY.x + dx},${C.COURT_ENTRY.y + dy}`);
  const addProp = (x, y, kind, blocks, extra) => {
    if (!inMap(x, y)) return;
    if (blocks && doorGuard.has(`${x},${y}`)) {
      console.warn(`[TRIBUNAL] meuble « ${kind} » refusé en (${x},${y}) : il bouchait une porte, un escalier ou le seuil.`);
      return;
    }
    props.push({ x, y, kind, ...(extra || {}) });
    if (blocks) solid[id(x, y)] = 1;
  };

  for (let f = 0; f < C.COURT_FLOORS.length; f++) {
    const y0 = courtFloorY0(f);
    const groundFloor = f === 0, basement = f === 2;
    // ---- L'ENVELOPPE : le couloir occupe tout le niveau, les pièces viennent
    // le découper. On pose donc le sol partout puis le mur d'enceinte.
    fill(0, y0, C.COURT_FLOOR_W, C.COURT_FLOOR_H, basement ? C.CT_STONE : C.CT_MARBLE);
    border(0, y0, C.COURT_FLOOR_W, C.COURT_FLOOR_H, C.CT_WALL);
    /* Les FENÊTRES du mur d'enceinte. Elles ne servent à rien mécaniquement —
       et c'est justement pour ça qu'il en faut : un couloir aveugle de 46 cases
       se lit comme une cave, à tous les étages. Le sous-sol n'en a pas, ce qui
       est exactement ce qui le fait ressembler à un sous-sol. */
    if (!basement) {
      for (let x = 3; x < C.COURT_FLOOR_W - 3; x += 5) { set(x, y0, C.CT_WINDOW); set(x, y0 + C.COURT_FLOOR_H - 1, C.CT_WINDOW); }
      for (let y = y0 + 3; y < y0 + C.COURT_FLOOR_H - 3; y += 5) { set(0, y, C.CT_WINDOW); set(C.COURT_FLOOR_W - 1, y, C.CT_WINDOW); }
    }

    // ---- LES PIÈCES DE CE NIVEAU.
    for (const r of C.COURT_ROOMS) {
      if (r.floor !== f) continue;
      const rx = r.x, ry = y0 + r.y;
      border(rx, ry, r.w, r.h, C.CT_WALL);
      fill(rx + 1, ry + 1, r.w - 2, r.h - 2, basement ? C.CT_STONE : (r.kind === "courtroom" ? C.CT_CARPET : C.CT_WOOD));
      for (const d of r.doors) {
        set(d.x, y0 + d.y, C.CT_DOOR);
        doors.push({ x: d.x, y: y0 + d.y, floor: f, room: r.key });
      }
      courtFurnish(r, rx, ry, addProp, set, fill);
    }

    /* ---- LE COULOIR CENTRAL (la « salle des pas perdus »). Colonnes le long
       des deux cloisons, bancs entre elles. ⚠️ LES COLONNES BLOQUENT : une
       colonne qu'on traverse est pire que pas de colonne, parce qu'elle promet
       une architecture qu'on démentira au premier pas. */
    const cx0 = C.COURT_CORRIDOR.x + 1, cx1 = C.COURT_CORRIDOR.x + C.COURT_CORRIDOR.w - 2;
    for (let y = y0 + 7; y < y0 + C.COURT_FLOOR_H - 2; y += 5) {
      addProp(cx0, y, "pillar", true);
      addProp(cx1, y, "pillar", true);
      addProp(cx0 + 1, y + 2, "bench", true);
      addProp(cx1 - 1, y + 2, "bench", true);
    }
    /* ---- LES ESCALIERS. Une cage n'apparaît qu'aux DEUX niveaux qu'elle relie,
       et son sens se DÉDUIT des altitudes (voir COURT_FLOORS.alt) : la même
       cage est « qui monte » d'un côté et « qui descend » de l'autre, sans
       qu'aucune table ne l'affirme deux fois. */
    for (const sw of C.COURT_STAIRWELLS) {
      const other = sw.a === f ? sw.b : sw.b === f ? sw.a : -1;
      if (other < 0) continue;
      const up = C.COURT_FLOORS[other].alt > C.COURT_FLOORS[f].alt;
      fill(sw.x, y0 + sw.y, sw.w, sw.h, up ? C.CT_STAIR_UP : C.CT_STAIR_DOWN);
    }
    if (groundFloor) {
      // LE SEUIL. Deux cases au mur sud : c'est par là qu'on entre et qu'on
      // ressort, et c'est la seule ouverture du bâtiment.
      set(C.COURT_ENTRY.x, y0 + C.COURT_ENTRY.y, C.CT_EXIT);
      set(C.COURT_ENTRY.x + 1, y0 + C.COURT_ENTRY.y, C.CT_EXIT);
      // La statue de la Justice entre les deux volées, au fond du hall : le
      // point de fuite du couloir. Sans elle, on entre face à un mur nu.
      addProp(22, y0 + 4, "justice", true);
      addProp(23, y0 + 4, "justice2", true);   // moitié droite (le sprite fait deux cases)
      // Le PANNEAU D'AFFICHAGE, à droite en entrant : c'est lui qui annonce
      // l'ouverture prochaine des services (voir COURT_BOARD_ORDER).
      addProp(26, y0 + 20, "board", true);   // hors de l'axe des portes (voir doorGuard)
      addProp(19, y0 + 20, "plant", true);
    }
    if (f === 1) addProp(22, y0 + 4, "plant", true);
    if (basement) { addProp(22, y0 + 4, "crate", true); addProp(23, y0 + 5, "crate", true); }
  }
  return { w: W, h: H, tile, solid, props, doors, rooms: C.COURT_ROOMS };
}

/* LE MOBILIER, PIÈCE PAR TYPE. ⚠️ IL EST DÉRIVÉ DU RECTANGLE, jamais écrit en
   coordonnées absolues : les pièces ont bougé quatre fois pendant l'écriture du
   plan, et pas une position de bureau n'a eu à être retouchée. C'est la même
   règle que les téléporteurs du 425 (§7 : ce qui double un autre paramètre doit
   être DÉRIVÉ). `ix/iy/iw/ih` = l'intérieur, murs exclus. */
function courtFurnish(r, rx, ry, addProp, set, fill) {
  const ix = rx + 1, iy = ry + 1, iw = r.w - 2, ih = r.h - 2;
  const cx = ix + (iw >> 1), cy = iy + (ih >> 1);
  switch (r.kind) {
    case "courtroom": {
      /* LA SALLE D'AUDIENCE. Elle se lit du fond vers l'entrée, et c'est la
         seule pièce du bâtiment dont la disposition n'est pas négociable :
         l'estrade et le juge au fond (nord), la barre au milieu, le public
         devant la porte. Un tribunal où le public est derrière le juge n'est
         plus un tribunal, c'est une salle de réunion. */
      fill(ix + 2, iy + 1, iw - 4, 4, C.CT_DAIS);            // l'estrade
      addProp(cx - 1, iy + 3, "judgeBench", true);           // le siège du juge (2 cases)
      addProp(cx, iy + 3, "judgeBench2", true);
      addProp(cx - 3, iy + 2, "flag", true); addProp(cx + 2, iy + 2, "flag", true);
      addProp(ix + 1, iy + 5, "desk", true);                 // le greffier, au pied de l'estrade
      addProp(ix + iw - 2, iy + 5, "witnessBox", true);      // la barre des témoins, en face
      for (let k = 0; k < 3; k++) addProp(ix + 1, iy + 8 + k, "juryBench", true); // le banc des jurés, à l'ouest
      // La BARRE qui sépare le prétoire du public : une balustrade basse. Elle
      // bloque, sauf au portillon central — sinon la salle n'a pas de seuil.
      for (let x = ix; x < ix + iw; x++) {
        if (x === cx || x === cx + 1) continue;
        addProp(x, iy + 12, "railing", true);
      }
      // Les bancs du public, de part et d'autre de l'allée centrale.
      // ⚠️ DEUX RANGÉES, PAS TROIS : la troisième tombait sur le mur sud de la
      // salle. Le compte se DÉDUIT de la hauteur intérieure plutôt que d'être
      // choisi — c'est la seule façon de ne pas avoir à y repenser si la salle
      // change de taille.
      for (let k = 0; iy + 14 + k * 2 < iy + ih - 1; k++) {
        addProp(ix + 2, iy + 14 + k * 2, "pew", true);
        addProp(ix + iw - 5, iy + 14 + k * 2, "pew", true);
      }
      break;
    }
    case "office": {
      // Bureau, fauteuil derrière, deux chaises de visiteur devant : c'est ce
      // triangle qui dit « on vient y demander quelque chose ».
      addProp(cx, iy + 2, "desk", true);
      addProp(cx, iy + 1, "chair", true);
      addProp(cx - 1, iy + 4, "chair", true); addProp(cx + 1, iy + 4, "chair", true);
      addProp(ix, iy, "shelf", true); addProp(ix + 1, iy, "shelf", true);
      addProp(ix + iw - 1, iy, "cabinet", true);
      addProp(ix + iw - 1, iy + ih - 1, "plant", true);
      break;
    }
    case "counter": {
      // Un GUICHET, pas un bureau : le comptoir barre la pièce dans sa largeur
      // et le public reste du bon côté. C'est la différence de lecture entre
      // « service ouvert au public » et « bureau où l'on entre ».
      for (let x = ix + 1; x < ix + iw - 1; x++) addProp(x, iy + 2, "counter", true);
      addProp(ix + 1, iy, "chair", true);
      for (let k = 0; k < 3; k++) addProp(ix + iw - 1 - k, iy, "cabinet", true);
      addProp(ix, iy + ih - 1, "plant", true);
      for (let k = 0; k < 2; k++) addProp(ix + 2 + k * 4, iy + ih - 2, "bench", true);
      break;
    }
    case "robing": {
      for (let x = ix; x < ix + iw; x += 2) addProp(x, iy, "locker", true);
      addProp(cx, cy, "table", true);
      addProp(ix, iy + ih - 1, "bench", true); addProp(ix + 4, iy + ih - 1, "bench", true);
      addProp(ix + iw - 1, cy, "mirror", true);
      break;
    }
    case "waiting": {
      for (let k = 0; k < 4; k++) { addProp(ix + 1 + k * 4, iy + 1, "bench", true); addProp(ix + 1 + k * 4, iy + ih - 2, "bench", true); }
      addProp(ix, cy, "plant", true); addProp(ix + iw - 1, cy, "plant", true);
      addProp(cx, iy + 1, "table", true);
      break;
    }
    case "meeting": {
      // La table de délibération, au centre, entourée de chaises : la pièce EST
      // la table. Une salle du jury sans table est un placard.
      for (let x = cx - 3; x <= cx + 3; x++) addProp(x, cy, "table", true);
      for (let x = cx - 3; x <= cx + 3; x += 2) { addProp(x, cy - 1, "chair", true); addProp(x, cy + 1, "chair", true); }
      addProp(ix, iy, "shelf", true);
      addProp(ix + iw - 1, iy + ih - 1, "plant", true);
      break;
    }
    case "library": {
      for (let y = iy; y < iy + ih - 1; y += 3) for (let x = ix; x < ix + iw; x++) {
        if (x === cx || x === cx + 1) continue;      // l'allée centrale
        addProp(x, y, "shelf", true);
      }
      addProp(cx, iy + ih - 1, "table", true);
      break;
    }
    case "archive": {
      // Des rayonnages EN RANGS serrés, avec une seule allée : c'est la densité
      // qui dit « archives » — trois étagères espacées disent « bureau ».
      for (let y = iy + 1; y < iy + ih - 1; y += 2) for (let x = ix; x < ix + iw; x++) {
        if (x === cx) continue;
        addProp(x, y, "shelf", true);
      }
      break;
    }
    case "storage": {
      for (let y = iy; y < iy + ih; y += 3) for (let x = ix; x < ix + iw; x += 3) {
        if (x === cx) continue;
        addProp(x, y, "crate", true);
      }
      addProp(ix + iw - 1, iy, "shelf", true);
      break;
    }
    case "cells": {
      /* LES CELLULES. Trois cages alignées le long du mur du fond, séparées par
         des cloisons, fermées par une GRILLE (CT_BARS) — un mur qu'on voit au
         travers. ⚠️ Les grilles sont dans le SOL et non dans les props : elles
         bloquent, donc elles doivent être une propriété de la case, comme tout
         ce qui décide d'une collision (leçon du 425). */
      // ⚠️ 4 CASES DE LARGE, ET LE COMPTE EST SERRÉ : trois cellules + leurs
      // cloisons doivent tenir dans les 17 cases utiles. À 5, la troisième
      // grille tombait SUR le mur d'enceinte — c'est-à-dire une cellule sans
      // paroi est, ouverte sur le vide, et rien ne l'aurait signalé.
      const cw = 4;
      for (let k = 0; k < 3; k++) {
        const bx = ix + 1 + k * (cw + 1);
        // ⚠️ LES CLOISONS MONTENT JUSQU'AU MUR DU FOND (iy, et non iy+1) : une
        // rangée laissée libre en haut faisait communiquer les trois cellules
        // par l'arrière. Trois cellules qui communiquent, c'est une seule.
        for (let y = iy; y <= iy + 5; y++) { set(bx - 1, y, C.CT_WALL); set(bx + cw, y, C.CT_WALL); }
        for (let x = bx; x < bx + cw; x++) set(x, iy + 6, C.CT_BARS);
        set(bx + 2, iy + 6, C.CT_DOOR);                       // la porte de la cellule
        addProp(bx, iy + 1, "bunk", true);
        addProp(bx + cw - 1, iy + 4, "stoolC", true);
      }
      addProp(ix, iy + ih - 2, "desk", true);                 // le poste de garde
      addProp(ix, iy + ih - 3, "chair", true);
      // La colonne qui reste à l'est des trois cages : trois cellules de quatre
      // cases et leurs cloisons laissent une case de rab. On la MEUBLE plutôt
      // que de la laisser en alcôve borgne — un recoin vide dans une prison se
      // lit comme une erreur de plan.
      // ⚠️ TOUTE la colonne, pas une case sur deux : le banc a trouvé deux cases
      // libres PRISES AU PIÈGE entre deux armoires, dans un recoin d'une case de
      // large. Un espace libre inatteignable est un mur invisible qui s'ignore.
      for (let y = iy; y <= iy + 6; y++) addProp(ix + iw - 1, y, "cabinet", true);
      break;
    }
    case "boiler": {
      addProp(cx, iy + 1, "boiler", true);
      addProp(cx + 2, iy + 1, "boiler", true);
      for (let k = 0; k < 3; k++) addProp(ix + k, iy + ih - 1, "crate", true);
      break;
    }
    default: break;
  }
}

// Schedule the next visit on the host clock: random base window, shortened
// by posted ads and popularity (both capped). Never below 45s.
export function scheduleNextVisit(station, popularity, rnd) {
  const r = (rnd || Math.random)();
  let ms = C.VISIT_MIN_MS + r * (C.VISIT_MAX_MS - C.VISIT_MIN_MS);
  ms -= (station.ads || []).length * C.VISIT_AD_BONUS_MS;
  ms -= Math.min(C.VISIT_POP_BONUS_MAX_MS, popularity * 4000);
  station.nextVisitAt = Date.now() + Math.max(45 * 1000, ms);
}

// Pick who steps off the train. Excludes blacklisted ids, current residents,
// and (softly) the previous visitor. Disposition: hostile roll first (edgy
// roster entries count double, each resident halves it), then rich patrons,
// then nice/neutral. High-friendship nice visitors ask to STAY instead.
// How long a visitor lingers at the townhall (zip 233): 10 real minutes is
// now the hard FLOOR for every visit type. "Prep" orders (asking for
// something not yet in stock) are sized around the item's grow time instead,
// capped by VISITOR_WAIT_MAX_MS, so the wait is computed AFTER the offer is
// classified (see spawnVisitor).
export function visitorWaitMs(offer) {
  let ms = C.VISITOR_WAIT_MS;
  if (offer && offer.prep && typeof offer.prepMs === "number") ms = offer.prepMs * 1.2;
  return Math.max(C.VISITOR_WAIT_FLOOR_MS, Math.min(C.VISITOR_WAIT_MAX_MS, ms));
}

// Roll the gift attached to a "prep" order (zip 233): unique seeds are
// granted straight into the seller's inventory on completion; decorations
// and pets queue in station.pendingGifts until their systems exist.
/* Zip 388 — QUEL FAMILIER, ET POUR QUI.
   Un visiteur ne propose un familier que si l'amitié atteint PET_GIFT_REL_MIN.
   En-deçà, la part "familier" du tirage RETOURNE AUX DÉCORATIONS plutôt que
   d'être simplement supprimée : sans ça, un inconnu offrirait moins souvent,
   ce qui n'a pas été demandé.

   `worldPetId` = le familier de la terre du passage EN COURS (voir
   passageWorldOf). Un visiteur qui revient de voyage rapporte CE familier-là,
   pas un animal tiré de nulle part : c'est ce qui relie le cadeau à quelque
   chose que le joueur peut lire dans le monde. Si l'appelant ne le connaît
   pas, on retombe sur un familier commun — jamais sur une erreur. */
function rollPetGift(r, worldPetId) {
  const g = r();
  if (worldPetId && g < C.PET_GIFT_WORLD_SHARE) return { kind: "pet", petId: worldPetId, fromWorld: true };
  if (g < C.PET_GIFT_WORLD_SHARE + C.PET_GIFT_UNIQUE_SHARE) return { kind: "pet", petId: C.UNIQUE_PETS[Math.floor(r() * C.UNIQUE_PETS.length)].id };
  return { kind: "pet", petId: C.COMMON_PET_IDS[Math.floor(r() * C.COMMON_PET_IDS.length)] };
}
function rollGiftReward(r, rel, worldPetId) {
  const friend = (rel | 0) >= C.PET_GIFT_REL_MIN;
  const petShare = friend ? C.PET_GIFT_SHARE : 0;
  const roll = r();
  if (roll < petShare) return rollPetGift(r, worldPetId);
  // Le reste du tirage garde ses proportions d'origine (50 % graine rare,
  // 50 % décoration), simplement renormalisées sur ce qui reste.
  const rest = (roll - petShare) / (1 - petShare);
  if (rest < 0.5) {
    const cropId = C.UNIQUE_SEED_CROPS[Math.floor(r() * C.UNIQUE_SEED_CROPS.length)];
    return { kind: "seed", cropId };
  }
  return { kind: "decor", id: C.UNIQUE_DECORATIONS[Math.floor(r() * C.UNIQUE_DECORATIONS.length)].id };
}

// Zip 237: build a swap offer — pick a produce the visitor wants and a reward
// they give. `want.kind` is "crop" | "fish" | "product"; `give` mirrors the
// gift-reward shapes plus a "useful" item kind.
function rollSwapOffer(r, rel, worldPetId) {
  const wantKinds = ["crop", "fish", "product"];
  const wk = wantKinds[Math.floor(r() * wantKinds.length)];
  let wantId = 0;
  if (wk === "crop") wantId = C.CROPS.filter(c => !c.unique)[Math.floor(r() * C.CROPS.filter(c => !c.unique).length)].id;
  else if (wk === "fish") wantId = Math.floor(r() * C.FISH.length);
  else wantId = Math.floor(r() * C.ANIMALS.length);
  const n = C.SWAP_WANT_MIN + Math.floor(r() * (C.SWAP_WANT_MAX - C.SWAP_WANT_MIN + 1));
  // Reward: friends (higher rel) skew toward better gives (pet/decor/seed);
  // strangers more often hand over a useful stack.
  // Zip 388 : même règle d'amitié que pour les cadeaux. Un troc avec un
  // inconnu ne porte jamais sur un être vivant — sa part va aux décorations,
  // qui viennent justement de passer de 3 à 19 entrées.
  const gr = r();
  const petShare = (rel | 0) >= C.PET_GIFT_REL_MIN ? C.PET_SWAP_SHARE : 0;
  let give;
  if (gr < petShare) give = rollPetGift(r, worldPetId);
  else if (gr < petShare + 0.20) give = { kind: "seed", cropId: C.UNIQUE_SEED_CROPS[Math.floor(r() * C.UNIQUE_SEED_CROPS.length)] };
  else if (gr < petShare + 0.42) give = { kind: "decor", id: C.UNIQUE_DECORATIONS[Math.floor(r() * C.UNIQUE_DECORATIONS.length)].id };
  else { const it = C.SWAP_USEFUL_ITEMS[Math.floor(r() * C.SWAP_USEFUL_ITEMS.length)]; give = { kind: "useful", item: it.item, n: it.n }; }
  return { type: "swap", want: { kind: wk, id: wantId, n }, give };
}

// Classify a buy offer against what the farm ACTUALLY has (zip 233).
// stockCtx = { crops: number[] } summed over the online players' pockets.
// - easy: already in stock -> lower price, gold only.
// - prep: not in stock -> higher price, wait sized on the grow time (capped),
//   and a chance at a gift reward. If NOTHING is growable within the max
//   wait, we still fall back to the fastest-growing candidate so the offer
//   stays completable in principle (noted simplification: real grow times
//   are hours, so a fresh planting rarely finishes inside one visit).
function classifyBuyOffer(offer, stockCtx, r, rel, worldPetId) {
  rel = rel || 0;
  // Zip 234 (friendship): friends pay more for the same order (up to +60%),
  // are more likely to attach a gift to a prep order, and — real friends
  // only — may even bring a gift with an EASY order.
  const priceMul = 1 + Math.min(C.REL_PRICE_BONUS_MAX, rel * C.REL_PRICE_BONUS);
  const giftChance = Math.min(C.REL_GIFT_MAX, C.VISITOR_GIFT_CHANCE + rel * C.REL_GIFT_BONUS);
  const askable = C.CROPS.filter(cr => !cr.unique);
  const stock = (stockCtx && Array.isArray(stockCtx.crops)) ? stockCtx.crops : [];
  const stocked = askable.filter(cr => (stock[cr.id] || 0) >= 2);
  // Zip 235 (Guillaume: "when it's autumn ... more visitors want pumpkins"):
  // whenever the pumpkin is a valid candidate in the pool being drawn from,
  // it is force-picked with probability AUTUMN_PUMPKIN_BIAS during autumn.
  const pickCrop = (arr) => {
    const pk = arr.find(cr => cr.id === C.PUMPKIN_CROP_ID);
    if (pk && seasonOf().key === "autumn" && r() < C.AUTUMN_PUMPKIN_BIAS) return pk;
    return arr[Math.floor(r() * arr.length)];
  };
  if (stocked.length && r() < C.VISITOR_EASY_STOCK_BIAS) {
    const cr = pickCrop(stocked);
    offer.crop = cr.id;
    offer.n = Math.max(1, Math.min(stock[cr.id] || 1, offer.n));
    offer.easy = true;
    offer.price = Math.ceil(cr.sell * (1.05 + r() * 0.25) * priceMul); // modest: costs the farm nothing but stock
    offer.reward = (rel >= C.REL_EASY_GIFT_MIN && r() < giftChance * 0.5)
      ? rollGiftReward(r, rel, worldPetId) : { kind: "gold" }; // easy orders are cash-only for strangers
    return offer;
  }
  const notStocked = askable.filter(cr => (stock[cr.id] || 0) < 2);
  const pool = notStocked.length ? notStocked : askable;
  const fitting = pool.filter(cr => cr.growMs * 1.2 <= C.VISITOR_WAIT_MAX_MS);
  const cr = fitting.length ? pickCrop(fitting) : pool.reduce((a, b) => (a.growMs <= b.growMs ? a : b));
  offer.crop = cr.id;
  offer.prep = true;
  offer.prepMs = cr.growMs;
  offer.price = Math.ceil(cr.sell * (1.8 + r() * 0.7) * priceMul); // effort pays better
  offer.reward = r() < giftChance ? rollGiftReward(r, rel, worldPetId) : { kind: "gold" };
  return offer;
}

export function spawnVisitor(station, rnd, stockCtx, forceRid, day) {
  const r = rnd || Math.random;
  // Zip 388 : le familier de la terre du passage EN COURS. Paramètre OPTIONNEL
  // — un appelant qui ne le passe pas obtient exactement le comportement
  // d'avant, familiers communs compris. C'est ce qui permet d'ajouter ce
  // chaînage sans toucher aux tests ni aux autres appels.
  const worldPetId = passagePetOf(day);
  const banned = new Set(station.blacklist || []);
  for (const res of station.residents || []) banned.add(res.rid);
  for (const cur of station.visitors || []) banned.add(cur.rid); // zip 233: no duplicates on the farm
  // Zip 376 : porte d'apparition. Un personnage porteur de `minArtisans` ne
  // monte dans le train que si la ferme compte déjà au moins ce nombre de
  // résidents à skill (Carla Garfield : 4). Le filtre est posé ICI, dans la
  // constitution du pool, et non après le tirage : sinon une ferme jeune
  // tirerait Carla puis retomberait sur un `null`, et le train arriverait
  // vide un tirage sur trente.
  const artisans = countSkilledResidents(station);
  const gateOk = (v) => !(v.minArtisans > 0) || artisans >= v.minArtisans;
  const pool = C.VISITOR_ROSTER.filter(v => !banned.has(v.rid) && v.rid !== station.lastRid && gateOk(v));
  // Zip 298 (demande Guillaume) : garantie d'apparition d'un artisan précis
  // (fromagère/bûcheron) via `forceRid` — on court-circuite le tirage pondéré
  // et on l'impose, à condition qu'il ne soit ni banni ni déjà résident/visiteur
  // (on ignore volontairement lastRid ici, la garantie prime).
  let who = null;
  if (forceRid != null && !banned.has(forceRid)) who = C.VISITOR_ROSTER.find(v => v.rid === forceRid) || null;
  if (who && !gateOk(who)) who = null;   // zip 376 : même une garantie ne fait pas venir Carla trop tôt
  if (!who) {
    if (!pool.length) return null;
    // Zip 234 (friendship): weighted pick — the better the friendship, the more
    // often that character hops on the train. Strangers keep weight 1.
    // Zip 258 : un visiteur `rare` (Eduardo) part d'un poids de base réduit
    // (RARE_VISITOR_WEIGHT au lieu de 1), donc apparaît nettement moins souvent.
    const weights = pool.map(v => (v.rare ? C.RARE_VISITOR_WEIGHT : 1) + Math.min(C.REL_SPAWN_WEIGHT_RELCAP, (station.rel && station.rel[v.rid]) || 0) * C.REL_SPAWN_WEIGHT);
    let pick = r() * weights.reduce((a, b) => a + b, 0), wi = 0;
    while (wi < weights.length - 1 && pick >= weights[wi]) { pick -= weights[wi]; wi++; }
    who = pool[wi];
  }
  station.lastRid = who.rid;
  // Zip 376 : Carla ne vient ni braquer la ferme, ni acheter des carottes, ni
  // s'installer. Tant que la boutique de vêtements n'existe pas, sa visite est
  // une visite de CONVERSATION et rien d'autre (répliques dédiées :
  // carlaChatLines). On sort avant tout le tirage de disposition : hostile,
  // riche, "stay", troc et achat sont tous hors personnage pour elle.
  if (who.chatOnly) {
    return finishVisitor(who, "nice", { type: "chat" }, station, r, worldPetId);
  }
  let hostile = C.VISITOR_HOSTILE_CHANCE * (who.edgy ? 2 : 1);
  hostile = hostile / Math.pow(2, (station.residents || []).length);
  let disp, offer;
  const rel = (station.rel && station.rel[who.rid]) || 0;
  if (r() < hostile) {
    disp = "hostile";
    offer = { type: "demand", gold: 40 + Math.floor(r() * (C.HOSTILE_STEAL_MAX - 40 + 1)) };
  } else if (who.rich && r() < C.VISITOR_RICH_CHANCE) {
    disp = "rich";
    const crop = Math.floor(r() * C.CROPS.length);
    const n = 10 + Math.floor(r() * 11);
    offer = classifyBuyOffer({ type: "buy", crop, n, price: C.CROPS[crop].sell * 3, bonus: 300 + Math.floor(r() * 501) }, stockCtx, r, rel, worldPetId);
    if (offer.easy) offer.price = Math.max(offer.price, C.CROPS[offer.crop].sell * 2); // rich patrons still overpay
  } else if (rel >= C.REL_RESIDENT_MIN && r() < 0.3 && !who.noStay) {
    // Zip 376 : `noStay` — un personnage qui a sa vie ailleurs ne demandera
    // jamais à emménager, si haute que soit l'amitié. (Pour Carla, `chatOnly`
    // est déjà sorti plus haut ; le drapeau reste utile seul, pour un futur
    // personnage qui ferait de vraies offres sans jamais s'installer.)
    // Zip 234 tweak: asking to STAY used to be the ONLY offer once rel hit
    // REL_RESIDENT_MIN, which crowded out the improved friend offers (better
    // prices/gifts). Now it's an occasional request; most friend visits are
    // ordinary (well-paying) trades or chats.
    disp = "nice";
    offer = { type: "stay", job: who.job };
  } else if (r() < C.VISITOR_CHAT_CHANCE) {
    disp = r() < 0.6 ? "nice" : "neutral";
    offer = { type: "chat" };
  } else if (r() < C.SWAP_OFFER_CHANCE) {
    // Zip 237: a barter — the visitor WANTS some of our produce and GIVES an
    // item (decor / useful item / rare seeds / common pet) rather than gold.
    disp = r() < 0.6 ? "nice" : "neutral";
    offer = rollSwapOffer(r, rel, worldPetId);
  } else {
    disp = r() < 0.6 ? "nice" : "neutral";
    const crop = Math.floor(r() * C.CROPS.length);
    const n = 3 + Math.floor(r() * 8);
    offer = classifyBuyOffer({ type: "buy", crop, n, price: 0 }, stockCtx, r, rel, worldPetId);
  }
  return finishVisitor(who, disp, offer, station, r, worldPetId);
}

// Zip 376 : la fabrication de l'objet visiteur (position de descente du train,
// vitesse de marche, phase, cadeau d'arrivée) était la queue de spawnVisitor.
// Elle en est extraite telle quelle — aucun changement de comportement — pour
// que le raccourci `chatOnly` puisse la réutiliser au lieu de la dupliquer.
function finishVisitor(who, disp, offer, station, r, worldPetId) {
  const rel = (station.rel && station.rel[who.rid]) || 0;
  const nv = {
    rid: who.rid, disp, offer,
    x: C.STATION_PLATFORM.x + 1, y: C.STATION.y + C.STATION.h + 1.5,
    dir: 2, moving: false, animT: 0,
    // Zip 234: slight per-visitor walk speed variance, so a group naturally
    // spreads out along the path instead of marching in lockstep.
    speedMul: 0.85 + r() * 0.3,
    phase: "train", phaseUntil: Date.now() + C.VISITOR_TRAIN_MS,
    waitUntil: 0, waitStartedAt: 0, deadline: 0, votes: null, voteUntil: 0,
  };
  // Zip 234 (friendship): from REL_ARRIVAL_GIFT_MIN on, friends sometimes
  // step off the train WITH a present — granted the first time somebody
  // opens their card (see resolveVisitorGreet).
  if (disp !== "hostile" && rel >= C.REL_ARRIVAL_GIFT_MIN
    && r() < Math.min(C.REL_ARRIVAL_GIFT_CHANCE_MAX, rel * C.REL_ARRIVAL_GIFT_CHANCE)) {
    nv.arrivalGift = rollGiftReward(r, rel, worldPetId);
  }
  return nv;
}

// Spawn a whole ROUND of visitors (zip 233): random size 1..VISITORS_MAX,
// clamped by the free room on the farm; at most one hostile at a time
// (including during an unrepaired raid); staggered off the train one by one.
export function spawnVisitorGroup(station, rnd, raidActive, stockCtx, day) {
  const r = rnd || Math.random;
  if (!Array.isArray(station.visitors)) station.visitors = [];
  const room = C.VISITORS_MAX - station.visitors.length;
  if (room <= 0) return [];
  const n = Math.min(room, 1 + Math.floor(r() * C.VISITORS_MAX));
  const used = new Set(station.visitors.map(v => v.slot | 0));
  const out = [];
  let hostileTaken = !!raidActive || station.visitors.some(v => v.disp === "hostile" && v.phase !== "depart");
  let stagger = 0;
  for (let k = 0; k < n; k++) {
    const nv = spawnVisitor(station, r, stockCtx, null, day);
    if (!nv) break;
    if (nv.disp === "hostile") {
      if (hostileTaken) {
        nv.disp = "neutral";
        const crop = Math.floor(r() * C.CROPS.length);
        nv.offer = classifyBuyOffer({ type: "buy", crop, n: 1 + Math.floor(r() * 2), price: 0 }, stockCtx, r, (station.rel && station.rel[nv.rid]) || 0);
      } else hostileTaken = true;
    }
    let slot = 0; while (used.has(slot)) slot++;
    used.add(slot); nv.slot = slot;
    // Zip 234 (Guillaume: "make them walk one after another, staggered"):
    // a wide randomized gap accumulates between group members, so they step
    // off, walk and ARRIVE at the townhall clearly one after another.
    stagger += k === 0 ? 0 : C.VISITOR_STAGGER_MIN_MS + r() * (C.VISITOR_STAGGER_MAX_MS - C.VISITOR_STAGGER_MIN_MS);
    nv.phaseUntil += stagger;
    out.push(nv); station.visitors.push(nv);
  }
  return out;
}

// A nice/neutral/rich visitor buys crops FROM the accepting player's own
// inventory; the gold (plus any rich-patron bonus) lands in the common
// chest, consistent with how sales already work. Mutates f and s.
export function resolveVisitorDeal(f, s, m) {
  const res = { ok: false, toast: null, gain: 0, gift: null, giftQueued: false, giftPromised: false };
  const v = getVisitor(s, m && m.rid);
  if (!v || v.phase !== "wait" || !v.offer || v.offer.type !== "buy") { res.toast = "actionFailed"; return res; }
  const o = v.offer;
  if ((f.inv.crops[o.crop] || 0) < o.n) { res.toast = "visitorNotEnough"; return res; }
  f.inv.crops[o.crop] -= o.n;
  res.gain = o.n * o.price + (o.bonus || 0);
  s.money += res.gain; s.totalEarned = (s.totalEarned || 0) + res.gain;
  // Gift reward (zip 233, "prep" orders only). Zip 237: rewards are granted
  // through the shared grantReward() helper so PETS land in the seller's own
  // bag (max MAX_PETS); only bag-full pets and decorations fall back to the
  // communal pendingGifts queue.
  const rw = o.reward;
  if (rw) offerGiftReward(f, s, v, rw, res); // zip 250: 80% direct / 20% promis (cadeaux sac)
  s.station.rel[v.rid] = ((s.station.rel[v.rid] || 0) + C.REL_DEAL);
  startLinger(v);
  res.ok = true;
  return res;
}

// Zip 250 (demande Guillaume : "plus de promesses en l'air qui durent trop
// longtemps"). Décide du sort d'un cadeau de deal/troc :
//  - décoration  -> mécanique propre inchangée (grantReward -> file commune) ;
//  - cadeau SAC (graine/objet/animal) -> 8/10 remis DIRECT au joueur maintenant,
//    2/10 "promis" : on accroche le cadeau au visiteur (v.promisedGift), il sera
//    déposé dans le sac de CE joueur 3 à 5 min APRÈS son départ (voir la boucle
//    hôte updateVisitors dans FermeGame.js).
// Écrit res.gift + res.giftQueued/bagFull/giftPromised. rnd() injectable (tests).
export function offerGiftReward(f, s, v, rw, res, rnd) {
  const r = rnd || Math.random;
  res.gift = { ...rw };
  // Zip 251 : les décorations sont désormais des objets de SAC (comme les
  // graines/objets/animaux) -> soumises au même partage 80/20 que le reste.
  if (r() < C.VISITOR_GIFT_DIRECT_CHANCE) {
    const gr = grantReward(f, s, v, rw);
    res.giftQueued = gr.queued; res.bagFull = gr.bagFull; res.petOffer = gr.petOffer;
  } else {
    // Promesse tenue : rattachée au visiteur, convertie en livraison différée
    // au moment où il monte dans le train (FermeGame: updateVisitors).
    if (v) v.promisedGift = { farmerId: f.id, fromRid: v.rid, reward: { ...rw } };
    res.giftPromised = true;
  }
}

// Zip 237: grant a reward object to a farmer, routing by kind.
//  - seed  -> +3 rare seeds in the seller's pocket
//  - pet   -> the seller's own bag (resolveCatchPet); if full, queue in
//             pendingGifts as a fallback so it isn't lost
//  - useful-> a stack of a useful item straight into the seller's inventory
//  - decor -> communal pendingGifts (decoration system still deferred)
// Returns { queued, bagFull }.
export function grantReward(f, s, v, rw) {
  const out = { queued: false, bagFull: false, petOffer: false };
  if (!rw) return out;
  if (rw.kind === "seed") {
    f.inv.seeds[rw.cropId] = (f.inv.seeds[rw.cropId] || 0) + 3;
  } else if (rw.kind === "pet") {
    /* ZIP 388 — UN FAMILIER NE TOMBE PLUS DANS LE SAC, IL EST PROPOSÉ.
       Avant ce zip, un familier apparaissait tout seul dans le sac au moment
       où la commande était honorée ; la boîte de dialogue n'existait QUE dans
       le cas du sac plein. C'est là que naissait le sentiment d'attribution
       « injustifiée » : on se retrouvait avec une bête sans que personne ne
       l'ait donnée à l'écran.

       Désormais TOUT familier passe par la même proposition (accepter /
       refuser), sac plein ou non. Le chemin de la boîte de dialogue existait
       déjà et il est éprouvé : on ne l'invente pas, on l'élargit — chercher le
       motif déjà présent avant d'en inventer un.

       ⚠️ L'OFFRE EST MÉMORISÉE CHEZ L'HÔTE (`f.inv.petOffer`), et c'est un
       correctif au passage. `releasePetForGift` acceptait jusqu'ici N'IMPORTE
       QUEL `petId` envoyé par le client : un message forgé suffisait à
       s'offrir la licorne. Maintenant l'hôte ne reconnaît que le familier
       qu'il a lui-même proposé, et efface l'offre en la servant. Règle du
       zip 385 : une récompense qui compte s'arbitre chez l'hôte, jamais sur
       parole du client. Ce champ vit dans `f.inv`, déjà persisté : AUCUNE
       migration. */
    f.inv.petOffer = rw.petId;
    out.petOffer = true;
    out.bagFull = (Array.isArray(f.pets) ? f.pets.length : 0) >= C.MAX_PETS;
  } else if (rw.kind === "useful") {
    if (Array.isArray(f.inv[rw.item])) { /* not expected */ }
    else f.inv[rw.item] = (f.inv[rw.item] || 0) + (rw.n || 1);
  } else if (rw.kind === "decor") {
    // Zip 251 (demande Guillaume) : les décorations vont désormais dans le SAC
    // PERSONNEL du joueur (f.inv.decor), déployables via l'outil main — fini la
    // file commune indéfinie.
    if (!f.inv.decor || typeof f.inv.decor !== "object") f.inv.decor = {};
    f.inv.decor[rw.id] = (f.inv.decor[rw.id] | 0) + 1;
  } else { // unknown kind -> communal queue (filet de sécurité)
    if (!Array.isArray(s.station.pendingGifts)) s.station.pendingGifts = [];
    s.station.pendingGifts.push({ ...rw, from: v ? v.rid : -1, at: Date.now() });
    out.queued = true;
  }
  return out;
}

// Zip 237: fulfil a SWAP offer — deduct the wanted produce from the seller,
// grant the reward. Produce kinds: crop (f.inv.crops), fish (f.inv.fish),
// product (f.inv.products).
export function resolveVisitorSwap(f, s, m) {
  const res = { ok: false, toast: null, gift: null, giftQueued: false, bagFull: false, petOffer: false, giftPromised: false };
  const v = getVisitor(s, m && m.rid);
  if (!v || v.phase !== "wait" || !v.offer || v.offer.type !== "swap") { res.toast = "actionFailed"; return res; }
  const w = v.offer.want;
  const bag = w.kind === "crop" ? f.inv.crops : w.kind === "fish" ? f.inv.fish : f.inv.products;
  if (!bag || (bag[w.id] || 0) < w.n) { res.toast = "visitorNotEnough"; return res; }
  bag[w.id] -= w.n;
  offerGiftReward(f, s, v, v.offer.give, res); // zip 250: 80% direct / 20% promis (cadeaux sac)
  s.station.rel[v.rid] = ((s.station.rel[v.rid] || 0) + C.REL_DEAL);
  startLinger(v);
  res.ok = true;
  return res;
}

// Zip 234 (Guillaume: "they don't need to leave immediately after we've
// fulfilled their order"): instead of turning on their heels, a satisfied
// visitor stays a while and strolls the townhall square. Implemented by
// keeping phase "wait" with the wander branch armed IMMEDIATELY
// (waitStartedAt backdated past VISITOR_WANDER_AFTER_MS) and a fresh, short
// waitUntil — the ordinary wait-timeout path then walks them home, and chat
// keeps working during the stroll.
function startLinger(v) {
  const now = Date.now();
  v.offer = { type: "done" };
  v.phase = "wait";
  v.deadline = 0; v.voteUntil = 0;
  v.waitUntil = now + C.VISITOR_LINGER_MS;
  v.waitStartedAt = now - C.VISITOR_WANDER_AFTER_MS - 1000;
}

// A friendly chat (zip 234 rework, Guillaume: "make a clear chat function"):
// every press picks a dialogue line from the friendship-tier pool and appends
// it to the visitor's in-card chat log (broadcast with the station state).
// Only the first REL_CHAT_CAP_PER_VISIT chats of a visit earn friendship
// (anti-spam); a "chat"-type visit is considered fulfilled after the first
// exchange, so the visitor lingers on the square instead of standing on duty.
export function resolveVisitorChat(s, rid, rnd) {
  const r = rnd || Math.random;
  const v = getVisitor(s, rid);
  if (!v || v.phase !== "wait") return { ok: false };
  v.chatCount = (v.chatCount | 0) + 1;
  const gained = v.chatCount <= C.REL_CHAT_CAP_PER_VISIT;
  if (gained) s.station.rel[v.rid] = ((s.station.rel[v.rid] || 0) + C.REL_CHAT);
  const rel = (s.station.rel && s.station.rel[v.rid]) || 0;
  const tier = rel >= C.VISITOR_CHAT_TIER2_REL ? 2 : rel >= C.VISITOR_CHAT_TIER1_REL ? 1 : 0;
  const li = Math.floor(r() * C.VISITOR_CHAT_LINES);
  v.chatLog = ((v.chatLog || []).slice(-5)).concat([{ tier, li, at: Date.now() }]);
  if (v.offer && v.offer.type === "chat") startLinger(v);
  return { ok: true, tier, li, gained };
}

// Zip 234 (friendship): grant a friend's ARRIVAL gift the first time somebody
// opens their card. Idempotent (greeted flag); seeds land in the greeter's
// pocket (a bit smaller than a deal reward), decorations/pets queue in
// station.pendingGifts like deal gifts do.
export function resolveVisitorGreet(f, s, rid) {
  const res = { ok: false, gift: null, giftQueued: false, bagFull: false, petOffer: false };
  const v = getVisitor(s, rid);
  if (!v || !v.arrivalGift || v.greeted) return res;
  v.greeted = true;
  const rw = v.arrivalGift;
  if (rw.kind === "seed") {
    // Arrival seeds are a touch smaller than a deal reward.
    f.inv.seeds[rw.cropId] = (f.inv.seeds[rw.cropId] || 0) + 2;
    res.gift = { ...rw };
  } else {
    const gr = grantReward(f, s, v, rw);
    res.gift = { ...rw }; res.giftQueued = gr.queued; res.bagFull = gr.bagFull; res.petOffer = gr.petOffer;
  }
  res.ok = true;
  return res;
}

// Paying a hostile visitor's demand from the common chest.
export function resolveHostilePay(s, rid) {
  const res = { ok: false, toast: null, paid: 0 };
  const v = getVisitor(s, rid);
  if (!v || v.phase !== "wait" || !v.offer || v.offer.type !== "demand") { res.toast = "actionFailed"; return res; }
  if (s.money < v.offer.gold) { res.toast = "noGold"; return res; }
  s.money -= v.offer.gold; res.paid = v.offer.gold;
  v.phase = "leave"; v.offer = { type: "done" };
  res.ok = true;
  return res;
}

// The hostile visitor follows through (refusal or timeout): steals up to
// HOSTILE_STEAL_MAX gold from the chest AND ruins up to HOSTILE_RUIN_CROPS
// growing crops. Everything taken is RECORDED in the damage object so a
// successful co-op repair can restore it 100%. Returns tile patches for the
// host to broadcast.
export function applyHostileDamage(w, s, rnd, rid) {
  const r = rnd || Math.random;
  const stolen = Math.min(C.HOSTILE_STEAL_MAX, s.money);
  s.money -= stolen;
  const cropTiles = [...w.crops.keys()];
  const ruined = [];
  while (ruined.length < C.HOSTILE_RUIN_CROPS && cropTiles.length) {
    const k = Math.floor(r() * cropTiles.length);
    const i = cropTiles.splice(k, 1)[0];
    const c = w.crops.get(i);
    ruined.push({ i, c: { t: c.t, n: c.n || 1, bankedMs: c.bankedMs || 0, wateredAt: c.wateredAt || null } });
    w.crops.delete(i);
  }
  const v = getVisitor(s, rid);
  s.station.damage = {
    rid: v ? v.rid : -1, stolen, ruined,
    wins: 0, winners: [], until: Date.now() + C.REPAIR_WINDOW_MS,
  };
  return { patches: ruined.map(rn => ({ i: rn.i, c: null })) };
}

// One player finished the repair minigame. Enough wins (2, or 1 if playing
// solo) inside the window reverses the raid completely: gold back in the
// chest, every ruined crop replanted exactly as it was. Returns crop patches
// on success, null otherwise.
export function resolveRepairResult(w, s, playerId, win, onlineCount) {
  const d = s.station && s.station.damage;
  if (!d || Date.now() > d.until) return { done: false, patches: null };
  if (!win) return { done: false, patches: null };
  if (d.winners.includes(playerId)) return { done: false, patches: null };
  d.winners.push(playerId); d.wins++;
  const needed = Math.min(2, Math.max(1, onlineCount));
  if (d.wins < needed) return { done: false, patches: null, progress: d.wins, needed };
  s.money += d.stolen;
  const patches = [];
  for (const rn of d.ruined) { w.crops.set(rn.i, { t: rn.c.t, n: rn.c.n || 1, bankedMs: rn.c.bankedMs, wateredAt: rn.c.wateredAt }); patches.push({ i: rn.i, c: rn.c }); }
  const restored = { stolen: d.stolen, crops: d.ruined.length };
  s.station.damage = null;
  return { done: true, patches, restored };
}

// Posting ads: only NEWLY added categories are billed (C.AD_FEE each, common
// chest). Removing a sign is free.
export function resolveAdsSet(s, ads) {
  const res = { ok: false, toast: null, cost: 0 };
  const clean = Array.isArray(ads) ? [...new Set(ads.filter(a => C.AD_CATEGORIES.includes(a)))] : [];
  const old = new Set(s.station.ads || []);
  const added = clean.filter(a => !old.has(a));
  res.cost = added.length * C.AD_FEE;
  if (s.money < res.cost) { res.toast = "noGold"; return res; }
  s.money -= res.cost;
  s.station.ads = clean;
  res.ok = true;
  return res;
}

// Blacklisting: permanent ban for a roster id WITHOUT a skill. If the banned
// character is the CURRENT visitor, they are marched straight back to the
// train.
// Zip 278 (demande Guillaume : "si un visiteur hostile avec skills a été mis
// en blacklist permanente, le faire revenir sous un autre nom") : un rid À
// SKILL (Tristan, René, Ingrid, Chloé, Eduardo...) n'est plus banni pour de
// bon — bannir un artisan pour toujours l'aurait rendu impossible à recruter
// à nouveau, ce qui n'a jamais été l'intention (la blacklist visait les
// hostiles ordinaires, pas les métiers). Il obtient à la place une identité
// de couverture (`station.covers[rid]`, nom d'emprunt tiré de COVER_NAMES,
// stable une fois tiré) : il continue de pouvoir être choisi comme visiteur
// (le pool de spawnVisitor ne consulte QUE `blacklist`, pas `covers`), mais
// s'affiche partout sous ce nouveau nom au lieu du sien.
export function resolveBlacklist(s, rid, rnd) {
  if (typeof rid !== "number" || rid < 0 || rid >= C.VISITOR_ROSTER.length) return { ok: false };
  const ro = C.VISITOR_ROSTER[rid];
  if (ro && ro.skill) {
    if (!s.station.covers) s.station.covers = {};
    if (!s.station.covers[rid]) {
      const r = rnd || Math.random;
      const pool = C.COVER_NAMES[ro.gender] || C.COVER_NAMES.m;
      const used = new Set(Object.values(s.station.covers));
      const free = pool.filter(n => !used.has(n));
      s.station.covers[rid] = (free.length ? free : pool)[Math.floor(r() * (free.length ? free.length : pool.length))];
    }
  } else if (!s.station.blacklist.includes(rid)) {
    s.station.blacklist.push(rid);
  }
  const v = getVisitor(s, rid);
  if (v && v.phase !== "leave" && v.phase !== "depart") { v.phase = "leave"; v.offer = { type: "done" }; }
  return { ok: true };
}

// Residency vote outcome (Guillaume's rules): unanimous YES = they stay;
// unanimous NO = they leave; a SPLIT vote = visible dice roll, 4-6 stays.
// Returns {decided, stay, dice, roll}.
export function finalizeVote(votes, rnd) {
  const vals = Object.values(votes || {});
  if (!vals.length) return { decided: true, stay: false, dice: false, roll: 0 };
  const yes = vals.filter(Boolean).length, no = vals.length - yes;
  if (no === 0) return { decided: true, stay: true, dice: false, roll: 0 };
  if (yes === 0) return { decided: true, stay: false, dice: false, roll: 0 };
  const roll = 1 + Math.floor((rnd || Math.random)() * 6);
  return { decided: true, stay: roll >= 4, dice: true, roll };
}

// Season, zip 235 rework (Guillaume: "change the seasons to be once every
// real 7 days"): derived from the REAL clock (7 real days per season, fixed
// epoch anchor) instead of the in-game day. The day parameter is kept so the
// existing call sites don't change, but it is ignored. Every client computes
// the same season with zero sync. No longer purely visual: winter snows and
// swaps wolves for snow leopards, autumn tints foliage and biases visitor
// orders toward pumpkins, spring spawns flowers/fruit/berry bushes (see
// FermeGame.js + classifyBuyOffer below).
export function seasonOf() {
  const idx = Math.floor(Math.max(0, Date.now() - C.SEASON_EPOCH) / C.SEASON_REAL_MS);
  return C.SEASONS[idx % C.SEASONS.length];
}

// Host normalization at load: the pre-built station must stand on clear
// ground even on OLD saves (same spirit as the cauldron fix of zip 230).
// Clears seeded trees/rocks inside STATION_CLEAR; returns changed indices so
// the caller can record them as overrides (persisted + snapshot-carried).
export function clearStationArea(w) {
  const changed = [];
  const clearAt = (x, y) => {
    if (x < 0 || y < 0 || x >= C.MAP_W || y >= C.MAP_H) return;
    const i = y * C.MAP_W + x;
    if (w.objects[i] !== C.O_NONE && w.objects[i] !== C.O_HOUSE) {
      w.objects[i] = C.O_NONE; w.objHp.delete(i); changed.push(i);
    }
  };
  const R = C.STATION_CLEAR;
  for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) clearAt(x, y);
  // Zip 232: the rails now run the ENTIRE west border, so the two rail
  // columns are cleared over the full map height (seeded trees/rocks used
  // to sit on the track outside the old rows 6..46 window). Trees can still
  // grow BESIDE the track (columns 1 and 4+ untouched here); newDay skips
  // these columns too, so nothing regrows on the rails.
  for (let y = 0; y < C.MAP_H; y++)
    for (let x = C.STATION_RAIL_X; x <= C.STATION_RAIL_X + 1; x++) clearAt(x, y);
  return changed;
}

// Chantier reprise (demande Guillaume) : nettoyage des "fantômes" de
// sucrerie laissés par l'ANCIEN modèle (pose libre façon moulin, avant la
// bascule vers un bâtiment d'artisan unique posé au site fixe
// C.SUCRERIE_LEGACY_SOLID_TILE). Sur une ferme sauvegardée avant ce
// changement, object0v peut encore contenir un ou plusieurs O_SUCRERIE
// ailleurs qu'au site fixe : à chaque chargement, on les efface (tuile
// remise à O_NONE, entrée world.sucreries associée supprimée avec sa canne
// en stock — la sucrerie ne s'installe plus QUE depuis la boutique, comme
// convenu). Retourne la liste des indices modifiés, à passer à
// recordTileOverride (FermeGame.js) comme pour clearStationArea ci-dessus,
// sinon la tuile fantôme reviendrait au prochain chargement (objectOv non
// mis à jour).
// IMPORTANT (chantier "sucrerie déplaçable") : `keepIdx` référence
// délibérément C.SUCRERIE_LEGACY_SOLID_TILE (constante FIGÉE, jamais
// modifiée) et NON C.SUCRERIE_SITE — cette dernière a changé de sens/valeur
// avec ce chantier (elle référence maintenant le footprint du bâtiment
// d'artisan). Si on lisait C.SUCRERIE_SITE ici, cette fonction effacerait à
// tort le tile légitime de l'ancien modèle avant que
// migrateSucrerieToArtisan (ci-dessous) ait pu le convertir.
export function clearGhostSucreries(world) {
  const changed = [];
  const keepIdx = idx(C.SUCRERIE_LEGACY_SOLID_TILE.x, C.SUCRERIE_LEGACY_SOLID_TILE.y);
  for (let i = 0; i < world.objects.length; i++) {
    if (world.objects[i] !== C.O_SUCRERIE || i === keepIdx) continue;
    world.objects[i] = C.O_NONE; world.objHp.delete(i); changed.push(i);
    if (world.sucreries) world.sucreries.delete(i);
  }
  return changed;
}

// Chantier "sucrerie déplaçable" (2026-07, demande Guillaume : "qu'on puisse
// bouger le bâtiment sucrerie, comme les autres bâtiments d'artisans") : la
// sucrerie a rejoint C.ARTISAN_BUILDINGS/crafts.sucrerie (voir
// fermeConstants.js). Sur une ferme sauvegardée AVANT ce chantier (zips
// 317-324), le tile O_SUCRERIE à C.SUCRERIE_LEGACY_SOLID_TILE (voir
// clearGhostSucreries ci-dessus, qui a déjà nettoyé tout exemplaire ailleurs
// qu'à cette coordonnée) peut encore être présent, avec son stock de canne
// dans world.sucreries. On le convertit ICI, une seule fois au chargement,
// en crafts.sucrerie = { built, pos, cane, nextAt } (même stock, aucune
// perte), puis on efface le vieux tile + son entrée world.sucreries pour ne
// jamais avoir les deux représentations en même temps. Idempotent : si
// crafts.sucrerie est déjà construit (ferme créée après ce chantier, ou déjà
// migrée), ne fait rien côté crafts (le tile legacy, lui, est toujours
// nettoyé par précaution). Retourne la liste des indices modifiés, à passer
// à recordTileOverride (FermeGame.js) comme clearGhostSucreries.
export function migrateSucrerieToArtisan(world, crafts) {
  const changed = [];
  if (!world || !world.objects) return changed;
  const oldSiteIdx = idx(C.SUCRERIE_LEGACY_SOLID_TILE.x, C.SUCRERIE_LEGACY_SOLID_TILE.y);
  if (world.objects[oldSiteIdx] !== C.O_SUCRERIE) return changed;
  if (crafts && !(crafts.sucrerie && crafts.sucrerie.built)) {
    const ss = (world.sucreries && world.sucreries.get(oldSiteIdx)) || { cane: 0, nextAt: 0 };
    crafts.sucrerie = { built: true, pos: { x: C.SUCRERIE_SITE.x, y: C.SUCRERIE_SITE.y }, cane: ss.cane || 0, nextAt: ss.nextAt || 0 };
  }
  world.objects[oldSiteIdx] = C.O_NONE; world.objHp.delete(oldSiteIdx); changed.push(oldSiteIdx);
  if (world.sucreries) world.sucreries.delete(oldSiteIdx);
  return changed;
}

// ==================================================================
// Zip 235 — mondes tournants du passage sombre + saisons runtime
// ==================================================================

/* ==========================================================================
   ZIP 392 — FORÇAGE DE TERRE PAR LE MENU DÉVELOPPEUR
   ==========================================================================
   Le menu secret de l'hôte (Cmd/Ctrl+Shift+X, voir FermeGame.js) peut fixer la
   terre du passage, quel que soit le jour de jeu. La valeur choisie vit dans
   l'état PARTAGÉ de la ferme (`sharedRef.current.forcedWorld`, diffusé par
   shareState et persisté dans l'instantané) — jamais en local.

   POURQUOI UNE VARIABLE DE MODULE PLUTÔT QU'UN PARAMÈTRE.
   `passageWorldIndex(day)` a SIX appelants répartis dans deux fichiers, et le
   zip 388 a laissé deux avertissements explicites sur les pièges de signature :
   un dernier argument optionnel qu'un appelant oublie rend exactement l'ancien
   comportement, sans erreur et sans trace. Ici ce serait pire qu'ailleurs — un
   seul appelant distrait suffirait à ce que la carte DESSINÉE ne soit pas celle
   que la simulation croit, et le défaut ne se verrait qu'à deux joueurs.
   Le forçage est donc posé UNE fois, à un seul endroit, et lu par tous.

   Ce n'est pas de l'état de jeu caché : la source de vérité reste
   `sharedRef.current.forcedWorld`. Cette variable n'en est que le reflet, et
   elle est réécrite à chaque arrivée d'état partagé (applySnapshot,
   applyDeltas, loadFarmByCode) — c'est-à-dire par le même chemin que tout le
   reste de l'état de la ferme, ce qui rend une divergence impossible.

   Elle est au niveau du MODULE, donc partagée entre l'instance visible de
   FermeGame et l'instance cachée de l'hôte. C'est voulu : ces deux instances
   simulent la MÊME ferme et doivent voir la même terre. */
let forcedPassageKey = null;
export function setForcedPassageKey(key) {
  forcedPassageKey = (key && C.PASSAGE_WORLDS.some(w => w.key === key)) ? key : null;
}
export function getForcedPassageKey() { return forcedPassageKey; }

// Semaine de jeu -> index dans C.PASSAGE_WORLDS. Un même s.day donne la même
// semaine à tous les clients : rotation identique partout, sans synchro.
export function passageWorldIndex(day) {
  /* Zip 385 : forçage d'essai par constante. Zip 392 : le menu développeur
     passe DEVANT, parce qu'il se défait d'un clic là où la constante demande
     une livraison. C.PASSAGE_FORCE_KEY est repassée à null au zip 392 et n'a
     plus de lecteur en pratique ; elle reste lue ici comme filet, pour qu'un
     réglage en dur continue de fonctionner si quelqu'un la repose un jour. */
  const forcedKey = forcedPassageKey || C.PASSAGE_FORCE_KEY;
  if (forcedKey) {
    const forced = C.PASSAGE_WORLDS.findIndex(w => w.key === forcedKey);
    if (forced >= 0) return forced;
  }
  // Zip 385 : PASSAGE_WORLD_DAYS (3) remplace SEASON_DAYS (7). Voir le
  // commentaire de la constante — un cycle complet fait désormais 15 jours de
  // jeu, et SEASON_DAYS n'a plus aucun lecteur.
  return passageBlockOf(day) % C.PASSAGE_WORLDS.length;
}
export function passageWorldOf(day) { return C.PASSAGE_WORLDS[passageWorldIndex(day)]; }
/* Zip 388 : le familier de la terre du passage en cours, ou null si le jour
   n'est pas connu. Écrit en une ligne ici plutôt que recopié chez l'appelant :
   `spec.pet` est optionnel sur la carte maléfique historique, et une lecture
   directe planterait le tirage de visiteur — c'est-à-dire l'arrivée du train,
   c'est-à-dire tout. */
export function passagePetOf(day) {
  if (day === undefined || day === null) return null;
  const w = passageWorldOf(day);
  return (w && w.pet && w.pet.id) || null;
}

/* Numéro de CRÉNEAU de rotation : combien de tranches de PASSAGE_WORLD_DAYS
   jours de jeu se sont écoulées. Strictement croissant, identique chez tous
   les clients d'une même ferme (il ne dépend que de s.day), et c'est ce qui en
   fait un bon jeton de « une fois par venue » : contrairement à l'index de
   monde, qui reboucle toutes les cinq terres, un créneau ne revient jamais.

   Sous forçage, la valeur reste celle du jour : elle continue donc d'avancer
   normalement, et le trésor du Gourmandin redevient disponible tous les trois
   jours de jeu comme il le ferait en rotation réelle. */
/* Zip 386 — OÙ EST LA LICORNE N° i À L'INSTANT t.
   Fonction PURE : pas d'état, pas de sauvegarde, pas un octet de réseau. Les
   deux joueurs voient la même licorne au même endroit parce qu'ils évaluent la
   même fonction du même temps — et l'hôte n'a rien à arbitrer.

   Le point d'ancrage est tiré du seul index (donc stable d'une session à
   l'autre), et la promenade est la composition de deux sinusoïdes de périodes
   incommensurables : le trajet ne se referme jamais exactement sur lui-même,
   ce qui suffit à ne pas lire une ronde mécanique.

   Bornes en x volontairement 8..47 : à l'ouest de la rive est (EAST_LAKE_X),
   pour qu'aucune licorne ne se promène sur le pont ni au-dessus du sirop. Le
   rendu vérifie en plus la case sous ses sabots — voir drawCandyUnicorns. */
export function unicornAt(i, nowMs) {
  const h = (((i + 1) * 2654435761) >>> 0);
  const ax = 8 + (h % 40);
  const ay = 6 + ((h >>> 8) % 52);
  const ph = ((h >>> 16) % 1000) / 1000;
  const t = (nowMs / C.CANDY_UNICORN_PERIOD_MS + ph) * Math.PI * 2;
  const R = C.CANDY_UNICORN_ROAM;
  const x = ax + Math.cos(t) * R;
  const y = ay + Math.sin(t * 0.7 + ph * 6.28) * R * 0.6;
  return { x, y, facing: -Math.sin(t) >= 0 ? 1 : -1 };
}

export function passageBlockOf(day) {
  return Math.floor(Math.max(0, (day || 1) - 1) / C.PASSAGE_WORLD_DAYS);
}

// Génère l'une des cartes du passage sombre, à partir du même modèle que
// generateEvilWorld (mêmes coordonnées d'arrivée/retour, mêmes dimensions),
// mais avec des variations propres à chaque monde : Terres Maléfiques (le
// monde d'origine), Bonbons, Labyrinthe, Cristal, Prairie. La seed est
// stable par monde (mêmes objets à chaque visite dans la même semaine), et
// chaque carte pose une petite collection de "breloques" (pickups) au sol
// (colorPickupColor / pickupCount) qui rapportent de l'or à qui les ramasse
// (voir resolvePassagePickup, hôte). Le labyrinthe pose des "haies" (arbres
// morts, pour la collision) formant un dédale et un prix au centre.
export function generatePassageWorld(worldIdx) {
  const W = C.EVIL_MAP_W, H = C.EVIL_MAP_H;
  const spec = C.PASSAGE_WORLDS[worldIdx];
  const rnd = makeRng(0xE411 + worldIdx * 977);
  const ground = new Array(W * H).fill(C.G_GRASS);
  const objects = new Array(W * H).fill(C.O_NONE);
  const objHp = new Map();
  const id = (x, y) => y * W + x;

  // Petit lac / mare à peu près à mi-carte, comme la carte maléfique.
  const lakeCx = 22 + Math.floor(rnd() * 14), lakeCy = 30 + Math.floor(rnd() * 10);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - lakeCx, y - lakeCy);
    if (d < 6 + rnd() * 2) ground[id(x, y)] = C.G_WATER;
  }

  // Ceinture d'arbres autour de la carte (arbres morts pour le monde
  // maléfique et cristal ; arbres/pins vivants ailleurs).
  const treeKind = () => (spec.key === "evil" || spec.key === "crystal")
    ? C.O_TREE_DEAD : (rnd() < 0.5 ? C.O_TREE : C.O_TREE2);
  const put = (x, y, kind, hp) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
    const i = id(x, y);
    if (ground[i] !== C.G_GRASS || objects[i] !== C.O_NONE) return false;
    objects[i] = kind; objHp.set(i, hp);
    return true;
  };

  if (spec.key === "maze") {
    // Labyrinthe : haies en grille avec passages irréguliers. Prix (chest
    // symbolique = un tas de "breloques" concentré) au centre.
    const HW = 4, cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    for (let y = 4; y < H - 4; y += HW) for (let x = 4; x < W - 4; x++) {
      if (rnd() < 0.72 && Math.hypot(x - cx, y - cy) > 3) put(x, y, C.O_TREE_DEAD, C.TREE_HP);
    }
    for (let x = 4; x < W - 4; x += HW) for (let y = 4; y < H - 4; y++) {
      if (rnd() < 0.72 && Math.hypot(x - cx, y - cy) > 3) put(x, y, C.O_TREE_DEAD, C.TREE_HP);
    }
    // Couloir garanti : dégager un chemin de EVIL_SPAWN vers le centre.
    let x = C.EVIL_SPAWN.x, y = C.EVIL_SPAWN.y;
    while (Math.hypot(x - cx, y - cy) > 2) {
      const i = id(x, y); if (objects[i] !== C.O_NONE) { objects[i] = C.O_NONE; objHp.delete(i); }
      if (Math.abs(x - cx) > Math.abs(y - cy)) x += Math.sign(cx - x);
      else y += Math.sign(cy - y);
    }
  } else {
    // Ceinture + éparpillement de forêt (mêmes ordres de grandeur que
    // generateEvilWorld).
    for (let n = 0; n < 220; n++) put(rnd() * W, rnd() * H, treeKind(), C.TREE_HP);
    for (let x = 1; x < W - 1; x++) { if (rnd() < 0.65) put(x, 1 + Math.floor(rnd() * 2), treeKind(), C.TREE_HP); if (rnd() < 0.65) put(x, H - 2 - Math.floor(rnd() * 2), treeKind(), C.TREE_HP); }
    /* Zip 386 — PAS UN CAILLOU AU PAYS DES BONBONS (demande Guillaume :
       « remove all stone »).

       ⚠️ LE TIRAGE EST CONSERVÉ MÊME QUAND ON NE POSE RIEN. C'est la leçon du
       zip 381 appliquée à la lettre : sauter les 440 appels à rnd() décalerait
       tout ce qui vient après dans le flux et changerait la carte entière du
       Pays des Bonbons — arbres, mare, breloques — alors qu'on n'a demandé que
       le retrait des rochers. En consommant les mêmes tirages, la carte reste
       CELLE D'AVANT, moins les cailloux. C'est exactement ce qu'on promet, et
       c'est vérifiable à l'œil sur deux planches successives.

       Effet de bord assumé et signalé à Guillaume : le Pays des Bonbons perd
       sa source de MINERAI MAGIQUE (les rochers du passage en donnent quand on
       les mine). Les quatre autres terres gardent la leur. */
    const noStone = spec.key === "candy";
    for (let i = 0; i < 220; i++) {
      const rx = rnd() * W, ry = rnd() * H;
      if (!noStone) put(rx, ry, C.O_ROCK, C.EVIL_ROCK_HP);
    }
  }

  // Dégage impérativement les cases d'arrivée / retour / prix maléfique, et
  // (zip 385) le repaire du Gourmandin au Pays des Bonbons : un arbre ou un
  // rocher tiré au hasard sur sa case rendrait le mini-jeu inatteignable une
  // rotation sur cinq, sans la moindre erreur visible.
  // Zip 386 : le Gourmandin n'est plus dans cette liste — il a déménagé sur le
  // tablier du pont, qui n'a jamais d'objet posé dessus (il est construit après
  // coup, en écrasant le sol). Le dégagement de rayon 2 du zip 385 n'a donc
  // plus d'objet.
  const mustClear = [C.EVIL_SPAWN, C.EVIL_RETURN_PASSAGE, C.EVIL_CAULDRON_SPAWN];
  for (const p of mustClear) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const i = id(p.x + dx, p.y + dy);
      if (i >= 0 && i < ground.length) {
        if (ground[i] === C.G_WATER) ground[i] = C.G_GRASS;
        if (objects[i] !== C.O_NONE) { objects[i] = C.O_NONE; objHp.delete(i); }
      }
    }
  }
  ground[id(C.EVIL_RETURN_PASSAGE.x, C.EVIL_RETURN_PASSAGE.y)] = C.G_DARK_PASSAGE;
  // Zip 372 : le MÊME couloir garanti que sur la carte maléfique. C'est ici
  // qu'il est le plus indispensable : le monde "maze" pose des haies en grille
  // sur toute la carte, et sans ce passage en force la porte du défi serait
  // murée une semaine sur cinq.
  carveRunCorridor(ground, objects, objHp, W, H);
  // Zip 375 : la MÊME rive est et la même jetée que sur la carte maléfique.
  // Même argument que pour le couloir : la porte doit être au même endroit,
  // et se présenter de la même façon, quelle que soit la semaine.
  const depth = carveEastLake(ground, objects, objHp, W, H);

  // Pickups (breloques). Placés sur des cases d'herbe libres, jamais dans
  // l'eau, jamais sur un objet, jamais trop près du spawn (on veut avoir à
  // explorer un peu).
  const pickups = [];
  if (spec.pickupCount > 0) {
    let tries = spec.pickupCount * 20, placed = 0;
    while (tries-- > 0 && placed < spec.pickupCount) {
      const x = 4 + Math.floor(rnd() * (W - 8)), y = 4 + Math.floor(rnd() * (H - 8));
      if (Math.hypot(x - C.EVIL_SPAWN.x, y - C.EVIL_SPAWN.y) < 8) continue;
      const i = id(x, y);
      if (ground[i] !== C.G_GRASS || objects[i] !== C.O_NONE) continue;
      pickups.push({ id: placed, x, y }); placed++;
    }
  }
  const maze = spec.key === "maze"
    ? { prizeX: Math.floor(W / 2), prizeY: Math.floor(H / 2) } : null;

  // Créatures : le seul monde qui garde des monstres est "evil" — les autres
  // sont paisibles (Guillaume: "unique gifts, trinkets, rare pets to catch").
  const monsters = [];
  if (spec.key === "evil") {
    for (let n = 0; n < C.EVIL_MONSTER_COUNT; n++) {
      let mx = 0, my = 0, ok = false, tries = 0;
      while (!ok && tries++ < 400) {
        mx = 1 + Math.floor(rnd() * (W - 2)); my = 1 + Math.floor(rnd() * (H - 2));
        const i = id(mx, my);
        if (ground[i] === C.G_GRASS && objects[i] === C.O_NONE
          && Math.hypot(mx - C.EVIL_SPAWN.x, my - C.EVIL_SPAWN.y) >= C.EVIL_MONSTER_MIN_SPAWN_DIST) ok = true;
      }
      monsters.push({ id: n, x: mx, y: my, tx: mx, ty: my, dir: 0, animT: 0, moving: false, chasing: false, fleeing: false, kind: rnd() < 0.5 ? "zombie" : "wolf", hp: 3 });
    }
  }

  /* ⚠️ ZIP 411 — LE LAC EST DÉSORMAIS EXPORTÉ, et ce n'est pas de la commodité.
     Le Gourmandin déménage au MILIEU du lac du Pays des Bonbons (demande
     Guillaume), or ce lac est tiré au sort à la génération : ses coordonnées
     ne vivaient que dans deux variables locales de cette fonction. Sans elles,
     FermeGame n'avait aucun moyen de savoir où poser le monstre — il aurait
     fallu redevinier le tirage ailleurs, c'est-à-dire écrire deux fois la même
     chose et les voir diverger au premier réglage (leçon du zip 387). */
  const lake = { x: lakeCx, y: lakeCy, r: 6 };

  return { w: W, h: H, ground, objects, objHp, depth, monsters, pickups, spec, maze, worldIdx, lake };
}

// Ramassage d'une breloque : gain d'or + potentielle capture d'animal
// exclusif du monde (station.pendingGifts, comme les cadeaux visiteur).
// petCaughtBefore : liste des mondes où CE joueur a déjà capturé son pet
// cette semaine (côté FermeGame, on garde ça dans un ref local, réinitialisé
// à chaque rotation).
export function resolvePassagePickup(s, f, worldIdx, pickupId, rnd) {
  const r = rnd || Math.random;
  const spec = C.PASSAGE_WORLDS[worldIdx];
  const gold = C.PASSAGE_LOOT_GOLD_MIN + Math.floor(r() * (C.PASSAGE_LOOT_GOLD_MAX - C.PASSAGE_LOOT_GOLD_MIN + 1));
  s.money = (s.money || 0) + gold; s.totalEarned = (s.totalEarned || 0) + gold;
  const res = { gold, pet: null, bagFull: false };
  /* ⚠️ ZIP 388 — LA CAPTURE AU SOL EST SUPPRIMÉE.
     Guillaume : « leur attribution semble injustifiée et aléatoire ». Elle
     venait d'ici : ramasser une breloque déclenchait un tirage à
     PASSAGE_PET_CATCH_CHANCE et un animal apparaissait dans le sac, sans un
     mot, sans personne à l'écran pour l'avoir donné.

     Les familiers des cinq terres ne disparaissent pas pour autant : ils sont
     désormais RAPPORTÉS PAR LES VISITEURS amis, et par préférence celui de la
     terre en cours (voir rollPetGift / passagePetOf). On déplace la source,
     on ne retire pas le contenu.

     `spec` reste lu pour l'or ; `PASSAGE_PET_CATCH_CHANCE` n'est plus lue
     nulle part et la constante est conservée telle quelle, commentée sur
     place (fermeConstants.js). La retirer obligerait à toucher un fichier de
     plus pour zéro effet.
     `res.pet` et `res.bagFull` restent dans la forme du résultat : le client
     les teste, et changer la forme d'un retour pour supprimer un cas est le
     genre de nettoyage qui casse un appelant oublié. */
  void spec;
  return res;
}

/* ===========================================================================
   ZIP 393 — FIN D'UNE PARTIE AU LABYRINTHE
   ---------------------------------------------------------------------------
   Appelé par l'hôte à réception de "labFailed" ou "labWon". Comme pour le défi
   de fuite et le Gourmandin, la partie s'est déroulée ENTIÈREMENT côté client
   (le monde sombre n'existe pas côté hôte, le labyrinthe encore moins) :
   l'hôte persiste et diffuse, mais ne croit rien sur parole.

   TROIS GARDE-FOUS, et le troisième est le seul qui compte vraiment :

     - les éclats sont plafonnés à LAB_MAX_SHARDS et le score à LAB_MAX_SCORE ;
     - le score ne remplace le record que s'il est supérieur ;
     - ⚠️ LA PRIME DE SORTIE NE TOMBE QU'UNE FOIS PAR CRÉNEAU, et le créneau
       vient de l'ÉTAT DE LA FERME (s.day), jamais du message. C'est ce qui
       empêche de refaire le labyrinthe en boucle pour 900 or à chaque fois.
       Motif du « créneau » repris tel quel du trésor du Gourmandin (zip 385).

   Les éclats sont payés MÊME EN CAS DE MORT — décision de Guillaume, « comme
   le défi de fuite », où les bonbons ramassés reviennent avec le joueur
   rattrapé. C'est ce qui fait qu'une partie perdue n'est pas une partie
   perdue pour rien.

   Renvoie ce qui a été RÉELLEMENT accordé, pour que l'appelant sache quoi
   diffuser — et pas ce que le client espérait.
   =========================================================================== */
export function resolveLabRun(s, f, shards, score, won, block) {
  const sh = Math.max(0, Math.min(C.LAB_MAX_SHARDS, shards | 0));
  const sc = Math.max(0, Math.min(C.LAB_MAX_SCORE, score | 0));
  const res = { shards: sh, gold: 0, best: false, prize: false };

  const gold = sh * C.LAB_SHARD_GOLD;
  if (gold > 0) {
    s.money = (s.money || 0) + gold;
    s.totalEarned = (s.totalEarned || 0) + gold;
    res.gold += gold;
  }
  if (won && (f.inv.labGoldBlock | 0) !== block) {
    f.inv.labGoldBlock = block;
    s.money = (s.money || 0) + C.LAB_PRIZE_GOLD;
    s.totalEarned = (s.totalEarned || 0) + C.LAB_PRIZE_GOLD;
    res.gold += C.LAB_PRIZE_GOLD;
    res.prize = true;
  }
  if (sc > (f.inv.labBest | 0)) { f.inv.labBest = sc; res.best = true; }
  return res;
}

/* Zip 385 — NIVEAU TERMINÉ AU GOURMANDIN. Appelé par l'hôte à réception d'une
   requête "candyLevel". Le mini-jeu s'est déroulé ENTIÈREMENT côté client
   (même contrat de confiance que le défi de fuite, cf. "runFailed"), mais
   l'hôte ne croit pas le client sur parole pour autant :

     - le niveau annoncé est borné à [1, CANDY_GAME_LEVELS] ;
     - il doit valoir AU PLUS le niveau déjà acquis + 1. Sans cette ligne, un
       message unique « j'ai fini le 15 » suffirait à repartir avec l'or ET le
       chat sans avoir joué. C'est le seul vrai garde-fou du chantier ;
     - l'or ne peut tomber qu'une fois par CRÉNEAU de rotation (block), et le
       créneau vient de l'état de la ferme, pas du message.

   Renvoie ce qui a été réellement accordé, pour que l'appelant sache quoi
   diffuser — et pas ce que le client espérait. */
/* ===========================================================================
   ZIP 411 — UNE DESCENTE TERMINÉE
   ---------------------------------------------------------------------------
   Même contrat de confiance que "candyLevel" et "runFailed" : le mini-jeu s'est
   déroulé ENTIÈREMENT côté client, l'hôte ne peut pas le rejouer. Il ne croit
   donc pas le client sur parole, il BORNE :

     - les bonbons sont plafonnés (LUGE_MAX_CANDIES) et payés à l'unité ;
     - la PRIME D'ARRIVÉE ne tombe qu'une fois par CRÉNEAU de rotation, et le
       créneau vient de l'état de la ferme, jamais du message.

   ⚠️ POURQUOI DEUX RÉCOMPENSES DE NATURES DIFFÉRENTES. Les bonbons sont
   rejouables sans limite : c'est le revenu du joueur qui aime la descente, et
   il est petit exprès. La prime, elle, est grosse et unique par venue — c'est
   elle qui donne une raison de revenir au Pays des Bonbons plutôt qu'une
   raison d'y rester. Le même arbitrage exactement qu'au zip 385 pour l'or du
   niveau 10 du Gourmandin, et pour la même raison : un bouton à or infini
   dévalue tout le reste de l'économie (un moulin coûte 30 000). */
export function resolveLugeFinish(s, f, candies, block) {
  const n = Math.max(0, Math.min(C.LUGE_MAX_CANDIES, candies | 0));
  const res = { candies: n, gold: 0, bonus: false };
  let gold = n * C.LUGE_GOLD_PER_CANDY;
  if ((f.inv.lugeBlock === undefined ? -1 : f.inv.lugeBlock) !== block) {
    f.inv.lugeBlock = block;
    gold += C.LUGE_FINISH_GOLD;
    res.bonus = true;
  }
  f.inv.lugeRuns = (f.inv.lugeRuns | 0) + 1;
  s.money = (s.money || 0) + gold;
  s.totalEarned = (s.totalEarned || 0) + gold;
  res.gold = gold;
  return res;
}

export function resolveCandyLevel(s, f, level, block) {
  const lv = Math.max(1, Math.min(C.CANDY_GAME_LEVELS, level | 0));
  const res = { ok: false, level: lv, gold: 0, pet: null, bagFull: false };
  const had = f.inv.candyLevel | 0;
  if (lv > had + 1) return res;              // saut de niveau : on ignore
  res.ok = true;
  if (lv > had) f.inv.candyLevel = lv;

  if (lv === C.CANDY_GAME_GOLD_LEVEL && (f.inv.candyGoldBlock | 0) !== block) {
    f.inv.candyGoldBlock = block;
    s.money = (s.money || 0) + C.CANDY_GAME_GOLD;
    s.totalEarned = (s.totalEarned || 0) + C.CANDY_GAME_GOLD;
    res.gold = C.CANDY_GAME_GOLD;
  }
  if (lv === C.CANDY_GAME_PET_LEVEL && !f.inv.candyCatDone) {
    const cr = resolveCatchPet(f, C.CANDY_GAME_PET_ID);
    // Sac plein : le chat N'EST PAS marqué comme remis. Le joueur libère une
    // place et rejoue le niveau 15 pour le récupérer. Le contraire lui ferait
    // perdre définitivement la seule récompense unique du jeu à cause d'un
    // inventaire encombré, ce qui serait indéfendable.
    if (cr.ok) { f.inv.candyCatDone = true; res.pet = C.CANDY_GAME_PET_ID; }
    else res.bagFull = true;
  }
  return res;
}

/* ===========================================================================
   ZIP 388 — ACCEPTER LE FAMILIER PROPOSÉ PAR UN VISITEUR
   ---------------------------------------------------------------------------
   `index` >= 0 : le joueur libère d'abord le familier de ce rang (sac plein).
   `index` < 0  : il accepte simplement, il lui reste de la place.

   L'hôte ne croit PAS le client sur le `petId` : il ne sert que l'offre qu'il
   a lui-même posée dans `f.inv.petOffer`, et l'efface en la servant. Un
   double clic, un message rejoué ou un message forgé ne peuvent donc pas
   produire deux familiers.
   =========================================================================== */
export function resolveAcceptPetGift(f, index) {
  const petId = f.inv && f.inv.petOffer;
  if (!petId) return { ok: false, noOffer: true };
  if ((index | 0) >= 0) resolveReleasePet(f, index | 0);
  const cr = resolveCatchPet(f, petId);
  // Sac toujours plein (le joueur n'a rien libéré) : on GARDE l'offre. Il
  // pourra la reprendre après avoir fait de la place. Même arbitrage que pour
  // le chat berlingot du zip 385 : ne jamais faire perdre définitivement une
  // récompense à cause d'un inventaire encombré.
  if (!cr.ok) return { ok: false, full: true, petId };
  delete f.inv.petOffer;
  return { ok: true, petId };
}
export function resolveDeclinePetGift(f) {
  if (!f.inv || !f.inv.petOffer) return { ok: false };
  const petId = f.inv.petOffer;
  delete f.inv.petOffer;
  return { ok: true, petId };
}

/* ===========================================================================
   ZIP 388 — VENDRE UNE DÉCORATION
   ---------------------------------------------------------------------------
   Guillaume : « ajouter l'option de suppression de décorations (on accumule
   trop de décorations dans notre bag) », puis, à la question posée : « sell
   with confirmation ».

   ⚠️ L'ÉCART EST SIGNALÉ, PAS GOMMÉ : vendre n'est pas supprimer. Le sac se
   vide de la même façon, mais un cadeau de visiteur devient une source d'or,
   ce qu'il n'était pas. Le barème est donc volontairement bas — 70 à 130 or
   pour une fleur, 320 à 400 pour les trois décorations d'origine. Repères de
   l'économie : lampadaire 5 000, joaillerie 15 000, moulin 30 000, et le
   Gourmandin injecte 10 000 toutes les ~4 h de jeu. Vider un sac de trente
   fleurs rapporte environ 2 700 or : c'est un débarras, pas un revenu.
   Une seule constante à bouger si l'arbitrage change : le champ `sell` du
   catalogue.

   L'or va à la CAGNOTTE COMMUNE (`s.money`), comme toute vente à la ferme —
   les décorations n'ont jamais eu de porte-monnaie séparé — tandis que le
   stock retiré est bien celui du joueur (`f.inv.decor`).

   Le prix est lu dans la table de l'hôte, JAMAIS reçu du client.
   =========================================================================== */
export function resolveSellDecor(s, f, deco, n) {
  const res = { ok: false, deco, n: 0, gold: 0 };
  if (!C.DECOR_SELL[deco]) return res;                      // id inconnu : on ne vend rien
  if (!f.inv || !f.inv.decor) return res;
  const have = f.inv.decor[deco] | 0;
  const want = Math.max(1, Math.min(have, n | 0));
  if (have <= 0) return res;
  const unit = C.DECOR_SELL[deco] || C.DECOR_SELL_DEFAULT;
  f.inv.decor[deco] = have - want;
  if (f.inv.decor[deco] <= 0) delete f.inv.decor[deco];
  const gold = unit * want;
  s.money = (s.money || 0) + gold;
  s.totalEarned = (s.totalEarned || 0) + gold;
  res.ok = true; res.n = want; res.gold = gold;
  return res;
}

/* ===========================================================================
   ZIP 388 — LES FAMILIERS JOUENT ENTRE EUX
   ---------------------------------------------------------------------------
   Guillaume : « ils doivent jouer entre eux, savoir tourner sur eux-mêmes etc.
   Il faut que ce soit vivant. »

   ⚠️ FONCTION PURE DU TEMPS, et c'est tout l'intérêt. Elle ne lit aucun état,
   n'écrit rien, ne dépend d'aucun tirage aléatoire et ne coûte AUCUN message
   réseau. C'est le modèle des licornes du zip 386 (`unicornAt`) : les deux
   joueurs voient la même figure au même moment parce qu'ils évaluent la même
   fonction, pas parce qu'ils se la sont dite. La série 373-388 reste à zéro
   message périodique ajouté sur seize zips consécutifs.

   Le découpage : le temps est coupé en créneaux de PET_PLAY_PERIOD_MS. Chaque
   créneau a sa figure, tirée d'un grain stable (identifiant du propriétaire +
   numéro du créneau) ; seule la première fraction PET_PLAY_ACTIVE du créneau
   est jouée, le reste est une pause — sans elle, les familiers gigoteraient
   sans interruption et deviendraient fatigants à regarder.

   Les familiers sont APPARIÉS deux à deux (0-1, 2-3…) : les figures à deux
   (poursuite, face-à-face) ont besoin d'un partenaire. Un familier sans
   partenaire — le dernier d'un nombre impair — retombe sur les figures solo.
   C'est ce qui garantit qu'un joueur qui ne promène qu'un seul animal voit
   quand même quelque chose.

   `t` renvoyé va de 0 à 1 sur la durée de la figure : c'est l'appelant
   (drawPetsFor) qui décide ce qu'il en fait, et c'est délibéré — cette
   fonction ne doit rien savoir des pixels, sinon elle ne serait plus
   vérifiable hors navigateur.
   =========================================================================== */
export function petPlayAt(ownerId, index, count, nowMs) {
  const P = C.PET_PLAY_PERIOD_MS;
  const slot = Math.floor(nowMs / P);
  const inSlot = (nowMs - slot * P) / P;              // 0..1
  const pair = index >> 1;                            // les familiers jouent deux à deux
  const partner = (index % 2 === 0) ? index + 1 : index - 1;
  const hasPartner = partner >= 0 && partner < count;
  // Grain stable : mêmes entrées, même figure, chez tous les clients.
  let h = 2166136261;
  const key = String(ownerId) + "|" + pair + "|" + slot;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  h >>>= 0;
  if (inSlot >= C.PET_PLAY_ACTIVE) return { figure: "idle", t: 0, partner: -1, lead: false };
  const t = inSlot / C.PET_PLAY_ACTIVE;
  // Une paire sur trois ne joue pas du tout pendant son créneau : des familiers
  // qui s'animent TOUS en même temps lisent comme un automate, pas comme des
  // bêtes. (Réglage posé au jugé — à revoir manette en main.)
  if (h % 3 === 0) return { figure: "idle", t: 0, partner: -1, lead: false };
  const table = hasPartner ? C.PET_PLAY_DUO : C.PET_PLAY_SOLO;
  const figure = table[(h >>> 4) % table.length];
  const duo = hasPartner && (figure === "chase" || figure === "face");
  return {
    figure,
    t,
    partner: duo ? partner : -1,
    // Dans une poursuite, l'un fuit et l'autre suit. Le meneur est le pair du
    // couple : c'est arbitraire, mais c'est STABLE, donc les deux clients
    // s'accordent sans se parler.
    lead: index % 2 === 0,
  };
}

// Zip 236: add a pet to a farmer's individual bag (max C.MAX_PETS).
// Zip 368 : le nouveau venu part EN BALADE s'il reste une place dehors
// (MAX_PETS_WALKING), sinon il est simplement rangé dans le sac. Attraper un
// familier reste donc gratifiant tout de suite quand on n'en promène pas déjà
// quatre, sans jamais faire disparaître un de ceux qui sont sortis.
export function resolveCatchPet(f, petId) {
  if (!C.PET_CATALOG[petId]) return { ok: false, unknown: true };
  f.pets = Array.isArray(f.pets) ? f.pets : [];
  if (f.pets.length >= C.MAX_PETS) return { ok: false, full: true };
  let outN = 0;
  for (const p of f.pets) if (p && p.out) outN++;
  f.pets.push({ id: petId, at: Date.now(), out: outN < C.MAX_PETS_WALKING });
  return { ok: true, petId };
}
// Zip 368 (demande Guillaume : "pouvoir garder ses animaux personnels dans son
// bag, et pouvoir les WALK en les choisissant") : sort un familier du sac ou le
// range. `want` = true pour le mettre en balade. Renvoie { ok, full, petId, out }
// — `full` quand MAX_PETS_WALKING familiers sont déjà dehors (le client affiche
// alors le toast "walkFull"). Idempotent : demander la balade d'un familier
// déjà dehors réussit sans rien changer, ce qui évite qu'un double clic ou un
// message rejoué ne consomme une place.
export function resolveSetPetWalking(f, index, want) {
  f.pets = Array.isArray(f.pets) ? f.pets : [];
  const p = f.pets[index | 0];
  if (!p) return { ok: false };
  if (!want) { p.out = false; return { ok: true, petId: p.id, out: false }; }
  if (p.out) return { ok: true, petId: p.id, out: true };
  let outN = 0;
  for (const q of f.pets) if (q && q.out) outN++;
  if (outN >= C.MAX_PETS_WALKING) return { ok: false, full: true };
  p.out = true;
  return { ok: true, petId: p.id, out: true };
}
// Release a pet back into the wild (frees a slot). Idempotent-ish: a bad
// index just no-ops with ok:false.
export function resolveReleasePet(f, index) {
  f.pets = Array.isArray(f.pets) ? f.pets : [];
  if (index < 0 || index >= f.pets.length) return { ok: false };
  const [gone] = f.pets.splice(index, 1);
  return { ok: true, petId: gone ? gone.id : null };
}

// Cueillette d'un buisson à baies (E) : baies dans l'inventaire.
export function resolveBerryPick(f, world, x, y, rnd) {
  const r = rnd || Math.random;
  const i = y * C.MAP_W + x;
  if (world.objects[i] !== C.O_BERRY_BUSH) return { ok: false };
  const n = C.BERRY_PICK_MIN + Math.floor(r() * (C.BERRY_PICK_MAX - C.BERRY_PICK_MIN + 1));
  f.inv.berries = (f.inv.berries || 0) + n;
  return { ok: true, n };
}
// Fruits (pommes) sur un chêne : 1 cueillette par jour réel par arbre. lastPickAt
// est stocké dans world.objHp (on réutilise la Map existante pour ne rien
// ajouter au schéma persisté ; les valeurs y sont des timestamps).
export function resolveFruitPick(f, world, x, y) {
  const i = y * C.MAP_W + x;
  if (world.objects[i] !== C.O_TREE) return { ok: false };
  const last = world.objHp.get(i) || 0;
  // Chêne fruitier ? 1 chêne sur FRUIT_TREE_MOD porte des fruits au printemps
  // (hash de case déterministe). Hors printemps, jamais.
  if (seasonOf().key !== "spring" || (i * 2654435761 >>> 0) % C.FRUIT_TREE_MOD !== 0) return { ok: false };
  const REAL_DAY_MS = 24 * 60 * 60 * 1000;
  if (Date.now() - last < REAL_DAY_MS) return { ok: false, cooldown: true };
  f.inv.fruit = (f.inv.fruit || 0) + C.FRUIT_PICK_N;
  world.objHp.set(i, Date.now());
  return { ok: true, n: C.FRUIT_PICK_N };
}

// ---- Zip 280 : bijouterie (voir fermeConstants.js JEWELRY_*) ----
// Achat du bâtiment : pot commun (shared.money), une seule fois. `shared` =
// sharedRef.current côté FermeGame.js, muté directement (même esprit que
// resolveSellFlour). Renvoie { ok, toast }.
export function resolveBuyJewelry(shared, station) {
  if (station.jewelry && station.jewelry.built) return { ok: false, toast: "actionFailed" };
  if ((shared.money | 0) < C.JEWELRY_COST) return { ok: false, toast: "noGold" };
  shared.money -= C.JEWELRY_COST;
  station.jewelry = station.jewelry || { built: false, items: [] };
  station.jewelry.built = true;
  return { ok: true };
}

// Fabrication d'une pièce designée par le joueur (n'importe qui, pas de
// rôle). Consomme sur les pools COMMUNS (gems + gregStock.gold), jamais
// l'inventaire perso. `req` = { type, gemId, shape, price }. Le prix est
// fixé LIBREMENT par le joueur (bornes larges pour éviter les valeurs
// absurdes/négatives côté triche client). Renvoie { ok, toast, item }.
export function resolveMakeJewelry(shared, station, req) {
  if (!station.jewelry || !station.jewelry.built) return { ok: false, toast: "actionFailed" };
  const type = C.JEWELRY_TYPES.find(t => t.id === req.type);
  const shape = C.JEWELRY_SHAPES.find(sh => sh.id === req.shape);
  const gemId = req.gemId | 0;
  if (!type || !shape || gemId < 0 || gemId >= C.GEMS.length) return { ok: false, toast: "actionFailed" };
  const price = Math.max(1, Math.min(999999, Math.round(Number(req.price) || 0)));
  if (!price) return { ok: false, toast: "actionFailed" };
  const gregStock = shared.gregStock || (shared.gregStock = { wood: 0, stone: 0, fertilizer: 0, gold: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
  const gems = shared.gems || (shared.gems = C.GEMS.map(() => 0));
  if ((gregStock.gold | 0) < type.gold) return { ok: false, toast: "jewelryNoGold" };
  if ((gems[gemId] | 0) < C.JEWELRY_GEM_COST) return { ok: false, toast: "jewelryNoGem" };
  gregStock.gold -= type.gold;
  gems[gemId] -= C.JEWELRY_GEM_COST;
  const nextId = (station.jewelry.items.reduce((mx, it) => Math.max(mx, it.id | 0), 0) || 0) + 1;
  const item = { id: nextId, type: type.id, gemId, shape: shape.id, price, maker: req.makerName || "" };
  station.jewelry.items.push(item);
  return { ok: true, item };
}

// Vente d'une pièce finie (chacune à son propre prix, fixé au design) : va
// au pot commun comme toute autre vente. `id` = identifiant de la pièce
// (station.jewelry.items[].id). Renvoie { ok, toast, gain }.
export function resolveSellJewelry(shared, station, id) {
  if (!station.jewelry || !Array.isArray(station.jewelry.items)) return { ok: false, toast: "actionFailed" };
  const idx = station.jewelry.items.findIndex(it => it.id === id);
  if (idx < 0) return { ok: false, toast: "actionFailed" };
  const [item] = station.jewelry.items.splice(idx, 1);
  const gain = item.price | 0;
  shared.money = (shared.money | 0) + gain;
  return { ok: true, gain };
}

/* -------------------------------------------------------------------------
   Montgolfière (zip 302, demande Guillaume) : attraction touristique.
   Fonctions PURES (état par défaut, migration, horaire, trajectoire) —
   la simulation (tick hôte, requêtes) vit dans FermeGame.js comme le reste
   des systèmes "station", au même titre que la bijouterie/les résidents.
   ------------------------------------------------------------------------- */

export function newBalloonState() {
  return {
    pilotRid: null,      // rid du résident désigné (doit être dans station.residents)
    phase: "idle",        // idle | boarding | flying
    tickets: [],           // passagers du vol en cours : { who: "me"|"resident", id, name }
    boardingUntil: 0,      // horloge hôte : fin de la fenêtre d'embarquement
    flightStartAt: 0,
    flightEndAt: 0,
    nextDepartureAt: 0,    // horloge hôte ; 0 = à (re)calculer au prochain tick hôte
    isNightFlight: false,  // vol de 20h (nacelle éclairée) vs vol de 10h
    seed: 0,               // graine de la trajectoire du vol en cours
    soldToday: 0,           // billets vendus le jour de jeu courant (affichage)
    soldDay: 0,             // jour de jeu correspondant à soldToday (reset au changement de jour)
    anchor: null,           // zip 307 : point d'atterrissage choisi par le joueur ({x,y}) ;
                             // null = pas encore déplacé, on utilise C.BALLOON_ANCHOR (rive droite, par défaut).
  };
}

export function migrateBalloon(b) {
  const out = newBalloonState();
  if (!b || typeof b !== "object") return out;
  out.pilotRid = typeof b.pilotRid === "number" ? b.pilotRid : null;
  out.phase = (b.phase === "boarding" || b.phase === "flying") ? b.phase : "idle";
  out.tickets = Array.isArray(b.tickets)
    ? b.tickets.filter(t => t && typeof t.id !== "undefined").slice(0, C.BALLOON_CAPACITY)
    : [];
  // Même correctif que migrateCrafts ci-dessus (nextAt) : ces 4 champs sont
  // des horodatages ABSOLUS, `| 0` les tronquait en entier 32 bits signé et
  // les corrompait à chaque migration (chargement, synchro invité...). `|| 0`
  // ne tronque rien.
  out.boardingUntil = b.boardingUntil || 0;
  out.flightStartAt = b.flightStartAt || 0;
  out.flightEndAt = b.flightEndAt || 0;
  out.nextDepartureAt = b.nextDepartureAt || 0;
  out.isNightFlight = !!b.isNightFlight;
  out.seed = b.seed | 0;
  out.soldToday = Math.max(0, b.soldToday | 0);
  out.soldDay = b.soldDay | 0;
  out.anchor = (b.anchor && typeof b.anchor.x === "number" && typeof b.anchor.y === "number")
    ? { x: b.anchor.x | 0, y: b.anchor.y | 0 } : null;
  return out;
}

// Prochain horaire fixe (10h/20h, temps de JEU) traduit en horloge RÉELLE de
// l'hôte, à partir de `dayStartAt` (même ancre que gameTimeMin). Si les deux
// départs du jour courant sont déjà passés, on programme le premier départ
// du jour de jeu suivant (un jour de jeu dure C.DAY_REAL_MS en temps réel).
export function nextBalloonDeparture(dayStartAt, now) {
  const span = C.DAY_END_MIN - C.DAY_START_MIN;
  const msPerGameMin = C.DAY_REAL_MS / span;
  for (const m of C.BALLOON_DEPARTURES_MIN) {
    const at = dayStartAt + (m - C.DAY_START_MIN) * msPerGameMin;
    if (at > now) return at;
  }
  const nextDayStart = dayStartAt + C.DAY_REAL_MS;
  return nextDayStart + (C.BALLOON_DEPARTURES_MIN[0] - C.DAY_START_MIN) * msPerGameMin;
}

// PRNG déterministe minimal (mulberry32) : à graine égale, TOUS les clients
// calculent exactement la même trajectoire sans rien synchroniser de plus
// que `seed` (déjà broadcast avec le reste de station.balloon).
function balloonRnd(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Trajectoire lissée (courbe de Bézier cubique) sur 4 points de contrôle
// tirés dans les limites de la carte (avec marge), distincts à chaque vol
// via `seed`. `t` = progression du survol, 0..1. Retourne la position AU SOL
// (tuiles) : c'est cette position qui sert à la fois à l'ombre projetée et
// (avec un décalage vertical de rendu) à la nacelle elle-même.
export function balloonPathPoint(seed, t) {
  const rnd = balloonRnd(seed || 1);
  const margin = 14;
  const pts = [0, 1, 2, 3].map(() => ({
    x: margin + rnd() * (C.MAP_W - margin * 2),
    y: margin + rnd() * (C.MAP_H - margin * 2),
  }));
  const tt = Math.max(0, Math.min(1, t));
  const u = 1 - tt;
  const x = u * u * u * pts[0].x + 3 * u * u * tt * pts[1].x + 3 * u * tt * tt * pts[2].x + tt * tt * tt * pts[3].x;
  const y = u * u * u * pts[0].y + 3 * u * u * tt * pts[1].y + 3 * u * tt * tt * pts[2].y + tt * tt * tt * pts[3].y;
  return { x, y };
}

/* ============================================================================
   ZIP 398 — LES VERGERS : POUSSE, CUEILLETTE, ABATTAGE. Tout est PUR.
   ----------------------------------------------------------------------------
   Aucune de ces fonctions ne touche au DOM, au rendu ni au réseau : elles
   prennent un état, elles en rendent un autre. C'est ce qui permet à
   `tools/verify-orchards.mjs` de faire tourner un verger sur plusieurs jours
   simulés, sans navigateur — et donc de MESURER la rentabilité au lieu de la
   supposer. Le zip 393 a montré ce que vaut un réglage supposé.
   ========================================================================== */

/* Le stade visible d'un verger : 0 = plant, 1 = jeune, 2 = adulte, 3 = en
   fruits. Fonction PURE de l'état et de l'instant, lue par le rendu ET par les
   contrôles — personne ne peut donc dessiner un arbre chargé de fruits qui n'en
   porterait pas. C'est le même arbitrage que `Rules.groundY` au labyrinthe. */
export function orchardStage(o, now) {
  if (!o) return 0;
  const spec = C.ORCHARDS[o.k | 0]; if (!spec) return 0;
  if ((o.ripe | 0) > 0) return 3;
  const age = Math.max(0, (now || Date.now()) - (o.plantedAt || 0));
  if (age >= spec.matureMs) return 2;
  return age >= spec.matureMs * 0.45 ? 1 : 0;
}
export function orchardMature(o, now) {
  const spec = C.ORCHARDS[(o && o.k) | 0]; if (!spec) return false;
  return Math.max(0, (now || Date.now()) - ((o && o.plantedAt) || 0)) >= spec.matureMs;
}
export function orchardInSeason(o, season) {
  const spec = C.ORCHARDS[(o && o.k) | 0]; if (!spec) return false;
  return spec.seasons.includes(season || seasonOf().key);
}

/* LE TICK. Appelé par l'hôte, comme millTick. Rend `true` quand l'état a changé
   — donc quand il faut diffuser et persister. Un tick qui diffuserait à chaque
   passage inonderait le réseau pour rien, et le projet a déjà payé ça (zip 264,
   « la fuite realtime »).

   ⚠️ HORS SAISON, L'HORLOGE NE COURT PAS : `nextAt` est REPOUSSÉ, pas consommé.
   Sans cette ligne, un myrtillier passerait l'hiver à accumuler des échéances
   et rendrait six récoltes d'un coup au printemps — ce qui viderait de tout
   sens la saisonnalité qu'on vient d'écrire, et transformerait l'attente en
   simple retard. */
export function orchardTick(o, now, season) {
  const spec = C.ORCHARDS[(o && o.k) | 0]; if (!spec) return false;
  if (!orchardMature(o, now)) return false;
  if ((o.ripe | 0) > 0) return false;                  // déjà mûr : on attend la cueillette
  if (!orchardInSeason(o, season)) { o.nextAt = now + spec.cycleMs; return false; }
  if (!o.nextAt) { o.nextAt = now + spec.cycleMs; return true; }
  if (now < o.nextAt) return false;
  const rnd = balloonRnd(((o.plantedAt | 0) ^ (o.nextAt | 0)) >>> 0);
  o.ripe = spec.yieldMin + Math.floor(rnd() * (spec.yieldMax - spec.yieldMin + 1));
  o.nextAt = 0;
  return true;
}

/* ⚠️ ZIP 404 — « OÙ PEUT-ON PLANTER UN VERGER » N'EST DÉCRIT QU'UNE FOIS.
   Le 404 donne un second planteur au jeu : Greg. À partir de là, la question
   « cette case accepte-t-elle un plant ? » a deux clients — la pose du joueur
   et la recherche de cases de Greg — et deux réponses écrites séparément
   auraient divergé au premier sol ajouté (le piège du 387, et la raison
   d'être de `buildCycle()` au 401). Greg se serait mis à viser des cases que
   la pose refuse ensuite : il y marche, il n'y arrive à rien, et il ne dit
   rien — c'est-à-dire très exactement l'échec silencieux du 402.

   ⚠️ ET LA FONCTION REND LA RAISON, PAS UN BOOLÉEN. Un refus sans motif
   redevient un jeu muet ; `resolveAct` a payé ce prix quatre fois au 402. Tout
   chemin qui refuse ici repart avec une clé de message. */
export function orchardRefusal(world, i) {
  if (!(i >= 0 && i < C.MAP_W * C.MAP_H)) return "orchardBusy";
  if (world.objects[i] !== C.O_NONE) return "orchardBusy";
  if (world.crops && world.crops.has(i)) return "orchardBusy";
  const g = world.ground[i];
  if (g !== C.G_GRASS && g !== C.G_SOIL && g !== C.G_TILLED) return "orchardGround";
  return null;
}
export function orchardPlantable(world, i) { return orchardRefusal(world, i) === null; }

/* PLANTER. Le plant vient de `f.inv.saplings[id]`, acheté à la boutique. La
   case doit être libre et cultivable — mêmes conditions qu'un moulin, lues par
   les mêmes champs. */
export function resolvePlantOrchard(f, world, x, y, kindIdx) {
  const spec = C.ORCHARDS[kindIdx | 0]; if (!spec) return { ok: false };
  if (x < 0 || y < 0 || x >= C.MAP_W || y >= C.MAP_H) return { ok: false };
  const i = y * C.MAP_W + x;
  const why = orchardRefusal(world, i);
  if (why) return { ok: false, toast: why };
  world.orchards = world.orchards || new Map();
  if (world.orchards.size >= C.ORCHARD_MAX) return { ok: false, toast: "orchardMax" };
  f.inv = f.inv || {};
  f.inv.saplings = f.inv.saplings || {};
  if ((f.inv.saplings[spec.id] | 0) <= 0) return { ok: false, toast: "orchardNoSapling" };
  f.inv.saplings[spec.id] -= 1;
  world.objects[i] = C.O_ORCHARD;
  world.objHp.set(i, C.ORCHARD_HP);
  world.orchards.set(i, { k: kindIdx | 0, plantedAt: Date.now(), nextAt: 0, ripe: 0 });
  return { ok: true, i, kindIdx: kindIdx | 0 };
}

/* CUEILLIR. L'ARBRE RESTE — c'est toute la demande. On vide `ripe`, on relance
   l'horloge, et on rend les fruits.
   ⚠️ `ripe` est remis à zéro AVANT tout retour réussi : si la fonction était un
   jour appelée deux fois pour la même image, la seconde trouverait zéro. Ici
   c'est l'hôte qui exécute, donc il n'y a pas de course — mais une fonction
   pure ne doit pas dépendre de qui l'appelle pour être juste. */
export function resolveOrchardPick(f, world, x, y) {
  if (x < 0 || y < 0 || x >= C.MAP_W || y >= C.MAP_H) return { ok: false };
  const i = y * C.MAP_W + x;
  if (world.objects[i] !== C.O_ORCHARD) return { ok: false };
  const o = world.orchards ? world.orchards.get(i) : null;
  if (!o) return { ok: false };
  const spec = C.ORCHARDS[o.k | 0]; if (!spec) return { ok: false };
  if (!orchardMature(o, Date.now())) return { ok: false, toast: "orchardYoung" };
  const n = o.ripe | 0;
  if (n <= 0) return { ok: false, toast: orchardInSeason(o) ? "orchardNotReady" : "orchardOffSeason" };
  o.ripe = 0;
  o.nextAt = Date.now() + spec.cycleMs;
  f.inv = f.inv || {};
  f.inv.fruits = f.inv.fruits || {};
  f.inv.fruits[spec.fruit] = (f.inv.fruits[spec.fruit] | 0) + n;
  return { ok: true, i, n, fruit: spec.fruit };
}

/* ABATTRE (hache). Rend du bois et EFFACE l'état — un verger abattu ne doit pas
   laisser d'entrée orpheline dans la Map, sans quoi la case suivante posée là
   hériterait de son âge et de ses fruits. C'est le genre de fuite qu'on ne
   découvre qu'en replantant au même endroit, six semaines plus tard. */
export function resolveOrchardChop(f, world, x, y) {
  const i = y * C.MAP_W + x;
  if (world.objects[i] !== C.O_ORCHARD) return { ok: false };
  const hp = (world.objHp.get(i) | 0) - 1;
  if (hp > 0) { world.objHp.set(i, hp); return { ok: true, done: false, i }; }
  world.objects[i] = C.O_NONE;
  world.objHp.delete(i);
  if (world.orchards) world.orchards.delete(i);
  f.inv = f.inv || {};
  f.inv.wood = (f.inv.wood | 0) + C.ORCHARD_WOOD;
  return { ok: true, done: true, i, wood: C.ORCHARD_WOOD };
}

/* =============================================================================
   ZIP 404 — GREG SAIT PLANTER UN VERGER, ET L'ABATTRE.
   -----------------------------------------------------------------------------
   Guillaume : « il faut que greg puisse aussi les planter. Donc même mécanisme
   que les seeds et crops habituels ». Le mécanisme des graines, côté Greg,
   c'est trois tâches : labourer, planter, arroser. UN VERGER N'EN VEUT AUCUNE
   DES TROIS — il se pose sur l'herbe nue comme un moulin, et ne s'arrose
   jamais. C'est donc une quatrième tâche à écrire, pas un paramètre à changer,
   et c'est le genre de détail qu'on ne voit pas en relisant l'ordre existant :
   `gregOrder` aurait accepté un plant, poussé un « till » sur sa case, et le
   labour aurait rendu la case… toujours plantable. Rien n'aurait échoué. Ça
   aurait juste fait perdre à Greg trois trajets par arbre, en silence.
   ========================================================================== */

/* Les cases à verger autour de l'ancre, SERRÉES — un plant par case, sans
   allée. C'est le choix de Guillaume (« un plan par case libre, serré ») et il
   a une conséquence chiffrée : le plafond de 24 vergers du 398 est atteint
   dans un carré de 5×5 autour de lui, donc sous ses yeux, au lieu de s'étaler
   sur toute la ferme.
   ⚠️ Le test de plantabilité n'est PAS recopié ici : `orchardPlantable` est la
   même fonction que celle qu'utilise la pose du joueur. Sans quoi Greg
   viserait des cases que la pose refuse, marcherait jusqu'à elles, et n'y
   ferait rien — sans un mot. */
export function findFreeOrchardTiles(world, anchor, count) {
  const out = [], seen = new Set();
  for (let r = 0; r < 24 && out.length < count; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // seulement l'anneau
        const x = anchor.x + dx, y = anchor.y + dy;
        if (!inMap(x, y)) continue;
        const i = idx(x, y);
        if (seen.has(i)) continue;
        seen.add(i);
        if (orchardPlantable(world, i)) out.push(i);
      }
    }
  }
  return out.slice(0, count);
}

/* La pose par Greg. Le coût a déjà été prélevé sur l'or COMMUN au moment de
   l'ordre — comme les graines depuis le zip 291. Greg ne touche donc à
   `f.inv.saplings` de personne : un ordre lancé par un joueur ne peut pas
   vider la réserve d'un autre. Renvoie `false` quand la ferme est pleine ;
   c'est l'appelant qui le dit au joueur (voir updateGreg). */
export function gregPlantOrchard(world, i, kindIdx) {
  const spec = C.ORCHARDS[kindIdx | 0]; if (!spec) return false;
  if (!orchardPlantable(world, i)) return false;
  world.orchards = world.orchards || new Map();
  if (world.orchards.size >= C.ORCHARD_MAX) return false;
  world.objects[i] = C.O_ORCHARD;
  world.objHp.set(i, C.ORCHARD_HP);
  world.orchards.set(i, { k: kindIdx | 0, plantedAt: Date.now(), nextAt: 0, ripe: 0 });
  return true;
}

/* ⚠️ CE QU'ON MARQUE POUR L'ABATTAGE. Abattre est irréversible : un verger
   perdu, ce sont des heures de pousse et jusqu'à 1 400 or. La sélection au
   clic doit donc pouvoir refuser une case AVANT la validation, et refuser en
   particulier les ARBRES DE LA FORÊT — qui sont `O_TREE`, pas `O_ORCHARD` : on
   ne marque que ce qu'on a planté soi-même. */
export function isChoppableOrchard(world, i) {
  if (!(i >= 0 && i < C.MAP_W * C.MAP_H)) return false;
  return world.objects[i] === C.O_ORCHARD && !!(world.orchards && world.orchards.has(i));
}

/* L'abattage par Greg. Même forme de retour que `gregChop` (l'arbre ordinaire)
   pour que la file de tâches les traite pareil, et même destination du bois :
   le stock COMMUN, jamais le sac d'un joueur. Le `mult` est SuperGreg.
   ⚠️ On efface l'entrée de la Map, comme le fait la hache du joueur depuis le
   398 : une entrée orpheline ferait hériter la case suivante de l'âge et des
   fruits de l'ancien arbre — une fuite qu'on ne découvre qu'en replantant au
   même endroit, des semaines plus tard. */
export function gregChopOrchard(world, i, mult) {
  if (!isChoppableOrchard(world, i)) return { done: false, wood: 0 };
  const hp = (world.objHp.get(i) || 1) - Math.max(1, C.GREG_AXE_LVL * (mult || 1));
  if (hp > 0) { world.objHp.set(i, hp); return { done: false, wood: 0 }; }
  world.objects[i] = C.O_NONE;
  world.objHp.delete(i);
  world.orchards.delete(i);
  return { done: true, wood: C.ORCHARD_WOOD };
}

/* VENDRE. À l'unité, ou par BARQUETTE de six (demande de Guillaume). La prime
   de la barquette est dans les constantes, pas ici : c'est un réglage, pas une
   règle, et les réglages se lisent au même endroit que tous les autres. */
export function resolveSellFruit(f, shared, fruitId, punnet) {
  const spec = C.fruitSpec(fruitId); if (!spec) return { ok: false };
  f.inv = f.inv || {}; f.inv.fruits = f.inv.fruits || {};
  const have = f.inv.fruits[fruitId] | 0;
  const need = punnet ? C.PUNNET_SIZE : 1;
  if (have < need) return { ok: false, toast: punnet ? "punnetShort" : "actionFailed" };
  const gain = punnet ? C.punnetPrice(fruitId) : spec.sell;
  f.inv.fruits[fruitId] = have - need;
  shared.money += gain;
  shared.totalEarned = (shared.totalEarned || 0) + gain;
  return { ok: true, gain, n: need, punnet: !!punnet };
}

/* ============================================================================
   ZIP 398 — LES PRODUITS AUX FRUITS (confitures, yaourts, tarte au citron).
   ----------------------------------------------------------------------------
   UNE seule fonction pour les six recettes : elles ne diffèrent que par leurs
   ingrédients, et ces ingrédients sont des DONNÉES (`C.FRUIT_PRODUCTS`). Six
   fonctions presque identiques auraient divergé au premier réglage — c'est
   littéralement la leçon du zip 387, et elle vaut pour des recettes autant que
   pour des géométries.
   ========================================================================== */
export function fruitProductCost(p) {
  return { fruit: p.fruitN | 0, sugar: p.sugar | 0, milk: p.milk | 0, flour: p.flour | 0, egg: p.egg | 0 };
}
/* Combien de LAIT ce fermier a-t-il, toutes espèces confondues ? Et combien
   d'ŒUFS ? Deux fonctions plutôt que deux lectures en dur : `f.inv.products`
   est un tableau indexé par ANIMAL, et le lait vient de deux animaux. */
export function milkStock(f) {
  let n = 0;
  for (const a of C.ANIMAL_MILK) n += (f.inv.products && f.inv.products[a]) | 0;
  return n;
}
export function eggStock(f) { return (f.inv.products && f.inv.products[C.ANIMAL_EGG]) | 0; }
function takeMilk(f, n) {
  for (const a of C.ANIMAL_MILK) {
    const have = (f.inv.products[a] | 0);
    const take = Math.min(have, n);
    f.inv.products[a] = have - take; n -= take;
    if (n <= 0) return;
  }
}

export function resolveFruitProduct(f, shared, productId) {
  const p = C.fruitProduct(productId); if (!p) return { ok: false };
  f.inv = f.inv || {}; f.inv.fruits = f.inv.fruits || {}; f.inv.fruitProducts = f.inv.fruitProducts || {};
  const c = fruitProductCost(p);
  if ((f.inv.fruits[p.fruit] | 0) < c.fruit) return { ok: false, toast: "productNoFruit" };
  if (c.sugar && (shared.sugar | 0) < c.sugar) return { ok: false, toast: "productNoSugar" };
  if (c.flour && (shared.flour | 0) < c.flour) return { ok: false, toast: "productNoFlour" };
  /* ⚠️ LE LAIT ET LES ŒUFS VIENNENT DE `f.inv.products`, LE TABLEAU DES
     PRODUITS ANIMAUX. La première écriture lisait `f.inv.milk` / `f.inv.egg`,
     qui n'existent pas : les deux yaourts et la tarte étaient impossibles à
     préparer, quoi qu'on ait dans son étable. */
  if (c.milk && milkStock(f) < c.milk) return { ok: false, toast: "productNoMilk" };
  if (c.egg && eggStock(f) < c.egg) return { ok: false, toast: "productNoEgg" };
  f.inv.fruits[p.fruit] -= c.fruit;
  if (c.sugar) shared.sugar = (shared.sugar | 0) - c.sugar;
  if (c.flour) shared.flour = (shared.flour | 0) - c.flour;
  if (c.milk) takeMilk(f, c.milk);
  if (c.egg) f.inv.products[C.ANIMAL_EGG] = eggStock(f) - c.egg;
  f.inv.fruitProducts[p.id] = (f.inv.fruitProducts[p.id] | 0) + 1;
  return { ok: true, productId: p.id };
}
export function resolveSellFruitProduct(f, shared, productId) {
  const p = C.fruitProduct(productId); if (!p) return { ok: false };
  f.inv = f.inv || {}; f.inv.fruitProducts = f.inv.fruitProducts || {};
  if ((f.inv.fruitProducts[p.id] | 0) <= 0) return { ok: false };
  f.inv.fruitProducts[p.id] -= 1;
  shared.money += p.sell;
  shared.totalEarned = (shared.totalEarned || 0) + p.sell;
  return { ok: true, gain: p.sell };
}

/* ============================================================================
   ZIP 398 — NOMMER UN FAMILIER.
   ----------------------------------------------------------------------------
   « Il faut pouvoir nommer chaque animal de compagnie qu'on a. »

   ⚠️ LE NETTOYAGE EST FAIT ICI, PAS DANS LE CHAMP DE SAISIE. Un nom voyage par
   le réseau, s'affiche au-dessus de la tête du familier chez TOUS les joueurs,
   et se persiste. Une validation faite dans l'interface ne protège que celui
   qui la subit — c'est la leçon du zip 385 (« un garde-fou côté client ne
   protège pas un état qui compte »), et elle s'applique mot pour mot à un champ
   de texte partagé.

   On remplace les caractères de contrôle et les espaces exotiques (dont les
   retours à la ligne, qui casseraient l'étiquette dessinée au-dessus du
   familier), on réduit les blancs multiples, on tronque à `PET_NICK_MAX`. Un
   nom vide EFFACE le surnom et rend le familier à son nom d'espèce : c'est ce
   qu'attend quelqu'un qui vide le champ, et ça évite un second bouton. */
export function sanitizePetNick(raw) {
  let s = String(raw == null ? "" : raw);
  /* ⚠️ LES CARACTÈRES SONT ÉCHAPPÉS, PAS COLLÉS. Une classe de caractères
     contenant de VRAIS caractères de contrôle (dont un retour à la ligne)
     coupe le littéral d'expression régulière en deux : le fichier ne se
     charge plus du tout. Trouvé par tools/verify-orchards.mjs, qui importe
     le moteur — le navigateur, lui, l'aurait signalé à la première partie. */
  s = s.replace(/[\u0000-\u001f\u007f-\u009f\u00a0\u200b-\u200f\u2028\u2029\u3000]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, C.PET_NICK_MAX);
}
export function resolveRenamePet(f, index, raw) {
  f.pets = Array.isArray(f.pets) ? f.pets : [];
  const p = f.pets[index | 0];
  if (!p) return { ok: false };
  const nick = sanitizePetNick(raw);
  if (nick) p.nick = nick; else delete p.nick;
  return { ok: true, nick, petId: p.id };
}
/* Le libellé d'un familier : son surnom s'il en a un, sinon son espèce. UNE
   seule description, lue par le sac, par l'étiquette du monde et par les
   toasts — trois endroits qui auraient sinon écrit trois fois
   `p.nick || C.petName(...)`, et dont l'un aurait fini par oublier le repli. */
export function petLabel(p, en) {
  if (!p) return "";
  return (p.nick && String(p.nick)) || C.petName(p.id, en);
}
