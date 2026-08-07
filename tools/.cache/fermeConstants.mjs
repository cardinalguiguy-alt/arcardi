/* ==========================================================================
   FERME VALLÉE (jeu 22) — constantes partagées client/hôte.
   Portées telles quelles depuis la maquette validée (shared/constants.js du
   prototype autonome), en module ES pour ARCARDI. Aucune valeur de gameplay
   n'a été modifiée par rapport à la maquette.
   ========================================================================== */

// --- Carte ---
export const MAP_W = 180;   // largeur en tuiles
export const MAP_H = 140;   // hauteur en tuiles
export const TILE = 16;     // taille d'une tuile en px (avant zoom)

// Types de sol
export const G_GRASS = 0;
export const G_TILLED = 1;   // labouré (sec)
export const G_WATERED = 2;  // labouré + arrosé
export const G_WATER = 3;    // rivière
export const G_SAND = 4;     // berge
export const G_BRIDGE = 5;   // pont en bois
export const G_PATH = 6;     // chemin devant la maison (fixe, jamais retirable par un joueur)
export const G_PATH_STONE = 7; // chemin dallé posé/retiré par les joueurs (construction, coûte de la pierre) ;
                                // rendu visuellement IDENTIQUE au chemin fixe (même sprite), mais un type de
                                // sol distinct pour ne jamais pouvoir "miner" le chemin fixe de la maison/du puits.
export const G_BRIDGE_SITE = 8; // site de pont à construire (chantier 2026-07) : case de rivière/berge, aux 2
                                 // emplacements fixes de traversée, pas encore bâtie. Bloque le passage comme
                                 // G_WATER tant qu'elle n'est pas construite (voir blockedTile). Une fois payée
                                 // (bois OU pierre, voir BRIDGE_COST_WOOD/BRIDGE_COST_STONE), devient G_BRIDGE,
                                 // définitivement (pas de retrait, pour ne jamais piéger un joueur en pleine
                                 // rivière en retirant la case sous ses pieds).
export const G_BRIDGE_CLOSED = 9; // pont FERMÉ via le levier (chantier 2026-07, demande Guillaume : "les ponts
                                   // doivent pouvoir être refermés et ouverts à l'aide d'un levier", pensé pour
                                   // bloquer plus tard des ennemis/animaux dangereux sur la rive droite). Même
                                   // pont qu'un G_BRIDGE construit (le pont lui-même reste PERMANENT, jamais
                                   // retiré/remboursé) : seul cet état de passage bascule, G_BRIDGE <-> 
                                   // G_BRIDGE_CLOSED, via resolveAct cas "lever". Bloque le passage comme
                                   // G_WATER tant qu'il n'est pas rouvert (voir blockedTile).
export const G_GRASS_GROWING = 10; // herbe en train de repousser sur une case labourée (chantier 2026-07,
                                    // demande Guillaume : pouvoir "reverse to the original state of grass").
                                    // Posée avec l'outil Construction (variante "grass", herbe achetée à la
                                    // boutique, voir GRASS_COST), sur du sol G_TILLED uniquement. Même "modèle
                                    // Clash of Clans" que lampadaire/épouvantail (voir BUILD_TIMES.grass,
                                    // 5 secondes réelles) : redevient G_GRASS TOUT SEUL une fois le délai
                                    // écoulé (vérifié côté hôte à chaque tick, pas d'action du joueur requise,
                                    // voir FermeGame.js). Ne bloque pas le passage (comme G_TILLED). Définitif,
                                    // pas de retrait une fois planté.
export const G_BRIDGE_STONE = 11; // case de pont RÉNOVÉE en pierre (chantier 2026-07, demande Guillaume : le pont
                                   // bois, une fois entièrement construit, perd 2 cases aléatoires par nuit — voir
                                   // BRIDGE_DECAY_PER_NIGHT — "car il est en bois" ; la rénovation en pierre change
                                   // l'aspect ET rend la case résistante, elle n'est plus jamais tirée par la
                                   // dégradation nocturne). Posée case par case sur une case déjà en G_BRIDGE (ou
                                   // G_BRIDGE_CLOSED), PAS sur un chantier G_BRIDGE_SITE : contrairement à la
                                   // construction initiale, la rénovation améliore une structure bois déjà en
                                   // place plutôt que de la refaire de zéro (voir resolveAct cas "renovateBridge").
                                   // Ouverte/fermable au levier comme G_BRIDGE, voir G_BRIDGE_STONE_CLOSED.
export const G_BRIDGE_STONE_CLOSED = 12; // pont rénové en pierre, FERMÉ via le levier (même principe que
                                          // G_BRIDGE_CLOSED, mais pour une case déjà rénovée : le levier bascule
                                          // chaque case selon SON matériau propre, G_BRIDGE<->G_BRIDGE_CLOSED ou
                                          // G_BRIDGE_STONE<->G_BRIDGE_STONE_CLOSED, voir resolveAct cas "lever").
export const G_DARK_PASSAGE = 13; // "passage sombre" (chantier 2026-07, demande Guillaume) : case unique posée en
                                   // rive droite, près de la limite nord de la carte (voir generateWorld ->
                                   // world.darkPassage, position dépendant de la seed puisque calculée depuis
                                   // riverCenter, jamais un point fixe en dur). Marche dessus = déclenche le fondu
                                   // au noir + téléportation SOLO vers la carte maléfique (voir enterDarkPassage/
                                   // tryOpenNearby côté FermeGame.js). Rendu volontairement sombre (voir drawTile)
                                   // pour se distinguer du reste du décor.
export const G_RUN_GATE = 14;      // zip 372 : point de déclenchement du défi de fuite, bord EST des cartes du
                                   // passage sombre. Position fixe C.RUN_GATE, identique sur les cinq mondes.
                                   // ZIP 375 : ce n'est plus un coffre/brasier posé sur l'herbe mais une dalle
                                   // de la jetée, au-dessus du lac (voir G_RUN_JETTY).
                                   // ⚠ ZIP 378 — PLUS AUCUN RENDU PROPRE (décision Guillaume : « plus de porte
                                   // visible, mais l'effet reste le même, et localisé au même endroit »). La
                                   // case se dessine EXACTEMENT comme une dalle de chaussée : ni brasiers, ni
                                   // gravures, ni lueur. Le type reste distinct parce que c'est lui qui porte le
                                   // déclenchement (checkWalkOverPassage) — et le garder distinct plutôt que de
                                   // tester des coordonnées évite qu'un déplacement de la chaussée désaccorde
                                   // silencieusement le décor et la règle.
export const G_RUN_JETTY = 15;     // zip 375 : dalle de la jetée en pierres qui avance dans le lac violet de la
                                   // rive est, et depuis laquelle on lance le défi de fuite. C'est une
                                   // réduction 2D de la chaussée du jeu de fuite (dalles fissurées, bordures
                                   // moussues, torches), pour que le décor annonce le défi avant qu'il commence.
                                   // Sol PRATICABLE : blockedEvil ne bloque que G_WATER, donc une dalle posée
                                   // sur l'eau se traverse — c'est tout l'intérêt d'un identifiant distinct.
export const G_LAKE_SHORE = 16;    // zip 375 : berge du lac. Bande de galets moussus entre l'herbe et l'eau, sur
                                   // laquelle on marche normalement. Elle sert au FONDU demandé : sans elle, le
                                   // lac s'arrête sur une ligne franche de cases, et aucun dégradé de rendu ne
                                   // rattrape une silhouette en escalier.
export const G_RUN_KERB = 17;      // zip 378 : BORDURE de la chaussée. Les blocs bas façon sarcophage du défi 3D,
                                   // rangée extérieure de part et d'autre des trois voies praticables. Elle BLOQUE
                                   // (voir blockedEvil) — mais elle ne retire aucun passage au joueur : c'était de
                                   // l'eau avant, qui bloquait déjà. On ne change donc que ce qu'il VOIT, jamais où
                                   // il peut aller, et l'ancienne géométrie de l'embuscade reste valide mot pour mot.

export const G_TOWN_STAIR = 18;    // zip 425 : marche d'escalier de Valley Town. ⚠️ ELLE N'EXISTE QUE SUR LA CARTE
                                   // DE LA VILLE, qui est REGÉNÉRÉE à chaque visite et n'est jamais persistée — c'est
                                   // ce qui autorise à ajouter une valeur de sol sans aucune migration. Une nouvelle
                                   // valeur sur la carte de FERME, elle, obligerait à relire toutes les sauvegardes.
                                   // Son rôle est double : elle se DESSINE en marches, et elle AUTORISE le changement
                                   // de niveau (voir TOWN_STEP_MAX) — les deux vont ensemble, un escalier qu'on ne
                                   // voit pas est un mur invisible et un escalier qui ne monte pas est un décor.
export const G_TOWN_LAWN = 19;     // zip 425 : pelouse tondue des squares et parterres de la place centrale. Purement
                                   // visuelle (elle ne bloque pas), mais elle sépare le « jardin » du simple herbage
                                   // sauvage : sans elle, une place « soignée » n'a aucun moyen de le montrer.

// Objets
export const O_NONE = 0;
export const O_TREE = 1;
export const O_ROCK = 2;
export const O_HOUSE = 3;   // tuiles bloquées par la maison
export const O_SHOP = 4;    // étal de la boutique
export const O_BIN = 5;     // bac de vente
export const O_STUMP = 6;   // souche (reste d'arbre)
export const O_TREE2 = 7;   // variante d'arbre (pin)
export const O_WELL = 8;    // puits (bâtiment achetable, 2e point de téléport)
export const O_FENCE = 9;   // section de clôture, orientation automatique (voisinage)
export const O_FENCE_H = 10; // section de clôture, orientation FORCÉE horizontale (touche R)
export const O_FENCE_V = 11; // section de clôture, orientation FORCÉE verticale (touche R)
export const O_WALL = 12;    // mur en pierre, construit par les joueurs (bloque le passage, pas d'orientation)
export const O_LAMP = 13;    // lampadaire, achetable et posé par les joueurs (éclaire la nuit, bloque le passage)
export const O_SCARECROW = 14; // épouvantail, achetable et posé par les joueurs (chantier 2026-07, contre les oiseaux -
                                // pas encore implémentés ; ne bloque pas le passage, posé au milieu des cultures)
export const O_LEVER = 15;     // levier d'un pont (chantier 2026-07, demande Guillaume) : posé AUTOMATIQUEMENT sur
                                // la berge, côté maison, dès qu'une traversée de pont est ENTIÈREMENT construite
                                // (voir generateWorld pour l'emplacement réservé, resolveAct cas "bridge" pour la
                                // pose automatique). Cliquable directement (aucun outil à équiper, aucun coût),
                                // voir resolveAct cas "lever". Ne bloque PAS le passage lui-même (comme
                                // l'épouvantail) : seul le pont qu'il commande se ferme/s'ouvre.
export const O_MILL = 16;      // moulin (chantier 2026-07, demande Guillaume : "transformation artisanale",
                                // premier bâtiment de la famille four/fût/presse/moulin). Achetable/posable comme
                                // le lampadaire (voir MILL_COST/BUILD_TIMES.mill ci-dessous), bloque le passage une
                                // fois construit. Transforme en continu le blé déposé en sacs de farine, voir
                                // resolveAct cas "mill"/"millDeposit" et E.millTick (fermeEngine.js).
export const O_TREE_DEAD = 17; // arbre mort, sans feuilles (chantier 2026-07, demande Guillaume : ambiance de
                                // la carte maléfique) — réservé à generateEvilWorld, jamais posé côté ferme normale.
export const O_CAULDRON = 18;  // chaudron (chantier 2026-07, demande Guillaume : "le chaudron doit être récupéré
                                // dans le monde maléfique et ramené [...] on peut le placer où on veut sur la
                                // map [...] utilisable automatiquement"). Objet POSABLE côté ferme normale, même
                                // mécanique que O_MILL (outil Construction, variante "cauldron", chantier réel
                                // avant d'être fonctionnel, voir BUILD_TIMES.cauldron) — mais jamais achetable :
                                // il faut d'abord le ramasser sur la carte maléfique (voir EVIL_CAULDRON_SPAWN),
                                // une seule fois pour toute la ferme (voir s.cauldron, fermeEngine.js/FermeGame.js).
export const O_SUCRERIE = 19;  // sucrerie (chantier canne à sucre) — tile world.objects LEGACY (zips 317-324).
                                // Chantier "sucrerie déplaçable" (2026-07) : la sucrerie a rejoint le modèle
                                // des autres bâtiments d'artisans (C.ARTISAN_BUILDINGS.sucrerie / crafts.sucrerie),
                                // achetable/déplaçable comme la ruche/fromagerie/boulangerie/scierie — plus aucune
                                // NOUVELLE pose ne crée ce tile. Il ne sert plus qu'à retrouver/convertir une
                                // sucrerie posée par l'ANCIEN modèle sur une ferme sauvegardée avant ce chantier
                                // (voir E.clearGhostSucreries / E.migrateSucrerieToArtisan, fermeEngine.js, et
                                // C.SUCRERIE_LEGACY_SOLID_TILE, coordonnée figée de l'ancien tile solide unique).

// --- Cultures ---
// stages: 0=semis ... maxStage=récoltable ; growMs = durée RÉELLE (arrosée) pour
// mûrir, indépendante du cycle jour/nuit (voir zip 151, demande 2026-07 :
// "12h réelles pour la tomate"). navet 6h, patate 12h, tomate 12h, citrouille 18h
// (proportionnel aux anciens ratios de croissance 1/2/2/3). Prix et coûts inchangés.
const H = 60 * 60 * 1000; // 1 heure en ms, pour lisibilité des durées ci-dessous
const MIN = 60 * 1000; // 1 minute en ms, pour lisibilité des durées ci-dessous
export const CROPS = [
  { id: 0, name: "Navet",          nameEn: "Turnip",   seedName: "Graine de navet",       seedNameEn: "Turnip seeds",   growMs: 6 * H,  seedCost: 20, sell: 60,  color: "#e8d8f0", top: "#b46ee0" },
  { id: 1, name: "Pomme de terre", nameEn: "Potato",   seedName: "Graine de p. de terre", seedNameEn: "Potato seeds",   growMs: 12 * H, seedCost: 35, sell: 110, color: "#d9b380", top: "#c49a62" },
  { id: 2, name: "Tomate",         nameEn: "Tomato",   seedName: "Graine de tomate",      seedNameEn: "Tomato seeds",   growMs: 12 * H, seedCost: 50, sell: 170, color: "#e03e2e", top: "#c22b1c" },
  { id: 3, name: "Citrouille",     nameEn: "Pumpkin",  seedName: "Graine de citrouille",  seedNameEn: "Pumpkin seeds",  growMs: 18 * H, seedCost: 80, sell: 320, color: "#e8842a", top: "#cc6d14" },
  // Blé et maïs (demande Guillaume 2026-07) : pousse longue (2 jours réels),
  // même règle d'arrosage que les autres cultures (WATER_VALID_MS = 10h réelles,
  // déjà global à toutes les cultures, rien de spécifique à coder ici). Coût/prix
  // extrapolés en poursuivant la progression des cultures existantes (aucun
  // chiffre précis demandé au-delà du temps de pousse et de l'arrosage) —
  // à ajuster librement. Ajoutées SEULEMENT à la boutique : la liste CROPS
  // est entièrement pilotée par les données (boutique, inventaire, vente,
  // sprite), aucun autre fichier n'a besoin d'être modifié pour ces 2 entrées.
  { id: 4, name: "Blé",  nameEn: "Wheat", seedName: "Graine de blé",  seedNameEn: "Wheat seeds", growMs: 48 * H, seedCost: 120, sell: 480, color: "#e8d24a", top: "#c2a82a" },
  { id: 5, name: "Maïs", nameEn: "Corn",  seedName: "Graine de maïs", seedNameEn: "Corn seeds",  growMs: 48 * H, seedCost: 140, sell: 560, color: "#f0c93a", top: "#d9a91a" },
  // 2026-07 visitors update (zip 233): UNIQUE crop varieties, `unique: true`.
  // NEVER sold in the shop (the shop/Greg lists filter on this flag, and
  // resolveBuySeed refuses them): their seeds only arrive as visitor GIFTS
  // on "prep" orders (see spawnVisitor). Everything else (planting, growth,
  // sprites, selling at the bin) rides the existing data-driven pipeline.
  { id: 6, name: "Navet doré",    nameEn: "Golden turnip", seedName: "Graine de navet doré",    seedNameEn: "Golden turnip seeds", growMs: 6 * H,  seedCost: 0, sell: 260, color: "#f6d76a", top: "#e0b02a", unique: true },
  { id: 7, name: "Baie étoilée",  nameEn: "Star berry",    seedName: "Graine de baie étoilée",  seedNameEn: "Star berry seeds",    growMs: 12 * H, seedCost: 0, sell: 460, color: "#b48ef0", top: "#7a4ee0", unique: true },
  // Canne à sucre (chantier sucrerie) — extrapolée au-dessus du maïs.
  // Zip 341 (demande Guillaume : réduire un peu la durée de pousse) : 48h -> 36h.
  { id: 8, name: "Canne à sucre", nameEn: "Sugar cane", seedName: "Bouture de canne à sucre", seedNameEn: "Sugar cane cutting", growMs: 36 * H, seedCost: 160, sell: 620, color: "#7fae4a", top: "#4a7a2e" },
];
export const CROP_STAGES = 5; // 0..4, stage 4 = mûr
// Durée réelle pendant laquelle un arrosage reste valable : passé ce délai sans
// réarroser, la pousse se met en pause (elle reprend dès le prochain arrosage,
// sans perdre la progression déjà acquise).
export const WATER_VALID_MS = 10 * H;
// Indication visuelle d'humidité du sol (demande Guillaume 2026-07, remplace
// la goutte d'eau barrée) : la case arrosée reste au plus foncé pendant
// WATER_DARK_MS après l'arrosage, puis s'éclaircit progressivement jusqu'à
// retrouver sa teinte claire d'origine PILE au moment où l'arrosage expire
// (WATER_VALID_MS) — voir E.cropGrowState (champ `wetness`) et le rendu du
// sol dans FermeGame.js.
export const WATER_DARK_MS = 3 * H;
// Zip 287 (demande Guillaume : "pouvoir semer 5 graines par case, pour
// gagner de l'espace, une graine par case c'est beaucoup trop peu, ça
// étend le champ exponentiellement") : une case plantée garde maintenant un
// compteur `n` (1 à MAX_CROPS_PER_TILE, même TYPE de culture uniquement,
// voir resolveAct cas "plant"/"harvest", fermeEngine.js) — semer plusieurs
// fois sur la même case déjà plantée (même graine, tant que non mûre)
// l'incrémente au lieu d'exiger une case libre supplémentaire ; récolter
// rend n cultures d'un coup au lieu d'une seule. La pousse (durée, arrosage)
// reste UNE SEULE minuterie par case, partagée par tout ce qui y est semé —
// simplification volontaire (semer un complément en cours de pousse profite
// du temps déjà écoulé sur la case, pas de pousse séparée par graine).
// Valeur extrapolée depuis la demande ("5 graines par case").
export const MAX_CROPS_PER_TILE = 5;
// Zip 367 (demande Guillaume : "retirer l'indicateur du nombre de graines
// plantees -- les cinq carres jaunes ; il doit toujours exister mais etre plus
// discret, et ne s'afficher qu'au hover en local") : duree du fondu
// d'apparition des pips de graines, en ms. Ils ne sont plus dessines que sur la
// CASE VISEE (targetTile) et montent en opacite pendant PIP_FADE_MS tant que la
// meme case reste visee -- d'ou un survol qui revele l'info sans la faire
// clignoter quand on balaie le champ a la souris. Purement local et visuel :
// aucune incidence reseau (voir aussi PIP_ALPHA_* ci-dessous).
export const PIP_FADE_MS = 120;
// Opacites du zip 367, nettement adoucies par rapport au zip 292 (0.9 / 0.95 /
// 0.35) : l'indicateur ne se lit plus de loin sur tout le champ, il se lit de
// pres sur la seule case survolee.
export const PIP_ALPHA_FILLED = 0.55;  // graine presente, case pas encore pleine
export const PIP_ALPHA_FULL = 0.62;    // case pleine (teinte doree conservee)
export const PIP_ALPHA_EMPTY = 0.18;   // emplacement libre

// --- Gemmes rares (trouvées en cassant des rochers) ---
// Chance de tomber sur une gemme quand un rocher est détruit. Tirage pondéré :
// l'améthyste est commune, le diamant très rare. Vendues très cher au bac.
export const GEMS = [
  { id: 0, name: "Améthyste", nameEn: "Amethyst", sell: 200,  color: "#b46ee0", weight: 0.62 },
  { id: 1, name: "Émeraude",  nameEn: "Emerald",  sell: 500,  color: "#3fbf6a", weight: 0.30 },
  { id: 2, name: "Diamant",   nameEn: "Diamond",  sell: 1200, color: "#a8e8f4", weight: 0.08 },
];
export const GEM_DROP_CHANCE = 0.16; // proba de base qu'un rocher détruit lâche une gemme

// Abondance des gemmes selon la distance à la maison (demande Guillaume 2026-07) :
// "les ressources rares doivent être un peu plus abondantes quand on est très
// éloigné de la maison [...] et quasi jamais trouvable autour de la maison".
// GEM_DROP_CHANCE reste la base ; un multiplicateur est appliqué dessus selon
// la distance (en cases) au centre de la maison, interpolé linéairement entre
// les deux paliers ci-dessous puis appliqué à TOUT rocher cassé, où qu'il
// soit sur la carte (donc aussi bien sur la rive droite de la rivière que
// n'importe où ailleurs d'aussi loin de la maison — pas de règle spécifique
// à la rivière, juste une conséquence de la distance, comme demandé "par
// exemple"). Voir E.gemChanceAt(x,y) dans fermeEngine.js.
// Valeurs extrapolées (aucun chiffre précis demandé), à ajuster librement.
export const GEM_HOUSE_NEAR_RADIUS = 22; // en dessous (en cases) : gemmes quasi absentes
export const GEM_HOUSE_NEAR_MULT = 0.08; // multiplicateur appliqué à GEM_DROP_CHANCE tout près de la maison
export const GEM_HOUSE_FAR_RADIUS = 95;  // au-delà (en cases) : abondance maximale (plateau, ne monte plus)
export const GEM_HOUSE_FAR_MULT = 1.6;   // multiplicateur maximal, loin de la maison
// Zip 280 (bijouterie, demande Guillaume) : l'or est une ressource RARE
// trouvée en minant les rochers, comme les gemmes mais indépendamment (un
// rocher peut donc donner gemme ET or le même coup, ou ni l'un ni l'autre).
// Va dans le pool COMMUN gregStock.gold (même esprit que gregStock.stone),
// pas dans l'inventaire perso — cohérent avec gems/fish/animals déjà partagés.
// Zip 281 (demande Guillaume) : l'or n'est PAS réparti comme les gemmes
// (distance à la maison) — il ne se trouve QUE près de la rivière. Un
// rocher miné à GOLD_RIVER_RADIUS cases ou moins d'une case d'eau (G_WATER)
// a une chance GOLD_DROP_CHANCE de lâcher de l'or ; au-delà, aucune chance
// (0), quelle que soit la distance à la maison.
// Zip 282 (demande Guillaume : "toujours faire des pépites d'or quelque
// chose de rare") : 0.25 rendait l'or presque banal près de la rivière (1
// rocher sur 4). Ramené à 0.05 — plus rare que le diamant (la gemme la
// plus rare, poids 0.08 dans C.GEMS), cohérent avec le statut de ressource
// précieuse de l'or.
export const GOLD_DROP_CHANCE = 0.05;
// Zip 284 (demande Guillaume : "la proximité de la rivière pour les pépites
// d'or doit être plus large") : passé de 4 à 8 cases — deux fois plus de
// rochers autour de la rivière comptent désormais comme "près de l'eau"
// pour la chance d'or, sans toucher aux chances elles-mêmes (GOLD_DROP_CHANCE/
// GOLD_EXTREME_CHANCE inchangées).
export const GOLD_RIVER_RADIUS = 8; // en cases, autour du rocher miné
export const GOLD_PER_FIND = 1;
// Zip 283 (demande Guillaume) : chance montée à 12% aux extrémités NORD et
// SUD de la carte (bande de GOLD_EXTREME_BAND cases depuis le bord y=0 ou
// y=MAP_H-1), 5% ailleurs — toujours conditionné à la proximité de la
// rivière (GOLD_RIVER_RADIUS), ce boost ne s'applique jamais loin de l'eau.
export const GOLD_EXTREME_CHANCE = 0.12;
export const GOLD_EXTREME_BAND = 20; // en cases, depuis le haut/bas de la carte

// Zip 284 (demande Guillaume : "plus de cailloux autour de la rivière, au
// nord et sud de la map, qui respawn tous les jours quand l'utilisateur ne
// regarde pas") : à chaque passage de jour (newDay, fermeEngine.js — déjà le
// point où repousse un peu de nature loin du spawn), on ajoute EN PLUS des
// rochers tirés spécifiquement près des berges, dans les mêmes bandes
// nord/sud que le bonus d'or ci-dessus (GOLD_EXTREME_BAND), pour nourrir le
// filon d'or élargi (GOLD_RIVER_RADIUS) en nouveaux rochers à miner. Valeurs
// extrapolées (aucun chiffre précis demandé), à ajuster librement.
export const RIVER_STONE_RESPAWN_PER_DAY = 10; // nombre de rochers ajoutés par jour, près de la rivière, nord+sud confondus
export const RIVER_STONE_RESPAWN_RADIUS = 6;   // en cases, distance max au centre de la rivière (riverCenterAt) pour ce respawn ciblé

// --- Poissons (pêche à la rivière) ---
// Se mangent (rendent de l'énergie) OU se revendent au bac. Tirage pondéré.
export const FISH = [
  { id: 0, name: "Gardon",  nameEn: "Roach",  sell: 30,  energy: 20, color: "#9fb4c4", weight: 0.58 },
  { id: 1, name: "Truite",  nameEn: "Trout",  sell: 80,  energy: 30, color: "#d98a5a", weight: 0.34 },
  { id: 2, name: "Brochet", nameEn: "Pike",   sell: 180, energy: 45, color: "#6a8f5a", weight: 0.08 },
];

// --- Outils ---
export const TOOLS = ["hoe", "can", "axe", "pick"];
export const TOOL_NAMES = { hoe: "Houe", can: "Arrosoir", axe: "Hache", pick: "Pioche" };
export const TOOL_NAMES_EN = { hoe: "Hoe", can: "Watering can", axe: "Axe", pick: "Pickaxe" };
export const TOOL_MAX_LEVEL = 3;
export const TOOL_UPGRADE_COST = [0, 500, 2000]; // coût pour passer au niveau 2, puis 3
// Bonus de RESSOURCES récoltées (pas seulement la vitesse déjà existante via
// f.tools[key] utilisé comme dégâts/coup) : chaque niveau de hache/pioche au
// dessus de 1 multiplie le bois/la pierre obtenus par ×1.5 (demande Guillaume
// 2026-07 : "1,5x plus par niveau"). Niveau 1 = base inchangée, niveau 2 = ×1.5,
// niveau 3 = ×1.5² (×2.25). Arrondi à l'entier le plus proche au moment de la
// récolte (voir `toolYield()` dans fermeEngine.js).
export const TOOL_YIELD_MULT = 1.5;

// Énergie
export const MAX_ENERGY = 100;
export const ENERGY_COST = { till: 2, water: 1, chop: 3, mine: 3, harvest: 0, plant: 0, fish: 1 };

// --- Quêtes de découverte (checklist guidée) ---
// Chaque quête se valide la PREMIÈRE fois que le joueur réussit l'action
// correspondante, et crédite la caisse commune. `act` = valeur de l'action
// (ou "sell") détectée côté hôte. Ordre = ordre d'affichage/apprentissage.
export const QUESTS = [
  { id: "till",  reward: 40 },
  { id: "plant", reward: 40 },
  { id: "water", reward: 40 },
  { id: "chop",  reward: 50 },
  { id: "mine",  reward: 50 },
  { id: "fish",  reward: 60 },
  { id: "sell",  reward: 80 },
];
export const FOOD_COST = 10;    // prix du casse-croûte (10 or, demande 2026-07 : réduit depuis 50)
export const FOOD_ENERGY = 40;  // énergie rendue

// --- Dormir dans la maison (chantier 2026-07, demandé par Guillaume) ---
// Le fermier s'approche de la porte de la maison et appuie sur E (même
// mécanisme que boutique/bac/grange, voir tryOpenNearby dans FermeGame.js)
// pour entrer dormir. Aucune animation d'entrée : il disparaît simplement de
// la carte, des "Zzz" s'échappent des fenêtres de la maison (visibles de
// tous les joueurs, pas seulement du dormeur) et son énergie remonte
// PROGRESSIVEMENT jusqu'au plein, pile au bout de SLEEP_MS. Il peut aussi
// ressortir plus tôt en rappuyant sur E, en gardant l'énergie déjà regagnée
// à cet instant (voir resolveSleepStart/resolveSleepEnd, fermeEngine.js).
export const SLEEP_MS = 60 * 1000; // durée du sommeil (60 secondes réelles)
// Porte de la maison : juste sous le seuil visible sur le sprite (house(),
// fermeArt.js — porte dessinée à 42-56px sur les 96px du canevas). Portée
// d'interaction : même nearTile() que boutique/bac/grange.
export const HOUSE_DOOR = { x: 43, y: 35 };

// Ressources
export const WOOD_SELL = 5;
export const STONE_SELL = 4;
export const TREE_HP = 5;
export const ROCK_HP = 3;
export const TREE_WOOD = 6;  // bois par arbre
export const ROCK_STONE = 4; // pierres par rocher

// Rochers du monde maléfique (chantier 2026-07, demande Guillaume : "les
// roches là-bas (plus pointues) contiennent de la pierre mais aussi des
// minerais magiques qui serviront d'ingrédients pour des concoctions
// futures, à ramener au chaudron") : mêmes C.O_ROCK/C.ROCK_HP que la ferme
// (réutilisés tels quels dans generateEvilWorld), seul le RENDU diffère
// (variante "pointue"/améthyste, voir fermeArt.js) et le MINAGE rapporte en
// plus une chance de minerai magique, en sus de la pierre habituelle.
export const EVIL_ORE_CHANCE = 0.35;  // probabilité de minerai à chaque rocher épuisé
export const EVIL_ORE_YIELD = [1, 2]; // quantité min/max de minerai par trouvaille
export const EVIL_ROCK_HP = ROCK_HP * 5; // rochers maléfiques : 5x plus résistants à la pioche que ceux de la ferme (demande Guillaume)

// --- Temps ---
export const DAY_REAL_MS = 16 * 60 * 1000; // un jour = 16 minutes réelles (temps ingame 2x plus lent, demande 2026-07)
export const DAY_START_MIN = 6 * 60;      // 6h00
export const DAY_END_MIN = 26 * 60;       // 2h00 le lendemain
export const START_MONEY = 500;

// --- Réseau / jeu ---
export const MAX_PLAYERS = 8;
export const PLAYER_SPEED = 5.2; // tuiles/seconde
// Zip 247 (demande Guillaume : "fix the walking speed in the valley town, it
// should be faster") : Valley Town est une grande carte de rues longues et on
// n'y a ni cheval ni raccourci — on marche donc sensiblement plus vite qu'à la
// ferme. Multiplicateur appliqué dans updateMeTown (FermeGame.js) uniquement,
// la vitesse de la ferme n'est pas touchée.
export const TOWN_SPEED_MULT = 1.45;
export const POS_TICK_HZ = 8;        // FIX 243: 12 -> 8 Hz (economie position ; extrapolation cote rendu compense le ressenti)
export const AOI_MARGIN_TILES = 8;   // FIX 242 (AOI): marge (tuiles) autour du viewport — pré-charge entités/joueurs juste avant qu'ils entrent à l'écran
// Zip 365 (800 -> 2000) : en marche continue, le keep-alive n'est plus qu'un
// filet ANTI-DÉRIVE. Tant que la vitesse était DEVINÉE à l'arrivée, il fallait
// la re-corriger souvent (elle était fausse dès qu'il y avait de la gigue) ;
// maintenant qu'elle est TRANSMISE (pubMe.vx/vy), la trajectoire rejouée est
// exacte et ne dérive que du glissement le long des obstacles. Deux secondes
// suffisent donc largement, et un changement de direction ou un arrêt part
// toujours immédiatement (émission par intention, voir maybeSendPos).
// Effet : le trafic de position en marche droite passe de 1,25 à 0,5 msg/s
// par joueur, AVEC un rendu meilleur — pas au prix du rendu.
export const POS_KEEPALIVE_MS = 2000;
// Zip 247 : plafond de la vitesse ESTIMÉE d'un joueur distant (extrapolation,
// voir le handler "pos"). L'ancienne valeur codée en dur (1.6) était déjà
// INFÉRIEURE à la vitesse à cheval (HORSE_SPEED_MULT = 1.9) et le reste à
// celle de Valley Town avec bonbon (1.45 * 1.5 = 2.175) : les joueurs
// distants rapides traînaient donc visuellement derrière leur vraie position.
export const POS_EXTRAP_SPEED_CAP = 2.4;
// Zip 365 (900 -> 3000) : ce plafond ne s'applique PLUS qu'au mode de secours
// d'advanceRemote (tampon vidé). Il doit couvrir le keep-alive (2000) plus la
// latence et la gigue de la liaison — l'ancienne marge de 100 ms au-dessus du
// keep-alive était le mécanisme exact de la saccade : l'écart se mesurant
// entre ARRIVÉES, la moindre gigue faisait saturer l'extrapolation, figeant le
// personnage jusqu'au paquet suivant. Le prolongement est désormais sûr sur
// cette durée parce que la vitesse est reçue, non estimée.
export const POS_EXTRAP_MAX_MS = 3000;
// Zip 365 — tampon de rendu adaptatif des joueurs distants (voir
// advanceRemote/remoteBufferMs). Le plancher garantit qu'il y a toujours de
// quoi interpoler entre deux paquets ; le plafond borne le retard d'affichage
// même sur une liaison très dégradée. Entre deux joueurs proches, la gigue
// mesurée est faible et le tampon reste au plancher : imperceptible.
export const POS_JITTER_MIN_MS = 30;
export const POS_JITTER_MAX_MS = 260;
export const POS_BUF_MAX_SAMPLES = 12; // ~24 s d'historique au keep-alive de 2 s : très au-delà du nécessaire, coût mémoire nul
export const POS_FAR_HZ = 1;         // FIX 242 (AOI) — zip 264: 1.5 -> 1 Hz. Quand aucun autre joueur n'est à portée de vue, la position ne sert qu'à la minimap : 1 Hz suffit largement (aucun rendu du perso à l'écran). Économie directe sur les longues traversées solo-dans-le-groupe.   // fréquence de diffusion des positions (broadcast)
export const ACT_RANGE = 1.8;    // portée d'action en tuiles

// Couleurs de tenue attribuées aux joueurs (par ordre d'arrivée)
export const OUTFITS = [
  { shirt: "#3f7fd4", pants: "#454f66" }, { shirt: "#d44a3f", pants: "#5a4632" },
  { shirt: "#3fa653", pants: "#3d3d55" }, { shirt: "#c9a227", pants: "#4a3b2a" },
  { shirt: "#8a4fd4", pants: "#3a4a5a" }, { shirt: "#d46a9f", pants: "#444444" },
  { shirt: "#2ab5b5", pants: "#54442f" }, { shirt: "#d47f2a", pants: "#3f5147" },
];

// Repères fixes du monde (identiques à la maquette / futur match_start).
export const HOUSE = { x: 40, y: 30, w: 6, h: 5 };
export const SHOP = { x: 49, y: 33 };
export const BIN = { x: 52, y: 33 };
export const SPAWN = { x: 43, y: 37 }; // chemin devant la maison (cible du téléport)

// --- Bâtiments / déplacements ---
// Plusieurs chevaux achetables (demande 2026-07, Guillaume) : coût croissant
// à chaque cheval supplémentaire, jusqu'à HORSE_MAX_COUNT. `HORSE_COSTS[n]`
// = prix du (n+1)-ième cheval (index 0 = premier cheval, inchangé à 800 or).
// Valeurs au-delà du premier extrapolées (aucun chiffre précis demandé par
// Guillaume, cohérent avec la nuance de méthode déjà suivie ailleurs dans
// Ferme Vallée, ex. paliers de la grange) : à ajuster librement.
export const HORSE_COSTS = [800, 1500, 2500];
export const HORSE_MAX_COUNT = HORSE_COSTS.length;
export const HORSE_SPEED_MULT = 1.9; // vitesse à cheval
// Traversée de la rivière à cheval (chantier 2026-07, demande Guillaume :
// "on doit pouvoir traverser la rivière à cheval, mais le cheval ralentit
// par 4 quand il est sur de l'eau") — s'applique au cheval monté ET aux
// chevaux sifflés qui accourent (updateWhistledHorses), voir aussi
// blockedTileMounted (fermeEngine.js).
export const HORSE_WATER_SLOW = 4;         // diviseur de vitesse à la nage
// Noyade (décision Guillaume 2026-07) : descendre du cheval en pleine eau =
// le fermier coule, est ramené chez lui (C.SPAWN) avec une blessure COURTE
// d'une minute (INJURED_MS = morsure de loup, EVIL_INJURED_MS = créature).
export const DROWN_INJURED_MS = 60 * 1000;
// Anti-blocage loups/lapins (chantier 2026-07, demande Guillaume : "ils ne
// doivent pas être coincés trop longtemps par la rivière ou des
// obstacles") : au bout de CRITTER_STUCK_S secondes sans progresser, la
// bête prend un cap de contournement perpendiculaire pendant
// CRITTER_DETOUR_MS avant de reprendre sa cible.
export const CRITTER_STUCK_S = 2.5;
export const CRITTER_DETOUR_MS = 1200;
export const MOUNT_RANGE = 1.6;      // distance pour enfourcher le cheval
// Maison à NIVEAUX (validation Guillaume 2026-07, maquettes approuvées) :
// niveau 1 = maison actuelle, niveau 2 = colombages/chaume/soubassement
// pierre (maquette A), niveau 3 = pierre/tuiles rouges/auvent (maquette B).
// Chaque palier coûte or + bois + pierre pour LANCER les travaux (payés
// d'un coup : or sur la caisse commune, bois/pierre sur l'inventaire du
// demandeur), puis l'amélioration dure un temps RÉEL : 2 h pour le niveau
// 2, 5 h pour le niveau 3 (durées demandées par Guillaume). Montants
// extrapolés (aucun chiffre demandé à part les durées), calibrés nettement
// sous la grange (BARN_LEVELS) pour rester un objectif de mi-parcours — à
// ajuster librement. HOUSE_LEVELS[n] = palier VERS le niveau n+2.
export const HOUSE_LEVELS = [
  { level: 2, cost: { money: 3000, wood: 120, stone: 80 }, durationMs: 2 * 3600 * 1000 },
  { level: 3, cost: { money: 8000, wood: 200, stone: 160 }, durationMs: 5 * 3600 * 1000 },
];
export const HOUSE_MAX_LEVEL = 3;
export const WELL_COST = 600;
export const WELL = { x: 30, y: 62 }; // emplacement du puits (champs à l'ouest)
export const WELL_SPAWN = { x: 30, y: 64 }; // cible du téléport puits (dégagée à l'achat)

// --- Passage sombre / carte maléfique (chantier 2026-07, demande Guillaume :
// "ajoute seulement un passage sombre rive droite à la limite de la map. quand
// un joueur l'empruntera, cela affichera pour lui un écran noir en fondu
// enchainé et l'emmenera lui seul sur la nouvelle map maléfique. le bouton
// home ne fonctionnera pas sur la nouvelle map, mais il pourra revenir s'il
// retrouve l'entrée") ---
// La position du passage lui-même (world.darkPassage) N'EST PAS ici : elle
// dépend de riverCenter donc de la seed de CETTE partie (calculée dans
// generateWorld, jamais un point fixe en dur, voir G_DARK_PASSAGE). Ce qui
// suit est fixe, propre à la carte maléfique elle-même (indépendante de la
// ferme, générée localement, voir generateEvilWorld) :
export const EVIL_MAP_W = 70;
export const EVIL_MAP_H = 70;
export const EVIL_SPAWN = { x: 35, y: 66 }; // arrivée du joueur, près du bord sud de la carte maléfique
// Passage retour : PAS annoncé au joueur (ni surligné, ni sur la mini-carte) —
// "il pourra revenir s'il retrouve l'entrée" implique qu'il doit l'explorer et
// la repérer lui-même. Position fixe (indépendante de la seed de la ferme :
// une seule carte maléfique, partagée par toutes les parties) mais choisie à
// bonne distance du point d'arrivée pour qu'elle ne saute pas aux yeux tout de
// suite.
export const EVIL_RETURN_PASSAGE = { x: 12, y: 8 };
export const ZONE_FADE_MS = 900; // durée d'une moitié de fondu (aller au noir OU revenir), écran noir tenu entre les deux

/* ==========================================================================
   Zip 372 : PORTE DU DÉFI DE FUITE (endless runner 3D), bord EST.
   --------------------------------------------------------------------------
   Le passage sombre ne mène pas à UNE carte mais à cinq (PASSAGE_WORLDS, une
   par semaine de jeu), dont un labyrinthe qui pose des haies sur toute la
   surface. Une porte posée « quelque part à l'est » serait donc accessible
   certaines semaines et murée d'autres.

   D'où RUN_GATE, un point FIXE, plus un couloir DÉGAGÉ DE FORCE entre
   l'arrivée (EVIL_SPAWN, bord sud) et cette porte, creusé après la génération
   dans les deux générateurs. C'est exactement ce que fait déjà
   generatePassageWorld pour garantir l'accès au centre du labyrinthe : on
   reprend le motif existant plutôt que d'en inventer un.

   Le couloir est volontairement LARGE (RUN_CORRIDOR_HALF de part et d'autre) :
   à 1 case, un joueur qui longe le bord se retrouve coincé entre deux troncs,
   et la « garantie » n'en est plus une en pratique.
   ========================================================================== */
export const RUN_GATE_CLEAR = 2;            // rayon de la place dégagée autour de la base de la jetée
export const RUN_CORRIDOR_HALF = 1;         // demi-largeur du couloir garanti (1 => 3 cases de large)

/* ==========================================================================
   Zip 375 : RIVE EST, JETÉE EN PIERRES ET EMBUSCADE.
   --------------------------------------------------------------------------
   Demande de Guillaume : « une rive de lac violet bien soignée sur la partie
   droite de la map dark world avec fondu pour évoquer l'univers du jeu de
   fuite », et l'ouverture du défi qui ne se fait plus en approchant le coffre
   mais en s'avançant sur une jetée en pierres.

   TROIS RAISONS DE FAIRE ÇA PLUTÔT QUE DE REDÉCORER LA PORTE :

   1. Le défi de fuite se joue sur une chaussée de pierre AU-DESSUS d'un lac
      violet (voir public/templerun/js/world.js). Poser la même chaussée, en
      réduction, à l'endroit d'où on le lance, c'est raccorder les deux
      univers par le décor au lieu de le faire par un menu.
   2. Un bord de carte est un endroit sans intérêt : de l'herbe, puis le vide.
      Une rive donne une fin au monde.
   3. Une jetée ne va nulle part. On s'y avance, on est acculé — ce qui rend
      l'embuscade des loups lisible sans un mot d'explication.

   GÉOMÉTRIE, tout est dérivé de EAST_LAKE_X pour qu'un seul nombre suffise à
   déplacer l'ensemble. La chaussée avance vers l'EST depuis la dernière bande
   de terre.

   ⚠ ZIP 378 — CE N'EST PLUS UNE JETÉE, C'EST UNE CHAUSSÉE. Retour de
   Guillaume sur capture d'écran : « elle doit aller jusqu'au bord droit de
   l'écran, pas s'arrêter comme ça, et l'eau violette ne doit pas la
   contourner, la plateforme est par-dessus l'eau ».

   Les trois défauts étaient distincts et il fallait les traiter séparément :

     1. elle S'ARRÊTAIT quatre dalles après la berge, ce qui la faisait lire
        comme un ponton inachevé posé au milieu d'un lac. Elle court désormais
        jusqu'au bord EST de la carte et sort du cadre — ce qui raconte la
        bonne chose : le défi 3D est la SUITE de cette route ;
     2. l'eau la CONTOURNAIT : les dalles remplaçaient le lac au lieu d'être
        posées dessus, et il n'y avait ni ombre portée ni épaisseur. C'est le
        rendu qui traite ça (drawRunDeckTile, fermeArt.js) ;
     3. elle n'avait que trois cases de large, sans les blocs bas qui bordent
        la chaussée en 3D. La rangée de BORDURE (G_RUN_KERB) les apporte.

   Les noms RUN_JETTY_* sont conservés : tout le code existant les emploie, et
   les renommer aurait touché sept fichiers pour un gain nul.
   ========================================================================== */
export const EAST_LAKE_X = 57;        // colonne moyenne de la rive ; à l'est, c'est le lac
export const EAST_LAKE_WOBBLE = 3.2;  // amplitude du découpage irrégulier de la rive
export const LAKE_SHORE_BAND = 2;     // épaisseur, en cases, de la berge de galets (le « fondu »)

export const RUN_JETTY_BASE = { x: EAST_LAKE_X, y: 34 }; // dernière case de TERRE, pied de la chaussée
export const RUN_JETTY_HALF_W = 1;    // demi-largeur PRATICABLE : 1 => 3 cases, comme les 3 voies du défi
export const RUN_KERB_HALF_W = 2;     // demi-largeur TOTALE : 2 => 5 cases, dont 2 de bordure. Proportion du défi 3D
                                      // (3 voies de 2,6 dans une dalle de 8,4, bordée de blocs bas).
// Zip 378 : la chaussée court jusqu'au bord EST de la carte. Dérivé de
// EVIL_MAP_W et non écrit en dur — les six mondes du passage font tous 70×70,
// mais c'est une propriété de la carte, pas de la chaussée.
export const RUN_DECK_END_X = EVIL_MAP_W - 1;
export const RUN_JETTY_LEN = RUN_DECK_END_X - RUN_JETTY_BASE.x;  // longueur réelle, en dalles

/* Point de DÉCLENCHEMENT du défi. Il garde exactement la place qu'il avait
   quand la jetée s'arrêtait là (quatre dalles après la berge) — décision
   Guillaume : « plus de porte visible, mais l'effet reste le même, et
   localisé au même endroit ». Ce n'est donc plus le bout de quoi que ce soit,
   d'où la constante dédiée plutôt qu'une expression dérivée de la longueur :
   allonger la chaussée ne doit plus déplacer le déclenchement.

   Le nom RUN_GATE est conservé : checkWalkOverPassage, carveRunCorridor,
   ambushCineSpot et verify-gate.mjs le nomment tous. */
export const RUN_GATE_OFFSET = 4;
export const RUN_GATE = { x: RUN_JETTY_BASE.x + RUN_GATE_OFFSET, y: RUN_JETTY_BASE.y };

/* --- Embuscade des darkwolves (cinématique + affrontement) ---------------
   Entièrement LOCALE : aucun de ces loups n'existe pour les autres joueurs,
   et l'ensemble ne coûte pas un message réseau. C'est le motif déjà retenu
   pour les lapins (366), l'animation du cheptel (369) et le défi lui-même
   (372) : ce qui est individuel et n'a pas d'effet sur le monde partagé se
   simule chez le client, point.

   La séquence : le joueur atteint le bout de la jetée -> contrôle coupé ->
   les loups surgissent de la berge et accélèrent -> fondu -> menu du défi.
   S'il ressort du menu sans courir, ils sont TOUJOURS là et deviennent
   hostiles (décision Guillaume). */
export const RUN_AMBUSH_COUNT = 3;
export const RUN_AMBUSH_MS = 2000;        // durée de la cinématique avant le fondu
export const RUN_AMBUSH_FADE_MS = 550;    // fondu au noir enchaîné à la fin de la cinématique
export const RUN_AMBUSH_START_DIST = 9;   // distance, en cases, à laquelle les loups surgissent
export const RUN_AMBUSH_END_DIST = 1.6;   // distance atteinte au moment du fondu (assez près pour inquiéter)
export const RUN_AMBUSH_SPEED = 2.6;      // vitesse de poursuite APRÈS la cinématique (tuiles/s)
                                          // volontairement supérieure à EVIL_MONSTER_SPEED (1.5) : ces
                                          // trois-là ont déjà couru, et le joueur doit sentir qu'il est
                                          // sur une jetée sans issue
export const RUN_AMBUSH_CATCH_RADIUS = 0.7;  // même contact que les créatures maléfiques
export const RUN_AMBUSH_FLEE_MS = 7000;      // durée de fuite d'un loup dont on a gagné la morsure
export const RUN_AMBUSH_DESPAWN_DIST = 22;   // au-delà, le joueur a semé l'embuscade : elle s'efface

// Blessure infligée par une DÉFAITE au défi (décision Guillaume) : 10 minutes,
// nettement moins que la créature maléfique (EVIL_INJURED_MS = 30 min) parce
// qu'on doit pouvoir retenter le défi dans la même soirée. Constante dédiée
// plutôt que réutilisation : les deux évolueront séparément.
export const RUN_INJURED_MS = 10 * 60 * 1000;

// Abandonner depuis l'écran-titre du défi est gratuit ; abandonner une course
// DÉJÀ COMMENCÉE compte comme une défaite. Sans ça, il suffirait de quitter
// une demi-seconde avant de se faire rattraper pour ne jamais être blessé.
export const RUN_ABORT_COUNTS_AS_LOSS = true;

// Plafonds de confiance appliqués CÔTÉ HÔTE au résultat renvoyé par le défi
// (req "runFailed"). La course se déroule entièrement chez le client, donc ces
// nombres arrivent d'une page qu'on ne contrôle pas. Ils ne rendent pas la
// triche impossible — ils empêchent un message aberrant d'injecter n'importe
// quoi dans une sauvegarde partagée et durable. Calibrés bien au-dessus d'une
// très bonne course (≈ 140 bonbons et ≈ 6 500 points sur 3 minutes en
// simulation) pour ne jamais punir un bon joueur.
// Zip 377 — BIFURCATION OFFROAD. Durée du voile qui s'efface au retour du
// défi par la sortie honnête. Le défi finit sur un écran noir après son propre
// fondu de 1,2 s (ESCAPE_FADE_MS, public/templerun/js/config.js) ; ce voile-ci
// reprend le relais côté ferme pour que le raccord soit un enchaînement et non
// une coupe. Plus court que ZONE_FADE_MS : on ne change pas de zone, on
// rouvre les yeux sur celle où l'on était déjà.
export const RUN_RETURN_FADE_MS = 700;
export const RUN_MAX_CANDIES_PER_RUN = 2000;
export const RUN_MAX_SCORE = 200000;

// Créatures maléfiques (chantier 2026-07, demande Guillaume : "des monstres
// qui pourchassent le joueur, lents, mais qui l'assomment et le renvoient
// chez lui blessé au contact") : simulées côté client uniquement (aucun
// hôte pour la carte maléfique), voir generateEvilWorld/updateEvilMonsters.
export const EVIL_MONSTER_COUNT = 9;         // nombre de créatures sur la carte
export const EVIL_MONSTER_SPEED = 1.5;       // tuiles/seconde — nettement plus lent que le joueur (PLAYER_SPEED = 5.2)
export const EVIL_MONSTER_DETECT_RADIUS = 9; // distance à partir de laquelle une créature endormie se met à suivre le joueur
export const EVIL_MONSTER_CATCH_RADIUS = 0.7; // distance de contact (dans un sens comme dans l'autre) déclenchant l'attrapage
export const EVIL_MONSTER_MIN_SPAWN_DIST = 10; // distance minimale au point d'arrivée pour la génération d'une créature
export const EVIL_INJURED_MS = 30 * 60 * 1000; // 30 minutes : durée de la blessure infligée par une créature (distincte de INJURED_MS, la morsure de loup)
// Mini-jeu de morsure des créatures maléfiques (chantier 2026-07, demande
// Guillaume : "ajoute un minijeu pour résister à la morsure") : au contact,
// la créature s'arrête et un mini-jeu de martelage (EvilBiteMinigame, même
// mécanique que WolfBiteMinigame côté ferme normale) s'ouvre avant que
// caughtByMonster() ne soit appliqué — réussi, la créature fuit au lieu de
// blesser le joueur.
export const EVIL_BITE_REACT_MS = 2800;       // durée du mini-jeu de riposte — même valeur que WOLF_BITE_REACT_MS, à ajuster séparément si besoin
export const EVIL_MONSTER_FLEE_MS = 6000;
// Mise à mort d'une créature (chantier 2026-07, demande Guillaume : "un moyen
// de tuer les loups et les ennemis après trois victoires au mini-jeu"). Le
// compteur est PAR JOUEUR et PAR CRÉATURE (stocké dans mo.biteWins[playerId],
// côté hôte comme le reste de la simulation) : à la EVIL_MONSTER_KILL_WINS-ième
// victoire d'un même joueur contre CETTE créature, elle meurt au lieu de fuir.
// EVIL_MONSTER_BITE_GRACE_MS = fenêtre garantie sans re-morsure de la même
// créature sur ce joueur après CHAQUE victoire (adoucit les 2 premières, casse
// la boucle instantanée). EVIL_MONSTER_DEATH_ANIM_MS = durée de l'animation de
// mort (fondu + effondrement) avant le despawn.
export const EVIL_MONSTER_KILL_WINS = 3;
export const EVIL_MONSTER_BITE_GRACE_MS = 3500;
export const EVIL_MONSTER_DEATH_ANIM_MS = 900;
// Soin d'une blessure de créature maléfique (décision Guillaume 2026-07) :
// chaque pansement retire un TIERS de la blessure de 30 min : il en faut
// donc jusqu'à 3 (appliqués par un ou plusieurs coéquipiers) pour sauver
// complètement le blessé.
export const EVIL_HEAL_STEP_MS = EVIL_INJURED_MS / 3;     // durée pendant laquelle une créature repoussée fuit le joueur avant de pouvoir rechasser

// Pommade de protection (chantier 2026-07, demande Guillaume : un objet
// achetable au magasin pour repousser les créatures maléfiques ou en être
// immunisé pendant 10 minutes, pour pouvoir explorer/farm côté maléfique
// sans craindre le contact). Effet purement local (comme le reste de la
// carte maléfique, voir generateEvilWorld) : consommée à l'usage, elle fait
// fuir toute créature qui aurait autrement repéré/rattrapé le joueur pendant
// sa durée, plutôt que de simplement ignorer le contact (repousser ET
// immuniser, conformément à la demande).
// Pommade de protection : recette de fabrication (chantier 2026-07, demande
// Guillaume : "n'est plus disponible depuis la boutique, mais requiert
// désormais un mélange [...] d'amétyste et de poissons [...] : 1 amétyste, 2
// trouts et 1 pike pour une pommade"). L'améthyste est prélevée directement
// dans la réserve COMMUNE de gemmes (voir GEMS/s.gems, déjà alimentée par le
// minage de tous les fermiers) ; les poissons sont déposés au chaudron
// (CAULDRON_SITE) depuis l'inventaire personnel de chaque fermier — les deux
// mécaniques permettent bien de "coopérer entre fermiers connectés" comme
// demandé, sans dupliquer un système de dépôt pour l'améthyste qui existe
// déjà. Note : Guillaume a aussi mentionné du bois ("un mélange de bois,
// d'amétyste et de poissons") mais ne lui a donné aucune quantité dans la
// liste chiffrée finale ; non inclus ici en attendant confirmation/quantité.
// Chaudron : ramené du monde maléfique (chantier 2026-07, demande Guillaume :
// "le chaudron doit être récupéré dans le monde maléfique et ramené [...] on
// le trouve comme un artéfact interactif dans le monde maléfique avant qu'il
// ne soit présent dans le monde normal [...] on peut le pick up, le collecter
// et le ramener dans notre monde pour le placer où on veut sur la map. Il
// sera automatiquement utilisable"). Remplace l'ancien CAULDRON_SITE fixe
// (doc -50) : PLUS de coordonnées figées côté ferme, le site est désormais
// la position où un joueur choisit de poser l'objet O_CAULDRON (voir cas
// "cauldron" dans resolveAct, fermeEngine.js), retrouvée dynamiquement en
// scannant les tuiles autour du joueur — même principe que O_MILL pour le
// dépôt de blé, voir E.findCauldronTile()/nearCauldron côté FermeGame.js.
// Unique pour toute la ferme (comme le puits) : une fois ramassé côté
// maléfique ET posé côté ferme, plus personne ne peut en retrouver un
// deuxième (voir s.cauldron.unlocked, fermeEngine.js/FermeGame.js).
export const EVIL_CAULDRON_SPAWN = { x: 52, y: 20 }; // position FIXE du chaudron-artéfact sur la carte maléfique
                                                      // (indépendante de la seed de la ferme, comme EVIL_RETURN_PASSAGE),
                                                      // à bonne distance d'EVIL_SPAWN pour qu'il faille explorer un peu.
export const SALVE_RECIPE = { amethyst: 1, trout: 2, pike: 1 }; // trout=FISH[1], pike=FISH[2]
export const SALVE_IMMUNITY_MS = 10 * 60 * 1000; // 10 minutes d'immunité/répulsion après usage
export const SALVE_BREW_MS = 60 * 1000; // 1 minute de concoction réelle (chantier 2026-07, demande Guillaume : menu
                                         // "déposer/prêt/allumer" + minuterie + retrait dédié au chaudron, voir
                                         // resolveSalveBrew/resolveSalveCollect, fermeEngine.js)


// --- Clôture (posée librement par les joueurs, section par section) ---
export const FENCE_COST = 15; // prix d'une section de clôture à la boutique (payée en or, inchangé)

// --- Lampadaire (chantier 2026-07, demandé par Guillaume) ---
// Achetable à la boutique (payé en or, même principe que la clôture) puis
// posé librement avec l'outil Construction (case 8, nouvelle variante
// "lamp"). Fonctionnel : éclaire un rayon autour de lui une fois la nuit
// tombée (voir nightAlpha/lampsInView dans FermeGame.js, qui perce un halo
// de lumière au niveau de chaque lampadaire posé). Un seul palier pour
// l'instant ("lvl 1"), valeurs extrapolées (aucun chiffre précis demandé
// par Guillaume), à ajuster librement.
export const LAMP_COST = 5000;         // prix d'un lampadaire à la boutique (or)
export const LAMP_LIGHT_RADIUS = 4.5;  // rayon éclairé autour du lampadaire, en tuiles

// --- Épouvantail (chantier 2026-07, demandé par Guillaume) ---
// Achetable à la boutique (payé en or, même principe que le lampadaire) puis
// posé librement avec l'outil Construction (case 8, nouvelle variante
// "scarecrow"). Pensé pour effrayer les oiseaux, PAS ENCORE IMPLÉMENTÉS
// (instructions à venir) : pour l'instant purement posable, sans effet de jeu
// actif. Ne bloque PAS le passage (contrairement au mur/lampadaire, qui sont
// des poteaux) : il est pensé pour être planté au milieu d'un champ de
// cultures sans gêner la circulation entre les rangs — à confirmer par
// Guillaume, à ajuster librement si un blocage est finalement souhaité.
// Prix extrapolé (aucun chiffre précis demandé), à ajuster librement.
export const SCARECROW_COST = 400; // prix d'un épouvantail à la boutique (or)

// --- Herbe (chantier 2026-07, demande Guillaume) ---
// Achetable à la boutique (payée en or, 5 or/unité) puis posée librement avec
// l'outil Construction (case 8, nouvelle variante "grass"), UNIQUEMENT sur du
// sol labouré sec (G_TILLED). Permet de "reverse to the original state of
// grass" une case labourée qu'on ne veut plus cultiver. Même "modèle Clash of
// Clans" que lampadaire/épouvantail (chantier réel de BUILD_TIMES.grass, voir
// plus bas) : passe d'abord par G_GRASS_GROWING, puis redevient G_GRASS TOUTE
// SEULE une fois le délai écoulé, sans action supplémentaire du joueur.
// Définitif, pas de retrait (contrairement à fence/wall/lamp/scarecrow).
export const GRASS_COST = 5; // prix d'une unité d'herbe à la boutique (or)

// --- Moulin (chantier 2026-07, demande Guillaume : "transformation artisanale :
// prévoir la construction de bâtiments simples (fût, presse, four), qui
// transformeront une récolte brute en produit à plus forte valeur (fruits ->
// confiture, lait -> fromages, blé -> farine puis pain, laine -> vêtements)").
// Premier bâtiment de cette famille : transforme le Blé récolté (CROPS[
// MILL_WHEAT_CROP]) en sacs de farine. Achetable à la boutique (payé en or,
// même principe que le lampadaire) puis posé librement avec l'outil
// Construction (case 8, nouvelle variante "mill"), chantier réel d'1h avant
// d'être fonctionnel (voir BUILD_TIMES.mill). Une fois construit : stock de
// blé COMMUN à la case (world.mills, alimenté par n'importe quel joueur d'un
// simple clic dessus, voir resolveAct cas "millDeposit"), transformation EN
// CONTINU tant qu'il reste au moins MILL_WHEAT_PER_SACK blé en stock, au
// rythme fixe d'un sac toutes les MILL_BATCH_MS (voir E.millTick,
// fermeEngine.js). Les sacs de farine produits rejoignent un pool COMMUN à la
// salle (comme les gemmes, voir sharedRef.current.flour côté FermeGame.js),
// affiché dans le HUD en haut à gauche. Coût/temps de chantier/cadence/
// quantité par sac DONNÉS EXPLICITEMENT par Guillaume, appliqués tels quels ;
// MILL_STOCK_CAP (plafond de blé stockable dans un moulin) et FLOUR_SELL
// (prix de vente d'un sac) sont EXTRAPOLÉS (aucun chiffre précis demandé au-
// delà de la mécanique elle-même), à ajuster librement.
export const MILL_COST = 30000;              // prix d'un moulin niveau 1 à la boutique (or), donné par Guillaume
export const MILL_WHEAT_CROP = 4;            // index de "Blé" dans C.CROPS ci-dessus
export const MILL_WHEAT_PER_SACK = 1;        // Zip 301b (demande Guillaume : plus de farine pour moins de blé) : 2 -> 1 (1 blé = 1 sac)
export const MILL_BATCH_MS = 5 * 60 * 1000;  // Zip 261/262 (demande Guillaume : moulins plus rapides) : 15 -> 5 min réelles par sac
export const MILL_STOCK_CAP = 90;            // stock de blé max qu'un moulin peut contenir (extrapolé, ~30 sacs d'avance)
export const FLOUR_SELL = 55;                // prix de vente d'un sac de farine (extrapolé)
// Sucrerie (chantier canne à sucre) — miroir EXACT du moulin ci-dessus, pour
// pose/dépôt (resolveAct cas "sucrerieDeposit", pose auto via buySucrerieBuilding). Coût et
// stock cap extrapolés sur le même principe que le moulin (bâtiment plus
// "premium" que le moulin car culture plus chère, cf. FEUILLE_ROUTE) ; pas
// de MILL_BATCH_MS/PER_SACK équivalent tant que la transformation (Phase 3
// de la feuille de route) n'est pas branchée.
export const SUCRERIE_COST = 36000;          // prix d'une sucrerie à la boutique (or), extrapolé au-dessus du moulin
export const SUCRERIE_CANE_CROP = 8;         // index de "Canne à sucre" dans C.CROPS ci-dessus
export const SUCRERIE_CANE_PER_SACK = 1;     // inchangé : 1 canne consommée par cycle de production
// Zip 327 (demande Guillaume : rapprocher le rendement du sucre de celui de
// la farine, le sucre devenant un intrant boulangerie/pâtisserie) : chaque
// cycle produit désormais 2 sacs pour 1 canne consommée (au lieu de 1:1),
// et la cadence est alignée sur le moulin (5 min, au lieu de 8 min).
export const SUCRERIE_SACKS_PER_BATCH = 2;   // 1 canne -> 2 sacs de sucre par cycle
export const SUCRERIE_BATCH_MS = 5 * 60 * 1000; // 5 min réelles/cycle, aligné sur MILL_BATCH_MS
// Zip 368 (demande Guillaume : "augmentons la capacité de stockage de la
// sucrerie en canne, passer à 200") : 90 -> 200. Le moulin (MILL_STOCK_CAP)
// reste volontairement à 90 — la demande ne portait que sur la sucrerie, et
// c'est le seul endroit où les deux bâtiments cessent d'être des miroirs.
export const SUCRERIE_STOCK_CAP = 200;       // stock de canne max qu'une sucrerie peut contenir
export const SUCRERIE_SPEED_MIN_MULT = 1;    // miroir de MILL_SPEED_MIN_MULT (parallélisme par répartition du dépôt, pas de boost par sucrerie)
export const SUGAR_SELL = 70;                // prix de vente d'un sac de sucre (extrapolé au-dessus de FLOUR_SELL, sucre = ressource plus rare)
// Chantier reprise (demande Guillaume) : la sucrerie devient un vrai
// bâtiment d'artisan comme les autres (ruche/fromagerie/boulangerie/scierie)
// — achetable SEULEMENT quand Jérôme Martial (skill "sugarworker") est
// résident, puis auto-posée à un emplacement de départ (plus de pose libre
// via la barre d'outils Construction, plus de retrait, un seul exemplaire).
// Chantier "sucrerie déplaçable" (2026-07, demande Guillaume : "qu'on puisse
// bouger le bâtiment sucrerie, comme les autres bâtiments d'artisans") :
// la sucrerie a finalement REJOINT C.ARTISAN_BUILDINGS/world.artisanBlocks
// (voir plus bas), exactement comme la ruche/fromagerie/boulangerie/scierie
// — collision RECTANGULAIRE pleine sur son footprint (w×h), déplaçable à la
// main (moveArtisan), achat via buyArtisanBuilding générique. Le sprite
// pixel-exact (95x88, voir fermeArt.js/sucrerieSprite) reste plus large que
// le footprint choisi : tonneaux/pressoir/tas de canne, dessinés hors du
// footprint (à droite/au-dessus), restent donc traversables tout seuls —
// même principe que le débordement du sawmill/de la fromagerie, sans avoir
// besoin d'une collision partielle dédiée. Voir ARTISAN_FACE_X/
// ARTISAN_DRAW_SCALE_OVERRIDE ci-dessous pour l'ancrage visuel exact
// (façade à x=36 dans le sprite, pas le centre de l'image) et
// E.migrateSucrerieToArtisan (fermeEngine.js) pour la conversion des fermes
// sauvegardées AVANT ce chantier (tile O_SUCRERIE + world.sucreries).
export const SUCRERIE_SITE = { x: 73, y: 45 }; // coin haut-gauche du footprint (2x2) — anciennement site.x/y du tile solide unique (74,46), décalé de -1/-1 pour que le footprint reste centré au même endroit à l'écran
// IMPORTANT (chantier "sucrerie déplaçable") : constante FIGÉE séparée de
// SUCRERIE_SITE ci-dessus, qui référence désormais le footprint (a changé de
// sens/valeur avec ce chantier). clearGhostSucreries/migrateSucrerieToArtisan
// (fermeEngine.js) ont besoin de l'ANCIENNE coordonnée exacte du tile solide
// unique posé par l'ancien modèle (zips 317-324) pour retrouver/convertir une
// sucrerie sauvegardée AVANT ce chantier — ne JAMAIS faire varier cette
// constante avec SUCRERIE_SITE (qui, elle, peut continuer à être ajustée si
// le footprint doit encore bouger un jour).
export const SUCRERIE_LEGACY_SOLID_TILE = { x: 74, y: 46 };
// Zip 286 (demande Guillaume : "quand une ferme dépose plusieurs moulins, il
// faut qu'ils fonctionnent en même temps, qu'ils produisent la farine plus
// vite. 2 moulins = x2, 3 moulins = x3") : chaque moulin garde son propre
// stock de blé indépendant (inchangé, cf. ci-dessus), mais son rythme de
// production (MILL_BATCH_MS) est maintenant divisé par le nombre de moulins
// TERMINÉS (chantier fini, voir buildReady) sur la ferme au moment du tick —
// voir E.millTick(ms, now, speedMult) et son appel dans FermeGame.js, qui
// compte ce nombre avant la boucle. Avec 2 moulins construits, chacun sort un
// sac 2x plus vite qu'un moulin seul ; avec 3, 3x plus vite — exactement le
// x2/x3 demandé, tant qu'il reste du blé en stock dans le(s) moulin(s)
// concerné(s). Pas de plafond volontairement (aucune limite demandée sur le
// nombre de moulins ni sur ce multiplicateur).
export const MILL_SPEED_MIN_MULT = 1; // multiplicateur plancher (1 moulin construit = vitesse normale)
// Zip 301b (demande Guillaume : "les faire fonctionner en même temps, pas
// individuellement ; un clic sur l'un déclenche tous et divise le travail") :
// un dépôt de blé sur N'IMPORTE quel moulin RÉPARTIT désormais le blé sur TOUS
// les moulins terminés de la ferme (voir resolveAct cas "millDeposit"), qui
// broient alors EN PARALLÈLE, chacun sa part. Le débit total est donc ~×N pour
// N moulins (2 moulins = 2× plus de farine par minute, etc.), obtenu par la
// répartition + le broyage simultané, chaque moulin tournant à sa cadence de
// base. On remet donc le multiplicateur de vitesse par moulin à 1 (le boost
// "MILL_BATCH_MS ÷ nb de moulins" du zip 286 est remplacé par ce parallélisme,
// sinon le cumul répartition × boost donnerait un ×N² surpuissant).
export const MILL_GROUPED_DEPOSIT = true;

// --- Temps de construction réels (chantier 2026-07, "modèle Clash of Clans") ---
// Toute infrastructure posée par un joueur (lampadaire pour l'instant, et
// toute future construction similaire) n'est PAS fonctionnelle immédiatement :
// elle reste un chantier en cours pendant BUILD_TIMES[kind] (durée RÉELLE en
// ms, indépendante du cycle jour/nuit — même philosophie que growMs/
// WATER_VALID_MS/prodMs), avant de devenir utilisable. Techniquement, le
// champ objHp existant (jusqu'ici une simple valeur de robustesse à 1 pour
// ces objets non dégradables) est réutilisé pour y stocker l'horodatage de
// fin de chantier (`readyAt`) : aucun nouveau champ réseau/sauvegarde
// nécessaire, en suivant le même pattern "état dérivé purement d'un
// horodatage partagé" déjà utilisé pour les cultures/animaux (voir
// `buildReady`/`buildRemainingMs` dans fermeEngine.js). Pour ajouter une
// future infrastructure au même système : lui donner une entrée ici, la
// poser en stockant `now + BUILD_TIMES.<kind>` dans objHp, et vérifier
// `E.buildReady(...)` avant de la considérer fonctionnelle côté rendu.
export const BUILD_TIMES = {
  lamp: 15 * 60 * 1000,     // lampadaire niveau 1 : 15 minutes réelles (valeur donnée par Guillaume)
  scarecrow: 10 * 1000,     // épouvantail : 10 secondes réelles (valeur donnée par Guillaume)
  grass: 5 * 1000,          // repousse de l'herbe sur une case labourée : 5 secondes réelles (valeur donnée par Guillaume)
  mill: 60 * 60 * 1000,     // moulin niveau 1 : 1 heure réelle (valeur donnée par Guillaume)
  // sucrerie : ENTRÉE DÉSORMAIS INUTILISÉE (chantier "sucrerie déplaçable",
  // demande Guillaume : "comme les autres bâtiments d'artisans") — la
  // sucrerie a rejoint C.ARTISAN_BUILDINGS, qui suit le modèle
  // buyArtisanBuilding (construction INSTANTANÉE, comme la ruche/fromagerie/
  // boulangerie/scierie, aucune ne passe par BUILD_TIMES/objHp). Laissée ici
  // en commentaire pour la trace ; si un délai de chantier est un jour
  // redemandé spécifiquement pour la sucrerie, il faudra un mécanisme dédié
  // (crafts.sucrerie n'a pas d'objHp, cf. migrateSucrerieToArtisan).
  // sucrerie: 60 * 60 * 1000,
  cauldron: 5 * 1000,       // chaudron : 5 secondes réelles (extrapolé, pas de "bâtiment" au sens propre, cohérent
                             // avec l'absence de mini-jeu à la concoction elle-même, voir doc -50)
};

// --- Constructions bois/pierre (chantier 2026-07) ---
// Le joueur convertit du bois/de la pierre récoltés en sections prêtes à poser
// (clic sur l'icône bois/pierre du HUD -> menu Construire/Vendre), puis les
// pose avec l'outil clôture (case 8), qui devient un outil "Construction"
// générique à 3 variantes (clôture/mur/chemin, voir buildKind côté client).
// La clôture en bois rejoint le MÊME stock que celle achetée en or (f.inv.fence) :
// une section reste une section, quelle que soit son origine. Le mur et le
// chemin ont chacun leur propre stock (f.inv.wall / f.inv.path). Valeurs
// choisies par extrapolation (aucun chiffre précis demandé), à ajuster.
export const BUILD_COSTS = {
  fence: 4, // bois par section de clôture fabriquée
  wall: 5,  // pierre par section de mur
  path: 2,  // pierre par dalle de chemin
};

// --- Ponts (chantier 2026-07, demande Guillaume) ---
// Les 2 ponts fixes générés à la carte (voir generateWorld) ne sont plus déjà
// construits : chaque case de la traversée est un site à bâtir (G_BRIDGE_SITE),
// au choix en bois OU en pierre (2 types de pont, pas un coût combiné des
// deux). Contrairement à la clôture/au mur/au chemin, PAS de section à
// fabriquer au préalable via le menu Construire : le coût est prélevé
// directement sur l'inventaire de bois/pierre récolté au moment de poser
// chaque case (voir resolveAct cas "bridge"). Une fois posée, une case de
// pont est PERMANENTE (pas de retrait/remboursement, pour ne jamais risquer
// de piéger un joueur en pleine rivière en retirant la case sous ses pieds).
export const BRIDGE_COST_WOOD = 20;  // bois par case de pont en bois
export const BRIDGE_COST_STONE = 15; // pierre par case de pont en pierre

// --- Dégradation du pont bois + rénovation en pierre (chantier 2026-07, demande Guillaume) ---
// "problème rénovation du pont : une fois qu'il est totalement construit, il
// perd deux tuiles par nuit, car il est en bois. La rénovation en pierre doit
// changer l'aspect du pont (aspect pierre joli), et lui permettre de résister
// à la dégradation." Décisions validées par Guillaume (3 questions à choix
// multiples, conformément à la section 3) : la dégradation ne démarre QUE
// lorsque toute la traversée est déjà bâtie (aucune case encore en
// G_BRIDGE_SITE) ; les cases perdues sont tirées AU HASARD parmi les cases
// bois (G_BRIDGE/G_BRIDGE_CLOSED) de la traversée, pas depuis les bords ni
// toujours la même ; une case perdue redevient un chantier G_BRIDGE_SITE
// normal (à rebâtir comme au tout début, bois ou pierre). La rénovation en
// pierre se fait case par case, DIRECTEMENT sur une case de pont bois déjà
// construite (G_BRIDGE/G_BRIDGE_CLOSED) — pas besoin de la redétruire — et la
// transforme en G_BRIDGE_STONE (résistante, ne peut plus jamais être tirée
// par la dégradation).
export const BRIDGE_DECAY_PER_NIGHT = 2; // nombre de cases bois perdues, au hasard, chaque nuit ÉLIGIBLE (voir
                                          // BRIDGE_DECAY_EVERY_N_NIGHTS), par traversée ENTIÈREMENT construite
                                          // (aucun site restant) ; si moins de cases bois restent que ce nombre
                                          // (ex: presque tout rénové), seules les cases bois restantes sont
                                          // perdues (jamais les cases pierre).
export const BRIDGE_DECAY_EVERY_N_NIGHTS = 2; // fréquence de la dégradation (chantier 2026-07, ajusté par
                                               // Guillaume : "c'est trop fréquent sinon" — passé d'une dégradation
                                               // toutes les nuits à une nuit SUR DEUX). Comparé au compteur `day`
                                               // transmis à `newDay` (voir fermeEngine.js) : la dégradation ne se
                                               // déclenche que si `day % BRIDGE_DECAY_EVERY_N_NIGHTS === 0`.
export const BRIDGE_RENOVATE_COST_STONE = 15; // pierre par case pour rénover une case de pont bois déjà construite
                                               // en pierre (résistante) ; même tarif que la construction initiale en
                                               // pierre (BRIDGE_COST_STONE), valeur extrapolée à ajuster librement.

// --- Levier de pont (chantier 2026-07, demande Guillaume) ---
// "les ponts en pierre et en bois doivent pouvoir être refermés et ouverts à
// l'aide d'un levier [...] car on ajoutera des ennemis et des animaux
// dangereux sur la rive droite, il faudra donc que le pont puisse être ouvert
// et fermé à notre guise pour les bloquer". Décisions validées par Guillaume
// (3 questions à choix multiples, conformément à la section 3) : le levier
// est posé AUTOMATIQUEMENT dès qu'une traversée est entièrement construite
// (aucun coût, aucun objet à équiper) ; le pont fermé reste VISIBLE (une
// barrière apparaît par-dessus, il ne redevient pas un chantier) ; il bloque
// TOUT LE MONDE, joueurs compris (pas seulement les futurs ennemis/animaux).
// Aucune position précise de levier n'a été demandée : posé sur la berge,
// côté maison (ouest), au milieu de la largeur de la traversée — extrapolé,
// à ajuster librement. Le pont bâti (G_BRIDGE) reste toujours PERMANENT au
// sens du chantier précédent (jamais retiré/remboursé en ressources) : seul
// son état de passage bascule via le levier, voir G_BRIDGE_CLOSED plus haut.
export const BRIDGE_LEVER_OFFSET = 7; // décalage (en cases) du levier par rapport au bord ouest de la traversée

// --- Élevage ---
// Enclos près de la maison (dans la zone déjà dégagée autour de la ferme).
export const PEN = { x: 48, y: 38, w: 8, h: 6 };
// Chaque animal produit un bien à ramasser puis vendre (ou manger), toutes les
// `prodMs` (durée RÉELLE, indépendante du cycle jour/nuit, voir zip 151).
// Prix d'achat très nettement augmentés (demande 2026-07 : "pas du tout assez
// chers, sauf les poules") ; seule la poule reste au même prix qu'avant.
// `edible`/`energy` : la production peut aussi être mangée (comme un poisson)
// pour rendre de l'énergie, SAUF la laine qui n'est pas un aliment et reste
// uniquement vendable.
// Prix multipliés par 5 au zip 152 (hors Poule, déjà revue au zip 151).
// Prix de vente des productions (œuf, lait, laine, truffe) à nouveau
// multipliés par 5 (demande 2026-07, zip 156).
// Zip 253 (demande Guillaume) : COÛT D'ACHAT des animaux d'élevage divisé
// par 2,5 (120->48, 8000->3200, 10000->4000, 15000->6000, 25000->10000) pour
// rendre l'élevage plus accessible. Prix de vente (sell) inchangés.
//
// Zip 255 (demande Guillaume) : cadences de production revues pour poule/
// chèvre/brebis/cochon (durées RÉELLES, indépendantes du cycle jour/nuit) +
// prix de vente de la truffe fortement augmenté.
export const ANIMALS = [
  { id: 0, name: "Poule",  nameEn: "Hen",   cost: 48,    prodMs: 10 * MIN, prod: "Œuf",             prodEn: "Egg",         sell: 125,  edible: true,  energy: 15, body: "#f0e8d8", accent: "#d44a3f" },
  { id: 1, name: "Chèvre", nameEn: "Goat",  cost: 3200,  prodMs: 20 * MIN, prod: "Lait de chèvre",  prodEn: "Goat milk",   sell: 300,  edible: true,  energy: 22, body: "#d8cbb0", accent: "#7a6a52" },
  { id: 2, name: "Brebis", nameEn: "Sheep", cost: 4000,  prodMs: 45 * MIN, prod: "Laine",           prodEn: "Wool",        sell: 450,  edible: false, energy: 0,  body: "#f2f0ea", accent: "#c8c0b0" },
  { id: 3, name: "Cochon", nameEn: "Pig",   cost: 6000,  prodMs: 5 * H,    prod: "Truffe",          prodEn: "Truffle",     sell: 2900, edible: true,  energy: 28, body: "#e8a8b0", accent: "#c07882" },
  // Zip 255 : vache à 1h réelle. Zip 265 (demande Guillaume : « augmente le
  // rendement du lait, toutes les 20 minutes par vache ») : cadence ramenée à
  // 20 min réelles -> ×3 de lait par vache. Prix de vente inchangé (600).
  { id: 4, name: "Vache",  nameEn: "Cow",   cost: 10000, prodMs: 20 * MIN, prod: "Lait",            prodEn: "Milk",        sell: 600,  edible: true,  energy: 26, body: "#efe7dc", accent: "#5a4634" },
];
// Zip 254 (demande Guillaume) : echelle d'affichage par animal (rendu en jeu
// uniquement — purement visuel, aucune incidence sur la logique/collisions,
// qui restent en coordonnees de tuiles). Le sprite natif fait 16x14 px ; le
// cheval est dessine a 28x24 (~1,75x). Objectif : "vache aussi grande que le
// cheval, chevre plus grande qu'avant mais plus petite que la vache", et une
// echelle coherente pour le reste du cheptel. Indexe par `id` d'ANIMALS :
// [poule, chevre, brebis, cochon, vache].
export const ANIMAL_DRAW_SCALE = [1, 1.35, 1.25, 1.4, 1.7];

// ==========================================================================
// Zip 369 — REFONTE DU CHEPTEL (maquettes validées par Guillaume).
//
// 1) SPRITES NATIFS. Jusqu'ici un canevas unique de 16x14 était AGRANDI à
//    l'écran par ANIMAL_DRAW_SCALE ci-dessus (jusqu'à x1,7 pour la vache) :
//    au plus proche voisin, un pixel source devenait un bloc de 1 ou 2 px
//    selon sa position, d'où l'aspect grossier et irrégulier. Chaque animal
//    a désormais son propre canevas, à sa taille FINALE : plus aucun
//    agrandissement au rendu, chaque pixel dessiné est un pixel écran.
//    ANIMAL_DRAW_SCALE n'est plus appliqué au dessin ; il est conservé parce
//    que les tailles ci-dessous en sont dérivées (16x14 x l'échelle, arrondi)
//    et qu'il documente les rapports voulus au zip 254.
//
// 2) LES CANEVAS SONT PLUS GRANDS QUE LE DESSIN AU REPOS, volontairement.
//    Alerte de Guillaume : "attention de ne pas couper le sprite à cause de
//    l'animation qui pourrait nécessiter d'utiliser plus de largeur". Mesure
//    faite sur les 4 frames de marche ET les cycles complets de broutage et
//    de repos, contour compris : les cinq sprites étaient coupés. La tête qui
//    broute avance vers l'avant en descendant (jusqu'à 2 px à droite), et la
//    chèvre perdait le bout de ses cornes vers le haut. Les valeurs ci-dessous
//    sont la boîte englobante réelle de tout le cycle, plus 1 px de garde de
//    chaque côté.
//
// 3) ANCRAGE SUR LE CORPS, PAS SUR LA BOÎTE. Les marges sont ASYMÉTRIQUES (de
//    la place à droite pour le mufle, pas à gauche), donc centrer la boîte
//    comme avant décalerait tout le troupeau au sol. `cx` = colonne du centre
//    du CORPS, `footY` = ligne de contact au sol : le rendu place cx sur le
//    centre de la tuile et footY sur le sol (voir FermeGame.js). `cx` sert
//    AUSSI d'axe au retournement vers la gauche : miroiter autour de la boîte
//    ferait sauter la bête latéralement de 2 x (cx - w/2) à chaque demi-tour.
//    `dx`/`dy` = translation appliquée une fois au contexte dans animalSprite,
//    pour que le code de dessin garde son repère naturel.
export const ANIMAL_SPRITE = [
  { w: 19, h: 16, footY: 14, cx:  9, dx:  1, dy:  0, topY: 1 }, // poule
  { w: 24, h: 23, footY: 21, cx: 12, dx: -1, dy:  2, topY: 1 }, // chèvre
  { w: 23, h: 18, footY: 16, cx: 11, dx:  0, dy: -2, topY: 1 }, // brebis
  { w: 25, h: 18, footY: 16, cx: 12, dx:  0, dy: -3, topY: 1 }, // cochon
  { w: 30, h: 24, footY: 22, cx: 15, dx: -1, dy: -1, topY: 1 }, // vache
];
// Robes. Demande Guillaume : "aléatoire pour les animaux d'élevage, seulement
// cosmétique" — d'où un champ `skin` TIRÉ AU HASARD À L'ACHAT côté hôte, puis
// PERSISTÉ avec la bête (voir s.animals.push et normalizeAnimals). Tiré une
// fois et conservé, et non retiré à chaque affichage : sinon la même vache
// changerait de robe à chaque session, et surtout n'aurait pas la même robe
// sur les deux écrans. Le champ voyage déjà, `animals` étant diffusé en bloc.
// Références fournies par Guillaume : poule chamois à camail brun, holstein
// noire et blanche, limousine crème unie.
export const ANIMAL_SKINS = [
  [ { id: "blanche",   body: "#f0e8d8", hack: "#e6d9c0", tail: "#f7f1e4", comb: "#d44a3f", foot: "#e8a83a" },
    { id: "brune",     body: "#eecf94", hack: "#a8623a", tail: "#f2e3bf", comb: "#cf3a2c", foot: "#dd9a34" } ],
  [ { id: "fauve",     body: "#d8cbb0", patch: "#7a6a52", muz: "#b5a68a", hoof: "#3a2f26", horn: "#cbbfa4", pat: 0 } ],
  [ { id: "blanche",   body: "#f2f0ea", patch: "#8a7c68", muz: "#9a8c78", hoof: "#2e2620", horn: "#cbbfa4", pat: 0 } ],
  [ { id: "rose",      body: "#e8a8b0", patch: "#c07882", muz: "#c07882", hoof: "#3a2f26", horn: "#cbbfa4", pat: 0 } ],
  [ { id: "holstein",  body: "#f4f2ee", patch: "#2c2926", muz: "#d7a9a2", udder: "#e8a89f", hoof: "#2a2622", horn: "#d8cdb4", pat: 1 },
    { id: "limousine", body: "#d3a065", patch: "#c08d52", muz: "#e6cdae", udder: "#dda898", hoof: "#6a563c", horn: "#e2d3b0", pat: 0 } ],
];
// Broutage / picorage (demande Guillaume : "il faut qu'elles broutent ou
// picorent quand elles sont à l'arrêt — tête qui pique vers le bas et remonte
// rapidement pour les poules, tête qui reste vers le bas pendant que l'animal
// avance lentement ou reste immobile pour le gros bétail").
//
// Aucune incidence réseau : animalPos (fermeEngine.js) est déjà 100 % LOCAL et
// dérive tout de l'horloge globale, avec un déphasage par animal — les bêtes
// ne picorent donc pas en cœur, et les deux joueurs voient la même chose sans
// qu'un seul message soit émis. Les frames 0 à 3 restent la marche ; 4 à 7
// sont les poses de tête basse. `seq` est parcourue sur `cycleMs`.
export const ANIMAL_FRAMES = 8;
export const ANIMAL_GRAZE = [
  { cycleMs: 1450, seq: [0, 4, 5, 4, 0, 0, 4, 5, 4, 0] }, // poule : deux coups de bec brefs par cycle
  { cycleMs: 6200, seq: [4, 5, 6, 5, 6, 5, 6, 5, 7, 0] }, // chèvre : tête basse tenue, mâchoire
  { cycleMs: 6200, seq: [4, 5, 6, 5, 6, 5, 6, 5, 7, 0] }, // brebis
  { cycleMs: 5400, seq: [4, 5, 6, 5, 6, 5, 6, 5, 7, 0] }, // cochon : fouille un peu plus vite
  { cycleMs: 6200, seq: [4, 5, 6, 5, 6, 5, 6, 5, 7, 0] }, // vache
];
// Descente de la tête par frame de broutage (frames 4,5,6,7), en pixels, et
// frame où la mâchoire mastique. La poule pique franchement et brièvement ; le
// gros bétail descend plus bas et y reste.
export const ANIMAL_HEAD_DROP = [
  { d: [1.4, 3.8, 3.8, 1.4], chew: -1 }, // poule
  { d: [1.8, 4.4, 4.4, 2.6], chew:  6 }, // chèvre
  { d: [1.8, 4.4, 4.4, 2.6], chew:  6 }, // brebis
  { d: [1.8, 4.4, 4.4, 2.6], chew:  6 }, // cochon
  { d: [1.8, 4.4, 4.4, 2.6], chew:  6 }, // vache
];
// --- Missions d'équipe : SUPPRIMÉES au zip 368 -----------------------------
// Demande Guillaume : "supprimer l'animation de team mission qui flotte (le
// chantier qui bounce). C'est pas intéressant" -> puis, en arbitrage :
// "supprimer celui de la mission d'équipe totalement, ainsi que la mission
// d'équipe associée".
// Étaient définis ici COOP_SITE (le point de dépôt, x44 y42) et COOP_MISSIONS
// (deux chantiers tirés au sort, irrigation et agrandissement de la maison,
// avec leurs cibles bois/pierre et leur récompense en or). Tout le système est
// parti avec eux : déclenchement automatique à 2 joueurs en ligne, dépôt par
// la touche E, panneau HUD, marqueur flottant, lignes de chat, champ `coop`
// dans l'état partagé et dans la persistance, et le +2 de farmPopularity.
// Une vieille sauvegarde peut encore contenir un champ `coop` : il est
// simplement IGNORÉ au chargement (aucune lecture ne subsiste), les
// ressources qui y avaient été déposées sont perdues — arbitrage assumé de
// Guillaume, au maximum 60 bois et 40 pierre une seule fois.
// À NE PAS confondre avec la GRANGE collaborative (BARN_LEVELS/BARN_SITE
// ci-dessous), qui reste en place : c'est le chantier coopératif PERSISTANT,
// et lui seul. Deux chaînes de texte portent encore le préfixe "coop" parce
// que le dépôt à la grange les réutilise : `toastCoopNothing`, et
// `woodLabel`/`stoneLabel`.

// --- Grange collaborative (zip 158) : premier "chantier persistant" issu ---
// des missions d'équipe (voir section 0 du contexte). Contrairement à
// COOP_SITE/COOP_MISSIONS (missions aléatoires, temporaires, tirées au
// hasard), la grange a un emplacement FIXE et son niveau SURVIT d'une
// session à l'autre : à chaque palier construit, le bâtiment reste visible
// sur la carte et grandit. But annoncé par Guillaume : augmenter durablement
// le nombre d'animaux possible. S'ajoute aux missions aléatoires existantes,
// ne les remplace pas (elles continuent de se déclencher normalement).
// Repositionnée au zip 161 à droite de l'enclos de départ (PEN, x:48-56) :
// l'ancien emplacement (37,44) gênait la lisibilité près de la maison une
// fois les lampadaires/chevaux du zip 160 ajoutés. Bien dégagée de la PEN
// (marge de plusieurs tuiles) pour laisser la place au palier 3, bien plus
// grand désormais (voir barnSprite() dans fermeArt.js) — generateWorld
// dégage spécifiquement une zone assez large autour de ce point (sol forcé
// en herbe + arbres/rochers retirés), voir fermeEngine.js.
export const BARN_SITE = { x: 67, y: 41 };
export const BARN_LEVELS = [
  // Palier 1 : construction initiale (la grange n'existe pas avant). Coût en
  // or ajouté au zip 161 (en plus du bois/pierre), demandé par Guillaume :
  // il faut réunir une somme déterminée pour LANCER les travaux d'un palier,
  // payée dès que le bois/la pierre du palier sont réunis (voir
  // resolveBarnDeposit dans fermeEngine.js).
  // Zip 265 (demande Guillaume : « augmente la capacité de la grange pour
  // accueillir 50 animaux ») : bonus relevés pour atteindre 50 au palier max
  // (base MAX_ANIMALS 12 + 10 + 12 + 16 = 50). Progression : 12 (enclos) -> 22
  // (niv.1) -> 34 (niv.2) -> 50 (niv.3). SANS surcoût realtime : les animaux ne
  // sont PAS diffusés en continu (déambulation dérivée de l'horodatage, comme
  // les cultures — voir animalPos) ; seuls des événements discrets (ajout,
  // ramassage, déplacement) et le snapshot de join portent le tableau, un peu
  // plus long mais envoyé rarement. Coûts (bois/pierre/or) inchangés.
  { level: 1, cost: { wood: 150, stone: 100, money: 10000 }, hits: 6, animalBonus: 10 },
  { level: 2, cost: { wood: 250, stone: 180, money: 20000 }, hits: 8, animalBonus: 12 },
  { level: 3, cost: { wood: 400, stone: 300, money: 50000 }, hits: 10, animalBonus: 16 },
];
export const MAX_ANIMALS = 12;      // limite d'animaux dans l'enclos, avant toute grange
export const COLLECT_RANGE = 1.5;   // distance pour ramasser une production
// Déambulation lente (zip 152) : purement dérivée de l'horodatage (comme
// cropGrowState), aucun message réseau supplémentaire. `hx`/`hy` (ancrage,
// synchronisé) restent fixes ; la position affichée/logique oscille autour
// de cet ancrage. Rayon volontairement petit pour rester dans l'enclos de
// départ (les animaux y naissent à au moins 1 case des clôtures).
export const ANIMAL_WANDER_RADIUS = 0.55;    // amplitude en tuiles
export const ANIMAL_WANDER_PERIOD_MS = 7000; // période de base (conservée, non réutilisée par animalPos depuis zip 255)
export const ANIMAL_PICK_RANGE = 1.8;        // portée pour attraper/déposer un animal (= ACT_RANGE)
// Broutage/marche (zip 255, demande Guillaume : "faire bouger les animaux de
// la ferme de manière cohérente et légèrement plus détaillée, animer les
// pattes, changer de direction, s'arrêter"). Toujours 100% local (dérivé de
// hx/hy/type/horodatage, comme cropGrowState/animalPos) : aucun trafic réseau
// ajouté. Cycles longs, l'animal broute (arrêté) la plupart du temps puis
// marche vers un point voisin et en revient — même mécanique de cycle que
// les loups/lapins (animT->frame), mais purement locale au lieu d'être
// diffusée par l'hôte.
export const ANIMAL_CYCLE_MS = 13000;        // durée de base d'un cycle brouter/marcher (variée par animal)
export const ANIMAL_WALK_MS = 2200;          // portion du cycle passée à marcher (le reste = broute, arrêté)
export const ANIMAL_WALK_FRAME_MS = 260;     // durée d'une frame de patte pendant la marche (4 frames, cf. loups)

// --- Cycle jour/nuit (seuils partagés) ---
// Extraits ici (au lieu de rester en constantes locales dans nightAlpha,
// FermeGame.js) pour que la logique des loups (chantier 2026-07, demande
// Guillaume) puisse déterminer "est-ce la nuit ?" avec EXACTEMENT les mêmes
// paliers que le voile visuel, sans dupliquer les valeurs à deux endroits.
export const DAWN_START_MIN = 5 * 60 + 30, DAWN_END_MIN = 6 * 60 + 30;   // 5h30 → 6h30
export const DUSK_START_MIN = 17 * 60, DUSK_MID_MIN = 20 * 60, DEEP_END_MIN = 23 * 60; // 17h / 20h / 23h

// --- Météo : journées grises d'orage/pluie (chantier 2026-07, demande
// Guillaume : "ajouter des journées grises d'orages et pluie, une toutes les
// 7") ---
// PUREMENT visuel/ambiance pour l'instant : un jour sur STORM_EVERY_N_DAYS
// (day % STORM_EVERY_N_DAYS === 0, donc jour 7, 14, 21…) est marqué comme
// orageux dès son tout début (voir E.isStormyDay, dérivé du même compteur
// `day` que le reste — aucun tirage aléatoire, prévisible et reproductible
// pour tous les joueurs de la ferme). AUCUN effet de gameplay volontaire
// (pousse des cultures, énergie, déplacement… tout inchangé) : uniquement un
// voile gris semi-transparent + des traits de pluie qui défilent à l'écran
// (voir le rendu dans FermeGame.js, juste après le voile nocturne). Message
// de chat dédié au lever du jour (L.chatStormyDay), en plus du message
// "Jour N" habituel.
export const STORM_EVERY_N_DAYS = 7;      // 1 jour orageux tous les N jours (0 = désactivé)
export const STORM_TINT_ALPHA = 0.28;     // opacité du voile gris (composé AVANT le voile nocturne, s'additionne la nuit)
export const STORM_RAIN_COUNT = 70;       // nombre de traits de pluie affichés simultanément
export const STORM_RAIN_SPEED = 420;      // vitesse de chute, px/seconde (écran, indépendant du zoom)
export const STORM_RAIN_LEN = 14;         // longueur d'un trait de pluie, px

// --- Loups (chantier 2026-07, demande Guillaume : "loups assez détaillés,
// rive droite de la rivière, ponts non fermés, torche pour les éloigner") ---
// Simulation PUREMENT hôte (comme les chevaux sifflés) : les loups
// apparaissent chaque nuit rive droite (côté opposé à la ferme, x plus grand
// que le centre de la rivière à leur rangée), rôdent, et ne peuvent tenter
// de traverser vers l'enclos QUE par un pont construit ET ouvert (G_BRIDGE,
// jamais G_BRIDGE_SITE ni G_BRIDGE_CLOSED — même règle de collision que les
// fermiers). Ils repartent à l'aube, quel que soit leur avancement.
export const WOLF_COUNT = 3;              // loups actifs par nuit
export const WOLF_SPEED_STOP = 0;         // état 1/3 : à l'arrêt (guet, repas)
export const WOLF_SPEED_SLOW = 1.05;      // état 2/3 : marche lente (rôde / approche)
export const WOLF_SPEED_FAST = 3.5;       // état 3/3 : marche rapide (chasse, fuite de la torche)
export const WOLF_MAX_KILLS_PER_NIGHT = 2; // perte maximale d'animaux d'élevage, par nuit
export const WOLF_EAT_RANGE = 0.9;        // portée d'attaque sur un animal de l'enclos
export const WOLF_EAT_MS = 3500;          // durée d'un repas avant que l'animal disparaisse
export const WOLF_HUNT_TRIGGER_MS = 9000; // délai moyen avant qu'un loup au repos décide de partir chasser
export const WOLF_SPAWN_MARGIN = 5;       // marge (tuiles) au-delà de la berge est pour l'apparition
export const WOLF_ROAM_RADIUS = 7;        // amplitude de rôdaille rive droite
export const WOLF_TORCH_RANGE = 6;        // rayon d'effroi autour d'une torche allumée
export const WOLF_FLEE_COOLDOWN_MS = 4000; // temps avant de reprendre son activité après une fuite
// Mise à mort d'un loup (chantier 2026-07, demande Guillaume : "un moyen de
// tuer les loups et les ennemis après trois victoires au mini-jeu"). Symétrique
// des créatures maléfiques (voir EVIL_MONSTER_KILL_WINS) : compteur PAR JOUEUR
// et PAR LOUP (wf.biteWins[playerId], côté hôte). À la WOLF_KILL_WINS-ième
// victoire d'un même joueur contre CE loup, il meurt (phase "dead" + animation)
// au lieu de fuir. WOLF_BITE_GRACE_MS = fenêtre garantie sans re-morsure du
// même loup sur ce joueur après CHAQUE victoire — corrige la boucle où un loup
// agressif re-mordait dès la frame suivante (le ré-aggro est aussi bloqué
// pendant flee/dead). WOLF_DEATH_ANIM_MS = durée de l'anim de mort avant despawn.
export const WOLF_KILL_WINS = 3;
export const WOLF_BITE_GRACE_MS = 3500;
export const WOLF_DEATH_ANIM_MS = 900;

// Loups agressifs (chantier 2026-07, demande Guillaume) : une minorité de
// loups, tirée UNE FOIS à l'apparition (voir wolfSpawnPos/updateWolves), ne
// fuit pas la torche et tente au contraire de mordre le fermier porteur.
export const WOLF_AGGRESSIVE_CHANCE = 0.2;   // ~1 loup sur 5
export const WOLF_SPEED_AGGRESSIVE = 4.4;    // > WOLF_SPEED_FAST : rattrape un fermier qui fuit
export const WOLF_BITE_RANGE = 0.75;         // distance déclenchant la morsure (mini-jeu)
export const WOLF_BITE_REACT_MS = 2800;      // durée du mini-jeu de riposte (rééquilibré 2026-07 : 2200ms + jauge trop punitive rendait le mini-jeu quasi impossible, voir aussi press/decay dans WolfBiteMinigame)
export const INJURED_MS = 10 * 60 * 1000;    // indisponibilité après une morsure manquée (10 min, survit à un refresh)
export const HEAL_KIT_COST = 0;              // trousse de soins, gratuite (magasin) — demande 2026-07
export const HEAL_REDUCE_MS = 60 * 1000;     // durée restante après soin par un autre joueur (1 min)
export const HEAL_RANGE = 2.5;               // distance max (tuiles) pour soigner un fermier blessé

// --- Greg, l'employé de champs de base (chantier 2026-07, demande Guillaume :
// engageable depuis le shop, arrose automatiquement toutes les 10h, exécute
// des ordres de labour/plantation/arrosage sur N cases, se balade tant qu'il
// est employé, contrat de 2 jours rémunéré). Un seul Greg par ferme (pas de
// liste, contrairement aux chevaux) : `sharedRef.current.greg` (voir
// FermeGame.js) vaut soit `null` (pas engagé), soit un objet d'état.
export const GREG_HIRE_COST = 400;                 // prix d'engagement (extrapolé, entre le puits et un cheval)
export const GREG_CONTRACT_MS = 2 * 24 * 60 * 60 * 1000; // durée réelle du contrat : 2 jours réels rémunérés
export const GREG_WATER_CHECK_MS = 8 * 1000;       // FIX 246 : scan des cultures assoiffées plus fréquent (15s -> 8s) — Greg arrose plus vite (demande Guillaume)
export const GREG_WATER_BATCH = 10;                // FIX 246 : plus de cases assoiffées par passage (6 -> 10), Greg arrose plus vite
export const GREG_SPEED = 3.2;                     // tuiles/seconde (rôdaille au repos = GREG_SPEED * 0.55)
export const GREG_TASK_SPEED = 4.3;                // FIX 246 : en mission Greg se déplace plus vite (demande Guillaume) — reste sous PLAYER_SPEED (5.2)
export const GREG_ROAM_RADIUS = 6;                 // amplitude de rôdaille autour de son ancre (même principe que WOLF_ROAM_RADIUS)
export const GREG_ANCHOR = { x: 26, y: 58 };        // point d'ancrage (rôdaille + tuiles de dépôt), au bord des champs ouest (puits)
export const GREG_TASK_RANGE = 0.6;                // distance d'arrivée sur une case de tâche avant de l'exécuter
export const GREG_ORDER_MAX = 200;                  // nombre max de GRAINES (pas de cases) par ordre (garde-fou anti-abus, zip 291)
// Extension du champ (chantier 2026-07) : Greg abat les arbres et casse les
// rochers trouvés autour de son ancre pour agrandir la zone cultivable, sans
// qu'un ordre explicite soit nécessaire — même esprit que l'arrosage auto.
// Niveau d'outil fixe (Greg n'a pas d'inventaire d'outils à améliorer) :
// équivalent hache/pioche niveau 1, comme un fermier qui n'a rien acheté.
export const GREG_AXE_LVL = 1;
export const GREG_PICK_LVL = 1;
export const GREG_CLEAR_RADIUS = 12;               // rayon de recherche d'arbres/rochers à dégager (plus large que GREG_ROAM_RADIUS : "étendre" le champ, pas juste l'entretenir)
export const GREG_CLEAR_BATCH = 3;                 // nb d'obstacles mis en file par passage de scan
export const GREG_CLEAR_CHECK_MS = 5 * 60 * 1000;  // fréquence de scan (5 min réelles) quand Greg n'a plus de tâche en attente


// --- Repos de Greg : pose assise sur un tabouret + 💤 (FIX 246, décision
// Guillaume : "pose assise dédiée"). Quand il rôde sans tâche, il s'assoit
// parfois un moment avant de reprendre sa balade tranquille.
export const GREG_SIT_CHANCE = 0.45;                 // proba., à chaque fin de cible de rôdaille, de s'asseoir au lieu de repartir
export const GREG_SIT_MIN_MS = 4000;                 // durée assise minimale
export const GREG_SIT_MAX_MS = 9000;                 // durée assise maximale

// Chantier 3 (feuille de route Greg, café d'Éthiopie) : mode "SuperGreg".
// x10 sur la vitesse de trajet vers une tâche (GREG_TASK_SPEED) et sur les
// dégâts infligés par gregChop/gregMine, PAS sur la rôdaille passive (roam)
// — décision Guillaume. Consomme le stock commun station.worldStock.coffee,
// PARTAGÉ avec SuperSoan (chantier 4) — pas de pool séparé.
export const SUPERGREG_SPEED_MULT = 10;          // multiplicateur de vitesse (trajet vers tâche uniquement)
export const SUPERGREG_DURATION_MS = 15 * 60 * 1000; // 15 min réelles
export const SUPERGREG_COOLDOWN_MS = 45 * 60 * 1000;  // 45 min réelles, démarre à la FIN de l'effet (décision Guillaume : 15+45=60 min entre deux prises)
export const SUPERGREG_COFFEE_COST = 1;          // unités de café consommées par activation

// --- Engrais (chantier 2026-07, suite plan validé) : ressource RARE achetée
// en or au shop (stock limité, se reconstitue tous les FERTILIZER_RESTOCK_EVERY_N_DAYS
// jours), stockée dans le pool commun sharedRef.current.gregStock.fertilizer
// (même esprit que gregStock.wood/stone) une fois achetée. Dépensée ensuite
// via un ordre à Greg ("gregFertilizeOrder", 1 engrais = 1 case) qui accélère
// la pousse d'une culture déjà plantée et non mûre. Prix extrapolés entre le
// coût d'une graine de blé (120) et celui du puits (600) : à ajuster au
// playtest si besoin (pas bloquant, voir plan).
export const FERTILIZER_BOOST_MS = 6 * H;           // temps de pousse retiré (fixe, quelle que soit la culture)
export const FERTILIZER_AREA_SIZE = 5;              // 1 engrais = 1 carré de FERTILIZER_AREA_SIZE x FERTILIZER_AREA_SIZE cases (centré sur le point choisi), demande 2026-07
export const FERTILIZER_COST = 150;                 // prix d'achat en or, à l'unité
export const FERTILIZER_RESTOCK_EVERY_N_DAYS = 2;   // cycle de réapparition dans le shop
export const FERTILIZER_SHOP_STOCK = 3;             // unités remises en stock à chaque réapparition

// --- Soan, l'employé pêcheur (chantier 2026-07, demande Guillaume : "ajouter
// un employé chargé d'aller pêcher du poisson quand je lui en donne l'ordre").
// Même modèle que Greg ci-dessus (engageable au shop, rôdaille permanente
// autour de son ancre tant qu'il n'a pas de tâche, état persistant unique
// `sharedRef.current.soan`), avec deux différences volontaires :
// - Contrat réel de SOAN_CONTRACT_MS = 24h (pas 2 jours comme Greg).
// - Pas d'ordre "sur N cases" façon gregOrder : un seul ordre possible
//   ("soanOrder"), qui l'envoie au bord de la rivière le plus proche de son
//   ancre (findRiverbankTile, fermeEngine.js — même principe de recherche en
//   anneaux que findClearableTiles) où il pêche ensuite EN CONTINU (peut y
//   rester toute la journée) jusqu'à un nouvel ordre ou l'expiration du
//   contrat, plutôt qu'une tâche qui se termine après N unités.
export const SOAN_HIRE_COST = 400;                  // même prix que Greg (aucun élément ne les distingue économiquement)
export const SOAN_CONTRACT_MS = 24 * 60 * 60 * 1000; // 24h réelles (demande explicite de Guillaume, contrairement aux 2 jours de Greg)
export const SOAN_SPEED = 3.2;                      // identique à GREG_SPEED
export const SOAN_ROAM_RADIUS = 6;                  // rôdaille autour de son ancre tant qu'il n'a pas reçu d'ordre
export const SOAN_ANCHOR = { x: 60, y: 58 };        // ancre de rôdaille, entre la maison (x=40) et la rivière (x~70-120 selon la seed)
export const SOAN_TASK_RANGE = 0.6;                 // distance d'arrivée avant de pêcher, identique à GREG_TASK_RANGE
export const SOAN_RIVER_SEARCH_RADIUS = 60;         // rayon de recherche d'une berge (findRiverbankTile) autour de SOAN_ANCHOR — large car la rivière est sinueuse et sa position dépend de la seed
// Cycle travail/pause (chantier 2026-07, demande Guillaume : "il doit travailler
// pendant 30 minutes straight, puis prendre une pause de 15 minutes, il ira
// marcher, puis se remet au travail, boucle pendant 24h") : une fois posté à
// la rivière, Soan alterne indéfiniment pêche/pause jusqu'à un rappel ou
// l'expiration de son contrat (24h réelles ci-dessus, aucun minuteur de cycle
// séparé n'est nécessaire — la boucle s'arrête d'elle-même avec le contrat).
export const SOAN_WORK_MS = 45 * 60 * 1000;         // FIX 246 : Soan travaille plus (30 -> 45 min de pêche d'affilée, demande Guillaume)
export const SOAN_BREAK_MS = 8 * 60 * 1000;         // FIX 246 : pauses plus courtes (15 -> 8 min), Soan travaille plus
export const SOAN_BREAK_ROAM_RADIUS = 8;            // amplitude de balade pendant la pause, autour de la berge où il pêche
export const SOAN_FISH_INTERVAL_MS = 20 * 1000;     // pêche EN CONTINU pendant un bloc de travail ("il pioche des poissons continûment", demande Guillaume) : une prise toutes les 20s réelles (extrapolé, pas de mini-jeu pour un PNJ, contrairement au joueur)

// Chantier 4 (feuille de route Greg + résidents, café d'Éthiopie) : mode
// "SuperSoan", miroir de SuperGreg (chantier 3) mais appliqué à la pêche.
// Soan ne se déplaçant pas pendant la pêche, le seul levier est la
// fréquence de capture : intervalle divisé par SUPERSOAN_CATCH_MULT pendant
// le mode actif (20s → 2s), pas de changement sur SOAN_WORK_MS/SOAN_BREAK_MS.
// Cooldown démarrant à la FIN du travail (pas d'ambiguïté ici, contrairement
// à SuperGreg). Stock de café PARTAGÉ avec SuperGreg (station.worldStock.coffee).
export const SUPERSOAN_CATCH_MULT = 10;           // multiplicateur de fréquence de pêche (divise l'intervalle entre 2 prises)
export const SUPERSOAN_DURATION_MS = 30 * 60 * 1000; // 30 min réelles
export const SUPERSOAN_COOLDOWN_MS = 60 * 60 * 1000;  // 1h réelle, démarre à la FIN de l'effet
export const SUPERSOAN_COFFEE_COST = 1;           // unités de café consommées par activation — MÊME pool que SuperGreg

// ---- Zip 260 : Harald, l'AGENT D'ÉLEVAGE (demande Guillaume) ----
// Engagé à la boutique comme Soan, contrat réel de 24h payé d'avance (1000 or).
// Fait des RONDES autour de l'enclos (PEN) et RAMASSE les productions des
// animaux dès qu'elles sont prêtes (readyAt) pour éviter toute perte — œufs,
// lait, laine, truffe. Tout va au POOL COMMUN de la ferme (gregStock.animals,
// exactement comme le bois de Greg / les poissons de Soan : vendable par
// n'importe quel joueur au bac/menu Vendre). Aucune séparation par joueur.
// HORS-LIGNE : à la reconnexion, rattrapage PLAFONNÉ par animal (voir plus
// bas), borné par la fin du contrat — voir E.haraldCatchup / updateHarald.
export const HARALD_HIRE_COST = 4000;                  // demande Guillaume : 4000 or / 24h (was 1000)
export const HARALD_CONTRACT_MS = 24 * 60 * 60 * 1000; // 24h réelles (comme Soan)
export const HARALD_SPEED = 3.2;                       // identique à Greg/Soan
export const HARALD_ANCHOR = { x: 52, y: 41 };         // centre de l'enclos (PEN x48-56 / y38-44)
export const HARALD_ROAM_RADIUS = 4;                   // rôdaille serrée : reste dans/autour de l'enclos
export const HARALD_ROUND_MS = 12 * 1000;              // une "ronde" de ramassage toutes les 12 s réelles quand connecté (zéro perte en pratique)
// Filet ANTI-PERTE : un animal prêt depuis plus longtemps que ça est ramassé
// où qu'il soit (couvre les animaux qu'Harald ne peut pas atteindre à pied —
// déplacés derrière une clôture, etc.). Garantit le zéro-perte même si le
// pathing échoue, tout en laissant Harald faire ses rondes visibles sinon.
export const HARALD_FORCE_MS = 45 * 1000;
// Plafonds de rattrapage HORS-LIGNE, PAR ANIMAL (demande Guillaume : "6 par
// gros animal, 20 par poule"). On crédite au pool commun autant de cycles de
// production écoulés pendant l'absence que le plafond l'autorise.
export const HARALD_OFFLINE_CAP_HEN = 20;              // poule (ponte rapide)
export const HARALD_OFFLINE_CAP_BIG = 6;               // chèvre/brebis/cochon/vache

// --- Lapins (chantier 2026-07, demande Guillaume : "ajouter des petits
// lapins bien détaillés qui fuient et sont inoffensifs, surtout rive
// droite"). Contrairement aux loups : présents de JOUR COMME DE NUIT (juste
// moins nombreux la nuit), totalement inoffensifs (aucune interaction
// d'attaque), et attrapables via l'outil "déplacer" existant (case 9) —
// capture "pour le fun", sans effet économique (le lapin est simplement
// retiré de la carte, aucun gain d'or/objet). Simulation HÔTE UNIQUEMENT,
// même esprit que les loups (voir updateRabbits dans FermeGame.js).
export const RABBIT_COUNT_DAY = 10;        // population cible de jour
export const RABBIT_COUNT_NIGHT = 3;       // population cible de nuit (plus discrets)
export const RABBIT_SPEED_SLOW = 0.9;      // rôde tranquillement (inchangé)
export const RABBIT_SPEED_FLEE = 4.6;      // fuite une fois repéré (relevé 2026-07, nettement plus rapide qu'un fermier)
export const RABBIT_ROAM_RADIUS = 5;       // amplitude de rôdaille autour de son point d'ancrage
export const RABBIT_FLEE_RANGE = 3;        // distance en dessous de laquelle un lapin risque d'être repéré
export const RABBIT_FLEE_COOLDOWN_MS = 3500; // durée d'une fuite avant de reprendre son activité
export const RABBIT_NOTICE_CHECK_MS = 800; // FIX 246 : jets de repérage moins fréquents (550 -> 800ms), lapins plus faciles à approcher
export const RABBIT_UNSEEN_CHANCE = 0.38;  // FIX 246 : "pas vus" plus généreux (0.2 -> 0.38), ramassage des lapins facilité (demande Guillaume)
export const RABBIT_CATCH_RANGE = 2.6;     // FIX 246 : portée de capture élargie (1.8 -> 2.6), lapins plus faciles à attraper
export const RABBIT_CATCH_PICK_RADIUS = 2.2;  // FIX 246 : rayon de ciblage souris d'un lapin (nearestPickableRabbit), élargi (1.3 -> 2.2)
export const RABBIT_CATCH_FLEE_GRACE = 1.1;   // FIX 246 : on peut quand même attraper un lapin qui vient de détaler s'il est TRÈS proche (<= cette distance)
export const RABBIT_MIN_HOUSE_DIST = 35;   // distance min. à la maison pour apparaître ("zones éloignées de la maison")
export const RABBIT_EAST_BIAS = 0.8;       // proba. de favoriser la rive droite à l'apparition ("surtout rive droite")
export const RABBIT_RESPAWN_MS = 7000;     // délai minimum entre deux réapparitions (repop progressif, pas instantané)
export const RABBIT_FLEE_HOP_PX = 5;       // amplitude (pixels) du bond visuel en fuite (demande 2026-07, roam inchangé)

// --- Défi "chasse aux lapins" : RETIRÉ (zip 366) ---
// Les lapins sont désormais simulés localement par chaque client, comme les
// canards décoratifs (voir updateRabbits dans FermeGame.js) : ils ne
// consomment plus aucun message temps réel. Une course au premier arrivé n'a
// donc plus de sens — chaque joueur voit des lapins différents.
// Pour un futur défi de chasse à plusieurs (intention de Guillaume), il
// faudra rétablir une synchronisation TEMPORAIRE des bêtes concernées pendant
// la durée du défi seulement. Le trophée ci-dessous est resté en place
// exprès, prêt à être réutilisé.
// Trophée 🏆 du gagnant (correctif 2026-07, demande Guillaume : "il doit
// disparaitre au bout de 15 minutes") : n'est plus permanent, affiché
// seulement pendant HAT_DISPLAY_MS après la victoire (voir farmer.hatUntil,
// même mécanique d'horodatage que injuredUntil).
export const HAT_DISPLAY_MS = 15 * 60 * 1000;    // durée d'affichage du trophée après une victoire. Zip 366 : plus aucune source ne l'attribue (défi lapins retiré) — mécanisme conservé intact pour un futur défi.

// --- Torche (chantier 2026-07) : objet équipable (bouton dédié, comme le
// sifflet à chevaux), pas un slot d'outil numéroté. Éclaire comme un
// lampadaire portatif (rayon plus modeste) et fait fuir les loups à portée.
export const TORCH_LIGHT_RADIUS = 4.5; // rayon éclairé autour du porteur (tuiles)

/* ==========================================================================
   2026-07 TRAIN STATION UPDATE (project language switched to English by
   Guillaume's decision). New systems: rare sea creatures, decorative ducks,
   the west-side train station with its ad board, the 25-visitor roster
   (nice / neutral / hostile / rich patrons), relationships, unanimous
   residency votes with a dice tiebreak, the co-op damage-repair minigame,
   the visitor blacklist, and seasons. All state lives in the save JSON
   (sharedRef.station), no Supabase migration required.
   ========================================================================== */

// --- Rare sea creatures (fishing) ---
// Caught with the rod like fish, but stored in their own inventory array
// (inv.seaCreatures) so old saves and every existing FISH consumer (Soan,
// Greg's stall, the salve recipe) stay untouched. Sell-only for now.
export const SEA_CREATURES = [
  { id: 0, name: "Étoile de mer", nameEn: "Starfish", sell: 360, color: "#e8956a", weight: 0.5 },
  { id: 1, name: "Hippocampe",    nameEn: "Seahorse", sell: 550, color: "#d4b83f", weight: 0.32 },
  { id: 2, name: "Anguille",      nameEn: "Eel",      sell: 780, color: "#5a7a5f", weight: 0.18 },
];
export const SEA_MIN_STREAK = 3;          // casts before rares become possible (mid-river)
export const SEA_CHANCE = 0.30;           // rare chance per cast once eligible
export const SEA_EXTREME_FRAC = 0.15;     // top/bottom 15% of map rows = "extreme ends" of the river
export const SEA_EXTREME_FIRST_CHANCE = 0.35; // rare chance at the extreme ends, from the very first cast

// --- Decorative ducks (purely cosmetic, client-side, seeded per farm) ---
export const DUCK_COUNT = 6;
export const DUCK_SPEED = 0.35;           // tiles/s drift along the river
export const DUCK_TURN_MIN_S = 4;         // seconds between direction changes
export const DUCK_TURN_MAX_S = 10;

// --- Train station (west edge, pre-built, free) ---
// Zip 232 redesign (Guillaume: "big square and ugly" -> smaller + cuter):
// footprint shrunk from 6x5 to 4x3, platform shortened, and the rails now
// run along the ENTIRE west border (they used to stop at row 46, cutting
// off at the bottom-left corner).
export const STATION = { x: 6, y: 25, w: 4, h: 3 };  // station building footprint
export const STATION_PLATFORM = { x: 4, y: 23, w: 2, h: 8 }; // platform strip along the rails
export const STATION_RAIL_X = 2;          // rails occupy columns RAIL_X..RAIL_X+1 (ONE wide track, see railL/railR)
export const STATION_RAIL_Y0 = 0;         // rails run from the very top...
export const STATION_RAIL_Y1 = MAP_H - 1; // ...to the very bottom of the map
export const STATION_SIGN = { x: 10, y: 28 };  // the interactive ad board (press E), east of the building
export const STATION_CLEAR = { x: 1, y: 21, w: 10, h: 12 }; // objects cleared here at load (host normalization; rails are cleared separately over their full length, see clearStationArea)

// Solid buildings (zip 232, Guillaume: "users can't walk through or behind"
// the station and the barn). Full DRAWN rectangles in tiles (including the
// roof rows above the footprint), checked by blockedTile/blockedTileMounted
// via solidBuildingAt (fermeEngine.js). The barn rect depends on its level
// (sprite sizes 48/72/170 px, see barnSprite in fermeArt.js); blockedTile
// reads the current level from world.barnLevel, refreshed every frame in
// updateMe (FermeGame.js).
export const STATION_BLOCK = { x: 6, y: 24, w: 4, h: 4 }; // building + roof row above it
export const BARN_BLOCKS = [
  { x: 66, y: 39, w: 3, h: 3 },  // level 1 (48px sprite)
  { x: 65, y: 37, w: 5, h: 5 },  // level 2 (72px sprite)
  // Zip 260 (demande Guillaume : la grange niv.3 "trop envahissante", "pouvoir
  // passer DERRIÈRE le toit") : la collision est réduite aux 2 rangées de BASE
  // (murs/fondations) au lieu du rectangle dessiné complet. Le toit (rangées
  // au-dessus) devient traversable ; le tri de profondeur des `draws` (barn
  // ancrée à (BARN_SITE.y+1)*T) masque déjà le perso quand il est derrière —
  // donc on passe derrière le toit sans le traverser au sol.
  { x: 64, y: 40, w: 6, h: 2 },  // level 3 : base seule (footprint mur), toit non-bloquant
];
// Zip 260 : zone de DÉGAGEMENT d'objets au gen de map pour la grange
// (rectangle DESSINÉ complet du plus grand palier, TOIT INCLUS) — distincte de
// la COLLISION (BARN_BLOCKS, réduite à la base au niv.3 pour passer derrière le
// toit). On garde l'empreinte d'avant afin de ne PAS semer d'arbres/rochers
// sous le toit de la grange (ils y resteraient solides et gâcheraient le
// "passage derrière").
export const BARN_CLEAR = { x: 64, y: 35, w: 6, h: 7 };
export const AD_FEE = 25;                 // gold per newly posted ad category (common chest)
export const AD_CATEGORIES = ["crops", "animal", "fish", "resources"];

// --- Zip 247 : les visiteurs qui EMMÉNAGENT se mettent au travail (demande
// Guillaume : "when they move in, they start working on the farm, based on
// what they promised to contribute when they convinced us to let them move
// in"). Chaque entrée du roster porte déjà un `theme` et un `job` (la
// promesse faite pendant le vote) : on mappe ce thème sur une contribution
// concrète, exécutée par l'HÔTE toutes les RESIDENT_WORK_MS (voir
// updateResidents dans FermeGame.js). Aucun nouveau sprite ni message
// réseau dédié : on réutilise les patchs `tiles`/`crops`/`gregStock`/`state`
// déjà gérés par applyDeltas.
export const RESIDENT_WORK_MS = 90 * 1000;   // une "journée de travail" toutes les 90 s réelles
export const RESIDENT_WATER_BATCH = 3;       // cultures arrosées par tour pour un résident des champs
export const RESIDENT_FISH_PER_SHIFT = 1;    // poissons ajoutés au stock commun par tour
export const RESIDENT_GOLD_PER_SHIFT = 12;   // or rapporté par tour (métiers non agricoles)
export const RESIDENT_TASK_BY_THEME = {
  fields: "crops", flowers: "crops",   // sèment/soignent -> arrosent les cultures assoiffées
  wood: "wood",                        // bûcheron -> abat un arbre, bois au stock commun
  stone: "stone",                      // carrier -> mine un rocher, pierre au stock commun
  river: "fish",                       // pêcheur/fumeur de poisson -> poisson au stock commun
  animals: "gold", kitchen: "gold", market: "gold", gold: "gold",
  style: "gold", shadow: "gold", train: "gold",
};

// --- Visitors ---
// 25 recurring named characters. Outfits reuse the existing charSheet
// pipeline: distinctness comes from gender x outfit(0-7) x overalls x cap,
// which yields well over 25 unique combinations without any new art asset.
// `edgy: true` doubles the hostile roll for that character; `rich: true`
// makes them eligible for rich-patron visits (big-money purchases).
// --- Zip 376 (chantier Carla Garfield) : la vendeuse de vêtements ---
// Carla Garfield n'est PAS un visiteur comme les autres, même si elle se
// présente comme tel pour l'instant. Trois particularités, toutes portées
// par des drapeaux du roster plutôt que par du code spécial dispersé :
//
//   `minArtisans` : elle ne monte dans le train que si la ferme compte déjà
//     au moins CARLA_MIN_ARTISANS résidents PORTEURS D'UN SKILL (voir
//     countSkilledResidents/spawnVisitor dans fermeEngine.js). Elle a entendu
//     parler d'une ferme qui tourne, pas d'un champ de patates.
//   `noStay`     : elle ne demandera JAMAIS à emménager, quel que soit le
//     niveau d'amitié (elle a une boutique et une vie ailleurs). Le second
//     chemin vers la résidence (bouton "proposer d'emménager" de la fiche
//     visiteur) est déjà fermé pour elle : il exige un `skill`, elle n'en a
//     pas.
//   `chatOnly`   : tant que la boutique de vêtements n'existe pas, elle ne
//     demande ni légumes ni troc — uniquement des visites de conversation,
//     avec ses propres répliques (carlaChatLines, fermeStrings.js).
//
// `look` remplace la série de booléens à usage unique (beeSuit, plaid,
// cheeseHat, sugarWorker...) : une CHAÎNE, un seul paramètre de plus à
// getChar, extensible sans rallonger la signature à chaque personnage.
export const CARLA_RID = 30;
export const CARLA_MIN_ARTISANS = 4;   // résidents à skill requis pour qu'elle daigne venir
// Léo n'est PAS une entité : sa position est DÉRIVÉE de celle de Carla
// (il marche dans ses pas avec ce retard, en unités de chemin parcouru, cf.
// le principe des loups posés sur la piste du défi de fuite). Zéro message
// réseau, aucune simulation, et il ne peut pas traverser un mur puisqu'il
// rejoue un chemin déjà validé par la collision.
export const LEO_FOLLOW_DIST = 1.3;    // tuiles de retard le long du chemin de Carla
export const LEO_TRAIL_MAX = 64;       // échantillons de chemin gardés (~4 s à vitesse de marche)
export const LEO_TRAIL_MIN_STEP = 0.05;// en deçà, on n'ajoute pas d'échantillon (Carla à l'arrêt)
export const LEO_TELEPORT_TILES = 3;   // saut plus grand = téléportation -> on vide la traîne
// Rembarrages de Carla à Léo : bulle purement cosmétique, jouée localement.
// L'indice de réplique est dérivé de Date.now() découpé en tranches de
// CARLA_SCOLD_MS : sans échanger un seul message, les deux joueurs voient la
// même phrase au même moment (même astuce que les cadences dérivées du
// jour de jeu, et pour la même raison : le quota).
export const CARLA_SCOLD_MS = 26 * 1000;
export const CARLA_SCOLD_SHOW_MS = 4200;
export const CARLA_SCOLD_LINES = 4;    // fr/en symétriques (carlaScoldLines)

export const VISITOR_ROSTER = [
  { rid: 0,  name: "Margot",   gender: "f", outfit: 3, overalls: false, cap: false, theme: "market",  job: "run a market stall" },
  // Zip 315 (chantier canne à sucre) : Theo devient Jérôme Martial, artisan
  // NOMMÉ à skill "sugarworker" (sucrier), sur le même modèle que René/Ingrid/
  // Tristan/Chloé. SKILL_BUILDING["sugarworker"] -> "sucrerie" ci-dessous.
  // Renommé "Grosdésir" -> "Martial" (chantier sucrerie, demande Guillaume).
  // `overalls: false` : son skin dédié (couleurs du drapeau martiniquais —
  // voir le flag `sugarWorker` dans fermeArt.js/drawCharFrame) dessine sa
  // propre chemise/pantalon par-dessus, la salopette générique ne servirait
  // à rien ici. `cap: true` est conservé : la casquette générique est déjà
  // verte (voir CAP dans drawCharFrame), donc cohérente telle quelle.
  { rid: 1,  name: "Jérôme Martial", gender: "m", outfit: 2, overalls: false, cap: true,  theme: "fields",  job: "press cane and cook sugar", skill: "sugarworker" },
  { rid: 2,  name: "Colette",  gender: "f", outfit: 4, overalls: false, cap: false, theme: "style",   job: "sew and dye clothes" },
  { rid: 3,  name: "Bastien",  gender: "m", outfit: 0, overalls: false, cap: false, theme: "gold",    job: "keep the farm ledgers", rich: true },
  { rid: 4,  name: "Odile",    gender: "f", outfit: 5, overalls: false, cap: true,  theme: "shadow",  job: "guard the farm at night", edgy: true },
  { rid: 5,  name: "Marcel",   gender: "m", outfit: 1, overalls: true,  cap: false, theme: "wood",    job: "carve furniture" },
  { rid: 6,  name: "Ines",     gender: "f", outfit: 6, overalls: false, cap: false, theme: "river",   job: "smoke and salt fish" },
  { rid: 7,  name: "Gustave",  gender: "m", outfit: 7, overalls: false, cap: true,  theme: "train",   job: "run the station clock" },
  { rid: 8,  name: "Perrine",  gender: "f", outfit: 0, overalls: true,  cap: false, theme: "animals", job: "care for the animals" },
  { rid: 9,  name: "Aurelien", gender: "m", outfit: 4, overalls: false, cap: false, theme: "gold",    job: "appraise gems", rich: true },
  { rid: 10, name: "Sidonie",  gender: "f", outfit: 1, overalls: false, cap: true,  theme: "kitchen", job: "cook for everyone" },
  { rid: 11, name: "Firmin",   gender: "m", outfit: 5, overalls: true,  cap: true,  theme: "stone",   job: "lay stone paths", edgy: true },
  { rid: 12, name: "Capucine", gender: "f", outfit: 2, overalls: true,  cap: false, theme: "flowers", job: "plant flower beds" },
  { rid: 13, name: "Honore",   gender: "m", outfit: 3, overalls: false, cap: true,  theme: "market",  job: "haggle with traders" },
  { rid: 14, name: "Lucille",  gender: "f", outfit: 7, overalls: true,  cap: false, theme: "river",   job: "ferry goods by boat" },
  { rid: 15, name: "Anselme",  gender: "m", outfit: 6, overalls: true,  cap: false, theme: "fields",  job: "breed better seeds" },
  // Zip 301 (demande Guillaume) : Rosalie devient une artisane NOMMÉE à skill
  // "breadmaker" (boulangère du pain et des viennoiseries), recrutable à la
  // gare comme Ingrid/Tristan. Elle partage la boulangerie (SKILL_BUILDING
  // "breadmaker" -> "bakery") avec Chloé la pâtissière. Outfit distinct de
  // Chloé (outfit 3) pour ne pas les confondre. Caractère aigri (voir
  // skillTalk). Production dans updateCrafts (pain + viennoiseries).
  { rid: 16, name: "Rosalie",  gender: "f", outfit: 5, overalls: true,  cap: true,  theme: "kitchen", job: "bake fresh bread and viennoiseries", skill: "breadmaker" },
  { rid: 17, name: "Edgar",    gender: "m", outfit: 2, overalls: false, cap: false, theme: "shadow",  job: "track wolves", edgy: true },
  { rid: 18, name: "Violette", gender: "f", outfit: 4, overalls: true,  cap: false, theme: "style",   job: "paint signs and murals" },
  { rid: 19, name: "Casimir",  gender: "m", outfit: 0, overalls: true,  cap: true,  theme: "wood",    job: "fell and replant trees" },
  { rid: 20, name: "Philomene",gender: "f", outfit: 5, overalls: true,  cap: false, theme: "gold",    job: "fund new buildings", rich: true },
  { rid: 21, name: "Ambroise", gender: "m", outfit: 1, overalls: false, cap: true,  theme: "train",   job: "haul freight crates" },
  { rid: 22, name: "Berthe",   gender: "f", outfit: 6, overalls: true,  cap: true,  theme: "animals", job: "shear and milk" },
  { rid: 23, name: "Leandre",  gender: "m", outfit: 7, overalls: true,  cap: false, theme: "stone",   job: "mine the far hills" },
  { rid: 24, name: "Zelie",    gender: "f", outfit: 0, overalls: false, cap: true,  theme: "flowers", job: "keep bees" },
  // Zip 252 (demande Guillaume) : artisans NOMMÉS. Ce sont des visiteurs
  // normaux (offres classiques), mais leur `skill` permet de leur proposer
  // d'emménager, et une fois résidents ils débloquent un métier (atelier
  // achetable en or à la boutique) ou travaillent directement pour nous.
  { rid: 25, name: "René",    gender: "m", outfit: 1, overalls: true,  cap: true,  theme: "flowers", job: "keep bees and jar honey",        skill: "beekeeper" },
  { rid: 26, name: "Ingrid",  gender: "f", outfit: 6, overalls: true,  cap: false, theme: "animals", job: "turn our milk into fine cheese", skill: "cheesemaker" },
  { rid: 27, name: "Tristan", gender: "m", outfit: 7, overalls: true,  cap: false, theme: "wood",    job: "fell trees and break rocks all day", skill: "lumberjack" },
  { rid: 28, name: "Chloé",   gender: "f", outfit: 3, overalls: true,  cap: true,  theme: "kitchen", job: "bake cakes and cookies",         skill: "baker" },
  // Zip 258 (demande Guillaume) : Eduardo Da Fonseca. Skin d'explorateur
  // extravagant (outfit 5 + chapeau, gender m). Son skill "voyager" (commerçant
  // grand voyageur) permet de l'accueillir comme résident ; une fois installé,
  // on lui passe commande de produits du monde depuis le menu Employés (voir
  // WORLD_GOODS / VOYAGE_*). Il se présente au village sur le dos d'un CHEVAL
  // BLANC (rendu : sprite horseWhite dessiné sous lui tant qu'il est visiteur).
  // Zip 259 (demande Guillaume) : il apparaît DÉSORMAIS aussi souvent que les
  // autres (le flag `rare` a été retiré) — il faut pouvoir le recruter.
  { rid: 29, name: "Eduardo Da Fonseca", gender: "m", outfit: 5, overalls: false, cap: true, theme: "market", job: "sail the world and bring back rare goods", skill: "voyager" },
  // Zip 376 (demande Guillaume) : Carla Garfield, vendeuse de vêtements.
  // outfit 1 : seule la couleur de CHEVEUX en est tirée (noir corbeau), le
  // reste du skin est entièrement repeint par `look: "carla"` (béret rouge,
  // manteau jaune, top noir). `cap: false` impératif : la casquette verte
  // générique se dessinerait par-dessus le béret.
  /* ⚠️⚠️ ZIP 427 — CARLA DEVIENT RECRUTABLE, ET C'EST UN CHANGEMENT DE STATUT,
     PAS UN RÉGLAGE. Le 376 lui avait posé `noStay: true` avec une raison
     explicite : « elle a une boutique et une vie ailleurs ». Cette raison
     tombe, parce que la boutique est maintenant ICI (TOWN_BOUTIQUE, en ville) —
     c'est exactement ce que Guillaume demande : « la boutique chic de Carla
     Garfield ... quand on aura accepté Carla Garfield comme résidente ».
     Deux drapeaux sautent donc, et pas un de plus :
       * `noStay` — sans lui, le chemin normal (amitié ≥ REL_RESIDENT_MIN, elle
         demande à rester) s'ouvre comme pour n'importe qui ;
       * `chatOnly` — le 376 le justifiait par « tant que la boutique n'existe
         pas ». Elle existe.
     `skill: "stylist"` ouvre le SECOND chemin (le bouton « proposer
     d'emménager » de la fiche visiteur, qui exige un skill).
     ⚠️ ET `SKILL_BUILDING.stylist` VAUT `null`, COMME LE VOYAGEUR : son lieu de
     travail n'est PAS un atelier achetable à la ferme, c'est un bâtiment de
     Valley Town qui existe déjà sur la carte. Lui inventer une échoppe de ferme
     aurait fait deux boutiques pour une seule vendeuse.
     `minArtisans` reste : elle ne se dérange toujours pas pour un champ de
     patates. */
  { rid: 30, name: "Carla Garfield", gender: "f", outfit: 1, overalls: false, cap: false, theme: "style", job: "dress this valley properly", look: "carla", skill: "stylist", minArtisans: CARLA_MIN_ARTISANS },
];
// Poids de spawn d'un visiteur "rare" (aucun personnage n'est marqué `rare`
// depuis le zip 259, mais la mécanique reste dispo pour un futur usage).
export const RARE_VISITOR_WEIGHT = 0.25;

// Zip 278 (demande Guillaume) : quand un hostile À SKILL est mis en
// blacklist, on ne le bannit plus pour de bon — il revient sous un nom
// d'emprunt (voir resolveBlacklist / covers dans newStationState). Noms
// piochés dans ce pool, séparés par genre pour rester cohérents avec le
// sprite (déjà fixé par le rid d'origine, seul le nom affiché change).
export const COVER_NAMES = {
  m: ["Anatole", "Baptiste", "Cyprien", "Emile", "Florian", "Gaspard", "Hippolyte", "Isidore", "Justin", "Lazare", "Maxence", "Norbert", "Octave", "Prosper", "Quentin"],
  f: ["Adeline", "Blanche", "Céleste", "Delphine", "Estelle", "Fantine", "Georgine", "Henriette", "Iris", "Josephine", "Louison", "Marceline", "Noelle", "Ophelie", "Solange"],
};

// ---- Zip 252 : métiers d'artisans (résidents à skill) ----
// Indices d'élevage utilisés comme intrants (voir ANIMALS ci-dessus).
export const HEN_ANIMAL = 0;   // œufs = products[0]
export const COW_ANIMAL = 4;   // lait  = products[4]
// Ateliers achetables en or À LA BOUTIQUE, seulement quand l'artisan
// correspondant est résident. Posés automatiquement au site indiqué (sur la
// ferme, non bloquants — on interagit par proximité). Tristan (bûcheron) n'a
// PAS d'atelier : il travaille directement dès qu'il emménage.
export const ARTISAN_BUILDINGS = {
  beehive:    { skill: "beekeeper",   cost: 6000,  site: { x: 50, y: 46 }, w: 2, h: 2 },
  fromagerie: { skill: "cheesemaker", cost: 12000, site: { x: 56, y: 46 }, w: 3, h: 2 },
  bakery:     { skill: "baker",       cost: 9000,  site: { x: 62, y: 46 }, w: 3, h: 2 },
  // Zip 260 (demande Guillaume) : la scierie du bûcheron devient un vrai
  // bâtiment achetable (10000 or), au même titre que les autres. Purement
  // ancrage de métier : aucune production auto (Tristan abat les arbres via
  // son thème "wood", voir updateResidents), mais achetable/déplaçable/solide.
  sawmill:    { skill: "lumberjack",  cost: 10000, site: { x: 68, y: 46 }, w: 3, h: 2 },
  // Chantier "sucrerie déplaçable" (2026-07, demande Guillaume) : rejoint le
  // modèle des autres bâtiments d'artisans (voir commentaire SUCRERIE_SITE
  // plus haut). Footprint volontairement plus PETIT (2x2) que le sprite
  // pixel-exact (95x88 natif) : seule la maison en pierre (façade/porte) est
  // solide, tonneaux/pressoir/tas de canne débordent hors du footprint et
  // restent traversables, comme demandé par Guillaume ("on peut passer à
  // travers, pareil pour les tonneaux").
  sucrerie:   { skill: "sugarworker", cost: SUCRERIE_COST, site: SUCRERIE_SITE, w: 2, h: 2 },
};
// Zip 261 (demande Guillaume : "ils doivent être plus grands, on dirait des
// stickers") : facteur d'agrandissement au DESSIN des bâtiments d'artisans
// (le sprite est dessiné à sa taille × ce facteur, ancré par le bas-centre).
// N'affecte PAS la collision (footprint w×h en tuiles inchangé).
// Zip 264 : les sprites de bâtiments d'artisans sont désormais le port EXACT
// du .html (plus détaillés, dessinés à ~46 px de large en natif au lieu de 38).
// L'ancien facteur 1.75 sur ces gros sprites les rendait « stickers » ; on
// descend à 1.15 pour un rendu cohérent avec le footprint (3 tuiles ≈ 48 px).
// Ajuster ICI si Guillaume veut les grossir/réduire d'un bloc.
export const ARTISAN_DRAW_SCALE = 1.15;
// Zip 264 : ligne de contact au sol DANS le sprite (coord. y de la base du
// bâtiment, avant mise à l'échelle). Le rendu ancre ce y sur le bas du
// footprint (au lieu du bas de la toile), pour que les bâtiments ne flottent
// pas malgré des toiles plus hautes que le bâtiment (fumée/toit/drapeau au-
// dessus, tommes/scie/établi débordant devant). Défaut = hauteur de la toile.
export const ARTISAN_FOOT = { beehive: 31, fromagerie: 62, bakery: 62, sawmill: 58, sucrerie: 72 };
// Chantier "sucrerie déplaçable" : deux réglages PAR BÂTIMENT (au lieu de
// globaux) pour que la sucrerie garde EXACTEMENT son ancrage/échelle déjà
// validés (copie pixel-exacte du mockup, zip 320) une fois branchée sur le
// pipeline générique de rendu des artisans (voir FermeGame.js) :
//  - ARTISAN_FACE_X : abscisse (native, avant mise à l'échelle) de la
//    "façade" dans le sprite, centrée sur le footprint au rendu — PAS le
//    centre géométrique de l'image (le sprite sucrerie est asymétrique :
//    façade à x=36, pressoir plus loin à droite). Absent pour un bid ->
//    repli sur bimg.width/2 (comportement actuel inchangé pour beehive/
//    fromagerie/bakery/sawmill, dessinés symétriques par construction).
export const ARTISAN_FACE_X = { sucrerie: 36 };
//  - ARTISAN_DRAW_SCALE_OVERRIDE : remplace C.ARTISAN_DRAW_SCALE pour un bid
//    donné. La sucrerie reste à l'échelle 1 (taille NATIVE), pour ne pas
//    altérer le rendu "copie pixel-exacte" validé par Guillaume — les autres
//    bâtiments gardent ARTISAN_DRAW_SCALE (1.15) comme avant.
export const ARTISAN_DRAW_SCALE_OVERRIDE = { sucrerie: 1 };
// Métier -> bâtiment (null = pas de bâtiment, travaille directement).
// voyager (Eduardo) : pas de bâtiment, il travaille par voyages (commandes).
// Zip 260 : lumberjack -> sawmill (le bûcheron s'ancre/rôde autour de sa
// scierie une fois construite ; sinon rôde près du spawn comme avant).
// Zip 301 : breadmaker (Rosalie) partage la boulangerie de baker (Chloé).
// Zip 427 : `stylist` (Carla) rejoint `voyager` du côté `null` — son lieu de
// travail est la boutique de Valley Town, pas un atelier de ferme à acheter.
// Voir la note de son entrée dans VISITOR_ROSTER.
export const SKILL_BUILDING = { beekeeper: "beehive", cheesemaker: "fromagerie", baker: "bakery", breadmaker: "bakery", lumberjack: "sawmill", voyager: null, sugarworker: "sucrerie", stylist: null };
// Cadences de production (ms réelles) et valeurs de vente (or).
// Zip 258 (demande Guillaume : "le miel est une denrée rare") : cadence ÷3
// (4 min -> 12 min entre deux pots) et prix du pot fortement relevé à 7000.
// C'est le produit passif le plus lent et le plus cher du jeu, assumé.
export const HONEY_MS = 20 * 60 * 1000;    export const HONEY_SELL = 7000;  // ruche : passif, aucun intrant (denrée rare — zip 301b : 1 pot / 20 min, demande Guillaume)
// Zip 327 (demande Guillaume) : rendement du miel selon la saison en cours
// (voir SEASONS/seasonOf). Multiplicateur appliqué à la CADENCE de René
// (intervalle = HONEY_MS / mult) — hiver à 0 = aucune production tant que la
// saison dure (le cycle reste gelé, pas de perte, voir reneHoneyMs dans
// FermeGame.js). Pas de sous-palier "fin d'été" : tout l'été est un pic.
export const HONEY_SEASON_MULT = { winter: 0, autumn: 0.5, spring: 1, summer: 1.5 };

// Point d'ancrage de rôdaille de l'apiculteur (René) : centre du bâtiment
// beehive (site 2x2 à x:50,y:46), pour qu'il reste autour de sa ruche au lieu
// de se balader près du spawn comme les autres résidents.
export const BEEKEEPER_ANCHOR = { x: 51, y: 47 };
// Chantier 2026-07 (demande Guillaume : "René doit être envoyé récolter de
// temps en temps, comme Soan, avec des pauses") : miroir du système de blocs
// travail/pause de Soan (SOAN_WORK_MS/SOAN_BREAK_MS), adapté au rythme du
// miel (1 pot / 12 min, voir HONEY_MS) — un bloc de travail laisse le temps de
// produire plusieurs pots avant la pause.
// Zip suivant (demande Guillaume) : cycle porté à 1h de travail / 15 min de
// pause dans l'état normal (avant : 45 min de travail).
export const BEEKEEPER_WORK_MS = 60 * 60 * 1000;  // durée d'un bloc de récolte actif (1h)
export const BEEKEEPER_BREAK_MS = 15 * 60 * 1000; // durée de la pause avant de pouvoir reprendre (ou renvoyer manuellement via le bouton "Envoyer récolter")
// Zip 327 (demande Guillaume) : René a aussi des phases "renfermé"/bougon,
// indépendantes de son cycle travail/pause — un cycle de mauvaise humeur
// récurrent (bulles sèches, affichées rarement, voir FermeGame.js) qui
// alterne avec ses phases normales (bulles joyeuses existantes).
export const RENE_GRUMPY_CYCLE_MS = 50 * 1000;    // durée totale d'un cycle d'humeur
export const RENE_GRUMPY_DURATION_MS = 15 * 1000; // dont ce temps (au début du cycle) est bougon

// Zip suivant (demande Guillaume) : "SuperRené" — donner un café à René
// (apiculteur) déclenche un effet prolongé pendant lequel il travaille EN
// CONTINU (aucune pause) ET produit du miel bien plus vite. Miroir de
// SuperGreg/SuperSoan (café), mais paramètres propres à René. Le café est
// puisé dans le MÊME stock commun station.worldStock.coffee que Greg/Soan.
export const SUPERRENE_DURATION_MS = 5 * 60 * 60 * 1000;  // 5h réelles de travail continu (décision Guillaume)
export const SUPERRENE_COOLDOWN_MS = 10 * 60 * 60 * 1000; // 10h réelles, démarre à la FIN de l'effet ; entre-temps René reprend son cycle normal
export const SUPERRENE_COFFEE_COST = 2;   // unités de café consommées au TOTAL par activation (MÊME pool que SuperGreg/SuperSoan)
// Zip suivant (demande Guillaume) : René "a besoin de deux cafés, donc deux
// clics" — contrairement à Greg/Soan (1 clic = 1 café = effet immédiat), le
// 1er clic sur reneCoffee consomme 1 café et arme une jauge (res.coffeeGauge
// = 1, res.coffeeGaugeAt = horodatage) ; le 2e clic consomme le 2e café et
// déclenche l'effet (miroir gregCoffee). Si le 2e café n'arrive pas dans ce
// délai, la jauge expire (redémarre à 0 au clic suivant) — vérifié
// paresseusement (pas de timer serveur dédié), et affiché côté UI par simple
// comparaison Date.now() (même principe que le badge ☕⚡ de superUntil).
export const RENE_COFFEE_GAUGE_TIMEOUT_MS = 60 * 1000; // 1 minute (décision Guillaume)
export const SUPERRENE_HONEY_MULT = 3;    // zip 301b (demande Guillaume : x10 trop cheaté) : ×3 pendant l'effet café
export const CHEESE_MS = 6 * 60 * 1000;    export const CHEESE_MILK_COST = 3; // fromagerie : 3 laits -> 1 roue OU du beurre (zip 301)
// Zip suivant (demande Guillaume : "augmenter drastiquement le rendement en
// beurre de la fromagerie") : chaque fournée qui tombe côté beurre (selon le
// ratio réglé par le joueur, voir butterPct/ratioAcc plus bas) produit
// désormais FROMAGERIE_BUTTER_YIELD mottes d'un coup au lieu d'une seule.
// Le fromage (cheeseWheel) n'est pas concerné, seule la branche beurre.
export const FROMAGERIE_BUTTER_YIELD = 8;
export const CHEESE_WHEEL_SELL = 1500;     export const CHEESE_PORTION_SELL = 350; export const PORTIONS_PER_WHEEL = 6;
// Zip 301 (demande Guillaume) : la fromagerie d'Ingrid produit désormais du
// FROMAGE **et** du BEURRE, à la même cadence (CHEESE_MS) et au même coût de
// lait (CHEESE_MILK_COST). Le joueur règle la PROPORTION de beurre par paliers
// de 10 % (crafts.fromagerie.butterPct, 0..100) dans la fiche d'Ingrid ; un
// accumulateur (crafts.fromagerie.ratioAcc) répartit la sortie de façon exacte
// sur la durée. Le beurre est une denrée vendable ET l'intrant des
// viennoiseries de Rosalie (voir plus bas).
export const BUTTER_SELL = 300;                 // prix de vente d'une motte de beurre
// Zip suivant (bug signalé par Guillaume : "le beurre n'apparaît jamais dans
// le shop") : Rosalie tourne toutes les ROSALIE_MS (1 min 30) et engloutit
// IMMÉDIATEMENT tout beurre disponible dès qu'il y en a ≥ 1 (CROISSANT_BUTTER)
// pour ses croissants/chocolatines, alors que la fromagerie n'en produit
// qu'au mieux toutes les CHEESE_MS (6 min) selon le ratio réglé — le beurre
// n'a donc jamais le temps de s'accumuler ni d'être vu/vendu par le joueur.
// Cette réserve est mise de côté, jamais consommée par Rosalie, pour que le
// beurre reste effectivement une denrée vendable comme prévu (zip 301).
export const BUTTER_SELL_RESERVE = 3;
export const FROMAGERIE_BUTTER_PCT_DEFAULT = 0; // zip 301b (demande Guillaume) : défaut = 100 % fromage (comportement historique préservé) ; le beurre n'apparaît qu'une fois le ratio réglé dans la fiche d'Ingrid
export const FROMAGERIE_RATIO_STEP = 10;         // paliers de réglage du ratio (10 %)
// Zip suivant (demande Guillaume : "Ingrid doit pouvoir faire des yaourts
// maintenant, nature et vanille") : filière YAOURT de la fromagerie,
// INDÉPENDANTE du ratio fromage/beurre ci-dessus, avec son propre minuteur
// (crafts.fromagerie.yogurtNextAt) — même principe que le pain/viennoiseries
// de Rosalie, filière séparée dans le même bâtiment que la pâtisserie de
// Chloé (voir bk.breadNextAt plus bas). Nature : lait seul. Vanille : lait +
// vanille (gousse de Madagascar, station.worldStock.vanilla) + sucre
// (s.sugar, sucrerie). Alternance STRICTE 1 pot sur 2 en vanille tant que le
// stock de vanille/sucre suffit (crafts.fromagerie.yogurtVanillaTurn) ; repli
// sur nature sans faire avancer le tour si les intrants manquent, pour que
// la proportion se rattrape dès que le stock revient (décision Guillaume).
export const YOGURT_MS = 3 * 60 * 1000;    // cadence d'un pot (moitié du fromage, décision Guillaume)
export const YOGURT_MILK_COST = 1;         // lait par pot, nature ou vanille
export const YOGURT_VANILLA_COST = 1;      // gousse de vanille EN PLUS du lait, pot vanille seulement
export const YOGURT_SUGAR_COST = 1;        // sac de sucre EN PLUS du lait, pot vanille seulement
export const YOGURT_NATURE_SELL = 130;     // prix de vente d'un pot nature
export const YOGURT_VANILLA_SELL = 190;    // prix de vente d'un pot vanille (assomption de départ, à ajuster avec Guillaume)
// Zip 258 (demande Guillaume) : la boulangerie tourne 3× plus vite (3 min ->
// 1 min entre deux fournées) mais UNIQUEMENT en journée (voir BAKERY_*_MIN).
export const PASTRY_MS = 1 * 60 * 1000;    // cadence d'une fournée de Chloé (1 min)
// Zip suivant (demande Guillaume) : Chloé abandonne les "pâtisseries"
// génériques pour 4 PRODUITS NOMMÉS, en rotation (même principe que les
// viennoiseries de Rosalie) — chacun avec ses propres intrants :
//   - Éclair au chocolat  : farine + lait + œufs + chocolat (cacao d'Eduardo)
//   - Éclair à la vanille : farine + lait + œufs + vanille (Madagascar) +
//     fève de tonka (remplace l'ancienne "pâtisserie à la vanille")
//   - Flan pâtissier à la vanille de Madagascar : farine + lait + œufs +
//     vanille + fève de tonka
//   - Gâteau basque : farine + lait + œufs + vanille + beurre (fromagerie d'Ingrid)
// Toutes tournent à la même cadence (PASTRY_MS) ; Chloé produit le premier
// item réalisable en parcourant la rotation, comme Rosalie pour le pain.
export const ECLAIR_CHOCO_FLOUR = 1, ECLAIR_CHOCO_MILK = 1, ECLAIR_CHOCO_EGG = 4, ECLAIR_CHOCO_COCOA = 1;
export const ECLAIR_CHOCO_BATCH = 8, ECLAIR_CHOCO_SELL = 700;
export const ECLAIR_VANILLA_FLOUR = 1, ECLAIR_VANILLA_MILK = 1, ECLAIR_VANILLA_EGG = 4, ECLAIR_VANILLA_VANILLA = 1, ECLAIR_VANILLA_TONKA = 1;
export const ECLAIR_VANILLA_BATCH = 8, ECLAIR_VANILLA_SELL = 900; // prix inchangé vs l'ancienne pâtisserie vanille
export const FLAN_VANILLA_FLOUR = 1, FLAN_VANILLA_MILK = 2, FLAN_VANILLA_EGG = 5, FLAN_VANILLA_VANILLA = 1, FLAN_VANILLA_TONKA = 1;
export const FLAN_VANILLA_BATCH = 6, FLAN_VANILLA_SELL = 850;
export const GATEAU_BASQUE_FLOUR = 1, GATEAU_BASQUE_MILK = 1, GATEAU_BASQUE_EGG = 4, GATEAU_BASQUE_VANILLA = 1, GATEAU_BASQUE_BUTTER = 1;
export const GATEAU_BASQUE_BATCH = 6, GATEAU_BASQUE_SELL = 1200; // le plus premium (beurre en plus)

// ---- Zip 301 (demande Guillaume) : Rosalie, boulangère (pain + viennoiseries) ----
// Rosalie travaille dans la MÊME boulangerie que Chloé (bakery), mais sur une
// filière distincte : le PAIN (farine seule, toujours disponible) et les
// VIENNOISERIES (croissants = farine+beurre ; chocolatines & pains suisses =
// farine+beurre+chocolat). Le "chocolat" est la fève de cacao rapportée par
// Eduardo (WORLD_GOODS "cocoa", station.worldStock.cocoa). Les viennoiseries
// ne se produisent QUE si l'on dispose de beurre (filière débloquée par la
// fromagerie d'Ingrid) — d'où l'ordre "commence par le fromager/beurre".
// Même contrainte horaire que la pâtisserie (journée, voir BAKERY_*_MIN).
export const ROSALIE_MS = 90 * 1000;       // cadence d'une fournée de Rosalie (1 min 30)
// Pain (farine de blé seule pour l'instant ; farine de seigle à venir).
export const BREAD_FLOUR = 1, BREAD_BATCH = 4, BREAD_SELL = 120;
// Croissant : farine + beurre.
export const CROISSANT_FLOUR = 1, CROISSANT_BUTTER = 1, CROISSANT_BATCH = 6, CROISSANT_SELL = 180;
// Chocolatine & pain suisse : farine + beurre + chocolat (cacao).
export const CHOCO_FLOUR = 1, CHOCO_BUTTER = 1, CHOCO_COCOA = 1, CHOCO_BATCH = 6;
export const CHOCOLATINE_SELL = 260, PAINSUISSE_SELL = 260;

// ---- Zip suivant (demande Guillaume) : clients automatiques le matin +
// prix réglables par produit de boulangerie ----
// Chaque matin (mêmes horaires d'ouverture que la boulangerie, jusqu'à
// BAKERY_CUSTOMER_MORNING_END_MIN), des clients viennent automatiquement
// acheter un des produits de Chloé/Rosalie dans le stock commun, sans
// action du joueur : un produit tiré au hasard parmi ceux en stock, une
// quantité aléatoire, payée au prix courant (réglé par le joueur ou le prix
// par défaut ci-dessous) et créditée à la caisse commune.
export const BAKERY_SELL_ITEMS = ["bread", "croissant", "chocolatine", "painSuisse", "eclairChoco", "eclairVanilla", "flanVanilla", "gateauBasque"];
export const BAKERY_DEFAULT_PRICE = { bread: BREAD_SELL, croissant: CROISSANT_SELL, chocolatine: CHOCOLATINE_SELL, painSuisse: PAINSUISSE_SELL, eclairChoco: ECLAIR_CHOCO_SELL, eclairVanilla: ECLAIR_VANILLA_SELL, flanVanilla: FLAN_VANILLA_SELL, gateauBasque: GATEAU_BASQUE_SELL };
export const BAKERY_CUSTOMER_MORNING_END_MIN = 11 * 60; // 11h00 : après ça, plus de clients spontanés
export const BAKERY_CUSTOMER_MS = 45 * 1000;             // cooldown normal entre deux VRAIES ventes (une fois qu'une rencontre a eu lieu)
export const BAKERY_CUSTOMER_QTY_MIN = 1, BAKERY_CUSTOMER_QTY_MAX = 3; // quantité achetée par passage
// Correctif "vraie rencontre" (2026-07, demande Guillaume) : la vente du
// matin ne se déclenche plus à l'aveugle sur un simple minuteur — il faut
// qu'un visiteur soit RÉELLEMENT à proximité de Chloé ou Rosalie visible
// devant la boulangerie (voir bakeryEncounterPossible, FermeGame.js). Si
// personne n'est là au moment du tirage, on retente bientôt
// (BAKERY_CUSTOMER_RETRY_MS, plus court que le cooldown normal) plutôt que
// d'attendre le plein cycle pour rien.
export const BAKERY_CUSTOMER_ENCOUNTER_DIST = 2.5; // distance visiteur <-> boulangère pour compter comme une vraie rencontre
export const BAKERY_CUSTOMER_RETRY_MS = 6 * 1000;  // nouvelle tentative si personne n'était là
// Prix réglables : le joueur peut ajuster chaque prix entre 50 % et 200 %
// du prix par défaut ci-dessus, par paliers de 10 % (mêmes paliers que le
// ratio beurre de la fromagerie).
export const BAKERY_PRICE_STEP_PCT = 10;
export const BAKERY_PRICE_MIN_PCT = 50, BAKERY_PRICE_MAX_PCT = 200;

// ---- Zip suivant (demande Guillaume) : Chloé et Rosalie marchent trop —
// l'une des deux doit rentrer dans la boulangerie (invisible) le temps d'un
// "service", puis ressortir pendant que l'autre y va, en alternance ; parfois
// les deux sont dehors en même temps (jamais les deux dedans en même temps).
// Voir updateBakeryVisibility (FermeGame.js).
export const BAKERY_INSIDE_MIN_MS = 25 * 1000,  BAKERY_INSIDE_MAX_MS = 70 * 1000;  // durée d'un passage à l'intérieur
export const BAKERY_OUTSIDE_MIN_MS = 15 * 1000, BAKERY_OUTSIDE_MAX_MS = 45 * 1000; // durée d'un passage dehors avant de retenter d'entrer
export const BAKERY_ENTER_CHANCE = 0.5; // probabilité de rentrer à l'échéance "dehors" (sinon reste dehors un tour de plus)

// Zip suivant (demande Guillaume) : scènes Chloé/Rosalie (voir
// L.chloeRosalieScenes). Déclenchées quand la bulle "rare" de Rosalie a
// bouclé 2 cycles à portée du joueur ET que Chloé n'est pas "à l'intérieur"
// (res.hidden) de la boulangerie. Cooldown 5 min réelles après chaque scène.
export const CHLOE_ROSALIE_SCENE_COOLDOWN_MS = 5 * 60 * 1000;
export const CHLOE_ROSALIE_TRIGGER_CYCLES = 3; // nombre de bulles négatives de Rosalie (à portée du joueur) avant que Chloé réagisse
export const CHLOE_ROSALIE_SCENE_V11_CHANCE = 1 / 18; // variante rare (René), ~1 fois sur 18
export const CHLOE_ROSALIE_CONVO_DIST = 1.8; // distance max (cases) pour déclencher/jouer une scène — "distance conversationnelle"

// Chantier "rivalité Tristan/Jérôme" (2026-07, demande Guillaume) : les deux
// artisans se détestent et se provoquent périodiquement — même moteur que
// Chloé/Rosalie (storming + scène de bulles séquencées), mais avec une issue
// possible réellement impactante (bagarre -> ITT). Voir residentRoam
// (res.storming/res.stormKind==="tj") et updateTristanJeromeFeud.
export const TRISTAN_RID = 27; // rid VISITOR_ROSTER de Tristan (bûcheron)
export const JEROME_RID = 1;   // rid VISITOR_ROSTER de Jérôme Martial (sucrerie)
export const TJ_STORM_PERIOD_MS = 2 * DAY_REAL_MS; // ~48h in-game entre deux tentatives de provocation (départ en trombe vers le stand adverse)
export const TJ_CONVO_DIST = 1.8; // distance de "face à face", identique à Chloé/Rosalie
export const TJ_BRAWL_CHANCE = 0.3; // jet de bagarre à CHAQUE étape de tension (tant qu'ils sont à portée), pas une seule fois par rencontre
// Demande Guillaume : Jérôme lâche parfois (pas systématiquement) une
// interjection créole ("Kisa i ka di mwen ?") juste avant de répondre à une
// remarque vexante de Tristan — tirée au moment du déclenchement de la
// scène, voir residentRoam (branche isTj).
export const TJ_JEROME_INTERJECTION_CHANCE = 0.35;
export const TJ_BRAWL_ITT_MS = DAY_REAL_MS; // 24h in-game d'indisponibilité (immobile devant son stand) pour le perdant

// Chantier "bagarre = vrai événement, en public" (2026-07, demande
// Guillaume) : dès que le jet de bagarre (TJ_BRAWL_CHANCE) tombe positif, la
// résolution n'est plus immédiate — on ouvre une fenêtre "imminente"
// (tjBrawl.imminent) pendant laquelle TOUS les résidents et visiteurs
// présents (hors Tristan/Jérôme eux-mêmes) accourent former un attroupement
// autour du clash et commentent, inquiets (voir triggerTjCrowdReaction,
// updateTjCrowd, tjCrowdLines dans fermeStrings.js). Le JOUEUR, lui, garde
// entièrement le contrôle de ses déplacements — contrairement à l'ancien
// correctif "gel du joueur" (TJ_GAWK_*, retiré), c'est la foule de PNJ qui
// réagit, pas lui. La bagarre se résout à la fin de cette fenêtre
// (TJ_BRAWL_IMMINENT_DELAY_MS après le jet), le temps que l'attroupement se
// forme et réagisse avant l'issue.
// Retour Guillaume (durées de la scène) : la montée de tension (répliques
// "#%!&" échangées par Tristan/Jérôme, voir tristanJeromeScenes) doit durer
// ~10s AU TOTAL, quel que soit le nombre de répliques de la scène tirée au
// sort (4 à 8 lignes selon tristanJeromeScenes) — la durée de CHAQUE étape
// est donc calculée dynamiquement (TJ_TENSION_TOTAL_MS / nombre de lignes)
// plutôt que fixée par ligne. La bagarre elle-même (une fois le jet positif,
// pendant que l'attroupement regarde) doit ensuite durer AU MOINS 15s avant
// résolution (TJ_BRAWL_IMMINENT_DELAY_MS) — suivie d'un mot de la fin
// (TJ_REACT_AFTER_MS) : ~10s tension + ~15s bagarre + ~6s mot de la fin =
// altercation visible ~31s tout compris.
// Zip 368 (demande Guillaume : "les répliques de Tristan et Jérôme
// s'enchaînent un peu vite") : 10 000 -> 22 000 (×2,2, valeur choisie par
// Guillaume). La durée d'UNE réplique est calculée par division (voir stepMs
// dans residentRoam) : les scènes font de 4 à 10 répliques, donc la réplique
// moyenne passe d'environ 1,4 s à 3,1 s. La bagarre
// (TJ_BRAWL_IMMINENT_DELAY_MS) et le mot de la fin (TJ_REACT_AFTER_MS) sont
// inchangés : la scène complète passe d'environ 31 s à environ 43 s.
export const TJ_TENSION_TOTAL_MS = 22000; // durée totale visée pour la montée de tension (répartie sur les répliques de la scène)
export const TJ_BRAWL_IMMINENT_DELAY_MS = 15000; // durée de la bagarre elle-même (au moins 15s), une fois le jet de bagarre positif
export const TJ_REACT_STAGGER_MIN_MS = 0;    // décalage avant qu'UN PNJ donné se mette en route : borne basse
export const TJ_REACT_STAGGER_MAX_MS = 1600; // décalage avant qu'UN PNJ donné se mette en route : borne haute (l'attroupement ne part pas tout d'un bloc)
export const TJ_REACT_GATHER_MIN_DIST = 1.6; // distance au clash à laquelle un PNJ s'arrête pour regarder : borne basse (forme un attroupement, pas un tas)
export const TJ_REACT_GATHER_MAX_DIST = 3.2; // idem, borne haute
export const TJ_REACT_SPEED_MUL = 1.35; // pas pressé (curieux/inquiet) mais pas le sprint de l'instigateur (storming, ×1.9)
// Chantier "T/J courent un peu moins vite l'un vers l'autre" (2026-07,
// demande utilisateur) : Tristan/Jérôme partageaient jusqu'ici le MÊME sprint
// que Chloé/Rosalie (×1.9, storming). Nouveau multiplicateur DÉDIÉ, plus
// lent : plus rapide qu'une marche standard (×1) mais nettement en retrait du
// sprint Chloé/Rosalie. Chloé/Rosalie restent inchangées à ×1.9 (voir isTj
// dans residentRoam, FermeGame.js).
export const TJ_STORM_SPEED_MUL = 1.4;
export const TJ_REACT_RETURN_SPEED_MUL = 0.55; // rythme du retour tranquille vers l'activité d'avant, une fois la scène finie
export const TJ_REACT_LINE_PERIOD_MS = 2800; // cycle d'affichage des commentaires inquiets pendant l'attroupement (même principe que skillTalk)
// Zip suivant (retour Guillaume : bulles de l'attroupement illisibles à
// plusieurs, elles se chevauchent) : au lieu que TOUT l'attroupement parle en
// permanence en même temps, on répartit l'affichage en 3 "tours" tournants
// (rid % TJ_REACT_TALK_SLOTS) — un seul tiers de la foule montre sa bulle à
// la fois, le reste attend son tour (voir le rendu, boucle résidents/visiteurs).
export const TJ_REACT_TALK_SLOTS = 3;
// Zip 368 (demande Guillaume : "la lisibilité est mauvaise pour les
// commentaires du public. Afficher deux fois moins de commentaires du public,
// et moins simultané"). Les 3 tours tournants ci-dessus répartissaient déjà
// l'affichage, mais TOUTE la foule finissait par parler. Ici, un PNJ sur
// TJ_REACT_TALK_EVERY seulement commente la scène — les autres restent
// muets du début à la fin. Sélection par `rid % TJ_REACT_TALK_EVERY`, donc
// DÉTERMINISTE et identique chez tous les joueurs (aucun message réseau, et
// pas de bavard différent d'un écran à l'autre).
// Réglage retenu par Guillaume : 2, soit un commentateur sur deux, ce qui
// divise par deux à la fois le NOMBRE de commentaires et le nombre de bulles
// affichées simultanément. Mettre 1 pour revenir au comportement du zip 363.
export const TJ_REACT_TALK_EVERY = 2;
export const TJ_REACT_AFTER_MS = 6000; // mot de la fin affiché avant de repartir, une fois la bagarre résolue (voir TJ_BRAWL_IMMINENT_DELAY_MS pour le total ~30s)
// Chantier v363 "plus aucun PNJ figé" (bug remonté par Guillaume : Eduardo
// « reste figé et ne circule plus ») : l'attroupement se déplace en LIGNE
// DROITE, sans pathfinding (voir residentRoam/tjReact et updateTjCrowdVisitor).
// Un PNJ dont la ligne droite est coupée par un obstacle massif (bâtiment,
// clôture) n'atteignait donc JAMAIS son point de rassemblement ni son point de
// retour : la phase ne se terminait pas, `tjReact` n'était jamais effacé, et le
// PNJ restait bloqué à vie (plus de rôdaille, plus de déplacement — il
// continuait juste à travailler). On borne désormais chaque phase dans le
// temps : à l'échéance, le PNJ abandonne PROPREMENT (il s'arrête sur place pour
// la phase d'aller = il regarde de loin, et il reprend sa rôdaille normale pour
// la phase de retour). Aucun téléport, donc aucun saut visible à l'écran.
export const TJ_REACT_MOVE_TIMEOUT_MS = 9000;   // délai max pour rejoindre l'attroupement, après son décalage de départ (TJ_REACT_STAGGER_*)
export const TJ_REACT_RETURN_TIMEOUT_MS = 12000; // délai max pour regagner sa position d'avant la scène (rythme de retour tranquille, ×0.55)

// Chantier "relations entre résidents" (2026-07, demande Guillaume : "des
// petites infos qui peuvent changer au fil de l'histoire") : table légère
// d'affinités/inimitiés affichée dans la fiche de présentation (Q). Purement
// informatif pour l'instant (aucun impact gameplay), pensée pour évoluer :
// on pourra plus tard modifier ces listes suite à des événements narratifs
// (réconciliation, nouvelle brouille...) sans toucher au reste du moteur.
// Clé = rid VISITOR_ROSTER du résident ; allies/enemies = rids d'autres
// résidents. Pas besoin d'être symétrique dans le code (on affiche l'union
// des deux sens à l'écran, voir residentAffinitiesFor), mais on le garde
// symétrique ici par lisibilité.
export const RESIDENT_AFFINITIES = {
  [JEROME_RID]: { enemies: [TRISTAN_RID], allies: [26] },   // Jérôme Martial : hostile avec Tristan, ami avec Ingrid
  [TRISTAN_RID]: { enemies: [JEROME_RID], allies: [25] },   // Tristan : hostile avec Jérôme, ami avec René
  25: { allies: [TRISTAN_RID], enemies: [16] },             // René : ami avec Tristan, en froid avec Rosalie
  26: { allies: [JEROME_RID] },                             // Ingrid : amie avec Jérôme
  16: { enemies: [25] },                                    // Rosalie : en froid avec René
};
// Renvoie { allies: [rid...], enemies: [rid...] } pour un résident donné, en
// fusionnant les relations déclarées dans les deux sens (ex. si A liste B en
// ami, B est considéré ami de A même si son entrée ne le répète pas).
export function residentAffinitiesFor(rid) {
  const allies = new Set((RESIDENT_AFFINITIES[rid] && RESIDENT_AFFINITIES[rid].allies) || []);
  const enemies = new Set((RESIDENT_AFFINITIES[rid] && RESIDENT_AFFINITIES[rid].enemies) || []);
  for (const [otherRid, rel] of Object.entries(RESIDENT_AFFINITIES)) {
    const or = Number(otherRid); if (or === rid) continue;
    if ((rel.allies || []).includes(rid)) allies.add(or);
    if ((rel.enemies || []).includes(rid)) enemies.add(or);
  }
  return { allies: [...allies], enemies: [...enemies] };
}
export const TJ_BRAWL_HEAL_STEP_MS = TJ_BRAWL_ITT_MS / 2; // chaque pansement retire la moitié de l'ITT restante (2 pansements pour guérir complètement)
export const TJ_BRAWL_COOLDOWN_MS = DAY_REAL_MS; // verrou supplémentaire ENTRE DEUX BAGARRES (pas entre toutes les altercations) : 24h in-game après une bagarre avant qu'une nouvelle puisse se produire

// Retour Guillaume (chantier bulles/dispute plus faciles) : le cycle "rare"
// de la bulle de Rosalie (3s parlée / silence) était calé sur 12s au total
// (9s de silence), ce qui la faisait paraître sous-déclenchée ET ralentissait
// d'autant le compteur de cycles qui lance la dispute (2 cycles à portée du
// joueur). Ramené à 6s au total (3s parlée / 3s silence) pour Rosalie
// uniquement — le cycle de René (RENE_GRUMPY_*, phases bougonnes) reste
// inchangé à 12s, les deux ne partagent que le flag booléen "rare", pas cette
// constante de durée (piège déjà rencontré au zip 327).
export const ROSALIE_RARE_TALK_PERIOD_MS = 6000; // durée totale d'un cycle (parlée + silence)
export const ROSALIE_RARE_TALK_SHOW_MS = 3000;   // partie "parlée" du cycle
export const ROSALIE_LINE_RECULE_WEIGHT = 2; // "Recule" (dernière réplique du pool breadmaker) a 2x plus de chances de sortir que chacune des autres

// ---- Zip 280 (bijouterie, demande Guillaume) ----
// Contrairement aux autres ateliers (beehive/fromagerie/bakery/sawmill), la
// bijouterie n'est PAS liée à un résident/métier : n'IMPORTE QUEL joueur
// connecté peut designer un lot une fois le bâtiment acheté (état partagé
// station.jewelry, voir newStationState). Chaque lot est une pièce UNIQUE
// (pas de production passive, pas de cadence) : le joueur choisit le type,
// la matière (une gemme, au choix parmi celles en stock), la découpe
// (purement cosmétique, sert à l'aperçu) et fixe LIBREMENT son prix de
// vente — chaque pièce finie est donc vendue individuellement à son propre
// prix (pas un prix fixe par type comme miel/fromage/pâtisserie).
export const JEWELRY_COST = 15000; // achat du bâtiment (pot commun), une fois pour toutes
export const JEWELRY_TYPES = [
  { id: "earrings",  name: "Boucles d'oreilles", nameEn: "Earrings",   gold: 2 },
  { id: "bracelet",  name: "Bracelet",           nameEn: "Bracelet",   gold: 3 },
  { id: "necklace",  name: "Collier",            nameEn: "Necklace",   gold: 4 },
  { id: "chain",     name: "Chaîne en or",       nameEn: "Gold chain", gold: 5 },
];
// Découpe : purement cosmétique (aucune incidence sur coût/prix), sert
// uniquement à varier l'aperçu visuel généré dans la scène de design.
export const JEWELRY_SHAPES = [
  { id: "round",  name: "Ronde",   nameEn: "Round" },
  { id: "square", name: "Carrée",  nameEn: "Square" },
  { id: "heart",  name: "Cœur",    nameEn: "Heart" },
  { id: "star",   name: "Étoile",  nameEn: "Star" },
];
// Une pièce consomme 1 gemme (au choix du joueur, n'importe quel type parmi
// C.GEMS) + l'or indiqué par JEWELRY_TYPES[].gold ci-dessus, tous deux
// prélevés sur le pool COMMUN (s.gems / s.gregStock.gold).
export const JEWELRY_GEM_COST = 1;
// Horaires d'ouverture de la boulangerie (minutes dans la journée de jeu).
// La pâtissière ne produit qu'entre 5h30 et 19h00 ; hors de cette plage, le
// four est éteint (aucune production, aucune alerte). Le jour de jeu commence
// à 6h (DAY_START_MIN) donc 5h30 = ouverture effective dès le lever.
export const BAKERY_OPEN_MIN = 5 * 60 + 30;  // 5h30
export const BAKERY_CLOSE_MIN = 19 * 60;     // 19h00
export const LUMBERJACK_WOOD = 6, LUMBERJACK_STONE = 4; // Tristan : par tour de travail -> réserve commune (gregStock)
// Zip 278 (demande Guillaume : "il doit couper du bois + transformer le bois
// en planches") : à CHAQUE tour de travail, en plus d'abattre un arbre et
// casser un rocher (ci-dessus), Tristan tente aussi une conversion — si la
// réserve commune a au moins LUMBERJACK_PLANK_WOOD_COST de bois, il en
// consomme cette quantité pour produire LUMBERJACK_PLANK_YIELD planches
// (gregStock.planks, même pool commun que bois/pierre). Pas de conversion ce
// tour-là si le stock de bois est insuffisant — il continuera d'accumuler du
// bois au fil des tours suivants jusqu'à pouvoir convertir à nouveau.
export const LUMBERJACK_PLANK_WOOD_COST = 4, LUMBERJACK_PLANK_YIELD = 2;

/* ==========================================================================
   Chantier "Super Tristan" (2026-07, demande Guillaume, effet café comique)
   --------------------------------------------------------------------------
   Miroir de SuperGreg/SuperSoan/SuperRené (même pool commun de café,
   station.worldStock.coffee) mais façon "effet magique assumé" plutôt que
   simple boost de vitesse : donner SUPERTRISTAN_COFFEE_COST cafés D'UN COUP
   à Tristan (bûcheron) déclenche, pendant SUPERTRISTAN_DURATION_MS, la
   disparition progressive d'environ SUPERTRISTAN_CLEAR_FRACTION (la moitié)
   des arbres/cailloux de LA CARTE ENTIÈRE (pas juste autour de son ancre de
   travail habituelle) — voir pickSuperTristanTargets (fermeEngine.js) et
   updateSuperTristan (FermeGame.js). Le bois/la pierre récupérés rejoignent
   la réserve commune (gregStock), comme son travail normal. La nature
   repousse ensuite normalement au fil des jours (voir newDay).
   ------------------------------------------------------------------------- */
export const SUPERTRISTAN_COFFEE_COST = 20;            // unités de café consommées EN UNE FOIS (pas de jauge à cafés multiples, contrairement à SuperRené)
export const SUPERTRISTAN_DURATION_MS = 15 * 60 * 1000; // 15 min réelles : durée sur laquelle la moitié de la nature de la carte disparaît
export const SUPERTRISTAN_COOLDOWN_MS = 60 * 60 * 1000; // 1h réelle, démarre à la FIN de l'effet (avant un nouveau bain de café)
export const SUPERTRISTAN_CLEAR_FRACTION = 0.5;         // proportion des arbres/cailloux de la carte visés
export const SUPERTRISTAN_BATCH_MS = 4000;              // intervalle entre deux "vagues" d'abattage pendant l'effet (répartit la liste sur les 15 min)

/* ==========================================================================
   Zip 258 : Eduardo Da Fonseca, commerçant grand voyageur (demande Guillaume)
   --------------------------------------------------------------------------
   Une fois Eduardo résident, on lui commande des PRODUITS DU MONDE rares
   depuis le menu Employés. Chaque produit appartient à un PALIER DE DISTANCE
   (moyen / lointain) qui pilote à la fois le prix (buy × multiplicateur) et la
   durée du voyage (en JOURS de jeu). Il part au moins 2 jours, revient avec la
   commande + parfois une surprise, le tout déposé dans la réserve commune
   (station.worldStock). On peut ensuite revendre ces produits au marché
   ("assez cher", WORLD_GOODS[].sell) — l'usage en pâtisseries vanillées/
   chocolatées viendra plus tard (demande Guillaume : "à voir à l'avenir").
   Liste volontairement resserrée (6 produits, demande Guillaume), cacao et
   gousses de vanille de Madagascar inclus.
   ========================================================================== */
// Paliers de distance : mult = multiplicateur de prix, days = durée du voyage
// en jours de jeu (1 jour de jeu = DAY_REAL_MS). "proche" est prévu pour de
// futurs produits ; aucun produit de la liste actuelle n'y est rattaché.
export const VOYAGE_TIERS = {
  proche:   { mult: 1.0, days: 2 },
  moyen:    { mult: 1.5, days: 3 },
  lointain: { mult: 2.0, days: 4 },
};
// key   : identifiant interne (clé de station.worldStock)
// tier  : palier de distance (VOYAGE_TIERS)
// buy   : prix de base par unité (avant multiplicateur de distance) payé à Eduardo
// sell  : prix de revente par unité au marché (bac/boutique) — "assez cher"
export const WORLD_GOODS = [
  // Zip 301b (demande Guillaume) : cacao, café et vanille servent d'INTRANTS
  // (viennoiseries, cafés Super*, pâtisseries à la vanille). Leurs prix bruts
  // d'achat ET de vente sont fortement réduits — l'intérêt économique vient
  // désormais de leur TRANSFORMATION par les artisans, pas de la revente brute.
  { key: "vanilla",  name: "Gousse de vanille (Madagascar)", nameEn: "Vanilla pod (Madagascar)", tier: "moyen",    buy: 300, sell: 260,  emoji: "\u{1F33F}" },
  { key: "coffee",   name: "Café d'Éthiopie",                nameEn: "Ethiopian coffee",          tier: "moyen",    buy: 200, sell: 200,  emoji: "☕" },
  { key: "cinnamon", name: "Cannelle de Ceylan",             nameEn: "Ceylon cinnamon",           tier: "moyen",    buy: 260, sell: 620,  emoji: "\u{1F90E}" },
  { key: "cocoa",    name: "Fève de cacao",                  nameEn: "Cocoa bean",                tier: "lointain", buy: 250, sell: 250,  emoji: "\u{1F36B}" },
  { key: "pineapple",name: "Ananas",                         nameEn: "Pineapple",                 tier: "lointain", buy: 250, sell: 600,  emoji: "\u{1F34D}" },
  { key: "coconut",  name: "Noix de coco",                   nameEn: "Coconut",                   tier: "lointain", buy: 180, sell: 450,  emoji: "\u{1F965}" },
  // Zip suivant (demande Guillaume) : fève de tonka, intrant des bases
  // vanillées de Chloé (éclairs vanille + flans vanille), aux côtés de la
  // vanille de Madagascar.
  { key: "tonka",    name: "Fève de tonka",                  nameEn: "Tonka bean",                tier: "lointain", buy: 180, sell: 180,  emoji: "\u{1FAD8}" }, // prix baissé (demande Guillaume, initialement 280/280, jugé trop cher)
];
// Prix unitaire d'une commande (payé d'avance) = buy × mult du palier, arrondi.
export function worldGoodUnitCost(good) {
  const t = VOYAGE_TIERS[good.tier] || VOYAGE_TIERS.proche;
  return Math.round(good.buy * t.mult);
}
export const VOYAGE_DAY_MS = DAY_REAL_MS;   // 1 jour de jeu = durée réelle d'un jour
export const VOYAGE_MAX_QTY = 30;           // garde-fou : quantité max par produit et par commande
export const VOYAGE_SURPRISE_CHANCE = 0.5;  // probabilité qu'Eduardo ramène une surprise en plus
export const VOYAGE_SURPRISE_MIN = 1, VOYAGE_SURPRISE_MAX = 3; // quantité de la surprise
// Ancre de rôdaille d'Eduardo quand il est au village (près de la gare/mairie).
// ATTENTION (constat v363) : cette constante n'est PAS utilisée — elle n'est
// lue nulle part dans le code. Eduardo a `SKILL_BUILDING.voyager = null`, donc
// artisanAnchor() renvoie null pour lui et residentRoam le traite comme un
// résident GÉNÉRIQUE : il rôde autour de C.SPAWN, sur le large rayon 9×7, avec
// le comportement social complet (rendez-vous / petits groupes de discussion).
// Choix assumé, conservé en v363 : c'est le seul résident monté (cheval blanc)
// et le seul sans atelier — un grand circuit à cheval au milieu des autres est
// bien plus cohérent qu'un piétinement sur un anneau de 3 cases dans un champ
// vide au nord de la carte (et il garderait perdu ses rendez-vous sociaux,
// réservés aux résidents non ancrés). Gardée ici uniquement au cas où l'on
// voudrait un jour lui donner un poste fixe.
export const VOYAGER_ANCHOR = { x: 40, y: 12 };

/* ==========================================================================
   Zip 259 : exclusion d'un résident (kick-out) + retour de l'ex-résident
   (demande Guillaume).
   --------------------------------------------------------------------------
   Depuis le menu Employés/Résidents, on peut voter l'exclusion d'un résident
   (unanimité des joueurs en ligne ; immédiat en solo), ce qui libère sa
   maison. L'ex-résident revient ensuite, entre 2 et 15 minutes réelles plus
   tard, sous forme de visiteur spécial (offer.type "plea") avec une réaction
   figée à l'exclusion : "touching" (touchante, implore une révision),
   "bitter" (aigrie/méchante) ou "healthy" (réaction saine et posée). Un index
   de variante (vi) est tiré à l'exclusion pour choisir le texte exact, stable
   d'une session à l'autre. On peut alors le réintégrer (oui, si une maison est
   libre) ou refuser (non).
   ========================================================================== */
export const KICK_RETURN_MIN_MS = 2 * 60 * 1000;   // délai min avant le retour de l'ex-résident
export const KICK_RETURN_MAX_MS = 15 * 60 * 1000;  // délai max
// Humeurs possibles au retour, avec leur poids relatif de tirage.
export const EXILE_MOODS = ["touching", "bitter", "healthy"];
export const EXILE_MOOD_WEIGHTS = { touching: 3, bitter: 2, healthy: 2 };
// Nombre de variantes de texte par humeur (doit correspondre aux tableaux
// exilePlea/exileYes/exileNo de fermeStrings.js). Sert à tirer un index valide.
export const EXILE_VARIANT_COUNTS = { touching: 4, bitter: 4, healthy: 3 };
// Certains visiteurs arrivent en RÉCLAMANT du fromage (roue ou parts) contre
// une grosse somme, prélevée sur la réserve commune craftStock.
export const VISITOR_CHEESE_CHANCE = 0.18;      // part des offres "buy" converties en demande de fromage
export const CHEESE_DEMAND_WHEEL_MIN = 1, CHEESE_DEMAND_WHEEL_MAX = 3;
export const CHEESE_DEMAND_WHEEL_PAY = 2200;    // or par roue payé par le visiteur (mieux qu'au bac)
export const CHEESE_DEMAND_PORTION_PAY = 520;   // or par part

// Visit scheduling. Not a fixed timer: after each visit the host schedules
// the next one in [VISIT_MIN_MS, VISIT_MAX_MS], then SHORTENS that delay by
// VISIT_AD_BONUS_MS per posted ad and by a popularity bonus (capped) that
// grows as the farm gets more established (buildings, animals, house level,
// total gold earned). So ads AND organic popularity both bring people in.
export const VISIT_MIN_MS = 4 * 60 * 1000;
export const VISIT_MAX_MS = 9 * 60 * 1000;
export const VISIT_AD_BONUS_MS = 40 * 1000;       // per posted ad category
export const VISIT_POP_BONUS_MAX_MS = 3 * 60 * 1000; // popularity cap
export const VISITOR_SPEED = 2.4;                 // tiles/s walking
export const VISITOR_TRAIN_MS = 4500;             // train pulls in, doors, etc.
export const VISITOR_WAIT_MS = 90 * 1000;         // legacy base wait (still the formula seed, now FLOORED below)
export const VISITOR_NET_MS = 750;                // host broadcast throttle (zip 264: 500 -> 750, ~2 Hz -> ~1.33 Hz) pour visiteurs ET résidents baladeurs. Le rendu invité lisse ces PNJ via smoothNpc (glide+extrapolation, cf. FIX 246) : 1.33 Hz reste parfaitement fluide. Combiné à l'AOI-gate (zip 264), c'est le plus gros levier contre la fuite « résidents diffusés en continu ».
// 2026-07 visitors update (zip 233, Guillaume's spec):
export const VISITORS_MAX = 5;                    // hard cap of visitors on the farm at once
// Zip 298 (demande Guillaume) : garantie d'apparition des artisans dont l'activité
// est difficile à lancer si on ne les voit jamais — Ingrid (fromagère, rid 26) et
// Tristan (bûcheron, rid 27). S'ils ne sont pas apparus au bout de PITY_ARTISAN_MS
// de jeu CONTINU (session courante) et qu'ils ne sont pas déjà résidents, leur
// venue est forcée à la prochaine visite hors plage nocturne.
export const PITY_ARTISAN_RIDS = [26, 27];
export const PITY_ARTISAN_MS = 30 * 60 * 1000;    // 30 minutes de jeu continu
export const VISITOR_WAIT_FLOOR_MS = 10 * 60 * 1000;   // 10 real minutes, hard FLOOR for every visit type
export const VISITOR_WAIT_MAX_MS = 45 * 60 * 1000;     // ceiling: even "prep" orders never linger longer
export const VISITOR_WANDER_AFTER_MS = 30 * 60 * 1000; // after 30 real minutes waiting, they stroll around
export const VISITOR_EASY_STOCK_BIAS = 0.65;      // chance a buy order targets something already in stock
export const VISITOR_GIFT_CHANCE = 0.45;          // chance a "prep" order pays a GIFT on top of the gold
// Zip 250 (demande Guillaume) : fin des "promesses en l'air". Pour un cadeau
// qui va dans le SAC (graine / objet utile / animal), 8/10 des visiteurs le
// remettent DIRECTEMENT au moment du deal ; les 2/10 restants repartent en
// promettant de "l'envoyer", et le cadeau est déposé dans le sac du joueur
// concerné 3 à 5 min APRÈS le départ du visiteur (voir promisedGifts). Les
// décorations gardent leur mécanique propre (non concernées par ce partage).
export const VISITOR_GIFT_DIRECT_CHANCE = 0.8;         // 8/10 : cadeau remis sur-le-champ
export const VISITOR_GIFT_DELAY_MIN_MS = 3 * 60 * 1000; // 2/10 : livraison différée, borne basse
export const VISITOR_GIFT_DELAY_MAX_MS = 5 * 60 * 1000; // ...borne haute (après le départ)
// Unique gift catalogues (never purchasable). Decorations and pets cannot be
// granted yet (personal houses / pet system are still deferred): they queue
// in station.pendingGifts (persisted, see migrateStation) until those ship.
export const UNIQUE_SEED_CROPS = [6, 7];          // indexes in CROPS with unique: true

/* ===========================================================================
   ZIP 388 — LES FLEURS EN POTS
   ---------------------------------------------------------------------------
   Demande de Guillaume : « ajouter aux cadeaux de visiteurs des fleurs
   décoratives » puis, à la question posée, « oublie les pots ; seulement des
   fleurs qui viennent dans des pots. Autant de variété que possible, tous les
   types. Très beau. »

   Il n'y a donc PAS de catégorie "pot" séparée : le pot est le socle commun
   de toutes les fleurs, et c'est lui qui donne au catalogue son unité — comme
   la guimauve donne son unité au sol du Pays des Bonbons (zip 385).

   POURQUOI SEIZE. Le catalogue n'en comptait que TROIS (gnome, fontaine, roue
   solaire) alors que 35 % des cadeaux "prep" et 17 % des trocs sont des
   décorations. Un joueur qui reçoit trente cadeaux repart avec dix gnomes.
   C'est la cause racine du « on accumule trop de décorations dans notre
   bag » — la vente (voir DECOR_SELL) traite le symptôme, la variété traite la
   cause. À seize fleurs + trois anciennes, la probabilité de recevoir deux
   fois la même passe de 1/3 à 1/19.

   CHAMPS. `shape` choisit la silhouette de la floraison, `pot` la teinte du
   pot, `sell` le prix de revente (voir DECOR_SELL). Les trois anciennes
   décorations n'ont pas de `shape` : decorSprite (fermeArt.js) garde pour
   elles son dessin d'origine, AU PIXEL PRÈS. Une entrée sans `shape` et sans
   dessin dédié retomberait sur le gnome — jamais sur une case vide : un
   catalogue étendu sans habillage doit être terne, pas cassé (règle du
   zip 386, drawBridgeTile).

   Les seize `shape` ne sont pas seize dessins recopiés : ce sont NEUF formes
   florales (coupe, rayons, grappe, épi, clochette, rose, trompette, pompon,
   cactus) paramétrées par une palette et une hauteur. C'est ce qui rend
   `render-flowers.mjs` capable de les juger côte à côte.
   =========================================================================== */
export const UNIQUE_DECORATIONS = [
  // --- les trois d'origine (zip 233/251), inchangées au pixel près
  { id: "gnome",    name: "Gnome farceur",       nameEn: "Prankster gnome", sell: 320 },
  { id: "fountain", name: "Fontaine de cristal", nameEn: "Crystal fountain", sell: 400 },
  { id: "sunwheel", name: "Roue solaire",        nameEn: "Sun wheel",       sell: 360 },
  // --- zip 388 : seize fleurs en pots.
  //     shape  = silhouette de la floraison (voir flowerPotSprite, fermeArt.js)
  //     bloom  = couleur vive de la fleur   bloom2 = seconde teinte / cœur
  //     leaf   = feuillage                  pot    = terre du pot
  //     tall   = la tige monte plus haut (tournesol, iris, jacinthe…)
  { id: "f_tulips",    name: "Tulipes",         nameEn: "Tulips",            shape: "cup",
    bloom: "#e2456b", bloom2: "#f58aa4", leaf: "#4a8f3c", pot: "#b5623c", sell: 90 },
  { id: "f_roses",     name: "Rosier",          nameEn: "Rose bush",         shape: "rose",
    bloom: "#c8203f", bloom2: "#ea5f78", leaf: "#3d7a34", pot: "#9c5334", sell: 120 },
  { id: "f_sunflower", name: "Tournesol",       nameEn: "Sunflower",         shape: "ray", tall: true, single: true,
    bloom: "#f2c42e", bloom2: "#6b4218", leaf: "#4a8f3c", pot: "#b5623c", sell: 110 },
  { id: "f_daisies",   name: "Marguerites",     nameEn: "Daisies",           shape: "ray",
    bloom: "#f6f3ea", bloom2: "#e8c23a", leaf: "#579c46", pot: "#c8b49a", sell: 70 },
  { id: "f_lavender",  name: "Lavande",         nameEn: "Lavender",          shape: "spike",
    bloom: "#8a6ec8", bloom2: "#b8a2e0", leaf: "#7d9c72", pot: "#c0a68a", sell: 85 },
  { id: "f_orchid",    name: "Orchidée",        nameEn: "Orchid",            shape: "pad", tall: true,
    bloom: "#d75fae", bloom2: "#f7e2f0", leaf: "#3f7a46", pot: "#e8e4dc", sell: 130 },
  { id: "f_daffodils", name: "Jonquilles",      nameEn: "Daffodils",         shape: "trumpet",
    bloom: "#f4d548", bloom2: "#e88a24", leaf: "#4f9440", pot: "#b5623c", sell: 80 },
  { id: "f_hyacinth",  name: "Jacinthe",        nameEn: "Hyacinth",          shape: "spike", tall: true,
    bloom: "#4a72d0", bloom2: "#89a6ea", leaf: "#4a8f3c", pot: "#7b8fa8", sell: 95 },
  { id: "f_peony",     name: "Pivoine",         nameEn: "Peony",             shape: "pom",
    bloom: "#f2a0c0", bloom2: "#fbd8e6", leaf: "#3d7a34", pot: "#e8e4dc", sell: 115 },
  { id: "f_hydrangea", name: "Hortensia",       nameEn: "Hydrangea",         shape: "cluster",
    bloom: "#7e8fd8", bloom2: "#c0a2e0", leaf: "#3d7a34", pot: "#9c5334", sell: 105 },
  { id: "f_pansies",   name: "Pensées",         nameEn: "Pansies",           shape: "pad",
    bloom: "#6f3fa0", bloom2: "#f4d548", leaf: "#579c46", pot: "#c8b49a", sell: 75 },
  { id: "f_geranium",  name: "Géranium",        nameEn: "Geranium",          shape: "cluster",
    bloom: "#d8283c", bloom2: "#f26a6a", leaf: "#4a8f3c", pot: "#b5623c", sell: 85 },
  { id: "f_carnations",name: "Œillets",         nameEn: "Carnations",        shape: "pom",
    bloom: "#e0489c", bloom2: "#f6a8cf", leaf: "#4f9440", pot: "#c0a68a", sell: 90 },
  { id: "f_iris",      name: "Iris",            nameEn: "Iris",              shape: "bell", tall: true,
    bloom: "#5a3fa8", bloom2: "#f4d548", leaf: "#4a8f3c", pot: "#7b8fa8", sell: 100 },
  { id: "f_poppies",   name: "Coquelicots",     nameEn: "Poppies",           shape: "cup",
    bloom: "#e02a24", bloom2: "#2a2320", leaf: "#579c46", pot: "#c8b49a", sell: 70 },
  { id: "f_cactus",    name: "Cactus fleuri",   nameEn: "Flowering cactus",  shape: "cactus",
    bloom: "#f0609c", bloom2: "#f9b0cc", leaf: "#3f8a52", pot: "#c07a4a", sell: 95 },
];
// Zip 388 : la carte des prix de revente, dérivée du catalogue. Voir
// resolveSellDecor (fermeEngine.js) — l'hôte lit CETTE table, jamais un prix
// venu du client.
export const DECOR_SELL = Object.fromEntries(UNIQUE_DECORATIONS.map(d => [d.id, d.sell | 0]));
export const DECOR_SELL_DEFAULT = 60;             // filet : une déco future sans prix reste vendable
export const UNIQUE_PETS = [
  { id: "dragon",  name: "Dragonneau",     nameEn: "Baby dragon" },
  { id: "unicorn", name: "Licorne",        nameEn: "Unicorn" },
  { id: "skunk",   name: "Moufette chic",  nameEn: "Fancy skunk" },
];

// --- Zip 236: pets are now INDIVIDUAL to each player (Guillaume: "pets we
// collect ... each player can have maximum two pets. In order to get a new
// one, they have to set one they already have free in the wild"). Unified
// catalog keyed by id so the bag can render/name any pet regardless of
// source (visitor gift OR passage world). `hue` drives the generic pet
// sprite tint (fermeArt.js/petSprite); `body` picks a silhouette.
// Zip 367 (demande Guillaume : "permettre d'avoir 4 animaux en simultane, et
// plus seulement 2") : 2 -> 4. Toute la chaine etait deja parametree par cette
// constante (sac, resolveCatchPet, migrateFarmer .slice, textes FR/EN "n / max")
// -- SAUF l'eventail de suivi de drawPetsFor, qui supposait exactement deux
// pets (`i === 0 ? -0.45 : 0.45`) : corrige dans le meme zip, voir FermeGame.js.
//
// Zip 368 (demande Guillaume : "pouvoir garder ses animaux personnels dans son
// bag, et pouvoir les WALK en les choisissant : up to 4 pets at once") : les
// deux notions sont désormais SÉPARÉES.
//   MAX_PETS         = ce qu'on peut POSSÉDER, rangé dans le sac ;
//   MAX_PETS_WALKING = ce qu'on peut sortir EN BALADE en même temps.
// Valeurs retenues par Guillaume : 8 et 4. Un familier porte un drapeau `out`
// (voir resolveSetPetWalking/migrateFarmer, fermeEngine.js) ; seuls les
// familiers en balade sont dessinés et diffusés aux autres joueurs. La règle
// du zip 236 (« pour en attraper un nouveau, il faut en relâcher un ») ne
// mord donc plus qu'à 8, et la collection devient un objectif en soi.
export const MAX_PETS = 8;
export const MAX_PETS_WALKING = 4;
// Zip 251 (demande Guillaume : "réduire les familiers à ~la taille d'une
// poule") : facteur d'échelle appliqué au RENDU du pet (sprite 16x16 dessiné
// à PET_DRAW_SCALE * 16 px, ancré par le bas). Purement visuel, ajustable.
export const PET_DRAW_SCALE = 0.7;

/* ===========================================================================
   ZIP 388 — DES FAMILIERS VIVANTS
   ---------------------------------------------------------------------------
   Guillaume : « ils doivent être plus animés, avoir des petites pattes qui
   bougent quand ils marchent ; leur corps doit s'orienter selon le sens de
   leur direction ; et ils doivent jouer entre eux ; savoir tourner sur eux-
   mêmes etc. Il faut que ce soit vivant. »

   État de départ, vérifié avant d'écrire (règle du zip 385 : vérifier par grep
   que ce qu'on croit retoucher est réellement LU) : `petSprite` produisait UN
   canevas 16×16, dessiné toujours de profil droit, sans la moindre frame. Il
   n'y avait donc RIEN à améliorer — tout était à créer.

   PET_DIRS × PET_FRAMES canevas par familier. Les frames 1 et 2 sont les deux
   contacts de la foulée (patte avant gauche / patte avant droite) ; la frame 0
   est la pose au repos, pattes jointes. La queue bouge sur les trois.

   ⚠️ COÛT MÉMOIRE, calculé et non estimé : ~45 familiers × 4 × 3 = 540 canevas
   de 16×16, soit 552 ko une fois pour toutes au chargement, plus 540 passes
   getImageData de 256 pixels pour les contours (138 k pixels au total, contre
   les 886 objets que le défi de fuite dessine à CHAQUE frame). C'est construit
   une seule fois dans buildSprites, jamais pendant une frame de jeu.

   ⚠️ ZÉRO MESSAGE RÉSEAU. C'est le point de conception qui compte, et il suit
   le modèle des licornes du zip 386 : ni la direction, ni la frame, ni le jeu
   en cours ne voyagent. La direction se DÉDUIT du déplacement du familier
   (que chaque client calcule déjà pour son suivi lissé), et le comportement
   de jeu est une fonction du TEMPS et d'un grain stable (id du propriétaire +
   index du familier) — donc identique chez les deux joueurs sans qu'ils se
   parlent. La série 373-388 reste à zéro message périodique ajouté.
   =========================================================================== */
export const PET_DIRS = 4;                        // 0 = face (vers le bas), 1 = dos, 2 = gauche, 3 = droite
export const PET_FRAMES = 3;                      // 0 = repos, 1 et 2 = les deux contacts de la foulée
export const PET_STEP_MS = 150;                   // durée d'un contact : plus vif que le fermier (petites pattes)
export const PET_MOVE_EPS = 0.012;                // tuiles/frame en-deçà desquelles le familier est considéré à l'arrêt
export const PET_SHADOW_ALPHA = 0.22;             // ombre au sol, posée sous le sprite
// --- le JEU entre familiers -------------------------------------------------
// Un familier n'entre en jeu que si son propriétaire est immobile depuis
// PET_PLAY_IDLE_MS : tant qu'on marche, ils suivent, sinon on croirait qu'ils
// se perdent. Le créneau de jeu est strictement dérivé du temps (voir
// petPlayAt, fermeEngine.js) : même créneau, même figure, chez tous les
// clients.
export const PET_PLAY_IDLE_MS = 1400;             // immobilité du maître avant que les familiers s'occupent
export const PET_PLAY_PERIOD_MS = 7000;           // durée d'un créneau de jeu
export const PET_PLAY_ACTIVE = 0.62;              // part du créneau réellement jouée (le reste = pause)
export const PET_SPIN_MS = 900;                   // durée d'un tour sur soi-même (les 4 directions défilent)
export const PET_CHASE_RADIUS = 0.85;             // rayon de la ronde quand deux familiers se poursuivent, en tuiles
export const PET_HOP_H = 3;                       // hauteur du petit saut, en pixels écran
export const PET_EMOTE_MS = 1200;                 // durée d'affichage d'une émote au-dessus de la tête
// Les figures possibles, dans l'ordre où petPlayAt les tire. "chase" et "face"
// demandent DEUX familiers : un familier seul retombe sur les figures solo.
export const PET_PLAY_SOLO = ["spin", "sit", "hop", "sniff"];
export const PET_PLAY_DUO = ["chase", "face", "hop"];

/* ===========================================================================
   ZIP 388 — QUI DONNE LES FAMILIERS
   ---------------------------------------------------------------------------
   Guillaume : « leur attribution semble injustifiée et aléatoire : il faut que
   les pets soient offerts par des visiteurs », puis, à la question posée :
   « visiteur uniquement, ET il faut avoir déjà de l'amitié ».

   Ce qui change :
     - `resolvePassagePickup` ne tire PLUS de familier. Ramasser une breloque
       au sol dans le monde du passage faisait apparaître un animal sans un
       mot d'explication : c'était exactement l'attribution « injustifiée ».
       L'or de la breloque, lui, ne bouge pas.
     - un familier ne peut plus venir que d'un visiteur dont l'amitié atteint
       PET_GIFT_REL_MIN, et il est PROPOSÉ (accepter / refuser) au lieu de
       tomber dans le sac.
     - seule exception, assumée : le chat berlingot du Gourmandin. Ce n'est pas
       une attribution aléatoire, c'est le prix de quinze niveaux.

   ⚠️ CONSÉQUENCE CHIFFRÉE, à surveiller manette en main. Le seuil d'amitié
   ferme la seule source disponible en début de partie. Pour ne pas rendre la
   collection inatteignable, la part "familier" du tirage de cadeau passe de
   12 % à 22 % UNE FOIS le seuil franchi : un joueur ami reçoit donc plus de
   familiers qu'avant, un inconnu n'en donne plus jamais. C'est le contraire
   d'un nerf, c'est un déplacement.
   =========================================================================== */
export const PET_GIFT_REL_MIN = 6;                // même seuil que REL_RESIDENT_MIN : un ami, pas un passant
export const PET_GIFT_SHARE = 0.22;               // part du tirage de cadeau qui devient un familier (au-delà du seuil)
export const PET_SWAP_SHARE = 0.30;               // idem côté troc
// Un visiteur qui revient d'un voyage rapporte le familier de la terre du
// passage EN COURS (voir passageWorldOf) plutôt qu'un chat de gouttière : le
// familier de terre reste lié à la rotation, donc à quelque chose que le
// joueur peut lire dans le monde. Sinon on retombe sur du hasard opaque.
export const PET_GIFT_WORLD_SHARE = 0.28;         // part des familiers offerts qui sont ceux d'une terre du passage
export const PET_GIFT_UNIQUE_SHARE = 0.10;        // ...et part des familiers RARES (dragonneau, licorne, moufette)
// Zip 248 (demande Guillaume : "the dalmatian is purple, which does not make
// sense... make each dog and cat design accurate to their actual appearance").
// L'ancien système ne portait qu'une TEINTE (`hue`) appliquée en HSL sur une
// unique silhouette générique : d'où un dalmatien violet et 30 races
// indiscernables. Chaque entrée porte désormais une VRAIE palette et un
// motif :
//   coat  = couleur principale du pelage        shade = ombre / dos
//   belly = ventre / poitrail / museau clair    mark  = couleur des marques
//   eye   = couleur de l'iris                   nose  = truffe
//   pattern = "solid" | "tabby" | "spots" | "rosette" | "calico" | "points"
//             | "tuxedo" | "saddle" | "mask" | "patches" | "blaze"
//   ears  = "cat" | "perky" | "floppy" | "long" | "tiny" | "rose"
//   tail  = "cat" | "curl" | "plume" | "stub" | "bushy"
//   fluff = 0 (poil ras) | 1 (moyen) | 2 (très fourni : persan, spitz…)
//   longBody = true pour les races basses et allongées (teckel)
// Voir petSprite (fermeArt.js) qui dessine chat et chien avec des
// silhouettes RÉELLEMENT différentes puis applique le motif par-dessus.
export const PET_CATALOG = {
  // --- visitor-gift pets
  dragon:    { name: "Dragonneau",          nameEn: "Baby dragon",      body: "dragon",
               coat: "#4aa04a", shade: "#2e6e2e", belly: "#a8dc78", mark: "#ffcf3a", eye: "#ffd75e", nose: "#1f4d1f", pattern: "solid" },
  unicorn:   { name: "Licorne",             nameEn: "Unicorn",          body: "horse",
               coat: "#f4f0ea", shade: "#d8d2c6", belly: "#ffffff", mark: "#e58ac0", eye: "#7a5fd0", nose: "#c0a8b8", pattern: "solid" },
  skunk:     { name: "Moufette chic",       nameEn: "Fancy skunk",      body: "critter",
               coat: "#2a2a30", shade: "#17171c", belly: "#3a3a42", mark: "#f0eee6", eye: "#ffd75e", nose: "#101014", pattern: "stripe" },
  // --- passage-world pets (must match PASSAGE_WORLDS[].pet.id)
  shadowcat: { name: "Chat d'ombre",        nameEn: "Shadow cat",       body: "cat",
               coat: "#3a2f4a", shade: "#241d30", belly: "#4d4062", mark: "#b088ff", eye: "#c9a6ff", nose: "#241d30", pattern: "solid", ears: "cat", tail: "cat", fluff: 1 },
  candyfox:  { name: "Renard barbe à papa", nameEn: "Cotton-candy fox", body: "critter",
               coat: "#f2a8cf", shade: "#d2789f", belly: "#fde4f1", mark: "#ffffff", eye: "#6a4a7a", nose: "#8a4a6a", pattern: "tips" },
  mazemouse: { name: "Souris des haies",    nameEn: "Hedge mouse",      body: "critter",
               coat: "#9a8f7a", shade: "#776d5a", belly: "#e0d8c4", mark: "#f0b8c0", eye: "#241d18", nose: "#c07888", pattern: "solid" },
  gemturtle: { name: "Tortue gemme",        nameEn: "Gem turtle",       body: "turtle",
               coat: "#5fbf7a", shade: "#3d8a55", belly: "#a8e0b0", mark: "#3fbfc8", eye: "#1f3d2a", nose: "#2e6b42", pattern: "solid" },
  // Zip 385 : chat berlingot, prix du niveau 15 du Gourmandin. Il n'est PAS
  // attrapable au sol comme les cinq ci-dessus (il ne remplace donc pas le
  // renard barbe à papa du Pays des Bonbons, il s'y ajoute) : il ne s'obtient
  // qu'en finissant le mini-jeu, une seule fois par joueur, et rejoint le sac
  // comme n'importe quel familier — donc promenable en ferme ET en ville sans
  // une ligne de plus (voir drawPetsFor / drawTownFrame, FermeGame.js).
  candycat:  { name: "Chat berlingot",      nameEn: "Candy cat",        body: "cat",
               coat: "#f7b8d8", shade: "#d98ab5", belly: "#fff0f7", mark: "#e8356e", eye: "#7ce0f0", nose: "#c65a8c", pattern: "tabby", ears: "cat", tail: "cat", fluff: 1 },
  cloudlamb: { name: "Agneau des nuages",   nameEn: "Cloud lamb",       body: "lamb",
               coat: "#f6f4f0", shade: "#dcd8d0", belly: "#ffffff", mark: "#e8c9a8", eye: "#3a3028", nose: "#c9a086", pattern: "solid", fluff: 2 },
};
export function petName(petId, en) {
  const p = PET_CATALOG[petId]; if (!p) return petId;
  return en ? p.nameEn : p.name;
}

// --- Zip 237 / refonte zip 248 : races COMMUNES (chats & chiens) proposées
// par les visiteurs. Chaque race a maintenant sa palette réelle et son motif,
// pour être reconnaissable au premier coup d'œil.
export const COMMON_CATS = [
  { id: "cat_tabby",   name: "Chat tigré",    nameEn: "Tabby cat",    pattern: "tabby",
    coat: "#96794e", shade: "#6d5636", belly: "#e2d3ae", mark: "#4e3c22", eye: "#8fbf4a", nose: "#c98a86" },
  { id: "cat_black",   name: "Chat noir",     nameEn: "Black cat",    pattern: "solid",
    coat: "#2c2c33", shade: "#191920", belly: "#3c3c46", mark: "#2c2c33", eye: "#8fd94a", nose: "#191920" },
  { id: "cat_white",   name: "Chat blanc",    nameEn: "White cat",    pattern: "solid",
    coat: "#f4f2ec", shade: "#d9d5cb", belly: "#ffffff", mark: "#f4f2ec", eye: "#5aa8d9", nose: "#e8a8a8" },
  { id: "cat_ginger",  name: "Chat roux",     nameEn: "Ginger cat",   pattern: "tabby",
    coat: "#d9843c", shade: "#ac5f22", belly: "#f6d9a8", mark: "#9a4f18", eye: "#8fbf4a", nose: "#e0968e" },
  { id: "cat_siamese", name: "Siamois",       nameEn: "Siamese",      pattern: "points",
    coat: "#eadfc4", shade: "#cfc0a0", belly: "#f8f0dc", mark: "#4a3830", eye: "#4aa8e0", nose: "#4a3830" },
  { id: "cat_calico",  name: "Chat calico",   nameEn: "Calico",       pattern: "calico",
    coat: "#f4f1e8", shade: "#d8d3c6", belly: "#ffffff", mark: "#d9863c", mark2: "#33302e", eye: "#c9a03c", nose: "#e0a0a0" },
  { id: "cat_grey",    name: "Chartreux",     nameEn: "Grey cat",     pattern: "solid",
    coat: "#7f8d97", shade: "#5d6a74", belly: "#a3b0b8", mark: "#7f8d97", eye: "#e0a83c", nose: "#5d6a74" },
  { id: "cat_persian", name: "Persan",        nameEn: "Persian",      pattern: "solid", fluff: 2, flatFace: true,
    coat: "#efe3c8", shade: "#d4c5a4", belly: "#fbf5e6", mark: "#efe3c8", eye: "#d9803c", nose: "#d9a09a" },
  { id: "cat_bengal",  name: "Bengal",        nameEn: "Bengal",       pattern: "rosette",
    coat: "#d9a441", shade: "#b07f26", belly: "#f3ddab", mark: "#4a3320", eye: "#8fbf4a", nose: "#c98a72" },
  { id: "cat_tux",     name: "Chat smoking",  nameEn: "Tuxedo cat",   pattern: "tuxedo",
    coat: "#2c2c33", shade: "#191920", belly: "#f6f4ee", mark: "#f6f4ee", eye: "#8fd94a", nose: "#e8a8a8" },
  { id: "cat_maine",   name: "Maine coon",    nameEn: "Maine coon",   pattern: "tabby", fluff: 2, tufts: true,
    coat: "#8a6740", shade: "#63482b", belly: "#dcc39a", mark: "#40301c", eye: "#c9a03c", nose: "#b07a70" },
  { id: "cat_blue",    name: "Bleu russe",    nameEn: "Russian blue", pattern: "solid",
    coat: "#93a6b4", shade: "#6f8290", belly: "#b9c8d2", mark: "#93a6b4", eye: "#6fbf5a", nose: "#7f909c" },
  { id: "cat_cream",   name: "Chat crème",    nameEn: "Cream cat",    pattern: "solid",
    coat: "#eed9b0", shade: "#d2b98c", belly: "#f9ecd2", mark: "#eed9b0", eye: "#c9a03c", nose: "#e0b0a0" },
  { id: "cat_spotty",  name: "Chat moucheté", nameEn: "Spotted cat",  pattern: "spots",
    coat: "#d5d5d0", shade: "#b2b2ac", belly: "#eeeeea", mark: "#43434a", eye: "#8fbf4a", nose: "#b09090" },
  { id: "cat_lilac",   name: "Chat lilas",    nameEn: "Lilac cat",    pattern: "solid",
    coat: "#bda9b6", shade: "#9a8794", belly: "#dccfd8", mark: "#bda9b6", eye: "#c9a03c", nose: "#c0a0aa" },
];
export const COMMON_DOGS = [
  { id: "dog_lab",       name: "Labrador",   nameEn: "Labrador",   pattern: "solid",  ears: "floppy", tail: "plume",
    coat: "#ddc188", shade: "#bb9d63", belly: "#f0dfb4", mark: "#ddc188", eye: "#5a3a20", nose: "#2a2320" },
  { id: "dog_poodle",    name: "Caniche",    nameEn: "Poodle",     pattern: "solid",  ears: "floppy", tail: "pom", fluff: 2, curly: true,
    coat: "#f0ece2", shade: "#d5cfc0", belly: "#fbf8f0", mark: "#f0ece2", eye: "#3a2f28", nose: "#241f1c" },
  { id: "dog_husky",     name: "Husky",      nameEn: "Husky",      pattern: "mask",   ears: "perky",  tail: "bushy", fluff: 1,
    coat: "#4a4f5a", shade: "#31353e", belly: "#f2f2ee", mark: "#f2f2ee", eye: "#5ec8e8", nose: "#1c1c20" },
  { id: "dog_beagle",    name: "Beagle",     nameEn: "Beagle",     pattern: "saddle", ears: "long",   tail: "up",
    coat: "#f2ece0", shade: "#d3ccbc", belly: "#ffffff", mark: "#c2822f", mark2: "#33302c", eye: "#4a3220", nose: "#241f1c" },
  { id: "dog_corgi",     name: "Corgi",      nameEn: "Corgi",      pattern: "blaze",  ears: "perky",  tail: "stub", stumpy: true,
    coat: "#d99a52", shade: "#b3762f", belly: "#f6efe2", mark: "#f6efe2", eye: "#4a3220", nose: "#241f1c" },
  { id: "dog_shiba",     name: "Shiba",      nameEn: "Shiba",      pattern: "blaze",  ears: "perky",  tail: "curl",
    coat: "#d9793a", shade: "#b0561d", belly: "#f6ecd8", mark: "#f6ecd8", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_dalmatian", name: "Dalmatien",  nameEn: "Dalmatian",  pattern: "spots",  ears: "floppy", tail: "up",
    coat: "#f5f3ed", shade: "#dad6cc", belly: "#ffffff", mark: "#1e1e22", eye: "#4a3a2a", nose: "#1e1e22" },
  { id: "dog_bulldog",   name: "Bouledogue", nameEn: "Bulldog",    pattern: "patches",ears: "rose",   tail: "stub", wide: true, flatFace: true,
    coat: "#f0e6d4", shade: "#d2c4ac", belly: "#fbf6ec", mark: "#c98f4a", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_terrier",   name: "Terrier",    nameEn: "Terrier",    pattern: "patches",ears: "tiny",   tail: "up", scruffy: true,
    coat: "#f2ece0", shade: "#d3ccbc", belly: "#ffffff", mark: "#b8823c", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_dachs",     name: "Teckel",     nameEn: "Dachshund",  pattern: "solid",  ears: "long",   tail: "up", longBody: true,
    coat: "#8c4a24", shade: "#68341a", belly: "#b06a3a", mark: "#8c4a24", eye: "#2f2018", nose: "#1e1a18" },
  { id: "dog_collie",    name: "Colley",     nameEn: "Collie",     pattern: "blaze",  ears: "semi",   tail: "plume", fluff: 2, longNose: true,
    coat: "#b5762f", shade: "#8d5820", belly: "#f6efe2", mark: "#f6efe2", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_pug",       name: "Carlin",     nameEn: "Pug",        pattern: "mask",   ears: "rose",   tail: "curl", flatFace: true,
    coat: "#e5c98d", shade: "#c4a769", belly: "#f4e6c4", mark: "#2e2a28", eye: "#2a2018", nose: "#1e1a18" },
  { id: "dog_boxer",     name: "Boxer",      nameEn: "Boxer",      pattern: "mask",   ears: "semi",   tail: "stub",
    coat: "#c9803c", shade: "#a15f24", belly: "#f2e4cc", mark: "#3a2e26", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_spaniel",   name: "Épagneul",   nameEn: "Spaniel",    pattern: "patches",ears: "long",   tail: "plume", fluff: 1,
    coat: "#f4efe4", shade: "#d6d0c2", belly: "#ffffff", mark: "#7d4a2a", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_pom",       name: "Spitz nain", nameEn: "Pomeranian", pattern: "solid",  ears: "tiny",   tail: "pom", fluff: 2, stumpy: true,
    coat: "#e0913c", shade: "#bb6f22", belly: "#f6dcb0", mark: "#e0913c", eye: "#2f2018", nose: "#1e1a18" },
];
for (const c of COMMON_CATS) PET_CATALOG[c.id] = { ...c, body: "cat", common: true, ears: "cat", tail: "cat" };
for (const d of COMMON_DOGS) PET_CATALOG[d.id] = { ...d, body: "dog", common: true };
export const COMMON_PET_IDS = [...COMMON_CATS, ...COMMON_DOGS].map(p => p.id);

// --- Zip 237: SWAP offers. Some visitors barter an item for our produce
// instead of paying money (Guillaume: "offering a decorative item, a useful
// item, rare seeds, common pets — for our crops and fish and other produce").
// The visitor WANTS n units of one of our produce kinds; in return they GIVE
// one reward. Resolution in resolveVisitorSwap.
export const SWAP_OFFER_CHANCE = 0.22;   // share of non-hostile, non-stay visits that are swaps
export const SWAP_WANT_MIN = 3;
export const SWAP_WANT_MAX = 8;
// Useful items a swap can hand over (drawn into the player's own bag/inv).
export const SWAP_USEFUL_ITEMS = [
  { item: "wood",    n: 20 }, { item: "stone", n: 15 }, { item: "food", n: 6 },
  { item: "salve",   n: 1 },  { item: "healKit", n: 2 }, { item: "fence", n: 10 },
];

// Dispositions. Hostile chance is halved once per resident living on the
// farm (a lively townhall discourages troublemakers).
export const VISITOR_HOSTILE_CHANCE = 0.06;
export const VISITOR_RICH_CHANCE = 0.5;           // for rich-flagged roster entries
export const VISITOR_CHAT_CHANCE = 0.3;           // nice/neutral visit is a chat (no purchase)

// Hostile visitors (Guillaume's caps: steal up to 100 gold, ruin 10 crops).
export const HOSTILE_DEADLINE_MS = 60 * 1000;     // time to pay or refuse
export const HOSTILE_STEAL_MAX = 100;
export const HOSTILE_RUIN_CROPS = 10;
export const REPAIR_WINDOW_MS = 120 * 1000;       // co-op window to reverse the damage
export const REPAIR_HITS = 3;                     // hits needed in the repair minigame (easy)

// Relationships and residency.
export const REL_CHAT = 1;
export const REL_DEAL = 2;
export const REL_RESIDENT_MIN = 6;                // friendship needed before they ask to stay
export const VOTE_DEADLINE_MS = 60 * 1000;        // online players must vote within this window

// Zip 234 (Guillaume: "the more a friendship is built, the more they visit,
// the more they come bearing gifts, and the more they pay"). All effects are
// driven by station.rel[rid], the existing per-character friendship counter.
export const REL_PRICE_BONUS = 0.03;              // +3% on every buy price per friendship point...
export const REL_PRICE_BONUS_MAX = 0.6;           // ...capped at +60% (rel 20)
export const REL_GIFT_BONUS = 0.03;               // prep-order gift chance grows with friendship...
export const REL_GIFT_MAX = 0.85;                 // ...capped
export const REL_EASY_GIFT_MIN = 6;               // real friends may attach a gift even to an EASY order
export const REL_SPAWN_WEIGHT = 0.25;             // roster pick weight: 1 + rel*this (capped at rel 12) -> friends visit more often
export const REL_SPAWN_WEIGHT_RELCAP = 12;
export const REL_POP_DIV = 4;                     // farmPopularity: +1 per REL_POP_DIV total friendship points (capped) -> visits come sooner
export const REL_POP_MAX = 8;
export const REL_ARRIVAL_GIFT_MIN = 4;            // from this friendship on, they sometimes step off the train with a present
export const REL_ARRIVAL_GIFT_CHANCE = 0.06;      // chance per friendship point...
export const REL_ARRIVAL_GIFT_CHANCE_MAX = 0.5;   // ...capped at 50%
export const REL_HEART = 2;                       // friendship points per heart in the visitor card (5 hearts max)
export const REL_CHAT_CAP_PER_VISIT = 3;          // only the first chats of a visit earn friendship (anti-spam)
export const VISITOR_CHAT_TIERS = 3;              // dialogue pools by friendship tier (see fermeStrings.visitorChatLines)
export const VISITOR_CHAT_LINES = 4;              // lines per tier, fr/en symmetric
export const VISITOR_CHAT_TIER1_REL = 4;          // rel thresholds for tiers 1 and 2
export const VISITOR_CHAT_TIER2_REL = 10;
export const VISITOR_LINGER_MS = 3 * 60 * 1000;   // after a fulfilled order they stroll the square instead of leaving at once
export const VISITOR_STAGGER_MIN_MS = 1800;       // gap between two group members stepping off the train...
export const VISITOR_STAGGER_MAX_MS = 4200;       // ...so they walk in a loose line, not on top of each other

// --- Valley Town (zip 234, Guillaume: "users can take a train ride at the
// existing train station and arrive at the town centre, called Valley Town;
// each user can have a house there"). Separate map like the evil world (fixed
// seed, regenerated identically on every visit, nothing persisted), but
// MULTIPLAYER: players publish their real position with zone "town" and see
// each other there. Houses are assigned deterministically (see townHouseOwners
// in FermeGame.js): known farmers sorted by id -> plots in order; leftover
// plots show a "for sale" sign. Interiors are deferred.
/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ZIP 425 — VALLEY TOWN EST REFAITE, ET LA CARTE EST 3× PLUS GRANDE DANS
   CHAQUE DIMENSION (64×48 → 192×144, soit NEUF fois la surface).
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « on va tout recommencer sur cette map, car on veut
   une map bien plus grande. La grille doit être au moins 3x plus étendue. »
   L'objectif annoncé est un VERSANT ÉGAL À LA FERME en points d'intérêt — ce
   qui ne se construira pas en une session. Ce zip pose donc la GÉOGRAPHIE
   (quartiers, rues, reliefs, monuments) en laissant délibérément des parcelles
   vides : une ville qu'on remplit est un chantier, une ville trop petite pour
   ce qu'on veut y mettre est une impasse.

   ⚠️ POURQUOI 3× EN LINÉAIRE ET NON 3× EN SURFACE. « 3× plus étendue » se lit
   des deux façons, et 3× en surface (≈ 110×83) n'aurait donné qu'un tiers de
   rue en plus dans chaque direction — c'est-à-dire une ville qui a l'air de la
   même. La demande porte sur la SENSATION d'espace, qui suit la distance, pas
   l'aire. On prend donc le sens le plus généreux.

   ⚠️ ET ÇA NE COÛTE RIEN AU RENDU : drawTownFrame ne dessine que la fenêtre
   visible (x0..x1 / y0..y1 calculés depuis la caméra). Le surcoût est celui de
   trois tableaux de 27 648 entrées construits UNE FOIS par chargement de page
   (le cache module de getTownWorldCached), soit une poignée de millisecondes.
   ⚠️ ET RIEN N'EST PERSISTÉ : la ville est regénérée à graine fixe, identique
   pour tout le monde, à chaque visite. Il n'y a donc aucune migration à écrire
   — c'est ce qui rend cette refonte possible d'un bloc.

   ⚠️ CE QUI NE DEVAIT PAS CASSER, ET QUI N'A PAS CASSÉ :
     * les RÉSIDENTS. townHouseOwners() attribue les parcelles par index (les
       fermiers connus triés par id, puis les résidents). On a AUGMENTÉ le
       nombre de parcelles et gardé l'ordre : les huit premières entrées de
       TOWN_HOUSES restent les quatre du nord et les quatre du sud de la rue
       principale, exactement comme avant. Un propriétaire garde donc son rang.
     * la TÉLÉPORTATION DÉVELOPPEUR (dev:town), qui pose le joueur sur
       TOWN_SPAWN — déplacé avec la gare, jamais recopié ailleurs.
     * le TRAIN, qui arrive et repart sur les mêmes deux repères.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ ZIP 426 — LA CARTE S'AGRANDIT UNE SECONDE FOIS : 192×144 → 224×168.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « tu peux aussi agrandir encore la map ».
   ⚠️ ON N'AGRANDIT PAS AVANT D'AVOIR DE QUOI REMPLIR. Le 425 a montré ce que
   coûte l'inverse (une prairie entre les rues) ; les 32 colonnes et 24 rangées
   de ce zip arrivent DONC avec leur contenu, décidé d'abord :
     * au SUD (y ≥ 144) : une cinquième avenue (y = 150), une rangée de
       parcelles, le CIMETIÈRE et le LAC avec sa promenade et son ponton ;
     * à l'EST (x ≥ 190) : une quatrième artère nord-sud (x = 196) et le
       QUARTIER DES ARTISANS, trois parcelles de plus.
   ⚠️ ET LE BORD SUD N'EST PLUS UNE RUE. `paveCol` s'arrêtait à H-11 : avec la
   promenade du lac en dessous, une artère nord-sud plongeait dans l'eau. Elles
   s'arrêtent maintenant à la DERNIÈRE avenue (dérivée de TOWN_ST_ROWS), ce qui
   est de toute façon ce qu'on veut dire — une rue finit à un carrefour.
   ═══════════════════════════════════════════════════════════════════════════ */
export const TOWN_MAP_W = 224;
export const TOWN_MAP_H = 168;
export const TOWN_RAIL_X = 2;                       // rails on columns 2..3, full height, like the farm
export const TOWN_PLATFORM = { x: 4, y: 66, w: 2, h: 8 };
export const TOWN_SPAWN = { x: 6, y: 70 };          // step off the train here
export const TOWN_STATION_SIGN = { x: 7, y: 72 };   // E here to ride back to the farm

/* LES RUES. Quatre est-ouest, trois nord-sud, toutes larges de deux cases.
   ⚠️ ELLES SONT DÉCLARÉES ICI ET NON DESSINÉES À LA MAIN DANS LE GÉNÉRATEUR,
   parce que trois autres endroits en ont besoin : le placement des parcelles
   (une maison a une allée qui rejoint la rue SOUS elle), l'écartement des
   arbres, et le mobilier urbain. Une rue recopiée est une rue qui bougera
   d'un côté seulement. */
export const TOWN_MAIN_ST_Y = 70;                   // rue principale (gare → bord est) : lignes y..y+1
export const TOWN_ST_ROWS = [34, 70, 108, 128, 150];     // toutes les rues est-ouest (426 : + celle du sud)
export const TOWN_CROSS_ST_X = 92;                  // artère centrale nord-sud, colonnes x..x+1
export const TOWN_ST_COLS = [34, 92, 150, 196];     // toutes les rues nord-sud (426 : + celle des artisans)

/* LA PLACE CENTRALE. Elle a triplé (12×12 → 30×26) et n'est plus un simple
   rectangle dallé : voir townPlazaDeco() dans fermeEngine.js. */
export const TOWN_PLAZA = { x: 78, y: 58, w: 30, h: 26 };
export const TOWN_FOUNTAIN = { x: 92, y: 63 };      // 2x2 fountain, top-left tile (blocks movement)
/* ⚠️ LE MONUMENT EST LE PENDANT SUD DE LA FONTAINE, et il ne sert qu'à ça :
   la rue principale traverse la place en son milieu, donc la fontaine seule
   posait tout le poids visuel au nord et la moitié sud paraissait vide. Deux
   masses symétriques de part et d'autre de la rue font une PLACE ; une seule
   fait un carrefour avec une fontaine dessus. */
export const TOWN_MONUMENT = { x: 92, y: 78 };      // 2x2, obélisque + vasques
/* ⚠️ 425 — LES QUARTIERS. Sans eux, une carte neuf fois plus grande n'est pas
   une ville neuf fois plus riche : c'est la même petite ville posée au milieu
   d'un très grand pré, et c'est EXACTEMENT ce que le premier jet a donné à
   l'écran. Une ville, c'est d'abord des ÎLOTS occupés entre les rues.
   Ces trois-là sont les premiers ; il reste de la place pour la suite, et c'est
   voulu (voir l'en-tête : la parité avec la ferme se construira au fil des
   mises à jour, pas en une session). */
/* ⚠️ AUCUN DE CES TROIS NE DOIT MORDRE SUR UNE RUE NI SUR UNE PARCELLE — le
   banc de rendu le contrôle (« aucun bâtiment ne coupe une rue »), mais rien ne
   contrôle l'inverse. Les hauteurs sont donc calées pour s'arrêter AVANT les
   rangées de maisons du sud (y = 102) : 74 + 26 = 100. */
export const TOWN_PARK = { x: 108, y: 74, w: 34, h: 26 };     // le parc et son étang
export const TOWN_ORCHARD = { x: 12, y: 38, w: 18, h: 24 };   // le verger municipal
export const TOWN_MARKET = { x: 38, y: 74, w: 26, h: 26 };    // le champ de foire, dallé et bordé d'arbres
/* ═══════════════════════════════════════════════════════════════════════════
   LES QUARTIERS DU ZIP 426 — ce qui remplit l'agrandissement.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ CHACUN RÉPOND À UN VIDE CONSTATÉ, pas à une envie de décor :
     * le CHAMP DE FOIRE était une esplanade nue (le 425 le dit lui-même) : il
       reçoit ses étals et son kiosque à musique — c'est enfin une foire ;
     * l'ÉGLISE n'avait rien autour d'elle : le cimetière lui donne son enclos
       et une raison d'aller à l'ouest ;
     * le SUD ajouté serait un pré : le lac lui donne un bord, une promenade
       et un ponton — c'est-à-dire un but de promenade ;
     * l'EST ajouté serait un pré aussi : les artisans lui donnent une rue.
   ⚠️ AUCUN NE MORD SUR UNE RUE NI SUR UNE PARCELLE — même règle qu'au 425, et
   c'est le générateur qui l'applique (il refuse toute case déjà pavée). */
export const TOWN_CEMETERY = { x: 46, y: 40, w: 14, h: 16 };  // l'enclos de l'église, à l'ouest de son parvis
export const TOWN_LAKE = { x: 56, y: 154, w: 96, h: 12 };     // le lac du sud + sa promenade (voir TOWN_QUAY_H)
export const TOWN_QUAY_H = 2;                                 // rangées de dallage entre l'avenue du sud et l'eau
export const TOWN_PIER = { x: 100, y: 154, w: 4, h: 8 };      // le ponton de bois, plein sud, dans l'axe de l'artère centrale
export const TOWN_KIOSK = { x: 122, y: 84 };                  // kiosque à musique du parc (3×3, case nord-ouest)
export const TOWN_ARTISANS = { x: 190, y: 36, w: 32, h: 96 }; // le quartier de l'est, le long de l'artère x=196
/* Le CŒUR URBAIN : au-dedans, on ne sème PAS d'arbres au hasard. C'est la
   correction la plus efficace du deuxième jet — des arbres épars entre les rues
   faisaient lire toute la ville comme une clairière. Les arbres du centre sont
   désormais PLANTÉS : alignements, parc, verger, parterres de la place. */
export const TOWN_CORE = { x: 8, y: 22, w: 208, h: 132 };
export const TOWN_HOUSE_W = 6;                      // house sprite is 96px = 6 tiles wide
export const TOWN_HOUSE_H = 3;                      // blocked footprint rows (the visual roof overlaps north of it)

/* ═══════════════════════════════════════════════════════════════════════════
   LE RELIEF (425) — LA HAUTE-VILLE, LES ESCALIERS, ET LE SAUT.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « des sections avec des escaliers réalistes, des
   mécaniques de climb up and jump off ».

   ⚠️ IL N'Y A PAS DE COORDONNÉE Z, ET IL NE FAUT PAS EN INTRODUIRE UNE. Le
   joueur n'a que x/y — c'est ce qui voyage dans le réseau (pubMe), ce que
   lisent les collisions, ce que dessinent les autres clients. Ajouter une
   troisième coordonnée obligerait à la diffuser, à la réconcilier, et à la
   gérer dans chaque chemin qui manipule une position : un coût énorme pour
   une carte sur quatre.

   ⚠️ L'ALTITUDE EST DONC UNE PROPRIÉTÉ DE LA CASE, PAS DU PERSONNAGE. Un
   tableau `elev` parallèle au sol donne la hauteur de chaque case ; celle d'un
   personnage se LIT sous ses pieds. Trois conséquences, et les trois sont des
   cadeaux :
     1. les joueurs distants sont à la bonne hauteur sans qu'on diffuse quoi
        que ce soit — leur x/y suffit ;
     2. rien à sauvegarder, rien à synchroniser, rien à désynchroniser ;
     3. un ancien client qui n'aurait pas ce zip verrait les autres au bon
        endroit sur la carte, simplement à plat.

   ⚠️ LES VALEURS SONT FRACTIONNAIRES, ET C'EST CE QUI FAIT L'ESCALIER. Une
   marche d'escalier vaut 0,25 ; un rebord de terrasse vaut 1,0 d'un coup. La
   règle de déplacement est alors la MÊME dans les deux cas — « on ne franchit
   pas plus de TOWN_STEP_MAX d'un pas » — et il n'y a aucun cas particulier à
   écrire : l'escalier passe parce qu'il monte doucement, la falaise bloque
   parce qu'elle monte d'un coup. Un booléen « c'est un escalier » aurait
   demandé de connaître le SENS de chaque marche.

   ⚠️ ET LE PERSONNAGE MONTE VISUELLEMENT PENDANT QU'IL GRAVIT, sans une ligne
   d'animation : son décalage à l'écran vaut `elev × TOWN_ELEV_PX`, lu case par
   case. C'est la même valeur qui décide s'il peut passer et où il se dessine —
   donc elles ne peuvent pas diverger (§7 de CLAUDE.md). */
/* ⚠️ 30 px, ET LE PREMIER RÉGLAGE À 14 ÉTAIT FAUX — vu au banc de rendu, pas à
   la lecture. Quatorze pixels sur une tuile de seize, c'est la hauteur d'une
   BORDURE DE TROTTOIR : la terrasse ne se lisait pas comme un étage, les
   escaliers avaient l'air de dalles grises posées dans l'herbe, et le mur de
   soutènement passait pour un trait. À 30 px (presque deux tuiles), le parement
   a la place d'exister et la Haute-Ville est enfin EN HAUT.
   ⚠️ Ce nombre ne change RIEN à ce qui est franchissable : la marche et le saut
   ne lisent que `elev`, jamais des pixels. C'est un réglage purement optique,
   et c'est exactement pour ça qu'on peut le pousser sans rien re-tester. */
export const TOWN_ELEV_PX = 30;      // décalage vertical à l'écran, par unité d'altitude
export const TOWN_STEP_MAX = 0.34;   // dénivelé franchissable EN MARCHANT (une marche vaut 0,25)
/* Le SAUT depuis un rebord (Espace). Il ne sert qu'à DESCENDRE : on grimpe par
   les marches, on redescend où l'on veut. C'est le contrat de tous les jeux qui
   ont ce couple, et il tient à une raison de lisibilité — un saut qui monterait
   rendrait les escaliers facultatifs, donc décoratifs. */
export const TOWN_JUMP_MS = 380;     // durée du saut
export const TOWN_JUMP_TILES = 1.9;  // distance franchie, en cases (assez pour dégager le pied du rebord)
export const TOWN_JUMP_ARC_PX = 16;  // hauteur de la cloche, en px écran
export const TOWN_JUMP_MIN_DROP = 0.5; // dénivelé minimal devant soi pour que le saut soit proposé

/* LA HAUTE-VILLE : la terrasse du nord-est, à une unité d'altitude. Elle porte
   le tribunal, deux parcelles de maisons et le belvédère. */
export const TOWN_UPPER = { x: 120, y: 8, w: 66, h: 22 };
/* LE BELVÉDÈRE : un second palier, à deux unités, dans l'angle de la
   Haute-Ville. ⚠️ Deux niveaux et pas trois : au-delà, le décalage vertical
   cumulé (2 × 14 px) commence à faire flotter les personnages au-dessus de
   leur propre ombre, et un troisième palier n'ajouterait aucune lecture. */
export const TOWN_BELVEDERE = { x: 164, y: 10, w: 16, h: 11 };
/* LES ESCALIERS. `dir` donne le sens de la MONTÉE : "n" = on monte vers le
   nord (la volée est parcourue du sud au nord). La longueur de la volée
   (`len`) découle du dénivelé : quatre marches pour une unité, ce qui donne
   les 0,25 de TOWN_STEP_MAX. */
export const TOWN_STAIRS = [
  // La volée monumentale, dans l'axe du tribunal : six cases de large, on la
  // voit depuis la place.
  { x: 140, y: 30, w: 6, len: 4, dir: "n", from: 0, to: 1 },
  // La volée de service, à l'ouest, pour ne pas obliger à traverser toute la
  // ville quand on arrive de la gare.
  { x: 116, y: 18, w: 4, len: 4, dir: "e", from: 0, to: 1 },
  // La montée du belvédère, courte et étroite.
  { x: 170, y: 21, w: 3, len: 4, dir: "n", from: 1, to: 2 },
];

export const TOWN_HOUSES = [                        // door faces south onto a street
  /* ⚠️ LES HUIT PREMIÈRES SONT LES HUIT D'AVANT, DANS LE MÊME ORDRE (quatre au
     nord de la rue principale, quatre au sud) : voir la note d'en-tête. Elles
     ont changé de coordonnées — la carte entière a changé — mais pas de RANG,
     et c'est le rang qui désigne le propriétaire. */
  { x: 14, y: 64 }, { x: 26, y: 64 }, { x: 46, y: 64 }, { x: 58, y: 64 },   // nord de la rue principale
  { x: 14, y: 28 }, { x: 46, y: 28 }, { x: 58, y: 28 }, { x: 100, y: 28 },  // le long de l'avenue du nord
  // Zip 425 : les parcelles nouvelles. Une ville neuf fois plus grande avec
  // huit maisons se lit comme une ville abandonnée.
  { x: 14, y: 102 }, { x: 26, y: 102 }, { x: 46, y: 102 }, { x: 58, y: 102 },
  { x: 116, y: 102 }, { x: 128, y: 102 }, { x: 160, y: 102 },
  { x: 46, y: 122 }, { x: 100, y: 122 }, { x: 160, y: 122 },
  // ... et deux sur la terrasse : les hauteurs sont les belles adresses.
  { x: 122, y: 24 }, { x: 152, y: 24 },
  /* Zip 426 — les parcelles de l'agrandissement. ⚠️ ELLES SONT AJOUTÉES EN
     QUEUE, jamais intercalées : le RANG désigne le propriétaire (voir
     townHouseOwners), donc insérer une parcelle au milieu déménagerait tout le
     monde d'une maison — silencieusement, et sans que rien ne le signale.
     ⚠️ Chaque `y` est calé sur une avenue : la porte est en y+3 et l'allée
     rejoint la rue si elle est à 8 rangées ou moins (générateur). */
  { x: 200, y: 64 }, { x: 200, y: 102 }, { x: 200, y: 122 },   // le quartier des artisans, à l'est
  { x: 26, y: 144 }, { x: 60, y: 144 }, { x: 100, y: 144 }, { x: 140, y: 144 }, // la rangée du sud, face au lac
];
// Zip 260 (demande Guillaume) : plafond de résidents porté à 10, INDÉPENDANT
// du nombre de maisons de Valley Town. L'attribution de maison sera revue plus
// tard — pour l'instant, les résidents au-delà des maisons disponibles sont
// simplement dessinés près d'un point par défaut (voir le rendu des résidents
// dans FermeGame.js), ce qui est assumé.
/* ⚠️⚠️ ZIP 427 — LE PLAFOND PASSE DE 10 À 20, ET LA SEULE QUESTION QUI COMPTE
   EST « COMBIEN DE `send()` EN PLUS ? ». Réponse mesurée sur le code, pas au
   jugé : ZÉRO. Tout ce qui bouge chez un résident passe par UN SEUL message
   groupé par image (`flushResidentNet`, zip 364) — doubler la population double
   la TAILLE du paquet, et la taille n'est pas facturée (§3 de CLAUDE.md).
   Les autres canaux sont eux aussi indifférents au nombre :
     * `broadcastStation()` diffuse la station ENTIÈRE, résidents compris, à sa
       propre cadence : un objet deux fois plus gros, toujours un message ;
     * la rôdaille, les scènes et les trajets de ville n'émettent que par
       DÉCISION (A→B), jamais par tick.
   ⚠️ CE QUI AURAIT COÛTÉ, ET QU'ON NE FAIT DONC PAS : un message par résident
   (le modèle d'avant le 364) — vingt résidents auraient alors dépassé à eux
   seuls le plafond de 10 msg/s à chaque `justCameIntoRange`, EN SILENCE.
   Le vrai coût du passage à 20 est donc du CPU chez l'hôte (rôdaille + travail),
   pas du réseau. C'est le bon échange : le CPU est gratuit, le quota non.
   ⚠️ Et ça reste DÉCORRÉLÉ du nombre de parcelles (27 depuis le 426, zip 260
   pour la règle) : ce nombre-ci plafonne les résidents RECRUTÉS, celui-là
   décrit la ville. */
export const MAX_RESIDENTS = 20;
/* ═══════════════════════════════════════════════════════════════════════════
   LES TROIS MONUMENTS (425).
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ L'ANCIENNE MAIRIE DEVIENT L'ÉGLISE, ET ON NE TOUCHE PAS À SON DESSIN.
   Demande de Guillaume : « garder l'actuel townhall et le renommer église ».
   Le sprite `townhallSprite()` de fermeArt.js reste mot pour mot celui du
   235 — et c'était déjà la bonne lecture : le commentaire du zip 279 l'appelle
   « l'espèce d'église blanche ». On ne renomme donc pas un bâtiment, on lui
   rend son nom. Seuls la CONSTANTE et l'ÉTIQUETTE changent.
   ⚠️ `TOWN_CHURCH` est délibérément un nom NEUF plutôt qu'un TOWN_HALL réutilisé
   pour l'église : `TOWN_HALL` continue d'exister et désigne maintenant un AUTRE
   bâtiment, à un AUTRE endroit. Garder l'ancien nom pour le nouveau sens aurait
   fait mentir tous les commentaires antérieurs d'un coup.

   ⚠️ ET ELLE SORT DE L'AXE CENTRAL. Elle était plantée sur la colonne de
   l'artère nord-sud, qu'elle bouchait ; on ne s'en apercevait pas parce que
   cette artère s'arrêtait avant. Sur une carte trois fois plus longue, une rue
   interrompue par un bâtiment se voit tout de suite. */
export const TOWN_CHURCH = { x: 66, y: 46, w: 8, h: 5 };   // ex-TOWN_HALL du zip 235, sprite 128×128

/* LE NOUVEL HÔTEL DE VILLE. Demande : « un nouveau bâtiment townhall différent
   des autres quelque part au centre ». Il borde la place à l'est, face à la
   fontaine — la position d'une mairie sur une place de village. Brique et
   pierre, beffroi à horloge : rien de commun avec le portique blanc de
   l'église ni avec le péristyle du tribunal, pour qu'aucun des trois ne puisse
   être confondu avec un autre à distance. Sprite 160×144, soit 10×9 cases,
   dont 6 rangées bloquantes. */
export const TOWN_HALL = { x: 112, y: 52, w: 10, h: 6 };

/* LE TRIBUNAL. Demande : « un autre bâtiment élégant néoclassique nommé
   tribunal, imposant, qui ressemble à un tribunal ».
   ⚠️ IL EST EN HAUTEUR, ET C'EST LE POINT ENTIER. Un tribunal néoclassique se
   regarde D'EN BAS : le perron, le péristyle et le fronton n'existent que pour
   ça. Le poser au niveau de la rue en aurait fait une grosse maison à colonnes.
   Posé au sommet de la volée monumentale, il est la RÉCOMPENSE de la montée —
   ce qui donne du même coup une raison d'être aux escaliers demandés par
   Guillaume, au lieu d'un escalier-démonstration qui ne mène nulle part.
   Sprite 192×176 (12×11 cases), 7 rangées bloquantes. */
export const TOWN_COURT = { x: 136, y: 14, w: 12, h: 7 };
export const TRAIN_BOARD = { x: 5, y: 30 };         // farm-side boarding spot on the platform (E to ride)

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 426 — COUPER DU BOIS À VALLEY TOWN.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « on doit pouvoir chop trees sur Valley Town aussi »,
   avec trois décisions prises explicitement : la coupe est **partagée et
   sauvegardée** (l'hôte arbitre, ça survit à la session), **tous** les arbres
   sont coupables, **ça repousse**, et seule la **hache** est réactivée en ville.

   ⚠️⚠️ LA COUPE NE TOUCHE PAS `townWorld.objects`, ET C'EST LA DÉCISION QUI
   PROTÈGE TOUT LE RESTE. La carte de la ville est un SINGLETON de module
   (`getTownWorldCached`) partagé par tous les remontages de l'onglet : y écrire
   ferait fuiter les arbres coupés d'une ferme à l'autre, dans le même onglet,
   sans le moindre message — on chargerait un code neuf et la ville arriverait
   déjà déboisée. L'état vit donc DANS L'ÉTAT PARTAGÉ (`shared.townChop`), il est
   consulté au dessin et à la collision, et il est sauvegardé avec la ferme.

   ⚠️ ET IL N'Y A AUCUNE MIGRATION SQL : `townChop` est un champ de plus dans le
   JSON de `ferme_saves`, comme `forcedWorld` au 392. Absent d'une sauvegarde
   antérieure = ville intacte, ce qui est exactement le bon comportement.

   Forme d'une entrée, indexée par case : `{ hp }` = arbre entamé, encore debout ;
   `{ r }` = arbre abattu, souche visible et TRAVERSABLE, qui repousse à `r`. */
export const TOWN_TREE_REGROW_MS = 2 * DAY_REAL_MS;  // deux jours de jeu (32 min réelles)
/* ⚠️ LA SOUCHE NE BLOQUE PAS, contrairement à celle de la ferme. Deux raisons,
   et la seconde est la vraie : d'abord un arbre abattu doit OUVRIR le passage,
   sinon couper en ville ne sert à rien ; ensuite la souche est le seul indice
   visible qu'un arbre repoussera là — une case redevenue vide ne dirait rien, et
   la repousse aurait l'air d'un arbre qui apparaît de nulle part. */
export const TOWN_STUMP_BLOCKS = false;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 426 — L'INTÉRIEUR DU TRIBUNAL, SUR TROIS NIVEAUX.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « un intérieur complet pour le tribunal avec étages,
   assez grand, avec différents bureaux, une salle d'audience etc. Tout ce
   qu'il faut pour mimer un tribunal dans un jeu comme Valley Farm — anticipe
   les usages du bâtiment et déduis-en le plan. »

   ⚠️ LE PLAN EST DÉDUIT DES USAGES, ET C'EST L'ESSENTIEL DE CE BLOC. Chaque
   pièce existe parce qu'une mécanique du jeu, existante ou évidente, a besoin
   d'un GUICHET quelque part :
     * le CADASTRE  ← les vingt-sept parcelles de Valley Town, qui affichent
       « à vendre » depuis le zip 234 sans qu'on puisse en acheter une ;
     * les PERMIS   ← la grange, le puits, le pont, la maison à niveaux : la
       ferme ne sait construire que par l'argent, jamais par l'autorisation ;
     * le NOTAIRE   ← les échanges entre joueurs, aujourd'hui impossibles ;
     * l'ÉTAT CIVIL ← les noms de ferme, les unions, les familiers déclarés ;
     * la SALLE D'AUDIENCE ← les litiges entre joueurs et les amendes ;
     * les SCELLÉS et les OBJETS TROUVÉS ← ce qu'on perd (mort, blessure) ;
     * les CELLULES ← la sanction, pendant naturel de l'audience ;
     * les ARCHIVES ← l'histoire de la ferme, déjà écrite mais jamais lisible.
   ⚠️ AUCUNE N'EST OPÉRATIONNELLE DANS CE ZIP, ET LE JEU LE DIT. Chaque porte
   porte sa plaque, chaque plaque annonce son service et sa mise en service
   « prochainement » (voir COURT_ROOMS.soon et le panneau d'affichage du hall).
   Un bâtiment qu'on visite en sachant à quoi il servira est une promesse ; le
   même bâtiment muet est un décor qu'on croit cassé.

   ⚠️⚠️ LES TROIS NIVEAUX TIENNENT DANS UNE SEULE GRILLE, EMPILÉE VERTICALEMENT,
   ET C'EST LA DÉCISION STRUCTURANTE. Il n'y a AUCUNE coordonnée d'étage : le
   niveau se DÉDUIT de `y` (voir courtFloorOf). Conséquences, toutes gratuites :
     * un joueur distant est au bon étage sans qu'on diffuse quoi que ce soit —
       ses x/y suffisent, exactement comme l'altitude de Valley Town (§3, §6) ;
     * rien à réconcilier, rien à désynchroniser, aucun champ de plus ;
     * les escaliers ne sont qu'un saut de coordonnée, pas un changement d'état.
   C'est le MÊME raisonnement que « l'altitude est une propriété de la case ».
   ═══════════════════════════════════════════════════════════════════════════ */
export const COURT_FLOOR_W = 46;    // largeur d'un niveau, en cases (murs compris)
export const COURT_FLOOR_H = 28;    // hauteur d'un niveau
export const COURT_FLOOR_GAP = 3;   // rangées de vide entre deux niveaux empilés
export const COURT_MAP_W = COURT_FLOOR_W;
export const COURT_MAP_H = 3 * (COURT_FLOOR_H + COURT_FLOOR_GAP);
// Les niveaux, du haut de la grille vers le bas. ⚠️ L'ORDRE EST LE PLAN : le
// rez-de-chaussée d'abord (c'est là qu'on entre), puis l'étage, puis le
// sous-sol — et non l'ordre physique (sous-sol en bas), qui obligerait à des
// index négatifs pour rien.
/* ⚠️ `alt` EST L'ALTITUDE RÉELLE DU NIVEAU, et elle n'est pas décorative : c'est
   elle qui décide si une volée se dessine « qui monte » ou « qui descend »,
   DÉDUIT au lieu d'être écrit deux fois. L'ordre du tableau, lui, reste l'ordre
   du plan (on entre par le rez-de-chaussée), pas l'ordre physique. */
export const COURT_FLOORS = [
  { key: "ground",   emoji: "⚖️", alt: 0 },
  { key: "upper",    emoji: "🗂️", alt: 1 },
  { key: "basement", emoji: "🔒", alt: -1 },
];
// Sol / structure. ⚠️ ENUM PROPRE À L'INTÉRIEUR, jamais les G_* de la ferme :
// ces valeurs ne sortent pas du tribunal (carte regénérée, jamais persistée),
// donc rien à migrer — et un G_ de plus, lui, se paierait sur les sauvegardes.
export const CT_VOID = 0;       // hors bâtiment (jamais dessiné, toujours bloquant)
export const CT_MARBLE = 1;     // dallage du hall
export const CT_WOOD = 2;       // parquet des bureaux
export const CT_CARPET = 3;     // tapis de la salle d'audience
export const CT_STONE = 4;      // dalle brute du sous-sol
export const CT_WALL = 5;
export const CT_DOOR = 6;       // porte de pièce (traversable, porte une plaque)
export const CT_STAIR_UP = 7;   // marche vers le niveau précédent dans COURT_FLOORS
export const CT_STAIR_DOWN = 8; // ... et vers le suivant
export const CT_EXIT = 9;       // le seuil : on ressort en ville
export const CT_DAIS = 10;      // estrade de la salle d'audience (traversable, surélevée au dessin)
export const CT_WINDOW = 11;    // mur percé d'une fenêtre (bloque comme un mur)
export const CT_BARS = 12;      // grille de cellule (bloque, se voit au travers)

/* LES PIÈCES. `x,y,w,h` est le rectangle MURS COMPRIS — deux pièces mitoyennes
   partagent donc leur cloison, et le générateur n'a aucun cas particulier à
   traiter. `doors` donne les cases de porte, TOUJOURS sur le mur qui touche le
   couloir central (x = 18 à l'ouest, x = 27 à l'est).
   ⚠️ `kind` PILOTE LE MOBILIER (voir courtFurnish) : c'est ce qui évite d'écrire
   quatre cents positions de meubles à la main et de les voir dériver du plan. */
export const COURT_CORRIDOR = { x: 18, y: 0, w: 10, h: 28 };
export const COURT_ROOMS = [
  // ---------------- REZ-DE-CHAUSSÉE : ce qui se passe en public.
  /* ⚠️ LA PORTE DE LA SALLE D'AUDIENCE EST AU SUD DE LA BARRE (y = 15), et pas
     au milieu du mur : on entre du côté du PUBLIC. Placée plus haut, elle
     déposait le visiteur dans le prétoire, derrière la balustrade — c'est-à-dire
     à la place des avocats, en ayant traversé une barrière qui est justement là
     pour dire qu'on ne la traverse pas. */
  { floor: 0, key: "courtroom", kind: "courtroom", x: 0, y: 0, w: 19, h: 20, doors: [{ x: 18, y: 15 }] },
  { floor: 0, key: "witness",   kind: "waiting",   x: 0, y: 19, w: 19, h: 9,  doors: [{ x: 18, y: 23 }] },
  { floor: 0, key: "clerk",     kind: "counter",   x: 27, y: 0, w: 19, h: 11, doors: [{ x: 27, y: 5 }] },
  { floor: 0, key: "robing",    kind: "robing",    x: 27, y: 10, w: 19, h: 10, doors: [{ x: 27, y: 14 }] },
  { floor: 0, key: "reception", kind: "counter",   x: 27, y: 19, w: 19, h: 9,  doors: [{ x: 27, y: 23 }] },
  // ---------------- ÉTAGE : les guichets, c'est-à-dire l'avenir du bâtiment.
  { floor: 1, key: "judge",     kind: "office",    x: 0, y: 0, w: 19, h: 11, doors: [{ x: 18, y: 5 }] },
  { floor: 1, key: "jury",      kind: "meeting",   x: 0, y: 10, w: 19, h: 10, doors: [{ x: 18, y: 14 }] },
  { floor: 1, key: "library",   kind: "library",   x: 0, y: 19, w: 19, h: 9,  doors: [{ x: 18, y: 23 }] },
  { floor: 1, key: "landreg",   kind: "office",    x: 27, y: 0, w: 19, h: 9,  doors: [{ x: 27, y: 4 }] },
  { floor: 1, key: "permits",   kind: "office",    x: 27, y: 8, w: 19, h: 8,  doors: [{ x: 27, y: 11 }] },
  { floor: 1, key: "notary",    kind: "office",    x: 27, y: 15, w: 19, h: 7, doors: [{ x: 27, y: 18 }] },
  { floor: 1, key: "registry",  kind: "office",    x: 27, y: 21, w: 19, h: 7, doors: [{ x: 27, y: 24 }] },
  // ---------------- SOUS-SOL : ce qu'on garde, et ce qu'on enferme.
  { floor: 2, key: "archives",  kind: "archive",   x: 0, y: 0, w: 19, h: 14, doors: [{ x: 18, y: 7 }] },
  { floor: 2, key: "evidence",  kind: "storage",   x: 0, y: 13, w: 19, h: 15, doors: [{ x: 18, y: 20 }] },
  /* ⚠️ LA PORTE DES CELLULES OUVRE SUR LE COULOIR DE GARDE (y = 9), au sud des
     grilles. À y = 6 elle ouvrait sur une CLOISON entre deux cellules : la
     pièce entière était inaccessible, et seule la porte avait l'air correcte.
     C'est le banc qui l'a vu — de l'extérieur, une porte percée dans un mur
     ressemble à une porte percée dans un mur. */
  { floor: 2, key: "cells",     kind: "cells",     x: 27, y: 0, w: 19, h: 14, doors: [{ x: 27, y: 9 }] },
  { floor: 2, key: "lostfound", kind: "storage",   x: 27, y: 13, w: 19, h: 9, doors: [{ x: 27, y: 17 }] },
  { floor: 2, key: "boiler",    kind: "boiler",    x: 27, y: 21, w: 19, h: 7, doors: [{ x: 27, y: 24 }] },
];
/* ═══════════════════════════════════════════════════════════════════════════
   LES CAGES D'ESCALIER. ⚠️ UNE CAGE EST UN LIEU, PAS UN TRAJET — et c'est la
   correction qui a fait passer le banc de contrôle.
   ───────────────────────────────────────────────────────────────────────────
   Premier jet : deux volées (« celle qui monte », « celle qui descend ») et une
   table de liaisons orientées. Résultat immédiat, trouvé par
   tools/verify-vallee.mjs : la liaison RDC → étage arrivait sur la volée
   DESCENDANTE de l'étage, c'est-à-dire nulle part — on montait dans un mur.
   Deux descriptions de la même cage (« la volée du départ » et « la volée de
   l'arrivée ») ne peuvent pas rester d'accord ; c'est le §8 de CLAUDE.md, mot
   pour mot, appliqué à de la géométrie.

   Une cage relie donc DEUX niveaux, au MÊME endroit, et tout le reste se
   déduit : le sens de la volée vient de la comparaison des `alt`, la
   destination vient de « l'autre niveau de ma cage ». Il n'y a plus rien à
   tenir en accord. */
export const COURT_STAIRWELLS = [
  { x: 20, y: 2, w: 2, h: 3, a: 0, b: 1 },   // la cage ouest : rez-de-chaussée ↔ étage
  { x: 24, y: 2, w: 2, h: 3, a: 0, b: 2 },   // la cage est : rez-de-chaussée ↔ sous-sol
];
export const COURT_ENTRY = { x: 22, y: 27 };  // le seuil, deux cases (x et x+1) au mur sud du RDC
export const COURT_SPAWN = { x: 22.5, y: 25 }; // où l'on se retrouve en entrant
export const COURT_ELEV_PX = 6;   // relief de l'estrade, en pixels d'écran
// Les services annoncés, dans l'ordre du panneau d'affichage du hall. Le libellé
// et le détail vivent dans fermeStrings (courtRoom*), jamais ici : ce tableau
// dit QUOI et OÙ, pas comment ça se raconte.
export const COURT_BOARD_ORDER = ["landreg", "permits", "notary", "registry", "courtroom", "clerk", "archives", "lostfound", "evidence", "cells"];

// --- Seasons (timing chosen by the model, per Guillaume's delegation) ---
// One season lasts SEASON_DAYS in-game days; purely visual for now (tint +
// HUD label), gameplay hooks come later with crops-per-season.
export const SEASON_DAYS = 7;
export const SEASONS = [
  { key: "spring", emoji: "🌸", tint: null },
  { key: "summer", emoji: "☀️", tint: "rgba(255,214,90,0.05)" },
  { key: "autumn", emoji: "🍂", tint: "rgba(224,138,44,0.09)" },
  { key: "winter", emoji: "❄️", tint: "rgba(150,185,255,0.11)" },
];

// --- Zip 235 (Guillaume) ---

// Saisons en TEMPS RÉEL : une saison dure désormais 7 jours réels (demande
// Guillaume : "change the seasons to be once every real 7 days it changes"),
// et n'est plus dérivée du jour de jeu. Ancre fixe (un lundi) pour que tous
// les clients calculent exactement la même saison sans aucune synchro.
// SEASON_DAYS ci-dessus reste utilisé pour la ROTATION HEBDOMADAIRE (en jours
// de JEU) des mondes du passage sombre, voir PASSAGE_WORLDS.
export const SEASON_REAL_MS = 7 * 24 * 60 * 60 * 1000;
export const SEASON_EPOCH = Date.UTC(2026, 0, 5); // lundi 5 janvier 2026, 00:00 UTC -> printemps

// Hiver : il neige (flocons plein écran, même mécanique que la pluie d'orage)
// et les léopards des neiges REMPLACENT les loups (même comportement, sprite
// reteinté blanc à rosettes, voir snowLeopardSprite/fermeArt.js).
export const SNOW_COUNT = 90;        // flocons affichés simultanément
export const SNOW_SPEED = 60;        // vitesse de chute, px/s écran
// Automne : les visiteurs veulent plus de citrouilles (biais de tirage de la
// culture demandée, voir classifyBuyOffer) ; feuillages orange (variantes de
// sprites, voir fermeArt.js).
export const AUTUMN_PUMPKIN_BIAS = 0.55; // proba de forcer la citrouille quand elle est candidate
export const PUMPKIN_CROP_ID = 3;
// Printemps : fleurs décoratives sur l'herbe (purement visuel, hash de case),
// fruits (pommes) sur une partie des chênes (E pour cueillir, 1x/jour réel
// par arbre) et buissons à baies posés par l'hôte (E = cueillir des baies,
// hache = bois). Baies et fruits sont des objets d'inventaire vendables au bac.
/* ⚠️⚠️ ZIP 398 — COLLISION D'IDENTIFIANT RÉPARÉE : O_BERRY_BUSH VALAIT 19,
   COMME O_SUCRERIE (voir plus haut, ligne ~130).
   ---------------------------------------------------------------------------
   Trouvée en cherchant un identifiant libre pour les vergers, par un contrôle
   de trois lignes (`tools/verify-objects.mjs`) — jamais en relisant : les deux
   déclarations sont à 2 500 lignes l'une de l'autre, chacune parfaitement
   correcte prise seule.

   CE QU'ELLE PRODUISAIT, et c'était silencieux :
     * `world.objects[i]` ne pouvait plus distinguer une sucrerie d'un buisson.
       `resolveBerryPick` teste `objects[i] !== O_BERRY_BUSH` : on pouvait donc
       CUEILLIR DES BAIES SUR LA SUCRERIE ;
     * le semeur de printemps compte les buissons existants avec le même test :
       une sucrerie posée réduisait d'autant le nombre de buissons de la saison ;
     * et le rendu dessinait l'un ou l'autre selon l'ordre des branches.

   POURQUOI C'EST LE BUISSON QUI DÉMÉNAGE, ET PAS LA SUCRERIE. `O_SUCRERIE` est
   déclaré LEGACY (zips 317-324) : d'anciennes sauvegardes contiennent encore
   des 19 qui désignent des sucreries, et les relire comme des buissons ferait
   disparaître un bâtiment payé 30 000 or. Les buissons, eux, sont du décor
   SAISONNIER que l'hôte repose chaque printemps jusqu'à BERRY_BUSH_MAX : au
   pire, une sauvegarde d'avant le 398 en perd quelques-uns, et la prochaine
   saison les remet. On déplace donc ce qui se répare tout seul.

   AUCUNE MIGRATION SUPABASE : ces valeurs vivent dans l'instantané JSON. */
export const O_BERRY_BUSH = 20;      // buisson à baies (printemps), hache = bois, E = baies
/* ZIP 398 — LES VERGERS : cultures PÉRENNES, plantées une fois.
   Demande de Guillaume : « des arbres fruitiers qui demeurent, produisent
   périodiquement des fruits mais ne nécessitent pas de replanter ». */
export const O_ORCHARD = 21;
export const BERRY_BUSH_MAX = 14;    // nombre max de buissons posés par l'hôte au printemps
export const BERRY_BUSH_HP = 2;
export const BERRY_BUSH_WOOD = 2;    // bois récolté en l'abattant
export const BERRY_PICK_MIN = 2;     // baies par cueillette (min..max)
export const BERRY_PICK_MAX = 4;
export const BERRY_SELL = 25;        // prix de vente d'une baie au bac
export const FRUIT_PICK_N = 2;       // pommes par cueillette d'arbre
export const FRUIT_SELL = 18;        // prix de vente d'une pomme au bac
export const FRUIT_TREE_MOD = 3;     // 1 chêne sur FRUIT_TREE_MOD (hash de case) porte des fruits au printemps

// --- Mondes tournants du passage sombre (zip 235, demande Guillaume :
// "every new week (game time) it rotates to a new land, similar to Folk of
// the Faraway Tree"). L'index de monde = floor((jour de jeu - 1) / SEASON_DAYS)
// % PASSAGE_WORLDS.length, donc tout le monde calcule la même rotation depuis
// s.day, sans synchro. Toutes les cartes réutilisent EVIL_SPAWN /
// EVIL_RETURN_PASSAGE (mêmes coordonnées d'arrivée/retour), si bien que toute
// la machinerie existante (fondu, walk-over de retour) marche telle quelle.
// Chaque monde a ses cadeaux/breloques et un animal de compagnie EXCLUSIF à
// attraper (1 tentative réussie par joueur et par semaine, chance
// PASSAGE_PET_CATCH_CHANCE ; l'animal rejoint station.pendingGifts comme les
// cadeaux des visiteurs, en attendant le système d'animaux).
/* --- Zip 385 : CADENCE DE ROTATION (demande Guillaume : « chaque terre reste
   3 jours de jeu »). Jusqu'ici l'index de monde se calculait sur SEASON_DAYS
   (7), constante qui ne sert PLUS QU'À ÇA depuis que les saisons sont passées
   en temps réel au zip 235. On lui donne son propre nom : une rotation de
   monde n'est pas une saison, et les confondre a déjà failli faire changer les
   deux d'un coup.

   ARITHMÉTIQUE, à garder en tête avant de retoucher ce chiffre : 5 mondes x 3
   jours = un cycle de 15 jours de JEU, et un jour de jeu vaut DAY_REAL_MS
   (16 min). Le Pays des Bonbons revient donc environ toutes les 4 h de jeu
   effectif. La demande initiale disait « tous les 10 jours » : ce serait
   PASSAGE_WORLD_DAYS = 2. Le seul chiffre à changer est celui-ci. */
export const PASSAGE_WORLD_DAYS = 3;

/* --- Zip 385 : FORÇAGE DE MONDE, POUR LES ESSAIS. -------------------------
   Quand cette clé n'est pas `null`, le passage sombre mène TOUJOURS au monde
   correspondant, quel que soit le jour de jeu. Demande explicite de Guillaume
   pour ce zip : « make candy land the land that appears upon this next update
   so i can test how its functionality ».

   >>> REMETTRE À null POUR RENDRE LA ROTATION AU JEU. <<<

   C'est la SEULE chose à défaire dans cette livraison, et elle est ici, seule,
   à cet endroit, pour cette raison. Le forçage ne pouvait pas se faire par un
   simple décalage de l'index : la rotation est dérivée de s.day, et chaque
   ferme est à un jour différent — un décalage aurait donné le Pays des Bonbons
   chez Guillaume et les Grottes de Cristal chez son partenaire de jeu, ce qui
   est précisément ce qu'il ne faut pas quand on teste à deux.

   >>> ZIP 392 : REMISE À null, SUR DEMANDE EXPLICITE DE GUILLAUME. <<<
   Elle avait traversé les zips 385, 386, 387 et 388. Ce qu'elle faisait est
   désormais fait, en mieux, par le MENU DÉVELOPPEUR (Cmd/Ctrl+Shift+X) : même
   effet partagé par tous les joueurs, mais réversible d'un clic au lieu d'une
   livraison, et affiché à l'écran tant qu'il est actif.

   Ce que la remise à null rend au jeu, et qu'il faut savoir en le relisant :
   les quatre terres autres que le Pays des Bonbons, le défi de fuite (qui n'est
   accessible que depuis les Terres Maléfiques depuis le zip 386), et la variété
   des familiers de terre rapportés par les visiteurs — sous forçage « candy »,
   seul le renard barbe à papa pouvait être offert (voir passagePetOf).

   Le forçage en dur reste lu par passageWorldIndex, DERRIÈRE le menu : reposer
   une clé ici continue de fonctionner, pour les essais qui doivent survivre à
   un rechargement sans passer par une ferme sauvegardée. */
export const PASSAGE_FORCE_KEY = null;

/* --- Zip 386 : À QUOI MÈNE LE PONT DE CHAQUE TERRE -----------------------
   Jusqu'au zip 385, la chaussée de pierre et sa porte (G_RUN_GATE) étaient
   construites À L'IDENTIQUE sur les six cartes, et menaient partout au défi de
   fuite. Décision Guillaume (zip 386) : **chaque terre a son propre pont, et
   ils ne mènent pas au même endroit.**

   LA GÉOMÉTRIE, ELLE, NE CHANGE PAS D'UN PIXEL. Même tracé, même largeur,
   même case de porte sur les six cartes — seuls l'HABILLAGE (`bridge`) et la
   DESTINATION (`PASSAGE_GATE_DEST`) varient. C'est délibéré et c'est ce qui
   permet à verify-gate.mjs et verify-deck.mjs de continuer à balayer les six
   cartes sans changer de sens : ils vérifient qu'on ARRIVE au bout du pont,
   ce qui reste vrai et reste nécessaire partout.

   `bridge` est lu par drawBridgeTile/drawBridgeOverlay (fermeArt.js).
   Une clé inconnue retombe sur la pierre — un monde ajouté sans habillage
   sera terne, jamais cassé. */
export const PASSAGE_GATE_DEST = {
  evil: "run",      // défi de fuite (zip 372) — sa seule terre depuis le 386
  /* ⚠️ ZIP 411 — LE PONT ARC-EN-CIEL A CHANGÉ DE DESTINATION.
     Il menait au Gourmandin depuis le 386 ; il mène désormais à LA GRANDE
     DESCENTE (public/candyluge/). Le Gourmandin, lui, n'a pas disparu : il a
     déménagé au milieu du lac (voir CANDY_MONSTER_APPROACH). Demande de
     Guillaume, et le déplacement est le chantier — le mini-jeu lui-même n'est
     pas touché d'une ligne. */
  candy: "luge",    // LA GRANDE DESCENTE (zip 411), au bout du pont arc-en-ciel
  maze: "maze",     // LE LABYRINTHE (zip 393), au bout du pont de haies
  /* ⚠️ ZIP 418 — LE PONT DE CRISTAL MÈNE ENFIN QUELQUE PART.
     Il était « construit et habillé, destination à venir » depuis le 386, soit
     trente-deux zips. Il ouvre sur LA VALLÉE DE VERRE (public/crystal/), et ce
     mini-jeu ne ressemble à aucun des trois autres : c'est un récit à
     chapitres, avec des cinématiques et des choix, pas une partie qu'on gagne
     ou qu'on perd. Voir CRY_* plus bas pour ce que ça change. */
  crystal: "vallee", // LA VALLÉE DE VERRE (zip 418), au bout du pont de cristal
  // meadow : pont construit et habillé, destination à venir.
};

/* ==========================================================================
   ZIP 418 — LA VALLÉE DE VERRE (mini-jeu des Grottes de Cristal)
   ==========================================================================
   Quatrième mini-jeu, servi depuis public/crystal/, au bout du pont de
   cristal. Jeu NARRATIF : sept chapitres, des cinématiques en pixel art, des
   choix qui posent des drapeaux, et un segment jouable par chapitre.

   ⚠️ IL NE RAPPORTE PAS UN SCORE, IL RAPPORTE UN AVANCEMENT — et c'est la
   seule chose à comprendre avant de brancher quoi que ce soit. Les trois
   autres mini-jeux ont une fin : on meurt, on gagne, on recommence pour faire
   mieux. Celui-ci a des CHAPITRES : on ne le rejoue pas, on le continue. Coller
   un tableau de scores à la fin d'un chapitre casserait exactement ce qu'on
   essaie de construire.

   ⚠️ CONSÉQUENCE : PAS DE BLESSURE, PAS DE PRIME, PAS ENCORE. Au chapitre 1 on
   ne peut ni mourir ni gagner d'or — il n'y a rien à perdre dans la vallée
   avant qu'on n'y ait des bêtes à perdre (chapitre 3). Les constantes
   ci-dessous existent pour le jour où ce sera le cas, et elles ne sont pas
   encore lues. C'est délibéré et c'est écrit ici pour qu'on ne les croie pas
   branchées.

   ⚠️ LE BUT DU JEU EST DE RAMENER DEUX CHOSES À LA FERME : des animaux
   (renne d'aurore, chevaux de verre, tortue gemme — le familier canon de ce
   monde —, chouette de givre) et UN HOMME, Aubin, qui deviendra un second
   ouvrier à côté de Greg, spécialisé dans la survie des bêtes en hiver.
   ========================================================================== */
export const CRY_SHARD_GOLD = 30;      // or par éclat de givre rapporté
export const CRY_PRIZE_GOLD = 1200;    // fin du récit, UNE FOIS par ferme
export const CRY_MAX_SHARDS = 60;      // plafond anti-message-aberrant, cf. LAB_MAX_*
export const CRY_MAX_CHAPTER = 7;

/* ==========================================================================
   ZIP 393 — LE LABYRINTHE (mini-jeu du Pays du Labyrinthe)
   ==========================================================================
   Troisième mini-jeu, servi depuis public/labyrinth/, au bout du pont de
   haies. Jeu 3D à la troisième personne : on avance à la torche dans un
   dédale de pierre POSÉ SUR LE LAC VIOLET, on trouve une épée, on affronte
   des rôdeurs, on fuit un traqueur increvable, on évite les trous, on
   ressort au nord.

   ⚠️ NE PAS CONFONDRE AVEC `MAZE_PRIZE_GOLD` (zip 235), juste au-dessus :
   celui-là paie le coffre au centre du labyrinthe de HAIES de la carte 2D,
   il est bel et bien lu (voir la requête "mazePrize" dans FermeGame.js), et
   il n'a rien à voir avec le mini-jeu 3D. Les deux coexistent sur la même
   terre : le coffre des haies se ramasse en se promenant, la récompense
   ci-dessous se gagne en traversant le dédale de pierre.

   TROIS DÉCISIONS DE GUILLAUME, prises avant la première ligne de code :
     - épée TROUVÉE dans le labyrinthe (donc on commence désarmé — le
       générateur borne cette période, voir SWORD_MAX_DEPTH côté jeu) ;
     - torche qui SE CONSUME si on ne la ravive pas ;
     - conséquences « comme le défi de fuite » : mort → blessé 10 min, butin
       gardé ; sortie → on ressort au pied du pont, sur la carte du monde
       sombre, avec de l'or.

   LA DURÉE DE BLESSURE EST CELLE DU DÉFI (RUN_INJURED_MS, 10 min) et non
   EVIL_INJURED_MS (30 min) : décision Guillaume, on doit pouvoir retenter
   dans la soirée. On réutilise la constante au lieu d'en créer une jumelle —
   deux nombres qui doivent rester égaux finissent toujours par diverger.
   ========================================================================== */
export const LAB_PRIZE_GOLD = 900;         // sortie réussie, UNE FOIS PAR VENUE du labyrinthe
export const LAB_SHARD_GOLD = 40;          // or par éclat rapporté (même en cas de mort)
/* Plafonds anti-message-aberrant, même rôle que RUN_MAX_* : le mini-jeu se
   déroule ENTIÈREMENT côté client, l'hôte persiste ce qu'on lui dit et ne peut
   donc pas le croire sur parole. Ces bornes ne rendent pas la triche
   impossible, elles empêchent qu'un bug ou un message forgé n'injecte une
   fortune dans une sauvegarde partagée et durable. 26 éclats sont posés par
   dédale (SHARD_COUNT) : 40 est confortable et reste borné. */
export const LAB_MAX_SHARDS = 40;
export const LAB_MAX_SCORE = 60000;

export const PASSAGE_WORLDS = [
  { key: "evil", bridge: "stone",    name: "Terres Maléfiques",   nameEn: "Evil Lands",
    bg: "#0b120c", g1: "#182417", g2: "#182417", waterA: "#241246", waterB: "rgba(160,70,220,",
    pickupColor: null, pickupCount: 0,
    pet: { id: "shadowcat", name: "Chat d'ombre", nameEn: "Shadow cat" }, petHue: 260 },
  { key: "candy", bridge: "candy",   name: "Pays des Bonbons",    nameEn: "Candy Land",
    bg: "#f2b8d0", g1: "#f0c2d8", g2: "#eab4ce", waterA: "#c86ea8", waterB: "rgba(255,190,230,",
    pickupColor: "#e0356e", pickupCount: 14,
    pet: { id: "candyfox", name: "Renard barbe à papa", nameEn: "Cotton-candy fox" }, petHue: 300 },
  { key: "maze", bridge: "mazestone", name: "Pays du Labyrinthe",  nameEn: "Maze Land",
    bg: "#25331f", g1: "#4a6b38", g2: "#446434", waterA: "#3a7bc8", waterB: "rgba(190,225,255,",
    pickupColor: "#e8c860", pickupCount: 6,
    pet: { id: "mazemouse", name: "Souris des haies", nameEn: "Hedge mouse" }, petHue: 90 },
  { key: "crystal", bridge: "crystal", name: "Grottes de Cristal",  nameEn: "Crystal Caverns",
    bg: "#0c1226", g1: "#1c2440", g2: "#182038", waterA: "#12386a", waterB: "rgba(120,200,255,",
    pickupColor: "#7ce0f0", pickupCount: 12,
    pet: { id: "gemturtle", name: "Tortue gemme", nameEn: "Gem turtle" }, petHue: 180 },
  { key: "meadow", bridge: "cloud",  name: "Prairie Céleste",     nameEn: "Sky Meadow",
    bg: "#a8d8f0", g1: "#8fd06a", g2: "#86c862", waterA: "#5ab0e8", waterB: "rgba(255,255,255,",
    pickupColor: "#f0b428", pickupCount: 12,
    pet: { id: "cloudlamb", name: "Agneau des nuages", nameEn: "Cloud lamb" }, petHue: 40 },
];
/* ==========================================================================
   ZIP 392 — MENU DÉVELOPPEUR (secret, hôte uniquement)
   ==========================================================================
   Ouvert par Cmd+Shift+X (macOS) ou Ctrl+Shift+X (Windows/Linux).

   POURQUOI CETTE COMBINAISON ET PAS UNE AUTRE. Contrainte posée par Guillaume :
   ne jamais entrer en conflit avec Safari ni Chrome. Les lettres Cmd+Shift sont
   presque toutes prises par l'un ou l'autre — N (navigation privée), T (rouvrir
   l'onglet), W (fermer la fenêtre), R (rechargement forcé / lecteur Safari),
   B, D, G, H, I, J, M, O, P, U, V, Y, Z... `X` est la seule lettre qui ne soit
   réservée ni par Chrome, ni par Safari, ni par Firefox, sur aucune des trois
   plateformes. Ne pas la changer sans refaire cette vérification.

   Le raccourci est volontairement le SEUL moyen d'ouvrir ce menu : aucun bouton
   ne l'annonce à l'écran, un joueur ne peut pas tomber dessus par hasard. */
export const DEV_MENU_KEY = "KeyX";

/* Destinations du téléporteur du menu. `zone` est la zone d'arrivée au sens de
   m.zone ; le détail des coordonnées est résolu dans devTeleport (FermeGame.js)
   parce que deux d'entre elles dépendent du monde généré, pas d'une constante :
   le passage sombre est posé par la génération de la ferme (w.darkPassage), et
   le bout du pont se dérive de RUN_GATE.

   ORDRE VOLONTAIRE : de la ferme vers le plus lointain. C'est l'ordre dans
   lequel on teste. */
export const DEV_TELEPORTS = [
  { key: "farm",    zone: "farm" },  // devant la maison (SPAWN)
  { key: "passage", zone: "farm" },  // devant le passage sombre, côté ferme
  { key: "town",    zone: "town" },  // Valley Town, descente du train
  /* ⚠️ 425 — TROIS ARRÊTS DE PLUS DANS VALLEY TOWN, ET C'EST LA CARTE QUI LES
     RÉCLAME. Elle mesurait 64×48 : la descente du train suffisait, on voyait
     tout en dix secondes. Elle fait 192×144, et rejoindre le belvédère à pied
     demande une minute de marche — à répéter à chaque rechargement, pour
     regarder une ombre. Un outil de test dont le coût dépasse ce qu'il fait
     gagner cesse d'être utilisé, et c'est comme ça qu'on finit par livrer sans
     regarder (§9 de CLAUDE.md).
     Les coordonnées se DÉRIVENT des repères de la ville dans devTeleport, elles
     ne sont pas recopiées ici : déplacer la place ne doit pas laisser un
     téléporteur pointé sur l'herbe. */
  { key: "townBoutique",  zone: "town" },  // zip 427 : la Haute-Ville, devant la Maison Garfield (le seul quartier qu'on n'atteint qu'en montant)
  { key: "townPlaza",     zone: "town" },  // la place centrale, devant la fontaine
  { key: "townCourt",     zone: "town" },  // le parvis du tribunal, en Haute-Ville
  { key: "townBelvedere", zone: "town" },  // le second palier
  { key: "townMarket",    zone: "town" },  // zip 426 : le champ de foire, enfin occupé
  { key: "townLake",      zone: "town" },  // zip 426 : la promenade du lac, au sud
  /* ⚠️ 426 — LES TROIS NIVEAUX DU TRIBUNAL, ET C'EST LE MÊME RAISONNEMENT QU'AU
     425 : traverser la ville, entrer, puis monter deux volées à chaque
     rechargement pour regarder un bureau finit par ne plus se faire du tout.
     Un outil de test dont le coût dépasse ce qu'il fait gagner cesse d'être
     utilisé — et c'est comme ça qu'on livre sans regarder. */
  { key: "court",         zone: "court" }, // le hall, au rez-de-chaussée
  { key: "courtUpper",    zone: "court" }, // l'étage des bureaux
  { key: "courtBasement", zone: "court" }, // le sous-sol
  { key: "world",   zone: "evil" },  // arrivée dans la terre en cours (EVIL_SPAWN)
  { key: "bridge",  zone: "evil" },  // pied du pont de la terre en cours
];

/* Le téléport « pied du pont » ne pose PAS le joueur sur RUN_GATE : marcher sur
   cette dalle déclenche l'embuscade puis le mini-jeu de la terre (voir
   checkWalkOverPassage). On atterrit donc quelques cases à l'OUEST, d'où l'on
   voit le pont et où il reste un pas à faire pour l'emprunter — ce qui est
   précisément ce qu'on veut montrer à quelqu'un. */
export const DEV_BRIDGE_OFFSET = 3;

export const PASSAGE_PET_CATCH_CHANCE = 0.35;
// ⚠️ ZIP 388 : PLUS LUE NULLE PART. La capture d'un familier en ramassant une
// breloque a été supprimée (voir resolvePassagePickup) — c'était l'attribution
// « injustifiée et aléatoire » signalée par Guillaume. La constante est
// conservée, et commentée ici plutôt que supprimée, pour deux raisons : elle
// documente l'ancien comportement, et la retirer obligerait à toucher un
// fichier de plus pour zéro effet. Si les familiers redevenaient un jour
// attrapables, c'est ici qu'on reviendrait.
export const PASSAGE_LOOT_GOLD_MIN = 25;   // or accordé par breloque ramassée (min..max)
export const PASSAGE_LOOT_GOLD_MAX = 75;
export const MAZE_PRIZE_GOLD = 300;        // récompense du coffre au bout du labyrinthe (1x/joueur/semaine)
export const CANDY_SPEED_MS = 60 * 1000;   // durée du bonbon magique "vitesse" (buff local)
export const CANDY_SPEED_MUL = 1.5;

/* --- Zip 385 : LE GOURMANDIN (mini-jeu du Pays des Bonbons) ---------------
   Mini-jeu façon « Cut the Rope » servi depuis public/candyland/, ouvert en
   s'approchant du monstre posé sur la carte. Quinze niveaux, deux paliers.

   POURQUOI CES DEUX PALIERS SE COMPORTENT DIFFÉREMMENT (arbitrage Guillaume) :
   l'or du niveau 10 est REJOUABLE — une fois par venue du Pays des Bonbons —
   tandis que le chat berlingot du niveau 15 ne s'obtient QU'UNE FOIS.

   « Une fois par venue » et non « une fois par visite » : une visite se répète
   en ressortant et en rentrant par le passage, ce qui aurait fait de 10 000
   pièces un bouton à or infini (un moulin en coûte 30 000). La venue, elle,
   est le CRÉNEAU de rotation — le numéro de tranche de PASSAGE_WORLD_DAYS
   jours — et il est strictement croissant : il ne peut pas être rejoué.
   Voir CANDY_GAME_BLOCK / f.inv.candyGoldBlock. */
export const CANDY_GAME_LEVELS = 15;
export const CANDY_GAME_GOLD_LEVEL = 10;
export const CANDY_GAME_GOLD = 10000;
export const CANDY_GAME_PET_LEVEL = 15;
export const CANDY_GAME_PET_ID = "candycat";
// Position FIXE du Gourmandin sur la carte, comme EVIL_CAULDRON_SPAWN pour le
// chaudron. Au sud-ouest : loin de l'arrivée (EVIL_SPAWN) pour qu'il y ait un
// bout de chemin à faire, loin de la mare (générée autour de x 22-36 / y 30-40)
// et loin de la rive est (EAST_LAKE_X) pour ne pas se disputer l'espace avec la
// chaussée du défi de fuite.
/* Zip 386 : LE GOURMANDIN A DÉMÉNAGÉ SUR LE PONT. Il était au sud-ouest de la
   carte (18, 52) et s'ouvrait à la touche E ; demande Guillaume : « the cut the
   rope candy game should be accessed via this rainbow bridge ».

   Il est donc posé DEUX CASES À L'EST de la porte, c'est-à-dire juste devant le
   joueur qui avance sur le pont — et c'est la porte elle-même qui ouvre le
   mini-jeu, en marchant dessus, sans aucune touche. Le monstre EST le repère
   visuel de la case de déclenchement : la règle du zip 378 (« rien ne marque
   cette case ») valait pour le défi de fuite, où la surprise de l'embuscade
   était l'effet recherché. Ici c'est l'inverse — on doit voir où l'on va.

   Conséquence : plus d'invite E, plus de dégagement de cases à la génération
   (le tablier du pont n'a jamais d'objets), et le mini-jeu n'a plus qu'UNE
   seule porte d'entrée au lieu de deux. */
/* ⚠️ ZIP 411 — LE GOURMANDIN DÉMÉNAGE UNE SECONDE FOIS : AU MILIEU DU LAC.
   Demande de Guillaume : « mets un monstre similaire au monstre du mini jeu au
   milieu du lac du monde candy et quand on s'approche du lac central un message
   "donne à manger au gentil monstre Candy" oui/non s'affiche ».

   TROIS CONSÉQUENCES, et la troisième est la plus importante :

     1. SA POSITION N'EST PLUS UNE CONSTANTE. Le lac est tiré au sort à la
        génération du monde ; le monstre est donc posé sur `ew.lake`, exporté
        pour l'occasion par generatePassageWorld. Une constante en dur aurait
        planté le monstre dans l'herbe quatre semaines sur cinq.

     2. ON NE MARCHE PLUS SUR RIEN. Le déclenchement du 386 était une CASE : on
        posait le pied dessus, le jeu s'ouvrait. Ici la case est de l'eau, et
        l'eau ne se marche pas. C'est donc une APPROCHE (rayon ci-dessous) qui
        pose une question — et une question se refuse, ce que la case ne
        permettait pas.

     3. ELLE SE RÉARME EN S'ÉLOIGNANT. Sans ce verrou (le même que
        runGateArmedRef pour la porte du pont), répondre « non » rouvrirait la
        question à l'image suivante, puisqu'on est toujours près du lac. Le
        joueur serait prisonnier de sa propre réponse. */
export const CANDY_MONSTER_APPROACH = 5.5;   // distance de déclenchement, en cases
export const CANDY_MONSTER_REARM = 8.0;      // ... et distance de réarmement (toujours > la précédente)

/* --- Zip 411 : LA GRANDE DESCENTE (public/candyluge/) --------------------
   Quatrième mini-jeu, au bout du pont arc-en-ciel, à la place du Gourmandin.
   Descente en luge sur une piste de barbe à papa : on évite des gourmands
   mobiles aux flèches, on ramasse des bonbons, on dérape.

   ⚠️ IL SE COMPORTE COMME LE GOURMANDIN, PAS COMME LE DÉFI DE FUITE : aucune
   blessure, aucun report de position, aucune cinématique. Le Pays des Bonbons
   est un monde PAISIBLE (décision du zip 235 : seul « evil » garde des
   monstres), et lui coller une sanction de sortie en ferait un second monde
   sombre. On ouvre, on descend, on revient là où l'on était.

   Les plafonds ont le même rôle que RUN_MAX_* et LAB_MAX_* : le mini-jeu se
   déroule ENTIÈREMENT côté client, l'hôte persiste ce qu'on lui dit et ne peut
   donc pas le croire sur parole. Ils n'empêchent pas la triche, ils empêchent
   qu'un bogue ou un message forgé n'injecte une fortune dans une sauvegarde
   partagée et durable. */
export const LUGE_GOLD_PER_CANDY = 6;      // or par bonbon ramassé
export const LUGE_FINISH_GOLD = 450;       // prime d'arrivée, UNE FOIS PAR VENUE au Pays des Bonbons
export const LUGE_MAX_CANDIES = 200;
export const LUGE_MAX_SCORE = 60000;

/* --- Zip 386 : LES LICORNES DU PAYS DES BONBONS --------------------------
   Demande Guillaume : « white unicorns with rainbow sparkly hair and tail
   roaming around in candy land ».

   DÉCORATION PURE, ET C'EST CE QUI LES REND GRATUITES. Leur position est
   DÉRIVÉE du temps et d'un index (voir unicornAt, FermeGame.js) : aucun état,
   aucune sauvegarde, AUCUN MESSAGE RÉSEAU. Les deux joueurs voient la même
   licorne au même endroit parce qu'ils calculent la même fonction du même
   temps, pas parce que quelqu'un le leur a dit.

   C'est la même économie que les loups de l'embuscade (zip 375) poussée plus
   loin : eux avaient un état local, celles-ci n'en ont aucun. Le jour où on
   voudra les attraper, il faudra tout reprendre côté hôte — et ce sera un
   chantier, pas un réglage. */
export const CANDY_UNICORNS = 7;              // nombre sur toute la carte
export const CANDY_UNICORN_ROAM = 5.5;        // rayon d'errance autour du point d'ancrage, en cases
export const CANDY_UNICORN_PERIOD_MS = 26000; // durée d'un tour de promenade

// --- Valley Town, suite (zip 235) ---
export const TOWN_HOUSE_STYLES = 10;       // 10 façades de base gratuites (R à sa porte pour changer)

// Rappel des visiteurs qui flânent : pendant ce délai après un "rendez-vous à
// la mairie", ils reviennent (et restent) sur la place au lieu de vagabonder.
export const VISITOR_RECALL_MS = 2 * 60 * 1000;
export const VISITOR_ROAM_HOP = 8;         // longueur max (tuiles) d'une étape de balade libre sur toute la carte

// --- Montgolfière (zip 302, demande Guillaume) : attraction touristique ---
// Business indépendant des ateliers d'artisans : pas de skill dédié dans
// VISITOR_ROSTER, pas de bâtiment à construire. Le joueur désigne comme
// pilote N'IMPORTE QUEL résident DÉJÀ INSTALLÉ (st.residents), sans lui
// retirer son métier d'origine — "sans attribution" = pas de skill/atelier
// propre à créer pour ce business, on réutilise un résident existant.
export const BALLOON_TICKET_PRICE = 50;    // prix du billet, par passager
export const BALLOON_CAPACITY = 4;         // places dans la nacelle
// Horaires FIXES en temps de jeu (minutes depuis minuit, cf. DAY_START_MIN/
// DAY_END_MIN) : 10h00 (tour du matin) et 20h00 (tour de nuit).
export const BALLOON_DEPARTURES_MIN = [10 * 60, 20 * 60];
// Fenêtre d'embarquement AVANT chaque départ (horloge réelle, indépendante de
// la vitesse du temps de jeu) : les billets ne sont vendables que pendant
// cette fenêtre. Décision Guillaume : le vol part à l'heure même incomplet.
export const BALLOON_BOARDING_REAL_MS = 90 * 1000; // 1min30 réelles avant le départ
export const BALLOON_FLIGHT_REAL_MS = 3 * 60 * 1000; // durée réelle d'un survol complet
// Point d'ancrage visuel (hangar/plateforme au sol) où la montgolfière est
// visible posée hors vol et pendant l'embarquement. Purement décoratif, pas
// de collision dédiée (cf. Guillaume à ajuster visuellement en jeu si besoin).
// Zip 307 (demande Guillaume : "une belle zone de landing déplaçable, peut-
// être rive droite pour l'instant") : ce point ne sert plus que de valeur par
// défaut/de repli — le joueur peut désormais la déplacer avec l'outil main
// (comme un bâtiment d'artisan), la position choisie est alors persistée dans
// station.balloon.anchor (voir balloonAnchorPos, FermeGame.js). Choisie ici
// rive droite (x > riverCenter, côté opposé à la maison, cf. WOLF_ROAM_RADIUS
// plus bas), juste au sud de la traversée nord (bridgeSites `by = 42`, rivière
// centrée ~x=95 à cette hauteur) : une position raisonnable proche du pont.
export const BALLOON_ANCHOR = { x: 108, y: 46 };

/* ============================================================================
   ZIP 398 — LES VERGERS : DES CULTURES QUI DEMEURENT.
   ----------------------------------------------------------------------------
   Demande de Guillaume, mot pour mot : « ajouter les nouvelles cultures
   suivantes : des arbres fruitiers qui demeurent, produisent périodiquement des
   fruits mais ne nécessitent pas de replanter. Trouve un mécanisme cohérent. »

   ⚠️ POURQUOI CE N'EST PAS UNE ENTRÉE DE PLUS DANS `CROPS`, ET POURQUOI ÇA
   COMPTE. Le pipeline `CROPS` est entièrement piloté par les données — boutique,
   inventaire, pousse, sprite, vente — et il a une hypothèse gravée partout :
   **une culture disparaît quand on la récolte**. `resolveHarvest` efface la case
   et rend la parcelle à la terre nue. Ajouter un « pérenne » dans CROPS aurait
   demandé un drapeau lu à sept endroits différents, dont trois qui ne se
   connaissent pas. C'est le genre d'exception qui pourrit une table de données
   propre pendant dix zips.

   Un verger est donc un OBJET DE TUILE (`O_ORCHARD`) avec son état par case,
   sur le modèle EXACT de `world.mills` : une Map idx → état, sérialisée avec le
   monde, diffusée par `payload.orchards`, avancée par le tick de l'hôte. Ce
   modèle est déjà écrit, déjà persisté, déjà réseau — on ne réinvente rien.

   LE MÉCANISME, ET SA COHÉRENCE :
     1. on achète un PLANT à la boutique, on le pose comme un moulin ;
     2. il pousse pendant `matureMs` (quatre stades visibles) ;
     3. arrivé à maturité, il porte des fruits tous les `cycleMs` ;
     4. `E` cueille — l'arbre RESTE, le compteur repart ;
     5. hors saison, il ne produit pas : il attend. C'est ce qui donne au
        verger son rythme d'année et empêche qu'il devienne une rente plate ;
     6. la hache l'abat et rend du bois. C'est réversible, donc c'est un choix.

   ⚠️⚠️ LES CYCLES ET LES RENDEMENTS ONT ÉTÉ CORRIGÉS APRÈS MESURE, PAS AVANT.
   La première écriture donnait des cycles courts (5 à 9 h) et de gros paniers
   (jusqu'à 8 fruits). `tools/verify-orchards.mjs` a fait tourner un plant sur
   sept jours simulés et sorti le chiffre : **1 870 or par jour et par case**
   pour un myrtillier, contre 427 pour la meilleure culture existante (la
   citrouille). Vingt-quatre vergers auraient rapporté plus de 300 000 or par
   semaine — un moulin en coûte 30 000. Les neuf cultures du jeu seraient
   devenues du décor en une soirée.

   Aucun raisonnement ne donnait ça : chaque nombre pris seul paraissait
   raisonnable, c'est leur PRODUIT qui dérapait. Les valeurs actuelles visent
   700 à 900 or/jour/case, soit environ le double d'une bonne culture — assez
   pour récompenser un investissement long et sans replantage, pas assez pour
   remplacer le reste du jeu. Le contrôle compare désormais aux CULTURES
   EXISTANTES et non à un idéal (règle du zip 379).

   ⚠️ LE PRIX EST CALCULÉ, PAS CHOISI. Un plant coûte `saplingCost` et rapporte
   `yieldAvg × fruitSell` par cycle. Le seuil de rentabilité est écrit dans
   chaque entrée (`payback`, en cycles) : il tourne autour de 9 à 12 cycles,
   c'est-à-dire plusieurs jours réels. Un verger doit être un INVESTISSEMENT —
   plus cher qu'une graine, plus lent, et meilleur à la longue. S'il était
   rentable en deux cycles, personne ne planterait plus rien d'autre, et les
   neuf cultures existantes deviendraient du décor.
   ========================================================================== */
const OH = 3600 * 1000;
export const ORCHARDS = [
  {
    id: "lemon", kind: "tree",
    name: "Citronnier", nameEn: "Lemon tree",
    saplingName: "Plant de citronnier", saplingNameEn: "Lemon sapling",
    saplingCost: 1400, matureMs: 30 * OH, cycleMs: 11 * OH,
    yieldMin: 3, yieldMax: 5, fruit: "lemon",
    // Le citron est le seul à porter en hiver : c'est l'agrume, et ça donne une
    // raison de planter un verger même quand tout le reste dort.
    seasons: ["spring", "summer", "autumn", "winter"],
    payback: 11,
  },
  {
    id: "strawberry", kind: "low",
    name: "Fraisier", nameEn: "Strawberry plant",
    saplingName: "Plant de fraisier", saplingNameEn: "Strawberry plant",
    saplingCost: 520, matureMs: 10 * OH, cycleMs: 9 * OH,
    yieldMin: 3, yieldMax: 5, fruit: "strawberry",
    seasons: ["spring", "summer"],
    payback: 9,
  },
  {
    id: "raspberry", kind: "bush",
    name: "Framboisier", nameEn: "Raspberry bush",
    saplingName: "Plant de framboisier", saplingNameEn: "Raspberry cane",
    saplingCost: 760, matureMs: 16 * OH, cycleMs: 11 * OH,
    yieldMin: 3, yieldMax: 5, fruit: "raspberry",
    seasons: ["summer", "autumn"],
    payback: 10,
  },
  {
    id: "blueberry", kind: "bush",
    name: "Myrtillier", nameEn: "Blueberry bush",
    saplingName: "Plant de myrtillier", saplingNameEn: "Blueberry bush",
    saplingCost: 980, matureMs: 20 * OH, cycleMs: 13 * OH,
    yieldMin: 3, yieldMax: 5, fruit: "blueberry",
    seasons: ["summer", "autumn"],
    payback: 10,
  },
];
export const ORCHARD_STAGES = 4;      // 0 = plant, 1 = jeune, 2 = adulte, 3 = en fruits
export const ORCHARD_HP = 3;          // coups de hache pour l'abattre
export const ORCHARD_WOOD = 3;        // bois rendu à l'abattage
export const ORCHARD_MAX = 24;        // vergers plantés simultanément (toute la ferme)

/* LES FRUITS. Rangés dans `f.inv.fruits` (un objet id → nombre), et non en
   champs plats : quatre champs de plus dans l'inventaire, c'est quatre endroits
   à toucher à chaque nouveau fruit. AUCUNE MIGRATION — `f.inv` est dans
   l'instantané JSON. */
export const FRUITS = [
  { id: "lemon",      name: "Citron",    nameEn: "Lemon",      sell: 95,  color: "#f2d640", dark: "#c9a715" },
  { id: "strawberry", name: "Fraise",    nameEn: "Strawberry", sell: 70,  color: "#e0344a", dark: "#a81f32" },
  { id: "raspberry",  name: "Framboise", nameEn: "Raspberry",  sell: 88,  color: "#c8365f", dark: "#8e2140" },
  { id: "blueberry",  name: "Myrtille",  nameEn: "Blueberry",  sell: 110, color: "#4a5fc8", dark: "#2c3a86" },
];
export function fruitSpec(id) { return FRUITS.find(f => f.id === id) || null; }
export function fruitName(id, en) { const f = fruitSpec(id); return f ? (en ? f.nameEn : f.name) : id; }

/* LA BARQUETTE (demande de Guillaume : « on peut aussi vendre les fruits par
   barquettes »). Six fruits d'une même espèce, vendus ensemble avec une prime.
   ⚠️ LA PRIME EST LA RAISON D'ÊTRE DE LA BARQUETTE : sans elle, vendre par six
   serait exactement vendre six fois, donc un bouton de plus qui ne sert à rien.
   À +25 %, elle récompense d'avoir attendu d'en avoir assez — c'est-à-dire
   d'avoir laissé le verger tourner. */
export const PUNNET_SIZE = 6;
export const PUNNET_BONUS = 1.25;
export function punnetPrice(fruitId) {
  const f = fruitSpec(fruitId); if (!f) return 0;
  return Math.round(f.sell * PUNNET_SIZE * PUNNET_BONUS);
}

/* ============================================================================
   ZIP 398 — LES PRODUITS AUX FRUITS.
   ----------------------------------------------------------------------------
   « Ces nouvelles cultures permettront aussi d'avoir des produits qui incluent
   cela. Des confitures, des yaourts aux fruits, des tartes aux citrons. »

   Trois familles, et chacune est confiée à L'ATELIER QUI LA MÉRITE plutôt qu'à
   un atelier neuf :
     * la CONFITURE demande du sucre → la sucrerie, qui en produit déjà ;
     * le YAOURT AUX FRUITS demande du lait → la fromagerie, qui fait déjà les
       yaourts nature et vanille ;
     * la TARTE AU CITRON demande de la farine et des œufs → la boulangerie.
   Aucun bâtiment neuf à acheter : les vergers rendent plus utiles les trois
   ateliers déjà payés, ce qui est un meilleur cadeau qu'un quatrième bâtiment.

   ⚠️ LE PRIX DE VENTE EST TOUJOURS SUPÉRIEUR À LA SOMME DES INGRÉDIENTS, sinon
   transformer serait une punition. `verify-orchards.mjs` le mesure recette par
   recette, au lieu de faire confiance aux quatre nombres écrits ici. */
/* ⚠️ QUEL ANIMAL DONNE QUOI. Les produits animaux vivent dans `f.inv.products`,
   un TABLEAU indexé par type d'animal (voir ANIMALS) — pas dans des champs
   `f.inv.milk` / `f.inv.egg`, qui n'existent pas.

   La première écriture du 398 lisait `f.inv.milk` et `f.inv.egg` : toujours
   `undefined`, donc toujours 0, donc **les yaourts et la tarte étaient
   définitivement impossibles à préparer** — bouton grisé sur « pas de lait »
   avec une étable pleine de vaches. Le genre de défaut qu'aucun contrôle de
   syntaxe ne voit et qu'aucune relecture ne soupçonne, parce que
   `f.inv.milk` a l'air parfaitement raisonnable.

   Le lait accepte la VACHE ou la CHÈVRE, dans cet ordre : refuser le lait de
   chèvre pour un yaourt serait une subtilité que personne ne comprendrait en
   regardant son inventaire plein. */
export const ANIMAL_EGG = 0;          // poule
export const ANIMAL_MILK = [4, 1];    // vache d'abord, puis chèvre

export const FRUIT_PRODUCTS = [
  { id: "jam_strawberry", shop: "sucrerie",   name: "Confiture de fraises",    nameEn: "Strawberry jam",
    fruit: "strawberry", fruitN: 5, sugar: 2, sell: 620,  ms: 40 * 60 * 1000 },
  { id: "jam_raspberry",  shop: "sucrerie",   name: "Confiture de framboises", nameEn: "Raspberry jam",
    fruit: "raspberry",  fruitN: 5, sugar: 2, sell: 720,  ms: 40 * 60 * 1000 },
  { id: "jam_blueberry",  shop: "sucrerie",   name: "Confiture de myrtilles",  nameEn: "Blueberry jam",
    fruit: "blueberry",  fruitN: 5, sugar: 2, sell: 850,  ms: 40 * 60 * 1000 },
  { id: "yog_strawberry", shop: "fromagerie", name: "Yaourt à la fraise",      nameEn: "Strawberry yogurt",
    fruit: "strawberry", fruitN: 3, milk: 2,  sell: 480,  ms: 30 * 60 * 1000 },
  { id: "yog_blueberry",  shop: "fromagerie", name: "Yaourt à la myrtille",    nameEn: "Blueberry yogurt",
    fruit: "blueberry",  fruitN: 3, milk: 2,  sell: 610,  ms: 30 * 60 * 1000 },
  { id: "tart_lemon",     shop: "bakery",     name: "Tarte au citron",         nameEn: "Lemon tart",
    fruit: "lemon",      fruitN: 4, flour: 2, egg: 2, sell: 780, ms: 45 * 60 * 1000 },
];
export function fruitProduct(id) { return FRUIT_PRODUCTS.find(p => p.id === id) || null; }

/* ZIP 398 — LE NOM DES FAMILIERS.
   « Il faut pouvoir nommer chaque animal de compagnie qu'on a. »
   Le surnom vit dans `f.pets[i].nick`, donc dans l'instantané JSON du fermier :
   aucune migration. Vide = on retombe sur le nom d'espèce du catalogue. */
export const PET_NICK_MAX = 14;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — VALLEY TOWN HABITÉE.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « donner vie à Valley Town ... les résidents doivent
   pouvoir s'y balader, s'y trouver, utiliser les infrastructures (s'asseoir sur
   les bancs, monter descendre les escaliers, vivre en gros) ».

   ⚠️⚠️ LE PRINCIPE QUI TIENT TOUT LE CHAPITRE : UN RÉSIDENT A UNE ZONE, PAS
   DEUX POSITIONS. `res.zone` vaut "farm" ou "town", et `res.x/res.y` sont ses
   coordonnées DANS CETTE ZONE. C'est la seule forme qui résiste au piège déjà
   payé deux fois dans ce projet (§4 de CLAUDE.md, « deux cartes sans repère
   commun finissent par se mélanger ») : avec deux couples de coordonnées, il
   existe forcément un chemin de code qui lit le mauvais — et ça se voit le jour
   où la petite carte ne tient plus dans la grande, c'est-à-dire trop tard.
   Avec UNE position tagguée, le pire défaut possible est un résident invisible,
   jamais un résident dessiné à Valley Town au milieu d'un champ de blé.

   ⚠️ ET LA ZONE VOYAGE DANS LES MESSAGES QUI EXISTENT DÉJÀ. Le trajet groupé du
   zip 364 (`residentPaths` / `residentStops`, UN message par image pour tout le
   monde) gagne un champ `z`. Zéro `send()` de plus, quel que soit le nombre de
   résidents en vadrouille — c'est la même arithmétique que celle qui autorise
   MAX_RESIDENTS = 20.

   ⚠️ L'ALTITUDE NE VOYAGE TOUJOURS PAS, ni pour les joueurs (425) ni pour les
   résidents : elle se lit sous leurs pieds dans `elev`. Un résident en haut des
   marches est en haut des marches sur tous les écrans, sans un octet. */

// Cadence d'arbitrage des séjours en ville. C'est un TIRAGE, pas un horaire :
// une ville dont on connaît les horaires de passage n'a plus l'air vivante.
export const TOWN_TRIP_CHECK_MS = 18 * 1000;
export const TOWN_TRIP_CHANCE = 0.30;      // par résident éligible, à chaque contrôle
/* ⚠️ COMBIEN DE RÉSIDENTS EN VILLE À LA FOIS, ET POURQUOI PAS TOUS. Deux
   raisons, la seconde étant la vraie : d'abord la ferme ne doit pas se vider
   (ils y travaillent, c'est leur contribution) ; ensuite une ville où l'on
   croise deux ou trois têtes connues est vivante, alors qu'une ville où l'on
   croise les vingt d'un coup est une file d'attente. Le plafond est un
   PLANCHER de qualité, pas une économie. */
export const TOWN_VISITORS_MAX = 6;
export const TOWN_TRIP_MIN_MS = 3 * 60 * 1000;   // séjour le plus court
export const TOWN_TRIP_MAX_MS = 10 * 60 * 1000;  // le plus long
// ⚠️ UN RÉSIDENT EN VILLE NE TRAVAILLE PAS. C'est le prix du voyage, il est
// explicite, et c'est ce qui empêche la ville d'être un bonus gratuit.
// (Même traitement que le voyage d'Eduardo, res.trip.phase === "away".)

/* ---- LES ACTIVITÉS. Une activité = un endroit + une durée + une réplique.
   ⚠️ ELLE EST DIFFUSÉE DANS LE MESSAGE D'ARRÊT QUI EXISTE DÉJÀ (`residentStops`
   gagne un champ `a`), jamais dans un message à elle. Un résident qui s'assoit
   s'arrête forcément : l'information voyage donc avec l'arrêt, ou pas du tout. */
export const TOWN_ACT_MIN_MS = 7 * 1000;
export const TOWN_ACT_MAX_MS = 22 * 1000;
export const TOWN_RES_BUBBLE_MS = 5200;    // durée d'affichage d'une réplique d'activité
/* Les activités connues. `sit` = le personnage est dessiné ASSIS (buste seul,
   posé sur le banc) — c'est la seule qui change le dessin, les autres se
   contentent d'une pose immobile et d'une bulle.
   ⚠️ La liste des ENDROITS n'est pas ici : elle est DÉRIVÉE de la carte
   (E.townSpots), pour la raison du §8 — un décor et sa liste d'endroits réglés
   séparément divergent au premier déplacement de banc. */
export const TOWN_ACTS = {
  sit:      { ms: [12000, 26000], sit: true },  // banc : on y reste plus longtemps
  fountain: { ms: [8000, 16000] },              // regarder la fontaine
  kiosk:    { ms: [10000, 20000] },             // écouter (ou faire) de la musique
  stall:    { ms: [7000, 14000] },              // faire son marché
  well:     { ms: [6000, 12000] },              // tirer de l'eau
  grave:    { ms: [10000, 18000] },             // se recueillir
  pier:     { ms: [12000, 24000] },             // regarder le lac
  view:     { ms: [12000, 22000] },             // le belvédère
  window:   { ms: [8000, 16000] },              // lécher la vitrine de la boutique
  board:    { ms: [6000, 12000] },              // lire le tableau des nouvelles
  statue:   { ms: [6000, 12000] },
  pray:     { ms: [8000, 16000] },              // le parvis de l'église
};

/* ---- LES RENCONTRES. C'est l'architecture sociale, et elle tient en une
   phrase : DEUX RÉSIDENTS QUI SE CROISENT EN VILLE SE PARLENT, et ce qu'ils se
   disent dépend de RESIDENT_AFFINITIES (zip « relations entre résidents »), qui
   existait déjà et n'était qu'informatif.
   ⚠️ C'EST L'HÔTE QUI APPARIE, ET LUI SEUL. Deux clients qui décideraient
   chacun d'une rencontre en verraient deux différentes — c'est exactement le
   défaut corrigé au zip « dispute Chloé/Rosalie vue de tous », on ne le refait
   pas. La scène voyage ensuite dans le message d'arrêt (`a` = "talk"), et les
   RÉPLIQUES sont dérivées d'une graine partagée, jamais transmises. */
export const TOWN_MEET_DIST = 3.4;             // distance de déclenchement
export const TOWN_MEET_MS = 15 * 1000;         // durée d'une conversation
export const TOWN_MEET_COOLDOWN_MS = 75 * 1000; // avant que les deux mêmes se reparlent
export const TOWN_MEET_CHANCE = 0.55;
export const TOWN_MEET_STAND = 1.15;           // distance à laquelle ils se plantent l'un face à l'autre
/* ⚠️⚠️ LE DÉLAI DE GRÂCE À LA DESCENTE DU TRAIN, ET IL A ÉTÉ TROUVÉ EN JEU, PAS
   À LA RELECTURE. Sans lui, la vie sociale s'étrangle elle-même : cinq
   résidents descendent le même quai à la même seconde, donc tous à moins de
   TOWN_MEET_DIST les uns des autres, donc l'hôte les apparie IMMÉDIATEMENT.
   Chacun se fige quinze secondes pour bavarder, repart, se retrouve encore
   collé aux autres, et se refige. Résultat observé : la moitié de la ville
   plantée sur le quai à se dire bonjour en boucle, et pas un seul résident qui
   arrive jamais à la place. Personne ne quitte la gare.
   La correction n'est pas de baisser la distance de rencontre (ça les
   empêcherait de se parler ailleurs, là où c'est justement le but) : c'est de
   dire qu'on ne se salue pas SUR LE QUAI. Un débarquement n'est pas une
   rencontre — d'abord on s'éparpille, ensuite on se croise. */
export const TOWN_MEET_ARRIVE_GRACE_MS = 25 * 1000;

/* ---- LA FAMILLE (nouveaux personnages).
   Demande : « certains membres de leur famille puissent être présents ... en
   tant qu'invités à Valley Town ».

   ⚠️⚠️ UN INVITÉ N'EST PAS UNE ENTITÉ, ET C'EST TOUT L'INTÉRÊT. Sa position est
   DÉRIVÉE de celle du résident qu'il accompagne, exactement comme Leo derrière
   Carla depuis le 376 : il marche dans ses pas avec un retard mesuré le long du
   chemin déjà parcouru. Conséquences, toutes bonnes : zéro message réseau, zéro
   simulation, et il ne peut pas traverser un mur puisqu'il rejoue un trajet que
   la collision a déjà validé. Vingt résidents peuvent donc sortir accompagnés
   sans coûter un octet de plus.

   Ce qui voyage : UN entier, `res.guest`, l'index dans la liste ci-dessous —
   posé au départ du séjour, effacé au retour. Il part avec la station.

   `small: true` = un enfant : même feuille de sprite, dessinée à
   TOWN_GUEST_CHILD_SCALE. Pas un octet d'art en plus pour un personnage qu'on
   reconnaît au premier coup d'œil. */
export const TOWN_GUEST_CHANCE = 0.42;         // un séjour sur deux, à peu près
export const TOWN_GUEST_FOLLOW_DIST = 1.15;    // en cases, le long du chemin (cf. LEO_FOLLOW_DIST)
export const TOWN_GUEST_CHILD_SCALE = 0.74;
export const RESIDENT_FAMILY = {
  1:  [{ name: "Solène Martial", rel: "spouse", gender: "f", outfit: 4 },
       { name: "Ti-Jo", rel: "son", gender: "m", outfit: 2, small: true }],
  16: [{ name: "Hubert", rel: "brother", gender: "m", outfit: 0, cap: true }],
  25: [{ name: "Maryse", rel: "spouse", gender: "f", outfit: 6 },
       { name: "Nono", rel: "grandson", gender: "m", outfit: 5, small: true }],
  26: [{ name: "Katrin", rel: "sister", gender: "f", outfit: 2 }],
  27: [{ name: "Bérangère", rel: "spouse", gender: "f", outfit: 7 },
       { name: "Loulou", rel: "daughter", gender: "f", outfit: 3, small: true }],
  28: [{ name: "Mamie Odette", rel: "grandmother", gender: "f", outfit: 5 }],
  29: [{ name: "Duarte", rel: "cousin", gender: "m", outfit: 6, cap: true }],
  30: [{ name: "Leo", rel: "assistant", gender: "m", outfit: 0, look: "leo" }],
};
/* ⚠️ CARLA SORT TOUJOURS AVEC LEO, JAMAIS SEULE — et ce n'est pas un tirage.
   Le 376 en avait fait une règle de personnage ; la casser en ville la
   contredirait à l'endroit même où elle est censée régner. Son entrée dans
   RESIDENT_FAMILY est donc une famille d'UN SEUL membre, tirée à coup sûr. */
export const ALWAYS_GUEST_RIDS = [CARLA_RID];

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — LES DEUX NOUVELLES ADRESSES DE LA HAUTE-VILLE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ ELLES SONT EN HAUT DES MARCHES, ET C'EST UN CHOIX DE LECTURE. Le 425 avait
   écrit la règle en posant deux parcelles sur la terrasse : « les hauteurs sont
   les belles adresses ». Une boutique chic au niveau de la rue, entre le
   marché aux légumes et le puits, n'aurait pas été chic — elle aurait été une
   échoppe de plus. Posée au sommet de la volée monumentale, à côté du tribunal,
   elle achète sa réputation avec la montée, comme le tribunal achète la sienne
   avec le fronton. Et ça donne à l'escalier une TROISIÈME raison d'exister.
   ⚠️ Un panneau au pied des marches l'annonce (voir TOWN_STREET_SIGNS dans le
   générateur) : une boutique qu'on ne trouve qu'en montant par hasard n'existe
   pas. */
export const TOWN_BOUTIQUE = { x: 121, y: 12, w: 8, h: 5 };   // Maison Garfield
export const TOWN_SALON = { x: 152, y: 12, w: 7, h: 4 };      // salon de coiffure, « ouverture prochaine »

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — LA GARDE-ROBE DE LA MAISON GARFIELD.
   ───────────────────────────────────────────────────────────────────────────
   Demande : « tout est très cher mais permettra de changer ses vêtements,
   styles, couleurs de vêtements, etc. ; accessoires comme chapeaux, écharpes,
   robes originales ».

   ⚠️⚠️ TOUT LE COSMÉTIQUE TIENT DANS UNE CHAÎNE, ET IL LE FAUT. Le paramètre
   `look` de getChar/drawCharFrame (zip 376) a justement été créé pour ne plus
   allonger la signature d'un booléen par personnage ; on s'en sert. La tenue
   d'un joueur s'encode `"w<chapeau><écharpe><tenue><teinte>"`, quatre chiffres,
   par ex. `"w2103"`. Conséquences en chaîne, toutes voulues :
     * ELLE TIENT DANS LE PAQUET DE POSITION qui circule déjà (`pubMe`), donc
       zéro message de plus pour que les autres voient mes vêtements ;
     * elle sert de CLÉ DE CACHE de feuille de sprite telle quelle (S.getChar),
       donc une tenue donnée n'est peinte qu'une fois ;
     * une sauvegarde ancienne (pas de chaîne) donne un fermier habillé comme
       avant, ce qui est exactement le bon comportement.
   ⚠️ ET LES INDICES SONT DÉCALÉS DE 1 : 0 = « rien ». Le chiffre 0 doit vouloir
   dire « pas de chapeau », sinon on ne peut plus retirer un chapeau une fois
   acheté — et on se retrouve à ajouter un article « pas de chapeau » à la
   boutique, ce qui est absurde à voir dans une vitrine. */
export const WARDROBE_HATS = [
  { id: "beret",   name: "Béret cerise",        nameEn: "Cherry beret",     price: 2400 },
  { id: "capeline",name: "Capeline de paille",  nameEn: "Straw capeline",   price: 3600 },
  { id: "tophat",  name: "Haut-de-forme",       nameEn: "Top hat",          price: 6800 },
  { id: "beanie",  name: "Bonnet côtelé",       nameEn: "Ribbed beanie",    price: 1500 },
  { id: "crown",   name: "Diadème de la vallée",nameEn: "Valley tiara",     price: 14000 },
];
export const WARDROBE_SCARVES = [
  { id: "silk",    name: "Écharpe de soie",     nameEn: "Silk scarf",       price: 2200 },
  { id: "feather", name: "Boa de plumes",       nameEn: "Feather boa",      price: 5200 },
  { id: "fur",     name: "Étole de fourrure",   nameEn: "Fur stole",        price: 8800 },
  { id: "knit",    name: "Grosse maille",       nameEn: "Chunky knit",      price: 1200 },
];
export const WARDROBE_OUTFITS = [
  { id: "gown",    name: "Robe du soir",        nameEn: "Evening gown",     price: 9500 },
  { id: "cape",    name: "Cape de velours",     nameEn: "Velvet cape",      price: 7400 },
  { id: "suit",    name: "Tailleur strict",     nameEn: "Sharp suit",       price: 6600 },
  { id: "poncho",  name: "Poncho de la vallée", nameEn: "Valley poncho",    price: 3100 },
  { id: "tutu",    name: "Tutu d'apparat",      nameEn: "Ceremonial tutu",  price: 12500 },
];
/* Les teintes. ⚠️ ELLES S'APPLIQUENT AU VÊTEMENT, PAS AU SPRITE ENTIER : teinter
   la feuille complète colorerait la peau et les cheveux (et c'est le même piège
   que le `fillRect` de teinte du §4 — on croit assombrir, on peint une boîte).
   `price` unique : une couleur ne vaut pas plus qu'une autre, sauf l'or. */
export const WARDROBE_TINTS = [
  { id: "cherry",  name: "Cerise",     nameEn: "Cherry",    col: "#c0304a", price: 900 },
  { id: "ink",     name: "Encre",      nameEn: "Ink",       col: "#26314f", price: 900 },
  { id: "moss",    name: "Mousse",     nameEn: "Moss",      col: "#3d6b3a", price: 900 },
  { id: "cream",   name: "Crème",      nameEn: "Cream",     col: "#e8dcc0", price: 900 },
  { id: "plum",    name: "Prune",      nameEn: "Plum",      col: "#5b2d54", price: 1400 },
  { id: "ocean",   name: "Océan",      nameEn: "Ocean",     col: "#20707f", price: 1400 },
  { id: "rose",    name: "Rose thé",   nameEn: "Tea rose",  col: "#d98aa0", price: 1400 },
  { id: "gold",    name: "Or Garfield",nameEn: "Garfield gold", col: "#d8a93a", price: 4500 },
];
export const WARDROBE_SLOTS = ["hat", "scarf", "outfit", "tint"];
export function wardrobeCatalog(slot) {
  return slot === "hat" ? WARDROBE_HATS : slot === "scarf" ? WARDROBE_SCARVES
       : slot === "outfit" ? WARDROBE_OUTFITS : WARDROBE_TINTS;
}
/* ⚠️ UNE SEULE FONCTION FABRIQUE LA CHAÎNE, ET UNE SEULE LA RELIT (voir
   `parseLookWardrobe` dans fermeArt.js). Deux encodages du même vêtement, c'est
   la garantie qu'un jour on porte un chapeau que les autres ne voient pas. */
export function wardrobeLook(worn) {
  if (!worn) return null;
  const d = (n) => String(Math.max(0, Math.min(9, n | 0)));
  const s = "w" + d(worn.hat) + d(worn.scarf) + d(worn.outfit) + d(worn.tint);
  return s === "w0000" ? null : s;   // rien porté = pas de chaîne du tout
}
// Léo tient la caisse, et il en fait des tonnes : le prix affiché est le prix
// payé, mais il l'annonce toujours avec une flatterie (voir leoUpsellLines).
export const LEO_UPSELL_MS = 5200;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — CE QU'ON PEUT FAIRE EN VILLE (les points d'intérêt animés).
   ⚠️ CHACUN COÛTE UNE SEULE CHOSE AU RÉSEAU : RIEN. Le vœu de la fontaine passe
   par une `req` déjà existante (l'or est arbitré par l'hôte, comme tout achat) ;
   le reste est purement local et dérivé du temps de jeu partagé, comme les
   rembarrages de Carla à Leo (CARLA_SCOLD_MS). */
export const TOWN_WISH_COST = 25;              // pièce jetée dans la fontaine
export const TOWN_WISH_COOLDOWN_MS = DAY_REAL_MS; // un vœu par jour de jeu et par joueur
export const TOWN_WISH_GOLD_MIN = 0, TOWN_WISH_GOLD_MAX = 400; // ce que la fontaine rend, parfois
export const TOWN_SPYGLASS_MS = 6000;          // durée du message du belvédère
export const TOWN_KIOSK_NOTE_MS = 380;         // cadence des notes de musique au kiosque

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — LA GARE DE VALLEY TOWN.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « donne la même forme et attention graphique aux rails
   et à la station de Valley Town qu'à celles de Valley Farm, pour cohérence
   visuelle ».

   ⚠️⚠️ LA RÉPONSE N'EST PAS DE DESSINER UNE SECONDE GARE, C'EST D'ARRÊTER D'EN
   DESSINER UNE DEUXIÈME. Depuis le 234, la ville peignait ses rails à la main,
   dans la boucle de rendu : trois `fillRect` (ballast plat, une traverse une
   rangée sur deux, deux traits d'acier) pendant que la ferme, elle, posait le
   sprite `railHalf` du zip 232 (ballast granuleux, traverses larges, rail
   éclairé sur son arête). Deux dessins d'une même voie ferrée — c'est le doublon
   du §8, et il a donné exactement ce qu'un doublon donne : le même objet, deux
   fois moins soigné d'un côté, et personne pour s'en apercevoir avant qu'on
   compare les deux écrans.
   La ville réutilise donc `railL`/`railR`/`platform` TELS QUELS, et le bâtiment
   `station` tel quel. Zéro sprite nouveau, zéro divergence possible, et le
   « même soin » est garanti par construction plutôt que par relecture.

   ⚠️ ET LE BÂTIMENT DOIT ÊTRE BLOQUANT DANS LE GÉNÉRATEUR. Un décor massif qui
   ne bloque pas, c'est la réciproque du mur invisible du 425 — on traverse une
   gare. Le banc de contrôle teste les deux sens. */
export const TOWN_STATION = { x: 6, y: 62, w: 4, h: 3 };   // même gabarit que STATION (ferme)
